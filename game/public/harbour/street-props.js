import * as THREE from "three";

/** Half-width of carriageway plus verge. Stay outside this. */
export const ROAD_CLEAR_M = 11;
/** Metres from paved centreline onto the grass verge. */
export const STREET_SETBACK_MIN_M = 12;
export const STREET_SETBACK_MAX_M = 16;
/** Dense stretch inland from the north quay so spawn sees furniture. */
export const NORTH_PORT_STRETCH_M = 280;

const IRON = 0x3a322c;
const IRON_DARK = 0x2a2420;
const WOOD = 0x8a6238;
const WOOD_LIGHT = 0x9a6a40;
const WOOD_DARK = 0x6a4a2a;
/** Kraft cream pane — same family as window-lights, not cyan glass. */
export const LAMP_GLASS = 0xf3d6a0;
/** Paper-lamp amber, not CoD neon. */
export const LAMP_GLOW = 0xe8a45a;
const LANTERN = 0xe0b86a;

const glassMat = new THREE.MeshLambertMaterial({
  color: LAMP_GLASS,
  emissive: LAMP_GLOW,
  emissiveIntensity: 0.42,
});
const glowMat = new THREE.MeshLambertMaterial({
  color: LANTERN,
  emissive: LAMP_GLOW,
  emissiveIntensity: 0.35,
});

/**
 * 12 / 14 / 16 m. Always off the tarmac and outside ROAD_CLEAR.
 */
export function streetSetbackM(index) {
  const steps = [STREET_SETBACK_MIN_M, 14, STREET_SETBACK_MAX_M];
  const i = ((index % 3) + 3) % 3;
  return steps[i];
}

/**
 * Offset a point on the paved centreline onto one verge.
 * (qx, qz) is further along the spline and supplies the tangent.
 */
export function offsetFromCentreline(px, pz, qx, qz, side, setbackM) {
  const dx = qx - px;
  const dz = qz - pz;
  const len = Math.hypot(dx, dz) || 1;
  const nx = -dz / len;
  const nz = dx / len;
  const s = side < 0 ? -1 : 1;
  return {
    x: px + nx * s * setbackM,
    z: pz + nz * s * setbackM,
    yaw: Math.atan2(dx, dz),
  };
}

function part(w, h, d, color, shadow = true) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

function cyl(rTop, rBot, h, color, segments = 6, shadow = true) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(rTop, rBot, h, segments),
    new THREE.MeshLambertMaterial({ color }),
  );
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

function glassPane(w, h, d) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), glassMat);
  m.castShadow = false;
  m.receiveShadow = true;
  m.userData.part = "glass";
  return m;
}

/**
 * Paper verge lamp: square wood post, iron shoe, warm glass box on top.
 * No cobra arm, no highway kit, lantern stays on the verge.
 */
