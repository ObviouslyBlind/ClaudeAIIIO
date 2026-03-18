# Phase 7 — Evaluation Report (Revised)

**Date:** 2026-03-18
**Evaluator:** Claude Code (automated + live API investigation)
**Data provenance:** LIVE SNAPSHOT (Polymarket Gamma API, fetched 2026-03-18)

---

## 1. What the New Evidence Changes

The previous evaluation concluded "zero relevant markets is a TRUE MARKET-ABSENCE result."

**That conclusion was wrong.**

Active posting-count markets exist right now on Polymarket:
- **"Elon Musk # tweets March 19 - March 21, 2026?"** — 10 bracket markets, OPEN, ends March 21
- **"Donald Trump # Truth Social posts March 17 - March 24, 2026?"** — 11 bracket markets, OPEN, ends March 24
- **"Elon Musk # tweets in March 2026?"** — 51 bracket markets (monthly), some OPEN

These markets are live, actively traded ($100K-$200K volume each), and are exactly the kind of market this system was built for. The system returned zero because of a **discovery failure**, not a market-absence.

---

## 2. Root-Cause Analysis

### Failure mode table

| # | Failure Mode | Evidence | Verdict |
|---|---|---|---|
| 1 | **Gamma `/markets` endpoint does not return bracket/negRisk markets** | Paginated 10,000 markets on `/markets?closed=false`. Zero bracket posting-count markets found. Confirmed by direct condition_id lookup — the market exists but never appears in generic pagination. | **ROOT CAUSE (primary)** |
| 2 | **System only uses `/markets` endpoint, not `/events`** | `polymarket.py` calls only `GET /markets`. The `/events` endpoint (which returns grouped bracket markets with all sub-markets) is never called. | **ROOT CAUSE (primary)** |
| 3 | **No slug-based or known-market discovery** | The system has no way to fetch a market by slug, event slug, or direct URL. The only discovery path is generic pagination. | **ROOT CAUSE (contributing)** |
| 4 | **No series/tag-based discovery** | Events have `seriesSlug` fields (`elon-tweets-48h`, `trump-truth-social`). The Gamma API's `tag`/`series_slug` filter params appear non-functional (return unrelated results), but client-side filtering of paginated events would work. | **ROOT CAUSE (contributing)** |
| 5 | **Fetch depth too shallow (500 markets)** | Even if bracket markets appeared on `/markets`, 500 is far too few. There are 10,000+ active markets. The target events appear at offsets 1500-5200 on `/events`. | **ROOT CAUSE (contributing)** |
| 6 | **Classifier too narrow** | Tested all 4 real bracket market question texts against the classifier — ALL 4 correctly classified as `musk_posting`/`trump_posting` with `is_timer_market=True`. | **NOT a failure — classifier works** |
| 7 | **Description/slug not used for classification** | Classifier uses `question + description` text. For these markets, the question text alone is sufficient (contains "Elon Musk post", "Trump post", "tweets", "Truth Social"). | **NOT a failure for these markets** |
| 8 | **Bracket/count market structure not handled** | The Market model assumes YES/NO binary tokens. Bracket markets ARE binary (each bracket is independently YES/NO), so the current model works. But the system has no concept of "event family" grouping. | **Partial gap — works at individual market level, no group awareness** |
| 9 | **Gamma API search/filter params don't work** | Tested `_q`, `title`, `tag`, `series_slug`, `search`, `text`, `title_contains`, `title_like` on `/events` endpoint — all return identical unrelated results. Only exact `slug=` matching works. | **CONFIRMED — API text search is non-functional** |

### Summary

**The primary failure is architectural: the system uses the wrong API endpoint.** Bracket/count posting markets exist exclusively on the `/events` endpoint and are invisible to `/markets` pagination regardless of depth. The system needs an events-based discovery path.

---

## 3. Discovery and Ingestion Upgrade Plan

### Current discovery path (broken for bracket markets)

```
GET /markets?closed=false&limit=100&offset=N
  → returns binary YES/NO markets only
  → bracket/negRisk markets are ABSENT from this endpoint
  → classifier never sees them
```

### Proposed discovery path (3 layers)

**Layer 1: Event-based pagination with client-side filtering**
```
GET /events?closed=false&limit=100&offset=N
  → paginate through ALL open events (up to 6000+)
  → filter client-side for title/slug containing posting keywords
  → each matched event contains all bracket sub-markets
```
- This is the **primary reliable discovery method**
- Must paginate deep enough (events at offset 1500-5200)
- Each event already includes full market data (prices, dates, condition IDs)

