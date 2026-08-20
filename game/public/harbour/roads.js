import * as THREE from "three";
import { ROAD_CLASSES, roadClassSpec, carriagewayWidthM } from "./roadclass.js";
import { junctionPad, pointInJunctionPad } from "./roadnet.js";
import { addQuadXZ, junctionKerbQuads } from "./roadjoin.js";
import { buildHubFootprint, buildCircusFootprint, clipPolylineToOutside, multiContains, FOOT_SHOULDER_M, biteRibbonWith, circleRing } from "./roadfoot.js";
import { circusesFromGraph, clipPolylineOutsideCircuses } from "./roadclip.js";

/** Concrete lip. Dark grit (0x3f3c36) sat next to black tarmac and vanished. */
export const SHOULDER = 0x9aa0a6;

/** Metres. A black tarmac ribbon, not a kerbed highway kit. */
export const PAVED_WIDTH_M = 7.2;
/** Metres. Field tracks only — thinner than the street. */
export const DIRT_WIDTH_M = 2.6;
/** Charcoal you can light — 0x141414 was a hole, not a road. */
export const ASPHALT = 0x333338;
/** Packed earth — same kraft family as crates, not grey pavement. */
export const DIRT = 0x8a6238;
/** Same stone as house plinth / window sills — original palette, not a new hex. */
export const STONE = 0x9a8a72;
/**
 * Dual median stripe. Pale stone (STONE) reads as sand from spawn.
 * Stay in the asphalt family — the dual is one black deck with this paint.
 */
export const MEDIAN = 0x1a1a18;
/** Pale coping walk beside the tarmac. Same cap family as the south quay. */
export const SIDEWALK = 0xb0a48c;
/** Drawn median width. Class medianM is the driving gap; this is the paint. */
export const MEDIAN_STRIPE_M = 1.8;
/** PathPhalt markings. Paper cream / kraft gold, wide enough to read from spawn. */
export const PAINT = 0xf4f0e4;
export const PAINT_YELLOW = 0xe0b03a;
export const PAINT_WIDTH_M = 0.36;
export const PAINT_DASH_M = 8;
export const PAINT_GAP_M = 5.5;
export const ASPHALT_TILE_M = 16;

