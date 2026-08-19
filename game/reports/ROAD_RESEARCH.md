# Road research (before any gauntlet)

Operator ask: intersections look disconnected. Taxi/AI are fine. Want a **basic** system — sidewalks, a two-way dual highway, a few roundabouts — that actually **meets**. Do not gauntlet until this note exists.

This is research only. No mesh rewrite in this pass.

## What we have (audit)

The **graph is already connected**. `src/roadGraph.ts` is the right model: nodes are junctions / termini / circuses; every edge starts and ends on a node; a circus hands out a point on its kerb ring, not the centre. `src/roadGraph.test.ts` proves:

- endpoints land on nodes
- every paved South node is reachable from the quay
- a taxi route to every town stays on tarmac and off dirt

So the cab is driving a connected network. The complaint is **drawing**.

The **mesh is still a pile of overlapping ribbons**, which is the thing `docs/ROAD_MESH.md` already named and then papered over:

| Piece | What the code does | What you see |
|---|---|---|
| Street / avenue | One centreline ribbon + two offset sidewalk ribbons | Runs look OK. Corners do not. |
| Junction | Square asphalt plate + L-shaped kerb quads + ribbons that overlap the plate | Stacked black rectangles, grey kerb that does not turn the corner as one walk |
| Dual highway | Centreline median ribbon + **two carriageways offset ~9 m** | Two black strips that miss the roundabout, because the graph stops on the **centreline kerb**, not on the outer lane |
| Circus / roundabout | Kerb-radius annulus + stone island + **arm discs** glued on where the dual should have met the ring | Gaps, discs, ribbons that do not share an edge with the ring |

Bandages already in the tree: `drawCircusApproaches` (arm discs), `HIGHWAY_RAB_SKIP_M`, hub boolean-union of 2–4 rectangles, 1.4 m stem overlap, densified sidewalks clipped out of the hub. Each one is a confession that ribbons do not join.

`scripts/audit-roads.ts` still flags two-point edges (trim no-ops) and dual-vs-circus misses. Tests can be green while the join is sand.

North is worse: some joins are still legacy `road.joins` circles.

That matches the operator: **AI and taxi are fine; the roads are not connected.**

## What “basic” actually is

Not a kit city. Not OSM. Three primitives:

1. **Street** — one two-way carriageway, sidewalk both sides, stops at a **node mesh**.
2. **Highway** — two one-way carriageways (one each way) with a median. Each carriageway is geometry that **ends on the node**, not a decoration offset from a line that ended at the median.
3. **Roundabout** — a **node**, not a circular road you hope ribbons hit. Incoming edges cut at the outer ring. The ring is the join.

If those three meet, the island reads as a road system. Hierarchy (avenue / lane / dirt) can wait.

## Corpus

GitHub search, 70 queries (road generator, procedural city, OpenDRIVE, OSMnx, Godot road, Clipper2, SUMO, CARLA, sidewalk, roundabout, highway mesh, …). Deduped **3,736** repos. Curated **500** highest-star relevant hits, all **≥103 stars** (max 15k). List: `reports/road-corpus-500.tsv` / `.json`.

Search is noisy (map apps, GIS, HTTP “routing”). The **learning set** is the road-mesh / net / HD-map slice below, not Clash rule packs.

### What the high-star systems actually do

They all split **graph** from **footprint**, then split footprint into **edge mesh** and **node mesh**. Nobody serious joins roads by overlapping more ribbons.

| System | Stars (corpus) | Join model | Takeaway for us |
|---|---|---|---|
| **Cities: Skylines 2** `GeometrySystem` | (closed, documented) | Edge bezier is **cut** at node offsets; a second job builds **node / intersection** geometry; roundabout is a node component with its own radius, not a circular edge | This is the bar. Dual carriageways terminate into the node. Sidewalks are lanes of the composition, including through the node. |
| **TheDuckCow/godot-road-generator** | 1.2k | `RoadPoint` cross-section (lanes, shoulder, sidewalk) swept along a path = **edge**. Intersections are **RoadIntersection** meshes (procedural n-gon **or** prefab 3-way / 4-way / **roundabout 1x1 and 2x2**). AI `RoadLane` curves are generated **across** the intersection, not guessed from overlapping tarmac | Closest open analogue. Prefab roundabouts exist because procedural rings are hard; they still **snap containers**, they do not overlap CSG. README: CSG-along-path **cannot** make junctions without gaps. That is our `drawRibbon`. |
| **ASAM OpenDRIVE** | spec + `esmini` / `libOpenDRIVE` | Roads **stop**. A **junction** has incoming roads + **connecting roads** (paths through the join). Junction **boundary includes sidewalks**. Roundabout = circular road + junction links, not a painted circle under two highways | Dual highway into a circus must be **lane-linked** onto the ring. Centreline-kerb is the wrong contact point. |
| **Lanelet2** (`fzi-…/Lanelet2`, 0.9k) |  | Physical lines (kerbs) + lanelet area between them. A join is where lanelets adjoin, not where polylines cross | Sidewalk is a lanelet, not a second ribbon. |
| **Clipper2** (`AngusJohnson/Clipper2`, 2.4k) |  | `InflatePaths` on open polylines (`EndType::Joined` / `Square`, `JoinType::Miter` or `Round`), then **Union** | Correct 2D **footprint**. We already tried island-wide union and splat nearby streets — keep union **per node** (hub only), never the whole island. Do not use union as the only 3D mesh. |
| **OSMnx** (`gboeing/osmnx`, 5.8k) |  | Street **graph**: nodes = intersections, edges = runs. Analysis, not mesh | Confirms our graph. Does not draw tarmac. |
| **OSRM / GraphHopper / Valhalla** | 6–8k | Routing graph on OSM ways | Taxi should keep reading the graph. Do not let the taxi follow the offset ribbon. |
| **SUMO** (`eclipse-sumo/sumo`, 4.1k) |  | `junction` shapes from incoming edge geometry; connections are lane-to-lane | Roundabouts are junction types with internal lanes. |
| **CARLA / Autoware** |  | OpenDRIVE / Lanelet maps; roads are lanes with contact points | Same rule: **contact point is the lane**, not the median centreline. |
| **a-b-street/abstreet** | 8.2k | Lane-level map, intersections are first-class | Pedestrian area is part of the intersection polygon. |
| **streetmix/streetmix** | 0.7k | Street as a **cross-section** (travel lanes + sidewalks + median) | Highway = two travel assemblies + median in one section, not three independent roads. |
| **CS1 mods** (Node Controller, Intersection Marking, TMPE) | in corpus | Players still fight node mesh, not pathfinding | If the node mesh is wrong, no amount of taxi code helps. |
| **OpenTTD / OpenRCT2** | 8k / 16k | Segment + junction tiles; pieces **snap** | Cheap version of node+edge. |
| **Kenney City Kit Roads** (CC0, ROADMAP) | asset | Prefab straights / corners / T / X / roundabout | Valid later for a tiny harbour kit. Not the sim graph. |

