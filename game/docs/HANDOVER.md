# 2Isles handover

PAPER / SIMULATED. No wallet. One visitor on this process. Politics frozen.

Public name **2Isles**. Spec still says Two Harbors in places; same game.

**Mid-alpha (2026-08-20).** The harbour loop is the base. We build features on it. We do not reopen the foundation, clone Capital Rift, or unfreeze House / Senate / councils / elections.

Doc map: [README.md](README.md) · spec: [../PLAN.md](../PLAN.md) · play: [PLAY.md](PLAY.md) · money: [../ECONOMY.md](../ECONOMY.md)

---

## Play

Operator plays from the public URL, not localhost.

**https://physics-sitting-scholar-fridge.trycloudflare.com/**

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
| Economy HUD | PAPER index, land-ask index, NPC money supply, output. Six PAPER listings on Books. |

Starter: cash **$1000**. Pad **$750**. Fruit kit **$90**, pack **$14** / 20. Today fruit **$6**, tax **8%**. Melon and fry kits sit above starter cash. Hire after first sales.

Controls: primary tap/click walks or uses. Secondary long-press / right-click extra. Taxi on paved. Ferry $15 (North kit is closed until you ferry).

---

## Branch

Working branch for this mid-alpha slice: **`cursor/highway-pads-1949`**.

Tests: `cd game && npm test` — **739 passed** (2026-08-20).

---

## Key files

| Lane | Where |
|---|---|
| Sim / first loop | `src/server.ts`, `src/firstLoop.ts`, `src/economy.ts` |
| Books / HUD | `public/harbour/books-hud.js`, `chrome.js`, `index.html` |
| Place | `public/harbour/place-pose.js`, `place-preview.js`, `main.js` |
| Stocks | `src/stocks.ts` (wired on `createWorld`) |
| Land / pads | `src/land.ts`, `src/southLand.ts`, `src/landPrice.ts` |
| Roads / taxi | `src/roadGraph.ts`, `public/harbour/taxi.js` |
| Kernel | `src/kernel/` |

---

## Next (features on the base)

Do these in order unless the operator names a piece. Politics stay frozen.

1. **Shops that sell** — developed shop lots use the same site card and books row; stocker jobs from [MARKETPLACE.md](../MARKETPLACE.md).
2. **Durable persist** — Postgres (PLAN step C). Restart must not wipe a mid-alpha shard once accounts exist. Alpha spawn wipe can stay until then.
3. **Interiors you can buy into** — NPC town rooms as PAPER units, before player-designed buildings.
4. **Shopfit / farming / aggregates aisles** — only when that lot type exists. Honest empty until then.
5. **North harbour pass** — sidewalks and kit, not a second sim.
6. **Player listing** — seventh PAPER tape row after a size gate. Not a wallet ticker.

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
