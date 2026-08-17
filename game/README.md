# Two Harbors

Persistent browser economy + politics game. Spec: [PLAN.md](PLAN.md). Backend: [BACKEND.md](BACKEND.md). Land: [LAND.md](LAND.md). Roadmap: [ROADMAP.md](ROADMAP.md). Skills: [SKILLS.md](SKILLS.md). Gauntlet: [GAUNTLET.md](GAUNTLET.md).

The whole island is a priced parcel map now: every lot drawn with boundary ink and a PAPER price tag (`YOURS` on your leases). You spawn on **South**. First loop: lease land → order a hotdog cart → van delivers a crate → inventory → place → stock → hire or run.

## Now

Headless sim plus a **basic 3D harbour**. PAPER / SIMULATED. No wallet.

**On your laptop (Mac / Linux / Git Bash):**

```bash
git clone https://github.com/ObviouslyBlind/ClaudeAIIIO.git
cd ClaudeAIIIO
git checkout cursor/first-loop-ui-183a
chmod +x play.sh game/scripts/play.sh
./play.sh
```

That installs if needed and serves **http://localhost:8787/**.

Need a URL you can paste into any browser (phone, another PC, or when localhost is not this machine):

```bash
./play.sh --public
```

or from `game/`:

```bash
npm install
npm run play:laptop
```

**On Windows:** double-click `play.cmd` (this PC) or `play-laptop.cmd` (public URL).

The old cloud-agent plug-icon forward still works in Cursor Desktop. The scripts are the supported way to run it on your machine.

Open `/` for the harbour. Toggle **Foot traffic**, click a **$ tag** to lease a green South plot, then **Market** to order a hotdog cart delivered to that plot. Tap the crate **Take all**, **Inventory → Place in world**, short right-click the cart to stock. Hire from **Staff** or run it yourself. **Taxi** still paved-only. **Ferry** still North ↔ South. Labelled PAPER / SIMULATED.

Visitor starts with $1,000. Tap ground to walk (green line). The world still ticks if nobody clicks.

## Headless sim

HUD fields: `moneySupply`, `goodsProducedWindow`, `priceIndex`.

```bash
npm run tick -- 2   # 2 hours
npm run dump-plots  # rewrite assets/maps/*/plots.json from src/land.ts
```
