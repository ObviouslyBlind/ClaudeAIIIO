"""Data models for paper trading."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

# Trade statuses — explicit lifecycle
#
# Lifecycle:
#   OPEN → WON      (market closed, NO token won — event didn't happen)
#   OPEN → LOST     (market closed, YES token won — event happened)
#   OPEN → EXPIRED  (market closed, no winner info from API)
#   OPEN → CANCELLED (manual only — market removed, data error, etc.)
#
# CANCELLED is defined but not set automatically by any code path.
# It exists for manual corrections. If automated cancellation triggers
# are identified, they should be added to resolve_trades.py.
#
# Terminal states: WON, LOST, EXPIRED, CANCELLED (cannot reopen)
# Only OPEN trades can be closed/resolved.
OPEN = "OPEN"
WON = "WON"
LOST = "LOST"
EXPIRED = "EXPIRED"
CANCELLED = "CANCELLED"

# All terminal states (trade is done, has P&L or is invalidated)
TERMINAL_STATES = {WON, LOST, EXPIRED, CANCELLED}

# Data provenance
PROVENANCE = "SIMULATED"


@dataclass
class PaperTrade:
    """A single paper trade record."""

    trade_id: str
    condition_id: str
    question: str
    market_type: str  # "musk_posting" or "trump_posting"

    # Entry
    entry_time: str
    entry_no_price: float
    stake: float  # Simulated dollar amount
    signal_score: float
    signal_reasons: list[str] = field(default_factory=list)

    # Status — see lifecycle comment at top of file
    status: str = OPEN  # OPEN → WON / LOST / EXPIRED / CANCELLED

    # Exit (filled on resolution)
    exit_time: Optional[str] = None
    exit_no_price: Optional[float] = None

    # Event context (preserved from discovery)
    event_slug: str = ""
    event_title: str = ""
    bracket_label: str = ""

    # Provenance
    provenance: str = PROVENANCE

    @property
    def pnl(self) -> Optional[float]:
        """Calculate P&L. None if trade is still open."""
        if self.exit_no_price is None:
            return None
        # Bought NO at entry_no_price, resolved at exit_no_price
        # Profit = (exit - entry) * (stake / entry)
        shares = self.stake / self.entry_no_price
        return round((self.exit_no_price - self.entry_no_price) * shares, 2)

    @property
    def pnl_pct(self) -> Optional[float]:
        """P&L as percentage of stake. None if still open."""
        if self.pnl is None:
            return None
        if self.stake == 0:
            return 0.0
        return round((self.pnl / self.stake) * 100, 2)

    def to_dict(self) -> dict:
        return {
            "trade_id": self.trade_id,
            "condition_id": self.condition_id,
            "question": self.question,
            "market_type": self.market_type,
            "event_slug": self.event_slug,
            "event_title": self.event_title,
            "bracket_label": self.bracket_label,
            "entry_time": self.entry_time,
            "entry_no_price": self.entry_no_price,
            "stake": self.stake,
            "signal_score": self.signal_score,
            "signal_reasons": self.signal_reasons,
            "status": self.status,
            "exit_time": self.exit_time,
            "exit_no_price": self.exit_no_price,
            "pnl": self.pnl,
            "pnl_pct": self.pnl_pct,
            "provenance": self.provenance,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "PaperTrade":
        return cls(
            trade_id=d["trade_id"],
            condition_id=d["condition_id"],
            question=d["question"],
            market_type=d["market_type"],
            entry_time=d["entry_time"],
            entry_no_price=d["entry_no_price"],
            stake=d["stake"],
            signal_score=d["signal_score"],
            signal_reasons=d.get("signal_reasons", []),
            status=d.get("status", OPEN),
            exit_time=d.get("exit_time"),
            exit_no_price=d.get("exit_no_price"),
            event_slug=d.get("event_slug", ""),
            event_title=d.get("event_title", ""),
            bracket_label=d.get("bracket_label", ""),
            provenance=d.get("provenance", PROVENANCE),
        )
