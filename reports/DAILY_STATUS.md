# Daily Status

## 2026-08-17 (latest)

**Current status:** `/g/house97` PASS HOUSE. Next `/g/ferry98` $15 ticket. PAPER / SIMULATED. Politics frozen.

## 2026-08-16

**Current status:** Two Harbors gauntlet redirected to the **base harbour game**. Politics frozen. Ten agent slots on spawn/cart/lease/market/presence/persist — not House/Senate.

### Harbour (PAPER / SIMULATED)

- Pixel-held: inland spawn, paved ribbon, dirt ribbons, traffic, taxi overlay, ferry $15, RMB orbit, lease → House → Enter → Exit, trees + cart (`/?g=tree25`), cream ferry hull (`/g/ferry37` PASS), kraft shore foam (`/g/shore40` PASS), quay clutter (`/g/quay41` PASS), pedestrians (`/g/peds44` PASS), nametags (`/g/tags46` PASS), HUD econ/nearby/staff (`/g/hud47` PASS), calendar/cart/persist (`/g/hud49` PASS), nearby count (`/g/near50` PASS — 4 nearby), flow/tax/goods (`/g/flow51` PASS), staff + ferry spread (`/g/hud52` PASS), ferry fender (`/g/fend54` PASS FENDER), sage dinghies (`/g/ding65` PASS DINGHY), rust channel buoy (`/g/buoy70` PASS BUOY)
- New chat: paste `game/reports/HANDOVER.md`. This gauntlet thread is bloated.
- Code-held: econ HUD, stalls, pedestrians, nametags, interiors, presence, persist, north port sign, calendar / fare / tax / held-goods / faucet lines
- Play: **`http://localhost:8787/`** (port 8787). Close stale `/g/` tabs. Left click/tap = walk or use. RMB-hold = orbit.
- Do not clone Capital Rift UI / Earth / OSM / wallet

### Polymarket bot

Unchanged. Still paper-only. Not the active gauntlet.

## 2026-03-18

**Current status:** Pipeline end-to-end operational with multi-strategy comparative testing support.

### What exists
- Market ingestion with events-first discovery (5-layer priority)
- Parameterized signal engine (strategy + profile separation)
- Per-profile paper trading with separate ledgers
- Trade resolution (WON / LOST / EXPIRED)
- Durable run history (data/runs/)
- Dashboard with error/empty state distinction, source-based freshness, Run History tab
- 95 tests passing
- All outputs labeled SIMULATED

### Architecture
- **Strategy** defines signal logic variant (currently: `no_side@1.0`)
- **Profile** controls risk parameters (conservative / moderate / aggressive)
- Each run is attributable: strategy + profile + input snapshot + timestamps
- Per-profile ledger files prevent cross-contamination
- Dashboard shows comparative results across strategy+profile combinations

### Completed this session
- Fixed pipeline break: run_signals.py and run_papertrade.py now read events-based output
- Fixed supplemental merge: relevant_markets_*.json includes all sources
- Added Market.from_dict() for JSON deserialization
- Built Strategy + Profile model with 3 built-in profiles
- Parameterized signal engine (evaluate accepts StrategyConfig)
- Per-profile signal files and ledger files
- RunRecord + RunStore for durable run history
- resolve_trades.py handles all ledger files
- Dashboard hardened: error vs empty states, source-based freshness, safe rendering
- Dashboard Run History tab for comparative viewing
- export_dashboard.py writes meta.json with file freshness
- serve_dashboard.py for one-command access
- 95 tests (17 new: strategy parameterization, run store, resolution)
- All docs updated to match implementation

### Next
- Run comparative test: conservative vs moderate vs aggressive on real data
- Wait for market resolutions to validate P&L
- Dashboard family grouping
- Consider additional strategies (after validation)

### Blockers
- None
