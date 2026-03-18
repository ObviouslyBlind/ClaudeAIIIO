"""Signal engine: evaluates markets and outputs TRADE / WATCH / SKIP.

Accepts an optional StrategyConfig to parameterize thresholds.
Without one, uses DEFAULT_CONFIG (original Phase 4 thresholds).
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from polymarket_timer_bot.models.market import Market
from polymarket_timer_bot.signals.strategy import (
    DEFAULT_CONFIG,
    Profile,
    StrategyConfig,
)

logger = logging.getLogger(__name__)

# Signal outputs
TRADE = "TRADE"
WATCH = "WATCH"
SKIP = "SKIP"


@dataclass
class SignalResult:
    """Result of evaluating a market."""

    market: Market
    signal: str  # TRADE, WATCH, or SKIP
    reasons: list[str] = field(default_factory=list)
    score: float = 0.0  # 0-100, higher = stronger signal
    timestamp: str = ""
    strategy_id: str = ""
    profile_id: str = ""

    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.utcnow().isoformat()

    def to_dict(self) -> dict:
        return {
            "condition_id": self.market.condition_id,
            "question": self.market.question,
            "signal": self.signal,
            "reasons": self.reasons,
            "score": self.score,
            "no_price": self.market.no_price,
            "yes_price": self.market.yes_price,
            "hours_until_expiry": self.market.hours_until_expiry,
            "market_type": self.market.market_type,
            "event_slug": self.market.event_slug,
            "event_title": self.market.event_title,
            "bracket_label": self.market.bracket_label,
            "strategy_id": self.strategy_id,
            "profile_id": self.profile_id,
            "timestamp": self.timestamp,
        }


def evaluate(
    market: Market,
    config: Optional[StrategyConfig] = None,
) -> SignalResult:
    """Evaluate a single market and return a signal with reasoning.

    Uses config thresholds if provided, otherwise DEFAULT_CONFIG.
    """
    if config is None:
        config = DEFAULT_CONFIG
    p = config.profile
    reasons = []
    score = 50.0  # Start neutral

    def _result(signal, score=0.0):
        return SignalResult(
            market=market, signal=signal, reasons=reasons,
            score=max(0.0, min(100.0, score)),
            strategy_id=config.strategy.strategy_id,
            profile_id=config.profile.profile_id,
        )

    # --- Hard SKIPs ---

    if market.closed:
        reasons.append("Market is closed.")
        return _result(SKIP)

    if not market.active:
        reasons.append("Market is inactive.")
        return _result(SKIP)

    if not market.market_type:
        reasons.append("Not a Musk/Trump posting market.")
        return _result(SKIP)

    if not market.is_timer_market:
        reasons.append("Not a timer-style market (no deadline).")
        return _result(SKIP)

    # --- Price checks ---

    no_price = market.no_price
    yes_price = market.yes_price

    if no_price is None:
        reasons.append("No NO token price available.")
        return _result(SKIP)

    if no_price > p.no_price_max:
        reasons.append(f"NO price {no_price:.2f} > {p.no_price_max} — not enough upside.")
        return _result(SKIP, 10)

    if no_price < p.no_price_min:
        reasons.append(
            f"NO price {no_price:.2f} < {p.no_price_min} — market thinks event is likely."
        )
        return _result(SKIP, 10)

    # Mixed evidence check
    if yes_price is not None and p.mixed_evidence_low <= yes_price <= p.mixed_evidence_high:
        reasons.append(
            f"YES price {yes_price:.2f} is in the mixed-evidence zone "
            f"({p.mixed_evidence_low}-{p.mixed_evidence_high}). Too uncertain."
        )
        return _result(SKIP, 20)

    # --- Expiry checks ---

    hours_left = market.hours_until_expiry

    if hours_left is None:
        reasons.append("No expiry date — cannot assess time risk.")
        return _result(WATCH, 30)

    if hours_left <= 0:
        reasons.append("Market has expired.")
        return _result(SKIP, 0)

    if hours_left > p.max_hours_to_expiry:
        reasons.append(
            f"Expiry in {hours_left:.1f}h — exceeds {p.max_hours_to_expiry}h max."
        )
        return _result(SKIP, 15)

    # --- Scoring for viable markets ---

    if no_price >= p.no_price_trade_min:
        price_score = ((no_price - p.no_price_trade_min) / (p.no_price_max - p.no_price_trade_min)) * 40
        score += price_score
        reasons.append(f"NO price {no_price:.2f} — good upside potential.")
    else:
        score -= 10
        reasons.append(f"NO price {no_price:.2f} — moderate, worth watching.")

    if hours_left <= 12:
        score += 20
        reasons.append(f"Only {hours_left:.1f}h until expiry — time pressure favors NO.")
    elif hours_left <= 24:
        score += 10
        reasons.append(f"{hours_left:.1f}h until expiry — approaching deadline.")
    elif hours_left <= 48:
        score += 5
        reasons.append(f"{hours_left:.1f}h until expiry — within 2-day window.")
    else:
        reasons.append(f"{hours_left:.1f}h until expiry — within 3-day limit.")

    # --- Final decision ---

    if no_price >= p.no_price_trade_min and hours_left <= p.max_hours_to_expiry:
        signal = TRADE
        reasons.append("TRADE: NO price and expiry both favorable.")
    else:
        signal = WATCH
        reasons.append("WATCH: conditions not strong enough for a trade yet.")

    return _result(signal, score)


def evaluate_markets(
    markets: list[Market],
    config: Optional[StrategyConfig] = None,
) -> list[SignalResult]:
    """Evaluate a list of markets and return results sorted by score."""
    if config is None:
        config = DEFAULT_CONFIG
    results = []
    for market in markets:
        result = evaluate(market, config)
        results.append(result)
        logger.info(
            "[%s|%s] %s (score=%.0f) — %s",
            config.strategy.strategy_id,
            result.signal,
            market.question[:60],
            result.score,
            "; ".join(result.reasons),
        )
    results.sort(key=lambda r: r.score, reverse=True)
    return results
