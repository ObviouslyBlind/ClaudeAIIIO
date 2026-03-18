"""Run signal logic against fetched market data.

Reads from data/normalized/relevant_markets_*.json (events-based output)
which already contains classified, event-enriched Market dicts.
"""

import glob
import json
import logging
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from polymarket_timer_bot.models.market import Market
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
    norm_dir = os.path.join(data_dir, "normalized")
    signals_dir = os.path.join(data_dir, "signals")
    os.makedirs(signals_dir, exist_ok=True)

    # Read events-based relevant markets (already classified, with event context)
    latest = find_latest_file(norm_dir, "relevant_markets_")
    if not latest:
        print("No relevant market data found. Run fetch_markets.py first.")
        return

    logger.info("Loading relevant markets from %s", latest)
    with open(latest) as f:
        raw_dicts = json.load(f)

    # Deserialize into Market objects (preserves event_slug, bracket_label, etc.)
    markets = [Market.from_dict(d) for d in raw_dicts]
    logger.info("Loaded %d relevant markets", len(markets))

    if not markets:
        print("\n" + "=" * 60)
        print("SIGNAL SUMMARY")
        print("=" * 60)
        print("Relevant markets:  0")
        print("No Musk/Trump posting markets to evaluate right now.")
        print("=" * 60)
        return

    # Run signals
    results = evaluate_markets(markets)

    # Save results
    timestamp = os.path.basename(latest).replace("relevant_markets_", "").replace(".json", "")
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
    print(f"Relevant markets:  {len(markets)}")
    print(f"TRADE signals:     {len(trades)}")
    print(f"WATCH signals:     {len(watches)}")
    print(f"SKIP signals:      {len(skips)}")
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
        for r in watches[:10]:  # Cap at 10 to keep output readable
            label = f" [{r.market.bracket_label}]" if r.market.bracket_label else ""
            print(f"  [{r.score:.0f}] {r.market.question[:70]}{label}")
            print(f"       NO={r.market.no_price:.2f}  expiry={r.market.hours_until_expiry:.1f}h")
            for reason in r.reasons:
                print(f"       • {reason}")
            print()
        if len(watches) > 10:
            print(f"  ... and {len(watches) - 10} more WATCH signals")

    print(f"\nSignals saved to: {signals_path}")


if __name__ == "__main__":
    main()
