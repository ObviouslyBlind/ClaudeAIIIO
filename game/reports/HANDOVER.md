# Two Harbors handover

PAPER / SIMULATED harbour MMO shard. One visitor on this process. No wallet. Politics frozen. This repo is **not** a trading bot. There is no Polymarket pipeline, dashboard, or paper ledger here.

Live product is `game/`. Spec: `game/PLAN.md`. Root `CLAUDE.md` is Two Harbors. Skills: `two-harbors-sim`, `-net`, `-map`, `-client`, `-gauntlet`.

## Play

Operator plays from **cursor.com/agents** in a browser. Do not tell them to use localhost.

Public URL (quick tunnel; dies if cloudflared restarts):

**https://predict-thunder-buried-income.trycloudflare.com/**

```bash
cd game
npm test                 # 602 passed at last check
bash scripts/restart-play.sh
```

Restart wipes in-memory play. After JS/CSS changes, restart `tsx src/server.ts` so `ASSET_NONCE` changes, then hard-refresh the public URL.

If the tunnel hostname 404s / does not resolve, start a new quick tunnel to `http://127.0.0.1:8787` and put the new URL here.

## Branch / PR

South land (roads, taxi peel, grass underfoot) is on **`main`** via https://github.com/ObviouslyBlind/ClaudeAIIIO/pull/35.

Keep `createWorld` in `game/src/server.ts`. Keep `heightAt` in `game/src/land.ts` and `game/public/harbour/main.js` **in sync**.

## What the operator can do now

South spawn (`SOUTH_PORT` ≈ `-2280, 7280`). Tap-to-walk. RMB-hold orbit. No WASD.

- **Lots:** nearby $ bars. Click a $ bar or the lot dirt. Buy-ask Yes / No. Market is section → item → deliver-to. Van waits. **Take all** closes the crate card. Place on YOURS; Cancel exits place-mode. Tap the cart to stock. Staff: pick a person on the cart card. Foot traffic High / Moderate / Low (red = Low). High density locked.
- **Taxi:** hail on paved. Dual carriageway: cab stops in the **nearer** lane and **auto-boards** on arrival. Left-click does **not** hop out. **Exit taxi** is on the dock (`#btn-exit`) and on the map overlay. Taxi button while riding reopens the destination map.
- **Harbour Circus:** a right / first exit peels inland (driver-right), not the long northern arc. Cab sits in ring tarmac, not the stone island.
- **Ground:** South harbour grade (`SOUTH_GRADE_Y = 1.28`) paints grass + packed clay, not a sand sheet. True beach (no grade) stays sand.

## Last pixel critic (still open)

Blind South-roads tour **failed** the join bar: Quayward Loop L-corners and the SW T (South Strand into the loop) still read as **two overlapping black rectangles with a grey/sand hairline**, not one hub of tarmac.

Code already tries: hub = Martinez on 2–4 arm-end rects only; stem overlap **1.4 m**; sidewalks densify to **4 m**; hub tarmac `y+0.2` above walks `0.12`. Do **not** “fix” this with island-wide CSG or `trimYielding`. See `game/docs/ROADS.md` and `game/docs/ROAD_MESH.md`.

Road audit leftover (not the taxi drop): Canebrake / Haven Crescent pairwise angles off 15/30/45/90.

## Roads (do not regress)

Graph in `game/src/roadGraph.ts`. Shared by builder, renderer, taxi.

- Opus 5 graph rewrite stays. Quayward Loop is a true rectangle. SW is a T. Quayward Rd hits the north edge at 45° from Harbour Circus.
- Colours: ASPHALT `0x141414`, SIDEWALK `0xb0a48c`, SHOULDER `0x6f6a5e`. Do not change them.
- Dual: cab in a black carriageway, never the stone median.
- Field tracks excluded from taxi. No dirt chords across paved.

Audit: `cd game && npx tsx scripts/audit-roads.ts`

## Do not

- Rebuild a Polymarket / SENTINEL / timer-bot pipeline
- Wallet, private keys, autonomous live trading
- Clone Capital Rift client / Earth / OSM / protocol / branding
- Fan out politics (House / Senate / councils / elections / amendments)
- South buildings this pass (lots + roads + seawall only)
- Island-wide road union
- Make left-click hop out of the taxi again
- Drift `heightAt` between server land and harbour `main.js`

## Key files

| Lane | Where |
|---|---|
| Sim / world | `game/src/server.ts`, `game/src/southLand.ts`, `game/src/southGeom.ts` |
| Roads | `game/src/roadGraph.ts`, `game/public/harbour/roadclass.js`, `game/docs/ROADS.md` |
| Taxi / circus | `game/public/harbour/taxi.js`, `game/public/harbour/roadnet.js` |
| Terrain paint | `game/public/harbour/shore.js`, `game/public/harbour/main.js` `makeTerrain` |
| Tests | `game/src/roadGraph.test.ts`, `game/src/taxi-wait.test.ts`, `game/src/shore.test.ts` |
| Status | this file, `game/reports/GAUNTLET_STATUS.md` |

South coords: Harbour Circus `{-2080, 7440}`; Quayward loop ≈ `{-1960, 7620}`; +Z is inland/south.

## Next (if the operator does not name a piece)

1. Close the visible Quayward Loop / Strand T hairlines **without** island-wide union.
2. Only then: Canebrake / Haven Crescent angle audit.
3. Do not start North buildings or politics.
