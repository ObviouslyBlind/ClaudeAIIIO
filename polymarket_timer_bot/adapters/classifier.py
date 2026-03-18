"""Classify Polymarket markets as Musk/Trump posting timer markets."""

import re

from polymarket_timer_bot.models.market import Market

# Keywords that indicate a Musk posting/tweeting market
MUSK_KEYWORDS = [
    r"\belon\b",
    r"\bmusk\b",
    r"\b@elonmusk\b",
]

# Keywords that indicate a Trump posting market
TRUMP_KEYWORDS = [
    r"\btrump\b",
    r"\btruth\s*social\b",
    r"\b@realdonaldtrump\b",
]

# Keywords that indicate a "posting/tweeting" action (timer-style market)
POSTING_KEYWORDS = [
    r"\btweet\b",
    r"\bpost\b",
    r"\bsay\b",
    r"\bmentions?\b",
    r"\breply\b",
    r"\btruth\b",  # as in Truth Social post
]

# Keywords that suggest a timer/deadline market ("will X happen by Y?")
TIMER_KEYWORDS = [
    r"\bby\b.*\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b",
    r"\bby\b.*\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b",
    r"\bbefore\b",
    r"\bby\b.*\d{1,2}",
    r"\bthis week\b",
    r"\btoday\b",
    r"\btomorrow\b",
    r"\bwithin\b",
]


def _matches_any(text: str, patterns: list[str]) -> bool:
    """Check if text matches any of the regex patterns (case-insensitive)."""
    for pattern in patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False


def classify_market(market: Market) -> Market:
    """Classify a market and set market_type and is_timer_market fields.

    Returns the same market object with classification fields updated.
    """
    text = f"{market.question} {market.description}"

    # Determine if it's about posting/tweeting
    is_posting = _matches_any(text, POSTING_KEYWORDS)

    # Classify person
    is_musk = _matches_any(text, MUSK_KEYWORDS)
    is_trump = _matches_any(text, TRUMP_KEYWORDS)

    if is_posting and is_musk:
        market.market_type = "musk_posting"
    elif is_posting and is_trump:
        market.market_type = "trump_posting"
    else:
        market.market_type = ""

    # Check if it's a timer-style market (has a deadline)
    market.is_timer_market = bool(
        market.market_type
        and (market.end_date is not None or _matches_any(text, TIMER_KEYWORDS))
    )

    return market


def classify_markets(markets: list[Market]) -> list[Market]:
    """Classify all markets. Returns the same list with fields updated."""
    for market in markets:
        classify_market(market)
    return markets


def filter_relevant(markets: list[Market]) -> list[Market]:
    """Return only markets classified as Musk or Trump posting timer markets."""
    return [m for m in markets if m.market_type and m.is_timer_market]
