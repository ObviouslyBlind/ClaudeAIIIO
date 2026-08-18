---
name: two-harbors-camera
description: >
  Two Harbors play camera. Use when editing camera.js, zoom, RMB orbit, follow
  capsule. Not OrbitControls. Not FPS mouse-look.
---

# Play camera

`game/public/harbour/camera.js` `createPlayCamera`.

- RMB-hold orbit. Wheel zoom 9–650 m. Pitch 0.12–1.45.
- Follows the player capsule. First frame: `first-frame.js` south port.
- `threejs-controls` documents OrbitControls — **do not** wire those in play.
  MapControls / FlyControls / PointerLock are also wrong.
- Secondary look is already RMB. Primary is tap-to-walk.

Phone: same camera, lower DPR / Low tier. Do not add a second desktop camera.
