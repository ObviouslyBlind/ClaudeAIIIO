# Source Hierarchy

Strict source hierarchy for market discovery, count validation, and cross-checking.

## Discovery Sources

| Priority | Source | Method |
|---|---|---|
| 1 | Direct known URLs | `config/known_event_patterns.json` → `extract_slug_from_url()` → `fetch_event_by_slug()` |
| 2 | Exact event slugs | `config/known_event_patterns.json` → `fetch_events_by_slugs()` |
| 3 | Known slug pattern generation | Series patterns + date generation (future) |
| 4 | Events pagination (fallback) | `fetch_events_paginated()` with client-side keyword filtering |
| 5 | `/markets` endpoint (supplemental) | `fetch_all_active_markets()` — does not return bracket/negRisk markets |

## Count Validation Sources

| Priority | Source | URL | Used For |
|---|---|---|---|
| 1 | Polymarket event resolution rules | Embedded in market `description` and `resolutionSource` fields | Official counting rules, what counts as a post |
| 2 | Polymarket XTracker | `xtracker.polymarket.com/user/{handle}` | Official resolution source; client-rendered, no public API |
| 3 | Official platform (X / Truth Social) | `x.com/@elonmusk`, `truthsocial.com/@realDonaldTrump` | Ground truth post verification |

## Cross-Check / Fallback Sources

| Source | URL | Provides | Limitations |
|---|---|---|---|
| MuskMeter | `muskmeter.live` | Elon tweet activity heatmaps, recent post feed, activity scoring | No structured API; web scraping only |
| Trump's Truth | `trumpstruth.org` | Trump Truth Social post archive, daily counts | Historical archive |
| Roll Call / Factba.se | `rollcall.com/factbase/trump/topic/social/` | Complete archive including deleted posts | Requires deeper navigation for counts |

## What Each Source Is For

- **Discovery:** Polymarket API only (events endpoint, known slugs, pagination)
- **Live count estimation:** XTracker (primary), trumpstruth.org / muskmeter.live (accessible proxies)
- **Validation:** Official platform pages, XTracker, resolution rules in market description
- **Fallback / cross-check:** Roll Call, MuskMeter, Trump's Truth — archival/historical only

## Key Constraint

XTracker is the official resolution source but is fully client-rendered (no public API found). For programmatic count estimation, use trumpstruth.org (Trump) and muskmeter.live (Musk) as accessible proxies. Use XTracker for manual verification only.