function hash2(x, y) {
  let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function valueNoise(x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash2(x0, y0);
  const b = hash2(x0 + 1, y0);
  const c = hash2(x0, y0 + 1);
  const d = hash2(x0 + 1, y0 + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

let asphaltTex = null;
function asphaltMap() {
  if (asphaltTex) return asphaltTex;
  const s = 128;
  const data = new Uint8Array(s * s * 4);
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const i = (y * s + x) * 4;
      const n = valueNoise(x / 18, y / 18);
      const grain = hash2(x, y);
      const speck = hash2(x * 3, y * 5) > 0.88 ? -36 : 0;
      const b = Math.max(70, Math.min(255, 128 + n * 90 + grain * 28 + speck));
      data[i] = b;
      data[i + 1] = b;
      data[i + 2] = Math.max(70, b - 8);
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, s, s);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  asphaltTex = tex;
  return tex;
}

const matByKey = new Map();

/** Cool asphalt + grit. Tan hemisphere used to wash Lambert black into sand. */
function roadMaterial(color, roadKind, extra = {}) {
  const tarmac = roadKind === "paved" || roadKind === "junction" || roadKind === "median" || roadKind === "join";
  const paint = roadKind === "paint";
  const kerb = roadKind === "shoulder";
  const key = `${color}|${roadKind}|${extra.polygonOffsetFactor || 0}|${extra.emissiveIntensity || ""}`;
  const hit = matByKey.get(key);
  if (hit && !extra.emissive) return hit;
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: paint ? 0.42 : kerb ? 0.86 : 0.78,
    metalness: 0,
    map: tarmac || kerb ? asphaltMap() : null,
    emissive: paint ? color : 0x000000,
    emissiveIntensity: paint ? 0.38 : 0,
    polygonOffset: true,
    polygonOffsetFactor: paint ? -4 : -2,
    polygonOffsetUnits: paint ? -4 : -2,
    ...extra,
  });
  if (!extra.emissive) matByKey.set(key, mat);
  return mat;
}
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
function drawRibbon(scene, spec, road, heightAt, widthM, color, roadKind, matOpts = {}, skipGap = Infinity, yLift = 0, capStart = true, capEnd = true) {
  const pts = ribbonStations(road.points);
  if (pts.length < 2) return;

  const half = widthM / 2;
  const thick = RIBBON_HALF_THICK_M * 2;
  const n = pts.length;
  const positions = new Float32Array(n * 12);
  const uvs = new Float32Array(n * 8);
  const indices = [];
  const vSpan = Math.max(0.4, widthM / ASPHALT_TILE_M);
  let along = 0;

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
      if (dot > 0.25) {
        // Wide dual decks used to miter-blow into the verge. Cap the flare.
        const maxMiter = half > 9 ? 1.1 : 1.7;
        scale = Math.min(half / dot, half * maxMiter);
      }
    }
    const lx = pts[i].x - rx * scale;
    const lz = pts[i].z - rz * scale;
    const qx = pts[i].x + rx * scale;
    const qz = pts[i].z + rz * scale;
    const lift = (roadKind === "sidewalk" ? 0.18 : RIBBON_LIFT_M) + yLift;
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
    if (i > 0) along += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
    const u = along / ASPHALT_TILE_M;
    const uo = i * 8;
    uvs[uo] = u;
    uvs[uo + 1] = 0;
    uvs[uo + 2] = u;
    uvs[uo + 3] = vSpan;
    uvs[uo + 4] = u;
    uvs[uo + 5] = 0;
    uvs[uo + 6] = u;
    uvs[uo + 7] = vSpan;
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
  if (capStart) indices.push(2, 3, 1, 2, 1, 0);
  if (capEnd) {
    const e = (n - 1) * 4;
    indices.push(e, e + 1, e + 3, e, e + 3, e + 2);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const m = new THREE.Mesh(geo, roadMaterial(color, roadKind, matOpts));
  m.castShadow = false;
  m.receiveShadow = true;
  m.renderOrder = roadKind === "paint" ? 4 : 2;
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
const RIBBON_LIFT_M = 0.16;
/** Ribbon prism half-thickness. Flat join meshes sit on the ribbon top. */
const RIBBON_HALF_THICK_M = 0.07;
const TARMAC_TOP_M = RIBBON_LIFT_M + RIBBON_HALF_THICK_M;
/**
 * Taxi, delivery van, and AI cars follow graph nodes in XZ.
 * Y is terrain plus this lift so wheels sit on the visual deck, not in it.
 */
export const ROAD_DRIVE_LIFT_M = TARMAC_TOP_M + 0.08;
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

function drawablePoints(road) {
  // Vehicles drive the graph. The camera mesh is a filled deck — do not trim
  // ribbons away from hubs. That left sand stubs at every T.
  return densifyPts(ribbonStations(road.points), 6);
}

function joinKeepout(x, z, circuses, half) {
  for (const c of circuses || []) {
    const outer = c.outer || c.clip || 0;
    if (outer > 0 && Math.hypot(x - c.x, z - c.z) < outer + Math.max(2, half * 0.15)) return true;
  }
  return false;
}

function isCornerOrEnd(pts, i) {
  if (i === 0 || i === pts.length - 1) return true;
  const ax = pts[i].x - pts[i - 1].x;
  const az = pts[i].z - pts[i - 1].z;
  const bx = pts[i + 1].x - pts[i].x;
  const bz = pts[i + 1].z - pts[i].z;
  const al = Math.hypot(ax, az) || 1;
  const bl = Math.hypot(bx, bz) || 1;
  return (ax / al) * (bx / bl) + (az / al) * (bz / bl) < 0.97;
}

/**
 * Round caps at corners and ends (canvas lineJoin/lineCap round). The T
 * crotch is a disc, not a square plate sitting in sand.
 */
function drawRoundJoins(scene, spec, road, heightAt, widthM, circuses, yLift = 0) {
  const pts = ribbonStations(road.points);
  if (!pts.length) return;
  const half = widthM / 2;
  const slots = [];
  for (let i = 0; i < pts.length; i++) {
    if (!isCornerOrEnd(pts, i)) continue;
    const p = pts[i];
    if (joinKeepout(p.x, p.z, circuses, half)) continue;
    slots.push(p);
  }
  if (!slots.length) return;
  const geo = new THREE.CircleGeometry(half, 20);
  geo.rotateX(-Math.PI / 2);
  const uv = geo.attributes.uv;
  const uvScale = Math.max(1, widthM / ASPHALT_TILE_M);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * uvScale, uv.getY(i) * uvScale);
  const mesh = new THREE.InstancedMesh(geo, roadMaterial(ASPHALT, "paved"), slots.length);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.renderOrder = 2;
  mesh.frustumCulled = false;
  mesh.name = `road:${road.island}:${road.name || "road"} join`;
  mesh.userData = {
    kind: "road",
    mode: "PAPER",
    island: road.island,
    roadKind: "join",
    roadName: (road.name || "road") + " join",
    widthM,
  };
  const dummy = new THREE.Object3D();
  for (let i = 0; i < slots.length; i++) {
    const p = slots[i];
    dummy.position.set(p.x, heightAt(spec, p.x, p.z) + TARMAC_TOP_M + yLift, p.z);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);
}

