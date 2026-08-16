# Two Harbors

Persistent browser economy + politics game. Spec: [PLAN.md](PLAN.md). Backend: [BACKEND.md](BACKEND.md). Land: [LAND.md](LAND.md). Skills: [SKILLS.md](SKILLS.md). Gauntlet: [GAUNTLET.md](GAUNTLET.md).

## Now

Headless sim plus a **basic 3D harbour**: two Caribbean-scale islands, a port on each, paper plot leases. No wallet. No live trading.

```bash
cd game
npm install
npm test
npm run tick        # 1 simulated hour
npm run play        # http://localhost:8787  (3D harbour)
```

Open `/` for the harbour. `/market/` is the paper goods HUD. Cash is shared. Labelled PAPER / SIMULATED.

Visitor starts with $1,000. Tap ground to walk. Tap a vacant plot, then Lease. Tap the port to ferry. The world still ticks if nobody clicks.

## Headless sim

HUD fields: `moneySupply`, `goodsProducedWindow`, `priceIndex`.

```bash
npm run tick -- 2   # 2 hours
npm run dump-plots  # rewrite assets/maps/*/plots.json from src/land.ts
```
