---
name: two-harbors-kernel
description: >
  Two Harbors shard kernel K.1. Use when editing players, plots, interest, events,
  minerals, menus. Cap 500 players. Do not skip unique plots or persist buildings.
---

# Kernel K.1

`game/src/kernel/`. Version string `K.1`. Next bump is `K.2`, not a rewrite of
`sim.ts`. Spec: `game/FOUNDATION.md`.

| Module | Live? |
|---|---|
| plots | Yes — unique ids, overlap tests, 64 m index |
| minerals | Yes — `/api/minerals`, ore on fields |
| events | Partial — lease/develop/hire/fire |
| interest | API only — client still uses full `/api/map` |
| menus | Client `menu-stack.js`; server does not own chrome |
| players | **Test-only.** Server is one hardcoded `visitor` |

Interest: plot cell 64 m, actor cell 250 m, indoors silent, other island
invisible until ferry.

Play restart **wipes**. Persist blob round-trips buildings for later Postgres.