Paper already on disk (`docs/ROAD_MESH.md`): *Finding Junctions in Spline-based Road Generation* (diva2:1675311) — SAT + clip a **convex junction polygon**, ribbons stop at that polygon. Godot and CS2 are that idea in 3D.

### Rules every one of them shares (and we break)

1. **An edge does not own the junction.** It is trimmed (`CalculateOffsets` / `CutCurve` / RoadContainer snap).
2. **The node owns the join mesh** (n-gon, prefab, or annulus).
3. **A dual carriageway is two lanes (or two one-way edges) in one composition.** Offsetting a centreline after the centreline already stopped is how you get sand between the black strip and the roundabout.
4. **Sidewalk is a lane of the same section**, swept with the tarmac, and included in the node boundary. It is not a second polyline you hope clips.
5. **A roundabout is a node (or a circular connecting road inside a junction).** Incoming roads meet the **outer travel lane**, then the ring takes over.
6. **CSG / ribbon-along-path cannot make T / L / roundabout.** Godot’s README says this in one paragraph. We re-learned it with plates and arm discs.

## Why Island Hwy “isn’t connected”

`drawHighway` offsets each carriageway by `median/2 + carriage/2` (~9 m). `anchorOf` for a circus places the **centreline** on the kerb circle (`RAB_R`). The black tarmac therefore aims ~9 m beside the ring. Arm discs hide some of the miss. That is the whole bug, for the thing the operator is looking at from spawn.

Fix (when we build, not now): either

- **A.** Circus radius is the **outer kerb of the dual** (ring big enough to swallow both carriageways), edges still centreline-authored but the **node mesh** is the annulus between inner island and outer kerb, and carriageway ribbons **cut at that outer ring**; or
- **B.** Highway is two one-way edges that each hit the ring at their own lane offset (OpenDRIVE contact points).

A is less graph churn. B is more honest. Either beats discs.

Streets into a T: stop drawing a square plate. Build one convex hub from the four (or six) kerb lines of the incoming sections; sweep sidewalk+tarmac up to that polygon.

## Overhaul plan (queued, not started)

Do **not** launch a pixel gauntlet until a builder has shipped this and tests describe **mesh contact**, not only graph reachability.

1. Freeze taxi / AI / `roadnet.js` Dijkstra. Graph stays the source of truth.
2. Delete as the join strategy: junction plates, circus arm discs, island-wide union, “overlap 1.4 m and pray”.
3. **Edge mesh:** sweep one cross-section (tarmac, optional median, sidewalks) along the polyline; **trim** at a node cut distance from `junctionPad` / circus outer radius.
4. **Node mesh:**
   - degree 2 bend: miter or two quads (L), no plate
   - degree 3–4: convex hub polygon (kerb-line intersections) + sidewalk ring
   - circus: annulus; highway arms meet the annulus, not the island
5. Highway: treat as dual composition (option A or B above). One way each side.
6. Tests to add before any critic: for every paved node, every incoming carriageway’s **tarmac polygon** shares a boundary with the **node polygon** (no gap > 0.2 m, no sand). Dual arms share a boundary with the circus outer ring. Sidewalks continue around the hub outer.
7. Then — and only then — a gauntlet whose bar is a **screenshot of Harbour Circus + one Quayward T**, not “taxi reached town”.

Out of scope: OSM, Mapbox, Cesium, Capital Rift, Kenney kit swap, North rebuild until South circus+T read as one piece.

## Decision

Research first is done. Gauntlet on intersections is **blocked** until the node+edge mesh exists. The 500-repo list is the corpus; CS2 / Godot / OpenDRIVE / Clipper2 / Lanelet2 are the ones to steal **ideas** from, not code.
