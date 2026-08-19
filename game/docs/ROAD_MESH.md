/**
 * How 2Isles draws roads. The Three.js research is `reports/THREEJS_ROADS.md`.
 *
 * Runs are ribbons. A T/L is a filled hub (radial contour + tangent kerb
 * fillets). A circus is a RingGeometry; duals are circle-cut onto that face.
 * That is PathPhalt / Curva / SeloSlav RoadJunctionBuilder — not CS2, not OSM.
 *
 * Island-wide Clipper union filled greens. Earcut of a holed circus keyhole
 * dropped the arms. A 26 m mitered highway slab ate the verge. A 26 m
 * shoulder ribbon at the circus was a square chord in the grass. Do not
 * bring those back.
 *
 * Draw rules:
 * - Dual = two 8 m lanes + black asphalt median fill. Per-lane grit, not one 26 m slab.
 * - T/L inner kerb is a tangent fillet, not a square rectangle crotch.
 * - Lane paint stops at the hub plate (overlap 0). Tarmac still tucks 1.6 m under.
 * - Circus clip is the outer circle. Offset lanes hit the ring, not 9 m of sand.
 * - No circus arm boxes. 12 m stubs sat in the grass as extra black rectangles.
 * - Legal turns: 15 / 30 / 45 / 90°. Kit cases, not a continuous CS2 compiler.
 */