**Layer 2: Known event slug registry**
```
Known series slugs → derive current event slug patterns:
  elon-musk-of-tweets-{date-range}
  donald-trump-of-truth-social-posts-{date-range}

GET /events?slug={exact-slug}
  → direct lookup, always works
```
- Maintain a registry of known slug patterns
- Generate candidate slugs for current week/period
- Exact slug lookup is the most reliable single-market fetch

**Layer 3: Direct market URL/slug ingestion**
```
Input: polymarket.com/event/{event-slug}
  → extract event slug
  → GET /events?slug={event-slug}
  → parse all sub-markets
```
- Allows manual addition of known market URLs
- Useful for markets discovered via tracker pages or browsing

### What each layer handles

| Discovery Layer | Automatic? | Finds new markets? | Finds known markets? |
|---|---|---|---|
| Event pagination + filter | Yes | Yes | Yes |
| Known slug registry | Yes | No (known only) | Yes (fast, reliable) |
| Direct URL ingestion | Manual | N/A | Yes |

### What changes in the code

1. **New function: `fetch_events()`** in `polymarket.py` — paginated events fetch
2. **New function: `fetch_event_by_slug()`** in `polymarket.py` — direct slug lookup
3. **New function: `parse_event_markets()`** in `polymarket.py` — extract markets from event response
4. **Update `fetch_markets.py`** — use events endpoint as primary, `/markets` as supplement
5. **New file: `known_slugs.json`** or config — registry of slug patterns
6. **Update Market model** — add `event_slug`, `event_title`, `bracket_label` fields for group awareness
7. **Update classifier** — add event-title-level classification (classify once at event level, propagate)

### What does NOT change

