"""Run statistical validation on real historical replay trades.

Loads replay_results.json, extracts REAL_HISTORICAL_REPLAY trades only,
runs bootstrap CI, Monte Carlo path simulation, and expectancy analysis,
then exports results.

No strategy logic is modified. No synthetic trades are included.

Usage:
    python scripts/run_statistical_validation.py
    python scripts/run_statistical_validation.py --dry-run
"""

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from polymarket_timer_bot.analytics.statistical_validation import (
    validate_all_strategies,
    validation_to_dict,
)


def main():
    parser = argparse.ArgumentParser(description="Statistical validation of replay trades")
    parser.add_argument("--dry-run", action="store_true", help="Print results without writing files")
    parser.add_argument("--bootstrap-n", type=int, default=10_000, help="Bootstrap simulations")
    parser.add_argument("--mc-paths", type=int, default=5_000, help="Monte Carlo paths")
    args = parser.parse_args()

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    replay_path = os.path.join(root, "data", "replay", "replay_results.json")

    if not os.path.exists(replay_path):
        print(f"ERROR: No replay data at {replay_path}")
        print("Run 'python scripts/replay_resolved.py' first.")
        sys.exit(1)

    with open(replay_path) as f:
        replay_data = json.load(f)

    # Extract REAL trades only
    real_section = replay_data.get("real_historical", {})
    real_trades = real_section.get("trades", [])
    real_grade = real_section.get("evidence_grade", "NO_DATA")

    if not real_trades:
        print("ERROR: No real historical trades found in replay data.")
        print(f"Evidence grade: {real_grade}")
        sys.exit(1)

    print(f"\n{'='*80}")
    print(f"STATISTICAL VALIDATION ENGINE")
    print(f"Source: REAL_HISTORICAL_REPLAY only (no synthetic trades)")
    print(f"Trades: {len(real_trades)}")
    print(f"Bootstrap: N={args.bootstrap_n:,}")
    print(f"Monte Carlo: N={args.mc_paths:,} paths")
    print(f"{'='*80}")

    # Run validation
    results = validate_all_strategies(
        real_trades,
        bootstrap_n=args.bootstrap_n,
        mc_paths=args.mc_paths,
    )

    # Print results
    for label, v in sorted(results.items()):
        bs = v.bootstrap
        mc = v.monte_carlo
        exp = v.expectancy

        print(f"\n{'─'*70}")
        print(f"  {label}")
        print(f"  OVERALL: {v.overall_label.upper()}")
        if bs.n_trades < 30:
            print(f"  ⚠  SAMPLE SIZE WARNING: {bs.n_trades} trades (<30 minimum for confidence)")
        print(f"{'─'*70}")

        print(f"\n  Track 1 — Bootstrap Win Rate CI ({bs.n_simulations:,} resamples)")
        print(f"    Observed WR:     {bs.observed_win_rate:.1%}")
        print(f"    Mean WR:         {bs.mean_win_rate:.1%}")
        print(f"    95% CI:          [{bs.ci_low:.1%}, {bs.ci_high:.1%}]")
        print(f"    CI excludes 50%: {'YES' if bs.ci_excludes_half else 'NO'}")
        print(f"    Edge label:      {bs.edge_label}")

        print(f"\n  Track 2 — Monte Carlo Path Simulation ({mc.n_paths:,} paths)")
        print(f"    Median final PnL:    ${mc.median_final_pnl:>8.2f}")
        print(f"    Mean final PnL:      ${mc.mean_final_pnl:>8.2f}")
        print(f"    5th pctl PnL:        ${mc.pnl_5th_percentile:>8.2f}")
        print(f"    95th pctl PnL:       ${mc.pnl_95th_percentile:>8.2f}")
        print(f"    Worst path:          ${mc.worst_path_pnl:>8.2f}")
        print(f"    Prob of loss:        {mc.prob_of_loss:.1%}")
        print(f"    Median max drawdown: ${mc.median_max_drawdown:>8.2f}")
        print(f"    95th pctl drawdown:  ${mc.max_drawdown_95th:>8.2f}")

        print(f"\n  Track 3 — Expectancy + Variance")
        print(f"    EV per trade:    ${exp.ev_per_trade:>8.4f}")
        print(f"    Std dev:         ${exp.std_dev:>8.4f}")
        print(f"    Sharpe-like:     {exp.sharpe_like:>8.4f}")
        print(f"    Avg win size:    ${exp.avg_win_size:>8.2f}")
        print(f"    Avg loss size:   ${exp.avg_loss_size:>8.2f}")
        print(f"    Win/loss ratio:  {exp.win_loss_ratio:>8.4f}")
        print(f"    Edge label:      {exp.edge_label}")

    # Summary table
    print(f"\n{'='*80}")
    print(f"VALIDATION SUMMARY")
    print(f"{'='*80}")
    print(f"\n{'Strategy':<40} {'N':>3} {'WR':>6} {'95% CI':>16} {'EV/trade':>9} {'P(loss)':>8} {'Label':>14}")
    print("-" * 100)
    for label, v in sorted(results.items()):
        bs = v.bootstrap
        mc = v.monte_carlo
        exp = v.expectancy
        ci_str = f"[{bs.ci_low:.0%},{bs.ci_high:.0%}]"
        print(f"{label:<40} {bs.n_trades:>3} {bs.observed_win_rate:>5.0%} {ci_str:>16} ${exp.ev_per_trade:>7.2f} {mc.prob_of_loss:>7.0%} {v.overall_label:>14}")

    # Build output
    from datetime import datetime
    output = {
        "generated_at": datetime.utcnow().isoformat(),
        "source": "REAL_HISTORICAL_REPLAY",
        "synthetic_trades_included": False,
        "total_real_trades": len(real_trades),
        "bootstrap_simulations": args.bootstrap_n,
        "monte_carlo_paths": args.mc_paths,
        "sample_size_note": (
            "All strategies have <30 trades. Confidence intervals are wide. "
            "Results are directional indicators, not statistically conclusive. "
            "More resolved families are needed for robust validation."
        ),
        "strategies": {
            label: validation_to_dict(v)
            for label, v in sorted(results.items())
        },
    }

    if args.dry_run:
        print(f"\n  [DRY RUN] No files written.")
        return

    # Save to data/
    val_dir = os.path.join(root, "data", "validation")
    os.makedirs(val_dir, exist_ok=True)
    val_path = os.path.join(val_dir, "statistical_validation.json")
    with open(val_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nValidation results saved to: {val_path}")

    # Export to dashboard
    dash_data = os.path.join(root, "dashboard", "data")
    os.makedirs(dash_data, exist_ok=True)
    dash_path = os.path.join(dash_data, "statistical_validation.json")
    with open(dash_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"Dashboard copy saved to: {dash_path}")


if __name__ == "__main__":
    main()
