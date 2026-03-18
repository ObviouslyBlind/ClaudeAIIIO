"""Tests for strategy, profile, and engine parameterization."""

from datetime import datetime, timedelta

from polymarket_timer_bot.models.market import Market, Token
from polymarket_timer_bot.signals.engine import evaluate, evaluate_markets, TRADE, WATCH, SKIP
from polymarket_timer_bot.signals.strategy import (
    CONSERVATIVE,
    MODERATE,
    AGGRESSIVE,
    NO_SIDE_V1,
    Strategy,
    Profile,
    StrategyConfig,
    DEFAULT_CONFIG,
    STRATEGIES,
    PROFILES,
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


# --- Strategy/Profile structure ---

def test_default_config_is_moderate():
    assert DEFAULT_CONFIG.profile.profile_id == "moderate"
    assert DEFAULT_CONFIG.strategy.strategy_id == "no_side"


def test_config_label():
    config = StrategyConfig(strategy=NO_SIDE_V1, profile=MODERATE)
    assert config.label() == "no_side@1.0/moderate"


def test_config_to_dict():
    config = DEFAULT_CONFIG
    d = config.to_dict()
    assert d["strategy_id"] == "no_side"
    assert d["profile_id"] == "moderate"
    assert d["no_price_trade_min"] == 0.70


def test_registries_populated():
    assert "no_side" in STRATEGIES
    assert "conservative" in PROFILES
    assert "moderate" in PROFILES
    assert "aggressive" in PROFILES


# --- Profile-parameterized evaluation ---

def test_conservative_requires_higher_no_price():
    """Conservative profile requires NO >= 0.80 for TRADE (vs 0.70 for moderate)."""
    m = _make_market(no_price=0.75, yes_price=0.25)
    conservative = StrategyConfig(strategy=NO_SIDE_V1, profile=CONSERVATIVE)
    moderate = StrategyConfig(strategy=NO_SIDE_V1, profile=MODERATE)

    r_cons = evaluate(m, conservative)
    r_mod = evaluate(m, moderate)

    assert r_mod.signal == TRADE
    assert r_cons.signal == WATCH  # 0.75 < 0.80 conservative threshold


def test_conservative_shorter_max_expiry():
    """Conservative profile maxes at 48h (vs 72h for moderate)."""
    m = _make_market(no_price=0.85, hours_until_expiry=60)
    conservative = StrategyConfig(strategy=NO_SIDE_V1, profile=CONSERVATIVE)
    moderate = StrategyConfig(strategy=NO_SIDE_V1, profile=MODERATE)

    r_cons = evaluate(m, conservative)
    r_mod = evaluate(m, moderate)

    assert r_mod.signal == TRADE
    assert r_cons.signal == SKIP  # 60h > 48h conservative max


def test_aggressive_lower_no_price_floor():
    """Aggressive profile allows NO >= 0.40 (vs 0.50 for moderate)."""
    m = _make_market(no_price=0.45, yes_price=0.55)
    aggressive = StrategyConfig(strategy=NO_SIDE_V1, profile=AGGRESSIVE)
    moderate = StrategyConfig(strategy=NO_SIDE_V1, profile=MODERATE)

    r_agg = evaluate(m, aggressive)
    r_mod = evaluate(m, moderate)

    # Moderate skips at 0.45 (mixed evidence zone or below min)
    assert r_mod.signal == SKIP
    # Aggressive has mixed_evidence zone 0.45-0.55, so YES=0.55 is at boundary
    # But NO price 0.45 is above aggressive min (0.40)
    assert r_agg.signal in (WATCH, SKIP)  # 0.55 is right at mixed boundary


def test_aggressive_lower_trade_min():
    """Aggressive profile trades at NO >= 0.60 (vs 0.70 for moderate)."""
    m = _make_market(no_price=0.65, yes_price=0.35)
    aggressive = StrategyConfig(strategy=NO_SIDE_V1, profile=AGGRESSIVE)
    moderate = StrategyConfig(strategy=NO_SIDE_V1, profile=MODERATE)

    r_agg = evaluate(m, aggressive)
    r_mod = evaluate(m, moderate)

    assert r_agg.signal == TRADE
    assert r_mod.signal == WATCH


def test_result_carries_strategy_info():
    """SignalResult should carry strategy_id and profile_id."""
    m = _make_market()
    config = StrategyConfig(strategy=NO_SIDE_V1, profile=CONSERVATIVE)
    r = evaluate(m, config)
    assert r.strategy_id == "no_side"
    assert r.profile_id == "conservative"
    d = r.to_dict()
    assert d["strategy_id"] == "no_side"
    assert d["profile_id"] == "conservative"


def test_evaluate_markets_with_config():
    """evaluate_markets should accept config and attribute results."""
    markets = [
        _make_market(no_price=0.85, hours_until_expiry=6),
        _make_market(no_price=0.65, hours_until_expiry=24),
    ]
    config = StrategyConfig(strategy=NO_SIDE_V1, profile=MODERATE)
    results = evaluate_markets(markets, config)
    assert len(results) == 2
    assert all(r.strategy_id == "no_side" for r in results)
    assert all(r.profile_id == "moderate" for r in results)


def test_backward_compat_no_config():
    """evaluate() without config should use DEFAULT_CONFIG."""
    m = _make_market()
    r = evaluate(m)
    assert r.strategy_id == "no_side"
    assert r.profile_id == "moderate"
