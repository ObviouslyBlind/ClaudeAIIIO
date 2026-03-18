"""Tests for signal logic."""

from datetime import datetime, timedelta

from polymarket_timer_bot.models.market import Market, Token
from polymarket_timer_bot.signals.engine import (
    evaluate,
    evaluate_markets,
    TRADE,
    WATCH,
    SKIP,
)


def _make_market(
    no_price: float = 0.80,
    yes_price: float = 0.20,
    hours_until_expiry: float = 24,
    market_type: str = "musk_posting",
    is_timer: bool = True,
    active: bool = True,
    closed: bool = False,
) -> Market:
    end_date = datetime.utcnow() + timedelta(hours=hours_until_expiry)
    return Market(
        condition_id="test",
        question="Will Elon tweet about Doge by Friday?",
        slug="test-market",
        end_date=end_date,
        active=active,
        closed=closed,
        tokens=[
            Token(token_id="1", outcome="Yes", price=yes_price),
            Token(token_id="2", outcome="No", price=no_price),
        ],
        market_type=market_type,
        is_timer_market=is_timer,
    )


# --- SKIP cases ---


def test_skip_closed():
    m = _make_market(closed=True)
    r = evaluate(m)
    assert r.signal == SKIP
    assert "closed" in r.reasons[0].lower()


def test_skip_inactive():
    m = _make_market(active=False)
    r = evaluate(m)
    assert r.signal == SKIP
    assert "inactive" in r.reasons[0].lower()


def test_skip_not_relevant():
    m = _make_market(market_type="")
    r = evaluate(m)
    assert r.signal == SKIP


def test_skip_not_timer():
    m = _make_market(is_timer=False)
    r = evaluate(m)
    assert r.signal == SKIP


def test_skip_no_price_too_high():
    m = _make_market(no_price=0.97, yes_price=0.03)
    r = evaluate(m)
    assert r.signal == SKIP
    assert "upside" in r.reasons[0].lower()


def test_skip_no_price_too_low():
    m = _make_market(no_price=0.40, yes_price=0.60)
    r = evaluate(m)
    assert r.signal == SKIP
    assert "likely" in r.reasons[0].lower()


def test_skip_mixed_evidence():
    m = _make_market(no_price=0.55, yes_price=0.45)
    r = evaluate(m)
    assert r.signal == SKIP
    assert "mixed" in r.reasons[0].lower() or "uncertain" in r.reasons[0].lower()


def test_skip_too_far_out():
    m = _make_market(hours_until_expiry=100)
    r = evaluate(m)
    assert r.signal == SKIP
    assert "72" in r.reasons[0] or "exceeds" in r.reasons[0].lower()


def test_skip_expired():
    m = _make_market(hours_until_expiry=-1)
    r = evaluate(m)
    assert r.signal == SKIP


# --- TRADE cases ---


def test_trade_good_setup():
    m = _make_market(no_price=0.80, yes_price=0.20, hours_until_expiry=24)
    r = evaluate(m)
    assert r.signal == TRADE
    assert r.score > 50


def test_trade_close_to_expiry():
    m = _make_market(no_price=0.85, yes_price=0.15, hours_until_expiry=6)
    r = evaluate(m)
    assert r.signal == TRADE
    assert r.score > 70


def test_trade_trump_market():
    m = _make_market(
        no_price=0.75, yes_price=0.25,
        hours_until_expiry=48, market_type="trump_posting",
    )
    r = evaluate(m)
    assert r.signal == TRADE


# --- WATCH cases ---


def test_watch_moderate_price():
    m = _make_market(no_price=0.65, yes_price=0.35, hours_until_expiry=24)
    r = evaluate(m)
    assert r.signal == WATCH


def test_watch_no_expiry():
    m = Market(
        condition_id="test",
        question="Will Musk tweet?",
        slug="test",
        end_date=None,
        active=True,
        closed=False,
        tokens=[
            Token(token_id="1", outcome="Yes", price=0.20),
            Token(token_id="2", outcome="No", price=0.80),
        ],
        market_type="musk_posting",
        is_timer_market=True,
    )
    r = evaluate(m)
    assert r.signal == WATCH


# --- evaluate_markets ---


def test_evaluate_markets_sorted_by_score():
    markets = [
        _make_market(no_price=0.60, hours_until_expiry=24),  # WATCH
        _make_market(no_price=0.85, hours_until_expiry=6),   # TRADE (high score)
        _make_market(no_price=0.75, hours_until_expiry=48),  # TRADE (lower score)
    ]
    results = evaluate_markets(markets)
    assert len(results) == 3
    assert results[0].score >= results[1].score >= results[2].score


def test_signal_result_to_dict():
    m = _make_market()
    r = evaluate(m)
    d = r.to_dict()
    assert "signal" in d
    assert "reasons" in d
    assert "score" in d
    assert "no_price" in d
    assert "timestamp" in d
