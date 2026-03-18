"""Tests for trade resolution logic."""

from polymarket_timer_bot.models.market import Market, Token
from polymarket_timer_bot.papertrade.models import WON, LOST, EXPIRED

# Import the resolve function directly from the script
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))
from resolve_trades import resolve_market


def _make_market(closed=False, no_winner=None, yes_winner=None, no_price=0.80):
    tokens = [
        Token(token_id="1", outcome="Yes", price=1 - no_price, winner=yes_winner),
        Token(token_id="2", outcome="No", price=no_price, winner=no_winner),
    ]
    return Market(
        condition_id="test",
        question="Test market",
        slug="test",
        end_date=None,
        active=not closed,
        closed=closed,
        tokens=tokens,
    )


def test_resolve_open_market():
    """Open market should not resolve."""
    m = _make_market(closed=False)
    assert resolve_market(m) is None


def test_resolve_no_won():
    """Closed market where NO token won → WON."""
    m = _make_market(closed=True, no_winner=True, yes_winner=False)
    status, price = resolve_market(m)
    assert status == WON
    assert price == 1.00


def test_resolve_yes_won():
    """Closed market where YES token won → LOST."""
    m = _make_market(closed=True, yes_winner=True, no_winner=False)
    status, price = resolve_market(m)
    assert status == LOST
    assert price == 0.00


def test_resolve_closed_no_winner_info():
    """Closed market with no winner flags → EXPIRED at last NO price."""
    m = _make_market(closed=True, no_price=0.75)
    status, price = resolve_market(m)
    assert status == EXPIRED
    assert price == 0.75


def test_resolve_closed_no_tokens_no_price():
    """Closed market with no winner and no NO price → EXPIRED at 0.50."""
    m = Market(
        condition_id="test",
        question="Test",
        slug="test",
        end_date=None,
        active=False,
        closed=True,
        tokens=[],
    )
    status, price = resolve_market(m)
    assert status == EXPIRED
    assert price == 0.50
