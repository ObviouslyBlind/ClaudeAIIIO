"""Tests for paper trading ledger."""

import json
import os
import tempfile
from datetime import datetime, timedelta

from polymarket_timer_bot.models.market import Market, Token
from polymarket_timer_bot.signals.engine import SignalResult, TRADE
from polymarket_timer_bot.papertrade.models import (
    PaperTrade,
    OPEN,
    WON,
    LOST,
    PROVENANCE,
)
from polymarket_timer_bot.papertrade.ledger import Ledger


def _make_signal(
    condition_id: str = "test-123",
    no_price: float = 0.80,
    question: str = "Will Elon tweet by Friday?",
) -> SignalResult:
    market = Market(
        condition_id=condition_id,
        question=question,
        slug="test",
        end_date=datetime.utcnow() + timedelta(hours=24),
        active=True,
        closed=False,
        tokens=[
            Token(token_id="1", outcome="Yes", price=1 - no_price),
            Token(token_id="2", outcome="No", price=no_price),
        ],
        market_type="musk_posting",
        is_timer_market=True,
    )
    return SignalResult(
        market=market,
        signal=TRADE,
        reasons=["Test signal"],
        score=75.0,
    )


# --- PaperTrade model tests ---


def test_paper_trade_pnl_won():
    """Bought NO at 0.80, resolved at 1.00 (event didn't happen)."""
    t = PaperTrade(
        trade_id="abc",
        condition_id="test",
        question="Test",
        market_type="musk_posting",
        entry_time="2026-03-18T00:00:00",
        entry_no_price=0.80,
        stake=100.0,
        signal_score=75.0,
        status=WON,
        exit_time="2026-03-19T00:00:00",
        exit_no_price=1.00,
    )
    assert t.pnl == 25.0  # (1.00 - 0.80) * (100 / 0.80) = 25.0
    assert t.pnl_pct == 25.0


def test_paper_trade_pnl_lost():
    """Bought NO at 0.80, resolved at 0.00 (event happened)."""
    t = PaperTrade(
        trade_id="abc",
        condition_id="test",
        question="Test",
        market_type="musk_posting",
        entry_time="2026-03-18T00:00:00",
        entry_no_price=0.80,
        stake=100.0,
        signal_score=75.0,
        status=LOST,
        exit_time="2026-03-19T00:00:00",
        exit_no_price=0.00,
    )
    assert t.pnl == -100.0
    assert t.pnl_pct == -100.0


def test_paper_trade_pnl_open():
    """Open trade has no P&L yet."""
    t = PaperTrade(
        trade_id="abc",
        condition_id="test",
        question="Test",
        market_type="musk_posting",
        entry_time="2026-03-18T00:00:00",
        entry_no_price=0.80,
        stake=100.0,
        signal_score=75.0,
    )
    assert t.pnl is None
    assert t.pnl_pct is None


def test_paper_trade_provenance():
    t = PaperTrade(
        trade_id="abc",
        condition_id="test",
        question="Test",
        market_type="musk_posting",
        entry_time="2026-03-18T00:00:00",
        entry_no_price=0.80,
        stake=100.0,
        signal_score=75.0,
    )
    assert t.provenance == PROVENANCE


def test_paper_trade_roundtrip():
    """to_dict and from_dict preserve all fields."""
    t = PaperTrade(
        trade_id="abc",
        condition_id="test",
        question="Test?",
        market_type="trump_posting",
        entry_time="2026-03-18T00:00:00",
        entry_no_price=0.75,
        stake=100.0,
        signal_score=80.0,
        signal_reasons=["reason1", "reason2"],
        status=WON,
        exit_time="2026-03-19T00:00:00",
        exit_no_price=1.00,
    )
    d = t.to_dict()
    t2 = PaperTrade.from_dict(d)
    assert t2.trade_id == t.trade_id
    assert t2.entry_no_price == t.entry_no_price
    assert t2.status == t.status
    assert t2.exit_no_price == t.exit_no_price
    assert t2.signal_reasons == t.signal_reasons
    assert t2.provenance == PROVENANCE


# --- Ledger tests ---


def test_ledger_open_trade():
    with tempfile.TemporaryDirectory() as tmpdir:
        ledger = Ledger(os.path.join(tmpdir, "ledger.json"))
        signal = _make_signal()
        trade = ledger.open_trade(signal)
        assert trade is not None
        assert trade.status == OPEN
        assert trade.entry_no_price == 0.80
        assert trade.stake == 100.0
        assert trade.provenance == PROVENANCE
        assert len(ledger.trades) == 1


def test_ledger_no_duplicate():
    """Opening the same market twice should skip the second."""
    with tempfile.TemporaryDirectory() as tmpdir:
        ledger = Ledger(os.path.join(tmpdir, "ledger.json"))
        signal = _make_signal(condition_id="same-market")
        ledger.open_trade(signal)
        dupe = ledger.open_trade(signal)
        assert dupe is None
        assert len(ledger.trades) == 1


def test_ledger_close_trade_won():
    with tempfile.TemporaryDirectory() as tmpdir:
        ledger = Ledger(os.path.join(tmpdir, "ledger.json"))
        signal = _make_signal()
        trade = ledger.open_trade(signal)
        closed = ledger.close_trade(trade.trade_id, exit_no_price=1.00, status=WON)
        assert closed is not None
        assert closed.status == WON
        assert closed.pnl == 25.0


def test_ledger_close_trade_lost():
    with tempfile.TemporaryDirectory() as tmpdir:
        ledger = Ledger(os.path.join(tmpdir, "ledger.json"))
        signal = _make_signal()
        trade = ledger.open_trade(signal)
        closed = ledger.close_trade(trade.trade_id, exit_no_price=0.00, status=LOST)
        assert closed is not None
        assert closed.status == LOST
        assert closed.pnl == -100.0


def test_ledger_persistence():
    """Ledger should persist across reloads."""
    with tempfile.TemporaryDirectory() as tmpdir:
        path = os.path.join(tmpdir, "ledger.json")
        ledger1 = Ledger(path)
        ledger1.open_trade(_make_signal(condition_id="m1"))
        ledger1.open_trade(_make_signal(condition_id="m2"))

        # Reload
        ledger2 = Ledger(path)
        assert len(ledger2.trades) == 2
        assert ledger2.trades[0].condition_id == "m1"
        assert ledger2.trades[1].condition_id == "m2"


def test_ledger_summary():
    with tempfile.TemporaryDirectory() as tmpdir:
        ledger = Ledger(os.path.join(tmpdir, "ledger.json"))
        s1 = _make_signal(condition_id="m1")
        s2 = _make_signal(condition_id="m2")
        t1 = ledger.open_trade(s1)
        t2 = ledger.open_trade(s2)

        # Close one as won
        ledger.close_trade(t1.trade_id, exit_no_price=1.00, status=WON)

        summary = ledger.summary()
        assert summary["total_trades"] == 2
        assert summary["open_trades"] == 1
        assert summary["closed_trades"] == 1
        assert summary["wins"] == 1
        assert summary["losses"] == 0
        assert summary["win_rate_pct"] == 100.0
        assert summary["total_pnl"] == 25.0
        assert summary["provenance"] == PROVENANCE
