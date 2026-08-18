---
name: two-harbors-lots
description: >
  Two Harbors parcels, leases, $ tags, buy-ask. Use when editing plots, lot dirt,
  parcel-map, or lease/develop. Not OSM parcels.
---

# Lots

Genre: walk up to dirt that already exists, pay PAPER, then develop.
Not a menu of abstract lots. Not Earth / OSM footprints.

## Live

- `leasePlot` / `developPlot` via `POST /api/lease`, `/api/develop`.
- Click `$` bar (`lot-tags.js`, `buy-ask.js`) or the lot dirt.
- Buy-ask Yes / No. `YOURS` on leases.
- Develop catalog: house, shop, house_shop, farm, warehouse, factory
  (`buildings.ts`). High density locked (`zones.ts`).
- Street lots both sides. Five South town greens **reserved**, no buildings.
- Port / quay is public. You cannot buy the pier.

## Kernel

Plots unique, non-overlapping (`kernel/plots.ts`, 64 m cells). Persist stores
**develops (buildings)**, not just lease ids.

## Gaps

South: 707 plots, zero NPC buildings. North: 59 plots, 16 NPC-owned.
Client still polls full `/api/map` instead of `/api/interest`.

## Files

`land.ts`, `southLand.ts`, `parcel-map.js`, `lot-tags.js`, `buy-ask.js`,
`overlays.js`. Spec: `game/LAND.md`.
