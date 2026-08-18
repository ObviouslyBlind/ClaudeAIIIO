---
name: two-harbors-staff
description: >
  Two Harbors staff hire/fire and AI workers. Use when editing staff.ts, staff HUD,
  or stand hire. Sim must not wait on a human minigame.
---

# Staff

Live: `staff.ts` + `POST /api/staff` on developed plots; first-loop `hireStand()`.
HUD: `staff-hud.js`, cart card person picker.

`labour.ts` ranks (Worker → President), 3-job cap, human shift bonus: **tests
only**. When you wire it: AI completes the job on the tick; a human shift is
extra cash; disconnect never reduces output.

Foot traffic High / Moderate / Low on the cart card (red = Low).
