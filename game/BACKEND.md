# Two Harbors backend

Public name: **2Isles**. Stack contract for one live shard.

Doc map: [`docs/README.md`](docs/README.md). Spec: [`PLAN.md`](PLAN.md). Kernel: [`FOUNDATION.md`](FOUNDATION.md).

What Capital Rift is doing in public, what we copy as **architecture**, and what we do not copy.

We are not cloning their client, UI, Earth map, OSM pipeline, or source. We are building the same *kind* of server: one live shard, sim owns the numbers, the client is a camera plus intents. Our map is two fictional islands. We still do not render the whole of those islands at once.

Sources used (public only): `capitalrift.com` gate comments, `/api/access/status`, privacy policy, HTTP headers on `play.capitalrift.com`. The play client itself is behind Google auth, so its engine file is not in this repo and was not copied.

## What their backend is (public)

| Piece | What we can see |
|---|---|
| Edge | Cloudflare → **nginx** |
| Auth | **oauth2-proxy**, Google, cookie on `.capitalrift.com`, no game password |
| Gate | `capitalrift.com` — React, `pnpm`, REST `/api/access/*`, Stripe hosted checkout |
| Play | `play.capitalrift.com` — CSP `script-src 'self'`, **`wss://play.capitalrift.com`**, `worker-src 'self' blob:` |
| World ticker | Server-computed: players, carts/leases implied, net worth, 24h GDP, commodity **volume** |
| Save | Money, cart, staff, buildings, leases, market orders, standing position |
| Map | Real-world map data; coordinates are **sim**, not GPS. Geolocation API is blocked. |
| Presence | Nearby players **outdoors** only. Indoors = not broadcast. Friends: city + last seen. |
| Persistence | Database + nightly off-site backup |
| Telemetry | Own server, ~1 sample/s frame times, GPU, screen; no player id in the payload |

Their public commodity board uses **pinned catalog prices** (corn 0.25, ore 8, nails 1.5, …) and treats 24h **units traded** as the mover. That is a display choice. The live game still has carts, leases, and orders.

Land, from public pages only (play client is behind Google; not copied): save rows include **buildings** and **leases**; the world is real-world map data with sim coordinates, not GPS; world edits keep a player id the way OSM keeps history; deleted accounts leave buildings unowned. We copy that *shape* (pay for a discrete site, price by location) onto authored islands. Details: [LAND.md](LAND.md).

Module names in their gate (`Access.v1`, `Market.v3`, `Loyalty.v1`) mean they version systems in place. We should do the same: `Sim.A`, then `Statutes.B`, not a rewrite each step.

**Colyseus / room matchmaking is the wrong shape.** They run one world you join. Rooms are for matches. We will not put the economy in a Colyseus room.

The play engine is self-hosted (no CDN Three/PlayCanvas/Unity URL leaks). Phone HUD + 2D Hansard is easier in **Three.js + DOM** than Unity WebGL, which PLAN already rejects.

## What “as close as possible” means for us

Same:

1. One shard. World ticks at 0 players.
2. Authoritative **Node + TypeScript** sim. Client never owns prices, inventories, or votes.
3. **HTTP** for account, market sheets, planning, Hansard. **WebSocket** for presence and short intents (move, use).
4. Save rows: cash, cart, staff AI slots, buildings, leases, orders, position.
5. Interest: server sends **nearby outdoor actors** only. Indoors / other island / far cells = silent.
6. Persist on an interval plus an event log for statute writes and large applications.
7. No third-party analytics JS on the play origin.

Different on purpose:

| They do | We do |
|---|---|
| OSM / real Earth | Two authored islands + one ferry |
| Render by streaming a planet | Load harbour chunks; never the whole pair of islands |
| Google + Stripe on day one | Accounts at step C; no wallet; no Player Pass |
| World-edit history like OSM | Planning applications write the plot table |
| Catalog prices frozen on the public ticker | Order-book `lastPrice` may move; HUD says so |

## Our stack (locked)

```
Browser
  HUD / Hansard / market   DOM (Impeccable later)
  Harbour view             Three.js, chunked, instanced
        │ HTTP intents + WS presence
nginx
        │
Node 22  TypeScript
  tick 1Hz                 economy, ferry, statutes, NPC
  presence ~8–10Hz         cells around each body
  intent log               buy / sell / move / vote / apply
        │
Postgres (from step C)     players, plots, orders, offices
In-memory (step A–B)       current: game/src/sim.ts
Kernel (K.1)               game/src/kernel/ — players, plot index, events, minerals, menus
```

- **Not** Unity WebGL.
- **Not** Colyseus rooms.
- **Not** Mapbox / Cesium / OSM planet dumps.
- Postgres when the first player row exists. Redis only if we split processes later.

## Map templates (two islands, not Earth)

Each island is a folder of **authored** files, not a scrape:

```
game/assets/maps/north/
  height.png          16-bit heightmap
  splat.png           grass / dirt / rock / dock
  collision.json      walkable + water + ferry berth
  plots.json          lease grid, by-right vs large
  districts.json      10 constituencies (polygons in island metres)
  harbour.glb         kit: quay, crane, small stall, large mill
game/assets/maps/south/   same layout
game/assets/maps/ferry.json
```

Coordinates: **metres on the island**, origin at the harbour. Server pathing uses `collision.json`. Client only fetches chunks within the camera far-plane plus one ring.

Constituency polygons are drawn on that local grid. They are not OSM relations.

## Three.js rules (when we reach step L)

- Quality tiers Low / Medium / High. Phone default Low, 30fps cap.
- InstancedMesh for repeated stalls, trees, carts.
- Tap / left click = raycast walk-or-use. Long-press / right click = extra menu. No WASD, no virtual stick, no OrbitControls in play.
- Do not upload the whole heightmap as one mesh. Chunk it.
- Politics stays 2D. Walking into a chamber is optional desktop flavor.

## Skills that match this (not a 67-pack dump)

See [SKILLS.md](SKILLS.md). Custom ones:

- `two-harbors-sim` — tick, goods, statutes
- `two-harbors-net` — intents, AOI cells, no Colyseus shard
- `two-harbors-map` — island templates, no OSM
- `two-harbors-client` — Three.js harbour rules

Impeccable stays for HUD chrome later.

## Build order vs this file

Step A (now): in-memory tick, no sockets.  
Step A2: shard kernel — unique plots, persist buildings, minerals, interest.  
Step B: statutes write sim fields.  
Step C: Postgres + accounts + HTTP intents.  
Step D: second book + ferry.  
Step L: Three.js on top of the same sim, interest-culled.
