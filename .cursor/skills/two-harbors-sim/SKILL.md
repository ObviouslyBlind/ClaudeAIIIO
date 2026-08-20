---
name: two-harbors-sim
description: Build the Two Harbors persistent economy and politics sim. Use when working in game/, on ticks, markets, statutes, firms, elections, or the 3D client. Follow game/PLAN.md. Do not skip to 3D before the headless sim moves prices.
---

# Two Harbors sim

Read `game/PLAN.md` before writing game code. That file is the spec. Stack and map: `game/BACKEND.md`. Doc map: `game/docs/README.md`. Live status: `game/docs/HANDOVER.md`.

## Now

**Mid-alpha.** The harbour loop is the base (land, pad, fruit cart, hire, sticker, Books). Next work is **features on that base**, not a new foundation and not step-A from scratch. Politics (House / Senate / councils / elections) stay frozen until the loop is honest.

Prove sim changes with tests. Prices stay finite. Money is PAPER / SIMULATED. The browser is a camera.

## Rules

- The server owns time, prices, inventories, votes. The client only sends intents.
- The world ticks at 0 players. Never wait on a human minigame for production.
- One control scheme later: primary = tap/left click, secondary = long-press/right click. No WASD, no virtual stick.
- Do not clone Capital Rift. Original islands, original UI, original code.
- Impeccable is installed for later UI work. Do not run `/impeccable craft` on the sim. Use it when we build Hansard, market sheet, or the 3D HUD.
- **Alpha wipe.** Harbour spawn is a fresh visitor (starter cash, no leases, no stands, no warehouse). Do not restore `persist.lastBlob` onto the live visitor. Refuse `POST /api/persist/restore`. Hard-refresh / spawn wipes even if the play process stayed up.

## Stack

- TypeScript, Vitest, Node 22
- Code lives under `game/`
- Run `npm test` in `game/` after sim changes

## Later steps (do not jump)

B statutes → C player sites → D second island → E firms → F planning → H House → L 3D.
