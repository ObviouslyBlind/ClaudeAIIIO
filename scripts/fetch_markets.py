"""Fetch active markets from Polymarket API, classify, and save."""

import json
import logging
import os
import sys
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from polymarket_timer_bot.adapters.polymarket import (
    fetch_all_active_markets,
    parse_markets,
)
from polymarket_timer_bot.adapters.classifier import classify_markets, filter_relevant

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def main():
    # Create output directories
    raw_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "raw")
    norm_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "normalized")
    os.makedirs(raw_dir, exist_ok=True)
    os.makedirs(norm_dir, exist_ok=True)

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")

    # Fetch raw markets
    logger.info("Fetching active markets from Polymarket...")
    raw_markets = fetch_all_active_markets(max_pages=5, page_size=100)

    # Save raw data
    raw_path = os.path.join(raw_dir, f"markets_{timestamp}.json")
    with open(raw_path, "w") as f:
        json.dump(raw_markets, f, indent=2, default=str)
    logger.info("Saved %d raw markets to %s", len(raw_markets), raw_path)

    # Parse and classify
    markets = parse_markets(raw_markets)
    markets = classify_markets(markets)
    relevant = filter_relevant(markets)

    # Save normalized (all markets)
    all_path = os.path.join(norm_dir, f"all_markets_{timestamp}.json")
    with open(all_path, "w") as f:
        json.dump([m.to_dict() for m in markets], f, indent=2, default=str)
    logger.info("Saved %d normalized markets to %s", len(markets), all_path)

    # Save relevant markets only
    relevant_path = os.path.join(norm_dir, f"relevant_markets_{timestamp}.json")
    with open(relevant_path, "w") as f:
        json.dump([m.to_dict() for m in relevant], f, indent=2, default=str)
    logger.info("Saved %d relevant markets to %s", len(relevant), relevant_path)

    # Print summary
    print(f"\n{'='*60}")
    print(f"FETCH SUMMARY")
    print(f"{'='*60}")
    print(f"Total markets fetched:    {len(raw_markets)}")
    print(f"Successfully parsed:      {len(markets)}")
    print(f"Relevant (Musk/Trump):    {len(relevant)}")
    print(f"{'='*60}")

    if relevant:
        print(f"\nRelevant markets:")
        for m in relevant:
            hours = m.hours_until_expiry
            expiry_str = f"{hours:.1f}h left" if hours is not None else "no expiry"
            print(f"  [{m.market_type}] {m.question}")
            print(f"    NO price: {m.no_price}  |  {expiry_str}")
            print()
    else:
        print("\nNo relevant Musk/Trump posting markets found right now.")
        print("This is normal — these markets come and go.")

    print(f"\nFiles saved:")
    print(f"  Raw:      {raw_path}")
    print(f"  All:      {all_path}")
    print(f"  Relevant: {relevant_path}")


if __name__ == "__main__":
    main()
