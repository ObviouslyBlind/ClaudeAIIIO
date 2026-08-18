---
name: two-harbors-ferry
description: >
  Two Harbors ferry. Use when editing ferry ticket, spawnAt, routes, fare, or
  channel mesh. Instant teleport today; PLAN wants travel time and cargo.
---

# Ferry

The political football in PLAN. Live: pay ticket, client `spawnAt(otherIsland)`.

- `game/src/ferry-routes.ts` — `listFerryRoutes`, `confirmFerry`, ticket from statute.
- Client: `ferry.js` (mesh), `ferry-ticket.js`, `ferry-hud.js` (spread).
- GET/POST `/api/ferry`.
- Two books: `lastPrice` / `lastPriceSouth`, `arbSpread` on snapshot.

## Not live yet

Sim-side travel time, cargo hold, queue. Do not fake cargo in the client.

North wants South food/ore. South wants North tools/concrete. Break the ferry
and both hurt — only once travel actually takes time.
