---
name: two-harbors-client
description: Two Harbors Three.js harbour client. Use when building or debugging the 3D view. Sim stays authoritative. Phone 30fps. One mapped control scheme. Not for the tick loop.
---

# Two Harbors client

Read `game/PLAN.md` §3.9–3.10 and `game/BACKEND.md`. Do not start this before the headless sim is honest.

## Job

The canvas shows the island the body is on. It is not the sim.

- Three.js, Vite, glTF kit pieces, InstancedMesh for repeats.
- DOM for HUD, market, planning, Hansard (Impeccable when we craft those).
- Raycast on **primary** (tap / left click) → walk or use.
- **Secondary** (long-press / right click) → extra menu.
- No WASD, no virtual stick, no OrbitControls in play.

## Budget

Phone Chrome is the floor: 30fps in a harbour, ~20 nearby actors, Low tier, no post-process.

If a mesh is off-cell, it is not in the scene. Interest comes from the server; the client does not “also” fetch the other island.

## Do not

- Unity WebGL
- Rendering both islands at once
- Trusting local simulation for cash or stock
- Running `/impeccable craft` on `game/src/sim.ts`
