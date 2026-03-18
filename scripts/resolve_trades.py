"""Resolve open paper trades against current market data.

Checks each open trade's market for resolution status:
  - If the market is closed and the NO token won → WON (exit_no_price=1.00)
  - If the market is closed and the YES token won → LOST (exit_no_price=0.00)
  - If the market is closed but no winner info → EXPIRED (exit at last known NO price)
  - If the market is still open → no action

Resolves ALL ledger files in data/ledger/ (one per strategy+profile combo).

Usage:
    python scripts/resolve_trades.py
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
from polymarket_timer_bot.runs import RunStore
from polymarket_timer_bot.utils import find_latest_file

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


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
    exit_price = market.no_price if market.no_price is not None else 0.50
    return (EXPIRED, exit_price)


def main():
    data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
    ledger_dir = os.path.join(data_dir, "ledger")

    # Find all ledger files
    ledger_pattern = os.path.join(ledger_dir, "ledger*.json")
    ledger_files = sorted(glob.glob(ledger_pattern))

    if not ledger_files:
        print("No ledger files found. Run run_papertrade.py first to open trades.")
        return

    # Load current market data
    market_index = load_market_index(data_dir)

    print(f"\n{'='*60}")
    print(f"TRADE RESOLUTION [{PROVENANCE}]")
    print(f"{'='*60}")
    print(f"Ledger files found:   {len(ledger_files)}")
    print(f"Markets in index:     {len(market_index)}")
    print(f"{'='*60}")

    for ledger_path in ledger_files:
        ledger_name = os.path.basename(ledger_path)
        ledger = Ledger(ledger_path)
        open_trades = ledger.get_open_trades()

        if not open_trades:
            print(f"\n  [{ledger_name}] No open trades.")
            continue

        print(f"\n  [{ledger_name}] {len(open_trades)} open trades to check:")

        resolved = 0
        not_found = 0
        still_open = 0

        for trade in open_trades:
            market = market_index.get(trade.condition_id)
            if market is None:
                not_found += 1
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
                print(f"    RESOLVED: {closed_trade.question[:50]}{label}")
                print(f"      {status} | Entry NO={closed_trade.entry_no_price:.2f} → Exit NO={exit_price:.2f} | P&L=${closed_trade.pnl:.2f}")

        print(f"    → resolved={resolved}  still_open={still_open}  not_in_data={not_found}")

        if not_found > 0:
            print(f"    Note: {not_found} trades had no matching market. Run fetch_markets.py first.")

    # Overall summary across all ledgers
    print(f"\n{'='*60}")
    print(f"OVERALL LEDGER SUMMARY [{PROVENANCE}]")
    print(f"{'='*60}")
    for ledger_path in ledger_files:
        ledger = Ledger(ledger_path)
        s = ledger.summary()
        name = os.path.basename(ledger_path)
        print(f"  {name}: {s['total_trades']} trades, {s['open_trades']} open, "
              f"win_rate={s['win_rate_pct']}%, P&L=${s['total_pnl']:.2f}")
    print(f"{'='*60}")

    # Update run records with resolution stats
    runs_dir = os.path.join(data_dir, "runs")
    store = RunStore(runs_dir)
    runs = store.load_all()
    updated_runs = 0
    for run in runs:
        if not run.ledger_file:
            continue
        lpath = os.path.join(ledger_dir, run.ledger_file)
        if not os.path.exists(lpath):
            continue
        ledger = Ledger(lpath)
        s = ledger.summary()
        changed = False
        for attr, val in [
            ("trades_resolved", s["closed_trades"]),
            ("trades_won", s["wins"]),
            ("trades_lost", s["losses"]),
            ("trades_open", s["open_trades"]),
            ("total_pnl", s["total_pnl"]),
            ("open_exposure", s["open_exposure"]),
        ]:
            if getattr(run, attr) != val:
                setattr(run, attr, val)
                changed = True
        if changed:
            store.save_run(run)
            updated_runs += 1

    if updated_runs:
        print(f"\nUpdated {updated_runs} run records with resolution stats.")


if __name__ == "__main__":
    main()
