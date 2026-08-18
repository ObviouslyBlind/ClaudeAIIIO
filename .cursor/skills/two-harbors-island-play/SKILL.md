---
name: two-harbors-island-play
description: >
  Island-wide playability for Two Harbors. Use when expanding travel, towns,
  North/South parity, or making the shard feel like one walkable pair of islands.
  Not for politics, House, or elections.
---

# Island-wide playability

The bar is: a visitor can spawn South, travel the island, lease, develop, take a
taxi, ferry to North, and the world still looks like **one inhabited place**.

## Where it is (2026-08-18)

- South spawn, 707 plots, full road **graph**, taxi graph routing.
- North: 59 plots, NPC town seeded, taxi falls back to **polylines**.
- South NPC town: **none** (`seedNpcTown` skips south).
- Ferry: pay + client teleport. No sim travel time / cargo queue.
- `/api/map` dumps every plot. `/api/interest` exists; client does not use it.
- One `visitor`. HTTP presence of four seeded walkers.

## Honest next pieces

1. Close Quayward Loop / Strand T hairlines without island-wide union.
2. Give North the same graph model as South (`roadGraph.ts`).
3. Seed South NPC life so empty greens are not the whole island.
4. Drive the client from interest cells, not the full cadastral dump.
5. Make shops/farms **work** (stock, tick) before swapping box houses for glTF.

## Travel language (do not add a second)

Walk (tap land) → taxi (paved graph) → ferry (other island). No teleport, no WASD.

## Files

`game/src/southLand.ts`, `land.ts`, `roadGraph.ts`, `walk.ts`,
`game/public/harbour/main.js`, `taxi.js`, `roadnet.js`, `ferry-ticket.js`.
