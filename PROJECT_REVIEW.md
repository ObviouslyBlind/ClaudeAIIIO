# PROJECT REVIEW — Full Codebase Audit

**Date:** 2026-03-18
**Reviewer:** Claude Code (automated, based on full file read of every source file)
**Purpose:** Enable a second-pass reviewer (ChatGPT or human) to immediately understand what exists, what works, what is broken, and what to do next.

---

## 1. Project Snapshot

### What it does
A paper-trading system that monitors Polymarket prediction markets about Elon Musk tweets and Donald Trump Truth Social posts. It evaluates NO-side betting opportunities using simple rule-based signals. No real money. No wallet integration.

### Main components

| Directory | Purpose | Maturity |
|---|---|---|
| `polymarket_timer_bot/adapters/` | API client + classifier | **Functional but partially disconnected** |
| `polymarket_timer_bot/models/` | Market + MarketFamily dataclasses | **Functional** |
| `polymarket_timer_bot/signals/` | Rule-based signal engine | **Functional, untested on real flow** |
| `polymarket_timer_bot/papertrade/` | Trade models + JSON ledger | **Functional, never used on real data** |
| `polymarket_timer_bot/analytics/` | Empty placeholder | **Not implemented** |
| `polymarket_timer_bot/config/` | Known event slug registry | **Functional** |
| `scripts/` | Pipeline scripts (fetch, signals, papertrade, export) | **Partially broken** (see below) |
| `dashboard/` | Static HTML/CSS/JS viewer | **Functional but stale data model** |
| `tests/` | 70 tests, all passing | **Good coverage on models/adapters, weak on scripts** |
| `docs/` | Project docs, decisions, runbook | **Current but some files stale** |
| `reports/` | Evaluation, daily status | **Current** |

### Design vs reality mismatches

1. **PROJECT_BRIEF.md says "No bracket or count markets (binary timer markets only in v1)"** — but the actual codebase now supports bracket/count markets via MarketFamily. The brief is stale.
2. **README.md says "Phase 7 (evaluation) is next"** — Phase 7 is complete. README is stale.
3. **`analytics/` module is empty** — a comment-only `__init__.py` and a placeholder test. No analytics code exists.
4. **`run_signals.py` and `run_papertrade.py` read from the old `/markets` data path** — they don't use the new events-based discovery output. This means bracket markets discovered by `fetch_markets.py` **never reach the signal engine or paper-trade ledger** via the normal script pipeline.

---

## 2. What Is Implemented

### Market ingestion (`fetch_markets.py` + `adapters/polymarket.py`)
- 5-layer event discovery: direct URLs → exact slugs → (future) pattern gen → events pagination → `/markets` fallback
- Event parsing into `MarketFamily` with bracket `Market` children
- URL slug extraction from Polymarket URLs
- Client-side keyword filtering for events pagination
- Known-slug registry at `config/known_event_patterns.json`
- Saves: raw events, normalized families, relevant markets, raw `/markets`, all normalized

### Classification (`adapters/classifier.py`)
- Keyword regex matching for person (Musk/Trump) + action (tweet/post)
- Timer-market detection (has deadline)
- Dual-layer: event-title primary, bracket-question validation
- Disagreement logging (warning level)

### Signal engine (`signals/engine.py`)
- Three-tier output: TRADE / WATCH / SKIP
- Score 0-100 based on NO price + time to expiry
- Hard SKIP filters: closed, inactive, wrong type, price out of range, mixed evidence, too far out
- Thresholds: NO 0.50-0.95 range, TRADE at >= 0.70, max 72h expiry

### Paper trading (`papertrade/`)
- `PaperTrade` dataclass with entry/exit, P&L calculation, provenance tagging
- `Ledger` class: JSON-file-backed, open/close trades, duplicate prevention, summary stats
- Default $100 simulated stake per trade

### Dashboard (`dashboard/`)
- Static HTML + vanilla JS + CSS
- Loads JSON from `dashboard/data/` (exported by `export_dashboard.py`)
- 4 tabs: overview, signals, ledger, all markets
- Probability bars, signal badges, trade status coloring
- "SIMULATED" / "PAPER TRADING" badges throughout

### Tests (70 passing)
- `test_models.py` (6): Token, Market properties, serialization
- `test_adapters.py` (25): parser, classifier, URL extraction, event parsing, dual-layer classification
- `test_signals.py` (13): all signal paths, scoring, sorting
- `test_papertrade.py` (11): PaperTrade P&L, Ledger CRUD, persistence
- `test_discovery.py` (11): config loading, URL round-trip, event filtering
- `test_analytics.py` (1): placeholder `assert True`

