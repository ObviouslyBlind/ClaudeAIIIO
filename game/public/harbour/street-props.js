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
 * Paper verge lamp: square wood post, iron shoe, warm glass box, kraft
 * wood cap and finial. No cobra arm, no highway kit, lantern stays on the verge.
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

  const cap = part(0.42, 0.08, 0.42, WOOD, false);
  cap.position.y = 3.46;
  cap.userData.part = "cap";
  cap.userData.mode = "PAPER";
  const hat = part(0.28, 0.06, 0.28, WOOD_LIGHT, false);
  hat.position.y = 3.52;
  const finial = part(0.06, 0.14, 0.06, WOOD, false);
  finial.position.y = 3.62;
  finial.userData.part = "finial";
  finial.userData.mode = "PAPER";
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

/**
 * Small kraft wood stool. Four box legs and a lid seat — not an iron
 * café stem, not a cylinder.
 */
function woodStool(_side) {
  const g = new THREE.Group();
  g.name = "wood-stool";
  g.userData.kind = "street-prop";
  g.userData.prop = "stool";
  g.userData.mode = "PAPER";
  g.userData.part = "wood-stool";

  const seat = part(0.4, 0.06, 0.4, WOOD_LIGHT, false);
  seat.userData.part = "seat";
  seat.position.y = 0.43;
  const rim = part(0.38, 0.04, 0.38, WOOD_DARK, false);
  rim.position.y = 0.38;

  for (const [dx, dz] of [
    [-0.14, -0.14],
    [0.14, -0.14],
    [-0.14, 0.14],
    [0.14, 0.14],
  ]) {
    const leg = part(0.07, 0.4, 0.07, WOOD);
    leg.userData.part = "leg";
    leg.position.set(dx, 0.2, dz);
    g.add(leg);
  }

  const railA = part(0.3, 0.04, 0.06, WOOD_DARK, false);
  railA.position.set(0, 0.12, 0);
  const railB = part(0.06, 0.04, 0.3, WOOD_DARK, false);
  railB.position.set(0, 0.12, 0);

  g.add(seat, rim, railA, railB);
  return g;
}

/**
 * Kraft wooden hawser drum / rope reel. Paper boxes: wood flanges and
 * cradle, kraft cream wound hawser. Not an iron cable reel, not a cylinder coil.
 */
function hawserDrum(_side) {
  const g = new THREE.Group();
  g.name = "hawser-drum";
  g.userData.kind = "street-prop";
  g.userData.prop = "hawser-drum";
  g.userData.dress = "hawser-drum";
  g.userData.mode = "PAPER";

  const axleY = 0.62;

  const runnerA = part(0.22, 0.14, 1.05, WOOD_DARK, false);
  runnerA.position.set(-0.32, 0.07, 0);
  runnerA.userData.part = "cradle";
  const runnerB = part(0.22, 0.14, 1.05, WOOD_DARK, false);
  runnerB.position.set(0.32, 0.07, 0);
  runnerB.userData.part = "cradle";

  const chockA = part(0.78, 0.16, 0.16, WOOD, false);
  chockA.position.set(0, 0.22, -0.38);
  const chockB = part(0.78, 0.16, 0.16, WOOD, false);
  chockB.position.set(0, 0.22, 0.38);

  const flangeN = part(0.92, 0.92, 0.1, WOOD);
  flangeN.position.set(0, axleY, -0.42);
  flangeN.userData.part = "flange";
  flangeN.userData.dress = "hawser-drum";
  const flangeS = part(0.92, 0.92, 0.1, WOOD);
  flangeS.position.set(0, axleY, 0.42);
  flangeS.userData.part = "flange";
  flangeS.userData.dress = "hawser-drum";

  const barrel = part(0.42, 0.42, 0.72, WOOD_LIGHT, false);
  barrel.position.set(0, axleY, 0);
  barrel.userData.part = "barrel";

  const wrap = part(0.72, 0.72, 0.64, LAMP_GLASS, false);
  wrap.position.set(0, axleY, 0);
  wrap.userData.kind = "hawser-drum";
  wrap.userData.dress = "hawser-drum";
  wrap.userData.part = "hawser";

  const band = part(0.76, 0.18, 0.66, WOOD_DARK, false);
  band.position.set(0, axleY, 0);
  band.userData.part = "band";

  const tail = part(0.14, 0.12, 0.48, LAMP_GLASS, false);
  tail.position.set(0.38, 0.18, 0.22);
  tail.userData.part = "hawser";
  tail.userData.dress = "hawser-drum";

  g.add(runnerA, runnerB, chockA, chockB, flangeN, flangeS, barrel, wrap, band, tail);
  return g;
}

