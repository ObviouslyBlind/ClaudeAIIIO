"""Paper trading ledger: open, close, and track simulated trades."""

import json
import logging
import os
import uuid
from datetime import datetime
from typing import Optional

from polymarket_timer_bot.papertrade.models import (
    PaperTrade,
    OPEN,
    WON,
    LOST,
    EXPIRED,
    CANCELLED,
    TERMINAL_STATES,
    PROVENANCE,
)
from polymarket_timer_bot.signals.engine import SignalResult

logger = logging.getLogger(__name__)

DEFAULT_STAKE = 100.0  # Simulated dollars per trade


class Ledger:
    """Paper trading ledger backed by a JSON file."""

    def __init__(self, ledger_path: str):
        self.ledger_path = ledger_path
        self.trades: list[PaperTrade] = []
        self._load()

    def _load(self):
        """Load trades from the ledger file."""
        if os.path.exists(self.ledger_path):
            with open(self.ledger_path) as f:
                data = json.load(f)
            self.trades = [PaperTrade.from_dict(d) for d in data]
            logger.info("Loaded %d trades from ledger", len(self.trades))
        else:
            self.trades = []
            logger.info("No existing ledger found, starting fresh")

    def _save(self):
        """Save trades to the ledger file."""
        os.makedirs(os.path.dirname(self.ledger_path), exist_ok=True)
        with open(self.ledger_path, "w") as f:
            json.dump([t.to_dict() for t in self.trades], f, indent=2)
        logger.info("Saved %d trades to ledger", len(self.trades))

    def open_trade(
        self,
        signal: SignalResult,
        stake: float = DEFAULT_STAKE,
    ) -> Optional[PaperTrade]:
        """Open a new paper trade from a signal result.

        Returns the trade if opened, None if skipped (e.g., duplicate).
        """
        # Don't open duplicate trades for the same market
        for t in self.trades:
            if t.condition_id == signal.market.condition_id and t.status == OPEN:
                logger.info(
                    "Skipping duplicate: already have open trade for %s",
                    signal.market.question[:50],
                )
                return None

        no_price = signal.market.no_price
        if no_price is None or no_price <= 0:
            logger.warning("Cannot open trade: no valid NO price for %s", signal.market.question[:50])
            return None

        trade = PaperTrade(
            trade_id=str(uuid.uuid4())[:8],
            condition_id=signal.market.condition_id,
            question=signal.market.question,
            market_type=signal.market.market_type,
            entry_time=datetime.utcnow().isoformat(),
            entry_no_price=no_price,
            stake=stake,
            signal_score=signal.score,
            signal_reasons=signal.reasons,
            event_slug=signal.market.event_slug,
            event_title=signal.market.event_title,
            bracket_label=signal.market.bracket_label,
        )

        self.trades.append(trade)
        self._save()
        logger.info(
            "Opened trade %s: %s @ NO=%.2f stake=$%.0f [%s]",
            trade.trade_id,
            trade.question[:40],
            trade.entry_no_price,
            trade.stake,
            PROVENANCE,
        )
        return trade

    def close_trade(
        self,
        trade_id: str,
        exit_no_price: float,
        status: str,
    ) -> Optional[PaperTrade]:
        """Close an open trade with a resolution price.

        status should be WON (event didn't happen, NO=1.0),
        LOST (event happened, NO=0.0), or EXPIRED.
        """
        for trade in self.trades:
            if trade.trade_id == trade_id and trade.status == OPEN:
                trade.exit_time = datetime.utcnow().isoformat()
                trade.exit_no_price = exit_no_price
                trade.status = status
                self._save()
                logger.info(
                    "Closed trade %s: %s → %s P&L=$%.2f [%s]",
                    trade.trade_id,
                    trade.question[:40],
                    status,
                    trade.pnl or 0,
                    PROVENANCE,
                )
                return trade
        logger.warning("Trade %s not found or not open", trade_id)
        return None

    def get_open_trades(self) -> list[PaperTrade]:
        return [t for t in self.trades if t.status == OPEN]

    def get_closed_trades(self) -> list[PaperTrade]:
        return [t for t in self.trades if t.status != OPEN]

    def summary(self) -> dict:
        """Return a summary of the ledger."""
        open_trades = self.get_open_trades()
        closed_trades = self.get_closed_trades()
        wins = [t for t in closed_trades if t.status == WON]
        losses = [t for t in closed_trades if t.status == LOST]
        expired = [t for t in closed_trades if t.status == EXPIRED]
        cancelled = [t for t in closed_trades if t.status == CANCELLED]

        # Win rate excludes cancelled/expired — only counts definitive outcomes
        definitive = len(wins) + len(losses)
        win_rate = (len(wins) / definitive * 100) if definitive else 0.0

        total_pnl = sum(t.pnl for t in closed_trades if t.pnl is not None)
        total_staked = sum(t.stake for t in closed_trades)

        return {
            "provenance": PROVENANCE,
            "total_trades": len(self.trades),
            "open_trades": len(open_trades),
            "closed_trades": len(closed_trades),
            "wins": len(wins),
            "losses": len(losses),
            "expired": len(expired),
            "cancelled": len(cancelled),
            "win_rate_pct": round(win_rate, 1),
            "total_pnl": round(total_pnl, 2),
            "total_staked": round(total_staked, 2),
            "open_exposure": round(sum(t.stake for t in open_trades), 2),
        }
