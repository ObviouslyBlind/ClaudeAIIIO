---
name: two-harbors-sim
description: Build the Two Harbors persistent economy and politics sim. Use when working in game/, on ticks, markets, statutes, firms, elections, or the 3D client. Follow game/PLAN.md. Do not skip to 3D before the headless sim moves prices.
---

# Two Harbors sim

Read `game/PLAN.md` before writing game code. That file is the spec. Stack and map: `game/BACKEND.md`.

## Now

We are on **step A**: a headless 1Hz sim, 12 goods, NPC supply/demand, money supply and a price index. No Three.js, no House, no HUD chrome.

Prove it with tests: fast-forward thousands of ticks with **zero players**. Prices stay finite. Money circulates. The index is defined.

## Rules

- The server owns time, prices, inventories, votes. The client only sends intents.
- The world ticks at 0 players. Never wait on a human minigame for production.
- One control scheme later: primary = tap/left click, secondary = long-press/right click. No WASD, no virtual stick.
- Do not clone Capital Rift. Original islands, original UI, original code.
- Impeccable is installed for later UI work. Do not run `/impeccable craft` on the sim. Use it when we build Hansard, market sheet, or the 3D HUD.

## Stack

- TypeScript, Vitest, Node 22
- Code lives under `game/`
- Run `npm test` in `game/` after sim changes

## Later steps (do not jump)

B statutes → C player sites → D second island → E firms → F planning → H House → L 3D.