function drawPaved(scene, spec, road, heightAt, graph, hubs, circuses) {
  const pts = drawablePoints(road);
  if (pts.length < 2) return;
  const cls = classOf(road);
  const width = roadClassSpec(cls).carriageM;
  const runs = clipRuns(pts, null, circuses, 1.6, road.edgeId);
  const paintRuns = clipRuns(pts, hubs, paintCircuses(circuses), 0, road.edgeId);
  drawClippedRuns(scene, spec, road, heightAt, runs, width + SHOULDER_PAD_M, SHOULDER, "shoulder", {}, -0.03, Infinity, null, circuses);
  drawClippedRuns(scene, spec, road, heightAt, runs, width, ASPHALT, "paved", {}, 0, Infinity, null, circuses);
  drawRoundJoins(scene, spec, road, heightAt, width, circuses);
  drawLanePaint(scene, spec, road, heightAt, paintRuns, width, false, 1);
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

function insideJoin(joins, x, z, edgeId, alwaysClip) {
  if (!joins) return false;
  for (const j of joins) {
    // Through / dual arms have trim 0. Cutting them is what made a T
    // read as two tapes plus a black plate. Walks still give way.
    if (!alwaysClip && edgeId && j.pad) {
      if (j.pad.trim && j.pad.trim[edgeId] === 0) continue;
      if (Array.isArray(j.pad.throughEdgeIds) && j.pad.throughEdgeIds.includes(edgeId)) continue;
    }
    const clip = (j.foot && (j.foot.clip || j.foot.tarmac)) || null;
    if (clip && multiContains(clip, x, z)) return true;
  }
  return false;
}

function clipToJoins(pts, joins, overlapM = 1.6, edgeId, alwaysClip) {
  if (!pts || pts.length < 2) return [];
  if (!joins || !joins.length) return [pts];
  const runs = clipPolylineToOutside(pts, (x, z) => insideJoin(joins, x, z, edgeId, alwaysClip));
  const extra = overlapM;
  return runs.map((run) => {
    if (!run || run.length < 2) return run;
    let out = run;
    for (const head of [true, false]) {
      const b = head ? out[0] : out[out.length - 1];
      const a = head ? out[1] : out[out.length - 2];
      const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      const p = { x: b.x + ((b.x - a.x) / len) * extra, z: b.z + ((b.z - a.z) / len) * extra };
      if (extra > 0 && insideJoin(joins, p.x, p.z, edgeId, alwaysClip)) {
        out = head ? [p].concat(out.slice(1)) : out.slice(0, -1).concat([p]);
      }
    }
    return out;
  });
}

/**
 * PathPhalt/Curva: T/L is a filled hub polygon; a circus is a circle.
 * Offset duals must hit the ring face, not a 12 m arm box in the grass.
 * Through arms are not hub-clipped.
 */
function clipRuns(pts, hubs, circuses, overlapM = 1.6, edgeId, alwaysClip) {
  const afterHubs = clipToJoins(pts, hubs, overlapM, edgeId, alwaysClip);
  if (!circuses || !circuses.length) return afterHubs;
  const out = [];
  for (const run of afterHubs) {
    if (!run || run.length < 2) continue;
    out.push(...clipPolylineOutsideCircuses(run, circuses));
  }
  return out.filter((r) => r && r.length >= 2);
}

function paintCircuses(circuses) {
  return (circuses || []).map((c) => ({
    ...c,
    clip: (c.outer || c.clip || 0) + 0.3,
  }));
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

function extendEnd(pts, head, extraM) {
  if (!pts || pts.length < 2 || extraM <= 0) return pts || [];
  const p = head ? pts[0] : pts[pts.length - 1];
  const q = head ? pts[1] : pts[pts.length - 2];
  const len = Math.hypot(p.x - q.x, p.z - q.z) || 1;
  const extra = { x: p.x + ((p.x - q.x) / len) * extraM, z: p.z + ((p.z - q.z) / len) * extraM };
  return head ? [extra].concat(pts) : pts.concat([extra]);
}

function splitJoinEnd(pts, head, stubM) {
  const total = polylineLen(pts);
  if (total <= stubM + 4) {
    return { stub: extendEnd(pts, head, 8), rest: null };
  }
  if (head) {
    const stub = sliceAlong(pts, 0, stubM);
    const rest = sliceAlong(pts, Math.max(0, stubM - 2.2), total);
    return { stub: extendEnd(stub, true, 8), rest };
  }
  const stub = sliceAlong(pts, Math.max(0, total - stubM), total);
  const rest = sliceAlong(pts, 0, total - stubM + 2.2);
  return { stub: extendEnd(stub, false, 8), rest };
}

function isThroughEdge(pad, edgeId) {
  if (!pad || !edgeId) return false;
  if (pad.trim && pad.trim[edgeId] === 0) return true;
  return Array.isArray(pad.throughEdgeIds) && pad.throughEdgeIds.includes(edgeId);
}

function joinCutterAt(p, hubs, circuses, roadKind, edgeId) {
  if (!p) return null;
  for (const c of circuses || []) {
    const outer = c.outer || c.clip;
    if (!(outer > 0)) continue;
    const d = Math.hypot(p.x - c.x, p.z - c.z);
    if (d > outer + 14 || d < (c.inner || 8) * 0.4) continue;
    const r = roadKind === "shoulder" ? outer + FOOT_SHOULDER_M : outer;
    return [[circleRing(c.x, c.z, r, 64)]];
  }
  for (const h of hubs || []) {
    const n = h.node;
    if (!n) continue;
    if (isThroughEdge(h.pad, edgeId)) continue;
    const reach = ((h.pad && h.pad.side) || 22) / 2 + 10;
    if (Math.hypot(p.x - n.x, p.z - n.z) > reach) continue;
    if (roadKind === "shoulder") return h.foot.outerClip || h.foot.clip || null;
    return h.foot.clip || h.foot.tarmac || null;
  }
  return null;
}

function drawBittenStub(scene, spec, road, heightAt, stub, cutter, widthM, color, roadKind, yLift) {
  const bitten = biteRibbonWith(stub, widthM / 2, cutter);
  if (!bitten || !bitten.length) {
    drawRibbon(scene, spec, { ...road, points: stub }, heightAt, widthM, color, roadKind, {}, Infinity, yLift || 0, false, false);
    return;
  }
  const mid = stub[Math.floor(stub.length / 2)] || stub[0];
  const lift = (roadKind === "sidewalk" ? 0.18 : TARMAC_TOP_M) + (yLift || 0);
  addMultiPolygonMesh(scene, bitten, heightAt(spec, mid.x, mid.z) + lift, color, {
    island: road.island,
    roadKind,
    roadName: road.name || "road",
    widthM,
    mode: "PAPER",
  }, 2);
}

/**
 * Strip body plus a join-bitten stub. The prism's square cap is the chord;
 * biting an overlap into the hub/circus makes the kerb the join outline.
 */
function drawClippedRuns(scene, spec, road, heightAt, runs, widthM, color, roadKind, matOpts, yLift, skipGap, hubs, circuses) {
  const hasJoins = (hubs && hubs.length) || (circuses && circuses.length);
  const edgeId = road && road.edgeId;
  for (const run of runs) {
    if (!run || run.length < 2) continue;
    if (!hasJoins) {
      drawRibbon(scene, spec, { ...road, points: run }, heightAt, widthM, color, roadKind, matOpts || {}, skipGap == null ? Infinity : skipGap, yLift || 0);
      continue;
    }
    const headCut = joinCutterAt(run[0], hubs, circuses, roadKind, edgeId);
    const tailCut = joinCutterAt(run[run.length - 1], hubs, circuses, roadKind, edgeId);
    let body = run;
    let capStart = true;
    let capEnd = true;
    if (headCut) {
      const part = splitJoinEnd(body, true, 16);
      drawBittenStub(scene, spec, road, heightAt, part.stub, headCut, widthM, color, roadKind, yLift);
      body = part.rest;
      capStart = false;
    }
    if (body && tailCut) {
      const part = splitJoinEnd(body, false, 16);
      drawBittenStub(scene, spec, road, heightAt, part.stub, tailCut, widthM, color, roadKind, yLift);
      body = part.rest;
      capEnd = false;
    }
    if (body && body.length >= 2) {
      drawRibbon(
        scene,
        spec,
        { ...road, points: body },
        heightAt,
        widthM,
        color,
        roadKind,
        matOpts || {},
        skipGap == null ? Infinity : skipGap,
        yLift || 0,
        capStart,
        capEnd,
      );
    }
  }
}

function polylineLen(pts) {
  let n = 0;
  for (let i = 0; i < pts.length - 1; i++) n += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].z - pts[i].z);
  return n;
}

