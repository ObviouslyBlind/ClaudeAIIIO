---
name: two-harbors-director
description: >
  Primary router for Two Harbors harbour MMO work. Use first for any island-wide
  playability, 3D harbour, AAA polish, HUD, taxi, lots, roads, sim, or "build the
  game" request. Overrides threejs-game-director and generic AAA packs. Do not
  scaffold a new Vite game. Do not add WASD or OrbitControls in play.
---

# Two Harbors director

Read this **before** `threejs-game-director`, `threejs-gameplay-systems`, or any
vendor Three.js pack. Those packs teach arcade / from-scratch browser games.
This repo is a **persistent harbour shard**. The sim already exists.

Spec: `game/PLAN.md`. Kernel: `game/FOUNDATION.md`. Stack: `game/BACKEND.md`.
Where we are: `game/reports/HANDOVER.md` and `game/reports/ISLAND_PLAY.md`.
Catalog: `game/SKILLS.md`.

## What this is

PAPER / SIMULATED harbour MMO. One shard. One visitor on this process until
accounts land. No wallet. Politics frozen. Not a trading bot. Not Capital Rift.

- Server owns time, cash, plots, staff, prices. Client is a camera + intents.
- Tick 1Hz in `game/src/sim.ts`. `createWorld` stays in `game/src/server.ts`.
- Harbour view: `game/public/harbour/`. Phone 30fps Low tier.
- Money labels: **PAPER / SIMULATED**.

## Do not (vendor-pack traps)

Generic Three.js skills will try these. Refuse them here:

| Vendor instinct | Two Harbors rule |
|---|---|
| Run `create_threejs_game.py` / new Vite scaffold | Never. Code lives in `game/` |
| WASD + pointer lock | Tap/click-to-walk only |
| OrbitControls in play | RMB-hold orbit + wheel zoom already in `camera.js` |
| Combat, score, waves, hitstop | Wrong genre |
| Post-process bloom on Low | Phone default Low, no post-process |
| Render both islands | Interest cells. Other island after ferry only |
| Client-trusted cash | HTTP intents; sim replies with facts |
| Godot / Unity / Unreal / Roblox | Locked stack: Node 22 + Three.js + DOM |
| Colyseus rooms | One shard, not matchmaking |
| OSM / Mapbox / Cesium / Earth | Two authored islands, local metres |
| WebXR as the play path | Browser + phone Chrome |
| Seat House / Senate / councils | Frozen until harbour loop is honest |
| Island-wide road CSG / `trimYielding` | Local hub unions only. `game/docs/ROAD_MESH.md` |

## Island-wide playability (the current job)

The harbour loop must work as a **place you can travel**, not a demo pad.

Order of work (operator can override):

1. South roads/joins readable as one hub (Quayward Loop L-corners, Strand T).
2. Taxi: hail, peel, auto-board, exit on dock — already on main; do not regress.
3. Same travel language on **North** (graph, not polyline fallback).
4. NPC life on South (today North-only). Empty towns look unfinished.
5. Chunked map / interest — stop dumping all 766 plots every `/api/map` poll.
6. Working buildings (shop sells stock, farm ticks) before pretty glTF kits.
7. Persist first-loop stands. Restart still wipes until Postgres (PLAN C).

Do **not** start North buildings-as-politics, elections, or Hansard.

## Skill routing

| Task | Load |
|---|---|
| Tick, goods, books, NPC flow | `two-harbors-sim`, `two-harbors-economy` |
| Sockets, accounts, AOI | `two-harbors-net`, `two-harbors-interest`, `two-harbors-presence` |
| Height, plots, districts | `two-harbors-map`, `two-harbors-height`, `two-harbors-lots` |
| Roads / taxi | `two-harbors-roads`, `two-harbors-taxi` |
| Harbour canvas | `two-harbors-client`, then Three.js packs |
| HUD / phone | `two-harbors-hud`, `two-harbors-phone`, `impeccable`, `web-design-guidelines` |
| AAA look without replacing the sim | `two-harbors-assets`, `threejs-aaa-graphics-builder` **after** this file |
| Persist / Postgres | `two-harbors-persist`, `save-systems`, `supabase-postgres-best-practices` (Postgres patterns only — we are not a Supabase app) |
| Pixel critic | `two-harbors-gauntlet` — do not start a swarm unasked |
| Tests | `two-harbors-tests` — `cd game && npm test` after play changes |

## Invariants

- `heightAt` in `game/src/land.ts` **and** `game/public/harbour/main.js` stay in sync.
- `createWorld` stays in `game/src/server.ts`.
- Left-click does **not** hop out of the taxi. Exit is dock `#btn-exit` / map overlay.
- ASPHALT `0x141414`, SIDEWALK `0xb0a48c`, SHOULDER `0x6f6a5e`. Do not restyle.
- After JS/CSS changes, restart play so `ASSET_NONCE` changes.

## Verify

```bash
cd game && npm test
```

Play: operator uses the Cloudflare tunnel in handover, not localhost instructions.
Restart wipes. Politics stay frozen.
