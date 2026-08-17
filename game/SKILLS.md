# Skills to get Two Harbors rolling

What this agent needs, what is in `.cursor/skills/`, and what to ignore.

Nothing named **aeiou** was in this workspace. If that was a Cursor dashboard source, remove it there.

## Install now (done)

| Skill | Why |
|---|---|
| **two-harbors-sim** | Tick, goods, statutes. Spec gate. |
| **two-harbors-net** | One shard, HTTP + WS, interest cells. No Colyseus. |
| **two-harbors-map** | Two authored islands. No OSM. |
| **two-harbors-client** | Three.js harbour rules. Step L only. |
| **two-harbors-gauntlet** | Builder vs blind critic on **one** piece. Not a clone prompt. |
| **impeccable** | Later HUD / Hansard. Not the tick loop. |
| **threejs-scene-setup** / **gltf** / **materials** | Step L |
| **input-systems** | Primary / secondary mapping |
| **save-systems** | Persist world and offices |
| **game-ui-ux** | Phone-safe HUD |
| **performance-optimization** | 30fps harbour |
| **survival-crafting** | Genre notes only |

Stack research: [BACKEND.md](BACKEND.md). Kernel: [FOUNDATION.md](FOUNDATION.md). Gauntlet Loop: [GAUNTLET.md](GAUNTLET.md).

## Needed in our heads

1. Authoritative 1Hz tick
2. Escrowed books, two islands later
3. Faucet/sink ledger
4. Statute table
5. Intent protocol + AOI cells
6. Owner vs CEO, AI workers
7. Election clock
8. Chunked island meshes, not a planet

## Do not install

- Godot / Unity / Unreal / Roblox packs
- Colyseus / PlayCanvas skills — wrong shape (rooms) or unused engine
- OSM / Mapbox / Cesium skills — we are not rendering Earth
- Impeccable on `sim.ts`

## How to run

- Economy → `two-harbors-sim`
- Sockets / protocol → `two-harbors-net`
- Heightmaps / plots → `two-harbors-map`
- Canvas → `two-harbors-client` then `threejs-scene-setup`
- HUD chrome → `impeccable` then `game-ui-ux`
- One slice, harsh critic → `two-harbors-gauntlet`
