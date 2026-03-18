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
- [x] Docs aligned with actual implementation

## Next

- [ ] Run comparative test: conservative vs moderate vs aggressive on real data (Q005)
- [ ] End-to-end resolution test with real closed markets
- [ ] Dashboard family grouping (Q008) — render families.json as grouped view
- [ ] Add more strategies to STRATEGIES registry (Q010) — only after validation
- [ ] Extract find_latest_file() into shared utility (duplicated in scripts)
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