/**
 * Small kraft PAPER dipper: cup + short handle. Wood boxes only — not a
 * cylinder ladle, not iron. Sits in the pump trough with the handle on the rim.
 */
function kraftDipper() {
  const g = new THREE.Group();
  g.name = "dipper";
  g.userData.kind = "street-prop";
  g.userData.prop = "dipper";
  g.userData.mode = "PAPER";
  g.userData.part = "dipper";
  g.userData.dress = "dipper";

  const cup = part(0.12, 0.08, 0.12, WOOD, false);
  cup.userData.part = "dipper";
  cup.userData.dress = "dipper";
  cup.position.y = 0.04;
  const lip = part(0.14, 0.02, 0.14, WOOD_DARK, false);
  lip.userData.part = "dipper";
  lip.userData.dress = "dipper";
  lip.position.y = 0.09;
  const grip = part(0.16, 0.03, 0.03, WOOD_LIGHT, false);
  grip.userData.part = "dipper";
  grip.userData.dress = "dipper";
  grip.position.set(0.12, 0.07, 0);

  g.add(cup, lip, grip);
  return g;
}

/**
 * Small kraft PAPER crank: hub + arm + grip. Wood boxes only — not a
 * cylinder wheel, not iron. Sits on the pump head.
 */
function kraftCrank() {
  const g = new THREE.Group();
  g.name = "crank";
  g.userData.kind = "street-prop";
  g.userData.prop = "crank";
  g.userData.mode = "PAPER";
  g.userData.part = "crank";
  g.userData.dress = "crank";

  const hub = part(0.08, 0.06, 0.08, WOOD_DARK, false);
  hub.userData.part = "crank";
  hub.userData.dress = "crank";
  hub.position.y = 0.03;
  const arm = part(0.22, 0.04, 0.05, WOOD, false);
  arm.userData.part = "crank";
  arm.userData.dress = "crank";
  arm.position.set(0.1, 0.04, 0);
  const grip = part(0.04, 0.12, 0.04, WOOD_LIGHT, false);
  grip.userData.part = "crank";
  grip.userData.dress = "crank";
  grip.position.set(0.2, 0.08, 0);

  g.add(hub, arm, grip);
  return g;
}

/**
 * Small kraft village pump: square wood post, wood handle/spout, wood trough
 * with a kraft-cream basin, a kraft crank on the head, a kraft dipper in
 * the trough, and a tiny kraft bolt, washer, peg, and hook on the post. Paper boxes only —
 * not an iron standpipe, not cyan water.
 */
