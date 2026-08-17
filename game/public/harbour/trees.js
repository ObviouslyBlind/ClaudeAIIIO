import * as THREE from "three";

/** Stay this far off the paved centreline (metres). */
export const PAVED_CLEAR_M = 12;
/** Stay this far off field dirt tracks (metres). */
export const DIRT_CLEAR_M = 4;
/** Same water cut as land / walk. */
export const WATER_MIN_M = 0.4;
/** Public quay half-width from port x. */
export const QUAY_ACROSS_M = 18;
/** Phone harbour: share geometry; unique Mesh objects stay under this. */
export const MAX_UNIQUE_MESHES = 80;
/** Leaf blobs per trunk. */
export const LEAVES_PER_TREE = 3;

/**
 * Extra PAPER palms on the north-port grass verge, inland of the quay.
 * `along` is metres down the paved spline from the inland road head.
 * Setback 14–16 m is off the tarmac (outside ROAD_CLEAR 11 / PAVED_CLEAR 12)
 * and off onPublicQuay. Distinct from the d=22/38 verge loop.
 */
export const NORTH_PORT_PALM_OFFSETS = Object.freeze([
  Object.freeze({ along: 10, side: -1, setback: 15 }),
  Object.freeze({ along: 40, side: 1, setback: 14 }),
  Object.freeze({ along: 78, side: -1, setback: 16 }),
  Object.freeze({ along: 120, side: -1, setback: 15 }),
]);

/**
 * Extra PAPER palms on the south-port grass verge, inland of the quay.
 * Mirror of north: 14–16 m off the tarmac (outside ROAD_CLEAR 11 / PAVED_CLEAR 12)
 * and off onPublicQuay. Distinct from the d=22/52 verge loop and from
 * NORTH_PORT_PALM_OFFSETS.
 */
export const SOUTH_PORT_PALM_OFFSETS = Object.freeze([
  Object.freeze({ along: 8, side: 1, setback: 15 }),
  Object.freeze({ along: 48, side: -1, setback: 14 }),
]);

const TRUNK = 0x8a6238;
const TRUNK_WARM = 0x9a6a40;
const LEAF = 0x3f7a38;
const LEAF_DEEP = 0x2f6b32;

function hash(n) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function distToPolyline(points, x, z) {
  let best = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const vx = b.x - a.x;
    const vz = b.z - a.z;
    const len2 = vx * vx + vz * vz || 1;
    let t = ((x - a.x) * vx + (z - a.z) * vz) / len2;
    t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(x - (a.x + vx * t), z - (a.z + vz * t));
    if (d < best) best = d;
  }
  return best;
}

function nearestOnPolyline(points, x, z) {
  let best = Infinity;
  let px = x;
  let pz = z;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const vx = b.x - a.x;
    const vz = b.z - a.z;
    const len2 = vx * vx + vz * vz || 1;
    let t = ((x - a.x) * vx + (z - a.z) * vz) / len2;
    t = Math.max(0, Math.min(1, t));
    const qx = a.x + vx * t;
    const qz = a.z + vz * t;
    const d = Math.hypot(x - qx, z - qz);
    if (d < best) {
      best = d;
      px = qx;
      pz = qz;
    }
  }
  return { x: px, z: pz, dist: best };
}

function polylineLength(points) {
  let n = 0;
  for (let i = 1; i < points.length; i++) {
    n += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
  }
  return n;
}

function pointAlong(points, dist) {
  let acc = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (acc + len >= dist) {
      const t = (dist - acc) / (len || 1);
      return {
        x: a.x + (b.x - a.x) * t,
        z: a.z + (b.z - a.z) * t,
        qx: b.x,
        qz: b.z,
      };
    }
    acc += len;
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
  };
}

function pointInRing(x, z, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const zi = ring[i][1];
    const xj = ring[j][0];
    const zj = ring[j][1];
    const hit = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-9) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

function roadsOf(map, island, kind) {
  return (map.roads || []).filter(
    (r) => r.kind === kind && r.island === island && r.points && r.points.length > 1,
  );
}

function distToKind(map, island, x, z, kind) {
  let best = Infinity;
  for (const r of roadsOf(map, island, kind)) {
    best = Math.min(best, distToPolyline(r.points, x, z));
  }
  return best;
}

export function onPublicQuay(spec, x, z) {
  const along = (z - spec.port.z) * (spec.id === "north" ? 1 : -1);
  const across = Math.abs(x - spec.port.x);
  return across < QUAY_ACROSS_M && along > -32 && along < 100;
}

function onAnyPlot(map, island, x, z) {
  for (const p of map.plots || []) {
    if (p.island !== island || !p.ring) continue;
    if (pointInRing(x, z, p.ring)) return true;
  }
  return false;
}

function canPlant(map, spec, heightAt, x, z) {
  if (onPublicQuay(spec, x, z)) return false;
  if (heightAt(spec, x, z) < WATER_MIN_M) return false;
  if (distToKind(map, spec.id, x, z, "paved") < PAVED_CLEAR_M) return false;
  if (distToKind(map, spec.id, x, z, "dirt") < DIRT_CLEAR_M) return false;
  if (onAnyPlot(map, spec.id, x, z)) return false;
  return true;
}

function cellKey(x, z, cell) {
  return Math.round(x / cell) + ":" + Math.round(z / cell);
}

function tryPlace(placed, seen, map, spec, heightAt, x, z, role, cell) {
  const key = cellKey(x, z, cell);
  if (seen.has(key)) return false;
  if (!canPlant(map, spec, heightAt, x, z)) return false;
  const y = heightAt(spec, x, z);
  placed.push({ island: spec.id, x, z, y, role });
  seen.add(key);
  return true;
}

function behindStreetLots(placed, seen, map, spec, heightAt) {
  const paved = roadsOf(map, spec.id, "paved")[0];
  if (!paved) return;
  for (const plot of map.plots || []) {
    if (plot.island !== spec.id || plot.band !== "street") continue;
    const dPort = Math.hypot(plot.x - spec.port.x, plot.z - spec.port.z);
    const near = dPort < 400;
    if (!near && hash(plot.x * 0.01 + plot.z * 0.02 + (spec.id === "north" ? 1 : 4)) < 0.62) {
      continue;
    }
    const nearPt = nearestOnPolyline(paved.points, plot.x, plot.z);
    const dx = plot.x - nearPt.x;
    const dz = plot.z - nearPt.z;
    const len = Math.hypot(dx, dz) || 1;
    const ux = dx / len;
    const uz = dz / len;
    const copies = near ? 2 : 1;
    for (let i = 0; i < copies; i++) {
      const extra = 11 + i * 9 + hash(plot.x + i * 13 + plot.z) * 6;
      tryPlace(
        placed,
        seen,
        map,
        spec,
        heightAt,
        plot.x + ux * extra,
        plot.z + uz * extra,
        near ? "spawn" : "lot-back",
        near ? 12 : 16,
      );
    }
  }
}

