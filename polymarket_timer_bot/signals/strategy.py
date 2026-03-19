"""Strategy and profile definitions for parameterized signal evaluation.

A Strategy defines WHAT to do (which signal rules apply).
A Profile defines HOW aggressively to express it (thresholds, limits).

The signal engine uses a StrategyConfig (strategy + profile combined)
to evaluate markets. This keeps the engine shared while making parameters
explicit and attributable.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass(frozen=True)
class Strategy:
    """Defines signal logic variant. Strategy decides what to do."""

    strategy_id: str
    version: str  # semver-like, e.g. "1.0"
    description: str = ""
    # Which engine function to use (module path within signals/)
    engine: str = "default"  # "default", "family_guarded", "family_mispricing"

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

    # Family-guarded strategy: position-specific thresholds
    # (only used by family_guarded engine)
    tail_no_price_trade_min: Optional[float] = None
    adjacent_no_price_trade_min: Optional[float] = None
    hot_no_price_trade_min: Optional[float] = None
    hot_allowed: bool = False  # block hot brackets by default


@dataclass(frozen=True)
class StrategyConfig:
    """Combined strategy + profile for a single evaluation run."""

    strategy: Strategy
    profile: Profile

    def label(self) -> str:
        return f"{self.strategy.label()}/{self.profile.profile_id}"

    def to_dict(self) -> dict:
        d = {
            "strategy_id": self.strategy.strategy_id,
            "strategy_version": self.strategy.version,
            "strategy_description": self.strategy.description,
            "engine": self.strategy.engine,
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
        if self.strategy.engine == "family_guarded":
            d["tail_no_price_trade_min"] = self.profile.tail_no_price_trade_min
            d["adjacent_no_price_trade_min"] = self.profile.adjacent_no_price_trade_min
            d["hot_no_price_trade_min"] = self.profile.hot_no_price_trade_min
            d["hot_allowed"] = self.profile.hot_allowed
        return d


# ---- Built-in strategies ----

NO_SIDE_V1 = Strategy(
    strategy_id="no_side",
    version="1.0",
    description="Original NO-side timer strategy: bet NO on bracket markets where event is unlikely by deadline.",
    engine="default",
)

FAMILY_GUARDED_NO_V01 = Strategy(
    strategy_id="family_guarded_no",
    version="0.1",
    description=(
        "Stricter NO-side with family-level risk controls and "
        "position-aware thresholds. Research strategy — paper only."
    ),
    engine="family_guarded",
)

FAMILY_MISPRICING_SCAN_V01 = Strategy(
    strategy_id="family_mispricing_scan",
    version="0.1",
    description=(
        "Research-only diagnostic for mutually exclusive bracket families. "
        "Computes family-level mispricing indicators. WATCH/DIAGNOSTIC only "
        "unless a clear mispricing rule is met."
    ),
    engine="family_mispricing",
)


# ---- Built-in profiles ----

# --- no_side profiles (unchanged baseline control) ---

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

# --- family_guarded_no profiles ---
# These use position-aware thresholds: tails are easy, adjacent harder, hot mostly blocked.

FG_MODERATE = Profile(
    profile_id="moderate",
    description="Family-guarded moderate: tail-friendly, adjacent-strict, hot-blocked.",
    no_price_min=0.50,
    no_price_max=0.95,
    no_price_trade_min=0.70,  # fallback
    mixed_evidence_low=0.40,
    mixed_evidence_high=0.60,
    max_hours_to_expiry=72.0,
    default_stake=100.0,
    tail_no_price_trade_min=0.65,      # easier threshold for tails
    adjacent_no_price_trade_min=0.80,   # harder threshold for adjacent
    hot_no_price_trade_min=0.92,        # near-impossible for hot
    hot_allowed=False,                   # block hot entirely
)

# --- family_mispricing_scan profiles ---
# Uses same moderate baseline; engine behavior is different (diagnostic).

FMS_MODERATE = Profile(
    profile_id="moderate",
    description="Family mispricing scan: diagnostic mode, moderate thresholds.",
    no_price_min=0.50,
    no_price_max=0.95,
    no_price_trade_min=0.70,
    mixed_evidence_low=0.40,
    mixed_evidence_high=0.60,
    max_hours_to_expiry=72.0,
    default_stake=100.0,
)

# Registry for CLI lookups
STRATEGIES = {
    "no_side": NO_SIDE_V1,
    "family_guarded_no": FAMILY_GUARDED_NO_V01,
    "family_mispricing_scan": FAMILY_MISPRICING_SCAN_V01,
}

# Profiles indexed by (strategy_id, profile_id) for strategy-specific profiles
PROFILES = {"conservative": CONSERVATIVE, "moderate": MODERATE, "aggressive": AGGRESSIVE}

STRATEGY_PROFILES = {
    "no_side": {"conservative": CONSERVATIVE, "moderate": MODERATE, "aggressive": AGGRESSIVE},
    "family_guarded_no": {"moderate": FG_MODERATE},
    "family_mispricing_scan": {"moderate": FMS_MODERATE},
}

# Default config (matches Phase 4 original behavior)
DEFAULT_CONFIG = StrategyConfig(strategy=NO_SIDE_V1, profile=MODERATE)