function villagePump(_side) {
  const g = new THREE.Group();
  g.name = "village-pump";
  g.userData.kind = "street-prop";
  g.userData.prop = "pump";
  g.userData.mode = "PAPER";
  g.userData.part = "village-pump";

  const shoe = part(0.28, 0.1, 0.28, WOOD_DARK, false);
  shoe.position.y = 0.05;
  const post = part(0.14, 1.12, 0.14, WOOD);
  post.userData.part = "post";
  post.position.y = 0.66;
  const head = part(0.22, 0.16, 0.18, WOOD_DARK, false);
  head.position.y = 1.24;
  const handle = part(0.06, 0.06, 0.4, WOOD, false);
  handle.userData.part = "handle";
  handle.position.set(0, 1.34, 0.1);
  const spout = part(0.08, 0.08, 0.22, WOOD_DARK, false);
  spout.userData.part = "spout";
  spout.position.set(0, 1.08, 0.18);

  const basin = part(0.72, 0.22, 0.5, WOOD);
  basin.userData.part = "basin";
  basin.position.set(0, 0.16, 0.46);
  const rim = part(0.76, 0.05, 0.54, WOOD_DARK, false);
  rim.position.set(0, 0.28, 0.46);
  const water = part(0.58, 0.04, 0.38, LAMP_GLASS, false);
  water.userData.part = "water";
  water.position.set(0, 0.24, 0.46);

  const dipper = kraftDipper();
  dipper.position.set(0.18, 0.26, 0.56);

  const crank = kraftCrank();
  crank.position.set(0.12, 1.32, 0);

  /** Tiny kraft bolt on the post, near the handle hub. WOOD_DARK already in this file — PAPER box, not grey iron. */
  const bolt = part(0.05, 0.05, 0.04, WOOD_DARK, false);
  bolt.userData.part = "bolt";
  bolt.userData.mode = "PAPER";
  bolt.position.set(0.09, 1.16, 0);

  /** Tiny kraft washer on the post, behind the bolt. WOOD already in this file — PAPER box, not grey iron. */
  const washer = part(0.02, 0.08, 0.08, WOOD, false);
  washer.userData.part = "washer";
  washer.userData.mode = "PAPER";
  washer.position.set(0.08, 1.16, 0);

  /** Tiny kraft peg on the opposite post face. WOOD already in this file — PAPER box, not grey iron. */
  const peg = part(0.08, 0.03, 0.03, WOOD, false);
  peg.userData.part = "peg";
  peg.userData.mode = "PAPER";
  peg.position.set(-0.1, 0.88, 0);

  /** Tiny kraft hook hanging off the peg. WOOD already in this file — PAPER box, not grey iron. Offset from peg, bolt, washer. */
  const hook = part(0.03, 0.07, 0.03, WOOD, false);
  hook.userData.part = "hook";
  hook.userData.mode = "PAPER";
  hook.position.set(-0.14, 0.78, 0);

  g.add(shoe, post, head, handle, spout, basin, rim, water, dipper, crank, bolt, washer, peg, hook);
  return g;
}

/**
 * Small kraft fishing-net rack: two wood posts, wood rails, and a net
 * grid of thin boxes. Paper boxes only — not a cylinder reel, not wire mesh.
 */
function fishingNetRack(_side) {
  const g = new THREE.Group();
  g.name = "net-rack";
  g.userData.kind = "street-prop";
  g.userData.prop = "net-rack";
  g.userData.mode = "PAPER";
  g.userData.part = "net-rack";
  g.userData.dress = "net-rack";

  const shoeL = part(0.18, 0.08, 0.18, IRON, false);
  shoeL.position.set(-0.52, 0.04, 0);
  const shoeR = part(0.18, 0.08, 0.18, IRON, false);
  shoeR.position.set(0.52, 0.04, 0);

  const postL = part(0.1, 1.42, 0.1, WOOD);
  postL.userData.part = "post";
  postL.position.set(-0.52, 0.79, 0);
  const postR = part(0.1, 1.42, 0.1, WOOD);
  postR.userData.part = "post";
  postR.position.set(0.52, 0.79, 0);

  const railTop = part(1.14, 0.07, 0.08, WOOD_DARK, false);
  railTop.position.set(0, 1.46, 0);
  const railMid = part(1.14, 0.06, 0.07, WOOD_DARK, false);
  railMid.position.set(0, 0.86, 0);
  const railBot = part(1.14, 0.07, 0.08, WOOD_DARK, false);
  railBot.position.set(0, 0.26, 0);

  g.add(shoeL, shoeR, postL, postR, railTop, railMid, railBot);

  for (const x of [-0.32, -0.11, 0.11, 0.32]) {
    const twine = part(0.02, 1.12, 0.02, IRON, false);
    twine.userData.part = "net";
    twine.userData.dress = "net-rack";
    twine.position.set(x, 0.86, 0);
    g.add(twine);
  }
  for (const y of [0.44, 0.64, 1.08, 1.28]) {
    const twine = part(0.96, 0.02, 0.02, IRON, false);
    twine.userData.part = "net";
    twine.userData.dress = "net-rack";
    twine.position.set(0, y, 0);
    g.add(twine);
  }

  return g;
}

/**
 * Small kraft open fish crate on the verge: wood box (floor + walls), a
 * kraft lid propped on the rim, and two fish-shaped paper boxes in harbour
 * silver-teal. Not a closed crate, not a cylinder fish.
 */
