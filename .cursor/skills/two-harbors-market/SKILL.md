---
name: two-harbors-market
description: >
  Two Harbors markets. Use when editing 12-good island books or the South hotdog
  catalog. Two systems; do not merge them by accident.
---

# Two markets

1. **Island books** (`books.ts`, `buy.ts`, `sell.ts`, `orders.ts`) — 12 goods,
   North and South `lastPrice`, NPC flow, `/api/buy` `/api/sell` `/api/order`.
2. **First-loop catalog** (`firstLoop.ts`) — street cart items, warehouse,
   `/api/market/order`. What chrome Market drives today.

PLAN wants regional books + ferry arb. Live arb HUD: `spread-hud.js`.

Client never matches orders. No global one-price.
