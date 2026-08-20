# 2Isles documentation

PAPER / SIMULATED. No wallet. One shard. The sim owns cash, plots, staff, and prices. The browser is a camera.

| | |
|---|---|
| Public name | **2Isles** (this repo still says Two Harbors in older specs; same game) |
| Status | **Mid-alpha** — harbour loop is the base; features go on top |
| Version | **Alpha 0.5** — see [VERSION.md](VERSION.md) |
| Politics | Frozen until the harbour loop is honest |
| Money | PAPER / SIMULATED |

Live status: [HANDOVER.md](HANDOVER.md). Player loop: [PLAY.md](PLAY.md). Version: [VERSION.md](VERSION.md).

---

## Start here

| You want | Read |
|---|---|
| Play the live shard | [HANDOVER.md](HANDOVER.md) |
| Which version we are on | [VERSION.md](VERSION.md) |
| How the loop works | [PLAY.md](PLAY.md) |
| Money, COGS, inflation, listings | [../ECONOMY.md](../ECONOMY.md) |
| Long-range spec | [../PLAN.md](../PLAN.md) |
| Shard kernel (plots, players, interest) | [../FOUNDATION.md](../FOUNDATION.md) |
| Stack and protocol | [../BACKEND.md](../BACKEND.md) |

---

## Spec (do not fork)

These files are law. New work extends them; it does not start a second design.

| File | Job |
|---|---|
| [PLAN.md](../PLAN.md) | What the game is. Systems, player loop, build order. |
| [FOUNDATION.md](../FOUNDATION.md) | Kernel contracts. Unique plots, interest, persist blob. |
| [BACKEND.md](../BACKEND.md) | One shard, HTTP intents, WebSocket presence. No Colyseus. |
| [ECONOMY.md](../ECONOMY.md) | Faucets, sinks, land inflation, cart books, six PAPER listings. |
| [MARKETPLACE.md](../MARKETPLACE.md) | Catalog aisles and the one logistics engine. |
| [LAND.md](../LAND.md) | Parcels, pads, lease inflation. |
| [UNITS.md](UNITS.md) | Rooms inside a building. Shop / apartment / office. Alpha 0.5 scripts. |
| [VERSION.md](VERSION.md) | Alpha 0.5 → 0.5.1 after each successful slice. Beta is 1.0. |

---

## Map and harbour

| File | Job |
|---|---|
| [SOUTH_LAND.md](SOUTH_LAND.md) | South quay, highway, towns. Land-only notes. |
| [ROADS.md](ROADS.md) | Road graph. Taxi and renderer share it. |
| [ROAD_MESH.md](ROAD_MESH.md) | How ribbons and hubs are drawn. |
| [../assets/maps/README.md](../assets/maps/README.md) | Authored map templates. |

---

## How we work

| File | Job |
|---|---|
| [../SKILLS.md](../SKILLS.md) | Which Cursor skills own which lane. |
| [../GAUNTLET.md](../GAUNTLET.md) | Builder vs blind critic. One piece, real bar. |
| [../reports/GAUNTLET_STATUS.md](../reports/GAUNTLET_STATUS.md) | Last ratchet. |
| [../reports/LABELS.md](../reports/LABELS.md) | Mesh `kind` / overlay names for the 3D view. |
| [../reports/THREEJS_ROADS.md](../reports/THREEJS_ROADS.md) | Three.js road-mesh research. Draw rules stay in [ROAD_MESH.md](ROAD_MESH.md). |

Root `CLAUDE.md` is the agent contract: keep `createWorld` in `server.ts`, keep `heightAt` in sync, label money PAPER / SIMULATED.

---

## Play

```bash
cd game
npm test
npm run play              # http://localhost:8787
npm run play:laptop       # public https URL
bash scripts/restart-play.sh
```

Operator plays from the public URL, not localhost. **Alpha wipe:** harbour spawn / hard-refresh / play restart is a fresh visitor. `POST /api/persist/restore` is refused.

---

## Old paths

These files stay so old links do not 404. They are pointers, not the source of truth.

| Old path | Now |
|---|---|
| [`CARTS.md`](../CARTS.md) | [PLAY.md](PLAY.md) |
| [`ROADMAP.md`](../ROADMAP.md) | [PLAN.md](../PLAN.md) §12 and [HANDOVER.md](HANDOVER.md) Next |
| [`reports/FIRST_LOOP.md`](../reports/FIRST_LOOP.md) | [PLAY.md](PLAY.md) |
| [`reports/HANDOVER.md`](../reports/HANDOVER.md) | [HANDOVER.md](HANDOVER.md) |

---

## Do not

- Clone Capital Rift’s client, Earth map, OSM, or protocol
- Put prices in Colyseus rooms
- Unfreeze House / Senate / councils / elections
- Add a live wallet ticker
- Restore Polymarket / SENTINEL / a trading bot
- Invent a second economy beside [ECONOMY.md](../ECONOMY.md)
