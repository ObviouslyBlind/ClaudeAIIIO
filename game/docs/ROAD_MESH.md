/**
 * How games actually draw roads — and what Two Harbors will do.
 *
 * The stacked black rectangles and broken grey kerbs are not a miter tweak.
 * They are what you get when each street is its own ribbon and junctions are
 * faked by overlapping more ribbons. Every serious road tool splits **graph**
 * (where the taxi drives) from **footprint** (one polygon per connected net).
 */

/**
 * Field (representative sources, not a fake hundred):
 *
 * 1. Graph + hub + truncated ribbons
 *    Cities: Skylines 1/2 net pipeline (edge mesh + node mesh, JoinedJunction,
 *    GeometrySystem). Godot Road Generator (CSG-along-path fails at joins;
 *    intersections are their own mesh). symbios-tensor roads_3d.rs: degree-3+
 *    hubs from intersecting kerb lines, ribbons stop at the hub.
 *    Paper: “Finding Junctions in Spline-based Road Generation” (diva2:1675311)
 *    — SAT + polygon clipping to cut a convex junction polygon.
 *
 * 2. Buffer the centreline, then boolean-union
 *    Clipper / Clipper2 (Angus Johnson): InflatePaths on open polylines,
 *    JoinType Square/Miter, then Union so overlapping buffers become one
 *    polygon. GIS “road corridor” / NetTopologySuite VariableBuffer.
 *    Martinez–Rueda–Feito 2009 boolean ops (polygon-clipping JS).
 *    Chen–McMains winding-number offset (DETC2005).
 *
 * 3. Shader cookie-cut (not for us)
 *    “Paving Procedural Roads with Pixel Shaders” (WSCG 2005) — implicit
 *    fat curves in the pixel shader. Smooth, expensive, wrong for a paper
 *    harbour on a phone.
 *
 * 4. Prefab kits
 *    Unreal City Sample / CS composition pieces. We do not ship a road kit.
 *
 * Chosen: **hub + truncated ribbons**. Each street is still a ribbon. At a join,
 * the last metres of each arm are buffered and unioned (2–4 rectangles). That
 * is a T or an L. Island-wide union was tried and filled greens / merged
 * nearby streets into a splat — do not do that.
 */
