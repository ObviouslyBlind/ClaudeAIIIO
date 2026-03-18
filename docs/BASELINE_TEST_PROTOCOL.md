# Baseline Test Protocol

## Objective

Evaluate Strategy A (`no_side@1.0`) across three risk profiles (conservative, moderate, aggressive) on the same market data. Determine whether the NO-side approach produces useful signals on bracket/count markets before adding complexity.

## Strategy matrix

| Combination | Strategy | Profile | NO Trade Min | Max Expiry | Stake |
|---|---|---|---|---|---|
| A-Conservative | no_side@1.0 | conservative | 0.80 | 48h | $50 |
| A-Moderate | no_side@1.0 | moderate | 0.70 | 72h | $100 |
| A-Aggressive | no_side@1.0 | aggressive | 0.60 | 72h | $200 |

## Baseline loop (one cycle)

Run these commands in order. One cycle = one snapshot of the market.

```bash
# Step 1: Fetch current markets (one fetch serves all three profiles)
python scripts/fetch_markets.py

# Step 2: Run signals for all three profiles
python scripts/run_signals.py --profile conservative
python scripts/run_signals.py --profile moderate
python scripts/run_signals.py --profile aggressive

# Step 3: Open paper trades for all three profiles
python scripts/run_papertrade.py --profile conservative
python scripts/run_papertrade.py --profile moderate
python scripts/run_papertrade.py --profile aggressive

# Step 4: Resolve any closed markets (checks all ledgers)
python scripts/resolve_trades.py

# Step 5: View results
python scripts/serve_dashboard.py
```

## Recommended cadence

| Action | Frequency | Why |
|---|---|---|
| Fetch markets | Every 4-8 hours during active market periods | Bracket markets have 2-3 day windows |
| Run signals + papertrade | After every fetch | Keep signals and trades in sync with data |
| Resolve trades | After every fetch | Catch market closures promptly |
| Dashboard review | After each cycle | Inspect comparative results |

For initial evaluation, run 3-5 full cycles across 1-2 market windows (i.e. one 2-3 day posting-count event from open to close).

## What to inspect after each cycle

### Dashboard tabs

1. **Run History tab**: Compare signal counts across profiles. Conservative should fire fewer TRADE signals than aggressive.
2. **Trade Ledger tab**: Check per-profile ledger comparison table. Compare open trades, exposure.
3. **Signal Output tab**: Review reasoning for TRADE vs WATCH decisions.

### CLI inspection

```bash
# Quick profile comparison — signals fired
python -c "
import json
runs = json.load(open('data/runs/index.json'))
for r in sorted(runs, key=lambda x: x['profile_id']):
    print(f\"{r['strategy_id']}/{r['profile_id']:15s}  TRADE={r['signals_trade']:3d}  WATCH={r['signals_watch']:3d}  SKIP={r['signals_skip']:3d}  trades_opened={r['trades_opened']}\")
"

# Quick profile comparison — ledger status
python -c "
import json, glob
for lf in sorted(glob.glob('data/ledger/ledger*.json')):
    trades = json.load(open(lf))
    open_t = [t for t in trades if t['status'] == 'OPEN']
    closed = [t for t in trades if t['status'] != 'OPEN']
    won = sum(1 for t in closed if t['status'] == 'WON')
    pnl = sum(t.get('pnl', 0) or 0 for t in closed)
    import os; name = os.path.basename(lf)
    print(f'{name:40s}  total={len(trades)}  open={len(open_t)}  won={won}  P&L=\${pnl:.2f}')
"
```

## Metrics to compare

| Metric | What it tells you | Where to look |
|---|---|---|
| Signals fired (TRADE) | How many markets pass the threshold | Run History tab |
| Trades opened | How many unique trades were created | Run History tab |
| Open exposure | Total $ at risk right now | Run History tab, Ledger tab |
| Win/Loss/Expired | Resolution outcomes | Run History tab (after resolution) |
| Win rate | % of definitive outcomes that were WON | Run History tab |
| P&L | Net simulated profit/loss | Run History tab, Ledger tab |
| Signal score range | How confident the engine is | Signal Output tab |

## Red flags to watch for

- **All profiles produce identical results**: Thresholds aren't differentiating — profiles may need wider separation
- **Aggressive fires on everything**: The aggressive floor (NO >= 0.60) may be too low for bracket markets
- **No TRADE signals at all**: Markets may be outside the price/expiry window — check if any relevant markets are active
- **Trades open but never resolve**: Market data may be stale — ensure `fetch_markets.py` is run before `resolve_trades.py`
- **All trades EXPIRED (never WON/LOST)**: API may not be returning winner info for bracket markets — check token.winner fields in raw data
- **Win rate is 0% but P&L is positive**: This shouldn't happen — investigate

## Open questions this protocol should help answer

1. **Q005**: Does the NO-side strategy produce meaningful differentiation across profiles on bracket markets?
2. **Signal quality**: Are high-scoring signals (>80) actually better bets than lower ones?
3. **Profile calibration**: Is the spread between conservative/moderate/aggressive appropriate, or do they need adjustment?
4. **Resolution reliability**: Do bracket markets resolve with clear winner info, or do most end up EXPIRED?

## Assumptions

- The Polymarket API returns `closed` and `token.winner` fields reliably for bracket markets
- Market prices are a reasonable proxy for event probability (Q006 is still open)
- One cycle captures a meaningful snapshot; comparative value increases across multiple cycles
- All results are SIMULATED paper trades — no real money involved
