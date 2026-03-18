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

## D005 — Signal thresholds (2026-03-18)

**Decision:** NO price must be between 0.50 and 0.95. TRADE requires NO >= 0.70 within 72h expiry. YES price 0.40-0.60 = mixed evidence = SKIP.
**Reason:** Below 0.50, the market thinks the event is likely (risky for NO). Above 0.95, the upside is too small. The 0.70 trade threshold ensures meaningful edge. Mixed evidence zone prevents betting on coin flips.

## D006 — Three-tier signal output (2026-03-18)

**Decision:** Signals are TRADE, WATCH, or SKIP. Each includes a score (0-100) and list of reasons.
**Reason:** Binary trade/no-trade misses the nuance of markets that may become tradeable. WATCH lets us track promising setups. Logged reasons make every decision auditable.

## D007 — Events endpoint for discovery (2026-03-18)

**Decision:** Use the Gamma `/events` endpoint as primary market discovery, not `/markets`.
**Reason:** Bracket/count posting markets (negRisk grouped markets) do not appear on the `/markets` endpoint at all — confirmed by paginating 10,000 markets. They are only accessible via `/events`. Discovery priority: (1) direct known URLs, (2) exact slug lookup, (3) known pattern generation, (4) events pagination fallback, (5) `/markets` supplemental.

## D008 — Source hierarchy (2026-03-18)

**Decision:** Strict source hierarchy for discovery, validation, and cross-checking. See `docs/SOURCE_HIERARCHY.md`.
**Reason:** Multiple sources exist with different reliability and access characteristics. XTracker is official resolution source but client-rendered. trumpstruth.org and muskmeter.live are accessible proxies for count estimation.

## D009 — Dual-layer classification (2026-03-18)

**Decision:** Classify at event-title level (primary), validate against bracket-question text (audit). Log disagreements, use event-level as primary.
**Reason:** Event titles are more reliable for classification. Bracket questions are validation. Logging disagreements catches edge cases without breaking the pipeline.

## D010 — Classifier plural posting keywords (2026-03-18)

**Decision:** Changed `\btweet\b` to `\btweets?\b` and `\bpost\b` to `\bposts?\b` in POSTING_KEYWORDS.
**Reason:** Real event titles use plural forms ("Elon Musk # tweets", "Trump # Truth Social posts"). The singular-only regex missed these. The `?` quantifier handles both forms.
