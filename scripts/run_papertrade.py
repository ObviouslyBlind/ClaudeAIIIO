"""Open paper trades for TRADE signals and display ledger status.

Reads from data/normalized/relevant_markets_*.json (events-based output).
Accepts --strategy and --profile flags. Each strategy+profile combo gets
its own ledger file for clean separation.

Supports family risk controls for new research strategies.

Usage:
    python scripts/run_papertrade.py                                        # default
    python scripts/run_papertrade.py --profile conservative                 # conservative
    python scripts/run_papertrade.py --strategy family_guarded_no           # new research strategy
"""

import argparse
import glob
import json
import logging
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from polymarket_timer_bot.models.market import Market
from polymarket_timer_bot.signals.engine import evaluate_markets as default_evaluate, TRADE
from polymarket_timer_bot.signals.strategy import (
    STRATEGIES,
    STRATEGY_PROFILES,
    StrategyConfig,
)
from polymarket_timer_bot.papertrade.ledger import Ledger
from polymarket_timer_bot.papertrade.models import PROVENANCE
from polymarket_timer_bot.papertrade.family_risk import (
    FamilyRiskConfig,
    NO_LIMITS,
    MODERATE_CAPS,
    check_family_risk,
)
from polymarket_timer_bot.runs import RunStore
from polymarket_timer_bot.utils import find_latest_file

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# Family risk configs per strategy
STRATEGY_RISK_CONFIGS = {
    "no_side": NO_LIMITS,          # baseline: no family limits (control)
    "family_guarded_no": MODERATE_CAPS,  # research: moderate caps
    "family_mispricing_scan": NO_LIMITS,  # diagnostic only, no trades
}


def ledger_filename(config: StrategyConfig) -> str:
    """Each strategy+profile combo gets its own ledger."""
    return f"ledger_{config.strategy.strategy_id}_{config.profile.profile_id}.json"


def build_family_brackets(data_dir):
    """Build event_slug → bracket list lookup from families data."""
    norm_dir = os.path.join(data_dir, "normalized")
    family_files = sorted(glob.glob(os.path.join(norm_dir, "families_*.json")))
    lookup = {}
    if family_files:
        try:
            with open(family_files[-1]) as f:
                families = json.load(f)
            for fam in families:
                slug = fam.get("event_slug", "")
                brackets = fam.get("brackets", [])
                if slug and len(brackets) > 1:
                    lookup[slug] = brackets
        except Exception as e:
            logger.warning("Failed to read families file: %s", e)
    return lookup


def classify_position_for_trade(market, family_brackets):
    """Classify a market's bracket position within its family."""
    slug = market.event_slug
    bracket = market.bracket_label
    if not slug or not bracket:
        return "unknown"
    brackets = family_brackets.get(slug, [])
    if len(brackets) < 2:
        return "unknown"

    def _key(label):
        label = (label or "").strip()
        if label.startswith("<"):
            return -1
        if label.endswith("+"):
            try: return int(label[:-1])
            except: return 999999
        try: return int(label.split("-")[0])
        except: return 999999

    sorted_b = sorted(brackets, key=lambda b: _key(b.get("bracket_label", "")))
    hot_idx = max(range(len(sorted_b)), key=lambda i: sorted_b[i].get("yes_price", 0) or 0)
    my_idx = next((i for i, b in enumerate(sorted_b) if b.get("bracket_label") == bracket), None)
    if my_idx is None:
        return "unknown"
    dist = abs(my_idx - hot_idx)
    if dist == 0: return "hot"
    if dist <= 1: return "adjacent"
    return "tail"


def parse_args():
    parser = argparse.ArgumentParser(description="Run paper trading")
    parser.add_argument("--strategy", default="no_side", choices=list(STRATEGIES.keys()))
    parser.add_argument("--profile", default="moderate")
    return parser.parse_args()


