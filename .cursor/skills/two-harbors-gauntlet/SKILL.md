---
name: two-harbors-gauntlet
description: Run a constrained Gauntlet Loop on one Two Harbors piece. Builder and blind critic, real bar, ratchet. Never use Capital Rift or Call of Duty as the visual bar. Never skip PLAN.md.
---

# Two Harbors Gauntlet

Read `game/GAUNTLET.md` and `game/PLAN.md` first.

This is Matt Shumer’s builder/critic loop with our brakes on.

## When to use

Only on **one** named piece that already has a running artifact or a test the critic can execute. Examples: paper HUD tap-to-buy, a statute slider, a harbour chunk.

## Bar (pick one, inspectable)

- Sim: `cd game && npm test` plus `npm run tick` JSON
- HUD: the live page, phone width, PAPER/SIMULATED visible, Buy 1 fills
- 3D: our previous-best screenshot + 30fps harbour, original islands

Forbidden bars: Capital Rift, Call of Duty, OSM Earth, “looks AAA.”

## Loop

1. Lead splits the piece smaller if needed.
2. Builder ships a real artifact (code that runs).
3. Fresh critic: no builder notes. Compare against the bar. Blind A/B when there are two screenshots.
4. If we lose, keep the prior best. Fix the single largest gap.
5. Update a short `game/reports/GAUNTLET_STATUS.md` each round.
6. Stop when the user stops it, or when the critic cannot name a gap worth the cost.

## Do not

- Fan out a whole FPS
- Let the critic grade a summary
- Rewrite `BACKEND.md` as a side effect
- Run uncapped overnight without a status page
