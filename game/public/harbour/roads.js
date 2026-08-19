import * as THREE from "three";
import { ROAD_CLASSES, carriagewayWidthM, roadClassSpec } from "./roadclass.js";
import { junctionPad, trimPolylineForPads, pointInJunctionPad } from "./roadnet.js";
import { addQuadXZ, junctionKerbQuads } from "./roadjoin.js";
import { buildHubFootprint, buildCircusFootprint, clipPolylineToOutside, multiContains } from "./roadfoot.js";

/** Grit shoulder under the tarmac edge, so a road has a rim instead of a cut edge. */
export const SHOULDER = 0x6f6a5e;

/** Metres. A black tarmac ribbon, not a kerbed highway kit. */
export const PAVED_WIDTH_M = 7.2;
/** Metres. Field tracks only — thinner than the street. */
export const DIRT_WIDTH_M = 2.6;
/** Black tarmac. */
export const ASPHALT = 0x141414;
/** Packed earth — same kraft family as crates, not grey pavement. */
export const DIRT = 0x8a6238;
/** Same stone as house plinth / window sills — original palette, not a new hex. */
export const STONE = 0x9a8a72;
/** Pale coping walk beside the tarmac. Same cap family as the south quay. */
export const SIDEWALK = 0xb0a48c;
export const SIDEWALK_WIDTH_M = 2.8;
/** Local T-stubs and town lanes — narrower than the arterial. */
export const LOCAL_WIDTH_M = ROAD_CLASSES.lane.carriageM;
/** Dusty lift so field tracks do not crush to paved black under Lambert. */
const DIRT_DUST = 0x9a6a40;

/**
 * Linear fog (metres). Ports are ~13.9 km apart after the island scale-up.
 */
export const FOG_NEAR_M = 6000;
export const FOG_FAR_M = 42000;
export const CAMERA_FAR_M = 52000;

/**
 * Spawn camera, metres from the player.
 *
 * Playtest view: camera sits on the quay (slightly seaward of the visitor)
 * and looks INLAND along the tarmac. South is offset north of Island Hwy
 * so the dual carriageway reads; it still looks toward Harbour Circus.
 */
export function spawnCameraOffset(islandId) {
  return islandId === "north" ? { x: 8, y: 5.2, z: 12 } : { x: -8, y: 5.2, z: -10 };
}

/** Metres from the player. North looks inland along Harbour Rd. South looks east along Island Hwy. */
export function spawnLookAtOffset(islandId) {
  return islandId === "north" ? { x: 0, y: 1.4, z: -32 } : { x: 22, y: 1.2, z: 18 };
}

/** Drop near-duplicates so the ribbon does not fold on itself. */
function ribbonStations(points) {
  const pts = [];
  for (const p of points) {
    if (pts.length && Math.hypot(p.x - pts[pts.length - 1].x, p.z - pts[pts.length - 1].z) < 0.4) continue;
    pts.push(p);
  }
  return pts;
}

/**
 * One prism along the polyline: mitered left/right edges, world-up
 * (no Frenet twist). Reads as a continuous ribbon, not paving slabs.
 */
