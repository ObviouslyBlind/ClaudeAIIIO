"""Family mispricing scanner (family_mispricing_scan@0.1).

Research-only diagnostic for mutually exclusive bracket families.
Computes family-level pricing indicators and flags anomalies.

This is DIAGNOSTIC-ONLY in v0.1. It outputs WATCH signals with
rich diagnostic data. It does NOT generate TRADE signals yet.

Diagnostics computed per family:
  - Total YES price sum (should be ~1.0 for a complete set)
  - Total NO price sum
  - Top bracket concentration (how much of YES is in one bracket)
  - Adjacent concentration
  - Dutch-book style indicators (sum > 1.0 = overpriced, < 1.0 = underpriced)
  - Whether the family looks internally expensive / cheap / incoherent
"""

import logging
from dataclasses import dataclass, field
from typing import Optional

from polymarket_timer_bot.models.market import Market
from polymarket_timer_bot.signals.engine import SignalResult, WATCH, SKIP
from polymarket_timer_bot.signals.strategy import StrategyConfig, DEFAULT_CONFIG

logger = logging.getLogger(__name__)


@dataclass
class FamilyDiagnostic:
    """Diagnostic result for one event family."""

    event_slug: str
    event_title: str
    bracket_count: int
    yes_price_sum: float
    no_price_sum: float
    top_bracket_label: str
    top_bracket_yes_price: float
    top_bracket_concentration_pct: float  # top YES / sum(YES)
    adjacent_concentration_pct: float     # (top + 2 adjacent) YES / sum(YES)
    overpriced: bool      # yes_sum > 1.05
    underpriced: bool     # yes_sum < 0.95
    coherent: bool        # 0.95 <= yes_sum <= 1.10
    verdict: str          # "expensive", "cheap", "coherent", "incoherent"
    bracket_details: list[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "event_slug": self.event_slug,
            "event_title": self.event_title,
            "bracket_count": self.bracket_count,
            "yes_price_sum": round(self.yes_price_sum, 4),
            "no_price_sum": round(self.no_price_sum, 4),
            "top_bracket_label": self.top_bracket_label,
            "top_bracket_yes_price": round(self.top_bracket_yes_price, 4),
            "top_bracket_concentration_pct": round(self.top_bracket_concentration_pct, 1),
            "adjacent_concentration_pct": round(self.adjacent_concentration_pct, 1),
            "overpriced": self.overpriced,
            "underpriced": self.underpriced,
            "coherent": self.coherent,
            "verdict": self.verdict,
            "bracket_details": self.bracket_details,
        }


def analyze_family(
    event_slug: str,
    event_title: str,
    brackets: list[dict],
) -> FamilyDiagnostic:
    """Compute family-level mispricing diagnostics for a bracket set.

    Args:
        event_slug: Event family slug.
        event_title: Human-readable event title.
        brackets: List of bracket dicts with bracket_label, yes_price, no_price.
    """
    if not brackets:
        return FamilyDiagnostic(
            event_slug=event_slug, event_title=event_title,
            bracket_count=0, yes_price_sum=0, no_price_sum=0,
            top_bracket_label="", top_bracket_yes_price=0,
            top_bracket_concentration_pct=0, adjacent_concentration_pct=0,
            overpriced=False, underpriced=False, coherent=False,
            verdict="no_data",
        )

    # Parse bracket data
    parsed = []
    for b in brackets:
        yes_p = b.get("yes_price", 0) or 0
        no_p = b.get("no_price", 0) or 0
        label = b.get("bracket_label", "?")
        parsed.append({
            "bracket_label": label,
            "yes_price": round(yes_p, 4),
            "no_price": round(no_p, 4),
            "sort_key": _parse_bracket_key(label),
        })

    parsed.sort(key=lambda x: x["sort_key"])

    yes_sum = sum(b["yes_price"] for b in parsed)
    no_sum = sum(b["no_price"] for b in parsed)

    # Top bracket (highest YES price)
    top = max(parsed, key=lambda b: b["yes_price"])
    top_idx = parsed.index(top)

    top_concentration = (top["yes_price"] / yes_sum * 100) if yes_sum > 0 else 0

    # Adjacent concentration: top + immediate neighbors
    adj_yes = top["yes_price"]
    if top_idx > 0:
        adj_yes += parsed[top_idx - 1]["yes_price"]
    if top_idx < len(parsed) - 1:
        adj_yes += parsed[top_idx + 1]["yes_price"]
    adj_concentration = (adj_yes / yes_sum * 100) if yes_sum > 0 else 0

    # Pricing verdict
    overpriced = yes_sum > 1.05
    underpriced = yes_sum < 0.95
    coherent = 0.95 <= yes_sum <= 1.10

    if yes_sum > 1.10:
        verdict = "expensive"
    elif yes_sum < 0.90:
        verdict = "cheap"
    elif coherent:
        verdict = "coherent"
    else:
        verdict = "incoherent"

    # Build bracket details
    details = []
    for i, b in enumerate(parsed):
        distance = abs(i - top_idx)
        if distance == 0:
            pos = "hot"
        elif distance <= 1:
            pos = "adjacent"
        else:
            pos = "tail"
        details.append({
            "bracket_label": b["bracket_label"],
            "yes_price": b["yes_price"],
            "no_price": b["no_price"],
            "position": pos,
            "fair_share": round(1.0 / len(parsed), 4) if parsed else 0,
        })

    return FamilyDiagnostic(
        event_slug=event_slug,
        event_title=event_title,
        bracket_count=len(parsed),
        yes_price_sum=yes_sum,
        no_price_sum=no_sum,
        top_bracket_label=top["bracket_label"],
        top_bracket_yes_price=top["yes_price"],
        top_bracket_concentration_pct=top_concentration,
        adjacent_concentration_pct=adj_concentration,
        overpriced=overpriced,
        underpriced=underpriced,
        coherent=coherent,
        verdict=verdict,
        bracket_details=details,
    )