function lampPost(_side) {
  const g = new THREE.Group();
  g.userData.kind = "street-prop";
  g.userData.prop = "lamp";
  g.userData.mode = "PAPER";

  const base = part(0.34, 0.14, 0.34, IRON_DARK, false);
  base.position.y = 0.07;
  const shoe = part(0.22, 0.1, 0.22, IRON, false);
  shoe.position.y = 0.18;
  const post = part(0.14, 2.72, 0.14, WOOD);
  post.userData.part = "post";
  post.position.y = 1.56;
  const neck = part(0.16, 0.18, 0.16, WOOD_DARK, false);
  neck.position.y = 2.78;
  const collar = part(0.2, 0.1, 0.2, IRON, false);
  collar.position.y = 2.9;
  g.add(base, shoe, post, neck, collar);

  const tray = part(0.4, 0.06, 0.4, IRON_DARK, false);
  tray.position.y = 2.98;
  g.add(tray);

  const glassY = 3.22;
  for (const dx of [-0.16, 0.16]) {
    for (const dz of [-0.16, 0.16]) {
      const upright = part(0.05, 0.44, 0.05, IRON, false);
      upright.position.set(dx, glassY, dz);
      g.add(upright);
    }
  }
  const east = glassPane(0.04, 0.38, 0.28);
  east.position.set(0.16, glassY, 0);
  const west = glassPane(0.04, 0.38, 0.28);
  west.position.set(-0.16, glassY, 0);
  const north = glassPane(0.28, 0.38, 0.04);
  north.position.set(0, glassY, 0.16);
  const south = glassPane(0.28, 0.38, 0.04);
  south.position.set(0, glassY, -0.16);
  const core = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.18), glowMat);
  core.castShadow = false;
  core.receiveShadow = true;
  core.userData.part = "glow";
  core.position.set(0, glassY, 0);
  g.add(east, west, north, south, core);

  const cap = part(0.42, 0.08, 0.42, IRON_DARK, false);
  cap.position.y = 3.46;
  const hat = part(0.28, 0.06, 0.28, WOOD_LIGHT, false);
  hat.position.y = 3.52;
  const finial = part(0.06, 0.14, 0.06, IRON, false);
  finial.position.y = 3.62;
  g.add(cap, hat, finial);
  return g;
}

/** Iron stem, warm wood board facing the carriageway. */
function streetSign(side) {
  const g = new THREE.Group();
  g.userData.kind = "street-prop";
  g.userData.prop = "sign";
  const toward = side < 0 ? -1 : 1;

  const post = cyl(0.06, 0.08, 2.15, IRON, 6);
  post.position.y = 1.08;
  const board = part(0.08, 0.72, 1.15, WOOD);
  board.position.set(toward * 0.12, 1.85, 0);
  const frame = part(0.06, 0.82, 1.25, WOOD_DARK, false);
  frame.position.set(toward * 0.08, 1.85, 0);
  g.add(post, frame, board);
  return g;
}

/**
 * Pair of kraft crate seats on the verge. Wood boxes with a lid — not iron
 * park-bench legs, not a highway furniture kit.
 */
function crateSeat(_side) {
  const g = new THREE.Group();
  g.userData.kind = "street-prop";
  g.userData.prop = "bench";
  g.userData.mode = "PAPER";
  g.userData.part = "crate-seat";

  for (const zz of [-0.5, 0.5]) {
    const body = part(0.88, 0.42, 0.78, WOOD);
    body.userData.part = "crate";
    body.position.set(0, 0.21, zz);
    const lid = part(0.94, 0.07, 0.84, WOOD_LIGHT, false);
    lid.userData.part = "seat";
    lid.position.set(0, 0.455, zz);
    const strap = part(0.92, 0.05, 0.1, WOOD_DARK, false);
    strap.position.set(0, 0.3, zz);
    const rim = part(0.9, 0.04, 0.8, WOOD_DARK, false);
    rim.position.set(0, 0.4, zz);
    g.add(body, lid, strap, rim);
  }
  return g;
}

function makeProp(kind, side) {
  if (kind === "bench") return crateSeat(side);
  if (kind === "sign") return streetSign(side);
  return lampPost(side);
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

function pointInRing(x, z, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i];
    const [xj, zj] = ring[j];
    const hit = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-9) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

function onFieldParcel(map, island, x, z) {
  const plots = map.plots || [];
  for (const p of plots) {
    if (p.island !== island || p.band !== "field" || !p.ring) continue;
    if (pointInRing(x, z, p.ring)) return true;
  }
  return false;
}

function nearDirtTrack(map, island, x, z) {
  for (const r of map.roads || []) {
    if (r.kind !== "dirt" || r.island !== island || !r.points) continue;
    if (distToPolyline(r.points, x, z) < 3.2) return true;
  }
  return false;
}

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

function polylineLength(points) {
  let n = 0;
  for (let i = 0; i < points.length - 1; i++) {
    n += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].z - points[i].z);
  }
  return n;
}

