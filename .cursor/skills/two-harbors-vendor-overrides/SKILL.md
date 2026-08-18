---
name: two-harbors-vendor-overrides
description: >
  How Two Harbors uses installed vendor Three.js / gamedev skills. Use when an AAA
  pack tells you to scaffold, add WASD, OrbitControls, combat, or WebXR.
---

# Vendor skill overrides

Installed under `game/.agents/skills/` (scoped to `game/` files).

Grab list: `two-harbors-job-index`. Director first: `two-harbors-director`.

**Allowed:** materials, lights, glTF loaders, instancing, geometries, textures,
GLSL/TSL notes, water/sky recipes, debug/profiler, QA screenshots, CC0 asset
pipelines, HUD accessibility audits, Postgres indexing notes, Playwright against
the live harbour page.

**Forbidden translations of those packs:**

- `threejs-gameplay-systems` / `threejs-game` / `threejs-game-studio` scaffold → do not create a sibling Vite game (`create-threejs-game` was removed)
- `threejs-controls` / noklip `three-js` OrbitControls → play camera is `camera.js`
- `threejs-camera-direction` chase/orbit rigs → RMB-hold orbit already exists
- `threejs-postprocessing` / `threejs-bloom` / SSAO on Low → off
- `threejs-webxr` → not the play path
- `threejs-game-director` "from scratch arcade" → this shard already ticks
- `threejs-spectral-ocean` FFT on phone Low → do not make FFT the default sea
- `procedural-landscapes` / `threejs-procedural-planets` → do not replace authored `heightAt`
- `threejs-raymarched-space-effects` → shelf; not a harbour
- `r3f-best-practices` → not installed; do not add React
- `game-feel` screenshake/hitstop → tiny paper juice only, never combat
- `fps-shooter` (not installed) — never add
- `create-game-assets` — CC0 / generated into `game/assets/`, not scraped clients
- `supabase-postgres-best-practices` — SQL/index advice, not Supabase product lock-in

Example textures from the graphics pack were stripped. If an example needs an
HDR/PNG, fetch that file from the upstream repo; do not invent a new game to
hold it.

Always load `two-harbors-director` first.