def evaluate_markets(
    markets: list[Market],
    config: Optional[StrategyConfig] = None,
    family_brackets: Optional[dict] = None,
) -> tuple[list[SignalResult], list[FamilyDiagnostic]]:
    """Evaluate markets via family-level mispricing scan.

    Returns:
        Tuple of (signal_results, family_diagnostics).
        All signals are WATCH or SKIP in v0.1 (diagnostic only).
    """
    if config is None:
        config = DEFAULT_CONFIG
    if family_brackets is None:
        family_brackets = {}

    # Compute diagnostics per family
    diagnostics = []
    seen_families = set()
    for market in markets:
        slug = market.event_slug
        if slug and slug not in seen_families:
            seen_families.add(slug)
            brackets = family_brackets.get(slug, [])
            if len(brackets) >= 2:
                diag = analyze_family(slug, market.event_title, brackets)
                diagnostics.append(diag)

    # Build diagnostic lookup
    diag_by_slug = {d.event_slug: d for d in diagnostics}

    # Evaluate each market
    results = []
    for market in markets:
        result = _evaluate_single(market, config, diag_by_slug)
        results.append(result)

    results.sort(key=lambda r: r.score, reverse=True)
    return results, diagnostics


def _evaluate_single(
    market: Market,
    config: StrategyConfig,
    diag_by_slug: dict[str, FamilyDiagnostic],
) -> SignalResult:
    """Evaluate a single market — diagnostic only in v0.1."""
    reasons = []
    score = 50.0

    def _result(signal, score=0.0):
        return SignalResult(
            market=market, signal=signal, reasons=reasons,
            score=max(0.0, min(100.0, score)),
            strategy_id=config.strategy.strategy_id,
            profile_id=config.profile.profile_id,
        )

    # Standard hard SKIPs
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
        reasons.append("Not a timer-style market.")
        return _result(SKIP)

    # Family diagnostic
    diag = diag_by_slug.get(market.event_slug)
    if diag is None:
        reasons.append("No family diagnostic available.")
        return _result(SKIP, 10)

    reasons.append(f"Family verdict: {diag.verdict}")
    reasons.append(f"YES sum: {diag.yes_price_sum:.3f}")
    reasons.append(f"Top concentration: {diag.top_bracket_concentration_pct:.0f}%")
    reasons.append(f"Adjacent concentration: {diag.adjacent_concentration_pct:.0f}%")

    if diag.verdict == "expensive":
        reasons.append("WATCH: family is overpriced (YES sum > 1.10). Potential NO value across family.")
        score += 20
    elif diag.verdict == "cheap":
        reasons.append("WATCH: family is underpriced (YES sum < 0.90). Potential YES value exists.")
        score -= 10
    elif diag.verdict == "coherent":
        reasons.append("WATCH: family pricing looks coherent. No obvious mispricing.")
    else:
        reasons.append("WATCH: family pricing is incoherent. Need more data.")

    # All signals are WATCH in v0.1
    reasons.append("DIAGNOSTIC ONLY: family_mispricing_scan@0.1 does not generate TRADE signals.")
    return _result(WATCH, score)


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
