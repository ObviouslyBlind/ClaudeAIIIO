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
- Top right: **viewers** — World / Foot traffic / Logistics / Minerals
- Foot traffic paints **green / yellow / red ribbons on each named road**
- World tap **walks**. Land does not steal the click. Walk onto a plot to lease.
- Logistics: tap the **roadside crate**. Van drops on the kerb and drives away.
- Left rail: Inventory / Market / Employees — floating panels, not extra pages
- Tap-to-walk draws a green line. RMB-hold still orbits. Short RMB on a cart opens stock/hire.

## Loop
1. Foot traffic overlay (green / yellow / red on paved).
2. Open **Market**. If you have no land yet, tap **Lease $…** on a South street lot, then **Order crate**.
3. Van drives paved roads (same graph as taxi), drops the crate on the **side of the road**, drives away.
4. Switch **Logistics** (or tap the crate). Take all → inventory.
5. Place in world.
6. Stock the cart. Hire or run it. $0.10 PAPER per hotdog sold.

Handheld wagon on the player is gone. The cart is the starting stall.
