"""Count-model research scaffold for posting-count bracket markets.

Estimates fair bracket probabilities for "How many posts/tweets by date X?"
markets using a simple baseline estimator.

v0.1: Simple rate-based estimator only.
  - Given a current posting rate (posts/hour) and time remaining,
    estimate the probability of landing in each bracket.
  - Uses a Poisson-like model: if average rate is lambda posts/hour
    and T hours remain, expected total ~ lambda * T.
  - Maps expected total to bracket probabilities via simple normal
    approximation around the mean.

This is GROUNDWORK, not a production strategy. No ML, no fancy data.
"""

import logging
import math
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class BracketEstimate:
    """Fair value estimate for one bracket."""

    bracket_label: str
    lower: Optional[int]  # None for open-ended like "<40"
    upper: Optional[int]  # None for open-ended like "200+"
    fair_probability: float  # estimated fair probability [0, 1]
    market_yes_price: Optional[float] = None  # actual market YES price
    edge: Optional[float] = None  # fair_probability - market_yes_price

    def to_dict(self) -> dict:
        return {
            "bracket_label": self.bracket_label,
            "lower": self.lower,
            "upper": self.upper,
            "fair_probability": round(self.fair_probability, 4),
            "market_yes_price": round(self.market_yes_price, 4) if self.market_yes_price is not None else None,
            "edge": round(self.edge, 4) if self.edge is not None else None,
        }


@dataclass
class CountModelResult:
    """Full count-model estimate for one event family."""

    event_slug: str
    event_title: str
    estimated_rate: float  # posts per hour
    hours_remaining: float
    expected_total: float
    std_dev: float
    brackets: list[BracketEstimate] = field(default_factory=list)
    model_version: str = "rate_baseline_v0.1"
    provenance: str = "SIMULATED"

    def to_dict(self) -> dict:
        return {
            "event_slug": self.event_slug,
            "event_title": self.event_title,
            "estimated_rate": round(self.estimated_rate, 2),
            "hours_remaining": round(self.hours_remaining, 1),
            "expected_total": round(self.expected_total, 1),
            "std_dev": round(self.std_dev, 1),
            "brackets": [b.to_dict() for b in self.brackets],
            "model_version": self.model_version,
            "provenance": self.provenance,
        }


def parse_bracket_range(label: str) -> tuple[Optional[int], Optional[int]]:
    """Parse a bracket label like '65-89', '<40', '200+' into (lower, upper).

    Returns (lower_inclusive, upper_inclusive). None for open ends.
    """
    label = label.strip()
    if label.startswith("<"):
        try:
            upper = int(label[1:]) - 1
            return (None, upper)
        except ValueError:
            return (None, None)
    if label.endswith("+"):
        try:
            lower = int(label[:-1])
            return (lower, None)
        except ValueError:
            return (None, None)
    parts = label.split("-")
    if len(parts) == 2:
        try:
            return (int(parts[0]), int(parts[1]))
        except ValueError:
            return (None, None)
    return (None, None)


def estimate_bracket_probabilities(
    brackets: list[dict],
    posting_rate: float,
    hours_remaining: float,
) -> list[BracketEstimate]:
    """Estimate fair probability for each bracket using Poisson/normal approximation.

    Args:
        brackets: List of bracket dicts with bracket_label, yes_price.
        posting_rate: Estimated posts per hour (lambda).
        hours_remaining: Hours until market expiry.

    Returns:
        List of BracketEstimate with fair probabilities.
    """
    expected = posting_rate * hours_remaining
    # Poisson std dev = sqrt(lambda * T)
    std_dev = math.sqrt(max(expected, 1.0))

    results = []
    for b in brackets:
        label = b.get("bracket_label", "")
        lower, upper = parse_bracket_range(label)
        yes_price = b.get("yes_price")

        prob = _normal_bracket_probability(expected, std_dev, lower, upper)

        edge = None
        if yes_price is not None:
            edge = prob - yes_price

        results.append(BracketEstimate(
            bracket_label=label,
            lower=lower,
            upper=upper,
            fair_probability=prob,
            market_yes_price=yes_price,
            edge=edge,
        ))

    return results


def estimate_family(
    event_slug: str,
    event_title: str,
    brackets: list[dict],
    posting_rate: float,
    hours_remaining: float,
) -> CountModelResult:
    """Run count-model estimation for one event family.

    Args:
        event_slug: Event family slug.
        event_title: Human-readable title.
        brackets: List of bracket dicts.
        posting_rate: Posts per hour rate estimate.
        hours_remaining: Hours until expiry.
    """
    expected = posting_rate * hours_remaining
    std_dev = math.sqrt(max(expected, 1.0))
    bracket_estimates = estimate_bracket_probabilities(brackets, posting_rate, hours_remaining)

    return CountModelResult(
        event_slug=event_slug,
        event_title=event_title,
        estimated_rate=posting_rate,
        hours_remaining=hours_remaining,
        expected_total=expected,
        std_dev=std_dev,
        brackets=bracket_estimates,
    )


def _normal_bracket_probability(
    mean: float,
    std_dev: float,
    lower: Optional[int],
    upper: Optional[int],
) -> float:
    """Approximate bracket probability using normal CDF.

    For a count expected to be mean ± std_dev, what's the probability
    of landing in [lower, upper]?
    """
    if std_dev <= 0:
        # Degenerate case: all probability at the mean
        if lower is not None and upper is not None:
            return 1.0 if lower <= mean <= upper else 0.0
        if lower is not None:
            return 1.0 if mean >= lower else 0.0
        if upper is not None:
            return 1.0 if mean <= upper else 0.0
        return 1.0

    def _phi(x):
        """Standard normal CDF approximation."""
        return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))

    if lower is None and upper is not None:
        # "<X" bracket
        z = (upper + 0.5 - mean) / std_dev
        return _phi(z)
    elif lower is not None and upper is None:
        # "X+" bracket
        z = (lower - 0.5 - mean) / std_dev
        return 1.0 - _phi(z)
    elif lower is not None and upper is not None:
        # "X-Y" bracket
        z_low = (lower - 0.5 - mean) / std_dev
        z_high = (upper + 0.5 - mean) / std_dev
        return max(0.0, _phi(z_high) - _phi(z_low))
    else:
        return 0.0


# --- Default posting rate estimates ---
# These are rough baselines. Better estimates should come from observed data.

DEFAULT_POSTING_RATES = {
    "musk_posting": 4.0,   # ~4 tweets per hour baseline (very rough)
    "trump_posting": 2.0,  # ~2 Truth Social posts per hour baseline
}


def get_default_rate(market_type: str) -> float:
    """Get default posting rate for a market type."""
    return DEFAULT_POSTING_RATES.get(market_type, 3.0)