function alongPavedVerge(placed, seen, map, spec, heightAt) {
  const paved = roadsOf(map, spec.id, "paved")[0];
  if (!paved) return;
  const length = polylineLength(paved.points);

  const extras =
    spec.id === "north"
      ? NORTH_PORT_PALM_OFFSETS
      : spec.id === "south"
        ? SOUTH_PORT_PALM_OFFSETS
        : [];
  for (const extra of extras) {
    const along = pointAlong(paved.points, extra.along);
    if (!along) continue;
    const at = offsetFromCentreline(
      along.x,
      along.z,
      along.qx,
      along.qz,
      extra.side,
      extra.setback,
    );
    if (tryPlace(placed, seen, map, spec, heightAt, at.x, at.z, "spawn", 10)) {
      if (spec.id === "north") placed[placed.length - 1].dress = "north-port-palm";
    }
  }

  // A few PAPER trees on the grass strip beside the tarmac (street lots begin
  // ~18 m). 14–16 m is outside ROAD_CLEAR / PAVED_CLEAR. Skip some stations so
  // it reads as a verge, not an avenue wall.
  const vergeEnd = Math.min(spec.id === "north" ? 340 : 220, length * 0.14);
  const vergeStep = spec.id === "north" ? 38 : 52;
  for (let d = 22; d < vergeEnd; d += vergeStep) {
    const alongJitter = (hash(d * 5 + (spec.id === "north" ? 0.7 : 1.9)) - 0.5) * 6;
    const along = pointAlong(paved.points, Math.max(8, d + alongJitter));
    if (!along) continue;
    for (const side of [-1, 1]) {
      if (hash(d * 7 + side + (spec.id === "north" ? 0.2 : 1.4)) < 0.22) continue;
      const setback = 14 + hash(d * 3 + side + (spec.id === "north" ? 0.4 : 2.1)) * 2;
      const at = offsetFromCentreline(along.x, along.z, along.qx, along.qz, side, setback);
      tryPlace(placed, seen, map, spec, heightAt, at.x, at.z, "spawn", 10);
    }
  }

  const denseEnd = Math.min(420, length * 0.18);
  const denseStep = spec.id === "north" ? 20 : 28;
  for (let d = 50; d < denseEnd; d += denseStep) {
    const along = pointAlong(paved.points, d);
    if (!along) continue;
    for (const side of [-1, 1]) {
      for (const setback of [24, 46, 70]) {
        const jitter = (hash(d * 3 + side * 9 + setback + (spec.id === "north" ? 0 : 5)) - 0.5) * 7;
        const at = offsetFromCentreline(along.x, along.z, along.qx, along.qz, side, setback + jitter);
        tryPlace(placed, seen, map, spec, heightAt, at.x, at.z, "spawn", 12);
      }
    }
  }
  for (let d = denseEnd + 40; d < length - 60; d += spec.id === "north" ? 72 : 96) {
    const along = pointAlong(paved.points, d);
    if (!along) continue;
    for (const side of [-1, 1]) {
      const setback = 54 + hash(d + side) * 18;
      const at = offsetFromCentreline(along.x, along.z, along.qx, along.qz, side, setback);
      tryPlace(placed, seen, map, spec, heightAt, at.x, at.z, "lot-back", 18);
    }
  }
}

function hillAndSlopes(placed, seen, map, spec, heightAt) {
  const inland = spec.id === "north" ? -1 : 1;
  const hillN = spec.id === "north" ? 56 : 44;
  for (let i = 0; i < hillN; i++) {
    const ang = (i / hillN) * Math.PI * 2 + hash(i + (spec.id === "north" ? 0.2 : 1.1));
    const rad = 70 + hash(i * 5 + 8) * 640;
    tryPlace(
      placed,
      seen,
      map,
      spec,
      heightAt,
      spec.hill.x + Math.cos(ang) * rad,
      spec.hill.z + Math.sin(ang) * rad,
      "hill",
      22,
    );
  }

  const hx = spec.hill.x - spec.port.x;
  const hz = spec.hill.z - spec.port.z;
  const hlen = Math.hypot(hx, hz) || 1;
  const nx = -hz / hlen;
  const nz = hx / hlen;
  const slopeN = spec.id === "north" ? 42 : 32;
  for (let i = 0; i < slopeN; i++) {
    const t = 0.1 + hash(i * 7 + 3) * 0.72;
    const side = i % 2 ? 1 : -1;
    const off = 50 + hash(i * 3) * 320;
    tryPlace(
      placed,
      seen,
      map,
      spec,
      heightAt,
      spec.port.x + hx * t + nx * side * off,
      spec.port.z + hz * t + nz * side * off,
      "slope",
      20,
    );
  }

  // Fill the inland view cone from spawn (not the quay apron).
  const fanRows = spec.id === "north" ? 10 : 6;
  const fanCols = spec.id === "north" ? 6 : 4;
  for (let r = 0; r < fanRows; r++) {
    const along = 80 + r * 30;
    for (let c = 0; c < fanCols; c++) {
      const side = c % 2 ? 1 : -1;
      const lane = 1 + Math.floor(c / 2);
      const across = 28 + lane * 20 + hash(r * 11 + c) * 8;
      tryPlace(
        placed,
        seen,
        map,
        spec,
        heightAt,
        spec.port.x + side * across,
        spec.port.z + inland * along,
        "spawn",
        12,
      );
    }
  }
}

function collectSites(map, specOf, heightAt) {
  const placed = [];
  const seen = new Set();
  const ids = new Set();
  for (const r of map.roads || []) if (r.island) ids.add(r.island);
  for (const p of map.plots || []) if (p.island) ids.add(p.island);
  if (!ids.size) {
    ids.add("north");
    ids.add("south");
  }
  for (const id of ids) {
    const spec = specOf(id);
    if (!spec) continue;
    behindStreetLots(placed, seen, map, spec, heightAt);
    alongPavedVerge(placed, seen, map, spec, heightAt);
    hillAndSlopes(placed, seen, map, spec, heightAt);
  }
  return placed;
}

function plantInstanced(root, placed) {
  const n = placed.length;
  if (!n) return;

  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.3, 1, 5);
  const leafGeo = new THREE.IcosahedronGeometry(1, 0);
  const trunkMat = new THREE.MeshLambertMaterial({ color: TRUNK });
  const leafMat = new THREE.MeshLambertMaterial({ color: LEAF });

  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, n);
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, n * LEAVES_PER_TREE);
  trunks.name = "tree-trunks";
  leaves.name = "tree-leaves";
  trunks.userData.kind = "tree-trunks";
  leaves.userData.kind = "tree-leaves";
  trunks.castShadow = true;
  leaves.castShadow = true;
  trunks.receiveShadow = true;
  leaves.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const trunkA = new THREE.Color(TRUNK);
  const trunkB = new THREE.Color(TRUNK_WARM);
  const leafA = new THREE.Color(LEAF);
  const leafB = new THREE.Color(LEAF_DEEP);

  for (let i = 0; i < n; i++) {
    const p = placed[i];
    const h = 3.6 + hash(p.x * 0.07 + p.z * 0.11) * 2.8;
    const lean = (hash(p.z * 0.05 + i) - 0.5) * 0.14;
    dummy.position.set(p.x, p.y + h * 0.5, p.z);
    dummy.rotation.set(lean * 0.3, hash(i * 1.7) * Math.PI * 2, lean);
    dummy.scale.set(0.85 + hash(i) * 0.35, h, 0.85 + hash(i + 2) * 0.35);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    trunks.setColorAt(i, hash(i * 3) > 0.45 ? trunkA : trunkB);

    const crownY = p.y + h * 0.82;
    for (let k = 0; k < LEAVES_PER_TREE; k++) {
      const a = (k / LEAVES_PER_TREE) * Math.PI * 2 + hash(i + k);
      const rad = k === 0 ? 0.15 : 0.7 + hash(i * 5 + k) * 0.45;
      const s = (k === 0 ? 1.55 : 1.15) + hash(i * 9 + k) * 0.7;
      dummy.position.set(
        p.x + Math.cos(a) * rad,
        crownY + (k === 0 ? 0.55 : hash(k + i) * 0.45 - 0.1),
        p.z + Math.sin(a) * rad,
      );
      dummy.rotation.set(0, a, 0);
      dummy.scale.set(s, s * 0.85, s);
      dummy.updateMatrix();
      const li = i * LEAVES_PER_TREE + k;
      leaves.setMatrixAt(li, dummy.matrix);
      leaves.setColorAt(li, k === 0 ? leafA : leafB);
    }
  }

  trunks.instanceMatrix.needsUpdate = true;
  leaves.instanceMatrix.needsUpdate = true;
  if (trunks.instanceColor) trunks.instanceColor.needsUpdate = true;
  if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
  trunks.computeBoundingSphere();
  leaves.computeBoundingSphere();
  root.add(trunks, leaves);
}

