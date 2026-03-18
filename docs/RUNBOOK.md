# Runbook

How to run, test, and inspect the system.

## Live dashboard (public URL)

**https://obviouslyblind.github.io/ClaudeAIIIO/**

The dashboard is hosted on GitHub Pages. It updates automatically within about
1 minute every time code is pushed to the `main` branch.

### Viewing the dashboard

Just open the link above in any browser. No login, no setup.

### Updating the data (what you need to do after running the pipeline)

After you run the pipeline locally:

```bash
python scripts/fetch_markets.py       # get latest markets
python scripts/run_signals.py         # analyze them
python scripts/run_papertrade.py      # open paper trades
python scripts/resolve_trades.py      # close any finished trades
python scripts/export_dashboard.py    # copy data into dashboard/data/
```

Then commit and push the updated data files:

```bash
git add dashboard/data/
git commit -m "Update dashboard data"
git push
```

GitHub will automatically re-deploy the dashboard within ~1 minute.
The dashboard auto-refreshes every 60 seconds in the browser (with cache busting),
so new data will appear without a manual page reload.

### If the dashboard looks wrong or outdated

1. Check https://github.com/ObviouslyBlind/ClaudeAIIIO/actions — look for the
   "Deploy Dashboard to GitHub Pages" workflow. If it shows a red X, something
   went wrong. Click it to see the error.
2. To trigger a fresh deploy manually: go to the Actions tab → "Deploy Dashboard
   to GitHub Pages" → click "Run workflow".
3. If `dashboard/data/` files look empty, re-run `export_dashboard.py` and push.

### First-time setup note

GitHub Pages must be enabled in the repository settings once:
Settings → Pages → Source: Deploy from a branch → Branch: `gh-pages` → Save.
After that, the workflow handles everything automatically.

---

## Automated pipeline

The pipeline runs automatically via GitHub Actions every 6 hours (00:00, 06:00, 12:00, 18:00 UTC).

**What it does:**
1. Fetches latest markets from Polymarket
2. Runs signals for all 3 profiles (conservative, moderate, aggressive)
3. Opens paper trades for all 3 profiles
4. Resolves any closed trades
5. Generates evaluation summary
6. Exports dashboard data
7. Commits and pushes updated data to main
8. Dashboard auto-deploys via GitHub Pages within ~1 minute

**Manual trigger:** Go to Actions tab → "Automated Pipeline" → "Run workflow".

**Local manual run:**
```bash
./scripts/run_pipeline.sh              # full pipeline
./scripts/run_pipeline.sh --no-fetch   # skip fetch, reuse latest data
```

### Alerting

Four alert conditions are checked each pipeline run:

| Condition | Level | Meaning |
|---|---|---|
| Zero relevant markets found | WARNING | Fetch may have failed or no Musk/Trump markets are active |
| Open trades exist | INFO | Confirms the system is actively trading |
| Trades resolved | INFO | Shows wins/losses from closed markets |
| Zero signals evaluated | WARNING | Pipeline may have no input data |

Three delivery channels:

1. **Dashboard Evaluation tab** — alert banners rendered at top, auto-refreshes every 60s
2. **`reports/pipeline_report.json`** — machine-readable per-step status
3. **GitHub Actions** — job summary with full evaluation data; email on workflow failure (Settings → Notifications)

To check pipeline health:
- Dashboard Evaluation tab shows alerts, breakdowns, and pipeline status
- `https://github.com/ObviouslyBlind/ClaudeAIIIO/actions` shows all runs
- `reports/pipeline_report.json` has machine-readable step results
- `reports/evaluation_summary.json` has full summary with alerts

---

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
#   4. /markets supplemental fallback (merged before saving)

# 2. Run signal analysis (reads from data/normalized/relevant_markets_*.json)
python scripts/run_signals.py                         # default: no_side / moderate
python scripts/run_signals.py --profile conservative  # compare different profiles
python scripts/run_signals.py --profile aggressive

# 3. Open paper trades (per-profile ledgers)
python scripts/run_papertrade.py                         # default
python scripts/run_papertrade.py --profile conservative  # trades into its own ledger

# 4. Resolve closed markets (checks all ledger files)
python scripts/resolve_trades.py

# 5. Export data for dashboard
python scripts/export_dashboard.py