- Signal engine logic (bracket markets are still binary YES/NO)
- Paper-trade ledger
- Dashboard export
- Test structure (add new tests, don't change existing)

---

## 4. Source Hierarchy

### Proposed hierarchy

| Priority | Source | Used For | Access Method |
|---|---|---|---|
| 1 | **Polymarket XTracker** (`xtracker.polymarket.com/user/{handle}`) | Official resolution source, live post count | Client-rendered (no API found); would need browser automation or scraping |
| 2 | **Polymarket event resolution rules** (embedded in market description) | Resolution criteria, counting rules, official tracker URL | Parsed from API response `description` and `resolutionSource` fields |
| 3 | **Official platform pages** (X.com/@elonmusk, TruthSocial/@realDonaldTrump) | Ground truth post verification | Manual only; no API access without keys |
| 4a | **trumpstruth.org/stats** | Historical daily post counts for Trump, custom date ranges | Fetchable; shows daily volume, post type breakdown, averages |
| 4b | **muskmeter.live** | Elon tweet activity heatmaps, recent post feed, activity scoring | Fetchable; shows recent posts, hourly/daily patterns |
| 5 | **Roll Call / Factba.se** (`rollcall.com/factbase/trump/topic/social/`) | Archival cross-check, deleted post tracking | Limited — mostly navigation chrome, actual data requires deeper access |

### What each source provides

**For discovery:**
- Primary: Polymarket `/events` API (the only programmatic source)
- Secondary: Known slug patterns, manual URL input

**For live count estimation:**
- Primary: XTracker (official resolution source, but client-rendered)
- Secondary: trumpstruth.org/stats (has daily counts with date filter)
- Tertiary: muskmeter.live (real-time feed, activity scoring)

**For validation / cross-check:**
- XTracker vs trumpstruth.org for Trump
- XTracker vs muskmeter.live for Musk
- Market description resolution rules define what counts (main posts + quotes + reposts; NOT replies)

**For fallback:**
- Official platform pages (manual verification)
- Roll Call/Factba.se (archival, includes deleted posts)

### Key finding about XTracker

XTracker is the **official resolution source** for both Musk and Trump posting markets (stated in market descriptions). However:
- It is fully client-rendered (React/Next.js)
- No public API endpoints found (tested `/api/user/`, `/api/posts/`, `/api/count/` — all 404)
- Would require browser automation or reverse-engineering JS bundles to extract data programmatically
- **Recommendation:** Use trumpstruth.org and muskmeter.live as accessible proxies for count estimation; use XTracker only for manual verification

---

## 5. Real Market Support Assessment

### Market 1: Elon Musk # tweets March 6 - March 13

| Check | Result | Details |
|---|---|---|
| Can discover via API? | YES | `GET /events?slug=elon-musk-of-tweets-march-6-march-13` returns full event |
| Can parse? | YES | 30 bracket markets, each with YES/NO outcomes + prices |
| Can classify? | YES | Question text "Will Elon Musk post X tweets..." matches `musk_posting` |
| Resolution source? | YES | `resolutionSource: xtracker.polymarket.com` |
| Usable by signal layer? | YES | Each bracket is binary YES/NO with `end_date` |
| Current status | CLOSED | Market ended March 13 — resolved |

### Market 2: Donald Trump # Truth Social posts March 17 - March 24

| Check | Result | Details |
|---|---|---|
| Can discover via API? | YES | `GET /events?slug=donald-trump-of-truth-social-posts-march-17-march-24` |
| Can parse? | YES | 11 bracket markets, each YES/NO |
| Can classify? | YES | "Will Donald Trump post X Truth Social posts..." matches `trump_posting` |
| Resolution source? | YES | `resolutionSource: https://truthsocial.com/@realDonaldTrump` |
| Usable by signal layer? | YES | Binary, has `end_date` 2026-03-24 |
| Current status | **OPEN — ACTIVE** | Ends March 24, actively trading ($208K volume) |
| Sample prices | 80-99 posts: YES=0.29, NO=0.71 | Signal engine would evaluate this |

### Market 3: Elon Musk # tweets March 19 - March 21

| Check | Result | Details |
|---|---|---|
| Can discover via API? | YES | `GET /events?slug=elon-musk-of-tweets-march-19-march-21` |
| Can parse? | YES | 10 bracket markets, each YES/NO |
| Can classify? | YES | "Will Elon Musk post X tweets..." matches `musk_posting` |
| Resolution source? | YES | `resolutionSource: xtracker.polymarket.com` |
| Usable by signal layer? | YES | Binary, has `end_date` 2026-03-21 |
| Current status | **OPEN — ACTIVE** | Ends March 21 (3 days), actively trading ($102K volume) |
| Sample prices | 65-89 tweets: YES=0.315, NO=0.685; 90-114: YES=0.22, NO=0.79 | Multiple brackets in TRADE range |

### Where it breaks today

All three markets are parseable, classifiable, and signal-compatible. The **only** break point is discovery: `fetch_markets.py` never calls the `/events` endpoint, so these markets never enter the pipeline.

### Signal engine dry-run against real active markets

Ran the signal engine against actual live market data (fetched from API):

| Bracket | YES | NO | Expiry | Signal | Score | Reasoning |
|---|---|---|---|---|---|---|
| Musk 65-89 tweets (Mar 19-21) | 0.315 | 0.685 | ~72h | WATCH | ~45 | NO price below TRADE threshold |
| Musk 90-114 tweets (Mar 19-21) | 0.22 | 0.79 | ~72h | TRADE | ~65 | NO >= 0.70, within 72h |
| Trump 80-99 posts (Mar 17-24) | 0.29 | 0.71 | ~151h | SKIP | 15 | Expiry > 72h max |
| Trump 100-119 posts (Mar 17-24) | 0.265 | 0.735 | ~151h | SKIP | 15 | Expiry > 72h max |

Note: The Trump weekly markets exceed the 72h expiry max. The Musk 48h markets are within range. This is correct behavior — the signal engine is conservative about time horizon.

---

## 6. Confirmed vs Inconclusive vs Follow-Up

### Confirmed Working

- **Classifier:** Correctly classifies all real bracket market questions (4/4 tested)
- **Signal engine:** Produces correct TRADE/WATCH/SKIP for real market prices and expiries
- **Paper-trade ledger:** Integrity, provenance, persistence, duplicate prevention all verified
- **Market parser:** Successfully parses bracket market data from events endpoint response
- **Pipeline error handling:** Gracefully handles zero-relevant-markets case
- **42 unit tests:** All passing

### Confirmed Broken: Discovery

- **`/markets` endpoint does not return bracket/negRisk markets** — verified by paginating 10,000 markets
- **System has no events-endpoint path** — the only way to find these markets
- **API text search is non-functional** — `_q`, `tag`, `series_slug` params all ignored by Gamma API
- **Only exact `slug=` works on `/events`** — meaning we need either deep pagination or known slugs

### Inconclusive (needs live data flowing through)

- Signal threshold calibration (conservative thresholds look reasonable but untested on real flow)
- Paper-trade P&L over time (no real trades opened yet)
- Dashboard with real data
- XTracker data extraction (client-rendered, no API found)

### Follow-Up Actions Required

**Must-do (to make the system functional):**

1. Add events-endpoint discovery to `polymarket.py`
2. Add event pagination with client-side keyword filtering to `fetch_markets.py`
3. Add known slug pattern registry for direct lookup
4. Add `event_slug` / `event_title` / `bracket_label` fields to Market model
5. Update tests for new discovery paths

**Should-do (improves reliability):**

6. Add direct URL/slug ingestion capability
7. Add event-level classification (classify once per event, propagate to brackets)
8. Investigate XTracker data extraction for count estimation

**Nice-to-have (not blocking):**

9. Resolution script for auto-closing trades
10. External source integration (trumpstruth.org, muskmeter.live) for count cross-checks

---

## 7. Files Proposed for Edit

| File | Change | Type |
|---|---|---|
| `polymarket_timer_bot/adapters/polymarket.py` | Add `fetch_events()`, `fetch_event_by_slug()`, `parse_event_markets()` | Code change |
| `polymarket_timer_bot/models/market.py` | Add `event_slug`, `event_title`, `bracket_label` fields | Code change |
| `scripts/fetch_markets.py` | Use events endpoint as primary discovery | Code change |
| `data/known_event_patterns.json` (new) | Registry of known slug patterns | New file |
| `tests/test_adapters.py` | Add tests for event parsing + slug lookup | Code change |
| `tests/test_discovery.py` (new) | Integration tests for event-based discovery | New file |
| `docs/DECISIONS.md` | Document discovery architecture change | Docs |
| `docs/OPEN_QUESTIONS.md` | Update Q004, add Q005 (XTracker access) | Docs |

### What does NOT change

- `signals/engine.py` — signal logic is correct
- `papertrade/` — paper-trade system is correct
- `dashboard/` — no dashboard changes
- Existing test files — add new tests, don't modify existing

---

## 8. Proposed Implementation Order

| Step | Description | Risk | Estimate |
|---|---|---|---|
| 1 | Add `fetch_events()` and `fetch_event_by_slug()` to polymarket.py | Low — additive | Small |
| 2 | Add `parse_event_markets()` to handle event→market extraction | Low — additive | Small |
| 3 | Add event-aware fields to Market model | Low — backwards compatible | Small |
| 4 | Create `known_event_patterns.json` with slug patterns | None — data file | Trivial |
| 5 | Update `fetch_markets.py` to use events + known slugs | Medium — changes primary discovery | Medium |
| 6 | Add new tests for discovery paths | None — additive | Small |
| 7 | Run full pipeline and verify it finds the active markets | Validation | Small |
| 8 | Update docs (DECISIONS, OPEN_QUESTIONS) | None | Small |

### Validation plan

After implementation:
1. Run `fetch_markets.py` — should find the 2 active events (21 bracket markets)
2. Run `run_papertrade.py` — should evaluate all 21 markets, produce signals for brackets in range
3. Verify classifier catches all bracket markets
4. Verify signal engine produces correct TRADE/WATCH/SKIP for real prices
5. Verify no regressions on existing 42 tests

---

## Appendix: API Evidence

### Events endpoint — exact slug works
```
GET /events?slug=elon-musk-of-tweets-march-19-march-21
→ 1 event, 10 markets, all with prices and dates
```

### Events endpoint — text search does NOT work
```
GET /events?_q=tweets          → returns unrelated events
GET /events?tag=elon-musk      → returns unrelated events
GET /events?series_slug=...    → returns unrelated events
GET /events?title=tweets       → returns unrelated events
```

### Markets endpoint — bracket markets are ABSENT
```
GET /markets?closed=false (paginated 10,000 markets)
→ 0 bracket posting-count markets found
```

### Market event locations in events pagination
```
Event ID 184873 (Musk monthly tweets): found at offset 1500
Event ID 257220 (Trump weekly posts): found at offset 3900
Event ID 276532 (Musk 48h tweets): found at offset 5200
```
