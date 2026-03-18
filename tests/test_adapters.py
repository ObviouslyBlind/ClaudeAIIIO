"""Tests for Polymarket API adapters."""

from datetime import datetime

from polymarket_timer_bot.adapters.polymarket import (
    extract_slug_from_url,
    parse_event_markets,
    parse_market,
)
from polymarket_timer_bot.adapters.classifier import (
    classify_event_title,
    classify_family,
    classify_market,
    classify_markets,
    filter_relevant,
)
from polymarket_timer_bot.models.market import Market, MarketFamily, Token


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


# --- URL slug extraction tests ---


def test_extract_slug_from_event_url():
    url = "https://polymarket.com/event/elon-musk-of-tweets-march-19-march-21"
    assert extract_slug_from_url(url) == "elon-musk-of-tweets-march-19-march-21"


def test_extract_slug_from_market_url():
    url = "https://polymarket.com/event/elon-musk-of-tweets-march-6-march-13/elon-musk-of-tweets-march-6-march-13-400-419"
    assert extract_slug_from_url(url) == "elon-musk-of-tweets-march-6-march-13"


def test_extract_slug_non_polymarket():
    assert extract_slug_from_url("https://example.com/event/foo") is None


def test_extract_slug_no_event():
    assert extract_slug_from_url("https://polymarket.com/markets") is None


# --- Event parsing tests ---


def _make_raw_event(title, slug, markets_data, **kwargs):
    """Helper to build a raw event dict matching Gamma API format."""
    return {
        "id": kwargs.get("event_id", 12345),
        "slug": slug,
        "title": title,
        "description": kwargs.get("description", ""),
        "endDate": kwargs.get("end_date", "2026-03-21T16:00:00Z"),
        "resolutionSource": kwargs.get("resolution_source", "https://xtracker.polymarket.com"),
        "seriesSlug": kwargs.get("series_slug", ""),
        "negRiskMarketID": kwargs.get("neg_risk_id", "0xabc"),
        "active": kwargs.get("active", True),
        "closed": kwargs.get("closed", False),
        "markets": markets_data,
    }


def _make_raw_bracket(question, yes_price, no_price, label, **kwargs):
    """Helper to build a raw bracket market dict."""
    return {
        "conditionId": kwargs.get("condition_id", f"0x{hash(question) % 0xFFFF:04x}"),
        "question": question,
        "slug": kwargs.get("slug", "test-bracket"),
        "endDate": kwargs.get("end_date", "2026-03-21T16:00:00Z"),
        "active": kwargs.get("active", True),
        "closed": kwargs.get("closed", False),
        "outcomes": '["Yes", "No"]',
        "outcomePrices": f'["{yes_price}", "{no_price}"]',
        "description": kwargs.get("description", ""),
        "groupItemTitle": label,
        "negRiskMarketID": kwargs.get("neg_risk_id", "0xabc"),
        "resolutionSource": kwargs.get("resolution_source", ""),
        "volume": "50000",
        "liquidity": "10000",
    }


def test_parse_event_markets_basic():
    raw = _make_raw_event(
        title="Elon Musk # tweets March 19 - March 21, 2026?",
        slug="elon-musk-of-tweets-march-19-march-21",
        markets_data=[
            _make_raw_bracket("Will Elon Musk post <40 tweets from March 19 to March 21?", "0.045", "0.955", "<40"),
            _make_raw_bracket("Will Elon Musk post 65-89 tweets from March 19 to March 21?", "0.315", "0.685", "65-89"),
            _make_raw_bracket("Will Elon Musk post 90-114 tweets from March 19 to March 21?", "0.22", "0.78", "90-114"),
        ],
        series_slug="elon-tweets-48h",
    )
    family = parse_event_markets(raw)

    assert family.event_slug == "elon-musk-of-tweets-march-19-march-21"
    assert family.event_title == "Elon Musk # tweets March 19 - March 21, 2026?"
    assert family.series_slug == "elon-tweets-48h"
    assert family.active is True
    assert family.closed is False
    assert len(family.brackets) == 3


def test_parse_event_bracket_metadata():
    raw = _make_raw_event(
        title="Trump # Truth Social posts March 17 - March 24?",
        slug="trump-truth-social-march-17-24",
        markets_data=[
            _make_raw_bracket(
                "Will Donald Trump post 80-99 Truth Social posts?",
                "0.29", "0.71", "80-99",
                resolution_source="https://truthsocial.com/@realDonaldTrump",
            ),
        ],
        event_id=257220,
        resolution_source="https://truthsocial.com/@realDonaldTrump",
    )
    family = parse_event_markets(raw)
    bracket = family.brackets[0]

    assert bracket.event_slug == "trump-truth-social-march-17-24"
    assert bracket.event_id == "257220"
    assert bracket.bracket_label == "80-99"
    assert bracket.yes_price == 0.29
    assert bracket.no_price == 0.71
    assert bracket.end_date is not None