/**
 * A few kraft PAPER coconut boxes at the base of north-port verge palms.
 * Original wood browns only. Off the tarmac (PAVED_CLEAR / ROAD_CLEAR).
 * Unique meshes — one small box per palm plus one extra — so the phone
 * mesh budget stays tiny.
 */
function plantNorthPortCoconuts(root, placed, map, specOf, heightAt) {
  const sites = placed.filter((p) => p.island === "north" && p.dress === "north-port-palm");
  if (!sites.length) return;
  const spec = specOf("north");
  if (!spec) return;

  const geo = new THREE.BoxGeometry(0.2, 0.16, 0.18);
  const matA = new THREE.MeshLambertMaterial({ color: TRUNK });
  const matB = new THREE.MeshLambertMaterial({ color: TRUNK_WARM });
  const group = new THREE.Group();
  group.name = "coconuts";
  group.userData.kind = "coconuts";
  group.userData.provenance = "PAPER";

  function addNut(i, p, yawSpin) {
    const yaw = hash(i * 4.1 + p.x) * Math.PI * 2 + yawSpin;
    const rad = 0.38 + hash(i * 2.3 + yawSpin) * 0.22;
    let x = p.x + Math.cos(yaw) * rad;
    let z = p.z + Math.sin(yaw) * rad;
    if (distToKind(map, "north", x, z, "paved") < PAVED_CLEAR_M) {
      x = p.x;
      z = p.z;
    }
    if (distToKind(map, "north", x, z, "paved") < PAVED_CLEAR_M) return false;
    if (onPublicQuay(spec, x, z)) return false;
    const y = heightAt(spec, x, z);
    if (y < WATER_MIN_M) return false;
    const nut = new THREE.Mesh(geo, hash(i * 3 + yawSpin) > 0.45 ? matA : matB);
    nut.name = "coconut";
    nut.userData.part = "coconut";
    nut.userData.dress = "coconut";
    nut.userData.provenance = "PAPER";
    nut.castShadow = true;
    nut.receiveShadow = true;
    nut.position.set(x, y + 0.08, z);
    nut.rotation.y = yaw;
    group.add(nut);
    return true;
  }

  for (let i = 0; i < sites.length; i++) {
    addNut(i, sites[i], 0);
  }
  // One extra kraft PAPER box under a north-port palm (same recipe).
  for (let i = 0; i < sites.length; i++) {
    if (addNut(i + 17, sites[i], Math.PI * 0.62)) break;
  }
  if (group.children.length) root.add(group);
}

function markBird(mesh) {
  mesh.userData.part = "bird";
  mesh.userData.dress = "bird";
  mesh.userData.provenance = "PAPER";
  mesh.castShadow = true;
  mesh.receiveShadow = true;
}

/**
 * One small kraft PAPER bird (body + wing boxes) under a north-port verge
 * palm. Hexes already in this file: trunk kraft + leaf greens. Off the
 * tarmac (PAVED_CLEAR / ROAD_CLEAR). Unique meshes — three boxes — so the
 * phone mesh budget stays tiny. Coconuts and palm count stay put.
 */
function plantNorthPortBird(root, placed, map, specOf, heightAt) {
  const sites = placed.filter((p) => p.island === "north" && p.dress === "north-port-palm");
  if (!sites.length) return;
  const spec = specOf("north");
  if (!spec) return;

  const bodyGeo = new THREE.BoxGeometry(0.16, 0.1, 0.22);
  const wingGeo = new THREE.BoxGeometry(0.2, 0.035, 0.08);
  const bodyMat = new THREE.MeshLambertMaterial({ color: TRUNK });
  const wingMat = new THREE.MeshLambertMaterial({ color: LEAF_DEEP });

  for (let i = 0; i < sites.length; i++) {
    const p = sites[i];
    const yaw = hash(i * 6.7 + p.z) * Math.PI * 2;
    const rad = 0.48 + hash(i * 1.9) * 0.12;
    let x = p.x + Math.cos(yaw) * rad;
    let z = p.z + Math.sin(yaw) * rad;
    if (distToKind(map, "north", x, z, "paved") < PAVED_CLEAR_M) {
      x = p.x;
      z = p.z;
    }
    if (distToKind(map, "north", x, z, "paved") < PAVED_CLEAR_M) continue;
    if (onPublicQuay(spec, x, z)) continue;
    const y = heightAt(spec, x, z);
    if (y < WATER_MIN_M) continue;

    const bird = new THREE.Group();
    bird.name = "bird";
    bird.userData.kind = "bird";
    bird.userData.part = "bird";
    bird.userData.dress = "bird";
    bird.userData.provenance = "PAPER";
    bird.position.set(x, y + 0.16, z);
    bird.rotation.y = yaw + Math.PI * 0.5;

    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.name = "bird-body";
    markBird(body);

    const wingL = new THREE.Mesh(wingGeo, wingMat);
    wingL.name = "bird-wing";
    markBird(wingL);
    wingL.position.set(-0.1, 0.02, 0);
    wingL.rotation.z = 0.38;

    const wingR = new THREE.Mesh(wingGeo, wingMat);
    wingR.name = "bird-wing";
    markBird(wingR);
    wingR.position.set(0.1, 0.02, 0);
    wingR.rotation.z = -0.38;

    bird.add(body, wingL, wingR);
    root.add(bird);
    return;
  }
}

function markNest(mesh) {
  mesh.userData.part = "nest";
  mesh.userData.dress = "nest";
  mesh.userData.provenance = "PAPER";
  mesh.castShadow = true;
  mesh.receiveShadow = true;
}

/**
 * One small kraft PAPER nest (two twig boxes) under a north-port verge
 * palm, beside the bird — not instead of it. Hexes already in this file:
 * trunk kraft. Off the tarmac (PAVED_CLEAR / ROAD_CLEAR). Unique meshes —
 * two boxes — so the phone mesh budget stays tiny. Trunks, leaves,
 * coconuts, and the bird stay put.
 */
