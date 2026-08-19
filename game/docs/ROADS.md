# Roads

## The model

Roads are a **graph**, not a pile of polylines. `src/roadGraph.ts` owns it.

- A **node** is a junction, a dead end, or a circus.
- An **edge** is one run of road between two nodes.
- `edge.points[0]` is exactly node `a`; the last point is exactly node `b`. A circus hands out a point on its kerb ring instead of its centre.

Because the ends *are* the nodes, roads physically meet. The renderer and the taxi read the same geometry, so they cannot disagree about where the tarmac is.

`graphToRoads()` also publishes the old `Road[]` view, which lots, props, traffic and the roadside dropper still read.

## Why it was rebuilt

The old model gave each road its own point list and hoped neighbours were near enough.

- Junctions were faked by **deleting** the minor road within 6.5–20 m of a major one, so side streets ended in open sand.
- That trim was **render-only**. The taxi drove the untrimmed line, i.e. over tarmac that was never drawn. That is what looked like the cab driving through dirt.
- 7.2 m vs 5.2 m is invisible from the play camera, so every road read as the same black line.

## Classes

One table in `public/harbour/roadclass.js`, shared by the builder, renderer and taxi.

| Class | Carriageway | Median | Sidewalk | Footprint |
|---|---|---|---|---|
| highway | 8 m × 2 | 10 m | — | 26 m |
| avenue | 9 m | — | 2.6 m | 14.2 m |
| street | 6.6 m | — | 2.0 m | 10.6 m |
| lane | 4.6 m | — | — | 4.6 m |
| track (dirt) | 3 m | — | — | 3 m |

Each step is big enough to see from 30 m up.

## Drawing

See `reports/THREEJS_ROADS.md` and `docs/ROAD_MESH.md`.

- Local paved **runs** are ribbons. A **T/L** is a small union of the 2–4 arm-end rectangles (a hub). Ribbons cut on that polygon. Not the whole island boolean-unioned into a splat.
- Offset sidewalks are densified and clipped out of the hub. Stem ribbons overlap the through road by ~1.6 m so a grey hairline cannot show between two black rectangles.
- Quayward Loop is a **rectangle**. Quayward Rd hits the north edge at **45°** from Harbour Circus.
- A **circus** is a `RingGeometry` (the join surface) plus a stone island. Duals are **circle-cut onto the outer face** so offset lanes hit the ring, not 9 m of sand beside the kerb. Short lips cover the chord. Do not earcut a holed Clipper keyhole; do not draw 12 m black rectangles into the grass.
- Dual carriageway: two 8 m lanes + black asphalt median fill. Never a 26 m mitered slab.

## Routing

`public/harbour/roadnet.js`. Dijkstra over nodes, walking edge geometry, with a kerb arc across a circus. The arc peels **right** for a first exit so the cab does not go the long way around. Dual carriageways are offset to the driving lane nearer the player so nothing drives the median. Field tracks are excluded — the cab does not take dirt.

A track that wanders back within 7 m of tarmac is dropped at build time.

## Verify

```bash
cd game && npm test
```

`src/roadGraph.test.ts` holds the invariants: endpoints land on nodes, every paved node is reachable from the quay, the hierarchy exists, a route to every town stays on tarmac and off dirt, and paved centrelines never cross unless they share a node.
