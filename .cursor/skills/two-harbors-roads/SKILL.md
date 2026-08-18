---
name: two-harbors-roads
description: >
  Two Harbors road graph and mesh. Use when editing roadGraph, roadclass, hubs,
  joins, sidewalks, or taxi tarmac. Do not island-wide CSG or trimYielding.
---

# Roads

Graph in `game/src/roadGraph.ts`. Renderer in `game/public/harbour/roads.js`,
`roadjoin.js`, `roadclass.js`. Spec: `game/docs/ROADS.md`, `game/docs/ROAD_MESH.md`.

## Model

- Node = junction / dead end / circus. Edge ends **are** the nodes.
- Classes (`roadclass.js`): highway 8m×2 + 10m median; avenue 9m + walk 2.6;
  street 6.6 + walk 2.0; lane 4.6; track dirt 3m.
- Joins = union of **2–4 arm-end rects** (a hub). Not the whole island booleaned.
- Stem overlap **~1.4 m**. Sidewalks densify to **4 m**. Hub tarmac `y+0.2`, walks `0.12`.

## Open gap

Quayward Loop L-corners and SW T (South Strand into the loop) still read as two
black rectangles with a grey/sand hairline. Fix **that join**, not the island.

Canebrake / Haven Crescent pairwise angles off 15/30/45/90 — second, not first.

## Colours (do not change)

ASPHALT `0x141414`, SIDEWALK `0xb0a48c`, SHOULDER `0x6f6a5e`.

## Verify

```bash
cd game && npx tsx scripts/audit-roads.ts && npm test
```

Tests: `src/roadGraph.test.ts`, `roadjoin.test.ts`, `roadfoot.test.ts`.
