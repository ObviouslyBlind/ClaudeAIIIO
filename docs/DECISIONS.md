# Decisions Log

Record of architecture and strategy decisions with reasoning.

## D001 — NO-only strategy (2026-03-18)

**Decision:** v1 only considers NO-side bets.
**Reason:** Timer markets (will X happen by date?) tend to expire without the event. NO-side may have a statistical edge. We need to validate this with data before expanding.

## D002 — Paper trading first (2026-03-18)

**Decision:** No real money in v1. Paper trading only.
**Reason:** Must prove the strategy works on paper before risking capital. Simulated results will be clearly labeled.

## D003 — Musk/Trump posting markets only (2026-03-18)

**Decision:** Scope limited to markets about Elon Musk tweets and Donald Trump Truth Social posts.
**Reason:** Narrow focus allows better signal quality. These markets are frequent and have clear resolution criteria.

## D004 — Max 3-day expiry (2026-03-18)

**Decision:** Only consider markets expiring within 3 days.
**Reason:** Shorter timeframes reduce exposure and align with the low-drawdown priority.
