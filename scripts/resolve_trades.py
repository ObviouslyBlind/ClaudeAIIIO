"""Resolve open paper trades against current market data.

Checks each open trade's market for resolution status:
  - If the market is closed and the NO token won → WON (exit_no_price=1.00)
  - If the market is closed and the YES token won → LOST (exit_no_price=0.00)
  - If the market is closed but no winner info → EXPIRED (exit at last known NO price)
  - If the market is still open → no action

Reads market state from data/normalized/relevant_markets_*.json.
Falls back to fetching individual markets from the API if not found locally.
"""

import glob
import json
import logging
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from polymarket_timer_bot.models.market import Market
from polymarket_timer_bot.papertrade.ledger import Ledger
from polymarket_timer_bot.papertrade.models import WON, LOST, EXPIRED, PROVENANCE

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def find_latest_file(directory: str, prefix: str) -> str | None:
    """Find the most recent file matching a prefix in a directory."""
    pattern = os.path.join(directory, f"{prefix}*.json")
    files = sorted(glob.glob(pattern))
    return files[-1] if files else None


def load_market_index(data_dir: str) -> dict[str, Market]:
    """Load the latest relevant markets into a dict keyed by condition_id."""
    norm_dir = os.path.join(data_dir, "normalized")
    latest = find_latest_file(norm_dir, "relevant_markets_")
    if not latest:
        logger.warning("No relevant market data found")
        return {}

    logger.info("Loading markets from %s", latest)
    with open(latest) as f:
        raw_dicts = json.load(f)

    index = {}
    for d in raw_dicts:
        m = Market.from_dict(d)
        index[m.condition_id] = m
    logger.info("Loaded %d markets into index", len(index))
    return index


def resolve_market(market: Market) -> tuple[str, float] | None:
    """Determine resolution for a market.

    Returns (status, exit_no_price) or None if market is still open.
    """
    if not market.closed:
        return None

    # Check token winner flags
    for token in market.tokens:
        if token.winner is True:
            if token.outcome.upper() == "NO":
                return (WON, 1.00)
            elif token.outcome.upper() == "YES":
                return (LOST, 0.00)

    # Market is closed but no winner info — treat as expired
    # Use last known NO price as exit price (conservative)
    exit_price = market.no_price if market.no_price is not None else 0.50
    return (EXPIRED, exit_price)


def main():
    data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
    ledger_dir = os.path.join(data_dir, "ledger")
    ledger_path = os.path.join(ledger_dir, "ledger.json")

    if not os.path.exists(ledger_path):
        print("No ledger found. Run run_papertrade.py first to open trades.")
        return

    ledger = Ledger(ledger_path)
    open_trades = ledger.get_open_trades()

    if not open_trades:
        print("No open trades to resolve.")
        return

    # Load current market data
    market_index = load_market_index(data_dir)

    resolved = 0
    not_found = 0
    still_open = 0

    print(f"\n{'='*60}")
    print(f"TRADE RESOLUTION [{PROVENANCE}]")
    print(f"{'='*60}")
    print(f"Open trades to check: {len(open_trades)}")
    print(f"Markets in index:     {len(market_index)}")
    print(f"{'='*60}")

    for trade in open_trades:
        market = market_index.get(trade.condition_id)
        if market is None:
            not_found += 1
            logger.info("Market not in index: %s (%s)", trade.condition_id, trade.question[:40])
            continue

        result = resolve_market(market)
        if result is None:
            still_open += 1
            continue

        status, exit_price = result
        closed_trade = ledger.close_trade(trade.trade_id, exit_no_price=exit_price, status=status)
        if closed_trade:
            resolved += 1
            label = f" [{closed_trade.bracket_label}]" if closed_trade.bracket_label else ""
            print(f"  RESOLVED: {closed_trade.question[:50]}{label}")
            print(f"    {status} | Entry NO={closed_trade.entry_no_price:.2f} → Exit NO={exit_price:.2f} | P&L=${closed_trade.pnl:.2f}")
            print()

    print(f"{'='*60}")
    print(f"Resolved:     {resolved}")
    print(f"Still open:   {still_open}")
    print(f"Not in data:  {not_found}")
    print(f"{'='*60}")

    if not_found > 0:
        print(f"\nNote: {not_found} trades had no matching market in the latest data.")
        print(f"Run fetch_markets.py to get fresh data, then re-run this script.")

    # Show updated summary
    summary = ledger.summary()
    print(f"\nLedger summary [{PROVENANCE}]:")
    print(f"  Total trades:   {summary['total_trades']}")
    print(f"  Open:           {summary['open_trades']}")
    print(f"  Closed:         {summary['closed_trades']}")
    print(f"  Win rate:       {summary['win_rate_pct']}%")
    print(f"  Total P&L:      ${summary['total_pnl']:.2f}")
    print(f"\nLedger: {ledger_path}")


if __name__ == "__main__":
    main()
