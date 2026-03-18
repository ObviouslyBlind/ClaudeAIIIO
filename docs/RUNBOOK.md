# Runbook

How to run, test, and inspect the system. Will be filled in as we build each phase.

## Prerequisites

- Python 3.10+ (planned)
- No API keys required for v1 (Polymarket public API)
- No wallet or secrets needed

## How to run

```bash
# Install dependencies
pip install -r requirements.txt

# Fetch markets (placeholder — Phase 3)
python scripts/fetch_markets.py

# Run signal analysis (placeholder — Phase 4)
python scripts/run_signals.py

# Execute paper trades (placeholder — Phase 5)
python scripts/run_papertrade.py
```

## How to test

```bash
pip install pytest
python -m pytest tests/ -v
```

## How to inspect outputs

After running `python scripts/fetch_markets.py`:

- **Raw data:** `data/raw/markets_YYYYMMDD_HHMMSS.json` — unmodified API response
- **All markets:** `data/normalized/all_markets_YYYYMMDD_HHMMSS.json` — parsed with classification
- **Relevant only:** `data/normalized/relevant_markets_YYYYMMDD_HHMMSS.json` — Musk/Trump posting markets

Quick inspection:
```bash
# Count markets
python -c "import json; d=json.load(open('data/normalized/all_markets_YYYYMMDD_HHMMSS.json')); print(len(d))"

# Find Trump/Musk markets
python -c "
import json
with open('data/normalized/all_markets_YYYYMMDD_HHMMSS.json') as f:
    for m in json.load(f):
        q = m['question'].lower()
        if 'trump' in q or 'musk' in q or 'elon' in q:
            print(m['question'][:80], '|', m['market_type'])
"
```
