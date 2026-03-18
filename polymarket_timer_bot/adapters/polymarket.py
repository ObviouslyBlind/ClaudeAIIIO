"""Polymarket Gamma API client for fetching markets and events."""

import json
import logging
import re
from datetime import datetime
from typing import Optional
from urllib.parse import urlparse

import requests

from polymarket_timer_bot.models.market import Market, MarketFamily, Token

logger = logging.getLogger(__name__)

GAMMA_API_BASE = "https://gamma-api.polymarket.com"

# Keywords for client-side filtering of events during pagination fallback
EVENT_FILTER_KEYWORDS = [
    "tweet", "tweets", "truth social", "posts",
    "musk", "elon", "trump",
]


def fetch_markets(
    closed: bool = False,
    limit: int = 100,
    offset: int = 0,
) -> list[dict]:
    """Fetch raw market data from Polymarket Gamma API.

    Returns the raw JSON dicts from the API.
    """
    url = f"{GAMMA_API_BASE}/markets"
    params = {
        "closed": str(closed).lower(),
        "limit": limit,
        "offset": offset,
    }

    logger.info("Fetching markets: %s params=%s", url, params)
    resp = requests.get(url, params=params, timeout=30)
    resp.raise_for_status()

    data = resp.json()
    logger.info("Fetched %d markets", len(data))
    return data


def fetch_all_active_markets(max_pages: int = 5, page_size: int = 100) -> list[dict]:
    """Fetch multiple pages of active markets.

    Returns raw JSON dicts. Stops when a page returns fewer than page_size
    results or max_pages is reached.
    """
    all_markets = []
    for page in range(max_pages):
        offset = page * page_size
        batch = fetch_markets(closed=False, limit=page_size, offset=offset)
        all_markets.extend(batch)
        if len(batch) < page_size:
            break
    logger.info("Total active markets fetched: %d", len(all_markets))
    return all_markets


def parse_market(raw: dict) -> Market:
    """Parse a raw API dict into a Market object."""
    # Parse end date
    end_date = None
    end_date_str = raw.get("end_date_iso") or raw.get("endDate")
    if end_date_str:
        try:
            end_date = datetime.fromisoformat(end_date_str.replace("Z", "+00:00"))
            # Convert to naive UTC for simplicity
            end_date = end_date.replace(tzinfo=None)
        except (ValueError, TypeError):
            pass

    # Parse tokens
    tokens = []
    raw_tokens = raw.get("tokens") or []
    if isinstance(raw_tokens, list):
        for t in raw_tokens:
            if isinstance(t, dict):
                tokens.append(
                    Token(
                        token_id=str(t.get("token_id", "")),
                        outcome=t.get("outcome", ""),
                        price=float(t.get("price", 0)),
                        winner=t.get("winner"),
                    )
                )

    # If no tokens, build from outcomes + outcomePrices
    # These can be JSON strings from the Gamma API (e.g. '["Yes","No"]')
    if not tokens:
        outcomes_raw = raw.get("outcomes", [])
        prices_raw = raw.get("outcomePrices", [])
        # Parse JSON strings if needed
        if isinstance(outcomes_raw, str):
            try:
                outcomes_raw = json.loads(outcomes_raw)
            except (json.JSONDecodeError, TypeError):
                outcomes_raw = []
        if isinstance(prices_raw, str):
            try:
                prices_raw = json.loads(prices_raw)
            except (json.JSONDecodeError, TypeError):
                prices_raw = []
        if outcomes_raw and prices_raw:
            for outcome, price in zip(outcomes_raw, prices_raw):
                tokens.append(
                    Token(
                        token_id="",
                        outcome=str(outcome),
                        price=float(price) if price else 0.0,
                    )
                )

    return Market(
        condition_id=raw.get("condition_id", raw.get("conditionId", "")),
        question=raw.get("question", ""),
        slug=raw.get("market_slug", raw.get("slug", "")),
        end_date=end_date,
        active=raw.get("active", False),
        closed=raw.get("closed", False),
        tokens=tokens,
        description=raw.get("description", ""),
        category=raw.get("category", ""),
        volume=float(raw.get("volume", 0) or 0),
        liquidity=float(raw.get("liquidity", 0) or 0),
    )


def parse_markets(raw_list: list[dict]) -> list[Market]:
    """Parse a list of raw API dicts into Market objects."""
    markets = []
    for raw in raw_list:
        try:
            markets.append(parse_market(raw))
        except Exception as e:
            logger.warning("Failed to parse market: %s — %s", raw.get("question", "?"), e)
    return markets


# ---------------------------------------------------------------------------
# Events endpoint support
# ---------------------------------------------------------------------------


def fetch_event_by_slug(slug: str) -> Optional[dict]:
    """Fetch a single event by exact slug from the Gamma API.

    Returns the raw event dict (with nested markets), or None if not found.
    """
    url = f"{GAMMA_API_BASE}/events"
    params = {"slug": slug}
    logger.info("Fetching event by slug: %s", slug)
    try:
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, list) and len(data) > 0:
            logger.info("Found event: %s (%d markets)", data[0].get("title", ""), len(data[0].get("markets", [])))
            return data[0]
        logger.info("No event found for slug: %s", slug)
        return None
    except requests.RequestException as e:
        logger.warning("Failed to fetch event slug=%s: %s", slug, e)
        return None


