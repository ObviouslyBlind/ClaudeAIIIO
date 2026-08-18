---
name: two-harbors-interest
description: >
  Two Harbors interest / AOI cells. Use when stopping full-island map dumps or
  wiring the client to /api/interest. Phone cannot take 8 km of parcels.
---

# Interest cells

`kernel/interest.ts`, `GET /api/interest`. Plot cell 64 m. Actor cell 250 m.

**Gap:** `landSnapshot()` / `/api/map` still returns all plots + roads + graph.
The client should fetch the cell plus neighbours, not the cadastral planet.

Other island = not in interest until ferry. Indoors actors = omitted.

This is why 500 people can share two islands without each phone loading both.
