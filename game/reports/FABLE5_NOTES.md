# Fable 5 notes — what shipped (2026-08-17)

Operator asked Grok to record this. PAPER / SIMULATED. No wallet. Do not restart the pixel-critic swarm.

Branch: `cursor/capital-map-v2-183a`
Latest game commit at note time: `928dcf6d feat(game): road network with side streets, point-based taxi, honest traffic, props`
Draft PR: https://github.com/ObviouslyBlind/ClaudeAIIIO/pull/31

Play: **`http://localhost:8787/`** (port **8787**, tmux `two-harbors-play`, `cd /workspace/game && npm run play`).

If the page is blank from Cursor Desktop: plug icon (top-right of the agent panel) → Auto-Forward Ports on → open **8787**. Web-only (`cursor.com/agents`) does not put 8787 on your laptop; use the agent Ports / Simple Browser, or watch the agent desktop.

## What Fable 5 actually shipped

### 1. Parcel map
- File: `game/public/harbour/parcel-map.js` · tests: `game/src/parcel-map.test.ts`
- Every parcel: tinted fill + dark boundary ink + floating PAPER price (`$1,121` vacant, **`YOURS`** on visitor leases)
- Two draw calls per island + **72** label sprites, **26 m** gap (`LABEL_MIN_GAP_M`) so tags do not shingle
- Wired in `game/public/harbour/main.js`: `mountParcelMap`, `buildIsland`, `setSelected`, `sync` on lease/restore, `tick` for labels
- Terrain greens lightened so the plat reads (`makeTerrain` printed-map greens)

### 2. Harbour “lake” fix
- Root cause: `heightAt` carved a **16 m pier slot** then a **300 m beach spit**; 96×64 terrain cells (~90 m) smeared it into an inland pond; ferry berth sat on sand
- Both copies of `heightAt` (`game/src/land.ts` and `main.js`) now carve a **cove that widens seaward into open water**
- Terrain **224×144**
- Probe: `game/scripts/probe-port.ts`
- Palms cull if they land in a parcel ring
- Keep `heightAt` in **land.ts and main.js in sync**

### 3. Dead-code purge (−19,225 lines)
Runtime-dead gauntlet modules + tests removed: `trees`, `stalls`, `pedestrians`, `nametags`, `street-props`, `quay`, `quay-lamps`, `port-sign`, `south-sign`, `farm` (farm meshes live in `buildings.js`)
- Removed `stalls` / `pedestrians` wiring from `main.js`
- Suite 687 → 520, then **531** with new tests

### 4. Town / road network (`game/src/land.ts`)
- **4 named side streets** per island: Market / Mill / Chapel / Weir St (`SIDE_STREET_SPECS`, `sideStreetPolyline`, `sideStreets`)
- Lots **front their street** (`lotsAlongPolyline`) — not 4 stacked zoning rows on one spine
- Fields on **dirt lanes** past street ends (`fieldsOnDirtLane`) + inland spine fields with dirt tracks
- Roads: spine first (`Harbour Rd`, no `joins`), then branches with `joins` + `name`, then dirt
- `/api/map` snapshot includes **`stops`** from `taxiStops(spec)`: Port, junctions, street ends, Road End
- `ringHitsPaved` / `distToAnyPaved` clear **all** paved polylines, not just the spine
- NPC town still seeded (~10 street lots + 4 farms per island, `NPC_TOWN_MIN_PORT_M = 260` so cheap spawn lots stay vacant)

### 5. Point-based taxi (`game/public/harbour/taxi.js`)
- `routeAcrossPaved`: same-road stays on that road; else branch → junction → trunk → junction → branch
- `stopFromMapClick`: tap named dots first; fallback still snaps to nearest paved
- Overlay draws cream stop dots + labels; status `"Taxi to Mill St. PAPER · SIMULATED."`
- Movement identity unchanged: hail, wait on paved, map overlay, dirt forbidden

### 6. Traffic AI (`game/public/harbour/traffic.js`)
- **Removed** per-frame teleport that clustered cars ahead of the player
- Cars own a `roadIdx`, drive at own speed, **lane offset** `LANE_OFFSET_M = 1.7`, **turn around at ends** (no wrap teleport)
- Some cars on side streets (`roadIdx > 0`)
- Dropped unused `projectOnPolyline` import / `getPlayer` / `getIslandId` (main.js may still pass them — harmless extras)

### 7. Camera / walk
- Wheel zoom **9–650 m**, pitch **0.12–1.45**, walk **22 m/s**
- RMB orbit + tap-to-walk unchanged

### 8. Props (`game/public/harbour/props.js`)
- Instanced bushes / rocks / port barrels / benches at taxi stops
- `propSpotOk`: dry, off-road (`PROP_ROAD_CLEAR_M = 9`), off-parcel
- Trickle-loaded after NPC buildings in `loadTrickleDressing`; `buildProps` per island

## Tests

`npx vitest run` in `/workspace/game`: **64 files, 531 passing** last Fable run.

Key new: `game/src/road-network.test.ts`, `game/src/parcel-map.test.ts`
Updated: `buildings.test.ts`, `roads.test.ts`, `taxi-wait.test.ts`, `playtest-scale.test.ts`

## Still operator-visible (not done)

- Taxi overlay frames the **whole island**, so town stops cluster at the bottom of the oval — zoom map to road-network bbox
- Sand apron still large at map height vs Capital Rift’s uniform green plat
- Buildings/cars still undersized vs CR; CC0 kits not imported yet
- NPC town meshes trickle in (~8s+); do not call them missing at first frame
- ROADMAP “Done” used to say fields carpet rows 2–3; road network is actually **done** (see ROADMAP.md)

## Guardrails for the next agent

- Work on **`cursor/capital-map-v2-183a`**, not Polymarket main
- Do not fetch `play.capitalrift.com` game files, OSM Earth, or CR branding
- Keep `createWorld` in `game/src/server.ts`
- `gh` is read-only; use ManagePullRequest for PR writes
- Keep: tap-to-walk, taxi on paved, ferry between islands. No teleport.
- Do not restart `/g/` critics
