---
name: two-harbors-paper
description: >
  PAPER / SIMULATED money labelling for Two Harbors. Use when showing cash, prices,
  fares, or HUD numbers. No wallet, no live trading.
---

# PAPER / SIMULATED

Every player-facing money string is **PAPER** or **SIMULATED**. Snapshot, map,
ferry, staff, persist, chrome badges, lot `$` tags.

- No wallet, private keys, Stripe, or live trading.
- Do not restore Polymarket / SENTINEL / paper-trading pipelines.
- First-loop sales tax display is 20% to the island bank (hardcoded in
  `firstLoop.ts` today; statute slider is a different path in `sim.ts`).

When adding a new HUD line that includes a number that is cash, prefix it.
