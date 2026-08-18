---
name: two-harbors-first-loop
description: >
  South hotdog / cart first loop. Use when editing market order, warehouse,
  delivery van, place stand, hire, sticker price, chrome Market/Inv/Staff.
---

# First loop (South cart)

Spec: `game/reports/FIRST_LOOP.md`. Code: `game/src/firstLoop.ts`,
`public/harbour/chrome.js`, `cart.js`, `delivery.js`, `stall-hud.js`.

## Loop

1. Buy a lot from a nearby `$` bar.
2. Market → section → item → deliver-to (warehouse default, or van).
3. Van waits. **Take all** closes the crate card.
4. Place on YOURS; Cancel exits place-mode. Tap the cart to stock.
5. Hire staff on the cart card (pick a person). Carts do not sell without staff.
6. Set sticker price. Staff: foot traffic High / Moderate / Low (red = Low).

## Gap

`visitor.play` (stands, warehouse, deliveries) is **not** in the persist blob.
Restore/restart drops the cart loop even if leases survive.

Do not confuse this catalog with the 12-good island books (`/api/buy`).
