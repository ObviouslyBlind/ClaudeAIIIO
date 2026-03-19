"""Run signal logic against fetched market data.

Reads from data/normalized/relevant_markets_*.json (events-based output).
Accepts --strategy and --profile flags for comparative testing.

Supports multiple signal engines:
  - default (no_side@1.0): original NO-side timer strategy
  - family_guarded (family_guarded_no@0.1): position-aware with family caps
  - family_mispricing (family_mispricing_scan@0.1): diagnostic only

Usage:
    python scripts/run_signals.py                                           # default
    python scripts/run_signals.py --profile conservative                    # conservative
    python scripts/run_signals.py --strategy family_guarded_no              # new research strategy
    python scripts/run_signals.py --strategy family_mispricing_scan         # diagnostic
"""

import argparse
import glob
import json
import logging
import os
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from polymarket_timer_bot.models.market import Market
from polymarket_timer_bot.signals.engine import evaluate_markets as default_evaluate, TRADE, WATCH, SKIP
from polymarket_timer_bot.signals.strategy import (
    STRATEGIES,
    STRATEGY_PROFILES,
    StrategyConfig,
)
from polymarket_timer_bot.runs import RunRecord, RunStore, create_run_id
from polymarket_timer_bot.utils import find_latest_file

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def parse_args():
    parser = argparse.ArgumentParser(description="Run signal evaluation")
    parser.add_argument("--strategy", default="no_side", choices=list(STRATEGIES.keys()))
    parser.add_argument("--profile", default="moderate")
    return parser.parse_args()


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


