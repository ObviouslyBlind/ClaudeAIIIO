"""Replay resolved bracket families through all strategies.

Two replay paths, clearly separated:

  REAL_HISTORICAL_REPLAY:
    Uses actual pre-resolution prices from the Polymarket CLOB API
    (prices-history endpoint with interval=all). Snapshots price at
    ~24h before event expiry. No hindsight leak. May have partial
    coverage (some brackets have no trading history). This is real
    backtest evidence.

  SYNTHETIC_SMOKE_TEST:
    Fallback for families where real prices are unavailable.
    Uses synthesized prices anchored on the actual winning bracket.
    Has hindsight leak (100% win rate guaranteed by construction).
    Validates harness plumbing only — NOT strategy evidence.

Results are NEVER mixed in the same aggregate table.

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


CLOB_BASE = "https://clob.polymarket.com"


def fetch_real_historical_prices(raw_event, hours_before_expiry=24):
    """Fetch REAL pre-resolution prices from the Polymarket CLOB API.

    Uses the prices-history endpoint with interval=all to get the full
    price history for each bracket's YES token. Snapshots the price at
    the specified number of hours before the event's end date.

    Returns:
        (brackets, coverage_meta) where coverage_meta is a dict with
        coverage stats if real prices were found, or (None, None) if not.
    """
    end_date_str = raw_event.get("endDate", "")
    if not end_date_str:
        return None, None

    try:
        from datetime import datetime as dt
        end_dt = dt.fromisoformat(end_date_str.replace("Z", "+00:00"))
        end_ts = end_dt.timestamp()
    except (ValueError, TypeError):
        return None, None

    target_ts = end_ts - (hours_before_expiry * 3600)

    brackets = []
    real_count = 0
    missing_count = 0
    total_count = 0
    snapshot_offsets = []  # actual hours before expiry for each real snapshot

    for m in raw_event.get("markets", []):
        group_title = m.get("groupItemTitle", "")
        total_count += 1

        # Get CLOB token IDs
        clob_ids_raw = m.get("clobTokenIds")
        if isinstance(clob_ids_raw, str):
            try:
                clob_ids = json.loads(clob_ids_raw)
            except (json.JSONDecodeError, TypeError):
                clob_ids = []
        else:
            clob_ids = clob_ids_raw or []

        yes_token_id = clob_ids[0] if clob_ids else None
        yes_price = None
        no_price = None
        actual_snapshot_ts = None

        if yes_token_id:
            try:
                resp = requests.get(
                    f"{CLOB_BASE}/prices-history",
                    params={"market": yes_token_id, "interval": "all", "fidelity": 60},
                    timeout=15,
                )
                if resp.status_code == 200:
                    history = resp.json().get("history", [])
                    if history:
                        # Find closest price point to target timestamp
                        closest = min(history, key=lambda h: abs(h["t"] - target_ts))
                        # Only use if within 6 hours of target
                        if abs(closest["t"] - target_ts) < 6 * 3600:
                            yes_price = closest["p"]
                            no_price = round(1.0 - yes_price, 4)
                            actual_snapshot_ts = closest["t"]
                            real_count += 1
                            # How many hours before expiry was this snapshot?
                            hours_offset = (end_ts - closest["t"]) / 3600
                            snapshot_offsets.append(hours_offset)
            except Exception as e:
                logger.debug("CLOB history fetch failed for %s: %s", group_title, e)

        if yes_price is None:
            missing_count += 1

        brackets.append({
            "condition_id": m.get("conditionId", m.get("condition_id", "")),
            "bracket_label": group_title,
            "yes_price": yes_price if yes_price is not None else 0,
            "no_price": no_price if no_price is not None else 0,
            "question": m.get("question", ""),
            "price_source": "real_historical" if yes_price is not None else "missing",
            "snapshot_ts": actual_snapshot_ts,
        })

    if real_count == 0:
        return None, None

    coverage_pct = round(real_count / total_count * 100, 1)
    avg_hours_before = round(sum(snapshot_offsets) / len(snapshot_offsets), 1) if snapshot_offsets else 0

    coverage_meta = {
        "price_source": "real_historical",
        "snapshot_method": f"clob_prices_history_{hours_before_expiry}h_before_expiry",
        "target_hours_before_expiry": hours_before_expiry,
        "avg_actual_hours_before_expiry": avg_hours_before,
        "brackets_total": total_count,
        "brackets_with_real_prices": real_count,
        "brackets_missing": missing_count,
        "coverage_pct": coverage_pct,
    }

    logger.info(
        "Fetched real historical prices for %d/%d brackets (%.1f%% coverage, avg %.1fh before expiry)",
        real_count, total_count, coverage_pct, avg_hours_before,
    )

    return brackets, coverage_meta


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
                "provenance": "tagged_at_collection_time",
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
    # Only existing strategies — no new strategy ideas in this pass
    strategy_configs = [
        ("no_side", "conservative"),
        ("no_side", "moderate"),
        ("no_side", "aggressive"),
        ("family_guarded_no", "moderate"),
        ("family_mispricing_scan", "moderate"),  # diagnostic-only, no TRADE signals
    ]

    all_real_trades = []
    all_synthetic_trades = []
    real_family_summaries = []
    synthetic_family_summaries = []

    print(f"\n{'='*80}")
    print(f"REPLAY — trying real historical prices first, synthetic fallback")
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

        # Try REAL historical prices first (no hindsight leak)
        real_brackets, coverage_meta = fetch_real_historical_prices(raw_event)
        if real_brackets:
            cm = coverage_meta
            print(f"  ✓ Real historical prices: {cm['brackets_with_real_prices']}/{cm['brackets_total']} brackets ({cm['coverage_pct']:.0f}%), avg {cm['avg_actual_hours_before_expiry']:.1f}h before expiry")
            price_source = "real_historical"
            pre_res_brackets = real_brackets
        else:
            # Fallback to synthetic (has hindsight leak)
            pre_res_brackets, all_terminal = extract_pre_resolution_prices(
                raw_event, expected_type=family_info.get("expected_type", "musk_posting")
            )
            price_source = "synthetic_anchored"
            coverage_meta = None
            print(f"  ⚠ Synthetic prices (hindsight-anchored, smoke test only)")

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
            "price_source": price_source,
            "coverage": coverage_meta,
            "strategy_results": {},
        }

        for strategy_id, profile_id in strategy_configs:
            trades = run_replay_for_strategy(
                strategy_id, profile_id, markets, family_brackets, resolution
            )
            # Tag each trade with the price source and provenance
            for t in trades:
                t["price_source"] = price_source
                t["provenance"] = "REAL_HISTORICAL_REPLAY" if price_source == "real_historical" else "SYNTHETIC_SMOKE_TEST"

            if price_source == "real_historical":
                all_real_trades.extend(trades)
            else:
                all_synthetic_trades.extend(trades)

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

        if price_source == "real_historical":
            real_family_summaries.append(family_result)
        else:
            synthetic_family_summaries.append(family_result)

    # --- Aggregate and print results separately ---
    def _aggregate(trades):
        by_strat = defaultdict(lambda: {
            "trades": 0, "wins": 0, "losses": 0, "pnl": 0,
            "families": set(), "entry_prices": [], "family_trade_counts": defaultdict(int),
        })
        for t in trades:
            label = f"{t['strategy_id']}@{t['strategy_version']}/{t['profile_id']}"
            s = by_strat[label]
            s["trades"] += 1
            s["families"].add(t["event_slug"])
            s["entry_prices"].append(t["entry_no_price"])
            s["family_trade_counts"][t["event_slug"]] += 1
            if t["status"] == "WON":
                s["wins"] += 1
            else:
                s["losses"] += 1
            s["pnl"] += t["pnl"]
        return by_strat

    def _print_aggregate(title, trades, family_summaries, warning=None):
        by_strat = _aggregate(trades)
        print(f"\n{'='*80}")
        print(f"{title}")
        if warning:
            print(f"⚠  {warning}")
        print(f"{'='*80}")

        # Coverage report
        if family_summaries:
            print(f"\n  Coverage:")
            for fs in family_summaries:
                cm = fs.get("coverage")
                if cm:
                    print(f"    {fs['event_slug']}: {cm['brackets_with_real_prices']}/{cm['brackets_total']} brackets, avg {cm['avg_actual_hours_before_expiry']:.1f}h before expiry")
                else:
                    print(f"    {fs['event_slug']}: synthetic (no real prices)")

        print(f"\n{'Strategy':<40} {'Trades':>5} {'W':>3} {'L':>3} {'WR%':>6} {'PnL$':>8} {'Fam':>3} {'AvgEntry':>8} {'MaxFamConc':>10}")
        print("-" * 90)
        for label, stats in sorted(by_strat.items()):
            definitive = stats["wins"] + stats["losses"]
            wr = (stats["wins"] / definitive * 100) if definitive else 0
            avg_entry = sum(stats["entry_prices"]) / len(stats["entry_prices"]) if stats["entry_prices"] else 0
            max_fam_conc = max(stats["family_trade_counts"].values()) / stats["trades"] * 100 if stats["trades"] else 0
            print(f"{label:<40} {stats['trades']:>5} {stats['wins']:>3} {stats['losses']:>3} {wr:>5.1f}% {stats['pnl']:>8.2f} {len(stats['families']):>3} {avg_entry:>7.3f}¢ {max_fam_conc:>9.0f}%")
        return by_strat

    real_agg = {}
    synthetic_agg = {}

    if all_real_trades:
        real_agg = _print_aggregate(
            f"REAL HISTORICAL REPLAY — {len(real_family_summaries)} families",
            all_real_trades,
            real_family_summaries,
        )

    if all_synthetic_trades:
        synthetic_agg = _print_aggregate(
            f"SYNTHETIC SMOKE TEST — {len(synthetic_family_summaries)} families",
            all_synthetic_trades,
            synthetic_family_summaries,
            warning="100% win rate is an artifact of hindsight-anchored synthetic prices",
        )

    if not all_real_trades and not all_synthetic_trades:
        print("\nNo replay trades generated.")

    if args.dry_run:
        print(f"\n  [DRY RUN] No files written.")
        return

    # --- Build structured output with clear separation ---
    def _agg_to_dict(agg):
        result = {}
        for label, s in sorted(agg.items()):
            avg_entry = round(sum(s["entry_prices"]) / len(s["entry_prices"]), 4) if s["entry_prices"] else 0
            max_fam = max(s["family_trade_counts"].values()) if s["family_trade_counts"] else 0
            max_fam_conc = round(max_fam / s["trades"] * 100, 1) if s["trades"] else 0
            result[label] = {
                "trades": s["trades"],
                "wins": s["wins"],
                "losses": s["losses"],
                "win_rate_pct": round((s["wins"] / (s["wins"] + s["losses"]) * 100)
                                     if (s["wins"] + s["losses"]) else 0, 1),
                "pnl": round(s["pnl"], 2),
                "families_traded": len(s["families"]),
                "avg_entry_no_price": avg_entry,
                "max_family_concentration_pct": max_fam_conc,
            }
        return result

    replay_data = {
        "generated_at": datetime.utcnow().isoformat(),
        # --- REAL HISTORICAL REPLAY (no hindsight leak) ---
        "real_historical": {
            "provenance": "REAL_HISTORICAL_REPLAY",
            "evidence_grade": "REAL_BACKTEST" if all_real_trades else "NO_DATA",
            "price_source": "clob_prices_history_24h_before_expiry",
            "snapshot_method": "closest hourly sample to 24h before event endDate",
            "families_requested": len(RESOLVED_FAMILIES),
            "families_usable": len(real_family_summaries),
            "families_skipped": len(RESOLVED_FAMILIES) - len(real_family_summaries) - len(synthetic_family_summaries),
            "families_fell_to_synthetic": len(synthetic_family_summaries),
            "coverage_by_family": [
                {
                    "event_slug": fs["event_slug"],
                    **(fs["coverage"] or {})
                }
                for fs in real_family_summaries
            ],
            "total_trades": len(all_real_trades),
            "includes_real_losses": any(t["status"] == "LOST" for t in all_real_trades),
            "family_summaries": real_family_summaries,
            "aggregate_by_strategy": _agg_to_dict(real_agg),
            "trades": all_real_trades,
        },
        # --- SYNTHETIC SMOKE TEST (has hindsight leak) ---
        "synthetic_smoke_test": {
            "provenance": "SYNTHETIC_SMOKE_TEST",
            "evidence_grade": "SMOKE_TEST_ONLY",
            "price_source": "synthetic_anchored_on_resolution",
            "hindsight_warning": (
                "Synthetic prices are anchored on the actual winning bracket. "
                "100% win rate is an artifact of this construction, not evidence "
                "of strategy edge. This data validates harness plumbing only."
            ),
            "families_replayed": len(synthetic_family_summaries),
            "total_trades": len(all_synthetic_trades),
            "family_summaries": synthetic_family_summaries,
            "aggregate_by_strategy": _agg_to_dict(synthetic_agg),
            "trades": all_synthetic_trades,
        },
        # --- Top-level summary for backward compat ---
        "provenance": "MIXED" if (all_real_trades and all_synthetic_trades)
                      else ("REAL_HISTORICAL_REPLAY" if all_real_trades
                            else "SYNTHETIC_SMOKE_TEST"),
        "evidence_grade": "REAL_BACKTEST" if all_real_trades else "SMOKE_TEST_ONLY",
        "families_replayed": len(real_family_summaries) + len(synthetic_family_summaries),
        "total_replay_trades": len(all_real_trades) + len(all_synthetic_trades),
        "real_trade_count": len(all_real_trades),
        "synthetic_trade_count": len(all_synthetic_trades),
        # Backward compat: aggregate_by_strategy uses real if available, else synthetic
        "aggregate_by_strategy": _agg_to_dict(real_agg) if real_agg else _agg_to_dict(synthetic_agg),
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
