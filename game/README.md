# Two Harbors

Persistent browser economy + politics game. Spec: [PLAN.md](PLAN.md). Backend: [BACKEND.md](BACKEND.md). Land: [LAND.md](LAND.md). Roadmap: [ROADMAP.md](ROADMAP.md). Skills: [SKILLS.md](SKILLS.md). Gauntlet: [GAUNTLET.md](GAUNTLET.md).

The whole island is a priced parcel map now: every lot drawn with boundary ink and a PAPER price tag (`YOURS` on your leases). Wheel zooms out to map height. Each island starts with an NPC town.

## Now

Headless sim plus a **basic 3D harbour**: two Caribbean-scale islands, a port on each, paper plot leases. No wallet. No live trading.

```bash
cd game
npm install
npm test
npm run tick        # 1 simulated hour
npm run play        # http://localhost:8787  (3D harbour)
```

From a **Cursor cloud agent**: plug icon (top-right of the agent panel) → make sure **8787** is forwarded → open `http://localhost:8787/`. If you are on cursor.com/agents in a browser only, 8787 is not on your laptop — use the agent Ports / Simple Browser.

Open `/` for the harbour. Tap a **piece of land** (not a given lot card), Lease, then Develop. **Ferry** near a port quotes the North ↔ South crossing (PAPER $15) before travel. **Taxi** rides the paved road only (PAPER). `/market/` is the paper goods HUD; cash is shared. Labelled PAPER / SIMULATED.

Visitor starts with $1,000. Tap ground to walk. The world still ticks if nobody clicks.

## Headless sim

HUD fields: `moneySupply`, `goodsProducedWindow`, `priceIndex`.

```bash
npm run tick -- 2   # 2 hours
npm run dump-plots  # rewrite assets/maps/*/plots.json from src/land.ts
```
