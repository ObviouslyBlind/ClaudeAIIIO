# TODO

## Two Harbors (current gauntlet — base harbour)

Politics frozen. See `game/reports/GAUNTLET_STATUS.md`.

- [x] Lease → House → Enter → Exit (pixel `/?g=int22`)
- [x] PAPER econ HUD strip (code)
- [x] NPC stall buy + quay pedestrians (code)
- [x] Nearby presence, cart persist, warehouse interior, nametags (code)
- [x] Pixel: trees + cart (`/?g=tree25` PASS)
- [x] Pixel: dirt ribbons (`/?g=dirt24` PASS)
- [ ] Visitor PAPER bid/ask vs NPC books
- [ ] Staff slots on developed plots
- [ ] Pixel remaining meshes (cars, taxi, ferry, shore, quay, shells)

## Polymarket paper bot

## Completed

- [x] Phase 1 — Clean planning
- [x] Phase 2 — Project skeleton
- [x] Phase 3 — Market ingestion
- [x] Phase 4 — Signal logic
- [x] Phase 5 — Paper trading
- [x] Phase 6 — Dashboard
- [x] Phase 7 — Evaluation (discovery fix, events-first ingestion)
- [x] Pipeline fix — events-based markets flow through signals → papertrade → resolution
- [x] Event context preservation — event_slug, bracket_label, event_title preserved end-to-end
- [x] Trade resolution — resolve_trades.py checks market closed/winner status
- [x] Market.from_dict() — JSON → Market deserialization for pipeline
- [x] Fix supplemental merge — relevant_markets_*.json now includes supplemental markets
- [x] Strategy + Profile architecture — parameterized engine, 3 built-in profiles
- [x] Run history — durable RunRecord storage in data/runs/
- [x] Per-profile ledgers — each strategy+profile gets own ledger file
- [x] Dashboard hardening — error vs empty states, source-based freshness, safe rendering
- [x] Dashboard comparative — Run History tab with strategy/profile comparison table
- [x] resolve_trades.py updates run records with resolution stats
- [x] Per-profile ledger comparison in dashboard
- [x] Trade lifecycle documented (OPEN → WON/LOST/EXPIRED/CANCELLED)
- [x] Docs aligned with actual implementation
- [x] PROJECT_REVIEW.md updated to reflect verified state
- [x] Extract find_latest_file() into shared utility (polymarket_timer_bot/utils.py)
- [x] Baseline test protocol documented (docs/BASELINE_TEST_PROTOCOL.md)
- [x] Evaluation template created (docs/EVALUATION_TEMPLATE.md)
- [x] Dashboard run history shows won/lost/expired columns
- [x] Ledger summary includes expired + cancelled counts
- [x] Win rate calculation excludes expired/cancelled (only definitive outcomes)
- [x] Dashboard error handling — each render section wrapped in try/catch with visible errors
- [x] Dashboard auto-refresh — 60s client-side reload with cache busting
- [x] .nojekyll added to dashboard for GitHub Pages compatibility
- [x] Unused imports cleaned up (DEFAULT_CONFIG in scripts)

- [x] Pipeline automation — run_pipeline.sh + GitHub Actions (every 6h)
- [x] Evaluation summary — generate_summary.py + Evaluation dashboard tab
- [x] Pipeline alerting — report JSON + Actions summary + failure emails
- [x] Dashboard Evaluation tab — per-profile metrics, pipeline status
- [x] Evaluation breakdowns — by subject, event family, expiry window, skip reason
- [x] Realized vs unrealized PnL in summary and dashboard
- [x] Trade breakdowns — by subject and event family with PnL
- [x] Alert flags — zero markets, new trades, resolutions, no signals

- [x] Bracket-position-aware analysis — hot/adjacent/tail classification without changing trading logic
- [x] Operator summary panel — compact at-a-glance metrics on Evaluation tab
- [x] Strategy B evidence threshold checklist — 4 criteria tracked in summary.json + dashboard
- [x] Track A — Full outcome reporting by bracket position (wins/losses/expired/cancelled/win rate/avg resolution per position)
- [x] Track A — Position assessment with auto-generated verdicts and recommendations
- [x] Track A — Enhanced Strategy B criteria (profile differentiation + position-matters now data-driven)
- [x] Track B — Cadence decision memo (docs/DECISION_CADENCE.md)

## Current phase: Baseline evaluation + operational monitoring

- [ ] Wait for real market resolutions (need closed markets with winners)
- [ ] End-to-end resolution test with real closed markets
- [ ] Assess whether NO-side strategy differentiates across profiles (Q005)
- [ ] Decide on Strategy B candidate based on evidence (see threshold criteria below)
- [ ] Smallest signal-engine change: add bracket-position as a score modifier (see recommendation below)

## Next (after baseline evaluation)

- [ ] Implement Strategy B (bracket-position-weighted — see OPEN_QUESTIONS Q012)
- [ ] Dashboard family grouping (Q008) — render families.json as grouped view
- [ ] Add pyproject.toml to eliminate sys.path hacks
- [ ] Replace datetime.utcnow() with timezone-aware

## Deferred

- [ ] XTracker data extraction for count estimation (Q006)
- [ ] External source integration (trumpstruth.org, muskmeter.live)
- [ ] Auto-generate date-based slugs from series patterns
- [ ] Rate limiting / retry on API calls
- [ ] Add linting/type checking config
- [ ] Build analytics module (currently empty placeholder)
- [ ] Data file cleanup / rotation
- [ ] Conditions for automatic CANCELLED status (Q011)
