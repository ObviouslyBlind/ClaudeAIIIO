"""Tests for Polymarket API adapters."""

from datetime import datetime

from polymarket_timer_bot.adapters.polymarket import parse_market
from polymarket_timer_bot.adapters.classifier import (
    classify_market,
    classify_markets,
    filter_relevant,
)
from polymarket_timer_bot.models.market import Market, Token


# --- Parser tests ---


def test_parse_market_basic():
    raw = {
        "condition_id": "0xabc",
        "question": "Will Elon tweet about Dogecoin by Friday?",
        "market_slug": "elon-tweet-doge",
        "end_date_iso": "2026-03-20T23:59:00Z",
        "active": True,
        "closed": False,
        "description": "Resolves YES if Elon tweets about Dogecoin.",
        "tokens": [
            {"token_id": "1", "outcome": "Yes", "price": 0.35},
            {"token_id": "2", "outcome": "No", "price": 0.65},
        ],
        "volume": 50000,
        "liquidity": 12000,
    }
    market = parse_market(raw)
    assert market.condition_id == "0xabc"
    assert market.question == "Will Elon tweet about Dogecoin by Friday?"
    assert market.slug == "elon-tweet-doge"
    assert market.active is True
    assert market.closed is False
    assert market.yes_price == 0.35
    assert market.no_price == 0.65
    assert market.end_date is not None
    assert market.volume == 50000


def test_parse_market_no_end_date():
    raw = {
        "condition_id": "0xdef",
        "question": "Some market",
        "market_slug": "some-market",
        "active": True,
        "closed": False,
        "tokens": [],
    }
    market = parse_market(raw)
    assert market.end_date is None
    assert market.hours_until_expiry is None


def test_parse_market_outcome_prices_fallback():
    """Test parsing when tokens are missing but outcomePrices exists."""
    raw = {
        "condition_id": "0xghi",
        "question": "Will Trump post on Truth Social?",
        "market_slug": "trump-truth",
        "active": True,
        "closed": False,
        "outcomes": ["Yes", "No"],
        "outcomePrices": ["0.40", "0.60"],
    }
    market = parse_market(raw)
    assert market.yes_price == 0.40
    assert market.no_price == 0.60


# --- Classifier tests ---


def _make_market(question: str, description: str = "") -> Market:
    return Market(
        condition_id="test",
        question=question,
        slug="test",
        end_date=datetime(2026, 3, 20),
        active=True,
        closed=False,
        description=description,
    )


def test_classify_musk_tweet():
    m = _make_market("Will Elon Musk tweet about AI by Friday?")
    classify_market(m)
    assert m.market_type == "musk_posting"
    assert m.is_timer_market is True


def test_classify_trump_truth_social():
    m = _make_market("Will Trump post on Truth Social this week?")
    classify_market(m)
    assert m.market_type == "trump_posting"
    assert m.is_timer_market is True


def test_classify_unrelated():
    m = _make_market("Will Bitcoin hit $100k by December?")
    classify_market(m)
    assert m.market_type == ""
    assert m.is_timer_market is False


def test_classify_musk_no_posting():
    """Musk mentioned but not about posting — should not classify."""
    m = _make_market("Will Elon Musk visit Mars by 2030?")
    classify_market(m)
    assert m.market_type == ""


def test_filter_relevant():
    markets = [
        _make_market("Will Elon tweet about Doge by Friday?"),
        _make_market("Will Bitcoin hit $100k?"),
        _make_market("Will Trump post on Truth Social today?"),
    ]
    classify_markets(markets)
    relevant = filter_relevant(markets)
    assert len(relevant) == 2
    types = {m.market_type for m in relevant}
    assert "musk_posting" in types
    assert "trump_posting" in types
