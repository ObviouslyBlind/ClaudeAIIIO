---
name: two-harbors-map
description: Two Harbors map templates. Two fictional islands, local metres, chunked heightmaps. Use when adding terrain, plots, districts, or ferry geometry. Do not import OSM, Mapbox, Cesium, or a real-Earth dump.
---

# Two Harbors map

Read `game/BACKEND.md`. The map is **content**, not a planet. Doc map: `game/docs/README.md`. South notes: `game/docs/SOUTH_LAND.md`.

## What exists

North (industry, dear land) and South (food/ore, cheaper). One ferry. Coordinates are metres, origin at each harbour.

Folder template:

```
game/assets/maps/<island>/
  height.png collision.json plots.json districts.json harbour.glb
```

Server loads collision + plots. Client loads visible chunks + `harbour.glb` kit pieces.

## Rules

- Author the islands. Do not scrape OpenStreetMap or anyone's client.
- 10 constituencies per island as polygons on that grid, not OSM relations.
- Large vs small sites are flags on `plots.json`, not different map products.
- Never send the full heightmap to a phone. Chunk it.

## Later, not now

A real-Earth map is a PLAN “later” line. It is not beta. Do not lay OSM pipes “just in case.”
