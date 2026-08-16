# Gauntlet status

Loop is live. User is the brake. Critics one-at-a-time (shared Chrome + PAPER cash). Builders may fan out. Do **not** restart play while a critic is on the page.

## In flight

- Interiors critic `/?g=int21` — lease cheap street lot, House, Enter, Exit.

## Held (pixel-ratified)

Inland spawn, tarmac, HUD, traffic-on-road, taxi overlay, ferry ticket, RMB orbit, catalogue.

## Mesh batch (code shipped, not re-critic’d)

Tarmac ribbon, sedan cars, taxi cab, ferry boat, shore foam, street props, player figure, sky, water, quay clutter, building shells.

## Builder queue (this round)

| Piece | File only | Notes |
|---|---|---|
| dirt ribbon | `roads.js` | Field tracks: extruded brown ribbon, not box slabs. Leave paved + spawn camera. |
| interior dress | `interior.js` | PAPER living room. Keep enter/exit, `canEnter`, door `kind=exit`. |
| hill trees | `trees.js` | Already wired from `main.js`. Do not edit `main.js`. |

## After interiors critic

Fail → one fix, retry `/?g=int22`. Pass → pixel-critic meshes one at a time (`/?g=rib22`, cars, taxi, ferry, shore, props, player, sky/water, quay, shells). Then PLAN step B (statute table).

`main.js` is wired. Builders do **not** edit `main.js`, `land.ts` centres, `PLAN.md`.
