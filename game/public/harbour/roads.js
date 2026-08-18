import * as THREE from "three";

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
export const LOCAL_WIDTH_M = 5.2;
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
  return islandId === "north" ? { x: 20, y: 24, z: 40 } : { x: -40, y: 32, z: -55 };
}

/** Metres from the player. North looks inland along Harbour Rd. South looks east along Island Hwy. */
export function spawnLookAtOffset(islandId) {
  return islandId === "north" ? { x: 0, y: 5, z: -120 } : { x: 200, y: 2, z: 80 };
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
function drawRibbon(scene, spec, road, heightAt, widthM, color, roadKind, matOpts = {}, skipGap = Infinity) {
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
      if (dot > 0.25) scale = Math.min(half / dot, half * 3);
    }
    const y = heightAt(spec, pts[i].x, pts[i].z) + (roadKind === "sidewalk" ? 0.16 : 0.1);
    const lx = pts[i].x - rx * scale;
    const lz = pts[i].z - rz * scale;
    const qx = pts[i].x + rx * scale;
    const qz = pts[i].z + rz * scale;
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

  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color, ...matOpts }));
  m.castShadow = false;
  m.receiveShadow = true;
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
/** Dual-carriageway stations inside this radius of a circus are omitted. */
export const HIGHWAY_RAB_OMIT_M = 36;
/** Skip ribbon faces across a gap this wide — must be < 2 × omit so the highway cannot chord the island. */
export const HIGHWAY_RAB_SKIP_M = 40;
/** Stone disc inside the circulatory ring. */
export const RAB_ISLAND_R_M = 24;

function distToPoly(pts, x, z) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const vx = b.x - a.x;
    const vz = b.z - a.z;
    const len2 = vx * vx + vz * vz || 1;
    let t = ((x - a.x) * vx + (z - a.z) * vz) / len2;
    t = Math.max(0, Math.min(1, t));
    best = Math.min(best, Math.hypot(x - (a.x + vx * t), z - (a.z + vz * t)));
  }
  return best;
}

function isLocalStreet(road) {
  if (!road || road.roundabout || road.lanes === 4) return false;
  const n = road.name || "";
  if (/Island Hwy|Harbour Rd/.test(n)) return false;
  return /Row |Alley |Spoke |Fork|Lane|Loop|End\b/.test(n);
}

function hasSidewalk(road) {
  if (!road || road.roundabout || road.lanes === 4 || isLocalStreet(road)) return false;
  const n = road.name || "";
  return /Rd$|High St|Harbour Rd/.test(n);
}

function roadRank(road) {
  if (road.lanes === 4) return 4;
  if (road.roundabout) return 3;
  if (isLocalStreet(road)) return 1;
  return 2;
}

function yieldGap(other) {
  if (other.lanes === 4) return 14;
  if (other.roundabout) return 20;
  return 6.5;
}

function trimYielding(pts, road, paved) {
  const rnk = roadRank(road);
  // Roundabout *rings* are not yield targets — distance-to-ring would nuke a
  // 40 m disk around every circus and leave a star of overlapping stubs.
  const others = (paved || []).filter(
    (o) => o !== road && !o.roundabout && o.points && o.points.length >= 2 && roadRank(o) > rnk,
  );
  if (!others.length) return pts;
  const out = pts.filter((p) => others.every((o) => distToPoly(o.points, p.x, p.z) >= yieldGap(o)));
  return out.length >= 2 ? out : pts;
}

