---
name: two-harbors-height
description: >
  Two Harbors heightAt terrain contract. Use when editing land.ts, main.js
  makeTerrain, south grade, beach, or volcano. Keep server and client in sync.
---

# heightAt

Duplicated on purpose until a shared module exists:

- Server: `game/src/land.ts` `heightAt`
- Client: `game/public/harbour/main.js` `heightAt` (~line 283)

**They must stay in sync.** Drift makes the capsule float or sink.

## Grade vs beach

- South harbour grade `SOUTH_GRADE_Y = 1.28` paints **grass + packed clay**.
- True beach (no grade) stays **sand**.
- Do not paint a sand sheet under the apron.

Walk: tap only where height > 0.25 m. Water forbidden.
Channel shortcut refused (`Stay on land.`). Volcano exclusion in `southGeom.ts`.

## Terrain

`makeTerrain` in `main.js`. Shore tint: `shore.js`. Water: `water.js`.
Tests: `land.test.ts`, `shore.test.ts`, `southLand.test.ts`.

Coords: metres. +Z inland/south on South. Harbour Circus `{-2080, 7440}`.
