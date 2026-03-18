"""Open paper trades for TRADE signals and display ledger status.

Reads from data/normalized/relevant_markets_*.json (events-based output).
Accepts --strategy and --profile flags. Each strategy+profile combo gets
its own ledger file for clean separation.

Usage:
    python scripts/run_papertrade.py                            # default
    python scripts/run_papertrade.py --profile conservative     # conservative
    python scripts/run_papertrade.py --profile aggressive       # aggressive
"""

import argparse
import glob
import json
import logging
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from polymarket_timer_bot.models.market import Market
from polymarket_timer_bot.signals.engine import evaluate_markets, TRADE
from polymarket_timer_bot.signals.strategy import (
    DEFAULT_CONFIG,
    STRATEGIES,
    PROFILES,
    StrategyConfig,
)
from polymarket_timer_bot.papertrade.ledger import Ledger
from polymarket_timer_bot.papertrade.models import PROVENANCE
from polymarket_timer_bot.runs import RunStore

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def find_latest_file(directory: str, prefix: str) -> str | None:
    pattern = os.path.join(directory, f"{prefix}*.json")
    files = sorted(glob.glob(pattern))
    return files[-1] if files else None


def ledger_filename(config: StrategyConfig) -> str:
    """Each strategy+profile combo gets its own ledger."""
    return f"ledger_{config.strategy.strategy_id}_{config.profile.profile_id}.json"


def parse_args():
    parser = argparse.ArgumentParser(description="Run paper trading")
    parser.add_argument("--strategy", default="no_side", choices=list(STRATEGIES.keys()))
    parser.add_argument("--profile", default="moderate", choices=list(PROFILES.keys()))
    return parser.parse_args()


def main():
    args = parse_args()
    config = StrategyConfig(
        strategy=STRATEGIES[args.strategy],
        profile=PROFILES[args.profile],
    )

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

    # Evaluate with config and filter to TRADE
    results = evaluate_markets(markets, config)
    trade_signals = [r for r in results if r.signal == TRADE]

    # Open ledger (per strategy+profile)
    ledger_name = ledger_filename(config)
    ledger_path = os.path.join(ledger_dir, ledger_name)
    ledger = Ledger(ledger_path)

    # Open paper trades with profile stake
    new_trades = 0
    for signal in trade_signals:
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
    print(f"Markets evaluated:   {len(markets)}")
    print(f"TRADE signals:       {len(trade_signals)}")
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
