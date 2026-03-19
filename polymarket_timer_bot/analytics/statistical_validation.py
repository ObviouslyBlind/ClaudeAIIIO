"""Statistical validation engine for replay trade data.

Three independent analysis tracks:

  Track 1 — BOOTSTRAP CI:
    Resample trades with replacement (N=10,000) to compute win rate
    confidence intervals. If 0.5 is inside the 95% CI, the strategy
    has no demonstrated statistical edge at that confidence level.

  Track 2 — MONTE CARLO PATH SIMULATION:
    Randomize trade order (N=5,000 paths) to simulate portfolio
    evolution under different sequencing. Measures max drawdown
    distribution, probability of loss, and worst-case outcomes.

  Track 3 — EXPECTANCY + VARIANCE:
    Per-trade expected value, variance, Sharpe-like ratio, and
    win/loss size asymmetry.

All analysis uses REAL_HISTORICAL_REPLAY trades only.
Synthetic trades are excluded.
No strategy logic is modified by this module.
"""

import math
import random
from collections import defaultdict
from typing import NamedTuple


class BootstrapResult(NamedTuple):
    strategy_label: str
    n_trades: int
    observed_win_rate: float
    mean_win_rate: float
    ci_low: float
    ci_high: float
    ci_excludes_half: bool
    edge_label: str  # "no_edge", "inconclusive", "potential_edge"
    n_simulations: int


class MonteCarloResult(NamedTuple):
    strategy_label: str
    n_trades: int
    n_paths: int
    median_final_pnl: float
    mean_final_pnl: float
    pnl_5th_percentile: float
    pnl_95th_percentile: float
    prob_of_loss: float  # fraction of paths ending negative
    median_max_drawdown: float
    max_drawdown_95th: float
    worst_path_pnl: float


class ExpectancyResult(NamedTuple):
    strategy_label: str
    n_trades: int
    ev_per_trade: float
    variance: float
    std_dev: float
    sharpe_like: float  # EV / std_dev, annualization not meaningful here
    avg_win_size: float
    avg_loss_size: float
    win_loss_ratio: float  # avg_win / avg_loss (>1 means wins are bigger)
    edge_label: str


class StrategyValidation(NamedTuple):
    """Combined validation result for one strategy."""
    strategy_label: str
    bootstrap: BootstrapResult
    monte_carlo: MonteCarloResult
    expectancy: ExpectancyResult
    overall_label: str  # "no_edge", "inconclusive", "potential_edge"


def _group_trades_by_strategy(trades):
    """Group trades into {strategy_label: [trade_dicts]}."""
    groups = defaultdict(list)
    for t in trades:
        label = f"{t['strategy_id']}@{t['strategy_version']}/{t['profile_id']}"
        groups[label].append(t)
    return dict(groups)


# --- Track 1: Bootstrap CI ---

def bootstrap_win_rate(trades, n_simulations=10_000, ci_pct=95, seed=42):
    """Bootstrap resampling for win rate confidence interval.

    Args:
        trades: list of trade dicts with 'status' field ('WON' or 'LOST')
        n_simulations: number of bootstrap resamples
        ci_pct: confidence interval percentage (default 95%)
        seed: random seed for reproducibility

    Returns:
        BootstrapResult
    """
    rng = random.Random(seed)
    n = len(trades)
    if n == 0:
        return None

    outcomes = [1 if t["status"] == "WON" else 0 for t in trades]
    observed_wr = sum(outcomes) / n

    # Bootstrap: resample with replacement
    bootstrap_wrs = []
    for _ in range(n_simulations):
        sample = [rng.choice(outcomes) for _ in range(n)]
        bootstrap_wrs.append(sum(sample) / n)

    bootstrap_wrs.sort()
    alpha = (100 - ci_pct) / 200  # two-tailed
    ci_low = bootstrap_wrs[int(alpha * n_simulations)]
    ci_high = bootstrap_wrs[int((1 - alpha) * n_simulations)]
    mean_wr = sum(bootstrap_wrs) / len(bootstrap_wrs)

    ci_excludes_half = ci_low > 0.5

    # Label
    if n < 10:
        edge_label = "inconclusive"  # too few trades for any claim
    elif ci_excludes_half:
        edge_label = "potential_edge"
    elif ci_low > 0.45:
        edge_label = "inconclusive"
    else:
        edge_label = "no_edge"

    return BootstrapResult(
        strategy_label="",  # filled by caller
        n_trades=n,
        observed_win_rate=round(observed_wr, 4),
        mean_win_rate=round(mean_wr, 4),
        ci_low=round(ci_low, 4),
        ci_high=round(ci_high, 4),
        ci_excludes_half=ci_excludes_half,
        edge_label=edge_label,
        n_simulations=n_simulations,
    )