function plantNorthPortNest(root, placed, map, specOf, heightAt) {
  const sites = placed.filter((p) => p.island === "north" && p.dress === "north-port-palm");
  if (!sites.length) return;
  const spec = specOf("north");
  if (!spec) return;

  const twigGeo = new THREE.BoxGeometry(0.2, 0.04, 0.08);
  const matA = new THREE.MeshLambertMaterial({ color: TRUNK });
  const matB = new THREE.MeshLambertMaterial({ color: TRUNK_WARM });

  for (let i = 0; i < sites.length; i++) {
    const p = sites[i];
    // Same palm as the bird, yaw-offset so the nest sits beside it.
    const yaw = hash(i * 6.7 + p.z) * Math.PI * 2 + Math.PI * 0.85;
    const rad = 0.5 + hash(i * 2.2) * 0.1;
    let x = p.x + Math.cos(yaw) * rad;
    let z = p.z + Math.sin(yaw) * rad;
    if (distToKind(map, "north", x, z, "paved") < PAVED_CLEAR_M) {
      x = p.x;
      z = p.z;
    }
    if (distToKind(map, "north", x, z, "paved") < PAVED_CLEAR_M) continue;
    if (onPublicQuay(spec, x, z)) continue;
    const y = heightAt(spec, x, z);
    if (y < WATER_MIN_M) continue;

    const nest = new THREE.Group();
    nest.name = "nest";
    nest.userData.kind = "nest";
    nest.userData.part = "nest";
    nest.userData.dress = "nest";
    nest.userData.provenance = "PAPER";
    nest.position.set(x, y + 0.04, z);
    nest.rotation.y = yaw;

    const twigA = new THREE.Mesh(twigGeo, matA);
    twigA.name = "nest-twig";
    markNest(twigA);
    twigA.rotation.y = 0.45;

    const twigB = new THREE.Mesh(twigGeo, matB);
    twigB.name = "nest-twig";
    markNest(twigB);
    twigB.position.y = 0.02;
    twigB.rotation.y = -0.7;

    nest.add(twigA, twigB);
    root.add(nest);
    return;
  }
}

function markEgg(mesh) {
  mesh.userData.part = "egg";
  mesh.userData.dress = "egg";
  mesh.userData.provenance = "PAPER";
  mesh.castShadow = true;
  mesh.receiveShadow = true;
}

/**
 * One small kraft PAPER egg (one box) in the north-port palm nest —
 * not instead of the bird or nest. Hexes already in this file: trunk
 * kraft. Reuses the nest twig box so geometry count stays put. Unique
 * mesh — one box — so the phone mesh budget stays tiny. Trunks, leaves,
 * coconuts, bird, and nest stay put.
 */
function plantNorthPortEgg(root) {
  let nest = null;
  root.traverse((obj) => {
    if (!nest && obj.userData.kind === "nest") nest = obj;
  });
  if (!nest) return;

  let geo = null;
  nest.traverse((obj) => {
    if (geo) return;
    if (obj.isMesh && obj.geometry) geo = obj.geometry;
  });
  if (!geo) return;

  const mat = new THREE.MeshLambertMaterial({ color: TRUNK_WARM });
  const egg = new THREE.Group();
  egg.name = "egg";
  egg.userData.kind = "egg";
  egg.userData.part = "egg";
  egg.userData.dress = "egg";
  egg.userData.provenance = "PAPER";
  // Sit in the nest cup, above the crossed twigs.
  egg.position.set(0.01, 0.055, 0);

  const box = new THREE.Mesh(geo, mat);
  box.name = "egg-box";
  markEgg(box);
  box.scale.set(0.32, 1.4, 0.72);

  egg.add(box);
  nest.add(egg);
}

function markLeaf(mesh) {
  mesh.userData.part = "leaf";
  mesh.userData.dress = "leaf";
  mesh.userData.provenance = "PAPER";
  mesh.castShadow = true;
  mesh.receiveShadow = true;
}

/**
 * One small kraft PAPER leaf (one box) on a north-port palm nest twig —
 * not instead of the coconut, bird, nest, or egg. Hexes already in this
 * file: trunk kraft. Reuses the nest twig box so geometry count stays
 * put. Unique mesh — one box — so the phone mesh budget stays tiny.
 * Trunks, leaves, coconuts, bird, nest, and egg stay put.
 */
function plantNorthPortLeaf(root) {
  let nest = null;
  root.traverse((obj) => {
    if (!nest && obj.userData.kind === "nest") nest = obj;
  });
  if (!nest) return;

  let geo = null;
  nest.traverse((obj) => {
    if (geo) return;
    if (obj.isMesh && obj.geometry && obj.userData.part === "nest") geo = obj.geometry;
  });
  if (!geo) return;

  const mat = new THREE.MeshLambertMaterial({ color: TRUNK });
  const leaf = new THREE.Group();
  leaf.name = "leaf";
  leaf.userData.kind = "leaf";
  leaf.userData.part = "leaf";
  leaf.userData.dress = "leaf";
  leaf.userData.provenance = "PAPER";
  // Sit on a nest twig, beside the egg — not in its cup.
  leaf.position.set(0.06, 0.038, 0.02);
  leaf.rotation.set(0.15, 0.6, 0.35);

  const box = new THREE.Mesh(geo, mat);
  box.name = "leaf-box";
  markLeaf(box);
  box.scale.set(0.55, 0.35, 1.15);

  leaf.add(box);
  nest.add(leaf);
}

function markFrond(mesh) {
  mesh.userData.part = "frond";
  mesh.userData.dress = "frond";
  mesh.userData.provenance = "PAPER";
  mesh.castShadow = true;
  mesh.receiveShadow = true;
}

/**
 * One small kraft PAPER frond tip (one box) on a north-port palm —
 * not instead of the coconut, bird, nest, egg, or leaf. Hexes already
 * in this file: leaf green. Reuses the nest twig box so geometry count
 * stays put. Unique mesh — one box — so the phone mesh budget stays tiny.
 * Trunks, leaves, coconuts, bird, nest, egg, and leaf stay put.
 */
function plantNorthPortFrond(root) {
  let nest = null;
  root.traverse((obj) => {
    if (!nest && obj.userData.kind === "nest") nest = obj;
  });
  if (!nest) return;

  let geo = null;
  nest.traverse((obj) => {
    if (geo) return;
    if (obj.isMesh && obj.geometry && obj.userData.part === "nest") geo = obj.geometry;
  });
  if (!geo) return;

  const mat = new THREE.MeshLambertMaterial({ color: LEAF });
  const frond = new THREE.Group();
  frond.name = "frond";
  frond.userData.kind = "frond";
  frond.userData.part = "frond";
  frond.userData.dress = "frond";
  frond.userData.provenance = "PAPER";
  // Sit on the palm nest as a tiny tip, opposite the kraft leaf.
  frond.position.set(-0.07, 0.048, -0.03);
  frond.rotation.set(-0.25, -0.55, 0.4);

  const box = new THREE.Mesh(geo, mat);
  box.name = "frond-box";
  markFrond(box);
  box.scale.set(0.4, 0.28, 0.95);

  frond.add(box);
  nest.add(frond);
}

function markHusk(mesh) {
  mesh.userData.part = "husk";
  mesh.userData.dress = "husk";
  mesh.userData.provenance = "PAPER";
  mesh.castShadow = true;
  mesh.receiveShadow = true;
}

/**
 * One tiny kraft PAPER coconut husk (one box) on a north-port palm —
 * not instead of the coconut, bird, nest, egg, leaf, or frond. Hexes
 * already in this file: trunk kraft. Reuses the nest twig box so
 * geometry count stays put. Unique mesh — one box — so the phone mesh
 * budget stays tiny. Trunks, leaves, coconuts, bird, nest, egg, leaf,
 * and frond stay put.
 */
