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

_Not yet implemented. Will be added in Phase 3._