function drawRibbon(scene, spec, road, heightAt, widthM, color, roadKind, matOpts = {}, skipGap = Infinity, yLift = 0) {
  const pts = ribbonStations(road.points);
  if (pts.length < 2) return;

  const half = widthM / 2;
  const thick = 0.14;
  const n = pts.length;
  const positions = new Float32Array(n * 12);
  const indices = [];

  for (let i = 0; i < n; i++) {
    let dx;
    let dz;
    if (i === 0) {
      dx = pts[1].x - pts[0].x;
      dz = pts[1].z - pts[0].z;
    } else if (i === n - 1) {
      dx = pts[i].x - pts[i - 1].x;
      dz = pts[i].z - pts[i - 1].z;
    } else {
      dx = pts[i + 1].x - pts[i - 1].x;
      dz = pts[i + 1].z - pts[i - 1].z;
    }
    const tlen = Math.hypot(dx, dz) || 1;
    const tx = dx / tlen;
    const tz = dz / tlen;
    // World-up × tangent → right in XZ.
    let rx = tz;
    let rz = -tx;
    let scale = half;
    if (i > 0 && i < n - 1) {
      const sx = pts[i].x - pts[i - 1].x;
      const sz = pts[i].z - pts[i - 1].z;
      const sl = Math.hypot(sx, sz) || 1;
      const dot = rx * (sz / sl) + rz * (-sx / sl);
      if (dot > 0.25) scale = Math.min(half / dot, half * 1.7);
    }
    const lx = pts[i].x - rx * scale;
    const lz = pts[i].z - rz * scale;
    const qx = pts[i].x + rx * scale;
    const qz = pts[i].z + rz * scale;
    const lift = (roadKind === "sidewalk" ? 0.18 : 0.16) + yLift;
    const yC = heightAt(spec, pts[i].x, pts[i].z);
    const yL = heightAt(spec, lx, lz);
    const yR = heightAt(spec, qx, qz);
    const y = Math.max(yC, yL, yR) + lift;
    const yT = y + thick / 2;
    const yB = y - thick / 2;
    const o = i * 12;
    positions[o] = lx;
    positions[o + 1] = yT;
    positions[o + 2] = lz;
    positions[o + 3] = qx;
    positions[o + 4] = yT;
    positions[o + 5] = qz;
    positions[o + 6] = lx;
    positions[o + 7] = yB;
    positions[o + 8] = lz;
    positions[o + 9] = qx;
    positions[o + 10] = yB;
    positions[o + 11] = qz;
  }

  for (let i = 0; i < n - 1; i++) {
    const gap = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].z - pts[i].z);
    if (gap > skipGap) continue;
    const a = i * 4;
    const b = a + 4;
    indices.push(a, b, b + 1, a, b + 1, a + 1);
    indices.push(a + 2, a + 3, b + 3, a + 2, b + 3, b + 2);
    indices.push(a, a + 2, b + 2, a, b + 2, b);
    indices.push(a + 1, b + 1, b + 3, a + 1, b + 3, a + 3);
  }
  indices.push(2, 3, 1, 2, 1, 0);
  const e = (n - 1) * 4;
  indices.push(e, e + 1, e + 3, e, e + 3, e + 2);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const m = new THREE.Mesh(
    geo,
    new THREE.MeshLambertMaterial({
      color,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      ...matOpts,
    }),
  );
  m.castShadow = false;
  m.receiveShadow = true;
  m.renderOrder = 2;
  const roadName = road.name || (roadKind === "paved" ? "Harbour Rd" : "dirt track");
  m.name = `road:${road.island}:${roadName}`;
  m.userData.kind = "road";
  m.userData.label = roadName;
  m.userData.island = road.island;
  m.userData.roadKind = roadKind;
  m.userData.roadName = roadName;
  m.userData.widthM = widthM;
  m.userData.mode = "PAPER";
  scene.add(m);
}

export const HIGHWAY_LANE_OFFSET_M = 8;
export const HIGHWAY_MEDIAN_M = 8;
/**
 * Safety: skip ribbon faces across a gap this wide. Circus joins are no
 * longer this skip — they are a circle clip in roadclip.js.
 */
export const HIGHWAY_RAB_SKIP_M = 40;
/** Stone disc inside the circulatory ring. Fallback when a node has no radius. */
export const RAB_ISLAND_R_M = 24;

function isLocalStreet(road) {
  if (!road || road.roundabout || road.lanes === 4) return false;
  if (road.cls) return road.cls === "lane";
  const n = road.name || "";
  if (/Island Hwy|Harbour Rd/.test(n)) return false;
  return /Row |Alley |Spoke |Fork|Lane|Loop|End\b/.test(n);
}

/** Legacy North roads carry no class. Give them the nearest one. */
function classOf(road) {
  if (road.cls) return road.cls;
  if (road.kind === "dirt") return "track";
  if (road.lanes === 4) return "highway";
  if (isLocalStreet(road)) return "lane";
  return /Harbour Rd/.test(road.name || "") ? "avenue" : "street";
}

function hasSidewalk(road) {
  if (!road || road.roundabout) return false;
  return roadClassSpec(classOf(road)).sidewalkM > 0;
}