function plantNorthPortHusk(root) {
  let nest = null;
  root.traverse((obj) => {
    if (!nest && obj.userData.kind === "nest") nest = obj;
  });
  if (!nest) return;

  let geo = null;
  nest.traverse((obj) => {
    if (geo) return;
    if (obj.isMesh && obj.geometry && obj.userData.part === "nest") geo = obj.geometry;
  });
  if (!geo) return;

  const mat = new THREE.MeshLambertMaterial({ color: TRUNK_WARM });
  const husk = new THREE.Group();
  husk.name = "husk";
  husk.userData.kind = "husk";
  husk.userData.part = "husk";
  husk.userData.dress = "husk";
  husk.userData.provenance = "PAPER";
  // Sit on the palm nest, offset from frond, leaf, and egg.
  husk.position.set(0.04, 0.022, -0.055);
  husk.rotation.set(0.4, 1.1, -0.2);

  const box = new THREE.Mesh(geo, mat);
  box.name = "husk-box";
  markHusk(box);
  box.scale.set(0.48, 0.55, 0.62);

  husk.add(box);
  nest.add(husk);
}

function markVine(mesh) {
  mesh.userData.part = "vine";
  mesh.userData.dress = "vine";
  mesh.userData.provenance = "PAPER";
  mesh.castShadow = true;
  mesh.receiveShadow = true;
}

/**
 * One tiny kraft PAPER vine (one box) on a north-port palm —
 * not instead of the husk, frond, leaf, coconut, or nest. Hexes
 * already in this file: trunk kraft. Reuses the nest twig box so
 * geometry count stays put. Unique mesh — one box — so the phone
 * mesh budget stays tiny. Trunks, leaves, coconuts, bird, nest,
 * egg, leaf, frond, and husk stay put.
 */
function plantNorthPortVine(root) {
  let nest = null;
  root.traverse((obj) => {
    if (!nest && obj.userData.kind === "nest") nest = obj;
  });
  if (!nest) return;

  let geo = null;
  nest.traverse((obj) => {
    if (geo) return;
    if (obj.isMesh && obj.geometry && obj.userData.part === "nest") geo = obj.geometry;
  });
  if (!geo) return;

  const mat = new THREE.MeshLambertMaterial({ color: TRUNK });
  const vine = new THREE.Group();
  vine.name = "vine";
  vine.userData.kind = "vine";
  vine.userData.part = "vine";
  vine.userData.dress = "vine";
  vine.userData.provenance = "PAPER";
  // Sit on the palm nest, offset from husk, frond, leaf, and coconut.
  vine.position.set(-0.05, 0.025, 0.05);
  vine.rotation.set(0.55, -0.9, 0.3);

  const box = new THREE.Mesh(geo, mat);
  box.name = "vine-box";
  markVine(box);
  box.scale.set(0.35, 0.4, 0.7);

  vine.add(box);
  nest.add(vine);
}

function markTwig(mesh) {
  mesh.userData.part = "twig";
  mesh.userData.dress = "twig";
  mesh.userData.mode = "PAPER";
  mesh.userData.provenance = "PAPER";
  mesh.castShadow = true;
  mesh.receiveShadow = true;
}

/**
 * One tiny kraft PAPER twig (one box) on a north-port palm nest —
 * not instead of the vine, husk, frond, leaf, coconut, bird, nest, or
 * egg. Hexes already in this file: trunk kraft. Reuses the nest twig
 * box so geometry count stays put. Unique mesh — one box — so the
 * phone mesh budget stays tiny. Trunks, leaves, coconuts, bird, nest,
 * egg, leaf, frond, husk, and vine stay put.
 */
function plantNorthPortTwig(root) {
  let nest = null;
  root.traverse((obj) => {
    if (!nest && obj.userData.kind === "nest") nest = obj;
  });
  if (!nest) return;

  let geo = null;
  nest.traverse((obj) => {
    if (geo) return;
    if (obj.isMesh && obj.geometry && obj.userData.part === "nest") geo = obj.geometry;
  });
  if (!geo) return;

  const mat = new THREE.MeshLambertMaterial({ color: TRUNK });
  const twig = new THREE.Group();
  twig.name = "twig";
  twig.userData.kind = "twig";
  twig.userData.part = "twig";
  twig.userData.dress = "twig";
  twig.userData.mode = "PAPER";
  twig.userData.provenance = "PAPER";
  // Sit on the palm nest, offset from vine, husk, frond, leaf, and egg.
  twig.position.set(0.08, 0.016, 0.05);
  twig.rotation.set(0.2, 0.8, -0.35);

  const box = new THREE.Mesh(geo, mat);
  box.name = "twig-box";
  markTwig(box);
  box.scale.set(0.3, 0.35, 0.55);

  twig.add(box);
  nest.add(twig);
}

function markBark(mesh) {
  mesh.userData.part = "bark";
  mesh.userData.dress = "bark";
  mesh.userData.mode = "PAPER";
  mesh.userData.provenance = "PAPER";
  mesh.castShadow = true;
  mesh.receiveShadow = true;
}

/**
 * One tiny kraft PAPER bark flake (one box) on a north-port palm trunk —
 * not instead of the twig, vine, husk, frond, leaf, coconut, bird, nest, or
 * egg. Hexes already in this file: trunk kraft. Reuses the nest twig
 * box so geometry count stays put. Unique mesh — one box — so the
 * phone mesh budget stays tiny. Trunks, leaves, coconuts, bird, nest,
 * egg, leaf, frond, husk, vine, and twig stay put.
 */
function plantNorthPortBark(root) {
  const placed = root.userData.placed || [];
  const sites = placed.filter((p) => p.island === "north" && p.dress === "north-port-palm");
  if (!sites.length) return;

  let nest = null;
  root.traverse((obj) => {
    if (!nest && obj.userData.kind === "nest") nest = obj;
  });
  if (!nest) return;

  let geo = null;
  nest.traverse((obj) => {
    if (geo) return;
    if (obj.isMesh && obj.geometry && obj.userData.part === "nest") geo = obj.geometry;
  });
  if (!geo) return;

  const nestPos = new THREE.Vector3();
  nest.getWorldPosition(nestPos);
  let p = sites[0];
  let best = Infinity;
  for (const s of sites) {
    const d = Math.hypot(s.x - nestPos.x, s.z - nestPos.z);
    if (d < best) {
      best = d;
      p = s;
    }
  }

  const mat = new THREE.MeshLambertMaterial({ color: TRUNK });
  const bark = new THREE.Group();
  bark.name = "bark";
  bark.userData.kind = "bark";
  bark.userData.part = "bark";
  bark.userData.dress = "bark";
  bark.userData.mode = "PAPER";
  bark.userData.provenance = "PAPER";
  // Sit on the palm trunk, a little above the nest and coconuts.
  const yaw = 0.55;
  const rad = 0.22;
  bark.position.set(p.x + Math.cos(yaw) * rad, p.y + 1.15, p.z + Math.sin(yaw) * rad);
  bark.rotation.set(0.2, yaw, 0.45);

  const box = new THREE.Mesh(geo, mat);
  box.name = "bark-box";
  markBark(box);
  box.scale.set(0.28, 0.9, 0.32);

  bark.add(box);
  root.add(bark);
}

function markKnot(mesh) {
  mesh.userData.part = "knot";
  mesh.userData.dress = "knot";
  mesh.userData.mode = "PAPER";
  mesh.userData.provenance = "PAPER";
  mesh.castShadow = true;
  mesh.receiveShadow = true;
}