function sliceAlong(pts, from, to) {
  const out = [];
  const step = 1.1;
  for (let d = from; d < to - 0.2; d += step) {
    const p = pointAlong(pts, d);
    if (p) out.push({ x: p.x, z: p.z });
  }
  const end = pointAlong(pts, to);
  if (end) out.push({ x: end.x, z: end.z });
  return ribbonStations(out);
}

/** One mesh: dashes concatenated, faces across the gap skipped. */
function dashStations(pts) {
  const total = polylineLen(pts);
  const out = [];
  for (let d = 0.8; d < total; d += PAINT_DASH_M + PAINT_GAP_M) {
    const slice = sliceAlong(pts, d, Math.min(total, d + PAINT_DASH_M));
    if (slice.length >= 2) for (const p of slice) out.push(p);
  }
  return out;
}

/**
 * PathPhalt markings on a carriage: cream dashes down the middle, cream
 * outer edge, kraft-gold median/inner edge on a dual.
 */
function drawLanePaint(scene, spec, road, heightAt, runs, carriageM, dual, side) {
  const inset = carriageM / 2 - PAINT_WIDTH_M * 0.7;
  const sign = side < 0 ? -1 : 1;
  const name = (road.name || "road") + " paint";
  for (const run of runs) {
    if (!run || run.length < 2) continue;
    const dashes = dashStations(run);
    if (dashes.length >= 2) {
      drawRibbon(scene, spec, { ...road, name, points: dashes }, heightAt, PAINT_WIDTH_M, PAINT, "paint", {}, 2.2, 0.05);
    }
    const outer = offsetPolyline(run, inset * sign);
    const inner = offsetPolyline(run, -inset * sign);
    if (outer.length >= 2) {
      drawRibbon(scene, spec, { ...road, name, points: outer }, heightAt, PAINT_WIDTH_M, PAINT, "paint", {}, Infinity, 0.05);
    }
    if (inner.length >= 2) {
      drawRibbon(
        scene,
        spec,
        { ...road, name, points: inner },
        heightAt,
        PAINT_WIDTH_M,
        dual ? PAINT_YELLOW : PAINT,
        "paint",
        {},
        Infinity,
        0.05,
      );
    }
  }
}

