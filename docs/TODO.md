# TODO

## Completed

- [x] Phase 1 — Clean planning
- [x] Phase 2 — Project skeleton
- [x] Phase 3 — Market ingestion
- [x] Phase 4 — Signal logic
- [x] Phase 5 — Paper trading
- [x] Phase 6 — Dashboard
- [x] Phase 7 — Evaluation (discovery fix, events-first ingestion)
- [x] Pipeline fix — run_signals.py and run_papertrade.py now read events-based output
- [x] Event context preservation — event_slug, bracket_label, event_title flow through signal → trade → ledger
- [x] Trade resolution — resolve_trades.py checks market closed/winner status
- [x] Market.from_dict() — enables JSON → Market deserialization for pipeline
- [x] Docs updated — README, PROJECT_BRIEF, OPEN_QUESTIONS match implementation

## Next

- [ ] Validate NO-side strategy on bracket markets with real resolution data (Q005)
- [ ] End-to-end pipeline test with real data through resolution
- [ ] Dashboard bracket/family grouping (Q008)
- [ ] Export families.json to dashboard
- [ ] Extract find_latest_file() into shared utility (duplicated 4x in scripts)
- [ ] Add pyproject.toml to eliminate sys.path hacks

## Deferred

- [ ] XTracker data extraction for count estimation (Q006)
- [ ] External source integration (trumpstruth.org, muskmeter.live)
- [ ] Auto-generate date-based slugs from series patterns
- [ ] Rate limiting / retry on API calls
- [ ] Replace datetime.utcnow() with timezone-aware
- [ ] Add linting/type checking config
- [ ] Build analytics module (currently empty placeholder)
- [ ] Data file cleanup / rotation