/**
 * One tiny kraft PAPER knot (one box) on a north-port palm trunk —
 * not instead of the bark, twig, vine, husk, frond, leaf, coconut, bird,
 * nest, or egg. Hexes already in this file: trunk kraft. Reuses the nest
 * twig box so geometry count stays put. Unique mesh — one box — so the
 * phone mesh budget stays tiny. Trunks, leaves, coconuts, bird, nest,
 * egg, leaf, frond, husk, vine, twig, and bark stay put.
 */
function plantNorthPortKnot(root) {
  const placed = root.userData.placed || [];
  const sites = placed.filter((p) => p.island === "north" && p.dress === "north-port-palm");
  if (!sites.length) return;

  let nest = null;
  root.traverse((obj) => {
    if (!nest && obj.userData.kind === "nest") nest = obj;
  });
  if (!nest) return;

  let geo = null;
  nest.traverse((obj) => {
    if (geo) return;
    if (obj.isMesh && obj.geometry && obj.userData.part === "nest") geo = obj.geometry;
  });
  if (!geo) return;

  const nestPos = new THREE.Vector3();
  nest.getWorldPosition(nestPos);
  let p = sites[0];
  let best = Infinity;
  for (const s of sites) {
    const d = Math.hypot(s.x - nestPos.x, s.z - nestPos.z);
    if (d < best) {
      best = d;
      p = s;
    }
  }

  const mat = new THREE.MeshLambertMaterial({ color: TRUNK });
  const knot = new THREE.Group();
  knot.name = "knot";
  knot.userData.kind = "knot";
  knot.userData.part = "knot";
  knot.userData.dress = "knot";
  knot.userData.mode = "PAPER";
  knot.userData.provenance = "PAPER";
  // Sit on the palm trunk, offset from the bark flake.
  const yaw = 2.35;
  const rad = 0.22;
  knot.position.set(p.x + Math.cos(yaw) * rad, p.y + 0.72, p.z + Math.sin(yaw) * rad);
  knot.rotation.set(0.15, yaw, -0.3);

  const box = new THREE.Mesh(geo, mat);
  box.name = "knot-box";
  markKnot(box);
  box.scale.set(0.24, 0.55, 0.26);

  knot.add(box);
  root.add(knot);
}

function markMoss(mesh) {
  mesh.userData.part = "moss";
  mesh.userData.dress = "moss";
  mesh.userData.mode = "PAPER";
  mesh.userData.provenance = "PAPER";
  mesh.castShadow = true;
  mesh.receiveShadow = true;
}

/**
 * One tiny kraft PAPER moss patch (one box) on a north-port palm trunk —
 * not instead of the knot, bark, twig, vine, husk, frond, leaf, coconut,
 * bird, nest, or egg. Hexes already in this file: trunk kraft. Reuses the
 * nest twig box so geometry count stays put. Unique mesh — one box — so
 * the phone mesh budget stays tiny. Trunks, leaves, coconuts, bird, nest,
 * egg, leaf, frond, husk, vine, twig, bark, and knot stay put.
 */
function plantNorthPortMoss(root) {
  const placed = root.userData.placed || [];
  const sites = placed.filter((p) => p.island === "north" && p.dress === "north-port-palm");
  if (!sites.length) return;

  let nest = null;
  root.traverse((obj) => {
    if (!nest && obj.userData.kind === "nest") nest = obj;
  });
  if (!nest) return;

  let geo = null;
  nest.traverse((obj) => {
    if (geo) return;
    if (obj.isMesh && obj.geometry && obj.userData.part === "nest") geo = obj.geometry;
  });
  if (!geo) return;

  const nestPos = new THREE.Vector3();
  nest.getWorldPosition(nestPos);
  let p = sites[0];
  let best = Infinity;
  for (const s of sites) {
    const d = Math.hypot(s.x - nestPos.x, s.z - nestPos.z);
    if (d < best) {
      best = d;
      p = s;
    }
  }

  const mat = new THREE.MeshLambertMaterial({ color: TRUNK });
  const moss = new THREE.Group();
  moss.name = "moss";
  moss.userData.kind = "moss";
  moss.userData.part = "moss";
  moss.userData.dress = "moss";
  moss.userData.mode = "PAPER";
  moss.userData.provenance = "PAPER";
  // Sit on the palm trunk, offset from the knot and bark flake.
  const yaw = 4.15;
  const rad = 0.22;
  moss.position.set(p.x + Math.cos(yaw) * rad, p.y + 1.48, p.z + Math.sin(yaw) * rad);
  moss.rotation.set(-0.2, yaw, 0.25);

  const box = new THREE.Mesh(geo, mat);
  box.name = "moss-box";
  markMoss(box);
  box.scale.set(0.32, 0.45, 0.38);

  moss.add(box);
  root.add(moss);
}

function markLichen(mesh) {
  mesh.userData.part = "lichen";
  mesh.userData.dress = "lichen";
  mesh.userData.mode = "PAPER";
  mesh.userData.provenance = "PAPER";
  mesh.castShadow = true;
  mesh.receiveShadow = true;
}

/**
 * One tiny kraft PAPER lichen patch (one box) on a north-port palm trunk —
 * not instead of the moss, knot, bark, twig, vine, husk, frond, leaf,
 * coconut, bird, nest, or egg. Hexes already in this file: trunk kraft.
 * Reuses the nest twig box so geometry count stays put. Unique mesh —
 * one box — so the phone mesh budget stays tiny. Trunks, leaves,
 * coconuts, bird, nest, egg, leaf, frond, husk, vine, twig, bark, knot,
 * and moss stay put.
 */
function plantNorthPortLichen(root) {
  const placed = root.userData.placed || [];
  const sites = placed.filter((p) => p.island === "north" && p.dress === "north-port-palm");
  if (!sites.length) return;

  let nest = null;
  root.traverse((obj) => {
    if (!nest && obj.userData.kind === "nest") nest = obj;
  });
  if (!nest) return;

  let geo = null;
  nest.traverse((obj) => {
    if (geo) return;
    if (obj.isMesh && obj.geometry && obj.userData.part === "nest") geo = obj.geometry;
  });
  if (!geo) return;

  const nestPos = new THREE.Vector3();
  nest.getWorldPosition(nestPos);
  let p = sites[0];
  let best = Infinity;
  for (const s of sites) {
    const d = Math.hypot(s.x - nestPos.x, s.z - nestPos.z);
    if (d < best) {
      best = d;
      p = s;
    }
  }

  const mat = new THREE.MeshLambertMaterial({ color: TRUNK });
  const lichen = new THREE.Group();
  lichen.name = "lichen";
  lichen.userData.kind = "lichen";
  lichen.userData.part = "lichen";
  lichen.userData.dress = "lichen";
  lichen.userData.mode = "PAPER";
  lichen.userData.provenance = "PAPER";
  // Sit on the palm trunk, offset from the moss, knot, and bark flake.
  const yaw = 5.65;
  const rad = 0.22;
  lichen.position.set(p.x + Math.cos(yaw) * rad, p.y + 1.88, p.z + Math.sin(yaw) * rad);
  lichen.rotation.set(0.18, yaw, -0.4);

  const box = new THREE.Mesh(geo, mat);
  box.name = "lichen-box";
  markLichen(box);
  box.scale.set(0.3, 0.5, 0.34);

  lichen.add(box);
  root.add(lichen);
}

