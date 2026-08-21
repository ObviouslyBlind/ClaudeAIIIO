# 2Isles handover

PAPER / SIMULATED. No wallet. One visitor on this process. Politics frozen.

Public name **2Isles**. Spec still says Two Harbors in places; same game.

**Mid-alpha (2026-08-20).** The harbour loop is the base. We build features on it. We do not reopen the foundation, clone Capital Rift, or unfreeze House / Senate / councils / elections.

**Version: Alpha 0.5.1** — the **buildings push**, **playable**. Spawn **$10,000**. Split Lots / Properties / Landlord. Confirm buy, enter that room, Place from inventory, tenant profiles, South quay walkers. Not Blender. [VERSION.md](VERSION.md). Beta is **1.0**.

Doc map: [README.md](README.md) · spec: [../PLAN.md](../PLAN.md) · play: [PLAY.md](PLAY.md) · money: [../ECONOMY.md](../ECONOMY.md) · units: [UNITS.md](UNITS.md)

---

## How we work

You are a game dev. Work the task that is set. Do not deviate. Gauntlet loops until the bar is honest.

**Read every feature out in this file before implementing it.** Do not jump to 3D, Blender, or dollhouse chrome because it looks like content.

Visual buildings: the operator will mock a few simple shells in **Blender**. Do not spend a design pass on façades. **0.5.1 is the whole buildings push** — sim, grey boxes, confirm buy, **enter that room**, Place from inventory, tenant profiles, South walkers, **dollhouse camera** (RMB-hold orbit around that flat). Blender files when the operator has them.

Always update this handover when the live loop, version, play URL, or next piece changes.

When you report to the operator, **always send the public play URL and the PR**. Never the PR alone.

---

## Play

Operator plays from the public URL, not localhost.

**https://informal-purse-minds-loading.trycloudflare.com/**

```bash
cd game
npm test
bash scripts/restart-play.sh
```

Restart wipes in-memory play. After harbour JS/CSS, restart so `ASSET_NONCE` changes, then **hard-refresh**.

**Alpha wipe.** Spawn / hard-refresh is a fresh visitor (starter cash, no leases, no stands, no warehouse). Do not restore `persist.lastBlob` onto the live visitor. `POST /api/persist/restore` is refused.

If this tunnel dies, start a new quick tunnel to `http://127.0.0.1:8787` and put the new URL here.

Keep `createWorld` in `game/src/server.ts`. Keep `heightAt` in `game/src/land.ts` and `game/public/harbour/main.js` in sync.

---

## What is live

South spawn. Tap-to-walk. RMB-hold orbit. No WASD.

| Piece | What it does |
|---|---|
| Land | $ bars buy. Street lots dear. Highway **cart pads $750**, max three, carts only. |
| Market | Left rail Marketplace. Dest sheet: **Bring to me** or **Warehouse**. Pay disabled until dest is chosen. |
| Inventory | Kits and stock **on you**. Place from here. |
| Warehouse | Dock storage. **Sell** / **Bring to me**. No Place. $5/sim day while occupied. |
| Books | Business terminal. Compact on the left rail; **Open books** expands like Marketplace. P&L from the sim. |
| Place | Green cart ghost. Hold **R** to rotate. Pads snap to the dirt. Place consumes **inventory only**. |
| Pickup | Packs kit + leftover stock into the warehouse. Land stays yours. Then Bring to me to Place again. |
| Site card | Stock · Run · Upgrades · Stats. Hire $300. Play shifts while unhired. |
| Hire | Left-rail Hire sheet, or Run tab on the cart. |
| Account | #0002. Look swatches. Reset / delete. Cash chip expands to holdings. |
| Units (0.5.1) | Three grey shells next to the **$750 spawn pads**. **Lots** is dirt and pads only. **Properties** cycles for-sale → your rooms (does **not** turn on from Lots). **Landlord** is the $15,000 dirt confirm — spawn cannot afford it and does not need it. Point at a vacant room: that box goes green; buy is a confirm; camera **enters that room**. **Exit room** is the only dump. Shopfit / Hospitality Place from inventory. Scout returns 1–3 tenant profiles. South quay walkers. |

Starter: cash **$10,000**. Pad **$750**. Fruit kit **$90**, pack **$14** / 20. Today fruit **$6**, tax **8%**. A shop room is **$1,200**. Building dirt is **$15,000**. Hire **$300**.

Controls: primary tap/click walks or uses. Secondary long-press / right-click extra. Taxi on paved. Ferry $15 (North kit is closed until you ferry).

---

## Branch

Working branch for this slice: **`cursor/units-gameplan-3924`**. PR: **https://github.com/ObviouslyBlind/ClaudeAIIIO/pull/60**.

Tests: `cd game && npm test` — **781 passed** (2026-08-21).

---

## Key files

| Lane | Where |
|---|---|
| Sim / first loop | `src/server.ts`, `src/firstLoop.ts`, `src/economy.ts` |
| Units HUD | `public/harbour/units-hud.js`, `unit-blocks.js`, `unit-dollhouse.js` |
| Books / HUD | `public/harbour/books-hud.js`, `chrome.js`, `index.html` |
| Place | `public/harbour/place-pose.js`, `place-preview.js`, `main.js` |
| Stocks | `src/stocks.ts` (wired on `createWorld`) |
| Land / pads | `src/land.ts`, `src/southLand.ts`, `src/landPrice.ts` |
| Roads / taxi | `src/roadGraph.ts`, `public/harbour/taxi.js` |
| Kernel | `src/kernel/` |
| Version | `docs/VERSION.md` |

---

## Next (features on the base)

Do these in order unless the operator names a piece. Politics stay frozen. **Read the piece out before coding it.**

1. **Blender shells** — when the operator has files. Do not design façades in code. The room loop is live; do not ship another kitchen-sink sheet.
2. **Durable persist** — Postgres (PLAN step C). Restart must not wipe a mid-alpha shard once accounts exist. Alpha spawn wipe can stay until then.
3. **North harbour pass** — sidewalks and kit, not a second sim.
4. **Player listing** — seventh PAPER tape row after a size gate. Not a wallet ticker.

Known polish (not the product next): road hub hairlines at a few South joins. Do not “fix” with island-wide CSG. See [ROADS.md](ROADS.md) and [ROAD_MESH.md](ROAD_MESH.md).

---

## Do not

- Restore Polymarket / SENTINEL / a paper-trading pipeline / GitHub Pages dashboard
- Wallet, private keys, live trading
- Clone Capital Rift client / Earth / OSM / protocol / branding
- Fan out House / Senate / councils / elections / amendments
- Place from the warehouse
- Default market dest back to warehouse
- Drift `heightAt` between `land.ts` and harbour `main.js`
- Restart a pixel-critic swarm unasked
- Invent a second inflation index or live stock quotes
- Spend a design pass on building meshes — Blender comes from the operator
- Drop live starter cash back to $1,000 while 0.5.1 is the play