function drawSidewalks(scene, spec, road, heightAt, graph, hubs, circuses) {
  if (!hasSidewalk(road)) return;
  const cls = classOf(road);
  const walk = roadClassSpec(cls).sidewalkM;
  const pts = densifyPts(ribbonStations(road.points), 4);
  if (pts.length < 2) return;
  const offset = roadClassSpec(cls).carriageM / 2 + SHOULDER_PAD_M / 2 + walk / 2;
  const hasJoins = (hubs && hubs.length) || (circuses && circuses.length);
  for (const side of [-1, 1]) {
    const offsetPts = offsetPolyline(pts, offset * side);
    const pieces = hasJoins
      ? clipRuns(offsetPts, hubs, circuses, 0, road.edgeId, true)
      : splitRuns(omitInsidePads(offsetPts, graph, walk + 0.8), 10);
    drawClippedRuns(scene, spec, road, heightAt, pieces, walk, SIDEWALK, "sidewalk", {}, 0, Infinity, hubs, circuses);
  }
}

/**
 * One filled dual deck. Cars drive the graph a few centimetres above it,
 * so the camera can paint a continuous black road instead of two tapes.
 * Circus ends are still circle-bitten so the stone island stays a hole.
 */
function drawHighway(scene, spec, road, heightAt, graph, hubs, circuses) {
  const cls = classOf(road);
  const s = roadClassSpec(cls);
  const pts = drawablePoints(road);
  if (pts.length < 2) return;
  const deck = carriagewayWidthM(cls);
  const lane = s.medianM / 2 + s.carriageM / 2;
  const name = road.name || "Island Hwy";
  const runs = clipRuns(pts, null, circuses, 1.6, road.edgeId);
  drawClippedRuns(
    scene,
    spec,
    { ...road, name: name + " shoulder" },
    heightAt,
    runs,
    deck + SHOULDER_PAD_M,
    SHOULDER,
    "shoulder",
    {},
    -0.03,
    Infinity,
    null,
    circuses,
  );
  drawClippedRuns(scene, spec, road, heightAt, runs, deck, ASPHALT, "paved", {}, 0, Infinity, null, circuses);
  drawRoundJoins(scene, spec, road, heightAt, deck, circuses);
  drawClippedRuns(
    scene,
    spec,
    { ...road, name: name + " median" },
    heightAt,
    runs,
    MEDIAN_STRIPE_M,
    MEDIAN,
    "median",
    {},
    0.04,
    Infinity,
    null,
    circuses,
  );
  for (const side of [-1, 1]) {
    const offsetPts = offsetPolyline(pts, lane * side);
    const paintRuns = clipRuns(offsetPts, hubs, paintCircuses(circuses), 0, road.edgeId);
    drawLanePaint(scene, spec, road, heightAt, paintRuns, s.carriageM, true, side);
  }
}