def main():
    args = parse_args()
    strategy = STRATEGIES[args.strategy]
    profiles = STRATEGY_PROFILES.get(args.strategy, {})
    if args.profile not in profiles:
        available = list(profiles.keys())
        print(f"Profile '{args.profile}' not available for strategy '{args.strategy}'. Available: {available}")
        return
    profile = profiles[args.profile]

    config = StrategyConfig(strategy=strategy, profile=profile)

    data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
    norm_dir = os.path.join(data_dir, "normalized")
    ledger_dir = os.path.join(data_dir, "ledger")
    runs_dir = os.path.join(data_dir, "runs")

    # Read events-based relevant markets
    latest = find_latest_file(norm_dir, "relevant_markets_")
    if not latest:
        print("No relevant market data found. Run fetch_markets.py first.")
        return

    logger.info("Loading relevant markets from %s", latest)
    with open(latest) as f:
        raw_dicts = json.load(f)

    markets = [Market.from_dict(d) for d in raw_dicts]

    # Dispatch to appropriate engine
    family_brackets = build_family_brackets(data_dir)

    if strategy.engine == "family_guarded":
        from polymarket_timer_bot.signals.family_guarded import evaluate_markets as fg_evaluate
        results = fg_evaluate(markets, config, family_brackets=family_brackets)
    elif strategy.engine == "family_mispricing":
        # Diagnostic only — no trades
        print(f"family_mispricing_scan is DIAGNOSTIC ONLY — no paper trades opened.")
        return
    else:
        results = default_evaluate(markets, config)

    trade_signals = [r for r in results if r.signal == TRADE]

    # Open ledger (per strategy+profile)
    ledger_name = ledger_filename(config)
    ledger_path = os.path.join(ledger_dir, ledger_name)
    ledger = Ledger(ledger_path)

    # Get family risk config for this strategy
    risk_config = STRATEGY_RISK_CONFIGS.get(args.strategy, NO_LIMITS)

    # Open paper trades with family risk checks
    new_trades = 0
    blocked_by_risk = 0
    for signal in trade_signals:
        # Check family risk before opening
        position = classify_position_for_trade(signal.market, family_brackets)
        risk_check = check_family_risk(
            event_slug=signal.market.event_slug,
            bracket_label=signal.market.bracket_label,
            bracket_position=position,
            stake=config.profile.default_stake,
            open_trades=ledger.get_open_trades(),
            config=risk_config,
        )

        if not risk_check.allowed:
            logger.info(
                "BLOCKED by family risk: %s [%s] — %s",
                signal.market.question[:40],
                signal.market.bracket_label,
                risk_check.reason,
            )
            blocked_by_risk += 1
            continue

        trade = ledger.open_trade(signal, stake=config.profile.default_stake)
        if trade is not None:
            new_trades += 1

    # Update latest run record if exists
    store = RunStore(runs_dir)
    runs = store.load_all()
    matching_runs = [r for r in runs
                     if r.strategy_id == config.strategy.strategy_id
                     and r.profile_id == config.profile.profile_id
                     and r.input_snapshot == os.path.basename(latest)]
    if matching_runs:
        run = matching_runs[-1]
        run.trades_opened = new_trades
        summary = ledger.summary()
        run.trades_open = summary["open_trades"]
        run.total_pnl = summary["total_pnl"]
        run.open_exposure = summary["open_exposure"]
        run.ledger_file = ledger_name
        store.save_run(run)

    # Print summary
    summary = ledger.summary()

    print(f"\n{'='*60}")
    print(f"PAPER TRADE SUMMARY [{config.label()}] [{PROVENANCE}]")
    print(f"{'='*60}")
    print(f"Strategy:            {config.strategy.label()}")
    print(f"Profile:             {config.profile.profile_id} (stake=${config.profile.default_stake:.0f})")
    print(f"Family risk:         {risk_config.to_dict()}")
    print(f"Markets evaluated:   {len(markets)}")
    print(f"TRADE signals:       {len(trade_signals)}")
    print(f"Blocked by risk:     {blocked_by_risk}")
    print(f"New trades opened:   {new_trades}")
    print(f"{'='*60}")
    print(f"Total trades:        {summary['total_trades']}")
    print(f"Open trades:         {summary['open_trades']}")
    print(f"Closed trades:       {summary['closed_trades']}")
    print(f"Win rate:            {summary['win_rate_pct']}%")
    print(f"Total P&L:           ${summary['total_pnl']:.2f} [{PROVENANCE}]")
    print(f"Open exposure:       ${summary['open_exposure']:.2f}")
    print(f"{'='*60}")

    # Show open trades
    open_trades = ledger.get_open_trades()
    if open_trades:
        print(f"\n--- Open Trades [{PROVENANCE}] ---")
        for t in open_trades:
            label = f" [{t.bracket_label}]" if t.bracket_label else ""
            event = f" ({t.event_slug})" if t.event_slug else ""
            print(f"  [{t.trade_id}] {t.question[:60]}{label}")
            print(f"    Entry NO={t.entry_no_price:.2f}  stake=${t.stake:.0f}  score={t.signal_score:.0f}{event}")
            print()
    else:
        print(f"\nNo open trades.")

    print(f"\nLedger: {ledger_path}")


if __name__ == "__main__":
    main()
