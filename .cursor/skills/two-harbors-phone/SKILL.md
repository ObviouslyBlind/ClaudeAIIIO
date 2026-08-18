---
name: two-harbors-phone
description: >
  Two Harbors phone baseline. Use when touching HUD layout, fps cap, touch
  targets, safe area, or quality tiers. Phone Chrome 30fps is the floor.
---

# Phone floor

PLAN §3.9–3.10. Quality tiers Low / Medium / High. Phone default **Low**,
**30fps cap**, no post-process on Low.

- One control scheme: primary = tap/left click, secondary = long-press/right click.
- No virtual stick. No WASD.
- Safe-area insets for notches. Thumbs hit the same widgets as a cursor.
- Do not upload the whole heightmap. Chunk. ~20 nearby actors.
- Long-press Examine (~400ms) is **not implemented** yet — only `contextmenu`
  suppressed. When you add secondary, map it; do not add a third verb.

Test at phone width. `playwright-cli` / `threejs-qa-release` against the live
harbour page, not a summary.
