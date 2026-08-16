---
name: two-harbors-net
description: Two Harbors networking. One shard, HTTP intents plus WebSocket presence, interest cells. Use when adding sockets, accounts, or protocol messages. Do not introduce Colyseus rooms or client-trusted prices.
---

# Two Harbors net

Read `game/BACKEND.md` and `game/PLAN.md` first.

## Shape

One live world. Not matchmaking. Not a Colyseus room.

- **HTTP** — market sheets, planning, Hansard, account. Request/response. Auditable.
- **WebSocket** — presence and short intents (`move`, `use`). ~8–10Hz for nearby bodies.
- **Tick** — 1Hz on the sim process. Does not wait on sockets.

The client sends **intents**. The server replies with **facts**. Never accept a client price, inventory, or vote tally.

## Interest (AOI)

The reason we do not render the whole world:

1. Partition each island into cells (start at 64 m).
2. A connected body subscribes to its cell plus neighbours.
3. Outdoors: other players in those cells.
4. Indoors: nobody is broadcast (same rule Capital Rift publishes).
5. The other island is invisible until the ferry lands you there.

If a packet would describe someone you cannot see, do not send it.

## Do not

- Colyseus / party rooms as the economy host
- Client-side order matching
- Full-world actor lists
- Google/Stripe until the spec says so (not v1)
