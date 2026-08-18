---
name: two-harbors-presence
description: >
  Two Harbors nearby outdoor presence. Use when editing presence poll, interest
  actors, or future WebSocket bodies. Indoors are silent. No Colyseus.
---

# Presence

Today: HTTP poll of four seeded NPC walkers (`presence.ts`, `presenceWalk.ts`,
`presence-hud.js`). Not live multiplayer.

PLAN: WebSocket ~8–10Hz, interest cells, outdoors nearby only.

- Indoors: do not broadcast.
- Other island: silent until ferry seats you.
- `/api/presence` 250 m cell. `/api/interest` plots + outdoor actors.

Do not send a full-world actor list. Do not put presence in Colyseus rooms.
