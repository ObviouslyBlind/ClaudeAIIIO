# South first loop (2026-08-17)

PAPER / SIMULATED. Spawn: South port. No wallet.

## Play on your laptop

```bash
./play.sh              # http://localhost:8787
./play.sh --public     # plus a pasteable laptop URL
```

Windows: `play.cmd` or `play-laptop.cmd`. From `game/`: `npm run play` / `npm run play:laptop`.

## UI
- Top left: **Two Harbors** (green), players online, balance + $/min
- Top right: **viewers** — World / **Lots** / Foot traffic / Logistics / Minerals
- **Lots:** boundary outlines. Click the **$ title** or the lot dirt to buy.
- Foot traffic paints **High / Moderate / Low** on each named road (green / yellow / red). Red is Low, not danger.
- World: **left-click walks**. RMB-hold still orbits.
- Logistics: tap the **roadside crate**. The van **waits** until you take it.
- Left rail: Inventory / Market / Employees
- Market is a marketplace: section → item → deliver-to → Buy (chirp)

## Loop
1. **Lots** overlay. Click a **$ title** or the lot dirt. That buys it.
2. Open **Market** → Street carts → Hotdog cart → pick your lot → **Buy**. Hear the chirp.
3. Van drives paved roads, stops on the kerb, **stays** until you take the crate.
4. Inventory → Place in world. Tap the green YOURS lot (or the PLACE tag) or the verge out to the main road. Take all closes the crate card.
5. Right-click the cart: stock hotdogs, hire. A vendor stands by the cart.

## Zoning (baked in)
- Street lots = **commercial** (on)
- Fields / shore = **residential** (on)
- High commercial / high residential = **government-locked** (off)
- A hotdog cart only delivers to a commercial lot you own.

Handheld wagon on the player is gone. The cart is the starting stall.
