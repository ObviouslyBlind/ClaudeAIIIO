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

### Where it broke (pre-fix)

All three markets were parseable, classifiable, and signal-compatible. The **only** break point was discovery: `fetch_markets.py` never called the `/events` endpoint.

---

## 6. Implementation Results (Post-Fix)

### Discovery fix implemented

Discovery now uses a 5-layer priority:
1. Direct known URLs → exact slug lookup
2. Exact event slugs from registry
3. Known slug pattern generation (future)
4. Events pagination fallback (client-side keyword filtering)
5. `/markets` supplemental

### Live validation (2026-03-18 10:24 UTC)

| Metric | Result |
|---|---|
| Events discovered | 11 |
| Relevant event families | 11 |
| Total bracket markets | 290 |
| Relevant bracket markets | 290 |
| TRADE signals | 10 |
| SKIP signals | 280 |
| Tests passing | 70/70 |

### Known market validation

| Market | Discovered? | Parsed? | Classified? | Grouped? | Signal? |
|---|---|---|---|---|---|
| Elon Musk # tweets Mar 19-21 | YES (direct slug) | YES (10 brackets) | musk_posting | YES (elon-tweets-48h) | Multiple SKIP (77h > 72h max) |
| Trump # Truth Social Mar 17-24 | YES (direct slug) | YES (11 brackets) | trump_posting | YES (trump-truth-social) | All SKIP (149h > 72h max) |
| Elon Musk # tweets Mar 6-13 | YES (pagination) | YES | musk_posting | YES | CLOSED (resolved) |

### Additional markets found via pagination

| Event | Series | Brackets | Status |
|---|---|---|---|
| Elon Musk # tweets March 2026 | elon-tweet-daily | 51 | Partially open |
| Elon Musk # tweets April 2026 | elon-tweet-daily | 66 | Open |
| Elon Musk # tweets Mar 17-24 | elon-tweets | 30 | Open |
| Elon Musk # tweets Mar 13-20 | elon-tweets | 30 | Open |
| Trump post this week Mar 16-22 | trump-post-weekly | 30 | Open |
| Elon Musk # tweets Mar 16-18 | elon-tweets-48h | 10 | Open (5.6h left) |
| Trump posts Mar 13-20 | trump-truth-social | 11 | Open |
| Trump posts Mar 20-27 | trump-truth-social | 11 | Open |
| Elon Musk # tweets Mar 20-27 | elon-tweets | 30 | Open |

### Top TRADE signals from live data

| Bracket | Event | NO | Expiry | Score |
|---|---|---|---|---|
| 90-114 | Musk tweets Mar 16-18 | 0.835 | 5.6h | 92 |
| 120-139 | Trump posts Mar 13-20 | 0.950 | 53.6h | 90 |
| 200-219 | Musk tweets Mar 13-20 | 0.938 | 53.6h | 88 |
| 300-319 | Musk tweets Mar 13-20 | 0.930 | 53.6h | 87 |
| 60-79 | Trump posts Mar 13-20 | 0.900 | 53.6h | 82 |

---

## 7. Confirmed vs Inconclusive vs Follow-Up (Post-Fix)

### Confirmed Working

- **Discovery:** 11 event families found via 5-layer discovery (2 from known slugs + 9 from pagination)
- **Event parsing:** All 290 bracket markets parsed with event metadata and group linkage
- **Classifier:** Dual-layer classification working (event-level + bracket validation, no disagreements)
- **Signal engine:** 10 TRADE signals, 280 SKIPs — correct behavior on real prices and expiries
- **Paper-trade ledger:** Integrity verified (previous evaluation still valid)
- **70 tests:** All passing (29 new + 41 existing)

### Confirmed Fixed

- **Discovery failure:** System now finds bracket/negRisk posting-count markets via `/events` endpoint
- **Classifier plural bug:** `\btweet\b` → `\btweets?\b`, `\bpost\b` → `\bposts?\b` (D010)
- **No event awareness:** `MarketFamily` + event fields preserve group structure

### Inconclusive (needs more runtime)

- Signal threshold calibration on real flow
- Paper-trade P&L tracking over time
- Dashboard display with real bracket data
- XTracker programmatic access

### Remaining Follow-Ups

1. **Q004 — Market resolution timing:** Trades still can't auto-resolve
2. **XTracker extraction:** Client-rendered, no public API found
3. **Slug pattern generation:** Auto-generate date-based slugs from series patterns
4. **External source integration:** trumpstruth.org, muskmeter.live for count cross-checks

---

## 8. Files Changed

| File | Change |
|---|---|
| `polymarket_timer_bot/models/market.py` | Added `MarketFamily`, event-aware fields to `Market` |
| `polymarket_timer_bot/adapters/polymarket.py` | Added events endpoint functions, URL extraction, event parsing |
| `polymarket_timer_bot/adapters/classifier.py` | Added dual-layer classification, fixed plural regex |
| `polymarket_timer_bot/config/__init__.py` | New — config loader |
| `polymarket_timer_bot/config/known_event_patterns.json` | New — known slug registry |
| `scripts/fetch_markets.py` | Rewritten for events-first discovery |
| `docs/SOURCE_HIERARCHY.md` | New — source hierarchy documentation |
| `docs/DECISIONS.md` | Added D007-D010 |
| `docs/RUNBOOK.md` | Updated with events discovery workflow |
| `docs/TODO.md` | Marked discovery fix complete |
| `reports/DAILY_STATUS.md` | Updated with implementation results |
| `tests/test_adapters.py` | Added 18 new tests |
| `tests/test_discovery.py` | New — 11 discovery integration tests |

### Not changed

- `signals/engine.py` — signal logic correct, no changes needed
- `papertrade/` — paper-trade system correct
- `dashboard/` — no dashboard changes
- Existing tests — all preserved, no modifications

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
