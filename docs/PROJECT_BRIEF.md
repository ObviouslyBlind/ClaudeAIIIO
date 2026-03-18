# Project Brief

## What we're building

A paper-trading bot that watches Polymarket prediction markets about Elon Musk and Donald Trump posting activity. It only considers NO-side bets. It does not trade real money.

## Why NO-only

Many "will X post Y by Z date?" markets expire without the event happening. Betting NO on well-chosen markets can have a statistical edge — but we need data to confirm this before risking anything.

## What v1 delivers

1. **Market ingestion** — fetch and classify relevant Polymarket markets
2. **Signal logic** — simple rules that output TRADE / WATCH / SKIP with reasons
3. **Paper trading** — track hypothetical bets with a fake ledger
4. **Analytics** — honest performance analysis, clearly labeled as simulated
5. **Dashboard** — simple HTML view of current state and results

## What v1 does NOT do

- No real trading
- No wallet or key management
- No autonomous decisions
- No markets beyond Musk/Trump posting
- No bracket or count markets (binary timer markets only in v1)

## Success criteria

- Clean, auditable codebase
- Honest performance tracking (no inflated metrics)
- Clear separation of concerns
- Easy to inspect and verify at every step
