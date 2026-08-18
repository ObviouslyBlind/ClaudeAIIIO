# Two Harbors — Fable 5

This repo is a harbour MMO shard, not a loop game and not a trading bot.
There is no Polymarket code, SENTINEL dashboard, or paper-trading pipeline here. Do not put them back.
One shard. The sim owns cash, plots, staff, and prices. The browser is a camera.

## What to build
- Headless 1Hz sim in `game/src/`
- 3D harbour camera in `game/public/harbour/`
- Kernel contracts in `game/src/kernel/` (plots, players, minerals, interest)
- PAPER / SIMULATED only. No wallet. No live trading.

## Do
- Follow `game/PLAN.md` and `game/FOUNDATION.md`
- Skills: `game/SKILLS.md`. Start with `two-harbors-director` (overrides arcade Three.js packs)
- Keep `createWorld` in `game/src/server.ts`
- Keep `heightAt` in `game/src/land.ts` and `game/public/harbour/main.js` in sync
- Label money PAPER / SIMULATED
- After play changes: `cd game && npm test`

## Do not
- Clone Capital Rift’s client, Earth map, OSM, or protocol
- Add House / Senate / councils / elections until the harbour loop is honest
- Put the economy in Colyseus rooms
- Merge first-loop / dressing side branches into this tree
- Restart the pixel-critic swarm

## Play
`cd game && npm run play` then `npm run play:laptop` for a laptop/phone URL.
South spawn. Click a $ tag to buy. Lots overlay: click the lot dirt. Restart wipes.
