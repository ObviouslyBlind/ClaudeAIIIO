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

## D011 — Strategy + Profile separation (2026-03-18)

**Decision:** Separate strategy (what to do) from profile (how aggressively). Engine is shared, parameterized by StrategyConfig. Three built-in profiles: conservative, moderate, aggressive.
**Reason:** Enables comparative testing without duplicating the engine. Same input data, different thresholds → separately attributable outputs. Strategy decides signal logic; profile controls risk parameters (price floors, expiry limits, stakes).

## D012 — Per-profile ledgers (2026-03-18)

**Decision:** Each strategy+profile combination gets its own ledger file (`ledger_no_side_moderate.json`, etc.).
**Reason:** Prevents cross-contamination between profiles. Trades opened under conservative thresholds should not mix with aggressive trades. Makes comparison clean and auditable.

## D013 — Durable run history (2026-03-18)

**Decision:** Store RunRecords in `data/runs/` with index.json + individual run files. Each run captures strategy, profile, input snapshot, timestamps, and summary metrics.
**Reason:** Results must survive beyond a single session. Run history enables comparison across time, replay, and auditability. Index file supports dashboard rendering; individual files support detailed inspection.

## D014 — Dashboard freshness from source data (2026-03-18)

**Decision:** Dashboard shows data freshness based on source file modification time (from meta.json), not browser clock.
**Reason:** Browser time creates false freshness — dashboard would show "just updated" even if data is hours old. Source file mtime is the honest signal. meta.json is written by export_dashboard.py with actual file mtimes.

## D015 — Supplemental merge before save (2026-03-18)

**Decision:** Move `relevant_markets_*.json` save to AFTER supplemental /markets merge.
**Reason:** Previous code saved relevant markets, then merged supplementals, so supplemental markets never reached the downstream pipeline (run_signals.py reads the file). Now the file includes all relevant markets from both discovery paths.