/**
 * Carriageway plus a metre of grit each side. The band is what stops the
 * tarmac reading as black tape laid on bare sand.
 */
const SHOULDER_PAD_M = 2.2;

function densifyPts(pts, step) {
  if (!pts || pts.length < 2) return pts || [];
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const n = Math.max(1, Math.ceil(len / step));
    for (let s = 0; s < n; s++) {
      const t = s / n;
      out.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
    }
  }
  out.push(pts[pts.length - 1]);
  return ribbonStations(out);
}

function drawablePoints(road, graph) {
  let pts = ribbonStations(road.points);
  const edge = graph && road.edgeId ? graph.edges.find((e) => e.id === road.edgeId) : null;
  if (edge) pts = ribbonStations(trimPolylineForPads(pts, graph, edge));
  return densifyPts(pts, 6);
}

function drawPaved(scene, spec, road, heightAt, graph, joins) {
  const pts = drawablePoints(road, graph);
  if (pts.length < 2) return;
  const cls = classOf(road);
  const width = roadClassSpec(cls).carriageM;
  const runs = clipToJoins(pts, joins);
  drawClippedRuns(scene, spec, road, heightAt, runs, width + SHOULDER_PAD_M, SHOULDER, "shoulder", {}, -0.03);
  drawClippedRuns(scene, spec, road, heightAt, runs, width, ASPHALT, "paved");
}

export function offsetPolyline(points, dist) {
  const out = [];
  for (let i = 0; i < points.length; i++) {
    let dx;
    let dz;
    if (i === 0) {
      dx = points[1].x - points[0].x;
      dz = points[1].z - points[0].z;
    } else if (i === points.length - 1) {
      dx = points[i].x - points[i - 1].x;
      dz = points[i].z - points[i - 1].z;
    } else {
      dx = points[i + 1].x - points[i - 1].x;
      dz = points[i + 1].z - points[i - 1].z;
    }
    const len = Math.hypot(dx, dz) || 1;
    const rx = dz / len;
    const rz = -dx / len;
    out.push({ x: points[i].x + rx * dist, z: points[i].z + rz * dist });
  }
  return out;
}

function omitInsidePads(pts, graph, extra) {
  if (!graph || !pts.length) return pts;
  return pts.filter((p) => {
    for (const node of graph.nodes) {
      const pad = junctionPad(graph, node);
      if (pad && pointInJunctionPad(node, pad, p.x, p.z, extra)) return false;
    }
    return true;
  });
}

function insideJoin(joins, x, z) {
  if (!joins) return false;
  for (const j of joins) {
    const clip = (j.foot && (j.foot.clip || j.foot.tarmac)) || null;
    if (clip && multiContains(clip, x, z)) return true;
  }
  return false;
}

function clipToJoins(pts, joins) {
  if (!pts || pts.length < 2) return [];
  if (!joins || !joins.length) return [pts];
  const runs = clipPolylineToOutside(pts, (x, z) => insideJoin(joins, x, z));
  const extra = 1.6;
  return runs.map((run) => {
    if (!run || run.length < 2) return run;
    let out = run;
    for (const head of [true, false]) {
      const b = head ? out[0] : out[out.length - 1];
      const a = head ? out[1] : out[out.length - 2];
      const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      const p = { x: b.x + ((b.x - a.x) / len) * extra, z: b.z + ((b.z - a.z) / len) * extra };
      if (insideJoin(joins, p.x, p.z)) {
        out = head ? [p].concat(out.slice(1)) : out.slice(0, -1).concat([p]);
      }
    }
    return out;
  });
}

function collectHubs(graph) {
  const hubs = [];
  if (!graph || !graph.nodes) return hubs;
  for (const node of graph.nodes) {
    const pad = junctionPad(graph, node);
    if (!pad) continue;
    hubs.push({ node, pad, foot: buildHubFootprint(graph, node, pad) });
  }
  return hubs;
}

function collectCircusJoins(graph) {
  const out = [];
  if (!graph || !graph.nodes) return out;
  for (const node of graph.nodes) {
    if (node.kind !== "circus" || !node.radius) continue;
    out.push({ node, foot: buildCircusFootprint(graph, node), circus: true });
  }
  return out;
}

