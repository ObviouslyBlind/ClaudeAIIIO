---
name: two-harbors-audio
description: >
  Two Harbors harbour audio. Use when adding SFX, ambience, or taxi/ferry cues.
  Keep it light on phone. Prefer CC0 / local; API generators are optional.
---

# Audio

Today: `paper-sfx.js` (paper buy). Not a full bus.

When adding: harbour bed (low), taxi hail/arrive, ferry horn, UI ticks.
Respect `prefers-reduced-motion` adjacent to `web-design-guidelines`; mute
toggle on the HUD.

Use `threejs-audio` for positional listeners on the camera rig.
`threejs-audio-generator` needs ElevenLabs — optional. Do not block play on keys.
Do not autoplay loud music on spawn.
