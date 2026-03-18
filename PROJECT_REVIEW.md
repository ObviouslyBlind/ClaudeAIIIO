# PROJECT REVIEW — Full Codebase Audit

**Date:** 2026-03-18 (revised)
**Reviewer:** Claude Code (automated, based on full file read of every source file)
**Purpose:** Enable a second-pass reviewer (ChatGPT or human) to immediately understand what exists, what works, what is incomplete, and what to do next.

---

## 1. Project Snapshot

### What it does
A paper-trading system that monitors Polymarket prediction markets about Elon Musk tweets and Donald Trump Truth Social posts. It evaluates NO-side betting opportunities on bracket/count markets using rule-based signals with configurable risk profiles. No real money. No wallet integration.

### Main components

| Directory | Purpose | Status |
|---|---|---|
| `polymarket_timer_bot/adapters/` | API client + dual-layer classifier | **Functional** |
| `polymarket_timer_bot/models/` | Market + MarketFamily dataclasses | **Functional** |
| `polymarket_timer_bot/signals/` | Parameterized rule-based signal engine | **Functional** |
| `polymarket_timer_bot/papertrade/` | Trade models + JSON ledger | **Functional** |
| `polymarket_timer_bot/config/` | Known event slug registry | **Functional** |
| `polymarket_timer_bot/runs.py` | Durable run attribution and history | **Functional** |
| `polymarket_timer_bot/analytics/` | Empty placeholder | **Not implemented** |
| `scripts/` | Pipeline scripts (fetch, signals, papertrade, resolve, export, serve) | **Functional** |
| `dashboard/` | Static HTML/CSS/JS viewer with comparative run history | **Functional** |
| `tests/` | 95 tests, all passing | **Good coverage** |
| `docs/` | Project docs, decisions, runbook | **Current** |

---

## 2. Pipeline Flow (verified)

```
fetch_markets.py
  → Events-first discovery (known URLs → exact slugs → pagination fallback)
  → Supplemental /markets merge
  → data/normalized/relevant_markets_*.json  (bracket markets with event context)
  → data/normalized/families_*.json          (MarketFamily groupings)

run_signals.py --profile <X>
  ← reads data/normalized/relevant_markets_*.json
  → data/signals/signals_*_<X>.json          (TRADE/WATCH/SKIP with attribution)
  → data/runs/index.json                     (run history entry)

run_papertrade.py --profile <X>
  ← reads data/normalized/relevant_markets_*.json
  → data/ledger/ledger_no_side_<X>.json      (per-profile trades)
  → updates data/runs/index.json             (trade counts, P&L)

resolve_trades.py
  ← reads data/normalized/relevant_markets_*.json + all ledger_*.json
  → updates ledger files (WON/LOST/EXPIRED)
  → updates data/runs/index.json             (resolution stats)

export_dashboard.py → dashboard/data/*.json + meta.json
serve_dashboard.py  → localhost:8000 (auto-exports first)
```

**Key fact:** `run_signals.py` and `run_papertrade.py` read from `data/normalized/relevant_markets_*.json` — the events-based output. This is correct. Bracket markets discovered by `fetch_markets.py` DO reach the signal engine and paper-trade ledger.

---

## 3. What Is Verified Working

### Market ingestion
- 5-layer event discovery: direct URLs → exact slugs → (future) patterns → events pagination → /markets fallback
- Event parsing into `MarketFamily` with bracket `Market` children
- Dual-layer classification (event-title primary, bracket-question validation)
- Event metadata propagated: `event_slug`, `bracket_label`, `event_title`, `neg_risk_market_id`, `resolution_source`

### Signal engine
- Three-tier output: TRADE / WATCH / SKIP with 0-100 scoring
- Parameterized by `StrategyConfig` (strategy + profile)
- Hard SKIP filters: closed, inactive, wrong type, price out of range, mixed evidence, too far out
- 3 built-in profiles: conservative, moderate, aggressive

### Paper trading
- `PaperTrade` dataclass with entry/exit, P&L calculation, provenance tagging
- `Ledger` class: JSON-file-backed, open/close trades, duplicate prevention, summary stats
- Per-profile ledgers (each strategy+profile gets its own file)

### Trade resolution
- `resolve_trades.py` checks market closed/winner status from latest market data
- States: OPEN → WON / LOST / EXPIRED / CANCELLED
- Resolves across ALL ledger files
- Updates run records with resolution stats

### Run history
- `RunRecord` captures: run_id, strategy_id, strategy_version, profile_id, input_snapshot, timestamps, all metrics
- `RunStore` with index.json + individual run files
- Updated by signals, papertrade, and resolution stages

### Dashboard
- Static HTML + vanilla JS + CSS
- 5 tabs: overview, signal output, trade ledger, run history, all markets
- LoadState enum: LOADING / LOADED / EMPTY / FAILED — distinguishes error from empty
- Freshness from source metadata (meta.json), not browser clock
- escapeHtml() throughout
- Per-profile ledger comparison table when multiple profiles exist
- "SIMULATED" / "PAPER TRADING" badges throughout

### Testing
- 95 tests passing (models, adapters, classifier, discovery, signals, strategy, papertrade, resolution, runs)
- Covers: Market model, Token, serialization roundtrip, classifier regex, dual-layer classification, event parsing, URL extraction, signal thresholds for all profiles, P&L calculation, ledger CRUD, resolution logic, run store save/update/load

---

## 4. Known Weaknesses / Limitations

