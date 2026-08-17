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
- Top right: Tutorials / Leaderboard / Account, then World / Foot traffic / Logistics / Minerals
- Left rail: Inventory / Market / Employees — floating panels, not extra pages
- Tap-to-walk draws a green line. RMB-hold still orbits. Short RMB on a cart opens stock/hire.

## Loop
1. Foot traffic overlay (green / yellow / red on paved).
2. Lease a South plot.
3. Market: order hotdog cart ($85) + hotdogs ($3 for 20) to that plot.
4. Van drives paved roads (same graph as taxi), drops a crate.
5. Take all → inventory.
6. Place in world (foot traffic stays on).
7. Stock the cart. Hire or run it. $0.10 PAPER per hotdog sold.

Handheld wagon on the player is gone. The cart is the starting stall.
