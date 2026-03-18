"""Run signal logic against fetched market data."""

import glob
import json
import logging
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from polymarket_timer_bot.adapters.polymarket import parse_markets
from polymarket_timer_bot.adapters.classifier import classify_markets, filter_relevant
from polymarket_timer_bot.signals.engine import evaluate_markets, TRADE, WATCH, SKIP

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
    signals_dir = os.path.join(data_dir, "signals")
    os.makedirs(signals_dir, exist_ok=True)

    # Find latest raw data
    latest = find_latest_file(raw_dir, "markets_")
    if not latest:
        print("No market data found. Run fetch_markets.py first.")
        return

    logger.info("Loading markets from %s", latest)
    with open(latest) as f:
        raw_markets = json.load(f)

    # Parse, classify, filter
    markets = parse_markets(raw_markets)
    markets = classify_markets(markets)
    relevant = filter_relevant(markets)

    logger.info("Found %d relevant markets out of %d total", len(relevant), len(markets))

    if not relevant:
        print("\n" + "=" * 60)
        print("SIGNAL SUMMARY")
        print("=" * 60)
        print(f"Total markets:     {len(markets)}")
        print(f"Relevant markets:  0")
        print("No Musk/Trump posting markets to evaluate right now.")
        print("=" * 60)
        return

    # Run signals
    results = evaluate_markets(relevant)

    # Save results
    timestamp = os.path.basename(latest).replace("markets_", "").replace(".json", "")
    signals_path = os.path.join(signals_dir, f"signals_{timestamp}.json")
    with open(signals_path, "w") as f:
        json.dump([r.to_dict() for r in results], f, indent=2, default=str)
    logger.info("Saved signal results to %s", signals_path)

    # Print summary
    trades = [r for r in results if r.signal == TRADE]
    watches = [r for r in results if r.signal == WATCH]
    skips = [r for r in results if r.signal == SKIP]

    print(f"\n{'='*60}")
    print(f"SIGNAL SUMMARY")
    print(f"{'='*60}")
    print(f"Total markets:     {len(markets)}")
    print(f"Relevant markets:  {len(relevant)}")
    print(f"TRADE signals:     {len(trades)}")
    print(f"WATCH signals:     {len(watches)}")
    print(f"SKIP signals:      {len(skips)}")
    print(f"{'='*60}")

    if trades:
        print(f"\n--- TRADE ---")
        for r in trades:
            print(f"  [{r.score:.0f}] {r.market.question}")
            print(f"       NO={r.market.no_price:.2f}  expiry={r.market.hours_until_expiry:.1f}h")
            for reason in r.reasons:
                print(f"       • {reason}")
            print()

    if watches:
        print(f"\n--- WATCH ---")
        for r in watches:
            print(f"  [{r.score:.0f}] {r.market.question}")
            print(f"       NO={r.market.no_price:.2f}  expiry={r.market.hours_until_expiry:.1f}h")
            for reason in r.reasons:
                print(f"       • {reason}")
            print()

    print(f"\nSignals saved to: {signals_path}")


if __name__ == "__main__":
    main()
