"""Strategy and profile definitions for parameterized signal evaluation.

A Strategy defines WHAT to do (which signal rules apply).
A Profile defines HOW aggressively to express it (thresholds, limits).

The signal engine uses a StrategyConfig (strategy + profile combined)
to evaluate markets. This keeps the engine shared while making parameters
explicit and attributable.
"""

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Strategy:
    """Defines signal logic variant. Strategy decides what to do."""

    strategy_id: str
    version: str  # semver-like, e.g. "1.0"
    description: str = ""

    def label(self) -> str:
        return f"{self.strategy_id}@{self.version}"


@dataclass(frozen=True)
class Profile:
    """Risk/aggression profile. Profile decides how cautiously to act."""

    profile_id: str  # "conservative", "moderate", "aggressive"
    description: str = ""

    # Price thresholds
    no_price_min: float = 0.50
    no_price_max: float = 0.95
    no_price_trade_min: float = 0.70

    # Mixed evidence zone
    mixed_evidence_low: float = 0.40
    mixed_evidence_high: float = 0.60

    # Time
    max_hours_to_expiry: float = 72.0

    # Position sizing
    default_stake: float = 100.0


@dataclass(frozen=True)
class StrategyConfig:
    """Combined strategy + profile for a single evaluation run."""

    strategy: Strategy
    profile: Profile

    def label(self) -> str:
        return f"{self.strategy.label()}/{self.profile.profile_id}"

    def to_dict(self) -> dict:
        return {
            "strategy_id": self.strategy.strategy_id,
            "strategy_version": self.strategy.version,
            "strategy_description": self.strategy.description,
            "profile_id": self.profile.profile_id,
            "profile_description": self.profile.description,
            "no_price_min": self.profile.no_price_min,
            "no_price_max": self.profile.no_price_max,
            "no_price_trade_min": self.profile.no_price_trade_min,
            "mixed_evidence_low": self.profile.mixed_evidence_low,
            "mixed_evidence_high": self.profile.mixed_evidence_high,
            "max_hours_to_expiry": self.profile.max_hours_to_expiry,
            "default_stake": self.profile.default_stake,
        }


# ---- Built-in strategies ----

NO_SIDE_V1 = Strategy(
    strategy_id="no_side",
    version="1.0",
    description="Original NO-side timer strategy: bet NO on bracket markets where event is unlikely by deadline.",
)


# ---- Built-in profiles ----

CONSERVATIVE = Profile(
    profile_id="conservative",
    description="Low risk: high NO price required, short expiry, small stakes.",
    no_price_min=0.60,
    no_price_max=0.95,
    no_price_trade_min=0.80,
    mixed_evidence_low=0.35,
    mixed_evidence_high=0.65,
    max_hours_to_expiry=48.0,
    default_stake=50.0,
)

MODERATE = Profile(
    profile_id="moderate",
    description="Balanced: standard thresholds from Phase 4.",
    no_price_min=0.50,
    no_price_max=0.95,
    no_price_trade_min=0.70,
    mixed_evidence_low=0.40,
    mixed_evidence_high=0.60,
    max_hours_to_expiry=72.0,
    default_stake=100.0,
)

AGGRESSIVE = Profile(
    profile_id="aggressive",
    description="Higher risk: lower NO price floor, wider expiry, larger stakes.",
    no_price_min=0.40,
    no_price_max=0.95,
    no_price_trade_min=0.60,
    mixed_evidence_low=0.45,
    mixed_evidence_high=0.55,
    max_hours_to_expiry=72.0,
    default_stake=200.0,
)

# Registry for CLI lookups
STRATEGIES = {"no_side": NO_SIDE_V1}
PROFILES = {"conservative": CONSERVATIVE, "moderate": MODERATE, "aggressive": AGGRESSIVE}

# Default config (matches Phase 4 original behavior)
DEFAULT_CONFIG = StrategyConfig(strategy=NO_SIDE_V1, profile=MODERATE)
