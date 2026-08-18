---
name: two-harbors-chunking
description: >
  Two Harbors chunked island loading. Use when splitting terrain, plots, or
  instanced props so phones do not load both islands. Mandatory.
---

# Chunking

BACKEND: never send the full heightmap. Client loads visible chunks + one ring.

Today the harbour still builds large procedural meshes per island in `main.js`
(`island lazy-build`). Interest API is the server-side half.

When adding North graph + South NPC town, do not also upload both landmasses
to a phone at spawn. Spawn island only; ferry loads the other.