function splitRuns(pts, maxGap) {
  const runs = [];
  let run = [];
  for (const p of pts) {
    const last = run[run.length - 1];
    if (last && Math.hypot(p.x - last.x, p.z - last.z) > maxGap) {
      if (run.length >= 2) runs.push(run);
      run = [];
    }
    run.push(p);
  }
  if (run.length >= 2) runs.push(run);
  return runs;
}

function drawClippedRuns(scene, spec, road, heightAt, runs, widthM, color, roadKind, matOpts, yLift) {
  for (const run of runs) {
    if (!run || run.length < 2) continue;
    drawRibbon(scene, spec, { ...road, points: run }, heightAt, widthM, color, roadKind, matOpts || {}, Infinity, yLift || 0);
  }
}

function drawSidewalks(scene, spec, road, heightAt, graph, joins) {
  if (!hasSidewalk(road)) return;
  const cls = classOf(road);
  const walk = roadClassSpec(cls).sidewalkM;
  const pts = densifyPts(drawablePoints(road, graph), 4);
  if (pts.length < 2) return;
  const offset = roadClassSpec(cls).carriageM / 2 + SHOULDER_PAD_M / 2 + walk / 2;
  for (const side of [-1, 1]) {
    const offsetPts = offsetPolyline(pts, offset * side);
    const pieces = joins && joins.length
      ? clipToJoins(offsetPts, joins)
      : splitRuns(omitInsidePads(offsetPts, graph, walk + 0.8), 10);
    drawClippedRuns(scene, spec, road, heightAt, pieces, walk, SIDEWALK, "sidewalk");
  }
}

/** 2+2 lanes with a stone median. Widths come from the class table. */
function drawHighway(scene, spec, road, heightAt, graph, joins) {
  const cls = classOf(road);
  const s = roadClassSpec(cls);
  const pts = drawablePoints(road, graph);
  if (pts.length < 2) return;
  const lane = s.medianM / 2 + s.carriageM / 2;
  const name = road.name || "Island Hwy";
  const lip = clipToJoins(pts, joins);
  drawClippedRuns(
    scene,
    spec,
    { ...road, name: name + " shoulder" },
    heightAt,
    lip,
    carriagewayWidthM(cls) + SHOULDER_PAD_M,
    SHOULDER,
    "shoulder",
    {},
    -0.03,
  );
  for (const side of [-1, 1]) {
    drawClippedRuns(
      scene,
      spec,
      road,
      heightAt,
      clipToJoins(offsetPolyline(pts, lane * side), joins),
      s.carriageM,
      ASPHALT,
      "paved",
    );
  }
  drawClippedRuns(
    scene,
    spec,
    { ...road, name: name + " median" },
    heightAt,
    lip,
    s.medianM,
    STONE,
    "median",
    {},
    0.02,
  );
}

function addJunctionPlate(scene, spec, heightAt, pad) {
  const y = heightAt(spec, pad.x, pad.z);
  const grit = new THREE.Mesh(
    new THREE.PlaneGeometry(pad.side + SHOULDER_PAD_M, pad.side + SHOULDER_PAD_M),
    new THREE.MeshLambertMaterial({ color: SHOULDER }),
  );
  grit.rotation.order = "YXZ";
  grit.rotation.set(-Math.PI / 2, pad.yaw || 0, 0);
  grit.position.set(pad.x, y + 0.14, pad.z);
  grit.castShadow = false;
  grit.receiveShadow = true;
  grit.userData.kind = "road";
  grit.userData.roadKind = "shoulder";
  grit.userData.island = pad.island;
  grit.userData.roadName = pad.label;
  grit.userData.mode = "PAPER";
  scene.add(grit);

  const mesh = new THREE.Mesh(
    pad.round
      ? new THREE.CircleGeometry(pad.side / 2, 20)
      : new THREE.PlaneGeometry(pad.side, pad.side),
    new THREE.MeshLambertMaterial({ color: ASPHALT }),
  );
  mesh.rotation.order = "YXZ";
  mesh.rotation.set(-Math.PI / 2, pad.yaw || 0, 0);
  mesh.position.set(pad.x, y + 0.175, pad.z);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.userData.kind = "road";
  mesh.userData.roadKind = "junction";
  mesh.userData.island = pad.island;
  mesh.userData.roadName = pad.label;
  mesh.userData.label = pad.label;
  mesh.userData.widthM = pad.side;
  mesh.userData.mode = "PAPER";
  scene.add(mesh);
}

