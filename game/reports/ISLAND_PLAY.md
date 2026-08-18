# Island-wide playability — research snapshot

Date: 2026-08-18. Spec remains `PLAN.md`. This file is **where the running game is**, not a new plan.

PAPER / SIMULATED. Politics frozen. One visitor on this process.

## Verdict

The shard is **PLAN A + D + L**, with a South-first C-ish loop and **K.1 libraries proven in tests but not fully wired into live multiplayer**.

You can spawn South, walk, taxi, buy a lot, develop, run the hotdog cart, ferry to North, lease there. You cannot yet treat both islands as one inhabited, interest-culled, durable world.

## PLAN A–N vs live

| Step | Live |
|---|---|
| **A** Headless 1Hz, 12 goods, NPC books | Yes. `createWorld` / `tick` in `sim.ts`. Empty-hour tests. |
| **A2** Kernel K.1 | Partial. Plots/minerals/events live. Players table test-only. Client ignores `/api/interest`. |
| **B** Statutes write sim | Partial. Sales tax + ferry ticket. Most sliders catalog-only. First-loop tax hardcoded 0.2. |
| **C** Accounts + small sites | Partial. Lease/develop/staff. No accounts. First-loop play not in persist blob. |
| **D** Second island + ferry | Mostly. Dual books + ticket. Ferry is pay + teleport, no travel time/cargo. |
| **E / E2** Firms, ranks | Stub / tests only. Factory develop has no planning gate. |
| **F–G** Planning / resident poll | Tests only. No HTTP. |
| **H–J** House / Senate / councils | Frozen. Libraries + calendar HUD day. No live election. |
| **K** Stocks | Tests only. |
| **L** 3D harbour | Yes, South-heavy. |
| **M** Mobile / portrait planning | Partial chrome. No Hansard. Long-press secondary missing. |
| **N** Closed beta shard | No. In-memory. Restart wipes. |

## Playability map

| Capability | South | North |
|---|---|---|
| Default spawn | Yes (west quay) | Ferry |
| Plots | 707 | 59 |
| Road graph | Full `RoadGraph` | Polyline fallback |
| Taxi | Graph + peel + auto-board | Legacy polyline |
| NPC town | None | ~16 lots |
| First-loop cart | Primary | Secondary |
| Minerals overlay | Empty v1 | Field deposits |

Travel language (do not add a second): tap-walk → taxi on paved → ferry. No WASD. No teleport.

## Kernel vs FOUNDATION

Fixed since FOUNDATION was written: persist stores **buildings** (`develops`); overlap tests exist; minerals catalog lists ore.

Still open: one `visitor`; full `/api/map` dump; HTTP presence stub; no Postgres.

## Gaps that block island-wide play (not politics)

1. Quayward Loop L-corners and Strand T hairlines (`docs/ROAD_MESH.md` — local hubs only).
2. North has no authored graph; taxi cannot match South.
3. South towns are empty footprints.
4. Client does not consume interest cells.
5. First-loop stands/warehouse/deliveries not persisted.
6. 12 goods do not spatially mill (ore→bar→nail).
7. Ferry has no duration.
8. No glTF harbour kit yet (`assets/maps/` is JSON plots).
9. Secondary long-press not implemented.
10. Single-player process.

## Invariants

- `createWorld` in `game/src/server.ts`
- `heightAt` duplicated in `land.ts` and `harbour/main.js` — keep in sync
- PAPER / SIMULATED on money
- Left-click does not hop out of taxi
- ASPHALT `0x141414`, SIDEWALK `0xb0a48c`, SHOULDER `0x6f6a5e`
- Do not island-wide road union

## Next if the operator names no piece

Same as handover: close visible Loop/Strand joins without island-wide CSG, then Canebrake/Haven angles, then North graph / South NPC life — not North politics.
