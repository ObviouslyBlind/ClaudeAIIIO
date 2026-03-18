# Polymarket NO-Only Timer Bot

Paper-trading bot that monitors Polymarket bracket/count markets for Elon Musk tweets and Donald Trump Truth Social posts, evaluating NO-side opportunities with configurable strategies and risk profiles.

## Status

**Current phase: Baseline evaluation** — running Strategy A (`no_side@1.0`) across three risk profiles to gather comparative evidence before expanding.

End-to-end pipeline operational: fetch → signals → papertrade → resolve → dashboard.
Supports multi-strategy comparative testing (conservative / moderate / aggressive profiles).

## How it works

1. **Discover** posting-count events from Polymarket's events API (bracket markets like "65-89 tweets")
2. **Classify** events as musk_posting or trump_posting using dual-layer classification
3. **Evaluate** each bracket market with a parameterized signal engine (TRADE / WATCH / SKIP)
4. **Paper trade** TRADE signals with configurable stakes per profile
5. **Resolve** open trades when markets close (WON / LOST / EXPIRED)
6. **Compare** results across strategy+profile combinations via dashboard and run history

## Quick start

```bash
pip install -r requirements.txt

# 1. Discover and classify markets
python scripts/fetch_markets.py

# 2. Evaluate signals (default: no_side / moderate)
python scripts/run_signals.py
python scripts/run_signals.py --profile conservative   # or compare profiles
python scripts/run_signals.py --profile aggressive

# 3. Open paper trades
python scripts/run_papertrade.py
python scripts/run_papertrade.py --profile conservative

# 4. Resolve closed markets
python scripts/resolve_trades.py

# 5. View dashboard
python scripts/serve_dashboard.py   # http://localhost:8000
```

## Multi-strategy testing

The system separates **what** to do (strategy) from **how aggressively** to do it (profile):

| Profile | NO Trade Min | NO Price Floor | Max Expiry | Stake |
|---|---|---|---|---|
| conservative | 0.80 | 0.60 | 48h | $50 |
| moderate | 0.70 | 0.50 | 72h | $100 |
| aggressive | 0.60 | 0.40 | 72h | $200 |

Each strategy+profile combo gets its own ledger file and run history entry.
The dashboard shows comparative results across combinations.

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

## Project docs

- [Project Brief](docs/PROJECT_BRIEF.md)
- [Baseline Test Protocol](docs/BASELINE_TEST_PROTOCOL.md) — how to run the evaluation
- [Evaluation Template](docs/EVALUATION_TEMPLATE.md) — record findings per cycle
- [Runbook](docs/RUNBOOK.md)
- [Decisions Log](docs/DECISIONS.md)
- [Open Questions](docs/OPEN_QUESTIONS.md)
- [TODO](docs/TODO.md)
- [Source Hierarchy](docs/SOURCE_HIERARCHY.md)
