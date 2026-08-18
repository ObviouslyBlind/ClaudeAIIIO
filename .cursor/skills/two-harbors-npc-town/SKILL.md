---
name: two-harbors-npc-town
description: >
  Two Harbors NPC town seeding. Use when filling empty South towns or North
  houses/shops/farms. World should look inhabited before the player builds.
---

# NPC town

`seedNpcTown()` / `seedNpcLots()` **skip South** today. North has ~16 NPC-owned
plots (houses, shops, house-shops, warehouse, farms). Tagged buildings trickle
in (~8s).

South v1 was **lots + roads + seawall, zero houses** (`southLand.ts`).
Island-wide play needs South life next — still no politics, still no
player-designed megabuilds.

NPC sites still pay upkeep. They are sim facts, not decoration-only if ROADMAP
step 4 is in play (shop sells, farm ticks).
