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
1. **Lots** overlay. Nearby **$ bars**. Click a **$ bar** or the lot dirt. That asks to buy.
2. Open **Market** → Street carts → Hotdog cart → pick your lot → **Buy**. Hear the chirp.
3. Van drives paved roads, stops on the kerb, **stays** until you take the crate. **Take all** closes the card.
4. Inventory → Place in world. Tap the green YOURS lot (or PLACE). Cancel gets you out. Already-placed does not trap you.
5. Tap the cart or Inv → **Stock cart**. Staff → pick a person for that lot. Taxi: **Exit taxi** on the dock or the map.

## Zoning (baked in)
- Street lots = **commercial** (on)
- Fields / shore = **residential** (on)
- High commercial / high residential = **government-locked** (off)
- A hotdog cart only delivers to a commercial lot you own.

Handheld wagon on the player is gone. The cart is the starting stall.