---

## 3. Known Issues / Weaknesses

### CRITICAL — Correctness / Pipeline Risks

**C1. `run_signals.py` and `run_papertrade.py` do not read events-based output.**
- Both scripts read `data/raw/markets_*.json` (the supplemental `/markets` fetch)
- Bracket/count markets only exist in `data/normalized/relevant_markets_*.json` (from events fetch)
- Result: **the signal engine and paper-trade ledger never see the 290 bracket markets discovered by `fetch_markets.py`**
- Location: `scripts/run_signals.py:33`, `scripts/run_papertrade.py:34`
- Severity: **CRITICAL** — the core pipeline is broken end-to-end for the markets we care about

**C2. No trade resolution mechanism exists.**
- `Ledger.close_trade()` exists but nothing calls it
- No script checks if a market has resolved and updates the ledger
- Open trades stay open forever
- Location: `polymarket_timer_bot/papertrade/ledger.py:98-125`
- Severity: **HIGH** — paper-trade P&L can never be calculated without manual intervention

**C3. `run_signals.py` does not use events-based families or classification.**
- It re-parses raw market JSON through `parse_markets()` + `classify_markets()` + `filter_relevant()`
- This loses all event metadata (event_slug, bracket_label, MarketFamily grouping)
- Even if fixed to read the right file, it would strip event context
- Location: `scripts/run_signals.py:42-45`
- Severity: **HIGH** — signal results lack bracket/event context needed for informed trading

### HIGH — Data / Pipeline Risks

**D1. No data deduplication across runs.**
- `fetch_markets.py` creates new timestamped files every run
- Nothing cleans up old files or deduplicates markets across runs
- `data/` grows unbounded (gitignored, but still a local concern)
- Location: `scripts/fetch_markets.py`, `data/` directory

**D2. `export_dashboard.py` exports `all_markets_*.json` which is from the `/markets` endpoint only.**
- Dashboard `markets.json` will show 500 generic markets, not the 290 bracket markets
- Dashboard `relevant.json` reads from `relevant_markets_*` (correct) but this only works after the events fetch
- Location: `scripts/export_dashboard.py:29`

**D3. No signals data exists.**
- `data/signals/` is empty — `run_signals.py` has never been successfully run against events data
- Dashboard signals tab will always show empty
- Location: `data/signals/`

**D4. No ledger data exists.**
- `data/ledger/` does not exist — no trades have ever been opened
- Location: `data/ledger/`

**D5. Events pagination is slow.**
- `fetch_events_paginated()` makes up to 60 HTTP requests (6000 events) sequentially
- Takes ~14 seconds in practice
- No caching between runs
- Location: `polymarket_timer_bot/adapters/polymarket.py:181-233`

### MEDIUM — Maintainability / Code Quality

**M1. `find_latest_file()` is duplicated 3 times.**
- Identical function in `run_signals.py`, `run_papertrade.py`, `export_dashboard.py`
- Location: all three scripts

**M2. `import re` is unused in `polymarket.py`.**
- Added during events endpoint work but never used
- Location: `polymarket_timer_bot/adapters/polymarket.py:5`

**M3. `sys.path.insert(0, ...)` hack in every script.**
- All 4 scripts manually manipulate `sys.path` to import the package
- Standard fix: use a `pyproject.toml` or `setup.py` with editable install
- Location: all scripts in `scripts/`

**M4. `analytics/` module is completely empty.**
- Only a comment `__init__.py` and a placeholder test
- No analytics code, no performance calculation, nothing
- Location: `polymarket_timer_bot/analytics/__init__.py`, `tests/test_analytics.py`

**M5. `datetime.utcnow()` is deprecated since Python 3.12.**
- Used in `models/market.py:68`, `papertrade/ledger.py:79,111`, `signals/engine.py:37`
- Should use `datetime.now(timezone.utc)` instead
- Not breaking in Python 3.11 (current runtime) but will warn in future versions

**M6. No type checking or linting configured.**
- No `mypy.ini`, `pyproject.toml`, `ruff.toml`, or similar
- No pre-commit hooks
- No CI/CD pipeline

### LOW — Documentation Gaps

**L1. README.md is stale.**
- Says "Phase 7 is next" — Phase 7 is complete
- No mention of events-based discovery, MarketFamily, or bracket markets
- Location: `README.md`

**L2. PROJECT_BRIEF.md contradicts implementation.**
- Says "No bracket or count markets" — but they are now the primary market type
- Location: `docs/PROJECT_BRIEF.md:25`

