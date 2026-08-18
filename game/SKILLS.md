# Skills to get Two Harbors rolling

What this agent needs, what is installed, and what to ignore.

Nothing named **aeiou** was in this workspace.

**Start here:** `.cursor/skills/two-harbors-director/SKILL.md`  
**Where the game is:** `reports/ISLAND_PLAY.md`, `reports/HANDOVER.md`

Vendor Three.js / gamedev / Vercel / Playwright / Postgres packs live in
`game/.agents/skills/` (41 skills). Two Harbors rules live in
`.cursor/skills/two-harbors-*`. Two Harbors **wins** if they disagree.

## Two Harbors (`.cursor/skills/`)

### Always

| Skill | Why |
|---|---|
| **two-harbors-director** | Router. Overrides arcade AAA packs. |
| **two-harbors-island-play** | Travel both islands as one place. |
| **two-harbors-vendor-overrides** | How to use installed packs without wrecking the shard. |
| **two-harbors-sim** | Tick, goods, statutes. Spec gate. |
| **two-harbors-net** | One shard, HTTP + WS, interest cells. No Colyseus. |
| **two-harbors-map** | Two authored islands. No OSM. |
| **two-harbors-client** | Three.js harbour rules. |
| **two-harbors-gauntlet** | One piece, blind critic. Not a clone prompt. |
| **two-harbors-frozen-politics** | Catalog only. Do not seat offices. |
| **two-harbors-paper** | PAPER / SIMULATED labels. |
| **two-harbors-tests** | `cd game && npm test` |
| **two-harbors-play-ops** | Restart wipes, tunnel, ASSET_NONCE. |

### Island play

| Skill | Why |
|---|---|
| **two-harbors-roads** | Graph + local hubs. No island-wide CSG. |
| **two-harbors-taxi** | Hail, peel, auto-board. Left-click does not exit. |
| **two-harbors-lots** | Walk-up dirt, $ tags, lease/develop. |
| **two-harbors-height** | `heightAt` sync land.ts ↔ main.js. |
| **two-harbors-terrain** | Grass/clay grade, sand beach. |
| **two-harbors-north-south** | South cheaper food/ore; North dear industry. |
| **two-harbors-npc-town** | South empty; North seeded. |
| **two-harbors-ferry** | Ticket + spawnAt; no cargo time yet. |
| **two-harbors-chunking** | Do not load both islands. |
| **two-harbors-interest** | `/api/interest` vs full `/api/map`. |

### Loop / sim

| Skill | Why |
|---|---|
| **two-harbors-economy** | 1Hz, 0 players, finite prices. |
| **two-harbors-first-loop** | Hotdog cart / warehouse / van. |
| **two-harbors-market** | 12-good books ≠ first-loop catalog. |
| **two-harbors-kernel** | K.1 plots, minerals, events. |
| **two-harbors-persist** | Blob + wipe rule. Postgres later. |
| **two-harbors-production** | Chains not spatial yet. |
| **two-harbors-statutes** | Catalog live; House frozen. |
| **two-harbors-buildings** | Working sites, not decoration-only. |
| **two-harbors-staff** | AI on tick; no minigame stall. |

### Camera / HUD / phone

| Skill | Why |
|---|---|
| **two-harbors-camera** | RMB orbit, not OrbitControls. |
| **two-harbors-controls** | One scheme: tap / long-press. |
| **two-harbors-hud** | DOM chrome, menu stack. |
| **two-harbors-phone** | 30fps Low, safe area. |
| **two-harbors-interiors** | Enter/exit; hide outdoor, don't dispose. |
| **two-harbors-presence** | Outdoor nearby only. |
| **two-harbors-accessibility** | Labels, thumbs, reduced motion. |
| **two-harbors-audio** | Light harbour SFX. |
| **two-harbors-lighting** | Cheap lights on Low. |
| **two-harbors-assets** | CC0 glTF kits, door 2.1 m. |

Also already here: **impeccable** (HUD craft, not `sim.ts`), **threejs-scene-setup / gltf / materials**, **input-systems**, **save-systems**, **game-ui-ux**, **performance-optimization**, **survival-crafting** (genre notes only).

## Vendor packs (`game/.agents/skills/`)

Installed for AAA *browser* craft on **this** client, not a new game.

| Pack | Skills | Use for |
|---|---|---|
| [majidmanzarpour/threejs-game-skills](https://github.com/majidmanzarpour/threejs-game-skills) | 9: director, gameplay, aaa-graphics, ui, debug, qa, 3d/image/audio generators | Polish, scorecards, optional generators |
| [full-stack-skills/threejs-skills](https://github.com/full-stack-skills/threejs-skills) | 18: animation, audio, camera, controls, geometries, lights, loaders, materials, … | Three.js API depth |
| [gamedev-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) (subset) | 10 disciplines: audio-design, camera-systems, create-game-assets, dialogue-systems, game-ai, game-feel, level-design, physics-tuning, procedural-gen, shader-programming | Engine-neutral craft |
| [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | web-design-guidelines, writing-guidelines | HUD a11y / prose |
| [supabase/agent-skills](https://github.com/supabase/agent-skills) | supabase-postgres-best-practices | Postgres indexes when PLAN C lands — **not** Supabase Auth |
| [microsoft/playwright-cli](https://github.com/microsoft/playwright-cli) | playwright-cli | Live-page QA |

Lockfile: `game/skills-lock.json`.

## Needed in our heads

1. Authoritative 1Hz tick
2. Escrowed books, two islands
3. Faucet/sink ledger
4. Statute table (frozen offices)
5. Intent protocol + AOI cells
6. Owner vs CEO, AI workers (later)
7. Chunked island meshes, not a planet
8. One mapped control scheme

## Do not install

- Godot / Unity / Unreal / Roblox packs
- Colyseus / PlayCanvas — wrong shape or unused engine
- Phaser / Pixi — HUD is DOM, world is Three.js
- OSM / Mapbox / Cesium — we are not rendering Earth
- FPS / platformer / card-game genre packs
- Impeccable on `sim.ts`

## How to run

- Any harbour / island work → `two-harbors-director` then the lane skill
- Economy → `two-harbors-sim` + `two-harbors-economy`
- Sockets / protocol → `two-harbors-net`
- Heightmaps / plots → `two-harbors-map` + `two-harbors-height`
- Canvas polish → `two-harbors-client` then Three.js vendor packs
- HUD chrome → `impeccable` then `two-harbors-hud` / `web-design-guidelines`
- One slice, harsh critic → `two-harbors-gauntlet`

Stack research: [BACKEND.md](BACKEND.md). Kernel: [FOUNDATION.md](FOUNDATION.md). Gauntlet: [GAUNTLET.md](GAUNTLET.md).
