# Gauntlet status

Loop is live for the full PLAN (A–N). User is the brake. Critics one-at-a-time. Builders fan out (cap 10). Do **not** restart play while a critic is on the page.

## In flight

- Interiors critic `/?g=int22`
- PLAN B+ wave: statutes catalog, island books, calendar, districts, cart, Hansard, planning, ferry statute

## PLAN ladder

| Step | Status |
|---|---|
| A Headless sim | Held (tick, 12 goods) |
| B Starter pack | **This wave** — catalog + sales tax writes `ledger.sink` |
| C Player small sites | Next — persist / second visitor later |
| D Two books + ferry | Ferry ticket held; **this wave** splits books |
| E Firms + large class | Queued |
| E2 Hiring + ranks | Queued |
| F Planning | **This wave** stub → file/vote |
| G Bootstrap poll | Queued after F |
| H House + calendar | **This wave** calendar; House seats next |
| I Senate / PM / Governor | Queued |
| J Councils | Queued |
| K Stocks | Queued |
| L 3D harbour | In progress (interiors + meshes) |
| M Mobile Hansard | Hansard page this wave |
| N Closed beta shard | Last |

## Harbour L (meshes)

Dirt ribbon, interior dress, hill trees shipped. Interiors pixel bar still open. Then critic meshes one at a time.

## File lock (this wave)

| Piece | File only |
|---|---|
| statute catalog | `src/statutes.ts` (+ `statutes.test.ts`) |
| island books | `src/sim.ts` books split only + new `src/books.ts` |
| calendar | `src/calendar.ts` |
| districts | `src/districts.ts` |
| cart | `public/harbour/cart.js` |
| Hansard | `public/hansard/*` |
| planning | `src/planning.ts` |
| ferry statute | `src/ferry-routes.ts` |

Do not edit `main.js`, `PLAN.md`, `BACKEND.md`, `land.ts` centres. Do not restart play.