/**
 * L-shaped kerb fills in each wedge. A 3-point ribbon through a 90° / 270°
 * corner stair-steps; two quads stay square on the outer kerb.
 */
function drawJunctionWalks(scene, spec, heightAt, graph, node, pad) {
  const y = heightAt(spec, node.x, node.z);
  const { walks, tarmac } = junctionKerbQuads(graph, node, pad);
  const base = {
    island: node.island,
    roadName: (node.name || "junction") + " walk",
    label: (node.name || "junction") + " walk",
    junctionWalk: true,
  };
  for (const q of tarmac) {
    addQuadXZ(THREE, scene, q.a, q.b, q.c, q.d, y + 0.17, ASPHALT, {
      ...base,
      roadKind: "junction-fill",
      roadName: (node.name || "junction") + " fill",
    });
  }
  for (const q of walks) {
    addQuadXZ(THREE, scene, q.a, q.b, q.c, q.d, y + 0.185, SIDEWALK, {
      ...base,
      roadKind: "sidewalk",
      widthM: q.widthM,
    });
  }
}

/**
 * A slab of tarmac where roads actually meet.
 *
 * Junctions used to be made by deleting the minor road near the major one,
 * which left stubs ending in the sand. Corners are a square plate the ribbons
 * stop at, plus L-shaped kerb quads, so two streets meet as an L.
 */
function drawJunctions(scene, map, specOf, heightAt) {
  const graph = map.graph;
  const pads = [];
  if (graph && graph.nodes) {
    for (const node of graph.nodes) {
      const spec = junctionPad(graph, node);
      if (!spec) continue;
      const pad = {
        island: node.island,
        x: node.x,
        z: node.z,
        side: spec.side,
        yaw: spec.yaw,
        kind: spec.kind,
        walkM: spec.walkM,
        label: node.name || "junction",
      };
      addJunctionPlate(scene, specOf(pad.island), heightAt, pad);
      drawJunctionWalks(scene, specOf(node.island), heightAt, graph, node, spec);
    }
  }
  // Legacy roads (North) still describe a junction with `joins`.
  for (const road of map.roads || []) {
    if (road.cls || road.roundabout || !road.joins) continue;
    pads.push({
      island: road.island,
      x: road.joins.x,
      z: road.joins.z,
      side: PAVED_WIDTH_M + 2.4,
      yaw: 0,
      round: true,
      label: road.name || "junction",
    });
  }

  for (const pad of pads) {
    addJunctionPlate(scene, specOf(pad.island), heightAt, pad);
  }
}

function drawCircusJoins(scene, map, specOf, heightAt, joins) {
  for (const rec of joins || []) {
    const { node, foot } = rec;
    if (!foot) continue;
    const spec = specOf(node.island);
    const y = heightAt(spec, node.x, node.z);
    const base = { island: node.island, footprint: true, label: node.name || "Circus" };
    addMultiPolygonMesh(scene, foot.shoulder, y + 0.13, SHOULDER, {
      ...base,
      roadKind: "shoulder",
      roadName: (node.name || "Circus") + " hub",
    });
    addMultiPolygonMesh(scene, foot.tarmac, y + 0.2, ASPHALT, {
      ...base,
      roadKind: "paved",
      roadName: node.name || "Circus",
    });
    const inner = foot.inner || 24;
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(Math.max(4, inner - 0.25), Math.max(4, inner - 0.25), 0.36, 24),
      new THREE.MeshLambertMaterial({ color: STONE }),
    );
    disc.position.set(node.x, y + 0.18, node.z);
    disc.castShadow = false;
    disc.receiveShadow = true;
    disc.userData.kind = "road";
    disc.userData.roadKind = "island";
    disc.userData.island = node.island;
    disc.userData.label = (node.name || "Roundabout") + " island";
    disc.userData.mode = "PAPER";
    scene.add(disc);
  }
}

