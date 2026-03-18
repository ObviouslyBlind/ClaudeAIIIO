"""Polymarket Gamma API client for fetching markets."""

import json
import logging
from datetime import datetime
from typing import Optional

import requests

from polymarket_timer_bot.models.market import Market, Token

logger = logging.getLogger(__name__)

GAMMA_API_BASE = "https://gamma-api.polymarket.com"


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
