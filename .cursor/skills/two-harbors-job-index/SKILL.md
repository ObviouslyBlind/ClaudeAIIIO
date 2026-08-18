---
name: two-harbors-job-index
description: >
  Job → skill grab list for Two Harbors. Use first when you need to know which
  skills to open for roads, taxi, lots, water, HUD, tick, phone, or Three.js
  work. Do not scaffold a new game. Two Harbors director still wins.
---

# Job index — grab these

Open **this file** plus `two-harbors-director`. Then open **only** the lane
below. Do not load every vendor pack.

Paths:

- Harbour rules: `.cursor/skills/two-harbors-*/SKILL.md`
- Vendor Three.js: `game/.agents/skills/<name>/SKILL.md`
- Catalog: `game/SKILLS.md`

Two Harbors **wins** if a vendor pack disagrees (WASD, OrbitControls, new Vite
app, bloom on Low, WebXR, planets, both islands at once).

## Grab by job

| Job | Open these, in order |
|---|---|
| **Roads / kerbs / joins** | `two-harbors-roads` → `two-harbors-director` |
| **Taxi (hail, peel, board, exit)** | `two-harbors-taxi` → `two-harbors-controls` |
| **Lots / $ tags / lease** | `two-harbors-lots` → `threejs-interaction` |
| **Click / raycast / tap** | `two-harbors-controls` → `threejs-interaction` → `threejs-objects` |
| **Height / beach / grass** | `two-harbors-height` → `two-harbors-terrain` → `two-harbors-map` |
| **Water / pier / ocean** | `two-harbors-client` → `threejs-water-optics` → `threejs-spectral-ocean` |
| **Sky / fog / haze** | `two-harbors-lighting` → `threejs-atmosphere-aerial-perspective` → `threejs-scenes` |
| **Buildings that work** | `two-harbors-buildings` → `two-harbors-first-loop` |
| **glTF kits / props** | `two-harbors-assets` → `threejs-gltf-loading` → `threejs-loaders` |
| **HUD / menus** | `two-harbors-hud` → `impeccable` → `game-ui-ux` → `web-design-guidelines` |
| **Phone / 30fps / Low** | `two-harbors-phone` → `three-best-practices` → `threejs-perf` |
| **Camera (RMB orbit)** | `two-harbors-camera` → `input-systems` — never `threejs-controls` OrbitControls in play |
| **Tick / prices / books** | `two-harbors-sim` → `two-harbors-economy` → `two-harbors-market` |
| **Ferry / North vs South** | `two-harbors-ferry` → `two-harbors-north-south` → `two-harbors-chunking` |
| **Interest / AOI / sockets** | `two-harbors-interest` → `two-harbors-net` → `two-harbors-presence` |
| **NPC town** | `two-harbors-npc-town` → `game-ai` |
| **Staff / chains** | `two-harbors-staff` → `two-harbors-production` |
| **Save / wipe / Postgres** | `two-harbors-persist` → `save-systems` → `supabase-postgres-best-practices` (SQL only) |
| **Shaders / GLSL** | `threejs-shaders` → `shader-programming` → `threejs-node-tsl` |
| **Instancing / draw calls** | `threejs-perf` → `threejs-geometry` → `three-best-practices` |
| **Grass / trees (later)** | `two-harbors-terrain` → `threejs-procedural-vegetation` — do not replace `heightAt` |
| **Audio** | `two-harbors-audio` → `audio-design` |
| **Tests** | `two-harbors-tests` → `playwright-cli` |
| **One slice, harsh critic** | `two-harbors-gauntlet` |
| **Paper money labels** | `two-harbors-paper` |
| **Politics** | `two-harbors-frozen-politics` — catalog only, do not seat offices |

## Three.js packs — labels

| Label | Skills | When |
|---|---|---|
| **TH3-CORE** | `three-js` (noklip vanilla refs), `three-best-practices`, `threejs-fundamentals`, `threejs-scene-setup` | Any harbour canvas change |
| **TH3-PICK** | `threejs-interaction` | $ tags, lots, walk tap |
| **TH3-MESH** | `threejs-geometry`, `threejs-geometries`, `threejs-objects`, `threejs-math` | Custom meshes, instancing |
| **TH3-LOOK** | `threejs-materials`, `threejs-materials-lighting`, `threejs-lights`, `threejs-textures`, `threejs-loaders` | Surfaces, lights, glTF |
| **TH3-WATER** | `threejs-water-optics`, `threejs-spectral-ocean` | Sea, pier chop, shallows |
| **TH3-SKY** | `threejs-atmosphere-aerial-perspective`, `threejs-scenes` (fog) | Distance haze, not a planet |
| **TH3-SHADER** | `threejs-shaders`, `shader-programming`, `threejs-node-tsl` | Custom GLSL/TSL |
| **TH3-PERF** | `threejs-perf`, `three-best-practices`, `performance-optimization`, `threejs-debug-profiler` | Frame time, InstancedMesh |
| **TH3-GFX-ROUTER** | `threejs-skill-router` | Split a visual ask into the smallest graphics skills |
| **HIGH-ONLY** | `threejs-bloom`, `threejs-postprocessing`, `threejs-screen-space-ambient-occlusion`, `threejs-volumetric-clouds` | Never on phone Low. Default harbour is Low, no post-process |
| **NOTES-ONLY** | `procedural-landscapes`, `threejs-procedural-fields`, `threejs-procedural-materials` | LOD/noise ideas. **Do not** replace authored `heightAt` |
| **SHELF** | `threejs-procedural-planets`, `threejs-raymarched-space-effects`, `threejs-webxr` | Installed so you can find them. **Do not use** on this harbour |
| **OVERRIDE** | `threejs-game-director`, `threejs-game`, `threejs-game-studio`, `threejs-gameplay-systems`, `threejs-controls`, `threejs-camera-direction` | Craft notes only. No new Vite game, no WASD, no OrbitControls in play |

## Do not install / do not grab

- R3F / React Three Fiber (`r3f-best-practices`) — this client is vanilla JS
- Godot, Unity, Unreal, Roblox, Phaser, Pixi as the world
- Colyseus rooms, OSM / Mapbox / Cesium
- FPS / platformer / card-game / viral-game / monetize packs
- Impeccable on `sim.ts`

## After play JS/CSS

`cd game && npm test`. Restart play so `ASSET_NONCE` changes.