function drawDirt(scene, spec, road, heightAt) {
  drawRibbon(scene, spec, { ...road, points: densifyPts(ribbonStations(road.points), 6) }, heightAt, DIRT_WIDTH_M, DIRT, "dirt", {
    emissive: DIRT_DUST,
    emissiveIntensity: 0.24,
  });
}

/** Metres from paved centreline onto the grass lip. Past half-width, off the carriageway. */
const CURB_SETBACK_M = PAVED_WIDTH_M / 2 + 0.28;
/** A few stations on the north port stretch (street-props pack the first 280 m). */
const NORTH_PORT_CURBS = [
  { along: 22, side: -1 },
  { along: 22, side: 1 },
  { along: 58, side: 1 },
  { along: 96, side: -1 },
  { along: 138, side: 1 },
  { along: 184, side: -1 },
  { along: 232, side: 1 },
];

function pointAlong(points, dist) {
  let left = dist;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (len < 1e-4) continue;
    if (left <= len) {
      const t = left / len;
      return {
        x: a.x + (b.x - a.x) * t,
        z: a.z + (b.z - a.z) * t,
        qx: b.x,
        qz: b.z,
      };
    }
    left -= len;
  }
  return null;
}

function offsetFromCentreline(px, pz, qx, qz, side, setbackM) {
  const dx = qx - px;
  const dz = qz - pz;
  const len = Math.hypot(dx, dz) || 1;
  const s = side < 0 ? -1 : 1;
  return {
    x: px + (-dz / len) * s * setbackM,
    z: pz + (dx / len) * s * setbackM,
    yaw: Math.atan2(dx, dz),
  };
}

function paperCurb(stoneMat, kraftMat) {
  const g = new THREE.Group();
  g.userData.kind = "ground";
  g.userData.part = "curb";
  g.userData.mode = "PAPER";

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.86), stoneMat);
  body.position.y = 0.08;
  body.castShadow = false;
  body.receiveShadow = true;
  body.userData.kind = "ground";
  body.userData.part = "curb";
  body.userData.mode = "PAPER";

  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.05, 0.9), kraftMat);
  cap.position.y = 0.185;
  cap.castShadow = false;
  cap.receiveShadow = true;
  cap.userData.kind = "ground";
  cap.userData.part = "curb-cap";
  cap.userData.mode = "PAPER";

  g.add(body, cap);
  return g;
}

/**
 * A few kraft/stone PAPER boxes on the north-port grass lip so the tarmac
 * edge reads as a street, not a black strip. Discrete blocks, not a kerb kit.
 */
function drawNorthPortCurbs(scene, map, specOf, heightAt) {
  const road = (map.roads || []).find(
    (r) => r.kind === "paved" && r.island === "north" && r.points && r.points.length > 1,
  );
  if (!road) return;

  const spec = specOf("north");
  const root = new THREE.Group();
  root.name = "north-port-curbs";
  root.userData.kind = "ground";
  root.userData.mode = "PAPER";
  root.userData.part = "curbs";

  const stoneMat = new THREE.MeshLambertMaterial({ color: STONE });
  const kraftMat = new THREE.MeshLambertMaterial({ color: DIRT });

  for (const slot of NORTH_PORT_CURBS) {
    const along = pointAlong(road.points, slot.along);
    if (!along) continue;
    const at = offsetFromCentreline(along.x, along.z, along.qx, along.qz, slot.side, CURB_SETBACK_M);
    const y = heightAt(spec, at.x, at.z);
    if (y < 0.4) continue;
    const block = paperCurb(stoneMat, kraftMat);
    block.position.set(at.x, y, at.z);
    block.rotation.y = at.yaw;
    root.add(block);
  }

  if (root.children.length) scene.add(root);
}