function addJunctionPlate(scene, spec, heightAt, pad) {
  const y = heightAt(spec, pad.x, pad.z);
  const grit = new THREE.Mesh(
    new THREE.PlaneGeometry(pad.side + SHOULDER_PAD_M, pad.side + SHOULDER_PAD_M),
    roadMaterial(SHOULDER, "shoulder"),
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
    roadMaterial(ASPHALT, "junction"),
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
    const inner = foot.inner || 24;
    const outer = foot.outer || 42;
    const base = { island: node.island, footprint: true, label: node.name || "Circus" };
    const name = node.name || "Circus";

    // Ring is the join. No arm boxes — those were square edges in the grass.
    const grit = new THREE.Mesh(
      new THREE.RingGeometry(inner, outer + FOOT_SHOULDER_M, 64),
      roadMaterial(SHOULDER, "shoulder"),
    );
    grit.rotation.x = -Math.PI / 2;
    grit.position.set(node.x, y + 0.13, node.z);
    grit.castShadow = false;
    grit.receiveShadow = true;
    grit.userData = { kind: "road", mode: "PAPER", ...base, roadKind: "shoulder", roadName: name + " hub" };
    scene.add(grit);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(inner, outer, 64),
      roadMaterial(ASPHALT, "paved"),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(node.x, y + TARMAC_TOP_M, node.z);
    ring.castShadow = false;
    ring.receiveShadow = true;
    ring.renderOrder = 2;
    ring.userData = { kind: "road", mode: "PAPER", ...base, roadKind: "paved", roadName: name };
    ring.name = `road:${node.island}:${name}`;
    scene.add(ring);

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

function addMultiPolygonMesh(scene, mp, y, color, userData, renderOrder = 3) {
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
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      const pz = pos.getY(i);
      flat[i * 3] = px;
      flat[i * 3 + 1] = y;
      flat[i * 3 + 2] = pz;
      uv[i * 2] = px / ASPHALT_TILE_M;
      uv[i * 2 + 1] = pz / ASPHALT_TILE_M;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(flat, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    if (g.index) geo.setIndex(Array.from(g.index.array));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(
      geo,
      roadMaterial(color, userData.roadKind, {
        polygonOffsetFactor: userData.roadKind === "junction" ? 1 : -3,
        polygonOffsetUnits: userData.roadKind === "junction" ? 1 : -3,
      }),
    );
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.renderOrder = renderOrder;
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
    }, 1);
    addMultiPolygonMesh(scene, foot.shoulder, y + 0.13, SHOULDER, {
      ...base,
      roadKind: "shoulder",
      roadName: (node.name || "junction") + " hub",
    }, 1);
    addMultiPolygonMesh(scene, foot.tarmac, y + TARMAC_TOP_M, ASPHALT, {
      ...base,
      roadKind: "junction",
      roadName: (node.name || "junction") + " hub",
    }, 1);
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
 * Draw `/api/map` roads. Runs are ribbons that overlap hub fills.
 * A T/L is a filled hub plus round joins. A circus is a RingGeometry;
 * duals circle-cut onto that face. Cars do not sit on this mesh.
 */
export function makeRoads(map, helpers) {
  const { scene, specOf, heightAt } = helpers;
  const hubs = collectHubs(map.graph);
  const circusJoins = collectCircusJoins(map.graph);
  const circuses = circusesFromGraph(map.graph);
  drawHubs(scene, map, specOf, heightAt, hubs);
  drawCircusJoins(scene, map, specOf, heightAt, circusJoins);
  for (const road of map.roads) {
    const spec = specOf(road.island);
    if (road.kind === "paved" && road.roundabout) {
      continue;
    }
    if (road.kind === "paved" && road.lanes === 4) {
      drawHighway(scene, spec, road, heightAt, map.graph, hubs, circuses);
    } else if (road.kind === "paved") {
      drawPaved(scene, spec, road, heightAt, map.graph, hubs, circuses);
      drawSidewalks(scene, spec, road, heightAt, map.graph, hubs, circuses);
    } else {
      drawDirt(scene, spec, road, heightAt);
    }
  }
  drawLegacyJoins(scene, map, specOf, heightAt);
  drawNorthPortCurbs(scene, map, specOf, heightAt);
}