def test_parse_event_preserves_group_linkage():
    raw = _make_raw_event(
        title="Elon Musk # tweets March 19 - March 21?",
        slug="elon-tweets-mar-19-21",
        markets_data=[
            _make_raw_bracket("Bracket A?", "0.1", "0.9", "<40", neg_risk_id="0xshared"),
            _make_raw_bracket("Bracket B?", "0.3", "0.7", "40-64", neg_risk_id="0xshared"),
        ],
        neg_risk_id="0xshared",
    )
    family = parse_event_markets(raw)

    # All brackets share the same neg_risk_market_id and event identity
    assert family.neg_risk_market_id == "0xshared"
    for b in family.brackets:
        assert b.event_slug == "elon-tweets-mar-19-21"
        assert b.neg_risk_market_id == "0xshared"


def test_family_to_dict():
    raw = _make_raw_event(
        title="Test Event",
        slug="test-event",
        markets_data=[
            _make_raw_bracket("Bracket?", "0.5", "0.5", "50-60"),
        ],
    )
    family = parse_event_markets(raw)
    d = family.to_dict()

    assert d["event_slug"] == "test-event"
    assert d["bracket_count"] == 1
    assert len(d["brackets"]) == 1
    assert d["brackets"][0]["bracket_label"] == "50-60"


# --- Dual-layer classification tests ---


def test_classify_event_title_musk():
    assert classify_event_title("Elon Musk # tweets March 19 - March 21, 2026?") == "musk_posting"


def test_classify_event_title_trump():
    assert classify_event_title("Donald Trump # Truth Social posts March 17 - March 24, 2026?") == "trump_posting"


def test_classify_event_title_unrelated():
    assert classify_event_title("Will Bitcoin hit $100k by December?") == ""


def test_classify_family_propagates():
    raw = _make_raw_event(
        title="Elon Musk # tweets March 19 - March 21, 2026?",
        slug="elon-tweets-test",
        markets_data=[
            _make_raw_bracket(
                "Will Elon Musk post 65-89 tweets from March 19 to March 21?",
                "0.315", "0.685", "65-89",
            ),
            _make_raw_bracket(
                "Will Elon Musk post 90-114 tweets from March 19 to March 21?",
                "0.22", "0.78", "90-114",
            ),
        ],
    )
    family = parse_event_markets(raw)
    classify_family(family)

    assert family.market_type == "musk_posting"
    assert family.is_timer_market is True
    for b in family.brackets:
        assert b.market_type == "musk_posting"
        assert b.is_timer_market is True


def test_classify_family_unrelated_event():
    raw = _make_raw_event(
        title="Bitcoin ETF Inflows March 2026?",
        slug="btc-etf-inflows",
        markets_data=[
            _make_raw_bracket("Will inflows exceed $1B?", "0.4", "0.6", ">1B"),
        ],
    )
    family = parse_event_markets(raw)
    classify_family(family)

    assert family.market_type == ""
    assert family.is_timer_market is False


# --- Real bracket market question classifier tests ---


def test_classify_real_musk_bracket_question():
    """Proves classifier works on REAL bracket question text from API."""
    m = _make_market(
        "Will Elon Musk post 65-89 tweets from March 19 to March 21, 2026?",
        "This market will resolve according to the number of times @elonmusk posts on X.",
    )
    classify_market(m)
    assert m.market_type == "musk_posting"
    assert m.is_timer_market is True


def test_classify_real_trump_bracket_question():
    """Proves classifier works on REAL bracket question text from API."""
    m = _make_market(
        "Will Donald Trump post 80-99 Truth Social posts from March 17 to March 24, 2026?",
        "This market will resolve according to the number of times Donald Trump posts on Truth Social.",
    )
    classify_market(m)
    assert m.market_type == "trump_posting"
    assert m.is_timer_market is True


def test_classify_real_musk_low_bracket():
    m = _make_market(
        "Will Elon Musk post 0-19 tweets in March 2026?",
        "Resolves based on @elonmusk X post count.",
    )
    classify_market(m)
    assert m.market_type == "musk_posting"


def test_classify_real_trump_high_bracket():
    m = _make_market(
        "Will Donald Trump post 200+ Truth Social posts from March 17 to March 24, 2026?",
        "Resolves based on @realDonaldTrump Truth Social post count.",
    )
    classify_market(m)
    assert m.market_type == "trump_posting"
