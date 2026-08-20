/**
 * How 2Isles draws roads. The Three.js research is `reports/THREEJS_ROADS.md`.
 *
 * Vehicles (taxi, delivery van, AI cars) follow graph nodes in XZ and sit
 * slightly above the visual deck (`ROAD_DRIVE_LIFT_M`). They do not sit on
 * the ribbon mesh. That split lets the camera paint one filled road.
 *
 * Runs are ribbons that overlap hub fills. A T/L is a filled hub (radial
 * contour + tangent kerb fillets) plus a round join disc at the node. A
 * circus is a RingGeometry; duals are circle-cut onto that face.
 * That is PathPhalt / Curva / SeloSlav RoadJunctionBuilder — not CS2, not OSM.
 *
 * Island-wide Clipper union filled greens. Earcut of a holed circus keyhole
 * dropped the arms. Do not bring those back.
 *
 * Draw rules:
 * - Dual = one charcoal deck with grit, a light concrete kerb, and paint
 *   you can read from spawn. Cars drive the graph above the mesh.
 * - Tarmac runs through T/L hubs (overlap). Paint and sidewalks still give
 *   way. The plate sits under so the meeting is one black shape.
 * - T/L inner kerb is a tangent fillet plus a round node disc, not a sand crotch.
 * - Stem paint stops at the through kerb. Through paint stays on the carriageway.
 * - Circus ribbon ends are bitten to the circle. Each arm gets a chord
 *   apron so the dual merges into the ring, not a square cap in the grass.
 *   Ring width matches the highway deck.
 * - A circus is grit tarmac, concrete inner/outer kerbs, a grass island, and
 *   cream edge paint — not a pale stone puck.
 * - No circus arm boxes. 12 m stubs sat in the grass as extra black rectangles.
 * - Legal turns: 15 / 30 / 45 / 90°. Kit cases, not a continuous CS2 compiler.
 */
