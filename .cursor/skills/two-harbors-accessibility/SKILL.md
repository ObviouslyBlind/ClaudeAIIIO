---
name: two-harbors-accessibility
description: >
  Two Harbors accessibility for HUD and harbour. Use when labels, focus, contrast,
  reduced motion, or tap targets. Paper HUD must work without the 3D scene.
---

# Accessibility

- Lot `$` bars and dock buttons need names, not colour-only (foot traffic red =
  Low also has the word Low).
- Tap targets thumb-sized. Safe area.
- `prefers-reduced-motion`: skip camera juice / traffic smear.
- Market/planning must work in portrait without entering a 3D hall (PLAN M).
- Keyboard: HUD widgets first; 3D stays click/tap. Do not require WASD.

Load `web-design-guidelines` for the DOM HUD. Do not apply Godot UI examples
from `game-ui-ux` literally — this HUD is HTML/CSS.