### Strategic uncertainty (unresolved)

**W1. Does the NO-side strategy actually apply well to bracket markets?**
In a bracket event, exactly one bracket resolves YES and the rest resolve NO ($1). The signal engine's scoring was designed for binary timer markets. Whether the thresholds produce real edge on bracket markets is **unvalidated**. Needs comparative testing with real resolution data.

**W2. No current tweet/post count awareness.**
The engine evaluates based on market prices as probability proxy. It doesn't know the current tweet count. This is intentional for v1 but limits signal quality.

### Technical limitations

**W3. Events pagination is slow (~14s for 6000 events).** No caching between runs.

**W4. No automated scheduling.** Manual CLI execution only. The 6-script pipeline works but is cumbersome for frequent testing.

**W5. `find_latest_file()` is duplicated across scripts.** Should be extracted to a shared utility.

**W6. `sys.path.insert(0, ...)` hack in every script.** Should use `pyproject.toml` with editable install.

**W7. `datetime.utcnow()` deprecated in Python 3.12+.** Not breaking yet but will warn in future versions.

**W8. `analytics/` module is empty.** Placeholder only. No performance analysis code.

**W9. No rate limiting or retry on API calls.** Events pagination makes 60 rapid sequential requests.

**W10. Data files grow unbounded.** Each run creates new timestamped files. Nothing cleans up old ones.

---

## 5. Open Questions Requiring Human Judgment

See [docs/OPEN_QUESTIONS.md](docs/OPEN_QUESTIONS.md) for full list. Key ones:

- **Q005:** Does the NO-side strategy apply correctly to bracket markets? (needs real resolution data)
- **Q006:** Is price-only sufficient, or do we need tweet count estimation?
- **Q007:** What is the intended deployment model? (manual CLI vs scheduled vs continuous)
- **Q010:** What strategies beyond no_side should be tested?

---

## 6. Recommended Review Order

1. **`scripts/fetch_markets.py`** — The discovery pipeline. Verify it finds the markets you expect.
2. **`polymarket_timer_bot/signals/engine.py`** — The decision-making core. Review whether scoring logic is appropriate for bracket markets.
3. **`polymarket_timer_bot/signals/strategy.py`** — Profile thresholds. Are conservative/moderate/aggressive calibrated well?
4. **`scripts/resolve_trades.py`** — Resolution logic. Check WON/LOST/EXPIRED assignment.
5. **`dashboard/assets/app.js`** — User-facing output. Check for data model assumptions.
6. **`polymarket_timer_bot/adapters/classifier.py`** — Dual-layer classification. Check for edge cases.

---

## 7. File Inventory

### Python source
```
polymarket_timer_bot/adapters/polymarket.py  — API client + events endpoint (328 lines)
polymarket_timer_bot/adapters/classifier.py  — Dual-layer classification (159 lines)
polymarket_timer_bot/models/market.py        — Market + MarketFamily dataclasses (185 lines)
polymarket_timer_bot/signals/engine.py       — Parameterized signal engine (203 lines)
polymarket_timer_bot/signals/strategy.py     — Strategy/Profile definitions (129 lines)
polymarket_timer_bot/papertrade/models.py    — PaperTrade dataclass (109 lines)
polymarket_timer_bot/papertrade/ledger.py    — Ledger class (159 lines)
polymarket_timer_bot/runs.py                 — RunRecord + RunStore (170 lines)
polymarket_timer_bot/config/__init__.py      — Config loader (29 lines)
polymarket_timer_bot/analytics/__init__.py   — Empty placeholder
scripts/fetch_markets.py                     — Market discovery + classification (197 lines)
scripts/run_signals.py                       — Signal evaluation (164 lines)
scripts/run_papertrade.py                    — Paper trade opening (151 lines)
scripts/resolve_trades.py                    — Trade resolution (170 lines)
scripts/export_dashboard.py                  — Dashboard data exporter (149 lines)
scripts/serve_dashboard.py                   — One-command dashboard server (55 lines)
```

### Tests (95 passing)
```
tests/test_models.py       — 6 tests
tests/test_adapters.py     — 25 tests
tests/test_discovery.py    — 11 tests
tests/test_signals.py      — 16 tests
tests/test_strategy.py     — 11 tests
tests/test_papertrade.py   — 11 tests
tests/test_resolution.py   — 5 tests
tests/test_runs.py         — 6 tests
tests/test_analytics.py    — 1 placeholder
```

### Dashboard
```
dashboard/index.html           — 5-tab layout
dashboard/assets/style.css     — Dark theme (SENTINEL — Glint Terminal)
dashboard/assets/app.js        — Data loading + rendering with LoadState/escapeHtml
dashboard/data/*.json          — Exported pipeline outputs (generated by export_dashboard.py)
```

### Docs
```
README.md                      — Quick start, architecture overview
CLAUDE.md                      — Project instructions for Claude Code
PROJECT_REVIEW.md              — This file
docs/PROJECT_BRIEF.md          — What we're building and why
docs/DECISIONS.md              — Architecture decisions log
docs/OPEN_QUESTIONS.md         — Questions needing human judgment
docs/TODO.md                   — Completed and pending tasks
docs/RUNBOOK.md                — How to run, test, and inspect
docs/SOURCE_HIERARCHY.md       — Data source priority
reports/DAILY_STATUS.md        — Status snapshots
reports/EVALUATION.md          — Phase 7 evaluation
```
