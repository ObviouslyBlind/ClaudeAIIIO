# Project Brief

## What we're building

A paper-trading bot that evaluates NO-side bets on Polymarket bracket/count markets for Elon Musk and Donald Trump posting activity. It supports multiple strategy profiles for comparative testing. It does not trade real money.

## Why NO-only on bracket markets

In bracket events (e.g. "Will Musk post 65-89 tweets?"), exactly one bracket resolves YES and the rest resolve NO (worth $1). Betting NO on brackets that are unlikely to hit can have a statistical edge — but we need comparative data across risk profiles to confirm this.

## Market structure

Markets are grouped as **events** with multiple **bracket** sub-markets. Example:
- Event: "Elon Musk # tweets March 19 - March 21, 2026?"
- Brackets: "<40", "40-64", "65-89", "90-114", "115-139", "140-164", "165-199", "200+"

Each bracket is a binary YES/NO market. Exactly one bracket resolves YES; all others resolve NO.

## Architecture

**Strategy** defines WHAT to do (which signal rules apply).
**Profile** defines HOW aggressively to express it (thresholds, stakes, limits).
The signal engine is shared — parameterized by StrategyConfig (strategy + profile).

Each pipeline run produces:
- A RunRecord with full attribution (strategy, profile, input snapshot, timestamps)
- Per-profile signal files and ledger files
- Durable history in data/runs/ for later comparison

## What v1 delivers

1. **Market ingestion** — events-first discovery with bracket market parsing
2. **Signal logic** — parameterized TRADE / WATCH / SKIP with strategy+profile attribution
3. **Paper trading** — per-profile ledgers with entry/exit tracking
4. **Trade resolution** — automatic resolution when markets close (WON/LOST/EXPIRED)
5. **Run history** — durable records for comparing strategies across time
6. **Dashboard** — HTML viewer with error/empty state distinction, source-based freshness, comparative run table

## What v1 does NOT do

- No real trading
- No wallet or key management
- No autonomous decisions
- No markets beyond Musk/Trump posting
- No external count estimation (relies on market prices as probability proxy)
- No automated scheduling/polling

## Success criteria

- Pipeline traceable end-to-end
- Results attributable to specific strategy + profile + input window
- Dashboard directly inspectable without VM
- Error states distinguishable from empty states
- Freshness based on source data, not browser clock
- All results labeled SIMULATED

## Open strategic questions

See [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md) for questions that need human judgment before expanding scope.
