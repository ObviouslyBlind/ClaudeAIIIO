"""Family-level risk controls for paper trading.

Prevents over-stacking correlated NO exposure within one event family
(e.g. multiple brackets of "Elon Musk # tweets March 19-21").

These controls are applied BEFORE opening a trade. They do not modify
existing ledger entries.

Configurable per strategy via FamilyRiskConfig.
"""

import logging
from dataclasses import dataclass
from typing import Optional

from polymarket_timer_bot.papertrade.models import PaperTrade, OPEN

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class FamilyRiskConfig:
    """Configurable family-level risk limits.

    All limits are optional. Set to None to disable a specific check.
    """

    max_open_trades_per_family: Optional[int] = None
    max_open_exposure_per_family: Optional[float] = None
    max_open_trades_per_position_per_family: Optional[int] = None
    one_trade_per_family: bool = False  # strict testing mode

    def to_dict(self) -> dict:
        return {
            "max_open_trades_per_family": self.max_open_trades_per_family,
            "max_open_exposure_per_family": self.max_open_exposure_per_family,
            "max_open_trades_per_position_per_family": self.max_open_trades_per_position_per_family,
            "one_trade_per_family": self.one_trade_per_family,
        }


# --- Built-in configs ---

# No limits (baseline behavior)
NO_LIMITS = FamilyRiskConfig()

# Moderate caps — prevents the worst concentration
MODERATE_CAPS = FamilyRiskConfig(
    max_open_trades_per_family=3,
    max_open_exposure_per_family=500.0,
    max_open_trades_per_position_per_family=1,
)

# Strict — one trade per family for clean research
STRICT_ONE_PER_FAMILY = FamilyRiskConfig(
    one_trade_per_family=True,
)


@dataclass
class FamilyRiskCheck:
    """Result of a family risk check."""

    allowed: bool
    reason: str = ""


def check_family_risk(
    event_slug: str,
    bracket_label: str,
    bracket_position: str,
    stake: float,
    open_trades: list[PaperTrade],
    config: FamilyRiskConfig,
) -> FamilyRiskCheck:
    """Check whether opening a new trade would violate family risk limits.

    Args:
        event_slug: The event family slug for the proposed trade.
        bracket_label: The bracket label (e.g. "65-89").
        bracket_position: Classified position ("hot", "adjacent", "tail").
        stake: Proposed stake amount.
        open_trades: All currently open trades (across this ledger).
        config: Family risk configuration to enforce.

    Returns:
        FamilyRiskCheck with allowed=True if trade is permitted.
    """
    if not event_slug:
        return FamilyRiskCheck(allowed=True, reason="no event_slug, cannot check family risk")

    # Filter to same family
    family_trades = [t for t in open_trades if t.event_slug == event_slug and t.status == OPEN]
    family_exposure = sum(t.stake for t in family_trades)

    # One-trade-per-family mode (strictest)
    if config.one_trade_per_family and len(family_trades) > 0:
        return FamilyRiskCheck(
            allowed=False,
            reason=f"one_trade_per_family: already {len(family_trades)} trade(s) in {event_slug}",
        )

    # Max trades per family
    if config.max_open_trades_per_family is not None:
        if len(family_trades) >= config.max_open_trades_per_family:
            return FamilyRiskCheck(
                allowed=False,
                reason=(
                    f"max_open_trades_per_family={config.max_open_trades_per_family}: "
                    f"already {len(family_trades)} in {event_slug}"
                ),
            )

    # Max exposure per family
    if config.max_open_exposure_per_family is not None:
        if family_exposure + stake > config.max_open_exposure_per_family:
            return FamilyRiskCheck(
                allowed=False,
                reason=(
                    f"max_open_exposure_per_family=${config.max_open_exposure_per_family}: "
                    f"current=${family_exposure:.0f} + proposed=${stake:.0f} exceeds limit"
                ),
            )

    # Max trades per position bucket per family
    if config.max_open_trades_per_position_per_family is not None and bracket_position:
        position_trades = [
            t for t in family_trades
            if _classify_trade_position(t) == bracket_position
        ]
        if len(position_trades) >= config.max_open_trades_per_position_per_family:
            return FamilyRiskCheck(
                allowed=False,
                reason=(
                    f"max_open_trades_per_position_per_family="
                    f"{config.max_open_trades_per_position_per_family}: "
                    f"already {len(position_trades)} {bracket_position} trade(s) in {event_slug}"
                ),
            )

    # Duplicate suppression: same bracket in same family
    for t in family_trades:
        if t.bracket_label == bracket_label:
            return FamilyRiskCheck(
                allowed=False,
                reason=f"duplicate bracket: already have open trade for {bracket_label} in {event_slug}",
            )

    return FamilyRiskCheck(allowed=True)


def _classify_trade_position(trade: PaperTrade) -> str:
    """Best-effort position classification for an existing trade.

    This is a simplified heuristic based on bracket label patterns.
    For accurate classification, use the family lookup from generate_summary.py.
    """
    # We store position in signal_reasons if available; fallback to "unknown"
    for reason in trade.signal_reasons:
        if "position=" in reason:
            # Strategies that tag position in reasons
            for pos in ("hot", "adjacent", "tail"):
                if f"position={pos}" in reason:
                    return pos
    return "unknown"
