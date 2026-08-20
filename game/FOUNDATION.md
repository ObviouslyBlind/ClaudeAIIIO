# Two Harbors — Shard kernel (K.1)

This is the game before the features. PLAN.md is still the spec. This file is the **contract** the rest of the repo must sit on.

PAPER / SIMULATED. No wallet. Not a Capital Rift clone. Politics stays frozen.

---

## What was wrong

The harbour loop works as a **one-player demo**. It does not yet behave like a shard.

| Fact | Why it breaks a real game |
|---|---|
| One hardcoded `visitor` | There is no player table. 500 people cannot exist. |
| `/api/map` dumps every plot | Phones cannot take a full-island cadastral mesh per poll. |
| Persist saves **lease ids**, not buildings | A house you placed is forgotten on restore. Hire/staff then has nothing to attach to. |
| Parcel rings are allowed to overlap | `findParcelAt` picks the smallest hit. Two people can think they own the same dirt. |
| HUD is a flat list of `<p>` tags | Systems cannot stack (inspect → develop → staff → minerals). |
| No minerals catalog | Extract is a good id (`ore`). The client never shows what minerals exist in the world. |
| Presence is four seeded NPCs on HTTP poll | Not live multiplayer. Fine as a stub. Not a 500-player net. |
| Persist is in-memory | Restarting play wipes the shard. Postgres is still PLAN step C. |

The 3D harbour is a **camera**. If the kernel is shaky, prettier meshes will not save leases, houses, or hires.

## What we are not doing in K.1

- Not deleting the harbour client.
- Not cloning Capital Rift’s client, Earth map, OSM, or protocol.
- Not inventing a 13th good.
- Not seating House / Senate / councils / elections.
- Not claiming 500 **live sockets**. K.1 proves the **data model and interest queries** stay bounded at 500 players.
- Not Postgres yet (still PLAN C). The blob now stores the facts Postgres will hold.

## The rule

**The sim owns facts. The client sends intents. Everyone in a cell sees the same plots.**

If you lease a street lot and place a house:

1. The plot id is unique.
2. The ring does not overlap another plot.
3. The owner and `use` are shard facts.
4. Persist round-trips that house.
5. Anyone whose interest cell covers that plot receives that house.
6. The minerals catalog is the same list for every client.

## Kernel surface (`game/src/kernel/`)

| Module | Job |
|---|---|
| `players` | Player records. Cap **500**. `visitor` is player `visitor`. |
| `plots` | Unique ids, overlap tests, 64 m spatial index. |
| `interest` | Nearby **plots + outdoor actors** for one pose. Not the other island. |
| `events` | Append-only lease / develop / hire / fire log. |
| `minerals` | In-game mineral catalog (ore) + plot deposits. Tied to good `ore`. |
| `menus` | Stack of HUD frames so systems nest. |

Version string: **`K.1`**. Next kernel bump is `K.2`, not a rewrite of `sim.ts`.

## Scale

Interest cells are why 500 people can share two islands without each client loading both landmasses.

- Plot cell: **64 m** (BACKEND / net skill).
- Actor cell: **250 m** (existing presence HUD).
- Indoors: actors are not broadcast.
- Other island: invisible until the ferry seats you there.

“Every plot is rendered for everyone” means: **every plot in your interest is the same world**, not “send 8 km of parcels to a phone.”

## Verify

```bash
cd game
npm test
```

Kernel tests must show: unique plot ids, zero overlapping rings, a developed house surviving a serialize/restore **blob** (for later Postgres), minerals catalog listing ore, 500 player records with bounded interest queries.

**Alpha wipe.** We are in alpha. Every harbour spawn is a fresh visitor: starter cash, no leases, no stands, no warehouse. Do not restore `persist.lastBlob` onto the live visitor. `POST /api/persist/restore` is refused. Hard-refresh / spawn wipes this visitor even if the play process stayed up. Play restart also wipes. There is no Restore button on the live sheet. A house you place is for this spawn only.

Play: `npm run play` binds `0.0.0.0:8787`. On Cursor Desktop, plug icon → forward **8787** → Open in browser. The cursor.com/agents website cannot open that port on your laptop.
