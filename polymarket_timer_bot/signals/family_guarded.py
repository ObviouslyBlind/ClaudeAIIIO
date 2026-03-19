"""Family-guarded NO signal engine (family_guarded_no@0.1).

A stricter version of the baseline NO-side logic with:
  - Position-aware thresholds (tail easier, adjacent harder, hot blocked)
  - Family risk controls enforced at signal level
  - Bracket position tagged in signal reasons for downstream tracking

This is a RESEARCH strategy with SEPARATE ledgers. Paper only.
"""

import logging
from typing import Optional

from polymarket_timer_bot.models.market import Market
from polymarket_timer_bot.signals.engine import SignalResult, TRADE, WATCH, SKIP
from polymarket_timer_bot.signals.strategy import StrategyConfig, DEFAULT_CONFIG

logger = logging.getLogger(__name__)


def evaluate(
    market: Market,
    config: Optional[StrategyConfig] = None,
    bracket_position: str = "unknown",
) -> SignalResult:
    """Evaluate a single market with position-aware thresholds.

    Args:
        market: The market to evaluate.
        config: Strategy config with position-specific profile thresholds.
        bracket_position: "hot", "adjacent", "tail", or "unknown".
    """
    if config is None:
        config = DEFAULT_CONFIG
    p = config.profile
    reasons = []
    score = 50.0

    def _result(signal, score=0.0):
        return SignalResult(
            market=market, signal=signal, reasons=reasons,
            score=max(0.0, min(100.0, score)),
            strategy_id=config.strategy.strategy_id,
            profile_id=config.profile.profile_id,
        )

    # Tag position for downstream tracking
    reasons.append(f"position={bracket_position}")

    # --- Hard SKIPs (same as baseline) ---

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

    # --- Hot bracket gate ---
    if bracket_position == "hot" and not p.hot_allowed:
        reasons.append("SKIP: hot bracket blocked by family_guarded policy.")
        return _result(SKIP, 5)

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
        reasons.append(f"NO price {no_price:.2f} < {p.no_price_min} — market thinks event is likely.")
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
        reasons.append(f"Expiry in {hours_left:.1f}h — exceeds {p.max_hours_to_expiry}h max.")
        return _result(SKIP, 15)

    # --- Position-aware trade threshold ---

    trade_threshold = _get_position_threshold(p, bracket_position)
    reasons.append(f"Position threshold for {bracket_position}: NO >= {trade_threshold:.2f}")

    # --- Scoring ---

    if no_price >= trade_threshold:
        price_score = ((no_price - trade_threshold) / (p.no_price_max - trade_threshold)) * 40
        score += price_score
        reasons.append(f"NO price {no_price:.2f} — above {bracket_position} threshold.")
    else:
        score -= 10
        reasons.append(
            f"NO price {no_price:.2f} — below {bracket_position} threshold "
            f"({trade_threshold:.2f}). WATCH only."
        )

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

    if no_price >= trade_threshold and hours_left <= p.max_hours_to_expiry:
        signal = TRADE
        reasons.append(f"TRADE: NO price and expiry favorable for {bracket_position} position.")
    else:
        signal = WATCH
        reasons.append("WATCH: conditions not strong enough for a trade yet.")

    return _result(signal, score)


def evaluate_markets(
    markets: list[Market],
    config: Optional[StrategyConfig] = None,
    family_brackets: Optional[dict] = None,
) -> list[SignalResult]:
    """Evaluate markets with position-aware thresholds.

    Args:
        markets: Markets to evaluate.
        config: Strategy configuration.
        family_brackets: Dict of event_slug → list of bracket dicts for position classification.
    """
    if config is None:
        config = DEFAULT_CONFIG
    if family_brackets is None:
        family_brackets = {}

    results = []
    for market in markets:
        position = _classify_position(market, family_brackets)
        result = evaluate(market, config, bracket_position=position)
        results.append(result)
        logger.info(
            "[%s|%s|%s] %s (score=%.0f)",
            config.strategy.strategy_id,
            result.signal,
            position,
            market.question[:50],
            result.score,
        )
    results.sort(key=lambda r: r.score, reverse=True)
    return results


def _get_position_threshold(profile, position: str) -> float:
    """Get the NO price trade threshold for a bracket position."""
    if position == "tail" and profile.tail_no_price_trade_min is not None:
        return profile.tail_no_price_trade_min
    if position == "adjacent" and profile.adjacent_no_price_trade_min is not None:
        return profile.adjacent_no_price_trade_min
    if position == "hot" and profile.hot_no_price_trade_min is not None:
        return profile.hot_no_price_trade_min
    return profile.no_price_trade_min


def _classify_position(market: Market, family_brackets: dict) -> str:
    """Classify a market's bracket position within its family."""
    slug = market.event_slug
    bracket = market.bracket_label
    if not slug or not bracket:
        return "unknown"
    brackets = family_brackets.get(slug, [])
    if len(brackets) < 2:
        return "unknown"

    # Sort by bracket label natural order
    sorted_b = sorted(brackets, key=lambda b: _parse_bracket_key(b.get("bracket_label", "")))

    # Find hot bracket (highest YES price)
    hot_idx = 0
    hot_yes = 0
    for i, b in enumerate(sorted_b):
        yp = b.get("yes_price", 0) or 0
        if yp > hot_yes:
            hot_yes = yp
            hot_idx = i

    my_idx = None
    for i, b in enumerate(sorted_b):
        if b.get("bracket_label") == bracket:
            my_idx = i
            break

    if my_idx is None:
        return "unknown"

    distance = abs(my_idx - hot_idx)
    if distance == 0:
        return "hot"
    if distance <= 1:
        return "adjacent"
    return "tail"


def _parse_bracket_key(label: str) -> int:
    """Parse a bracket label into a sortable numeric key."""
    if not label:
        return 999999
    label = label.strip()
    if label.startswith("<"):
        return -1
    if label.endswith("+"):
        try:
            return int(label[:-1])
        except ValueError:
            return 999999
    parts = label.split("-")
    try:
        return int(parts[0])
    except ValueError:
        return 999999