**L3. OPEN_QUESTIONS.md has only one question.**
- Q001-Q003 were presumably resolved and removed but not documented as such
- Location: `docs/OPEN_QUESTIONS.md`

**L4. `__init__.py` files are all comment-only.**
- No re-exports, no `__all__`, no package-level API
- Not necessarily wrong, but means every import must reference the full submodule path

### LOW — Security / Sanitization

**S1. No input sanitization on API responses.**
- Raw JSON from Polymarket API is trusted completely
- Market questions are rendered via `escapeHtml()` in the dashboard (good)
- But Python code does no validation beyond type coercion
- Risk is low because this is a read-only local tool, but worth noting

**S2. No rate limiting on API requests.**
- Events pagination hits the API 60 times in rapid succession
- No backoff, no retry, no rate limit awareness
- Polymarket could block or throttle

---

## 4. Dashboard-Specific Review

### Current state
- Well-structured HTML/CSS/JS separation
- Clean dark theme ("SENTINEL — Glint Terminal")
- 4 tabs: overview (signal feed + relevant markets + ledger), signals, ledger, all markets
- Provenance badges ("SIMULATED", "PAPER TRADING") throughout — good
- `escapeHtml()` for XSS prevention — good

### What needs attention

1. **Data staleness**: Dashboard shows data from `dashboard/data/` which must be manually exported via `export_dashboard.py`. No auto-refresh, no live polling.

2. **No bracket/family awareness**: The dashboard renders individual markets as flat cards. It has no concept of MarketFamily grouping — 290 bracket markets would render as 290 separate cards with no visual grouping by event.

3. **"All Markets" tab shows wrong data**: It renders from `all_markets_*.json` (the `/markets` endpoint, 500 random markets) rather than the events-based bracket markets. Most displayed markets are irrelevant to the project scope.

4. **Signal feed is empty in practice**: No signals file has been generated that includes bracket market data.

5. **No timestamp provenance on dashboard**: The dashboard shows "updated: [current time]" based on browser clock, not when the data was actually fetched. Misleading.

6. **Google Fonts dependency**: CSS loads IBM Plex from Google Fonts CDN. Dashboard won't render fonts correctly offline.

---

## 5. Whole-Project TODO / Next Steps

### CRITICAL

| # | What | Why | Where |
|---|---|---|---|
| 1 | **Fix `run_signals.py` to read events-based output** | Bracket markets never reach signal engine | `scripts/run_signals.py` |
| 2 | **Fix `run_papertrade.py` to read events-based output** | No trades can ever be opened for bracket markets | `scripts/run_papertrade.py` |
| 3 | **Build trade resolution script** | Open trades can never close; P&L can never be calculated | New `scripts/resolve_trades.py` |
| 4 | **End-to-end pipeline test with real data** | No evidence the full fetch→signal→trade→export chain works | `scripts/` |

### IMPORTANT

| # | What | Why | Where |
|---|---|---|---|
| 5 | **Update dashboard for bracket/family grouping** | 290 flat cards is unusable; needs event-level grouping | `dashboard/assets/app.js` |
| 6 | **Fix `export_dashboard.py` to include families data** | Dashboard needs MarketFamily context | `scripts/export_dashboard.py` |
| 7 | **Extract `find_latest_file()` into shared utility** | Duplicated 3x, maintenance burden | `scripts/` → new `polymarket_timer_bot/utils.py` |
| 8 | **Update README.md** | Stale status, missing discovery architecture | `README.md` |
| 9 | **Update PROJECT_BRIEF.md** | Contradicts actual implementation (bracket markets) | `docs/PROJECT_BRIEF.md` |
| 10 | **Add proper packaging** (`pyproject.toml` or `setup.py`) | Eliminate `sys.path` hacks in every script | Root |
| 11 | **Build analytics module** | Currently empty placeholder; no performance analysis possible | `polymarket_timer_bot/analytics/` |
| 12 | **Add rate limiting / retry logic to API calls** | Events pagination makes 60 rapid requests; no error recovery | `adapters/polymarket.py` |
| 13 | **Add signal context for bracket markets** | `SignalResult.to_dict()` doesn't include `event_slug`, `bracket_label`, `event_title` | `signals/engine.py` |

### LATER / NICE-TO-HAVE

