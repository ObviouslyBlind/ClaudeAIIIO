---
name: two-harbors-economy
description: >
  Two Harbors headless economy. Use when editing sim.ts tick, NPC books, faucets,
  sinks, price index, or upkeep. Must run at 0 players with finite prices.
---

# Economy

`createWorld` / `tick` in `sim.ts`. 12 goods. Dual books. NPC restock/quote/match.
HUD: money supply, 24h output, price index.

Faucets: NPC buys, NPC wages, tiny new-player cash.
Sinks: sales tax, land upkeep (`upkeep.ts`), planning fees (later), ferry tickets.

Empty-hour test: fast-forward thousands of ticks, zero players, prices finite,
money circulates, index defined (`sim.test.ts`).

Do not put matching on the client. Do not add a 13th good in a drive-by.
