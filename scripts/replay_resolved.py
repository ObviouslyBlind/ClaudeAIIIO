"""Replay resolved bracket families through all strategies.

This is a SYNTHETIC SMOKE TEST of the replay harness, NOT valid
strategy evidence. Current limitations:

  HINDSIGHT LEAK: Synthetic prices are anchored on the actual winning
  bracket (known only after resolution). This guarantees 100% win rate
  for NO-side strategies on adjacent brackets, since the distribution
  is centered on the winner. This tests harness plumbing only — it
  does NOT validate strategy edge.

  NO REAL PRICES: The Polymarket API does not return pre-resolution
  prices for resolved events. All prices are synthesized from a
  count-model distribution anchored on the resolution outcome.

When real historical prices become available, replay results should
be split into REAL_HISTORICAL_REPLAY vs SYNTHETIC_SMOKE_TEST.

All output is labeled SYNTHETIC_SMOKE_TEST.

Usage:
    python scripts/replay_resolved.py
    python scripts/replay_resolved.py --dry-run     # show what would happen, don't write
"""

import argparse
import json
import logging
import os
import sys
from collections import defaultdict
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests

from polymarket_timer_bot.adapters.polymarket import parse_event_markets, GAMMA_API_BASE
from polymarket_timer_bot.adapters.classifier import classify_family
from polymarket_timer_bot.signals.engine import evaluate_markets as default_evaluate, TRADE, WATCH, SKIP
from polymarket_timer_bot.signals.strategy import (
    STRATEGIES,
    STRATEGY_PROFILES,
    StrategyConfig,
)
from polymarket_timer_bot.analytics.count_model import (
    estimate_bracket_probabilities,
    parse_bracket_range,
    get_default_rate,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

PROVENANCE = "SYNTHETIC_SMOKE_TEST"

# Known resolved bracket families to replay
# These are CLOSED events with clear winners from the Polymarket API.
RESOLVED_FAMILIES = [
    {
        "slug": "elon-musk-of-tweets-february-10-february-17",
        "expected_type": "musk_posting",
    },
    {
        "slug": "elon-musk-of-tweets-february-13-february-20",
        "expected_type": "musk_posting",
    },
    {
        "slug": "elon-musk-of-tweets-march-3-march-10",
        "expected_type": "musk_posting",
    },
    {
        "slug": "elon-musk-of-tweets-march-6-march-13",
        "expected_type": "musk_posting",
    },
    {
        "slug": "donald-trump-of-truth-social-posts-march-6-march-13",
        "expected_type": "trump_posting",
    },
]


def fetch_resolved_family(slug):
    """Fetch a resolved event from Polymarket API."""
    try:
        resp = requests.get(
            f"{GAMMA_API_BASE}/events",
            params={"slug": slug},
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        if data and len(data) > 0:
            return data[0]
    except Exception as e:
        logger.warning("Failed to fetch %s: %s", slug, e)
    return None


def extract_resolution(raw_event):
    """Extract resolution data: which bracket won, resolved prices per bracket.

    Returns dict of {groupItemTitle: {"yes_resolved": float, "no_resolved": float, "won": bool}}
    """
    resolution = {}
    for m in raw_event.get("markets", []):
        group_title = m.get("groupItemTitle", "")
        prices_raw = m.get("outcomePrices", "[]")
        if isinstance(prices_raw, str):
            prices = json.loads(prices_raw)
        else:
            prices = prices_raw

        yes_p = float(prices[0]) if prices else 0
        no_p = float(prices[1]) if len(prices) > 1 else 0

        resolution[group_title] = {
            "yes_resolved": yes_p,
            "no_resolved": no_p,
            "won_yes": yes_p > 0.5,
        }
    return resolution


def extract_pre_resolution_prices(raw_event, expected_type="musk_posting"):
    """Extract or synthesize pre-resolution prices for signal evaluation.

    For resolved markets, outcomePrices shows the final 0/1 resolution.
    The API does not expose historical pre-resolution prices.

    Strategy:
    1. Try token.price fields (sometimes has last trading price)
    2. If all prices are terminal (0/1), synthesize realistic prices
       using the count model's rate-based estimator

    Synthesized prices are labeled so downstream can distinguish.
    """
    brackets = []
    for m in raw_event.get("markets", []):
        group_title = m.get("groupItemTitle", "")
        tokens = m.get("tokens") or []

        # tokens may have the last pre-close prices
        yes_price = None
        no_price = None
        for tok in tokens:
            if isinstance(tok, dict):
                outcome = tok.get("outcome", "").upper()
                price = float(tok.get("price", 0))
                if outcome == "YES":
                    yes_price = price
                elif outcome == "NO":
                    no_price = price

        # Fallback: use outcomes/outcomePrices (these might be resolution prices)
        if yes_price is None or no_price is None:
            prices_raw = m.get("outcomePrices", "[]")
            if isinstance(prices_raw, str):
                prices = json.loads(prices_raw)
            else:
                prices = prices_raw
            if yes_price is None and prices:
                yes_price = float(prices[0])
            if no_price is None and len(prices) > 1:
                no_price = float(prices[1])

        brackets.append({
            "condition_id": m.get("conditionId", m.get("condition_id", "")),
            "bracket_label": group_title,
            "yes_price": yes_price or 0,
            "no_price": no_price or 0,
            "question": m.get("question", ""),
        })

    # Check if all prices are terminal (0/1) — need synthesis
    all_terminal = all(
        b["no_price"] in (0, 1) and b["yes_price"] in (0, 1)
        for b in brackets
    )

    if all_terminal and brackets:
        brackets = _synthesize_prices_from_count_model(brackets, raw_event, expected_type)

    return brackets, all_terminal


def _synthesize_prices_from_count_model(brackets, raw_event, expected_type):
    """Synthesize prices for harness smoke-testing ONLY.

    WARNING — HINDSIGHT LEAK:
    This function uses the actual resolution outcome to anchor the
    price distribution. The winning bracket is used to derive the
    "observed count so far", which centers the distribution on the
    actual answer. This means:
      - Adjacent brackets always get tradeable NO prices
      - Those adjacent brackets always resolve NO (they didn't win)
      - 100% win rate is GUARANTEED by construction
      - This is NOT evidence of strategy quality

    This is acceptable for smoke-testing the replay harness (does
    the pipeline run, do signals fire, do trades score correctly?)
    but MUST NOT be cited as backtest evidence.

    For real backtesting, we need actual pre-resolution market prices.
    """
    import math

    posting_rate = get_default_rate(expected_type)
    sim_hours_remaining = 48  # simulate 48h before expiry

    # Find the winning bracket to anchor the distribution
    resolution = extract_resolution(raw_event)
    winning_label = next((k for k, v in resolution.items() if v["won_yes"]), None)

    # Estimate "observed so far" from the winning bracket
    # Use midpoint of winning bracket as proxy for final count
    observed_count = None
    if winning_label:
        lower, upper = parse_bracket_range(winning_label)
        if lower is not None and upper is not None:
            observed_count = (lower + upper) / 2
        elif lower is not None:  # "X+"
            observed_count = lower + 20  # conservative estimate above lower
        elif upper is not None:  # "<X"
            observed_count = upper / 2

    if observed_count is None:
        observed_count = posting_rate * 120  # fallback: 5 days of posting

    # Compute actual event duration to derive observed posting rate
    end_date_str = raw_event.get("endDate", "")
    start_date_str = raw_event.get("startDate", "")
    event_hours = 168  # default: 1 week
    if end_date_str and start_date_str:
        try:
            from datetime import datetime as dt
            end = dt.fromisoformat(end_date_str.replace("Z", "+00:00"))
            start = dt.fromisoformat(start_date_str.replace("Z", "+00:00"))
            event_hours = max((end - start).total_seconds() / 3600, 24)
        except (ValueError, TypeError):
            pass

    # Derive actual rate from final count / total hours
    actual_rate = observed_count / event_hours if event_hours > 0 else posting_rate

    # At 48h before expiry, we've observed (event_hours - 48) / event_hours of the activity
    elapsed_fraction = max(0.5, (event_hours - sim_hours_remaining) / event_hours)
    observed_so_far = observed_count * elapsed_fraction

    # Remaining expected posts at actual rate
    expected_remaining = actual_rate * sim_hours_remaining
    expected_total = observed_so_far + expected_remaining
    # Uncertainty from remaining hours only
    std_dev = math.sqrt(max(expected_remaining, 4.0)) * 1.5  # slightly wider for realism

    logger.info(
        "Synthesizing prices: observed~%.0f + %.0f remaining (rate=%.1f/hr), "
        "expected_total=%.0f, std=%.1f, winning=%s",
        observed_count, expected_remaining, posting_rate,
        expected_total, std_dev, winning_label,
    )

    # Use count model with our anchored distribution
    estimates = estimate_bracket_probabilities(
        brackets, posting_rate=1.0,  # dummy, we override below
        hours_remaining=1.0,  # dummy
    )

    # Override with our custom distribution
    from polymarket_timer_bot.analytics.count_model import _normal_bracket_probability
    for b, est in zip(brackets, estimates):
        prob = _normal_bracket_probability(expected_total, std_dev, est.lower, est.upper)
        fair_p = max(0.01, min(0.99, prob))
        b["yes_price"] = round(fair_p, 4)
        b["no_price"] = round(1.0 - fair_p, 4)
        b["price_source"] = "synthetic_anchored"

    return brackets


def reconstruct_family_for_signals(raw_event, pre_res_brackets):
    """Build a MarketFamily-like structure suitable for signal evaluation.

    Since resolved markets are closed, we need to temporarily mark them as
    active/open so the signal engine doesn't SKIP them for being closed.
    We also need to set realistic pre-resolution prices and a fake
    hours_until_expiry that simulates evaluating before close.
    """
    from polymarket_timer_bot.models.market import Market, Token

    from datetime import timedelta

    event_slug = raw_event.get("slug", "")
    event_title = raw_event.get("title", "")

    # Set end_date to 24 hours from NOW so that Market.hours_until_expiry
    # (which uses datetime.utcnow()) returns ~24h. This simulates evaluating
    # the market 24 hours before expiry.
    end_date = datetime.utcnow() + timedelta(hours=24)
    simulated_now = datetime.utcnow()

    markets = []
    for b in pre_res_brackets:
        # Build tokens with pre-resolution prices
        tokens = [
            Token(token_id="", outcome="Yes", price=b["yes_price"]),
            Token(token_id="", outcome="No", price=b["no_price"]),
        ]

        market = Market(
            condition_id=b["condition_id"],
            question=b["question"],
            slug="",
            end_date=end_date,
            active=True,  # Override: pretend it's still active
            closed=False,  # Override: pretend it's still open
            tokens=tokens,
            event_slug=event_slug,
            event_title=event_title,
            bracket_label=b["bracket_label"],
            market_type="",  # Will be set by classifier
            is_timer_market=False,  # Will be set by classifier
        )
        markets.append(market)

    return markets, simulated_now


def classify_replay_markets(markets):
    """Classify markets for replay (same as live pipeline)."""
    from polymarket_timer_bot.adapters.classifier import classify_market
    for m in markets:
        classify_market(m)
    return markets


def run_replay_for_strategy(strategy_id, profile_id, markets, family_brackets, resolution):
    """Run one strategy against reconstructed markets and score against resolution.

    Returns list of replay trade records.
    """
    strategy = STRATEGIES[strategy_id]
    profiles = STRATEGY_PROFILES.get(strategy_id, {})
    profile = profiles.get(profile_id)
    if not profile:
        return []

    config = StrategyConfig(strategy=strategy, profile=profile)

    # Dispatch to appropriate engine
    if strategy.engine == "family_guarded":
        from polymarket_timer_bot.signals.family_guarded import evaluate_markets as fg_evaluate
        results = fg_evaluate(markets, config, family_brackets=family_brackets)
    elif strategy.engine == "family_mispricing":
        from polymarket_timer_bot.signals.family_mispricing import evaluate_markets as fms_evaluate
        results, diagnostics = fms_evaluate(markets, config, family_brackets=family_brackets)
    else:
        results = default_evaluate(markets, config)

    # Filter to TRADE signals and simulate outcomes
    trades = []
    for r in results:
        bracket = r.market.bracket_label
        res = resolution.get(bracket, {})
        won_yes = res.get("won_yes", False)

        # For NO-side strategies: we buy NO. If YES didn't win (NO won), we profit.
        if r.signal == TRADE:
            # NO buyer wins when YES doesn't resolve (NO=1.00)
            if not won_yes:
                status = "WON"
                exit_no_price = 1.00
            else:
                status = "LOST"
                exit_no_price = 0.00

            entry_no = r.market.no_price or 0.50
            shares = config.profile.default_stake / entry_no if entry_no > 0 else 0
            pnl = round((exit_no_price - entry_no) * shares, 2)

            trades.append({
                "strategy_id": strategy_id,
                "strategy_version": strategy.version,
                "profile_id": profile_id,
                "event_slug": r.market.event_slug,
                "event_title": r.market.event_title,
                "bracket_label": bracket,
                "condition_id": r.market.condition_id,
                "question": r.market.question,
                "signal": r.signal,
                "score": r.score,
                "entry_no_price": entry_no,
                "exit_no_price": exit_no_price,
                "stake": config.profile.default_stake,
                "pnl": pnl,
                "status": status,
                "reasons": r.reasons,
                "provenance": PROVENANCE,
            })

    return trades


def parse_args():
    parser = argparse.ArgumentParser(description="Replay resolved families through strategies")
    parser.add_argument("--dry-run", action="store_true", help="Show what would happen without writing")
    return parser.parse_args()


def main():
    args = parse_args()
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    replay_dir = os.path.join(root, "data", "replay")
    os.makedirs(replay_dir, exist_ok=True)

    # Strategy configs to replay
    strategy_configs = [
        ("no_side", "conservative"),
        ("no_side", "moderate"),
        ("no_side", "aggressive"),
        ("family_guarded_no", "moderate"),
    ]

    all_trades = []
    family_summaries = []

    print(f"\n{'='*80}")
    print(f"REPLAY HARNESS SMOKE TEST — {PROVENANCE}")
    print(f"⚠  Synthetic prices anchored on resolution — NOT valid edge evidence")
    print(f"{'='*80}")

    for family_info in RESOLVED_FAMILIES:
        slug = family_info["slug"]
        print(f"\n--- Fetching: {slug} ---")

        raw_event = fetch_resolved_family(slug)
        if not raw_event:
            print(f"  SKIPPED: could not fetch")
            continue

        resolution = extract_resolution(raw_event)
        winning_bracket = next(
            (k for k, v in resolution.items() if v["won_yes"]),
            "NONE"
        )
        print(f"  Brackets: {len(resolution)}")
        print(f"  Winning bracket: {winning_bracket}")

        # Get pre-resolution prices (synthesized if only terminal available)
        pre_res_brackets, all_terminal = extract_pre_resolution_prices(
            raw_event, expected_type=family_info.get("expected_type", "musk_posting")
        )

        if all_terminal:
            print(f"  Prices synthesized via count model (no historical prices in API).")

        # Reconstruct markets
        markets, sim_now = reconstruct_family_for_signals(raw_event, pre_res_brackets)
        markets = classify_replay_markets(markets)

        # Build family bracket lookup for position classification
        family_brackets = {
            raw_event.get("slug", ""): [b for b in pre_res_brackets]
        }

        family_result = {
            "event_slug": slug,
            "event_title": raw_event.get("title", ""),
            "bracket_count": len(resolution),
            "winning_bracket": winning_bracket,
            "end_date": raw_event.get("endDate", ""),
            "prices_synthetic": all_terminal,
            "strategy_results": {},
        }

        for strategy_id, profile_id in strategy_configs:
            trades = run_replay_for_strategy(
                strategy_id, profile_id, markets, family_brackets, resolution
            )
            all_trades.extend(trades)

            wins = [t for t in trades if t["status"] == "WON"]
            losses = [t for t in trades if t["status"] == "LOST"]
            total_pnl = sum(t["pnl"] for t in trades)

            label = f"{strategy_id}@{STRATEGIES[strategy_id].version}/{profile_id}"
            family_result["strategy_results"][label] = {
                "trades": len(trades),
                "wins": len(wins),
                "losses": len(losses),
                "pnl": round(total_pnl, 2),
                "brackets_traded": [t["bracket_label"] for t in trades],
            }

            if trades:
                print(f"  {label:45s} → {len(trades)} trades, {len(wins)}W/{len(losses)}L, PnL=${total_pnl:.2f}")
            else:
                print(f"  {label:45s} → 0 trades (all filtered)")

        family_summaries.append(family_result)

    # Aggregate results
    print(f"\n{'='*80}")
    print(f"REPLAY AGGREGATE — {PROVENANCE} (NOT valid backtest evidence)")
    print(f"⚠  100% win rate is an artifact of hindsight-anchored synthetic prices")
    print(f"{'='*80}")

    by_strategy = defaultdict(lambda: {"trades": 0, "wins": 0, "losses": 0, "pnl": 0, "families": set()})
    for t in all_trades:
        label = f"{t['strategy_id']}@{t['strategy_version']}/{t['profile_id']}"
        by_strategy[label]["trades"] += 1
        by_strategy[label]["families"].add(t["event_slug"])
        if t["status"] == "WON":
            by_strategy[label]["wins"] += 1
        else:
            by_strategy[label]["losses"] += 1
        by_strategy[label]["pnl"] += t["pnl"]

    print(f"\n{'Strategy':<45} {'Trades':>6} {'W':>4} {'L':>4} {'WR%':>6} {'PnL$':>8} {'Fam':>4}")
    print("-" * 80)
    for label, stats in sorted(by_strategy.items()):
        definitive = stats["wins"] + stats["losses"]
        wr = (stats["wins"] / definitive * 100) if definitive else 0
        print(f"{label:<45} {stats['trades']:>6} {stats['wins']:>4} {stats['losses']:>4} {wr:>5.1f}% {stats['pnl']:>8.2f} {len(stats['families']):>4}")

    if args.dry_run:
        print(f"\n  [DRY RUN] No files written.")
        return

    # Save replay results
    replay_data = {
        "generated_at": datetime.utcnow().isoformat(),
        "provenance": PROVENANCE,
        "hindsight_warning": (
            "Synthetic prices are anchored on the actual winning bracket. "
            "100% win rate is an artifact of this construction, not evidence "
            "of strategy edge. This data validates harness plumbing only."
        ),
        "price_source": "synthetic_anchored_on_resolution",
        "evidence_grade": "SMOKE_TEST_ONLY",
        "families_replayed": len(family_summaries),
        "total_replay_trades": len(all_trades),
        "family_summaries": family_summaries,
        "aggregate_by_strategy": {
            label: {
                "trades": s["trades"],
                "wins": s["wins"],
                "losses": s["losses"],
                "win_rate_pct": round((s["wins"] / (s["wins"] + s["losses"]) * 100) if (s["wins"] + s["losses"]) else 0, 1),
                "pnl": round(s["pnl"], 2),
                "families_traded": len(s["families"]),
            }
            for label, s in sorted(by_strategy.items())
        },
        "trades": all_trades,
    }

    replay_path = os.path.join(replay_dir, "replay_results.json")
    with open(replay_path, "w") as f:
        json.dump(replay_data, f, indent=2)
    print(f"\nReplay results saved to: {replay_path}")

    # Also export to dashboard
    dash_data = os.path.join(root, "dashboard", "data")
    os.makedirs(dash_data, exist_ok=True)
    dash_replay = os.path.join(dash_data, "replay_results.json")
    with open(dash_replay, "w") as f:
        json.dump(replay_data, f, indent=2)
    print(f"Dashboard copy saved to: {dash_replay}")


if __name__ == "__main__":
    main()
