---
name: two-harbors-persist
description: >
  Two Harbors persist and wipe rules. Use when editing persist blob, restore, or
  PLAN C Postgres. Play restart wipes on purpose until the shard is durable.
---

# Persist

10s in-memory loop (`persistLoop.ts`). Blob: tick, cash, leases, **develops**,
cart, staff slots, visitor orders, sales_tax, events.

Not saved: `visitor.play` (stands, warehouse, deliveries).

`POST /api/persist/restore` exists; operator rule is still **restart wipes**
while iterating. No Restore button on the live sheet.

PLAN C: Postgres. Use `save-systems` + `supabase-postgres-best-practices` for
**Postgres** (indexes, pooling, migrations). We are not shipping Supabase Auth,
Realtime, or Edge Functions unless PLAN says so.
