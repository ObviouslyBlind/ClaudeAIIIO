# Polymarket NO-Only Timer Bot

Paper-trading bot that monitors Polymarket prediction markets related to Elon Musk tweets and Donald Trump Truth Social posts, and evaluates NO-side opportunities on bracket/count markets.

## Status

Phases 1–7 complete. Pipeline is end-to-end operational: fetch → signals → papertrade → resolve → dashboard.

## How it works

1. **Discover** posting-count events from Polymarket's events API (bracket markets like "65-89 tweets")
2. **Classify** events as musk_posting or trump_posting using dual-layer classification
3. **Evaluate** each bracket market with a rule-based signal engine (TRADE / WATCH / SKIP)
4. **Paper trade** TRADE signals with a simulated $100 stake per position
5. **Resolve** open trades when markets close (WON / LOST / EXPIRED)

## Quick start

```bash
pip install -r requirements.txt

python scripts/fetch_markets.py       # Discover and classify markets
python scripts/run_signals.py         # Evaluate signals
python scripts/run_papertrade.py      # Open paper trades for TRADE signals
python scripts/resolve_trades.py      # Resolve closed markets
python scripts/export_dashboard.py    # Export data for dashboard
python -m http.server 8000 -d dashboard  # View dashboard at http://localhost:8000
```

## Scope (v1)

- NO-only bets on bracket/count markets
- Paper trading only (no real money)
- Markets: Musk tweet counts, Trump Truth Social post counts
- No wallet integration, no secrets, no autonomous trading
- All results labeled SIMULATED

## Strategy priorities

1. Low drawdown
2. High win rate
3. Steady compounding
4. Absolute return (last)

## Key rules

- Mixed evidence = no trade
- Max time to expiry = 3 days
- NO price must be 0.50–0.95 (TRADE requires >= 0.70)
- All simulated results labeled SIMULATED

## Project docs

- [Project Brief](docs/PROJECT_BRIEF.md)
- [Decisions Log](docs/DECISIONS.md)
- [Open Questions](docs/OPEN_QUESTIONS.md)
- [TODO](docs/TODO.md)
- [Runbook](docs/RUNBOOK.md)
- [Source Hierarchy](docs/SOURCE_HIERARCHY.md)
- [Daily Status](reports/DAILY_STATUS.md)
- [Evaluation](reports/EVALUATION.md)
