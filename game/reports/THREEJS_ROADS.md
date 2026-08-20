# How Three.js games actually draw roads

Asked: search 500+ high-star GitHubs that make very good Three.js roads, then overhaul ours.

## Honest count

**There are not 500 high-star GitHubs that generate good Three.js road meshes.**

`gh search "three.js road"` is mostly **learning roadmaps** (how to *learn* three.js), not pavement. High-star three.js is engines, helpers, and CSG libraries. Games that look like they have roads almost always **do not generate the join**.

Previous corpus (`docs/ROAD_MESH.md`, PR 42) searched Cities: Skylines, Godot Road Generator, OpenDRIVE, Clipper. That is the wrong stack for a Three.js harbour camera. This note is the Three.js one.

Do not import OSM / Mapbox / Cesium. Do not clone Capital Rift. Do not island-wide union.

## What GitHub actually has (stars, Aug 2026)

| Stars | Repo | What it is | Join model |
|---|---|---|---|
| 114602 | mrdoob/three.js | Engine. `ExtrudeGeometry` + `extrudePath`, `webgl_geometry_extrude_shapes` | Ribbon along a path. **T / roundabout fail.** Frenet twist. |
| 31735 | pmndrs/react-three-fiber | React renderer | Not roads. |
| 9808 | pmndrs/drei | Helpers | Not roads. |
| 3451 | gkjohnson/three-mesh-bvh | Raycast BVH | Not roads. |
| 1366 | donmccurdy/three-pathfinding | Navmesh walk | You model the mesh in Blender. |
| 1342 | felixpalmer/procedural-gl-js | Earth / terrain mapping engine | **Do not import.** PLAN forbids OSM. |
| 940 | gkjohnson/three-bvh-csg | Mesh CSG | Roblox-like subtract/union. Holes in walls, not a 1 Hz island net. |
| 589 | samalexander/three-csg-ts | Mesh CSG | Same. |
| 492 | manthrax/THREE-CSGMesh | Mesh CSG | Same. |
| 155 | shawn0326/three.path | `PathGeometry` along points | Ribbon. Not intersections. |
| 50 | SeloSlav/medieval-settlement-threejs | Actual Three.js roads + junctions | **Ribbons + junction patches.** The one public game that matches our problem. |

PathPhalt (Cesar, three.js forum, https://code.vonc.fr/pathphalt) and Curva.app (Pawel Misiurski) are the best *Three.js road builders* and **are not public GitHubs**. Kenney City Kit Roads is glTF tiles (straight / T / X / roundabout) snapped in Blender — not generated.

Padding this list with CS2, Godot, or “roadmap” tutorials would fake the 500. That was the last research mistake.

## How the ones that work do joins

### 1. Don’t generate the join (most common)

Kenney tiles, racing demos, city kits. Modelled in Blender, snapped on a grid. Fine for a kit game. We author a graph (`src/roadGraph.ts`) and draw it. Not this.

### 2. Extrude / ribbon along a path

three.js `ExtrudeGeometry({ extrudePath })`, `three.path`, our `drawRibbon`. Runs look continuous. **A T or a roundabout is overlapping tapes.** Godot Road Generator already documented this: CSG-along-path cannot make junctions. Forum threads about Frenet twist are the same failure mode.

### 3. Fill the crossroads as its own 2D surface (the Three-native join)

This is what PathPhalt was built for — Cesar’s post says it is *specially made for curved roads and complex crossroads* because extrusions don’t do them.

Curva (2024–2025 LinkedIn): cut barriers, **add the road to a junction surface shape**, “the road gives way to the junction surface.” A roundabout is a **mode**, not overlapping tapes.

SeloSlav `RoadJunctionBuilder.ts`: classify the node (T / bend / cross), **stop the ribbons**, place a **junction patch** (radial fill from the node, short arm stubs in `junctionContour`). Endpoint caps live on the edge mesh so UVs stay continuous.

### 4. 2D boolean → ShapeGeometry

Clipper / `polygon-clipping` union of 2–4 rectangles → Three `ShapeGeometry` (earcut). **Works for a T or an L.** Dies on a holed keyhole (ring + hole + dual stubs): earcut drops the arms. We already hit that. Do not earcut a circus.

### 5. 3D CSG

`three-bvh-csg` (~940★). Real boolean on meshes. Wrong cost and wrong scale for every south join at load.

## What 2Isles will draw

PathPhalt / Curva / medieval-settlement, mapped onto our graph:

| Piece | Draw |
|---|---|
| Run (street, avenue, dual) | Ribbon (`drawRibbon`) plus PathPhalt cream/kraft **lane paint**. Dual = one filled deck across both lanes and the median, round joins at corners, thin median stripe. Cars drive the graph above the mesh. |
| T / L | Filled hub polygon plus a round node disc. Tarmac **overlaps** the hub. Paint and walks still cut. |
| Circus | RingGeometry doughnut. Ribbons extend onto that ring and stop before the grass island. Circular paint and a grass lawn in the hole. **Do not** Clipper-union flares into a doughnut. **Do not** clover-clip the ring. **Do not** `ShapeGeometry` a holed Clipper keyhole. |
| Legal turns | 15 / 30 / 45 / 90° (`ROAD_TURN_DEG`). Treat as kit cases, not a continuous CS2 compiler. |

Clip radius for a circus is the **outer disc**. Drawing a Clipper union of disc + flares punched sliver holes in the doughnut. Clover-clipping the ring ate the roundabout. Ribbons overlap the ring instead.

## Do not

- Island-wide union (`ROAD_MESH.md` already failed this)
- Kenney-clone Capital Rift
- OSM / Mapbox / Cesium / procedural-gl-js as a map source
- 3D CSG of the whole net
- Pale stone median (reads as sand from spawn)
- Two offset dual tapes with a sand crotch
- Trimming visual ribbons short of a T so the stem dies in dirt