def main():
    args = parse_args()
    strategy = STRATEGIES[args.strategy]

    # Resolve profile from strategy-specific registry
    profiles = STRATEGY_PROFILES.get(args.strategy, {})
    if args.profile not in profiles:
        available = list(profiles.keys())
        print(f"Profile '{args.profile}' not available for strategy '{args.strategy}'. Available: {available}")
        return
    profile = profiles[args.profile]

    config = StrategyConfig(strategy=strategy, profile=profile)

    data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
    norm_dir = os.path.join(data_dir, "normalized")
    signals_dir = os.path.join(data_dir, "signals")
    runs_dir = os.path.join(data_dir, "runs")
    os.makedirs(signals_dir, exist_ok=True)

    # Read events-based relevant markets
    latest = find_latest_file(norm_dir, "relevant_markets_")
    if not latest:
        print("No relevant market data found. Run fetch_markets.py first.")
        return

    logger.info("Loading relevant markets from %s", latest)
    with open(latest) as f:
        raw_dicts = json.load(f)

    markets = [Market.from_dict(d) for d in raw_dicts]
    logger.info("Loaded %d relevant markets", len(markets))

    if not markets:
        print("\n" + "=" * 60)
        print(f"SIGNAL SUMMARY [{config.label()}]")
        print("=" * 60)
        print("Relevant markets:  0")
        print("No Musk/Trump posting markets to evaluate right now.")
        print("=" * 60)
        return

    # Dispatch to appropriate engine
    extra_data = {}
    if strategy.engine == "family_guarded":
        from polymarket_timer_bot.signals.family_guarded import evaluate_markets as fg_evaluate
        family_brackets = build_family_brackets(data_dir)
        results = fg_evaluate(markets, config, family_brackets=family_brackets)

    elif strategy.engine == "family_mispricing":
        from polymarket_timer_bot.signals.family_mispricing import evaluate_markets as fms_evaluate
        family_brackets = build_family_brackets(data_dir)
        results, diagnostics = fms_evaluate(markets, config, family_brackets=family_brackets)
        extra_data["family_diagnostics"] = [d.to_dict() for d in diagnostics]

    else:
        # Default engine (no_side@1.0)
        results = default_evaluate(markets, config)

    # Save results — include strategy+profile in filename
    # Baseline no_side keeps old format for backward compat with generate_summary.py
    timestamp = os.path.basename(latest).replace("relevant_markets_", "").replace(".json", "")
    if config.strategy.strategy_id == "no_side":
        signals_filename = f"signals_{timestamp}_{config.profile.profile_id}.json"
    else:
        signals_filename = f"signals_{timestamp}_{config.strategy.strategy_id}_{config.profile.profile_id}.json"
    signals_path = os.path.join(signals_dir, signals_filename)

    output = {
        "strategy": config.to_dict(),
        "input_file": os.path.basename(latest),
        "results": [r.to_dict() for r in results],
    }
    output.update(extra_data)

    with open(signals_path, "w") as f:
        json.dump(output, f, indent=2, default=str)
    logger.info("Saved signal results to %s", signals_path)

    # Create run record
    trades = [r for r in results if r.signal == TRADE]
    watches = [r for r in results if r.signal == WATCH]
    skips = [r for r in results if r.signal == SKIP]

    run = RunRecord(
        run_id=create_run_id(),
        strategy_id=config.strategy.strategy_id,
        strategy_version=config.strategy.version,
        profile_id=config.profile.profile_id,
        input_snapshot=os.path.basename(latest),
        created_at=results[0].timestamp if results else "",
        started_at=results[0].timestamp if results else "",
        markets_evaluated=len(markets),
        signals_trade=len(trades),
        signals_watch=len(watches),
        signals_skip=len(skips),
        signals_file=signals_filename,
    )
    store = RunStore(runs_dir)
    store.save_run(run)

    # Print summary
    print(f"\n{'='*60}")
    print(f"SIGNAL SUMMARY [{config.label()}]")
    print(f"{'='*60}")
    print(f"Strategy:          {config.strategy.label()}")
    print(f"Profile:           {config.profile.profile_id}")
    print(f"Engine:            {config.strategy.engine}")
    print(f"Relevant markets:  {len(markets)}")
    print(f"TRADE signals:     {len(trades)}")
    print(f"WATCH signals:     {len(watches)}")
    print(f"SKIP signals:      {len(skips)}")
    print(f"Run ID:            {run.run_id}")
    print(f"{'='*60}")

    if trades:
        print(f"\n--- TRADE ---")
        for r in trades:
            label = f" [{r.market.bracket_label}]" if r.market.bracket_label else ""
            event = f" ({r.market.event_slug})" if r.market.event_slug else ""
            print(f"  [{r.score:.0f}] {r.market.question[:70]}{label}")
            print(f"       NO={r.market.no_price:.2f}  expiry={r.market.hours_until_expiry:.1f}h{event}")
            for reason in r.reasons:
                print(f"       • {reason}")
            print()

    if watches:
        print(f"\n--- WATCH ---")
        for r in watches[:10]:
            label = f" [{r.market.bracket_label}]" if r.market.bracket_label else ""
            print(f"  [{r.score:.0f}] {r.market.question[:70]}{label}")
            if r.market.no_price is not None and r.market.hours_until_expiry is not None:
                print(f"       NO={r.market.no_price:.2f}  expiry={r.market.hours_until_expiry:.1f}h")
            for reason in r.reasons:
                print(f"       • {reason}")
            print()
        if len(watches) > 10:
            print(f"  ... and {len(watches) - 10} more WATCH signals")

    # Print family diagnostics if available
    if extra_data.get("family_diagnostics"):
        print(f"\n--- FAMILY DIAGNOSTICS ---")
        for d in extra_data["family_diagnostics"]:
            print(f"  {d['event_slug']}")
            print(f"    YES sum: {d['yes_price_sum']:.3f}  verdict: {d['verdict']}")
            print(f"    Top: {d['top_bracket_label']} @ {d['top_bracket_yes_price']:.2f} ({d['top_bracket_concentration_pct']:.0f}%)")
            print(f"    Adjacent concentration: {d['adjacent_concentration_pct']:.0f}%")
            print()

    print(f"\nSignals saved to: {signals_path}")


if __name__ == "__main__":
    main()
