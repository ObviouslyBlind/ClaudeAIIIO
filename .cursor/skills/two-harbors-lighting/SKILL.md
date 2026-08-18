---
name: two-harbors-lighting
description: >
  Two Harbors harbour lighting. Use when editing lights, window emissives, or
  night. Phone Low tier: cheap lights, instancing, no heavy post-process.
---

# Lighting

Pair `threejs-materials-lighting` / `threejs-lights` with the phone budget.

- Window emissives trickle: `window-lights.js`.
- Low: hemisphere + one directional, no cascade shadows.
- Medium/High may add shadows and env. Do not make Low look black.
- Night hours are a statute later; do not build a day/night cycle that tanks fps.

If a mesh is black, check lights + `MeshStandardMaterial` vs `MeshBasicMaterial`
before adding more directional lights.
