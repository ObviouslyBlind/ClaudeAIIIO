---
name: two-harbors-terrain
description: >
  Two Harbors terrain paint, shore, grass, clay, water, sky. Use when editing
  makeTerrain, shore.js, water.js, sky.js. South grade is grass/clay not sand.
---

# Terrain paint

- Harbour grade → grass + packed clay (`shore.js` / `makeTerrain`).
- Beach at water without grade → sand.
- Channel water plane: `water.js`. Sky: `sky.js`.
- Printed-map greens so the plat reads on top of terrain.
- Instanced props (`props.js`) off-road and off-parcel.

Do not flatten the volcano. Do not open the cove into an inland lake.
`heightAt` sync still applies.
