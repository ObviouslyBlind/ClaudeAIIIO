---
name: two-harbors-production
description: >
  Two Harbors 12-good production chains. Use when wiring ore-bar-nail, farms,
  mills, or spatial logistics. Goods already trade as books; chains are not spatial yet.
---

# Production

Beta goods (`goods.ts`): corn potato lettuce beans | ore lumber | planks nails
iron_bars tools concrete fuel.

A nail is not spawned. PLAN: ore → bar → nail, plus a ferry wait if ore is
South. **Live:** order-book quantities + NPC `restockNpc` / `npcQuote` / `match`.
No mill building consumes ore on the tick.

Staff AI slots exist on developed plots (`staff.ts`). `labour.ts` (3-job cap,
human shift bonus) is tests-only.

When you add a chain, keep AI workers completing on 1Hz with **zero players**.
Human minigames must never stall a mill.
