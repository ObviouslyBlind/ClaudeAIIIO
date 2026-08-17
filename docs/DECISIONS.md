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

## D029 — Spawn camera looks seaward at the ferry berth (2026-08-16)

**Decision:** North spawn camera sits inland of the visitor (`z: -40`) and looks seaward (`look-at z: +90`) so the cream hull at `HOME_Z=-6835` is in the first frame. Do not ask computerUse critics to RMB-orbit.
**Reason:** `/g/ferry35` FAIL HULL: inland look hid the boat behind the camera. `/g/ferry36` FAIL NO ORBIT: the critic environment cannot emit trusted right-button pointer events. Player still spawns 8 m inland of the north port. PAPER / SIMULATED. Not a live-trading change.
**Superseded by D030** for `/` playtest. Seaward framing stays in the critic log; it is not the live spawn.

## D030 — `/` playtest spawn looks inland (2026-08-17)

**Decision:** Restore the inland third-person spawn on `/`. North camera offset `{ x: 20, y: 24, z: 40 }`, look-at `{ x: 0, y: 5, z: -120 }`. Strip unread giant north extras (brow, plate, ring, funnel, cargo, teal, clay, green). Keep pixel-held dinghies and the rust buoy.
**Reason:** Operator came back to playtest and `localhost:8787` dumped them into the seaward critic harbour, which was a pile of unread 8–40 m cubes. Playtest is the bar. PAPER / SIMULATED.

## D031 — One asset nonce per play process (2026-08-17)

**Decision:** Stamp harbour HTML/JS with one `ASSET_NONCE` for the life of `npm run play`. Do not call `Date.now()` on every response.
**Reason:** Playtest: `/` painted the cyan first frame (North port) then the tab stopped responding. `first-frame.js` dynamically imports `main.js`, and `main.js` statically imports `first-frame.js`. A fresh `?v=` per file turned that cycle into an infinite module fetch. PAPER / SIMULATED.

## D032 — Defer heavy harbour meshes until after first walk (2026-08-17)

**Decision:** `main.js` must not statically import `interior.js` / `trees.js` / `stalls.js` / `taxi.js` / `quay.js` / `buildings.js`. Spawn, north terrain, roads, and north port paint first. The rest loads after a paint yield. `canEnter` / `wrapHarbourWorld` live in `harbour-world.js`.
**Reason:** Playtest on the tunnel: HUD and tick showed, canvas stayed teal with specks, Edge “page not responding.” Compiling factory/shop interiors plus trees before the first walk blocked the main thread. PAPER / SIMULATED.

## D033 — Boot returns before dressing; nearby lots only (2026-08-17)

**Decision:** After north terrain / road / port, `boot()` must return. Dressing (quay, trees, stalls, taxi, south) starts on a 400ms timer, one module per ~80ms idle. First lots are north plots within 420 m of the port. Do not compile interiors until Enter.
**Reason:** Playtest: beige land and a tiny visitor appeared, then Edge froze again. `await loadDressing()` still compiled trees/interiors on the first click window. PAPER / SIMULATED.

## D034 — Clicks raycast ground and lots only (2026-08-17)

**Decision:** `onPointer` intersects `clickTargets()` (terrain, plot lines, buildings), not `harbourGroup` recursively. Tree InstancedMeshes have a no-op `raycast`. Do not dump every island plot into the scene during dressing.
**Reason:** `/g/walk89` FAIL WALK: left click on inland ground opened “Page Unresponsive.” Full-scene recursive raycast against trees/props/peds blocked the main thread. PAPER / SIMULATED.

## D035 — Dress the harbour after the first click, not at 400ms (2026-08-17)

**Decision:** Do not start quay/trees/stalls/taxi/`loadSheetHuds` on a 400ms boot timer. `startDressing()` runs 5s after the first left click (so the walk paints), or after 60s if they never click. First click raycasts ground only. `findParcelAt` only tests lots that already have meshes.
**Reason:** `/g/walk90` FAIL WALK: D034 cheap raycast still froze the tab. Critics click ~6s after load, which landed on `trees.js` compile. PAPER / SIMULATED.

## D036 — Human-metre playtest meshes; no auto trees (2026-08-17)

