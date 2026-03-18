"""Signal engine: evaluates markets and outputs TRADE / WATCH / SKIP."""

import logging
from dataclasses import dataclass, field
from datetime import datetime

from polymarket_timer_bot.models.market import Market

logger = logging.getLogger(__name__)

# Signal outputs
TRADE = "TRADE"
WATCH = "WATCH"
SKIP = "SKIP"

# Thresholds
MAX_HOURS_TO_EXPIRY = 72  # 3 days
NO_PRICE_MIN = 0.50  # Below this, NO side is too risky
NO_PRICE_MAX = 0.95  # Above this, not enough upside
NO_PRICE_TRADE_MIN = 0.70  # Minimum NO price to consider a TRADE
MIXED_EVIDENCE_LOW = 0.40  # YES price range indicating uncertainty
MIXED_EVIDENCE_HIGH = 0.60


@dataclass
class SignalResult:
    """Result of evaluating a market."""

    market: Market
    signal: str  # TRADE, WATCH, or SKIP
    reasons: list[str] = field(default_factory=list)
    score: float = 0.0  # 0-100, higher = stronger signal
    timestamp: str = ""

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
            "timestamp": self.timestamp,
        }


def evaluate(market: Market) -> SignalResult:
    """Evaluate a single market and return a signal with reasoning."""
    reasons = []
    score = 50.0  # Start neutral

    # --- Hard SKIPs ---

    if market.closed:
        return SignalResult(market=market, signal=SKIP, reasons=["Market is closed."])

    if not market.active:
        return SignalResult(market=market, signal=SKIP, reasons=["Market is inactive."])

    if not market.market_type:
        return SignalResult(
            market=market, signal=SKIP,
            reasons=["Not a Musk/Trump posting market."],
        )

    if not market.is_timer_market:
        return SignalResult(
            market=market, signal=SKIP,
            reasons=["Not a timer-style market (no deadline)."],
        )

    # --- Price checks ---

    no_price = market.no_price
    yes_price = market.yes_price

    if no_price is None:
        return SignalResult(
            market=market, signal=SKIP,
            reasons=["No NO token price available."],
        )

    if no_price > NO_PRICE_MAX:
        reasons.append(f"NO price {no_price:.2f} > {NO_PRICE_MAX} — not enough upside.")
        return SignalResult(market=market, signal=SKIP, reasons=reasons, score=10)

    if no_price < NO_PRICE_MIN:
        reasons.append(
            f"NO price {no_price:.2f} < {NO_PRICE_MIN} — market thinks event is likely."
        )
        return SignalResult(market=market, signal=SKIP, reasons=reasons, score=10)

    # Mixed evidence check
    if yes_price is not None and MIXED_EVIDENCE_LOW <= yes_price <= MIXED_EVIDENCE_HIGH:
        reasons.append(
            f"YES price {yes_price:.2f} is in the mixed-evidence zone "
            f"({MIXED_EVIDENCE_LOW}-{MIXED_EVIDENCE_HIGH}). Too uncertain."
        )
        return SignalResult(market=market, signal=SKIP, reasons=reasons, score=20)

    # --- Expiry checks ---

    hours_left = market.hours_until_expiry

    if hours_left is None:
        reasons.append("No expiry date — cannot assess time risk.")
        return SignalResult(market=market, signal=WATCH, reasons=reasons, score=30)

    if hours_left <= 0:
        reasons.append("Market has expired.")
        return SignalResult(market=market, signal=SKIP, reasons=reasons, score=0)

    if hours_left > MAX_HOURS_TO_EXPIRY:
        reasons.append(
            f"Expiry in {hours_left:.1f}h — exceeds {MAX_HOURS_TO_EXPIRY}h max."
        )
        return SignalResult(market=market, signal=SKIP, reasons=reasons, score=15)

    # --- Scoring for viable markets ---

    # Higher NO price = more upside
    if no_price >= NO_PRICE_TRADE_MIN:
        price_score = ((no_price - NO_PRICE_TRADE_MIN) / (NO_PRICE_MAX - NO_PRICE_TRADE_MIN)) * 40
        score += price_score
        reasons.append(f"NO price {no_price:.2f} — good upside potential.")
    else:
        # WATCH zone: 0.50 - 0.70
        score -= 10
        reasons.append(f"NO price {no_price:.2f} — moderate, worth watching.")

    # Closer to expiry without the event = stronger NO signal
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

    if no_price >= NO_PRICE_TRADE_MIN and hours_left <= MAX_HOURS_TO_EXPIRY:
        signal = TRADE
        reasons.append("TRADE: NO price and expiry both favorable.")
    else:
        signal = WATCH
        reasons.append("WATCH: conditions not strong enough for a trade yet.")

    return SignalResult(market=market, signal=signal, reasons=reasons, score=max(0, min(100, score)))


def evaluate_markets(markets: list[Market]) -> list[SignalResult]:
    """Evaluate a list of markets and return results sorted by score."""
    results = []
    for market in markets:
        result = evaluate(market)
        results.append(result)
        logger.info(
            "[%s] %s (score=%.0f) — %s",
            result.signal,
            market.question[:60],
            result.score,
            "; ".join(result.reasons),
        )
    results.sort(key=lambda r: r.score, reverse=True)
    return results
