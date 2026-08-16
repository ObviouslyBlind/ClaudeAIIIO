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

## D016 — Automated pipeline via GitHub Actions (2026-03-18)

**Decision:** Run the full pipeline (fetch → signals × 3 → papertrade × 3 → resolve → summary → export) every 6 hours via GitHub Actions cron. Commits updated data directly to main.
**Reason:** 3-day expiry markets don't need minute-level freshness. 6-hour cycles (4x/day) balance data freshness with API politeness and commit noise. GitHub Actions is free for public repos and requires zero infrastructure.

## D017 — Evaluation summary layer (2026-03-18)

**Decision:** `generate_summary.py` produces `summary.json` with per-profile signal counts, trade stats, win rate (definitive only), PnL, exposure, and average resolution time. Rendered in a new Evaluation dashboard tab.
**Reason:** Operational visibility requires at-a-glance comparison across profiles without reading raw ledger JSON. The summary is generated fresh each pipeline run and exported alongside other dashboard data.

## D018 — Pipeline alerting via three channels (2026-03-18)

**Decision:** Three alert paths: (1) `pipeline_report.json` for machine-readable step status, (2) GitHub Actions job summary for human review, (3) GitHub's built-in email notifications on workflow failure.
**Reason:** No external services needed. GitHub's notification system already handles failure alerting. The report JSON enables dashboard rendering of pipeline health.

## D019 — Evaluation breakdowns by subject, event, expiry, skip reason (2026-03-18)

**Decision:** Add dimensional breakdowns to `summary.json`: signals by subject (musk/trump), by event family, by expiry window (0-12h/12-24h/24-48h/48-72h/72h+), and by skip reason (price_too_high, market_closed, expiry_too_far, etc.). Add trade breakdowns by subject and event family with realized PnL and unrealized exposure.
**Reason:** Per-profile totals tell you how much is happening, but not where edge exists. Breakdowns answer: "Which subject drives more trades?", "Which events are tradeable?", "What expiry window produces trades?", "Why are signals being skipped?" These are the questions needed to evaluate whether Strategy B adds value and where count-aware inputs would help most.

## D020 — Alert flags in summary (2026-03-18)

**Decision:** `generate_summary.py` produces `alerts` array with structured alert objects (`{level, message}`). Four alert conditions: zero relevant markets, open trades count, trade resolutions, and zero signals evaluated. Rendered as colored banners in the Evaluation tab.
**Reason:** Minimal operational visibility without external services. Alerts appear in the dashboard (visible on auto-refresh), in the pipeline CLI output, and in the GitHub Actions job summary. Three channels, zero infrastructure.

## D021 — Bracket-position-aware analysis (2026-03-18)

**Decision:** Add bracket-position classification (hot/adjacent/tail) to evaluation breakdowns and operator summary. Do NOT change trading logic yet.
**Reason:** Before modifying the signal engine, we need to measure whether edge differs by bracket position. The classification uses sibling bracket YES prices within each event family — the bracket with the highest YES price is "hot" (market consensus), ±1 is "adjacent", and everything else is "tail". Early data shows most trades concentrate in adjacent brackets (12/21), with tail brackets heavily skipped (748 SKIPs vs 5 TRADEs). Once resolution data accumulates, this will reveal whether position predicts win rate.

## D022 — Operator summary panel (2026-03-18)

**Decision:** Add a compact operator summary to the top of the Evaluation tab showing key metrics at a glance: families, brackets evaluated, active trades, outcomes, win rate, PnL, exposure, position coverage, and Strategy B status.
**Reason:** Operators need a single-glance view without reading breakdown tables. The operator summary is the first thing visible on the Evaluation tab and includes a one-line Strategy B status.

## D023 — Strategy B evidence threshold checklist (2026-03-18)

**Decision:** Track Strategy B readiness via 4 criteria: 10+ definitive outcomes, 2+ complete event cycles, profile differentiation, and position-matters evidence. Report progress in summary.json and dashboard.
**Reason:** Prevents premature implementation of bracket-position-weighted trading. The checklist makes the "when" decision objective and visible rather than subjective.

## D024 — Outcome reporting by bracket position (2026-03-18)

**Decision:** Enhance bracket-position breakdowns to include full outcome data: wins, losses, expired, cancelled, win rate, average time to resolution, and a plain-English position assessment with recommendations.
**Reason:** Bracket-position classification (D021) showed signal distribution, but not outcome quality. To decide whether to implement no_side@1.1 score modifiers, we need to know which positions actually win/lose after resolution. The assessment auto-generates verdicts ("outperforming", "neutral", "underperforming") and concrete recommendations ("consider reducing hot-bracket trades"). This keeps the decision evidence-based rather than speculative.

## D025 — Cadence decision memo (2026-03-18)

**Decision:** Write a planning document comparing 5-minute GitHub Actions, 1-minute VPS cron, and daemon approaches. Do not implement any infrastructure change yet.
**Reason:** Current 6-hour cadence may miss entry points and delay resolution detection, but we have 0 resolved trades — faster cadence doesn't help until the system is validated. The memo identifies the cheapest path ($5/month Hetzner CX22) and a safe immediate improvement (reduce to 1-hour Actions, stays in free tier). Implementation deferred until cadence is proven insufficient.

## D026 — Dashboard publish-path hardening + 1-hour cadence (2026-03-18)

**Decision:** Five fixes: (1) status bar monitors summary.json and pipeline_report.json, (2) freshness shows oldest source mtime across all core files, (3) summary-dependent panels distinguish FAILED from EMPTY, (4) GitHub Actions cadence reduced from 6h to 1h (stays in free tier).
**Reason:** Dashboard audit found freshness only tracked one file, status bar ignored evaluation data failures, and FAILED/EMPTY states were indistinguishable. 1-hour cadence is the cheapest safe improvement per the cadence decision memo (D025).

## D027 — Freeze politics; base harbour genre bar (2026-08-16)

**Decision:** Stop new House / Senate / council / election / amendment work. Point the gauntlet at the **base harbour loop**: spawn, cart, lease, develop, NPC/market books, nearby outdoor presence, persist. Match Capital Rift only as a *genre* (one shard, sim owns numbers). Do not clone their client, Earth, OSM, or wallet.
**Reason:** Operator redirected: do not focus on politics for now; get the harbour as close as that public persistent-shard loop. Statute catalog stays as sim data. Already-landed politics files are frozen, not expanded.

## D028 — Paint the harbour sky before the rest of the module graph (2026-08-16)

**Decision:** `first-frame.js` is the only HTML module script. It imports three.js, paints sky cyan `#7ec8d4`, looks at the north ferry berth, then dynamically imports `main.js`. Sheet HUD modules load after the animation loop starts. Canvas has inline `#7ec8d4` so a critic never sees body teal `#0e4a55` as “the scene.”
**Reason:** Pixel critics `/?g=ferry31`–`ferry33` sat 25s on “Loading 3D harbour…” with body teal showing through. Twelve HUD module tags plus `main.js` static imports delayed the first WebGL frame past the critic timeout. This is a boot-order fix, not a strategy change.

## D015 — Supplemental merge before save (2026-03-18)

**Decision:** Move `relevant_markets_*.json` save to AFTER supplemental /markets merge.
**Reason:** Previous code saved relevant markets, then merged supplementals, so supplemental markets never reached the downstream pipeline (run_signals.py reads the file). Now the file includes all relevant markets from both discovery paths.
