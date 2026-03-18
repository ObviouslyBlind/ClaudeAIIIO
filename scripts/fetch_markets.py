"""Fetch active markets from Polymarket API, classify, and save.

Discovery priority order:
  1. Direct known URL ingestion
  2. Exact event slug lookup
  3. Known recurring slug/pattern generation (future)
  4. Events pagination as fallback discovery
  5. /markets only as supplemental fallback
"""

import json
import logging
import os
import sys
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from polymarket_timer_bot.adapters.polymarket import (
    extract_slug_from_url,
    fetch_all_active_markets,
    fetch_event_by_slug,
    fetch_events_by_slugs,
    fetch_events_paginated,
    parse_event_markets,
    parse_markets,
)
from polymarket_timer_bot.adapters.classifier import (
    classify_family,
    classify_markets,
    filter_relevant,
)
from polymarket_timer_bot.config import get_direct_urls, get_exact_slugs
from polymarket_timer_bot.models.market import MarketFamily

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def discover_events() -> list[dict]:
    """Discover posting-count events using the priority-ordered discovery path.

    Returns deduplicated list of raw event dicts.
    """
    seen_ids = set()
    all_events = []

    def _add(events: list[dict], source: str):
        added = 0
        for evt in events:
            eid = str(evt.get("id", ""))
            if eid and eid not in seen_ids:
                seen_ids.add(eid)
                all_events.append(evt)
                added += 1
        if added:
            logger.info("[%s] Added %d new events (total: %d)", source, added, len(all_events))

    # Priority 1: Direct known URL ingestion
    urls = get_direct_urls()
    if urls:
        slugs_from_urls = []
        for url in urls:
            slug = extract_slug_from_url(url)
            if slug:
                slugs_from_urls.append(slug)
        if slugs_from_urls:
            events = fetch_events_by_slugs(slugs_from_urls)
            _add(events, "direct_urls")

    # Priority 2: Exact event slug lookup
    exact_slugs = get_exact_slugs()
    # Filter out slugs already fetched via URLs
    remaining_slugs = [s for s in exact_slugs if not any(
        str(evt.get("slug", "")) == s for evt in all_events
    )]
    if remaining_slugs:
        events = fetch_events_by_slugs(remaining_slugs)
        _add(events, "exact_slugs")

    # Priority 3: Known recurring slug/pattern generation
    # (Currently same as exact_slugs. Future: generate date-based candidates.)

    # Priority 4: Events pagination fallback discovery
    logger.info("Running fallback events pagination for new market discovery...")
    paginated_events = fetch_events_paginated(max_pages=60, page_size=100)
    _add(paginated_events, "pagination_fallback")

    return all_events


def main():
    # Create output directories
    project_root = os.path.dirname(os.path.dirname(__file__))
    raw_dir = os.path.join(project_root, "data", "raw")
    norm_dir = os.path.join(project_root, "data", "normalized")
    os.makedirs(raw_dir, exist_ok=True)
    os.makedirs(norm_dir, exist_ok=True)

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")

    # --- Event-based discovery (primary path) ---
    logger.info("Starting event-based discovery...")
    raw_events = discover_events()

    # Parse into MarketFamilies
    families: list[MarketFamily] = []
    all_bracket_markets = []
    for raw_evt in raw_events:
        family = parse_event_markets(raw_evt)
        classify_family(family)
        families.append(family)
        all_bracket_markets.extend(family.brackets)

    # Filter to relevant families only
    relevant_families = [f for f in families if f.market_type and f.is_timer_market]
    relevant_bracket_markets = []
    for f in relevant_families:
        relevant_bracket_markets.extend(f.brackets)

    # Save raw events
    events_raw_path = os.path.join(raw_dir, f"events_{timestamp}.json")
    with open(events_raw_path, "w") as f:
        json.dump(raw_events, f, indent=2, default=str)

    # Save families (normalized)
    families_path = os.path.join(norm_dir, f"families_{timestamp}.json")
    with open(families_path, "w") as f:
        json.dump([fam.to_dict() for fam in relevant_families], f, indent=2, default=str)

    # Save individual relevant bracket markets (for signal engine compatibility)
    relevant_path = os.path.join(norm_dir, f"relevant_markets_{timestamp}.json")
    with open(relevant_path, "w") as f:
        json.dump([m.to_dict() for m in relevant_bracket_markets], f, indent=2, default=str)

    # --- Supplemental /markets fetch (kept for completeness) ---
    logger.info("Supplemental /markets fetch...")
    raw_markets = fetch_all_active_markets(max_pages=5, page_size=100)

    raw_markets_path = os.path.join(raw_dir, f"markets_{timestamp}.json")
    with open(raw_markets_path, "w") as f:
        json.dump(raw_markets, f, indent=2, default=str)

    markets = parse_markets(raw_markets)
    markets = classify_markets(markets)
    supplemental_relevant = filter_relevant(markets)

    # Merge supplemental relevant markets (deduplicate by condition_id)
    seen_cids = {m.condition_id for m in relevant_bracket_markets}
    for m in supplemental_relevant:
        if m.condition_id not in seen_cids:
            relevant_bracket_markets.append(m)
            seen_cids.add(m.condition_id)

    # Save all normalized markets
    all_norm_path = os.path.join(norm_dir, f"all_markets_{timestamp}.json")
    with open(all_norm_path, "w") as f:
        json.dump([m.to_dict() for m in markets], f, indent=2, default=str)

    # --- Print summary ---
    print(f"\n{'='*60}")
    print(f"FETCH SUMMARY")
    print(f"{'='*60}")
    print(f"Events discovered:        {len(raw_events)}")
    print(f"Relevant event families:  {len(relevant_families)}")
    print(f"Bracket markets (total):  {len(all_bracket_markets)}")
    print(f"Bracket markets (relevant): {len(relevant_bracket_markets)}")
    print(f"Supplemental /markets:    {len(raw_markets)}")
    print(f"Supplemental relevant:    {len(supplemental_relevant)}")
    print(f"{'='*60}")

    if relevant_families:
        print(f"\nRelevant event families:")
        for fam in relevant_families:
            status = "CLOSED" if fam.closed else "OPEN"
            print(f"  [{status}] {fam.event_title}")
            print(f"    Type: {fam.market_type} | Series: {fam.series_slug}")
            print(f"    Brackets: {len(fam.brackets)} | Resolution: {fam.resolution_source[:60]}")
            open_brackets = [b for b in fam.brackets if not b.closed]
            if open_brackets:
                print(f"    Open brackets ({len(open_brackets)}):")
                for b in sorted(open_brackets, key=lambda x: x.no_price or 0, reverse=True)[:5]:
                    hours = b.hours_until_expiry
                    expiry_str = f"{hours:.1f}h left" if hours is not None else "no expiry"
                    print(f"      [{b.bracket_label}] YES={b.yes_price:.3f} NO={b.no_price:.3f} | {expiry_str}")
                if len(open_brackets) > 5:
                    print(f"      ... and {len(open_brackets) - 5} more")
            print()
    else:
        print("\nNo relevant posting-count event families found.")

    print(f"Files saved:")
    print(f"  Events raw:      {events_raw_path}")
    print(f"  Families:        {families_path}")
    print(f"  Relevant:        {relevant_path}")
    print(f"  Markets raw:     {raw_markets_path}")
    print(f"  All normalized:  {all_norm_path}")


if __name__ == "__main__":
    main()
