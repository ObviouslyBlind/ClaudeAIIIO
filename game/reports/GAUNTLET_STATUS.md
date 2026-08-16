# Gauntlet status

Ten **builders** in parallel. Critics stay one-at-a-time (shared Chrome + PAPER cash).

## File lock (do not cross)

| Agent | File only |
|---|---|
| tarmac ribbon | `roads.js` |
| cars | `traffic.js` |
| taxi cab | `taxi.js` (mesh only) |
| ferry boat | `ferry.js` |
| shore | `shore.js` |
| building shells | `buildings.js` |
| street props | `street-props.js` |
| player | `player.js` |
| sky | `sky.js` |
| water | `water.js` |

`main.js` is wired. Builders do **not** edit `main.js`, `land.ts` centres, `PLAN.md`, or `quay.js` (harbour-kit owns it).

## Held

Inland spawn, tarmac, HUD, traffic-on-road, taxi overlay, ferry ticket, RMB orbit, catalogue.

## In flight

Interiors critic `/?g=int20`. Harbour-kit on `quay.js`.
