"""Tests for data models."""

from datetime import datetime, timedelta

from polymarket_timer_bot.models.market import Market, Token


def test_token_creation():
    token = Token(token_id="123", outcome="YES", price=0.65)
    assert token.outcome == "YES"
    assert token.price == 0.65
    assert token.winner is None


def test_market_no_price():
    market = Market(
        condition_id="abc",
        question="Will X happen?",
        slug="will-x-happen",
        end_date=None,
        active=True,
        closed=False,
        tokens=[
            Token(token_id="1", outcome="Yes", price=0.70),
            Token(token_id="2", outcome="No", price=0.30),
        ],
    )
    assert market.yes_price == 0.70
    assert market.no_price == 0.30


def test_market_no_tokens():
    market = Market(
        condition_id="abc",
        question="Empty",
        slug="empty",
        end_date=None,
        active=True,
        closed=False,
    )
    assert market.yes_price is None
    assert market.no_price is None


def test_hours_until_expiry():
    future = datetime.utcnow() + timedelta(hours=48)
    market = Market(
        condition_id="abc",
        question="Test",
        slug="test",
        end_date=future,
        active=True,
        closed=False,
    )
    hours = market.hours_until_expiry
    assert hours is not None
    assert 47.9 < hours < 48.1


def test_hours_until_expiry_none():
    market = Market(
        condition_id="abc",
        question="Test",
        slug="test",
        end_date=None,
        active=True,
        closed=False,
    )
    assert market.hours_until_expiry is None


def test_to_dict():
    market = Market(
        condition_id="abc",
        question="Test?",
        slug="test",
        end_date=datetime(2026, 3, 20, 12, 0, 0),
        active=True,
        closed=False,
        tokens=[Token(token_id="1", outcome="Yes", price=0.60)],
        market_type="musk_posting",
        is_timer_market=True,
    )
    d = market.to_dict()
    assert d["condition_id"] == "abc"
    assert d["question"] == "Test?"
    assert d["market_type"] == "musk_posting"
    assert d["is_timer_market"] is True
    assert d["yes_price"] == 0.60
    assert d["end_date"] == "2026-03-20T12:00:00"
