# Two Harbors handover

Two islands and a harbour. Money on screen is **PAPER / SIMULATED**. You are one visitor on this process. Starting cash is **$1,000**. There is no wallet. Restarting play wipes.

The running game is `game/`. Build notes: `game/PLAN.md`. This file is **what is in the harbour right now**.

Checked 2026-08-18 from the live land board (`createLandBoard()`): **766 lots** (South **707**, North **59**). Tests: `cd game && npm test`.

Keep `createWorld` in `game/src/server.ts`. Keep `heightAt` in `game/src/land.ts` and `game/public/harbour/main.js` **the same**.

## Play

You play from **cursor.com/agents** in a browser. Do not send them to localhost.

**https://predict-thunder-buried-income.trycloudflare.com/**

```bash
cd game
npm test
bash scripts/restart-play.sh
```

Restart wipes. After JS/CSS changes, restart `tsx src/server.ts` so the asset stamp changes, then hard-refresh.

If the tunnel dies, point a new tunnel at `http://127.0.0.1:8787` and put the URL here.

## What you do

Spawn on the **South** west quay. Left-click the ground to walk there. Hold right mouse to look around. Scroll to zoom. There is no WASD.

**Lots.** Turn on the Lots chip for outlines. Nearby **$** bars. Click a $ bar or the lot dirt. Yes / No to buy. The quay itself is not for sale.

**Street cart.** Market → Street carts / Stock → pick where it goes (warehouse on the dock, or a van to you). Cart is **$85**. Hotdog pack is **$3** for 20. The van waits on the kerb. **Take all** closes the crate. Place only on a lot you own; Cancel leaves place-mode. Tap the cart to stock. Hire someone on the cart card — it does not sell empty. Type a sticker; **$5.00 is today's price**. Sales tax **20%**. Foot traffic on the road: High / Moderate / Low (Low is red). High density lots stay locked.

**Taxi.** Hail while standing on pavement. Wait **5–30 s** (`Taxi in 0:12`). On the dual highway the cab stops in the **nearer** black lane, never the stone middle, and **picks you up when it arrives**. Left-click does **not** get out. **Exit taxi** is on the dock (`#btn-exit`) and on the map. Taxi while riding opens the destination map again.

**Ferry.** Ticket **$15**. You pay and appear at the other port. There is no waiting on the water yet.

**Build.** After a lease: house, shop, house with shop, farm, warehouse, factory. Tap a building you own to go inside (boxes for rooms). Exit puts you back on that lot.

## South island

West quay at **−2280, 7280**. Looking inland, +X is along Island Hwy, +Z is inland. Volcano in the middle is a no-go.

**Island Hwy** (two lanes each way, stone median) runs quay → **Harbour Circus** → **Cane Circus** → **Ash Circus** → **Haven Circus** → east shore.

Town greens (empty, reserved — no houses on them):

| Town | Where |
|---|---|
| Quayward | just inland of Harbour Circus |
| Canebrake | inland of Cane Circus |
| Saltwind | further south on South Strand |
| Ash Pass | off Ash Circus |
| East Haven | inland of Haven Circus |

**Streets you can stand on:** Quayward Rd, Quayward Loop (a rectangle around the green), South Strand, Palm Arc, Channel Sands, Saltwind High St, Canebrake Rd, Pass Rd, Haven Rd, Haven Crescent, plus lanes and dirt field tracks.

All **707** South lots are vacant. The greens are five reserved plots. Harbour ground at grade **1.28 m** is grass and packed clay. Beach at the water is sand.

Taxi on South follows the same road graph the mesh is built from (62 nodes, 63 edges). Stops: South Port, the four circuses, the five towns, East Shore.

## North island

Smaller. Port at **0, −6950**. **Harbour Rd** inland, then **Market / Mill / Chapel / Weir St**. **16** lots already have NPC houses, shops, farms, a warehouse. **43** stay vacant for you.

The taxi on North still follows the old street lines, not the South-style graph. Sidewalks and town filling on North are not this pass.

## What still looks wrong

At **Quayward Loop** L-corners and the **T** where **South Strand** leaves the loop, the pavement still reads as **two overlapping black rectangles** with a grey/sand hairline, not one corner.

The join code already unions only the last few metres of the **2–4 arms at that corner**, overlaps the stem **1.4 m**, densifies sidewalks to **4 m**, and sits tarmac a hair above the walks. Do **not** glue every road on the island into one pavement blob — that filled the town greens last time. See `game/docs/ROADS.md`.

Also: **Canebrake Rd** and **Haven Crescent** still have turns that are not 15° / 30° / 45° / 90°.

Colours, do not restyle: asphalt `0x141414`, sidewalk `0xb0a48c`, shoulder `0x6f6a5e`.

```bash
cd game && npx tsx scripts/audit-roads.ts
```

## Save

Every ~10 s the process keeps cash, leases, houses you placed, staff slots, and open goods orders. It does **not** keep the hotdog cart, warehouse stock, or van. Restart still wipes the lot. There is a restore hook for that in-memory dump; the live sheet still says restart wipes.

## Do not

- Put a wallet or live trading on this
- Put the old trading-bot folders back
- Start elections, a house of parliament, or councils
- Fill South towns with buildings before the road corners read as one piece
- Merge the whole island’s roads into one blob
- Make left-click get you out of the taxi
- Let `heightAt` drift between server land and harbour `main.js`

## Files

| Thing | Where |
|---|---|
| World + tick | `game/src/server.ts`, `game/src/sim.ts` |
| South land | `game/src/southLand.ts`, `game/src/southGeom.ts` |
| Roads | `game/src/roadGraph.ts`, `game/public/harbour/roadclass.js`, `game/docs/ROADS.md` |
| Taxi | `game/public/harbour/taxi.js`, `game/public/harbour/roadnet.js` |
| Cart loop | `game/src/firstLoop.ts`, `game/public/harbour/chrome.js` |
| Ground paint | `game/public/harbour/shore.js`, `game/public/harbour/main.js` |
| Tests | `game/src/roadGraph.test.ts`, `game/src/taxi-wait.test.ts`, `game/src/shore.test.ts` |

## Next (if nobody names a piece)

1. Make the Quayward Loop corners and the Strand T look like **one** junction.
2. Then straighten Canebrake / Haven Crescent turns to 15 / 30 / 45 / 90.
3. Leave North buildings and elections alone.