| # | What | Why | Where |
|---|---|---|---|
| 14 | Replace `datetime.utcnow()` with timezone-aware | Deprecated in Python 3.12+ | Multiple files |
| 15 | Auto-generate date-based slugs from series patterns | Reduce manual config maintenance | `config/` |
| 16 | XTracker data extraction for count estimation | Official resolution source but client-rendered | New adapter |
| 17 | External source integration (trumpstruth.org, muskmeter.live) | Cross-check count estimates | New adapter |
| 18 | Add linting/type checking config | No mypy, ruff, or pre-commit | Root config files |
| 19 | Clean up old data files across runs | `data/` grows unbounded | New cleanup script or rotation |
| 20 | Cache events pagination results | Same 6000 events re-fetched every run | `adapters/polymarket.py` |
| 21 | Add dashboard data timestamp (fetch time, not browser time) | Current "updated" time is misleading | `dashboard/assets/app.js` |
| 22 | Replace placeholder `test_analytics.py` | Single `assert True` test | `tests/test_analytics.py` |
| 23 | Add integration tests that test full script pipelines | No tests cover `scripts/*.py` | `tests/` |

---

## 6. Review Hotspots

Files/directories most worth careful review, in priority order:

### `scripts/run_signals.py` and `scripts/run_papertrade.py`
**Why:** These are the two scripts that connect discovery to action. Both are broken — they read from the wrong data source. Fixing these is the single highest-leverage change. Also check whether they should consume `MarketFamily` instead of flat `Market` lists.

### `scripts/fetch_markets.py`
**Why:** The most complex script. Contains the 5-layer discovery logic, deduplication, and all data output. Newly rewritten. Needs scrutiny on: error handling during API failures, correct dedup logic, whether supplemental `/markets` output is actually useful or just noise.

### `polymarket_timer_bot/adapters/polymarket.py`
**Why:** Largest Python module (320 lines). Contains all API interaction. The `fetch_events_paginated()` function does 60 sequential HTTP requests with no retry/backoff. The `_is_posting_count_event()` filter uses hardcoded string sets separate from the classifier's regex patterns — potential for classification drift. `import re` is unused.

### `polymarket_timer_bot/signals/engine.py`
**Why:** The core decision-making logic. Thresholds are hardcoded constants. The engine was designed for binary timer markets ("will X happen by date?") but is now being applied to bracket count markets ("will tweet count be 65-89?"). The NO-side logic may not apply the same way to bracket markets where exactly one bracket resolves YES.

### `dashboard/assets/app.js`
**Why:** The only user-facing output. Currently assumes flat market lists. Needs review for: how it handles 290+ markets, whether signal/ledger displays work with bracket data, and whether the data model assumptions match the new events-based output.

### `polymarket_timer_bot/adapters/classifier.py`
**Why:** Contains two separate classification systems (market-level and event-level) that use the same keyword lists but different interfaces. Also contains `_is_posting_count_event()` in `polymarket.py` which is a third, separate classification path using different keywords. These could diverge silently.

---

## 7. Open Questions / Unknowns

### Q1. Does the NO-side strategy actually apply to bracket markets?
In a bracket event (e.g. "will Musk post 65-89 tweets"), exactly one bracket resolves YES and the rest resolve NO (worth $1). The signal engine's logic was designed for "will X happen by date?" binary markets. Whether the same thresholds and scoring apply to bracket markets is **unvalidated**. The score of 92 for a bracket with NO=0.835 may or may not represent real edge.

### Q2. What resolves bracket markets?
`resolutionSource` points to `https://x.com/elonmusk` or `https://truthsocial.com/@realDonaldTrump`. The actual counting is done by Polymarket's internal XTracker system. We have no programmatic access to resolution data. How and when do bracket markets resolve?

### Q3. Is the pagination depth (6000 events) sufficient?
Current pagination fetches up to 6000 events. It found 11 relevant events. If Polymarket adds more markets or if relevant events fall outside this window, they'll be missed. The pagination offset ordering is not documented — events could be sorted by creation date, popularity, or something else.

### Q4. What is the intended deployment model?
Currently: manual CLI execution. No scheduling, no cron, no containerization, no monitoring. If this is meant to run continuously, significant infrastructure is needed. If it's meant to be run manually, the multi-script pipeline (fetch → signals → papertrade → export) is cumbersome.

### Q5. Should the dashboard show bracket grouping or individual markets?
With 290 bracket markets across 11 events, flat rendering is unusable. But the dashboard has no MarketFamily concept. Design decision needed: group by event, show only high-signal brackets, or something else?

### Q6. Where is the source-of-truth for "current tweet count" during a market's active period?
The signal engine evaluates whether to bet NO on a bracket. But it doesn't know the current tweet count. Without count awareness, it's betting blind — relying only on market prices as proxy for probability. Is this intentional?

