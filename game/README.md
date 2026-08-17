# Two Harbors

Persistent browser economy + politics game. Spec: [PLAN.md](PLAN.md). Backend: [BACKEND.md](BACKEND.md). Land: [LAND.md](LAND.md). Kernel: [FOUNDATION.md](FOUNDATION.md). Roadmap: [ROADMAP.md](ROADMAP.md). Skills: [SKILLS.md](SKILLS.md). Gauntlet: [GAUNTLET.md](GAUNTLET.md).

The whole island is a priced parcel map now: every lot drawn with boundary ink and a PAPER price tag (`YOURS` on your leases). Wheel zooms out to map height. Each island starts with an NPC town.

## Now

Headless sim plus a **basic 3D harbour**: two Caribbean-scale islands, a port on each, paper plot leases. No wallet. No live trading.

```bash
cd game
npm install
npm test
npm run tick        # 1 simulated hour
npm run play        # binds 0.0.0.0:8787
```

**How to actually open it**

- **Cursor Desktop** (Agents Window): plug icon (top-right of this agent) → Auto-Forward Ports on → **Open 8787**. That is the only way the harbour lands on your machine. It may show as localhost *after* Desktop forwards it.
- **cursor.com/agents in a browser only:** that port is not on your laptop. I can run the game here; you cannot type localhost and reach this VM.

**Play restart wipes.** No Restore button. A house lasts until we restart play. Labelled PAPER / SIMULATED.

Visitor starts with $1,000. Tap ground to walk. The world still ticks if nobody clicks.

## Headless sim

HUD fields: `moneySupply`, `goodsProducedWindow`, `priceIndex`.

```bash
npm run tick -- 2   # 2 hours
npm run dump-plots  # rewrite assets/maps/*/plots.json from src/land.ts
```
