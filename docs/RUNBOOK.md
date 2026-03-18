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

# Fetch markets (events-first discovery)
python scripts/fetch_markets.py
# Discovery priority:
#   1. Direct known URLs (from config/known_event_patterns.json)
#   2. Exact event slug lookup
#   3. Events pagination fallback (scans ~6000 events)
#   4. /markets supplemental fallback

# Run signal analysis
python scripts/run_signals.py

# Execute paper trades (reads signals, opens trades, updates ledger)
python scripts/run_papertrade.py

# Export data for dashboard
python scripts/export_dashboard.py

# Then open dashboard/index.html in a browser
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
```

## How to inspect outputs

After running the pipeline:

```bash
# List fetched market files (most recent first)
ls -t data/raw/
ls -t data/normalized/

# Count markets in the latest fetch
python -c "import json, glob; f=sorted(glob.glob('data/normalized/all_markets_*.json'))[-1]; print(len(json.load(open(f))), 'markets in', f)"

# Show relevant (Musk/Trump) markets from the latest fetch
python -c "
import json, glob
f = sorted(glob.glob('data/normalized/relevant_markets_*.json'))[-1]
for m in json.load(open(f)):
    print(m['question'][:80], '|', m.get('market_type', ''))
"

# View signal results
python -c "
import json, glob
f = sorted(glob.glob('data/signals/signals_*.json'))[-1]
for s in json.load(open(f)):
    print(s['action'], s['score'], s['market']['question'][:60])
"

# View the paper-trade ledger
python -c "
import json
ledger = json.load(open('data/ledger/ledger.json'))
for t in ledger:
    print(t['status'], t['side'], t['question'][:60])
"

# View dashboard data
ls dashboard/data/
```
