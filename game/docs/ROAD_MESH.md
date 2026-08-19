/**
 * How 2Isles draws roads. The Three.js research is `reports/THREEJS_ROADS.md`.
 *
 * Runs are ribbons. A T/L is a filled hub (union of 2–4 rectangles). A circus
 * is a RingGeometry; duals are circle-cut onto that face. That is PathPhalt /
 * Curva / SeloSlav RoadJunctionBuilder — not Cities: Skylines, not OSM.
 *
 * Island-wide Clipper union filled greens. Earcut of a holed circus keyhole
 * dropped the arms. A 26 m mitered highway slab ate the verge. Do not do those.
 *
 * Draw rules:
 * - Dual = two 8 m lanes + black asphalt median fill. Not pale stone. Not one slab.
 * - Trim the stem so it overlaps the through carriageway by ~1.6 m.
 * - Circus clip is the outer circle. Offset lanes hit the ring, not 9 m of sand.
 * - Circus arm lips are ~2 m. 12 m stubs sat in the grass as extra black rectangles.
 * - Legal turns: 15 / 30 / 45 / 90°. Kit cases, not a continuous CS2 compiler.
 */
