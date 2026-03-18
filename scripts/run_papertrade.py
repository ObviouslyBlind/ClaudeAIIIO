"""Open paper trades for TRADE signals and display ledger status."""

import glob
import json
import logging
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from polymarket_timer_bot.adapters.polymarket import parse_markets
from polymarket_timer_bot.adapters.classifier import classify_markets, filter_relevant
from polymarket_timer_bot.signals.engine import evaluate_markets, TRADE
from polymarket_timer_bot.papertrade.ledger import Ledger
from polymarket_timer_bot.papertrade.models import PROVENANCE

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def find_latest_file(directory: str, prefix: str) -> str | None:
    """Find the most recent file matching a prefix in a directory."""
    pattern = os.path.join(directory, f"{prefix}*.json")
    files = sorted(glob.glob(pattern))
    return files[-1] if files else None


def main():
    data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
    raw_dir = os.path.join(data_dir, "raw")
    ledger_dir = os.path.join(data_dir, "ledger")

    # Find latest raw data
    latest = find_latest_file(raw_dir, "markets_")
    if not latest:
        print("No market data found. Run fetch_markets.py first.")
        return

    logger.info("Loading markets from %s", latest)
    with open(latest) as f:
        raw_markets = json.load(f)

    # Parse, classify, filter, evaluate
    markets = parse_markets(raw_markets)
    markets = classify_markets(markets)
    relevant = filter_relevant(markets)
    results = evaluate_markets(relevant)

    # Filter to TRADE signals only
    trade_signals = [r for r in results if r.signal == TRADE]

    # Open ledger
    ledger_path = os.path.join(ledger_dir, "ledger.json")
    ledger = Ledger(ledger_path)

    # Open paper trades
    new_trades = 0
    for signal in trade_signals:
        trade = ledger.open_trade(signal)
        if trade is not None:
            new_trades += 1

    # Print summary
    summary = ledger.summary()

    print(f"\n{'='*60}")
    print(f"PAPER TRADE SUMMARY [{PROVENANCE}]")
    print(f"{'='*60}")
    print(f"Markets evaluated:   {len(relevant)}")
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
            print(f"  [{t.trade_id}] {t.question[:60]}")
            print(f"    Entry NO={t.entry_no_price:.2f}  stake=${t.stake:.0f}  score={t.signal_score:.0f}")
            print()
    else:
        print(f"\nNo open trades.")

    print(f"\nLedger: {ledger_path}")


if __name__ == "__main__":
    main()
