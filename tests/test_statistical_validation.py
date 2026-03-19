"""Tests for statistical validation engine."""

from polymarket_timer_bot.analytics.statistical_validation import (
    bootstrap_win_rate,
    monte_carlo_paths,
    compute_expectancy,
    validate_strategy,
    validate_all_strategies,
    validation_to_dict,
)


def _make_trade(status, pnl, strategy_id="no_side", version="1.0", profile_id="moderate"):
    return {
        "strategy_id": strategy_id,
        "strategy_version": version,
        "profile_id": profile_id,
        "status": status,
        "pnl": pnl,
        "event_slug": "test-event",
    }


def _make_trades(wins, losses, win_pnl=10.0, loss_pnl=-50.0):
    trades = []
    for _ in range(wins):
        trades.append(_make_trade("WON", win_pnl))
    for _ in range(losses):
        trades.append(_make_trade("LOST", loss_pnl))
    return trades


class TestBootstrapWinRate:
    def test_all_wins(self):
        trades = _make_trades(10, 0)
        result = bootstrap_win_rate(trades)
        assert result.observed_win_rate == 1.0
        assert result.ci_low >= 0.7  # with 10 trades, CI should be wide but high
        assert result.ci_high == 1.0

    def test_all_losses(self):
        trades = _make_trades(0, 10)
        result = bootstrap_win_rate(trades)
        assert result.observed_win_rate == 0.0
        assert result.ci_low == 0.0
        assert result.edge_label == "no_edge"

    def test_mixed(self):
        trades = _make_trades(7, 3)
        result = bootstrap_win_rate(trades)
        assert 0.3 < result.ci_low < 0.8
        assert result.ci_high > 0.5
        assert result.n_simulations == 10_000

    def test_empty(self):
        assert bootstrap_win_rate([]) is None

    def test_small_sample_inconclusive(self):
        trades = _make_trades(5, 0)
        result = bootstrap_win_rate(trades)
        assert result.edge_label == "inconclusive"  # n < 10

    def test_reproducible(self):
        trades = _make_trades(8, 4)
        r1 = bootstrap_win_rate(trades, seed=42)
        r2 = bootstrap_win_rate(trades, seed=42)
        assert r1.ci_low == r2.ci_low
        assert r1.ci_high == r2.ci_high


class TestMonteCarloPaths:
    def test_all_positive(self):
        trades = _make_trades(10, 0, win_pnl=5.0)
        result = monte_carlo_paths(trades, n_paths=1000)
        assert result.median_final_pnl == 50.0  # 10 * 5.0
        assert result.prob_of_loss == 0.0

    def test_all_negative(self):
        trades = _make_trades(0, 5, loss_pnl=-20.0)
        result = monte_carlo_paths(trades, n_paths=1000)
        assert result.median_final_pnl == -100.0
        assert result.prob_of_loss == 1.0

    def test_mixed_pnl(self):
        trades = _make_trades(8, 2, win_pnl=10.0, loss_pnl=-50.0)
        result = monte_carlo_paths(trades, n_paths=2000)
        # Total PnL is always the same (80 - 100 = -20)
        # but drawdown varies by path
        assert result.median_final_pnl == -20.0
        assert result.median_max_drawdown >= 0

    def test_empty(self):
        assert monte_carlo_paths([]) is None

    def test_drawdown_positive(self):
        trades = _make_trades(5, 5, win_pnl=10.0, loss_pnl=-10.0)
        result = monte_carlo_paths(trades, n_paths=1000)
        # Total PnL = 0, but some paths have drawdowns
        assert result.median_max_drawdown >= 0


class TestComputeExpectancy:
    def test_positive_ev(self):
        trades = _make_trades(9, 1, win_pnl=10.0, loss_pnl=-10.0)
        result = compute_expectancy(trades)
        assert result.ev_per_trade > 0
        assert result.avg_win_size == 10.0
        assert result.avg_loss_size == 10.0
        assert result.win_loss_ratio == 1.0

    def test_negative_ev(self):
        trades = _make_trades(5, 5, win_pnl=5.0, loss_pnl=-20.0)
        result = compute_expectancy(trades)
        assert result.ev_per_trade < 0
        assert result.edge_label == "no_edge"

    def test_asymmetric_wins(self):
        trades = _make_trades(8, 2, win_pnl=5.0, loss_pnl=-100.0)
        result = compute_expectancy(trades)
        assert result.win_loss_ratio < 1.0  # losses bigger than wins

    def test_empty(self):
        assert compute_expectancy([]) is None

    def test_no_losses(self):
        trades = _make_trades(10, 0, win_pnl=10.0)
        result = compute_expectancy(trades)
        assert result.win_loss_ratio == float('inf')


class TestValidateStrategy:
    def test_full_validation(self):
        trades = _make_trades(8, 4, win_pnl=10.0, loss_pnl=-50.0)
        result = validate_strategy("test@1.0/moderate", trades)
        assert result is not None
        assert result.strategy_label == "test@1.0/moderate"
        assert result.overall_label in ("no_edge", "inconclusive", "potential_edge")
        assert result.bootstrap.n_trades == 12
        assert result.monte_carlo.n_paths == 5000

    def test_empty(self):
        assert validate_strategy("empty", []) is None


class TestValidateAllStrategies:
    def test_groups_by_strategy(self):
        conservative = _make_trades(6, 0)
        moderate = _make_trades(9, 2)
        for t in conservative:
            t["profile_id"] = "conservative"
        for t in moderate:
            t["profile_id"] = "moderate"

        results = validate_all_strategies(conservative + moderate)
        assert "no_side@1.0/conservative" in results
        assert "no_side@1.0/moderate" in results


class TestValidationToDict:
    def test_serializable(self):
        import json
        trades = _make_trades(8, 4, win_pnl=10.0, loss_pnl=-50.0)
        result = validate_strategy("test@1.0/mod", trades)
        d = validation_to_dict(result)
        # Should be JSON-serializable
        serialized = json.dumps(d)
        assert '"bootstrap"' in serialized
        assert '"monte_carlo"' in serialized
        assert '"expectancy"' in serialized
        assert d["overall_label"] in ("no_edge", "inconclusive", "potential_edge")