def fetch_events_by_slugs(slugs: list[str]) -> list[dict]:
    """Fetch multiple events by exact slug. Returns list of raw event dicts."""
    events = []
    seen_ids = set()
    for slug in slugs:
        evt = fetch_event_by_slug(slug)
        if evt:
            eid = str(evt.get("id", ""))
            if eid not in seen_ids:
                events.append(evt)
                seen_ids.add(eid)
    logger.info("Fetched %d events from %d slugs", len(events), len(slugs))
    return events


def fetch_events_paginated(
    max_pages: int = 60,
    page_size: int = 100,
    filter_keywords: Optional[list[str]] = None,
) -> list[dict]:
    """Paginate /events endpoint with client-side keyword filtering.

    This is the FALLBACK discovery method — used to find new markets not
    in the known-slug registry. Filters event title + slug against keywords.
    """
    if filter_keywords is None:
        filter_keywords = EVENT_FILTER_KEYWORDS

    matched = []
    seen_ids = set()

    for page in range(max_pages):
        offset = page * page_size
        try:
            resp = requests.get(
                f"{GAMMA_API_BASE}/events",
                params={"closed": "false", "limit": page_size, "offset": offset},
                timeout=30,
            )
            resp.raise_for_status()
            batch = resp.json()
        except requests.RequestException as e:
            logger.warning("Events pagination failed at offset %d: %s", offset, e)
            break

        if not batch:
            break

        for evt in batch:
            eid = str(evt.get("id", ""))
            if eid in seen_ids:
                continue
            title = (evt.get("title", "") or "").lower()
            slug = (evt.get("slug", "") or "").lower()
            text = f"{title} {slug}"
            if _is_posting_count_event(text, filter_keywords):
                matched.append(evt)
                seen_ids.add(eid)

        if len(batch) < page_size:
            break

    logger.info(
        "Events pagination: scanned %d pages, found %d posting-count events",
        min(max_pages, page + 1) if batch else page,
        len(matched),
    )
    return matched


def _is_posting_count_event(text: str, keywords: list[str]) -> bool:
    """Check if event text indicates a posting-count market.

    Requires BOTH a person keyword AND a posting keyword to match.
    """
    person_kws = {"musk", "elon", "trump"}
    posting_kws = {"tweet", "tweets", "truth social", "posts", "post"}
    has_person = any(kw in text for kw in person_kws)
    has_posting = any(kw in text for kw in posting_kws)
    return has_person and has_posting


def extract_slug_from_url(url: str) -> Optional[str]:
    """Extract event slug from a Polymarket URL.

    Supports:
      https://polymarket.com/event/{event-slug}
      https://polymarket.com/event/{event-slug}/{market-slug}
    Returns the event-level slug.
    """
    parsed = urlparse(url)
    if "polymarket.com" not in parsed.netloc:
        return None
    parts = [p for p in parsed.path.strip("/").split("/") if p]
    if len(parts) >= 2 and parts[0] == "event":
        return parts[1]
    return None


def parse_event_markets(raw_event: dict) -> MarketFamily:
    """Parse a raw event API dict into a MarketFamily with bracket Markets.

    Each sub-market in the event becomes a Market in the family's brackets list,
    with event metadata propagated to each bracket.
    """
    # Parse event-level end date
    end_date = None
    end_date_str = raw_event.get("endDate")
    if end_date_str:
        try:
            end_date = datetime.fromisoformat(end_date_str.replace("Z", "+00:00"))
            end_date = end_date.replace(tzinfo=None)
        except (ValueError, TypeError):
            pass

    event_id = str(raw_event.get("id", ""))
    event_slug = raw_event.get("slug", "")
    event_title = raw_event.get("title", "")
    resolution_source = raw_event.get("resolutionSource", "")
    series_slug = raw_event.get("seriesSlug", "")
    neg_risk_market_id = raw_event.get("negRiskMarketID", "")

    # Parse each sub-market (bracket)
    brackets = []
    for raw_market in raw_event.get("markets", []):
        market = parse_market(raw_market)

        # Propagate event metadata
        market.event_id = event_id
        market.event_slug = event_slug
        market.event_title = event_title
        market.neg_risk_market_id = raw_market.get("negRiskMarketID", neg_risk_market_id)
        market.resolution_source = raw_market.get("resolutionSource", resolution_source)
        market.bracket_label = raw_market.get("groupItemTitle", "")

        brackets.append(market)

    family = MarketFamily(
        event_id=event_id,
        event_slug=event_slug,
        event_title=event_title,
        end_date=end_date,
        resolution_source=resolution_source,
        series_slug=series_slug,
        neg_risk_market_id=neg_risk_market_id,
        active=raw_event.get("active", False),
        closed=raw_event.get("closed", False),
        brackets=brackets,
    )

    logger.info(
        "Parsed event '%s': %d brackets, series=%s",
        event_title, len(brackets), series_slug,
    )
    return family
