# Runbook

How to run, test, and inspect the system.

## Prerequisites

- Python 3.10+
- No API keys required for v1 (Polymarket public API)
- No wallet or secrets needed

## How to run

```bash
# Install dependencies
pip install -r requirements.txt

# 1. Fetch markets (events-first discovery)
python scripts/fetch_markets.py
# Discovery priority:
#   1. Direct known URLs (from config/known_event_patterns.json)
#   2. Exact event slug lookup
#   3. Events pagination fallback (scans ~6000 events)
#   4. /markets supplemental fallback

# 2. Run signal analysis (reads from data/normalized/relevant_markets_*.json)
python scripts/run_signals.py

# 3. Open paper trades for TRADE signals
python scripts/run_papertrade.py

# 4. Resolve closed markets (checks winner status, updates P&L)
python scripts/resolve_trades.py

# 5. Export data for dashboard
python scripts/export_dashboard.py

# 6. View dashboard (one command)
python scripts/serve_dashboard.py
# Opens at http://localhost:8000 — exports data automatically first
# Custom port: python scripts/serve_dashboard.py 3000
# Skip export:  python scripts/serve_dashboard.py --no-export
```

## Pipeline data flow

```
fetch_markets.py
  → data/normalized/relevant_markets_*.json  (classified bracket markets with event context)
  → data/normalized/families_*.json          (MarketFamily groupings)

run_signals.py
  ← reads relevant_markets_*.json
  → data/signals/signals_*.json              (TRADE/WATCH/SKIP with scores)

run_papertrade.py
  ← reads relevant_markets_*.json
  → data/ledger/ledger.json                  (open trades with event context)

resolve_trades.py
  ← reads relevant_markets_*.json + ledger.json
  → updates ledger.json                      (closes trades: WON/LOST/EXPIRED)

export_dashboard.py
  ← reads latest from all data dirs
  → dashboard/data/*.json                    (for HTML dashboard)
```

## Known-slug registry

Static config at `polymarket_timer_bot/config/known_event_patterns.json`.

To add a new market:
1. Get the event URL from Polymarket (e.g. `https://polymarket.com/event/elon-musk-of-tweets-march-19-march-21`)
2. Add the URL to `direct_urls` and the slug to `exact_slugs`
3. Re-run `python scripts/fetch_markets.py`

The slug is the path segment after `/event/` in the URL.

## How to test

```bash
pip install pytest
python -m pytest tests/ -v
# Currently 78 tests (models, adapters, classifier, discovery, signals, papertrade, resolution)
```

## How to inspect outputs

After running the pipeline:

```bash
# List fetched market files (most recent first)
ls -t data/raw/
ls -t data/normalized/

# Show relevant markets from the latest fetch
python -c "
import json, glob
f = sorted(glob.glob('data/normalized/relevant_markets_*.json'))[-1]
for m in json.load(open(f)):
    print(m['bracket_label'], '|', m['question'][:70], '|', m.get('market_type', ''))
"

# View signal results
python -c "
import json, glob
f = sorted(glob.glob('data/signals/signals_*.json'))[-1]
for s in json.load(open(f)):
    print(s['signal'], s['score'], s['bracket_label'], s['question'][:50])
"

# View the paper-trade ledger
python -c "
import json
ledger = json.load(open('data/ledger/ledger.json'))
for t in ledger:
    label = t.get('bracket_label', '')
    print(t['status'], f'[{label}]', t['question'][:50], f'P&L={t.get(\"pnl\", \"open\")}')
"

# View dashboard data
ls dashboard/data/
```
