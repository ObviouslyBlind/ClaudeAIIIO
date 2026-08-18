---
name: two-harbors-vendor-overrides
description: >
  How Two Harbors uses installed vendor Three.js / gamedev skills. Use when an AAA
  pack tells you to scaffold, add WASD, OrbitControls, combat, or WebXR.
---

# Vendor skill overrides

Installed under `game/.agents/skills/` (scoped to `game/` files).

**Allowed:** materials, lights, glTF loaders, instancing, geometries, textures,
debug/profiler, QA screenshots, CC0 asset pipelines, HUD accessibility audits,
Postgres indexing notes, Playwright against the live harbour page.

**Forbidden translations of those packs:**

- `threejs-gameplay-systems` scaffold → do not create a sibling Vite game
- `threejs-controls` OrbitControls → play camera is `camera.js`
- `threejs-postprocessing` on Low → off
- `threejs-webxr` → not the play path
- `threejs-game-director` "from scratch arcade" → this shard already ticks
- `game-feel` screenshake/hitstop → tiny paper juice only, never combat
- `fps-shooter` (not installed) — never add
- `create-game-assets` — CC0 / generated into `game/assets/`, not scraped clients
- `supabase-postgres-best-practices` — SQL/index advice, not Supabase product lock-in

Always load `two-harbors-director` first.
