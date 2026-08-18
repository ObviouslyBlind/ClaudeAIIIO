---
name: two-harbors-assets
description: >
  Two Harbors glTF / kit assets. Use when importing CC0 models, Kenney kits, or
  sizing doors to the player capsule. License-safe only. No Capital Rift assets.
---

# Assets

ROADMAP: replace box shells with CC0 glTF into `game/assets/models/`.

- Kenney Modular Buildings / City Kit (CC0)
- Quaternius Downtown City MegaKit free tier (CC0)
- poly.pizza filter CC0 for one-offs
- Load via `threejs-gltf-loading` + `threejs-loaders`. Instance repeats.
- Door ≈ 2.1 m vs 1.7 m capsule. Check at spawn distance.

`threejs-3d-generator` / image generator need API keys. Prefer CC0 kits first.
Never fetch or reverse Capital Rift's client, assets, or protocol.
`assets/maps/` today is JSON plots only — no height.png / harbour.glb yet.