function addMultiPolygonMesh(scene, mp, y, color, userData) {
  if (!mp || !mp.length) return 0;
  let n = 0;
  for (const poly of mp) {
    const outer = poly[0];
    if (!outer || outer.length < 4) continue;
    const shape = new THREE.Shape();
    shape.moveTo(outer[0][0], outer[0][1]);
    for (let i = 1; i < outer.length - 1; i++) shape.lineTo(outer[i][0], outer[i][1]);
    for (let h = 1; h < poly.length; h++) {
      const holePts = poly[h];
      if (!holePts || holePts.length < 4) continue;
      const hole = new THREE.Path();
      hole.moveTo(holePts[0][0], holePts[0][1]);
      for (let i = 1; i < holePts.length - 1; i++) hole.lineTo(holePts[i][0], holePts[i][1]);
      shape.holes.push(hole);
    }
    const g = new THREE.ShapeGeometry(shape);
    const pos = g.attributes.position;
    const flat = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      flat[i * 3] = pos.getX(i);
      flat[i * 3 + 1] = y;
      flat[i * 3 + 2] = pos.getY(i);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(flat, 3));
    if (g.index) geo.setIndex(Array.from(g.index.array));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshLambertMaterial({
        color,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
      }),
    );
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.renderOrder = 3;
    mesh.userData = { kind: "road", mode: "PAPER", ...userData };
    mesh.name = `road:${userData.island}:${userData.roadName}`;
    scene.add(mesh);
    n += 1;
  }
  return n;
}

function drawHubs(scene, map, specOf, heightAt, hubs) {
  const list = hubs || collectHubs(map.graph);
  for (const rec of list) {
    const { node, pad, foot } = rec;
    const spec = specOf(node.island);
    const y = heightAt(spec, node.x, node.z);
    const base = { island: node.island, footprint: true, label: node.name || "junction" };
    addMultiPolygonMesh(scene, foot.sidewalk, y + 0.08, SIDEWALK, {
      ...base,
      roadKind: "sidewalk",
      roadName: (node.name || "junction") + " walk",
      widthM: pad.walkM || 2,
    });
    addMultiPolygonMesh(scene, foot.shoulder, y + 0.13, SHOULDER, {
      ...base,
      roadKind: "shoulder",
      roadName: (node.name || "junction") + " hub",
    });
    addMultiPolygonMesh(scene, foot.tarmac, y + 0.2, ASPHALT, {
      ...base,
      roadKind: "junction",
      roadName: (node.name || "junction") + " hub",
    });
  }
}

/** Legacy North roads that still describe a join with `joins`, not the graph. */
function drawLegacyJoins(scene, map, specOf, heightAt) {
  for (const road of map.roads || []) {
    if (road.cls || road.roundabout || !road.joins) continue;
    addJunctionPlate(scene, specOf(road.island), heightAt, {
      island: road.island,
      x: road.joins.x,
      z: road.joins.z,
      side: PAVED_WIDTH_M + 2.4,
      yaw: 0,
      round: true,
      label: road.name || "junction",
    });
  }
}

/**
 * Draw `/api/map` roads. Runs are ribbons. Joins are a small unioned hub,
 * not the whole island boolean-unioned into a splat.
 */
export function makeRoads(map, helpers) {
  const { scene, specOf, heightAt } = helpers;
  const hubs = collectHubs(map.graph);
  const circusJoins = collectCircusJoins(map.graph);
  const joins = hubs.concat(circusJoins);
  for (const road of map.roads) {
    const spec = specOf(road.island);
    if (road.kind === "paved" && road.roundabout) {
      continue;
    }
    if (road.kind === "paved" && road.lanes === 4) {
      drawHighway(scene, spec, road, heightAt, map.graph, joins);
    } else if (road.kind === "paved") {
      drawPaved(scene, spec, road, heightAt, map.graph, joins);
      drawSidewalks(scene, spec, road, heightAt, map.graph, joins);
    } else {
      drawDirt(scene, spec, road, heightAt);
    }
  }
  drawCircusJoins(scene, map, specOf, heightAt, circusJoins);
  drawHubs(scene, map, specOf, heightAt, hubs);
  drawLegacyJoins(scene, map, specOf, heightAt);
  drawNorthPortCurbs(scene, map, specOf, heightAt);
}
