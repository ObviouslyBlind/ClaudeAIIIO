# Two Harbors

Persistent browser economy + politics game. Spec: [PLAN.md](PLAN.md). Backend: [BACKEND.md](BACKEND.md). Skills: [SKILLS.md](SKILLS.md).

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