function fishCrate(_side) {
  const g = new THREE.Group();
  g.name = "fish-crate";
  g.userData.kind = "street-prop";
  g.userData.prop = "fish-crate";
  g.userData.mode = "PAPER";
  g.userData.part = "fish-crate";
  g.userData.dress = "fish-crate";

  const FISH = 0x8ec4d4;

  const floor = part(0.72, 0.08, 0.5, WOOD);
  floor.position.y = 0.04;
  floor.userData.part = "crate";
  floor.userData.dress = "fish-crate";

  const wallN = part(0.72, 0.28, 0.06, WOOD_DARK, false);
  wallN.position.set(0, 0.22, -0.22);
  wallN.userData.part = "crate";
  const wallS = part(0.72, 0.28, 0.06, WOOD_DARK, false);
  wallS.position.set(0, 0.22, 0.22);
  wallS.userData.part = "crate";
  const wallE = part(0.06, 0.28, 0.38, WOOD, false);
  wallE.position.set(0.33, 0.22, 0);
  wallE.userData.part = "crate";
  const wallW = part(0.06, 0.28, 0.38, WOOD, false);
  wallW.position.set(-0.33, 0.22, 0);
  wallW.userData.part = "crate";

  const bodyA = part(0.28, 0.08, 0.12, FISH, false);
  bodyA.position.set(-0.08, 0.16, -0.05);
  bodyA.userData.part = "fish";
  bodyA.userData.dress = "fish-crate";
  const tailA = part(0.1, 0.06, 0.1, FISH, false);
  tailA.position.set(-0.24, 0.16, -0.05);
  tailA.userData.part = "fish";
  tailA.userData.dress = "fish-crate";

  const bodyB = part(0.26, 0.08, 0.11, FISH, false);
  bodyB.position.set(0.1, 0.16, 0.06);
  bodyB.userData.part = "fish";
  bodyB.userData.dress = "fish-crate";
  const tailB = part(0.09, 0.06, 0.09, FISH, false);
  tailB.position.set(0.24, 0.16, 0.06);
  tailB.userData.part = "fish";
  tailB.userData.dress = "fish-crate";

  const lid = part(0.76, 0.05, 0.52, WOOD, false);
  lid.userData.part = "lid";
  lid.userData.mode = "PAPER";
  lid.userData.dress = "fish-crate";
  // Propped on the south rim — tilted so the crate stays open.
  lid.position.set(0.04, 0.44, 0.26);
  lid.rotation.x = -0.72;

  g.add(floor, wallN, wallS, wallE, wallW, bodyA, tailA, bodyB, tailB, lid);
  return g;
}

function makeProp(kind, side) {
  if (kind === "bench") return crateSeat(side);
  if (kind === "sign") return streetSign(side);
  if (kind === "hawser-drum") return hawserDrum(side);
  if (kind === "stool") return woodStool(side);
  if (kind === "pump") return villagePump(side);
  if (kind === "net-rack") return fishingNetRack(side);
  if (kind === "fish-crate") return fishCrate(side);
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
    // Kraft hawser drums on the spawn verge — off the tarmac, inside the dense stretch.
    for (const s of [
      { along: 48, side: -1 },
      { along: 118, side: 1 },
      { along: 188, side: -1 },
    ]) {
      const setback = streetSetbackM(idx++);
      plan.push({ along: s.along, side: s.side, kind: "hawser-drum", setback });
      // One small kraft wood stool beside the first spawn-verge hawser.
      if (s.along === 48) {
        plan.push({ along: 50, side: s.side, kind: "stool", setback });
      }
    }
    // One kraft village pump / trough on the spawn verge — off the tarmac.
    plan.push({ along: 72, side: -1, kind: "pump", setback: streetSetbackM(idx++) });
    // One kraft fishing-net rack on the spawn verge — off the tarmac.
    plan.push({ along: 80, side: 1, kind: "net-rack", setback: streetSetbackM(idx++) });
    // One kraft open fish crate on the spawn verge — off the tarmac.
    plan.push({ along: 102, side: -1, kind: "fish-crate", setback: streetSetbackM(idx++) });
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
 * Paper lamp posts, kraft crate seats, hawser drums, one wood stool, one village pump with a kraft crank on the head and a kraft dipper in the trough, one fishing-net rack, one open fish crate with a kraft lid propped on the rim, and signs along the paved spline, on the grass verge.
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