function planForIsland(island, length) {
  const plan = [];
  let idx = island === "north" ? 0 : 21;
  const portM = island === "north" ? NORTH_PORT_STRETCH_M : 180;

  for (let along = 20; along <= portM; along += 22) {
    plan.push({ along, side: -1, kind: "lamp", setback: streetSetbackM(idx++) });
    plan.push({ along, side: 1, kind: "lamp", setback: streetSetbackM(idx++) });
  }
  if (island === "north") {
    // A few kraft crate seats on the spawn verge so the inland look-at sees them.
    for (const s of [
      { along: 26, side: -1 },
      { along: 26, side: 1 },
      { along: 62, side: 1 },
      { along: 94, side: -1 },
      { along: 148, side: 1 },
    ]) {
      plan.push({ along: s.along, side: s.side, kind: "bench", setback: streetSetbackM(idx++) });
    }
  } else {
    for (let along = 38, n = 0; along <= portM; along += 72, n++) {
      plan.push({ along, side: n % 2 ? 1 : -1, kind: "bench", setback: streetSetbackM(idx++) });
    }
  }
  for (let along = 54, n = 0; along <= portM; along += 96, n++) {
    plan.push({ along, side: n % 2 ? -1 : 1, kind: "sign", setback: streetSetbackM(idx++) });
  }

  const inlandEnd = island === "north" ? 720 : 420;
  const cap = Math.min(length - 24, inlandEnd);
  for (let along = portM + 80, n = 0; along <= cap; along += 100, n++) {
    plan.push({ along, side: n % 2 ? 1 : -1, kind: "lamp", setback: streetSetbackM(idx++) });
  }
  if (island === "north") {
    plan.push({ along: 400, side: -1, kind: "bench", setback: streetSetbackM(idx++) });
    plan.push({ along: 520, side: 1, kind: "sign", setback: streetSetbackM(idx++) });
  }
  return plan;
}

function placeOne(map, road, spec, heightAt, slot, root) {
  const along = pointAlong(road.points, slot.along);
  if (!along) return null;
  const setback = Math.max(
    STREET_SETBACK_MIN_M,
    Math.min(STREET_SETBACK_MAX_M, slot.setback),
  );
  const at = offsetFromCentreline(along.x, along.z, along.qx, along.qz, slot.side, setback);
  if (heightAt(spec, at.x, at.z) < 0.4) return null;
  if (distToPolyline(road.points, at.x, at.z) < ROAD_CLEAR_M) return null;
  if (onFieldParcel(map, road.island, at.x, at.z)) return null;
  if (nearDirtTrack(map, road.island, at.x, at.z)) return null;

  const obj = makeProp(slot.kind, slot.side);
  obj.position.set(at.x, heightAt(spec, at.x, at.z), at.z);
  obj.rotation.y = at.yaw;
  obj.userData.island = road.island;
  obj.userData.setback = setback;
  obj.userData.along = slot.along;
  root.add(obj);
  return { kind: slot.kind, island: road.island, x: at.x, z: at.z, setback, along: slot.along };
}

/**
 * Paper lamp posts, kraft crate seats, and signs along the paved spline, on the grass verge.
 * North port stretch is packed first so spawn looking inland actually sees them.
 */
export function makeStreetProps(map, helpers) {
  const { scene, specOf, heightAt } = helpers;
  const root = new THREE.Group();
  root.name = "street-props";
  root.userData.kind = "street-props";

  const paved = (map.roads || []).filter((r) => r.kind === "paved" && r.points && r.points.length > 1);
  paved.sort((a, b) => Number(a.island !== "north") - Number(b.island !== "north"));

  const placed = [];
  for (const road of paved) {
    const spec = specOf(road.island);
    const length = polylineLength(road.points);
    for (const slot of planForIsland(road.island, length)) {
      const hit = placeOne(map, road, spec, heightAt, slot, root);
      if (hit) placed.push(hit);
    }
  }

  root.userData.placed = placed;
  scene.add(root);
  return root;
}