function markNeedle(mesh) {
  mesh.userData.part = "needle";
  mesh.userData.dress = "needle";
  mesh.userData.mode = "PAPER";
  mesh.userData.provenance = "PAPER";
  mesh.castShadow = true;
  mesh.receiveShadow = true;
}

/**
 * One tiny kraft PAPER needle tuft (one box) on a north-port palm trunk —
 * not instead of the lichen, moss, knot, bark, twig, vine, husk, frond,
 * leaf, coconut, bird, nest, or egg. Hexes already in this file: trunk
 * kraft. Reuses the nest twig box so geometry count stays put. Unique
 * mesh — one box — so the phone mesh budget stays tiny. Trunks, leaves,
 * coconuts, bird, nest, egg, leaf, frond, husk, vine, twig, bark, knot,
 * moss, and lichen stay put.
 */
function plantNorthPortNeedle(root) {
  const placed = root.userData.placed || [];
  const sites = placed.filter((p) => p.island === "north" && p.dress === "north-port-palm");
  if (!sites.length) return;

  let nest = null;
  root.traverse((obj) => {
    if (!nest && obj.userData.kind === "nest") nest = obj;
  });
  if (!nest) return;

  let geo = null;
  nest.traverse((obj) => {
    if (geo) return;
    if (obj.isMesh && obj.geometry && obj.userData.part === "nest") geo = obj.geometry;
  });
  if (!geo) return;

  const nestPos = new THREE.Vector3();
  nest.getWorldPosition(nestPos);
  let p = sites[0];
  let best = Infinity;
  for (const s of sites) {
    const d = Math.hypot(s.x - nestPos.x, s.z - nestPos.z);
    if (d < best) {
      best = d;
      p = s;
    }
  }

  const mat = new THREE.MeshLambertMaterial({ color: TRUNK });
  const needle = new THREE.Group();
  needle.name = "needle";
  needle.userData.kind = "needle";
  needle.userData.part = "needle";
  needle.userData.dress = "needle";
  needle.userData.mode = "PAPER";
  needle.userData.provenance = "PAPER";
  // Sit on the palm trunk, offset from lichen, moss, knot, and bark flake.
  const yaw = 1.45;
  const rad = 0.22;
  needle.position.set(p.x + Math.cos(yaw) * rad, p.y + 2.22, p.z + Math.sin(yaw) * rad);
  needle.rotation.set(-0.28, yaw, 0.35);

  const box = new THREE.Mesh(geo, mat);
  box.name = "needle-box";
  markNeedle(box);
  box.scale.set(0.18, 0.7, 0.22);

  needle.add(box);
  root.add(needle);
}

function markAcorn(mesh) {
  mesh.userData.part = "acorn";
  mesh.userData.dress = "acorn";
  mesh.userData.mode = "PAPER";
  mesh.userData.provenance = "PAPER";
  mesh.castShadow = true;
  mesh.receiveShadow = true;
}

/**
 * One tiny kraft PAPER acorn (one box) on a north-port palm trunk —
 * not instead of the needle, lichen, moss, knot, bark, twig, vine,
 * husk, frond, leaf, coconut, bird, nest, or egg. Hexes already in
 * this file: trunk kraft. Reuses the nest twig box so geometry count
 * stays put. Unique mesh — one box — so the phone mesh budget stays
 * tiny. Trunks, leaves, coconuts, bird, nest, egg, leaf, frond, husk,
 * vine, twig, bark, knot, moss, lichen, and needle stay put.
 */
function plantNorthPortAcorn(root) {
  const placed = root.userData.placed || [];
  const sites = placed.filter((p) => p.island === "north" && p.dress === "north-port-palm");
  if (!sites.length) return;

  let nest = null;
  root.traverse((obj) => {
    if (!nest && obj.userData.kind === "nest") nest = obj;
  });
  if (!nest) return;

  let geo = null;
  nest.traverse((obj) => {
    if (geo) return;
    if (obj.isMesh && obj.geometry && obj.userData.part === "nest") geo = obj.geometry;
  });
  if (!geo) return;

  const nestPos = new THREE.Vector3();
  nest.getWorldPosition(nestPos);
  let p = sites[0];
  let best = Infinity;
  for (const s of sites) {
    const d = Math.hypot(s.x - nestPos.x, s.z - nestPos.z);
    if (d < best) {
      best = d;
      p = s;
    }
  }

  const mat = new THREE.MeshLambertMaterial({ color: TRUNK });
  const acorn = new THREE.Group();
  acorn.name = "acorn";
  acorn.userData.kind = "acorn";
  acorn.userData.part = "acorn";
  acorn.userData.dress = "acorn";
  acorn.userData.mode = "PAPER";
  acorn.userData.provenance = "PAPER";
  // Sit on the palm trunk, offset from needle, lichen, moss, knot, and bark.
  const yaw = 3.25;
  const rad = 0.22;
  acorn.position.set(p.x + Math.cos(yaw) * rad, p.y + 2.56, p.z + Math.sin(yaw) * rad);
  acorn.rotation.set(0.22, yaw, -0.3);

  const box = new THREE.Mesh(geo, mat);
  box.name = "acorn-box";
  markAcorn(box);
  box.scale.set(0.22, 0.48, 0.26);

  acorn.add(box);
  root.add(acorn);
}

function markSap(mesh) {
  mesh.userData.part = "sap";
  mesh.userData.dress = "sap";
  mesh.userData.mode = "PAPER";
  mesh.userData.provenance = "PAPER";
  mesh.castShadow = true;
  mesh.receiveShadow = true;
}

/**
 * One tiny kraft PAPER sap blob (one box) on a north-port palm trunk —
 * not instead of the acorn, needle, lichen, moss, knot, bark, twig, vine,
 * husk, frond, leaf, coconut, bird, nest, or egg. Hexes already in
 * this file: trunk kraft. Reuses the nest twig box so geometry count
 * stays put. Unique mesh — one box — so the phone mesh budget stays
 * tiny. Trunks, leaves, coconuts, bird, nest, egg, leaf, frond, husk,
 * vine, twig, bark, knot, moss, lichen, needle, and acorn stay put.
 */
function plantNorthPortSap(root) {
  const placed = root.userData.placed || [];
  const sites = placed.filter((p) => p.island === "north" && p.dress === "north-port-palm");
  if (!sites.length) return;

  let nest = null;
  root.traverse((obj) => {
    if (!nest && obj.userData.kind === "nest") nest = obj;
  });
  if (!nest) return;

  let geo = null;
  nest.traverse((obj) => {
    if (geo) return;
    if (obj.isMesh && obj.geometry && obj.userData.part === "nest") geo = obj.geometry;
  });
  if (!geo) return;

  const nestPos = new THREE.Vector3();
  nest.getWorldPosition(nestPos);
  let p = sites[0];
  let best = Infinity;
  for (const s of sites) {
    const d = Math.hypot(s.x - nestPos.x, s.z - nestPos.z);
    if (d < best) {
      best = d;
      p = s;
    }
  }

  const mat = new THREE.MeshLambertMaterial({ color: TRUNK });
  const sap = new THREE.Group();
  sap.name = "sap";
  sap.userData.kind = "sap";
  sap.userData.part = "sap";
  sap.userData.dress = "sap";
  sap.userData.mode = "PAPER";
  sap.userData.provenance = "PAPER";
  // Sit on the palm trunk, offset from acorn, needle, lichen, moss, knot, bark.
  const yaw = 5.05;
  const rad = 0.22;
  sap.position.set(p.x + Math.cos(yaw) * rad, p.y + 2.9, p.z + Math.sin(yaw) * rad);
  sap.rotation.set(0.15, yaw, 0.25);

  const box = new THREE.Mesh(geo, mat);
  box.name = "sap-box";
  markSap(box);
  box.scale.set(0.24, 0.44, 0.24);

  sap.add(box);
  root.add(sap);
}

