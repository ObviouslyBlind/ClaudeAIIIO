"""Classify Polymarket markets as Musk/Trump posting timer markets."""

import logging
import re

from polymarket_timer_bot.models.market import Market, MarketFamily

logger = logging.getLogger(__name__)

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
    r"\btweets?\b",
    r"\bposts?\b",
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


# ---------------------------------------------------------------------------
# Event-level (dual-layer) classification
# ---------------------------------------------------------------------------


def classify_event_title(title: str, description: str = "") -> str:
    """Classify an event by its title and description text.

    Returns market_type string: "musk_posting", "trump_posting", or "".
    This is the primary classification layer for grouped bracket markets.
    """
    text = f"{title} {description}"
    is_posting = _matches_any(text, POSTING_KEYWORDS)
    is_musk = _matches_any(text, MUSK_KEYWORDS)
    is_trump = _matches_any(text, TRUMP_KEYWORDS)

    if is_posting and is_musk:
        return "musk_posting"
    elif is_posting and is_trump:
        return "trump_posting"
    return ""


def classify_family(family: MarketFamily) -> MarketFamily:
    """Dual-layer classification for a MarketFamily.

    Layer 1: Classify at event-title level (primary).
    Layer 2: Validate each bracket against its own question text.
    If layers disagree, log clearly but use event-level as primary.
    """
    # Layer 1: event-level classification
    event_type = classify_event_title(family.event_title)
    family.market_type = event_type
    family.is_timer_market = bool(event_type and family.end_date is not None)

    # Layer 2: validate each bracket and propagate
    for bracket in family.brackets:
        # Classify bracket independently
        classify_market(bracket)
        bracket_type = bracket.market_type

        # Check for disagreement
        if event_type and bracket_type and event_type != bracket_type:
            logger.warning(
                "CLASSIFICATION DISAGREEMENT: event='%s' classified as '%s', "
                "but bracket='%s' classified as '%s'. Using event-level.",
                family.event_title[:60], event_type,
                bracket.question[:60], bracket_type,
            )

        if event_type and not bracket_type:
            logger.debug(
                "Bracket '%s' not independently classified, "
                "inheriting event-level '%s'.",
                bracket.question[:60], event_type,
            )

        # Event-level classification is primary
        bracket.market_type = event_type
        bracket.is_timer_market = family.is_timer_market

    return family
