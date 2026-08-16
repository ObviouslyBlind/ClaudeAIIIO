# Two Harbors

Persistent browser economy + politics game. Spec: [PLAN.md](PLAN.md). Backend: [BACKEND.md](BACKEND.md). Skills: [SKILLS.md](SKILLS.md). Gauntlet: [GAUNTLET.md](GAUNTLET.md).

## Now (step A)

Headless sim. No 3D. No players.

```bash
cd game
npm install
npm test
npm run tick        # 1 simulated hour
npm run tick -- 2   # 2 hours
```

HUD fields: `moneySupply`, `goodsProducedWindow`, `priceIndex`.

## Paper HUD (browser)

Not the 3D game. A live ticker plus tap-to-buy at last price.

```bash
cd game
npm run play          # http://localhost:8787
```

Labelled PAPER / SIMULATED. Visitor starts with $1,000. The world still ticks if nobody clicks.
