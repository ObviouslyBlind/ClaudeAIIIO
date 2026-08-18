---
name: two-harbors-taxi
description: >
  Two Harbors taxi. Use when editing hail, wait, auto-board, peel, dual carriageway,
  exit taxi, or taxi HUD. Left-click must not hop out.
---

# Taxi

Client: `game/public/harbour/taxi.js`, `taxi-hud.js`, `roadnet.js`.
Server map graph: `game/src/roadGraph.ts`. Tests: `taxi-wait.test.ts`,
`taxi-path.test.ts`, `taxi-hud.test.ts`.

## Rules

- Hail on **paved** only. Dirt tracks forbidden.
- Dual: cab sits in the **nearer** black carriageway, never the stone median.
- Harbour Circus: first/right exit peels inland (driver-right), not the long arc.
- Cab sits in ring tarmac, not the stone island.
- Arrival **auto-boards**. Left-click does **not** hop out.
- **Exit taxi** is on the dock (`#btn-exit`) and the map overlay.
- Taxi button while riding reopens the destination map.
- Hail wait 5–30s; HUD chip `Taxi in 0:12`. 60s unboarded leave still applies.

## North gap

`createLandBoard()` publishes `graph: southBuilt.graph` only. North still uses
polyline fallback. Island-wide play needs a North graph.

## Do not

Make left-click hop out again. Drive dirt. Chord across a circus.