function markBud(mesh) {
  mesh.userData.part = "bud";
  mesh.userData.dress = "bud";
  mesh.userData.mode = "PAPER";
  mesh.userData.provenance = "PAPER";
  mesh.castShadow = true;
  mesh.receiveShadow = true;
}

/**
 * One tiny kraft PAPER bud (one box) on a north-port palm trunk —
 * not instead of the sap, acorn, needle, lichen, moss, knot, bark, twig,
 * vine, husk, frond, leaf, coconut, bird, nest, or egg. Hexes already in
 * this file: trunk kraft. Reuses the nest twig box so geometry count
 * stays put. Unique mesh — one box — so the phone mesh budget stays
 * tiny. Trunks, leaves, coconuts, bird, nest, egg, leaf, frond, husk,
 * vine, twig, bark, knot, moss, lichen, needle, acorn, and sap stay put.
 */
function plantNorthPortBud(root) {
  const placed = root.userData.placed || [];
  const sites = placed.filter((p) => p.island === "north" && p.dress === "north-port-palm");
  if (!sites.length) return;

  let nest = null;
  root.traverse((obj) => {
    if (!nest && obj.userData.kind === "nest") nest = obj;
  });
  if (!nest) return;

  let geo = null;
  nest.traverse((obj) => {
    if (geo) return;
    if (obj.isMesh && obj.geometry && obj.userData.part === "nest") geo = obj.geometry;
  });
  if (!geo) return;

  const nestPos = new THREE.Vector3();
  nest.getWorldPosition(nestPos);
  let p = sites[0];
  let best = Infinity;
  for (const s of sites) {
    const d = Math.hypot(s.x - nestPos.x, s.z - nestPos.z);
    if (d < best) {
      best = d;
      p = s;
    }
  }

  const mat = new THREE.MeshLambertMaterial({ color: TRUNK });
  const bud = new THREE.Group();
  bud.name = "bud";
  bud.userData.kind = "bud";
  bud.userData.part = "bud";
  bud.userData.dress = "bud";
  bud.userData.mode = "PAPER";
  bud.userData.provenance = "PAPER";
  // Sit on the palm trunk, offset from sap, acorn, needle, lichen, moss, knot, bark.
  const yaw = 0.95;
  const rad = 0.22;
  bud.position.set(p.x + Math.cos(yaw) * rad, p.y + 3.24, p.z + Math.sin(yaw) * rad);
  bud.rotation.set(-0.18, yaw, 0.32);

  const box = new THREE.Mesh(geo, mat);
  box.name = "bud-box";
  markBud(box);
  box.scale.set(0.2, 0.42, 0.22);

  bud.add(box);
  root.add(bud);
}

function markBloom(mesh) {
  mesh.userData.part = "bloom";
  mesh.userData.dress = "bloom";
  mesh.userData.mode = "PAPER";
  mesh.userData.provenance = "PAPER";
  mesh.castShadow = true;
  mesh.receiveShadow = true;
}

/**
 * One tiny kraft PAPER bloom (one box) on a north-port palm trunk —
 * not instead of the bud, sap, acorn, needle, lichen, moss, knot, bark,
 * twig, vine, husk, frond, leaf, coconut, bird, nest, or egg. Hexes
 * already in this file: trunk kraft. Reuses the nest twig box so
 * geometry count stays put. Unique mesh — one box — so the phone mesh
 * budget stays tiny. Trunks, leaves, coconuts, bird, nest, egg, leaf,
 * frond, husk, vine, twig, bark, knot, moss, lichen, needle, acorn,
 * sap, and bud stay put.
 */
function plantNorthPortBloom(root) {
  const placed = root.userData.placed || [];
  const sites = placed.filter((p) => p.island === "north" && p.dress === "north-port-palm");
  if (!sites.length) return;

  let nest = null;
  root.traverse((obj) => {
    if (!nest && obj.userData.kind === "nest") nest = obj;
  });
  if (!nest) return;

  let geo = null;
  nest.traverse((obj) => {
    if (geo) return;
    if (obj.isMesh && obj.geometry && obj.userData.part === "nest") geo = obj.geometry;
  });
  if (!geo) return;

  const nestPos = new THREE.Vector3();
  nest.getWorldPosition(nestPos);
  let p = sites[0];
  let best = Infinity;
  for (const s of sites) {
    const d = Math.hypot(s.x - nestPos.x, s.z - nestPos.z);
    if (d < best) {
      best = d;
      p = s;
    }
  }

  const mat = new THREE.MeshLambertMaterial({ color: TRUNK });
  const bloom = new THREE.Group();
  bloom.name = "bloom";
  bloom.userData.kind = "bloom";
  bloom.userData.part = "bloom";
  bloom.userData.dress = "bloom";
  bloom.userData.mode = "PAPER";
  bloom.userData.provenance = "PAPER";
  // Sit on the palm trunk, offset from bud, sap, acorn, needle, lichen, moss, knot, bark.
  const yaw = 2.75;
  const rad = 0.22;
  bloom.position.set(p.x + Math.cos(yaw) * rad, p.y + 3.58, p.z + Math.sin(yaw) * rad);
  bloom.rotation.set(0.2, yaw, -0.28);

  const box = new THREE.Mesh(geo, mat);
  box.name = "bloom-box";
  markBloom(box);
  box.scale.set(0.22, 0.38, 0.24);

  bloom.add(box);
  root.add(bloom);
}

/**
 * Low-poly PAPER trees on hills, inland slopes, and behind street lots.
 * Palms stay on the quay (makePalms). helpers: { scene, specOf, heightAt }.
 */
export function makeTrees(map, helpers) {
  const { scene, specOf, heightAt } = helpers;
  const placed = collectSites(map || {}, specOf, heightAt);

  const root = new THREE.Group();
  root.name = "trees";
  root.userData.kind = "trees";
  root.userData.provenance = "PAPER";
  root.userData.placed = placed;
  const counts = { north: 0, south: 0 };
  for (const p of placed) counts[p.island] = (counts[p.island] || 0) + 1;
  root.userData.counts = counts;

  plantInstanced(root, placed);
  plantNorthPortCoconuts(root, placed, map || {}, specOf, heightAt);
  plantNorthPortBird(root, placed, map || {}, specOf, heightAt);
  plantNorthPortNest(root, placed, map || {}, specOf, heightAt);
  plantNorthPortEgg(root);
  plantNorthPortLeaf(root);
  plantNorthPortFrond(root);
  plantNorthPortHusk(root);
  plantNorthPortVine(root);
  plantNorthPortTwig(root);
  plantNorthPortBark(root);
  plantNorthPortKnot(root);
  plantNorthPortMoss(root);
  plantNorthPortLichen(root);
  plantNorthPortNeedle(root);
  plantNorthPortAcorn(root);
  plantNorthPortSap(root);
  plantNorthPortBud(root);
  plantNorthPortBloom(root);
  scene.add(root);
  return root;
}