### Q7. How are `data/` files managed?
Each pipeline run creates new timestamped files. Nothing removes old ones. `data/` is gitignored. If the repo is cloned fresh, there is no data to drive signals/dashboard. Is there an expected bootstrapping process?

---

## 8. Recommended Review Order

For a second-pass reviewer picking up from here, review in this order:

1. **`scripts/run_signals.py`** — Understand the pipeline break. This is where the system fails to connect discovery to decision-making. Fix this first.

2. **`scripts/run_papertrade.py`** — Same issue. After signals work, this needs to open real paper trades.

3. **`polymarket_timer_bot/signals/engine.py`** — Review whether the scoring logic is appropriate for bracket markets, not just binary timer markets. This is the strategic core.

4. **`scripts/fetch_markets.py`** — Verify the discovery logic is correct and robust. Check error handling. Understand what it outputs and where.

5. **`polymarket_timer_bot/adapters/polymarket.py`** — Review API interaction quality. Check for `_is_posting_count_event()` vs classifier keyword drift. Check error handling on network failures.

6. **`polymarket_timer_bot/adapters/classifier.py`** — Verify dual-layer classification logic. Check for edge cases with the two overlapping classification systems.

7. **`dashboard/assets/app.js`** — Decide on bracket grouping UX. Review whether data model assumptions hold.

8. **`docs/PROJECT_BRIEF.md` + `README.md`** — Update to match reality. These are the first things a new contributor reads.

9. **`polymarket_timer_bot/analytics/`** — Decide whether to build this or remove the placeholder. Currently dead code.

10. **`tests/`** — Good unit coverage. Missing: integration tests for scripts, tests for `run_signals.py` / `run_papertrade.py` / `export_dashboard.py`, and tests for error paths in API calls.

---

## Appendix: File Inventory

### Python source (23 files)
```
polymarket_timer_bot/__init__.py          — 1-line comment
polymarket_timer_bot/adapters/__init__.py  — 1-line comment
polymarket_timer_bot/adapters/polymarket.py — API client + events (320 lines)
polymarket_timer_bot/adapters/classifier.py — Classification logic (155 lines)
polymarket_timer_bot/models/__init__.py    — 1-line comment
polymarket_timer_bot/models/market.py      — Market + MarketFamily (143 lines)
polymarket_timer_bot/signals/__init__.py   — 1-line comment
polymarket_timer_bot/signals/engine.py     — Signal engine (178 lines)
polymarket_timer_bot/papertrade/__init__.py — 1-line comment
polymarket_timer_bot/papertrade/models.py  — PaperTrade dataclass (98 lines)
polymarket_timer_bot/papertrade/ledger.py  — Ledger class (156 lines)
polymarket_timer_bot/analytics/__init__.py — 1-line comment (EMPTY)
polymarket_timer_bot/config/__init__.py    — Config loader (28 lines)
scripts/fetch_markets.py                   — Main pipeline (198 lines)
scripts/run_signals.py                     — Signal runner (107 lines) *** BROKEN ***
scripts/run_papertrade.py                  — Paper trade runner (97 lines) *** BROKEN ***
scripts/export_dashboard.py                — Dashboard exporter (52 lines)
tests/__init__.py                          — empty
tests/test_adapters.py                     — 25 tests (370 lines)
tests/test_models.py                       — 6 tests (91 lines)
tests/test_signals.py                      — 13 tests
tests/test_papertrade.py                   — 11 tests
tests/test_discovery.py                    — 11 tests (87 lines)
tests/test_analytics.py                    — 1 placeholder test
```

### Config / data
```
requirements.txt                          — just "requests>=2.28"
.gitignore                                — __pycache__, .pytest_cache, data/
polymarket_timer_bot/config/known_event_patterns.json — known slugs + series
```

### Dashboard
```
dashboard/index.html                      — 124 lines
dashboard/assets/style.css                — 523 lines
dashboard/assets/app.js                   — 363 lines
dashboard/data/markets.json               — exported (stale)
dashboard/data/relevant.json              — exported (stale)
dashboard/data/signals.json               — exported (empty)
dashboard/data/ledger.json                — exported (empty)
```

### Docs
```
README.md                                 — STALE
CLAUDE.md                                 — project instructions (not stale)
docs/PROJECT_BRIEF.md                     — STALE (contradicts implementation)
docs/DECISIONS.md                         — D001-D010, current
docs/OPEN_QUESTIONS.md                    — only Q004 remains
docs/TODO.md                              — current
docs/RUNBOOK.md                           — current
docs/SOURCE_HIERARCHY.md                  — current
reports/DAILY_STATUS.md                   — current
reports/EVALUATION.md                     — current
```
