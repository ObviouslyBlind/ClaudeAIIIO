# TODO

## Completed

- [x] Phase 1 — Clean planning
- [x] Phase 2 — Project skeleton
- [x] Phase 3 — Market ingestion
- [x] Phase 4 — Signal logic
- [x] Phase 5 — Paper trading
- [x] Phase 6 — Dashboard (approved to proceed to Phase 7)

## Next

### Phase 7 — Evaluation (REVISED)
- [x] End-to-end pipeline test (all 4 scripts, fresh data)
- [x] Classifier coverage audit — classifier works; discovery is broken
- [x] Signal logic validation (dry-run with synthetic + real market data)
- [x] Paper-trade integrity verification
- [x] Evaluation report written and revised (reports/EVALUATION.md)
- [x] Root-cause analysis: `/markets` endpoint missing bracket/negRisk markets
- [x] Source hierarchy defined (XTracker, trumpstruth.org, muskmeter.live)
- [x] Real market support assessed (3 known events, all parseable + classifiable)

### Discovery Fix (COMPLETED)
- [x] Add `fetch_events()` and `fetch_event_by_slug()` to polymarket.py
- [x] Add `parse_event_markets()` for event→market extraction
- [x] Add `MarketFamily` dataclass for grouped bracket markets
- [x] Add event-aware fields to Market model (event_slug, event_title, bracket_label)
- [x] Create `config/known_event_patterns.json` with slug patterns
- [x] Update fetch_markets.py with events-first discovery (5-layer priority)
- [x] Add dual-layer classification (event-level + bracket validation)
- [x] Fix classifier regex for plural posting keywords (tweets, posts)
- [x] Add 29 new tests (70 total, all passing)
- [x] Run pipeline: 11 events, 290 brackets, 10 TRADE signals from live data
- [x] Update docs (DECISIONS D007-D010, RUNBOOK, SOURCE_HIERARCHY)

### Deferred
- [ ] Resolve Q004 (market resolution timing)
- [ ] XTracker data extraction (client-rendered, no API found)
- [ ] External source integration for count estimation
- [ ] Known slug pattern generation (auto-generate date-based slugs from series patterns)
