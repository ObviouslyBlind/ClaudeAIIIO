# TODO

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

## Current phase: Baseline evaluation

- [ ] Run baseline protocol: Strategy A × 3 profiles on real market data
- [ ] Gather first comparative evidence (signal counts, trade counts, P&L)
- [ ] End-to-end resolution test with real closed markets
- [ ] Record findings in evaluation template
- [ ] Assess whether NO-side strategy differentiates across profiles (Q005)
- [ ] Decide on Strategy B candidate based on evidence

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
- [ ] Automated scheduling / polling (Q007)
- [ ] Conditions for automatic CANCELLED status (Q011)
