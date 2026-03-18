# Project Brief

## What we're building

A paper-trading bot that watches Polymarket prediction markets about Elon Musk and Donald Trump posting activity. It evaluates NO-side bets on bracket/count markets (e.g. "Will Musk post 65-89 tweets?"). It does not trade real money.

## Why NO-only

In bracket events, exactly one bracket resolves YES and the rest resolve NO (worth $1). Betting NO on brackets that are unlikely to hit can have a statistical edge — but we need data to confirm this before risking anything.

## Market structure

Markets are grouped as **events** with multiple **bracket** sub-markets. Example:
- Event: "Elon Musk # tweets March 19 - March 21, 2026?"
- Brackets: "<40", "40-64", "65-89", "90-114", "115-139", "140-164", "165-199", "200+"

Each bracket is a binary YES/NO market. Exactly one bracket resolves YES; all others resolve NO.

## What v1 delivers

1. **Market ingestion** — events-first discovery with bracket market parsing
2. **Signal logic** — rule-based TRADE / WATCH / SKIP with scoring
3. **Paper trading** — simulated ledger with entry/exit tracking
4. **Trade resolution** — automatic resolution when markets close
5. **Dashboard** — HTML viewer of signals, trades, and market state

## What v1 does NOT do

- No real trading
- No wallet or key management
- No autonomous decisions
- No markets beyond Musk/Trump posting
- No external count estimation (relies on market prices as probability proxy)

## Success criteria

- Clean, auditable codebase
- Honest performance tracking (no inflated metrics)
- Clear separation of concerns
- Easy to inspect and verify at every step

## Open strategic questions

See [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md) for questions that need human judgment before expanding scope.
