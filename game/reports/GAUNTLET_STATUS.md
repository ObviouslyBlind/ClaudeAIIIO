# Gauntlet status

Base harbour only. Same *kind* of shard as Capital Rift’s public genre (one world, sim owns numbers, leases, cart, market, nearby outdoor presence, persist). **Not** their client, Earth, OSM, or wallet. No new politics. User is the brake. Critics one-at-a-time. Do **not** restart play while a critic is on the page.

## Held (pixel-ratified)

Inland spawn, paved asphalt ribbon (`/?g=rib23`), traffic-on-road, taxi overlay, ferry ticket $15, RMB orbit, catalogue, lease → House → Enter → Exit (`/?g=int22`).

## Held (code, not all re-critic’d)

- Econ HUD strip (`90e2bab1`): `#econ` polls `/api/snapshot` → `PAPER · SIMULATED · Index · NPC $ · out`
- NPC stall buy (`7f6becca`): tap stand → POST `/api/buy` qty 1
- Outdoor nametags (`1468a0c1`)
- Warehouse interior dress (`8f93aef2`)
- Nearby presence cells (`fd999043`)
- Persist visitor cart lines (`f7264d45`)
- Quay pedestrians (`d29a72d9`)

Dirt ribbon is code-shipped, not pixel-ratified (`/?g=dirt24` never returned PASS/FAIL).

## Ten slots (base game, 2026-08-16)

| Slot | Piece | Status |
|---|---|---|
| 1 | Pixel critic trees + cart `/?g=tree25` | in flight |
| 2 | Visitor PAPER bid/ask (`orders.ts`) | in flight |
| 3 | PAPER staff slots (`staff.ts`) | in flight |
| 4 | Nearby outdoor presence | landed |
| 5 | Persist visitor cart lines | landed |
| 6 | Warehouse interior | landed |
| 7 | Outdoor PAPER nametags | landed |
| 8 | Econ HUD strip | landed |
| 9 | NPC stall buy | landed |
| 10 | Quay pedestrians | landed |

Politics agents (Senate, House bills, councils, elections) are **not** resumed.

## Next pixel queue (after tree25, one critic at a time)

Dirt, cars, taxi cab, ferry boat, shore, quay, shells, stalls, econ line, pedestrians, nametags, warehouse interior.

## Frozen

House bills, Senate, councils, elections, amendments. Statute catalog stays as sim data only.

Do not edit `PLAN.md`, `BACKEND.md`, `land.ts` centres. Do not clone Capital Rift UI.