function drawPaved(scene, spec, road, heightAt, paved) {
  const pts = trimYielding(ribbonStations(road.points), road, paved);
  if (pts.length < 2) return;
  const width = isLocalStreet(road) ? LOCAL_WIDTH_M : PAVED_WIDTH_M;
  drawRibbon(scene, spec, { ...road, points: pts }, heightAt, width, ASPHALT, "paved");
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

function rabCentres(map) {
  return (map.roads || [])
    .filter((r) => r.roundabout)
    .map((r) => r.joins || { x: r.points[0].x, z: r.points[0].z });
}

function omitNearCentres(pts, centres, gap = 20) {
  if (!centres.length) return pts;
  return pts.filter((p) => centres.every((c) => Math.hypot(p.x - c.x, p.z - c.z) >= gap));
}

function drawSidewalks(scene, spec, road, heightAt, centres, paved) {
  if (!hasSidewalk(road)) return;
  const pts = trimYielding(omitNearCentres(ribbonStations(road.points), centres, 36), road, paved);
  if (pts.length < 2) return;
  const offset = PAVED_WIDTH_M / 2 + SIDEWALK_WIDTH_M / 2 + 0.12;
  drawRibbon(scene, spec, { ...road, points: offsetPolyline(pts, -offset) }, heightAt, SIDEWALK_WIDTH_M, SIDEWALK, "sidewalk");
  drawRibbon(scene, spec, { ...road, points: offsetPolyline(pts, offset) }, heightAt, SIDEWALK_WIDTH_M, SIDEWALK, "sidewalk");
}

/** 2+2 lanes, stone median. Each carriageway is still a 7.2 m ribbon. */
function drawHighway(scene, spec, road, heightAt, centres) {
  const pts = omitNearCentres(ribbonStations(road.points), centres, HIGHWAY_RAB_OMIT_M);
  if (pts.length < 2) return;
  drawRibbon(
    scene,
    spec,
    { ...road, points: offsetPolyline(pts, -HIGHWAY_LANE_OFFSET_M) },
    heightAt,
    PAVED_WIDTH_M,
    ASPHALT,
    "paved",
    {},
    HIGHWAY_RAB_SKIP_M,
  );
  drawRibbon(
    scene,
    spec,
    { ...road, points: offsetPolyline(pts, HIGHWAY_LANE_OFFSET_M) },
    heightAt,
    PAVED_WIDTH_M,
    ASPHALT,
    "paved",
    {},
    HIGHWAY_RAB_SKIP_M,
  );
  drawRibbon(
    scene,
    spec,
    { ...road, name: (road.name || "Island Hwy") + " median", points: pts },
    heightAt,
    HIGHWAY_MEDIAN_M,
    STONE,
    "median",
    {},
    HIGHWAY_RAB_SKIP_M,
  );
}

function rabCenter(road) {
  const pts = road.points || [];
  let x = 0;
  let z = 0;
  for (const p of pts) {
    x += p.x;
    z += p.z;
  }
  return { x: x / pts.length, z: z / pts.length };
}

/** Flat asphalt annulus + stone island. Not a mitered polyline (those stacked at the circus). */
function drawRoundabout(scene, spec, road, heightAt) {
  const pts = road.points || [];
  if (pts.length < 8) return;
  const { x, z } = rabCenter(road);
  const y = heightAt(spec, x, z);
  const inner = RAB_ISLAND_R_M;
  const outer = inner + PAVED_WIDTH_M + 1.8;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(inner, outer, 32),
    new THREE.MeshLambertMaterial({ color: ASPHALT }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, y + 0.12, z);
  ring.castShadow = false;
  ring.receiveShadow = true;
  ring.userData.kind = "road";
  ring.userData.roadKind = "paved";
  ring.userData.island = road.island;
  ring.userData.roadName = road.name;
  ring.userData.label = road.name;
  ring.userData.widthM = outer - inner;
  ring.userData.mode = "PAPER";
  scene.add(ring);

  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(inner - 0.25, inner - 0.25, 0.36, 24),
    new THREE.MeshLambertMaterial({ color: STONE }),
  );
  disc.position.set(x, y + 0.18, z);
  disc.castShadow = false;
  disc.receiveShadow = true;
  disc.userData.kind = "road";
  disc.userData.roadKind = "island";
  disc.userData.island = road.island;
  disc.userData.label = (road.name || "Roundabout") + " island";
  disc.userData.mode = "PAPER";
  scene.add(disc);
}

function drawDirt(scene, spec, road, heightAt) {
  drawRibbon(scene, spec, road, heightAt, DIRT_WIDTH_M, DIRT, "dirt", {
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

/**
 * Draw `/api/map` roads. Paved = asphalt street. Dirt = thin packed earth on fields only.
 */
export function makeRoads(map, helpers) {
  const { scene, specOf, heightAt } = helpers;
  const centres = rabCentres(map);
  const paved = (map.roads || []).filter((r) => r.kind === "paved");
  for (const road of map.roads) {
    const spec = specOf(road.island);
    if (road.kind === "paved" && road.lanes === 4) {
      drawHighway(scene, spec, road, heightAt, centres);
    } else if (road.kind === "paved" && road.roundabout) {
      drawRoundabout(scene, spec, road, heightAt);
    } else if (road.kind === "paved") {
      drawPaved(scene, spec, road, heightAt, paved);
      drawSidewalks(scene, spec, road, heightAt, centres, paved);
    } else {
      drawDirt(scene, spec, road, heightAt);
    }
  }
  drawNorthPortCurbs(scene, map, specOf, heightAt);
}