**Decision:** Live spawn uses person scale (~2 m visitor). Quay lamps ~3.2 m, north sign posts ~3.2 m, dinghies ~4.2 m, port shed ~8×3.4×6 m, foam dashes ~1.6 m, rust buoy ~0.9 m. Strip the 34 m cream mast and the 32 m / 48 m critic towers. `loadDressing` does not import `trees.js` / south / stalls / street-props / peds. Dressing waits until walk has been idle 45 s (120 s fallback). Develop only meshes lots that already have plot lines.
**Reason:** Operator playtest: scale was unreadable (tiny visitor vs towers), and the tab crashed within minutes. `/g/lease92` FAIL LEASE: first click then “Page Unresponsive” while trees compiled. PAPER / SIMULATED.

## D037 — Taxi at boot; pier over water (2026-08-17)

**Decision:** `ensureTaxi()` runs at the end of boot so the Taxi button and yellow cab work without waiting 45–120 s. Port apron is only ~14 m seaward; the timber pier is 7×32 m with pilings over water, not an 86 m slab on the 90 m land pad.
**Reason:** Operator: taxi dead, pier sitting on sand. D036 skipped taxi.js to avoid compile freeze. PAPER / SIMULATED.

## D038 — Spawn only cheap street lots (2026-08-17)

**Decision:** First-frame parcels are vacant north street lots $1000 can lease and develop. Giant fields stay unmeshed. A tap near a starter lot snaps to it. Plot lines are clickable before dressing.
**Reason:** `/g/house96` FAIL HOUSE: first inland tap selected a 6,522 m² field at $1,121 with $970 cash, so Lease stayed disabled. PAPER / SIMULATED.

## D040 — No delayed dressing on live play (2026-08-17)

**Decision:** Remove the 45 s / 120 s dressing timer entirely. Live `/` never imports quay.js / ferry.js / shore.js / traffic.js; sheet HUDs load at the end of boot. `ensureIsland` spreads landfall builds across idle slices.
**Reason:** `/g/south99` FAIL SOUTH and the operator's "crashes within ~5 minutes": dressing compiled heavy modules mid-session on the main thread and Chrome showed "Page Unresponsive". A working game beats quay clutter; the meshes return after a perf pass. PAPER / SIMULATED.

## D043 — Trickle carries only cars and the moving ferry (2026-08-17)

**Decision:** `loadTrickleDressing` loads traffic and the moving ferry only. Quay clutter and shore foam stay off live play until they can build off the main thread.
**Reason:** `/g/south101` FAIL SOUTH: the ferry/landfall worked, but the tab froze during the 60 s idle exactly when the quay-clutter and foam steps built their meshes. PAPER / SIMULATED.

## D042 — Ferry-hint observer loop killed (2026-08-17)

**Decision:** `ferry-hud.js` never observes `document.body`; all sheet-HUD paints write only when the text changes.
**Reason:** `/g/south100` FAIL SOUTH on a build with no dressing at all: the ferry hint repainted on every body mutation, and the repaint itself was a body mutation, so near the port the observer fed itself forever and Chrome showed "Page Unresponsive". This — not module compiles — was the real mid-session freeze. PAPER / SIMULATED.

## D041 — Trickle dressing (2026-08-17)

**Decision:** Cars, the moving ferry, quay clutter, and shore foam return via `loadTrickleDressing`: starts 8 s after boot, one module compile or mesh build per step, 2.5 s gaps, and every step waits until the player has not clicked for 1.5 s. Trees / stalls / peds / street props stay off (D036).
**Reason:** Operator asked for the decoration back after D040 stripped it. The freeze came from burst compiles competing with input; spacing the steps and yielding to recent clicks keeps the tab responsive. PAPER / SIMULATED.

## D039 — Ferry landfall builds south; port is tappable (2026-08-17)

**Decision:** `spawnAt` calls `ensureIsland(id)`: first arrival on an island builds its terrain, port, palms, and starter lots (boot pre-marks north). `applySnapshot` meshes restored visitor/used lots that were never drawn. Pier/shed/dock are in `clickTargets` so tapping the port opens the ferry.
**Reason:** Bug scout for the operator playtest: confirming the $15 ferry dropped the visitor on an unbuilt south island (void), Restore could hand back invisible buildings, and pier taps were dead code. PAPER / SIMULATED.

## D015 — Supplemental merge before save (2026-03-18)

**Decision:** Move `relevant_markets_*.json` save to AFTER supplemental /markets merge.
**Reason:** Previous code saved relevant markets, then merged supplementals, so supplemental markets never reached the downstream pipeline (run_signals.py reads the file). Now the file includes all relevant markets from both discovery paths.