# --- Track 2: Monte Carlo Path Simulation ---

def monte_carlo_paths(trades, n_paths=5_000, seed=42):
    """Simulate portfolio evolution by randomizing trade order.

    Each path takes the same set of trades but in random order,
    computing cumulative PnL and max drawdown.

    Args:
        trades: list of trade dicts with 'pnl' field
        n_paths: number of random orderings to simulate

    Returns:
        MonteCarloResult
    """
    rng = random.Random(seed)
    n = len(trades)
    if n == 0:
        return None

    pnls = [t["pnl"] for t in trades]

    final_pnls = []
    max_drawdowns = []

    for _ in range(n_paths):
        shuffled = pnls[:]
        rng.shuffle(shuffled)

        cumulative = 0.0
        peak = 0.0
        max_dd = 0.0

        for p in shuffled:
            cumulative += p
            if cumulative > peak:
                peak = cumulative
            dd = peak - cumulative
            if dd > max_dd:
                max_dd = dd

        final_pnls.append(cumulative)
        max_drawdowns.append(max_dd)

    final_pnls.sort()
    max_drawdowns.sort()

    prob_loss = sum(1 for p in final_pnls if p < 0) / n_paths

    return MonteCarloResult(
        strategy_label="",
        n_trades=n,
        n_paths=n_paths,
        median_final_pnl=round(final_pnls[n_paths // 2], 2),
        mean_final_pnl=round(sum(final_pnls) / n_paths, 2),
        pnl_5th_percentile=round(final_pnls[int(0.05 * n_paths)], 2),
        pnl_95th_percentile=round(final_pnls[int(0.95 * n_paths)], 2),
        prob_of_loss=round(prob_loss, 4),
        median_max_drawdown=round(max_drawdowns[n_paths // 2], 2),
        max_drawdown_95th=round(max_drawdowns[int(0.95 * n_paths)], 2),
        worst_path_pnl=round(final_pnls[0], 2),
    )


# --- Track 3: Expectancy + Variance ---

def compute_expectancy(trades):
    """Compute per-trade expected value, variance, and risk metrics.

    Returns:
        ExpectancyResult
    """
    n = len(trades)
    if n == 0:
        return None

    pnls = [t["pnl"] for t in trades]
    wins = [p for p in pnls if p > 0]
    losses = [p for p in pnls if p <= 0]

    ev = sum(pnls) / n
    variance = sum((p - ev) ** 2 for p in pnls) / n if n > 1 else 0
    std_dev = math.sqrt(variance)
    sharpe_like = ev / std_dev if std_dev > 0 else 0

    avg_win = sum(wins) / len(wins) if wins else 0
    avg_loss = abs(sum(losses) / len(losses)) if losses else 0
    wl_ratio = avg_win / avg_loss if avg_loss > 0 else float('inf')

    # Label
    if n < 10:
        edge_label = "inconclusive"
    elif ev > 0 and sharpe_like > 0.1:
        edge_label = "potential_edge"
    elif ev > 0:
        edge_label = "inconclusive"
    else:
        edge_label = "no_edge"

    return ExpectancyResult(
        strategy_label="",
        n_trades=n,
        ev_per_trade=round(ev, 4),
        variance=round(variance, 4),
        std_dev=round(std_dev, 4),
        sharpe_like=round(sharpe_like, 4),
        avg_win_size=round(avg_win, 2),
        avg_loss_size=round(avg_loss, 2),
        win_loss_ratio=round(wl_ratio, 4),
        edge_label=edge_label,
    )


# --- Combined Validation ---

def validate_strategy(label, trades, bootstrap_n=10_000, mc_paths=5_000, seed=42):
    """Run all three validation tracks on one strategy's trades.

    Returns:
        StrategyValidation or None if no trades
    """
    if not trades:
        return None

    bs = bootstrap_win_rate(trades, n_simulations=bootstrap_n, seed=seed)
    mc = monte_carlo_paths(trades, n_paths=mc_paths, seed=seed)
    exp = compute_expectancy(trades)

    # Replace labels with correct strategy_label
    bs = bs._replace(strategy_label=label)
    mc = mc._replace(strategy_label=label)
    exp = exp._replace(strategy_label=label)

    # Overall label: most conservative of the three
    labels = [bs.edge_label, exp.edge_label]
    if "no_edge" in labels:
        overall = "no_edge"
    elif "inconclusive" in labels:
        overall = "inconclusive"
    else:
        overall = "potential_edge"

    # Override: if Monte Carlo shows >40% prob of loss, cap at inconclusive
    if mc.prob_of_loss > 0.40 and overall == "potential_edge":
        overall = "inconclusive"

    return StrategyValidation(
        strategy_label=label,
        bootstrap=bs,
        monte_carlo=mc,
        expectancy=exp,
        overall_label=overall,
    )


def validate_all_strategies(trades, bootstrap_n=10_000, mc_paths=5_000, seed=42):
    """Validate all strategies found in a list of trades.

    Args:
        trades: list of trade dicts (should be REAL_HISTORICAL_REPLAY only)

    Returns:
        dict of {strategy_label: StrategyValidation}
    """
    groups = _group_trades_by_strategy(trades)
    results = {}
    for label, strat_trades in sorted(groups.items()):
        v = validate_strategy(label, strat_trades, bootstrap_n, mc_paths, seed)
        if v:
            results[label] = v
    return results


def validation_to_dict(validation):
    """Convert StrategyValidation to a JSON-serializable dict."""
    v = validation
    return {
        "strategy_label": v.strategy_label,
        "overall_label": v.overall_label,
        "n_trades": v.bootstrap.n_trades,
        "sample_size_warning": v.bootstrap.n_trades < 30,
        "bootstrap": {
            "observed_win_rate": v.bootstrap.observed_win_rate,
            "mean_win_rate": v.bootstrap.mean_win_rate,
            "ci_95_low": v.bootstrap.ci_low,
            "ci_95_high": v.bootstrap.ci_high,
            "ci_excludes_0.5": v.bootstrap.ci_excludes_half,
            "edge_label": v.bootstrap.edge_label,
            "n_simulations": v.bootstrap.n_simulations,
        },
        "monte_carlo": {
            "n_paths": v.monte_carlo.n_paths,
            "median_final_pnl": v.monte_carlo.median_final_pnl,
            "mean_final_pnl": v.monte_carlo.mean_final_pnl,
            "pnl_5th_percentile": v.monte_carlo.pnl_5th_percentile,
            "pnl_95th_percentile": v.monte_carlo.pnl_95th_percentile,
            "prob_of_loss": v.monte_carlo.prob_of_loss,
            "median_max_drawdown": v.monte_carlo.median_max_drawdown,
            "max_drawdown_95th": v.monte_carlo.max_drawdown_95th,
            "worst_path_pnl": v.monte_carlo.worst_path_pnl,
        },
        "expectancy": {
            "ev_per_trade": v.expectancy.ev_per_trade,
            "variance": v.expectancy.variance,
            "std_dev": v.expectancy.std_dev,
            "sharpe_like": v.expectancy.sharpe_like,
            "avg_win_size": v.expectancy.avg_win_size,
            "avg_loss_size": v.expectancy.avg_loss_size,
            "win_loss_ratio": v.expectancy.win_loss_ratio,
            "edge_label": v.expectancy.edge_label,
        },
    }