# 6. View dashboard (one command — exports data automatically first)
python scripts/serve_dashboard.py
# Opens at http://localhost:8000
# Custom port: python scripts/serve_dashboard.py 3000
# Skip export:  python scripts/serve_dashboard.py --no-export
```

## Comparative testing workflow

To compare profiles on the same data:

```bash
python scripts/fetch_markets.py                         # one fetch
python scripts/run_signals.py --profile conservative    # same data, 3 profiles
python scripts/run_signals.py --profile moderate
python scripts/run_signals.py --profile aggressive
python scripts/run_papertrade.py --profile conservative # same data, 3 ledgers
python scripts/run_papertrade.py --profile moderate
python scripts/run_papertrade.py --profile aggressive
python scripts/serve_dashboard.py                       # compare in Run History tab
```

## Pipeline data flow

```
fetch_markets.py
  → data/normalized/relevant_markets_*.json  (classified bracket markets with event context)
  → data/normalized/families_*.json          (MarketFamily groupings)

run_signals.py --profile <X>
  ← reads relevant_markets_*.json
  → data/signals/signals_*_<X>.json          (TRADE/WATCH/SKIP with scores + attribution)
  → data/runs/index.json                     (run history entry)

run_papertrade.py --profile <X>
  ← reads relevant_markets_*.json
  → data/ledger/ledger_no_side_<X>.json      (per-profile trades with event context)
  → updates data/runs/index.json             (trade counts, P&L)

resolve_trades.py
  ← reads relevant_markets_*.json + all ledger_*.json files
  → updates ledger files                     (closes trades: WON/LOST/EXPIRED)
  → updates data/runs/index.json             (resolution stats: won/lost/open/P&L)

generate_summary.py
  ← reads data/signals/ + data/ledger/
  → dashboard/data/summary.json              (evaluation metrics)
  → reports/evaluation_summary.json          (same data for reports)

export_dashboard.py
  ← reads latest from all data dirs
  → dashboard/data/*.json                    (for HTML dashboard)
  → dashboard/data/summary.json              (evaluation summary)
  → dashboard/data/pipeline_report.json      (automation status)
  → dashboard/data/meta.json                 (source file freshness metadata)

run_pipeline.sh (orchestrator)
  ← runs all above scripts in order, for all 3 profiles
  → reports/pipeline_report.json             (per-step success/failure)
```

## Data directories

```
data/
  raw/              Raw API responses (events_*.json, markets_*.json)
  normalized/       Processed markets (relevant_markets_*.json, families_*.json)
  signals/          Per-profile signal outputs (signals_*_moderate.json, etc.)
  ledger/           Per-profile trade ledgers (ledger_no_side_moderate.json, etc.)
  runs/             Run history (index.json + individual run_*.json files)
```

## Known-slug registry

Static config at `polymarket_timer_bot/config/known_event_patterns.json`.

To add a new market:
1. Get the event URL from Polymarket
2. Add the URL to `direct_urls` and the slug to `exact_slugs`
3. Re-run `python scripts/fetch_markets.py`

## How to test

```bash
pip install pytest
python -m pytest tests/ -v
# Currently 95 tests (models, adapters, classifier, discovery, signals,
# strategy, papertrade, resolution, runs)
```

## How to inspect outputs

```bash
# Show relevant markets from the latest fetch
python -c "
import json, glob
f = sorted(glob.glob('data/normalized/relevant_markets_*.json'))[-1]
for m in json.load(open(f)):
    print(m['bracket_label'], '|', m['question'][:70], '|', m.get('market_type', ''))
"

# View signal results (new format: object with strategy + results)
python -c "
import json, glob
f = sorted(glob.glob('data/signals/signals_*.json'))[-1]
data = json.load(open(f))
results = data.get('results', data) if isinstance(data, dict) else data
for s in results[:10]:
    print(s['signal'], s['score'], s.get('bracket_label',''), s['question'][:50])
"

# View run history
python -c "
import json
runs = json.load(open('data/runs/index.json'))
for r in runs:
    print(f\"{r['run_id']}  {r['strategy_id']}/{r['profile_id']}  trades={r['signals_trade']}  P&L=\${r['total_pnl']:.2f}\")
"

# View the paper-trade ledger
python -c "
import json, glob
for lf in sorted(glob.glob('data/ledger/ledger*.json')):
    print(f'--- {lf} ---')
    for t in json.load(open(lf)):
        label = t.get('bracket_label', '')
        print(f\"  {t['status']} [{label}] {t['question'][:50]} P&L={t.get('pnl', 'open')}\")
"
```
