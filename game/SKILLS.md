# Skills to get Two Harbors rolling

**Grab list:** `.cursor/skills/two-harbors-job-index/SKILL.md`  
**Router:** `.cursor/skills/two-harbors-director/SKILL.md`  
**Where the game is:** `reports/HANDOVER.md`

Harbour rules live in `.cursor/skills/two-harbors-*`. Vendor Three.js / gamedev
packs live in `game/.agents/skills/` (~75). Two Harbors **wins** if they disagree.

Open the **job**, not the whole catalog.

## Grab by job

| Job | Skills (open in this order) |
|---|---|
| Roads / kerbs | `two-harbors-roads` |
| Taxi | `two-harbors-taxi`, `two-harbors-controls` |
| Lots / $ tags | `two-harbors-lots`, `threejs-interaction` |
| Height / beach | `two-harbors-height`, `two-harbors-terrain`, `two-harbors-map` |
| Water / sea | `two-harbors-client`, `threejs-water-optics`, `threejs-spectral-ocean` |
| Fog / sky | `two-harbors-lighting`, `threejs-atmosphere-aerial-perspective` |
| Buildings that sell | `two-harbors-buildings`, `two-harbors-first-loop` |
| glTF / kits | `two-harbors-assets`, `threejs-gltf-loading` |
| HUD | `two-harbors-hud`, `impeccable`, `game-ui-ux` |
| Phone 30fps | `two-harbors-phone`, `three-best-practices`, `threejs-perf` |
| Camera | `two-harbors-camera` — not OrbitControls |
| Tick / prices | `two-harbors-sim`, `two-harbors-economy`, `two-harbors-market` |
| Ferry / North | `two-harbors-ferry`, `two-harbors-north-south`, `two-harbors-chunking` |
| Interest / sockets | `two-harbors-interest`, `two-harbors-net` |
| NPC town | `two-harbors-npc-town` |
| Persist | `two-harbors-persist`, `save-systems` |
| Tests | `two-harbors-tests`, `playwright-cli` |
| Shaders | `threejs-shaders`, `shader-programming` |
| Instancing | `threejs-perf`, `threejs-geometry` |
| Gauntlet | `two-harbors-gauntlet` |

Always also: `two-harbors-director`, `two-harbors-paper`, `two-harbors-tests`.

## Two Harbors (`.cursor/skills/`)

### Always

| Skill | Why |
|---|---|
| **two-harbors-job-index** | Job → skill table. Grab this. |
| **two-harbors-director** | Overrides arcade AAA packs. |
| **two-harbors-island-play** | Travel both islands as one place. |
| **two-harbors-vendor-overrides** | How to use installed packs without wrecking the shard. |
| **two-harbors-sim** | Tick, goods, statutes. Spec gate. |
| **two-harbors-net** | One shard, HTTP + WS, interest cells. No Colyseus. |
| **two-harbors-map** | Two authored islands. No OSM. |
| **two-harbors-client** | Three.js harbour rules. |
| **two-harbors-gauntlet** | One piece, blind critic. |
| **two-harbors-frozen-politics** | Catalog only. Do not seat offices. |
| **two-harbors-paper** | PAPER / SIMULATED labels. |
| **two-harbors-tests** | `cd game && npm test` |
| **two-harbors-play-ops** | Restart wipes, tunnel, ASSET_NONCE. |

### Island play

`two-harbors-roads`, `taxi`, `lots`, `height`, `terrain`, `north-south`,
`npc-town`, `ferry`, `chunking`, `interest`.

### Loop / sim

`two-harbors-economy`, `first-loop`, `market`, `kernel`, `persist`,
`production`, `statutes`, `buildings`, `staff`.

### Camera / HUD / phone

`two-harbors-camera`, `controls`, `hud`, `phone`, `interiors`, `presence`,
`accessibility`, `audio`, `lighting`, `assets`.

Also here: **impeccable** (HUD craft, not `sim.ts`), **threejs-scene-setup /
gltf / materials**, **input-systems**, **save-systems**, **game-ui-ux**,
**performance-optimization**, **survival-crafting** (genre notes only).

## Vendor packs (`game/.agents/skills/`)

Craft on **this** client, not a new game. Example HDR/PNG binaries were stripped;
re-fetch upstream if you need their example textures.

| Pack | What | Label |
|---|---|---|
| [emalorenzo/three-agent-skills](https://github.com/emalorenzo/three-agent-skills) | `three-best-practices` (vanilla, 100+ rules). **Skipped** `r3f-best-practices` | **TH3-PERF** |
| [noklip-io/agent-skills](https://github.com/noklip-io/agent-skills) | `three-js` vanilla reference (18 docs) | **TH3-CORE** |
| [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills) | `threejs-shaders`, `interaction`, `fundamentals`, `geometry` (no name collisions with the 18 API pack) | **TH3-SHADER / TH3-PICK** |
| [scottstts/Threejs-Awesome-Graphics-Agent-Skills](https://github.com/scottstts/Threejs-Awesome-Graphics-Agent-Skills) | Water, sky, vegetation, shadows, GFX router. Planets / black holes = **SHELF** | **TH3-WATER / TH3-SKY** |
| [PlayableIntelligence/game-creator](https://github.com/PlayableIntelligence/game-creator) | `threejs-perf` (instancing). `threejs-game` = **OVERRIDE** (no new EventBus game) | **TH3-PERF** |
| [chrislaupama/threejs-game-studio](https://github.com/chrislaupama/threejs-game-studio) | Reference manuals. Scaffold script stripped | **OVERRIDE** |
| [CK42BB/procedural-landscapes-threejs](https://github.com/CK42BB/procedural-landscapes-threejs) | Chunked LOD / water notes. Do not replace `heightAt` | **NOTES-ONLY** |
| [majidmanzarpour/threejs-game-skills](https://github.com/majidmanzarpour/threejs-game-skills) | 9: director, gameplay, aaa-graphics, ui, debug, qa, generators | **OVERRIDE** + polish |
| [full-stack-skills/threejs-skills](https://github.com/full-stack-skills/threejs-skills) | 18 API skills (camera, lights, loaders, TSL, …) | **TH3-LOOK** |
| [gamedev-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) | 10 disciplines (no Godot/Unity/FPS) | craft |
| [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | web-design-guidelines, writing-guidelines | HUD |
| [supabase/agent-skills](https://github.com/supabase/agent-skills) | postgres-best-practices | SQL only |
| [microsoft/playwright-cli](https://github.com/microsoft/playwright-cli) | playwright-cli | live-page QA |

Lockfile: `game/skills-lock.json`. Research log: `game/.agents/RESEARCH.md`.

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
- R3F / React Three Fiber
- Colyseus / PlayCanvas — wrong shape or unused engine
- Phaser / Pixi — HUD is DOM, world is Three.js
- OSM / Mapbox / Cesium — we are not rendering Earth
- FPS / platformer / card-game / viral-game / monetize packs
- Impeccable on `sim.ts`

## How to run

- Any harbour work → `two-harbors-job-index` then `two-harbors-director` then the lane
- Economy → `two-harbors-sim` + `two-harbors-economy`
- Canvas polish → `two-harbors-client` then the **TH3-*** label for that job
- HUD chrome → `impeccable` then `two-harbors-hud`
- One slice, harsh critic → `two-harbors-gauntlet`

Stack: [BACKEND.md](BACKEND.md). Kernel: [FOUNDATION.md](FOUNDATION.md). Gauntlet: [GAUNTLET.md](GAUNTLET.md).
