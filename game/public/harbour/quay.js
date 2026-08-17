import * as THREE from "three";
import { makePortSign } from "./port-sign.js";
import { makeSouthSign } from "./south-sign.js";
import { makeQuayLamps } from "./quay-lamps.js";

function part(w, h, d, color, shadow = true) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

function cyl(rTop, rBot, h, color, segments = 8, shadow = true) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(rTop, rBot, h, segments),
    new THREE.MeshLambertMaterial({ color }),
  );
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

/** Mooring post: stem plus a wider cap. Paper cylinder, not a crate. */
function bollard() {
  const g = new THREE.Group();
  g.userData.dress = "bollard";
  const stem = cyl(0.16, 0.2, 0.95, 0x3a3d44, 8);
  stem.position.y = 0.48;
  const cap = cyl(0.28, 0.24, 0.16, 0x2a2d32, 8, false);
  cap.position.y = 0.98;
  // Tiny kraft timber lid on the bollard top. PAPER box, hex already in this file.
  const kraftCap = part(0.22, 0.08, 0.22, 0x8a6238, false);
  kraftCap.position.y = 1.1;
  kraftCap.userData.part = "bollard-cap";
  g.add(stem, cap, kraftCap);
  return g;
}

/**
 * Rowboat. Hull along +Z so it sits beside the pier, not bow-on.
 * Sage planks, kraft gunwale. Not the ferry's cream hull.
 * /g/ding63 FAIL DINGHY: 6 m sage hull at y=0.42 read as empty teal
 * at ~130 m.
 * /g/ding64 FAIL DINGHY: 18 m boats at x=±14 sat beside the basin the
 * critic photographs. Sit them in the center channel between pier and ferry.
 */
function dinghy() {
  const g = new THREE.Group();
  g.userData.kind = "dinghy";
  g.userData.mode = "PAPER";

  const hull = part(7.4, 2.4, 18, 0x5c6e52);
  hull.position.y = 0.7;
  hull.userData.part = "hull";
  hull.userData.mode = "PAPER";
  g.add(hull);

  const keel = part(5, 0.6, 15.5, 0x3d4a38, false);
  keel.position.y = -0.2;
  g.add(keel);

  const bow = part(5, 1.8, 4, 0x5c6e52);
  bow.position.set(0, 0.8, 10);
  g.add(bow);

  const stern = part(6.8, 1.6, 2, 0x5c6e52);
  stern.position.set(0, 0.65, -9.2);
  g.add(stern);

  const gunwale = part(8.2, 0.9, 18.6, 0xc4b496, false);
  gunwale.position.y = 2.0;
  gunwale.userData.part = "gunwale";
  g.add(gunwale);

  for (const zz of [-4.2, 1.8]) {
    const seat = part(6.4, 0.28, 1.1, 0x8a6238, false);
    seat.position.set(0, 1.35, zz);
    g.add(seat);
  }

  const oarL = part(0.32, 0.22, 12, 0x6a4a2a, false);
  oarL.position.set(-4.4, 2.15, 1.1);
  oarL.rotation.y = 0.16;
  const oarR = part(0.32, 0.22, 12, 0x6a4a2a, false);
  oarR.position.set(4.4, 2.15, 1.1);
  oarR.rotation.y = -0.16;
  g.add(oarL, oarR);

  // Kraft painter: thin hawser off the bow. PAPER box, existing rope hex.
  const painter = part(0.07, 0.07, 2.15, 0xc4a06a, false);
  painter.position.set(0.18, 1.35, 13.2);
  painter.rotation.x = 0.2;
  painter.userData.dress = "painter";
  painter.userData.part = "painter";
  g.add(painter);

  // Tiny kraft knot on the painter line. PAPER box, hex already in this file.
  const knot = part(0.16, 0.16, 0.18, 0x8a6238, false);
  knot.position.set(0, 0, 0.45);
  knot.userData.part = "knot";
  painter.add(knot);

  // Tiny kraft hook on the painter. PAPER box, hex already in this file.
  // Hangs below the far end — offset from knot, painter, bollard-cap, crates.
  const hook = part(0.07, 0.12, 0.07, 0x8a6238, false);
  hook.position.set(0, -0.14, -0.55);
  hook.userData.part = "hook";
  painter.add(hook);

  // Tiny kraft splice (rope join) on the painter. PAPER box, hex already in this file.
  // Offset from knot, hook, bollard-cap.
  const splice = part(0.09, 0.09, 0.14, 0x8a6238, false);
  splice.position.set(0, 0.04, -0.12);
  splice.userData.mode = "PAPER";
  splice.userData.part = "splice";
  painter.add(splice);

  return g;
}

/** Two-wheel barrow with a crate on the bed. */
function handcart() {
  const g = new THREE.Group();

  const bed = part(1.32, 0.14, 2.05, 0x8a6238);
  bed.position.y = 0.62;
  g.add(bed);

  const sideL = part(0.08, 0.42, 1.95, 0x6a4a2a, false);
  sideL.position.set(-0.6, 0.86, 0);
  const sideR = sideL.clone();
  sideR.position.x = 0.6;
  g.add(sideL, sideR);

  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x3d2a1c });
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.15, 10);
  const wL = new THREE.Mesh(wheelGeo, wheelMat);
  wL.rotation.z = Math.PI / 2;
  wL.position.set(-0.76, 0.36, 0.12);
  wL.castShadow = true;
  const wR = wL.clone();
  wR.position.x = 0.76;
  g.add(wL, wR);

  const handleL = part(0.09, 0.09, 1.3, 0x5a3a22, false);
  handleL.position.set(-0.42, 0.92, -1.52);
  const handleR = handleL.clone();
  handleR.position.x = 0.42;
  g.add(handleL, handleR);

  const grip = part(1.05, 0.09, 0.09, 0x5a3a22, false);
  grip.position.set(0, 0.92, -2.14);
  g.add(grip);

  const load = part(0.82, 0.68, 0.82, 0x7a5230, false);
  load.position.set(0, 1.05, 0.12);
  g.add(load);

  return g;
}

function crateStack() {
  const g = new THREE.Group();
  g.userData.dress = "crate";
  const layers = [
    [1.12, 0.68, 1.02, 0, 0.34, 0, 0x8a6238],
    [0.92, 0.52, 0.88, 0.1, 0.94, -0.04, 0x7a5230],
    [0.68, 0.42, 0.66, -0.12, 1.41, 0.06, 0x9a6a40],
  ];
  for (const [w, h, d, px, py, pz, color] of layers) {
    const crate = part(w, h, d, color, false);
    crate.position.set(px, py, pz);
    g.add(crate);
  }
  return g;
}

/** Short fat cylinder on the deck — a coil of hawser, not a crate. */
function ropeCoil() {
  const g = new THREE.Group();
  g.userData.dress = "rope";
  const coil = cyl(0.7, 0.7, 0.52, 0xc4a06a, 12);
  coil.position.y = 0.26;
  const core = cyl(0.2, 0.2, 0.56, 0x8a6a42, 8, false);
  core.position.y = 0.26;
  const tail = part(0.13, 0.13, 0.85, 0xc4a06a, false);
  tail.position.set(0.52, 0.1, 0.42);
  g.add(coil, core, tail);
  return g;
}

/** Open wooden box with a hawser coil sitting in it. */
function ropeBox() {
  const g = new THREE.Group();
  g.userData.dress = "rope-box";
  const floor = part(1.28, 0.12, 1.28, 0x8a6238);
  floor.position.y = 0.06;
  g.add(floor);
  const wallN = part(1.28, 0.52, 0.1, 0x7a5230, false);
  wallN.position.set(0, 0.38, -0.59);
  const wallS = wallN.clone();
  wallS.position.z = 0.59;
  const wallE = part(0.1, 0.52, 1.18, 0x9a6a40, false);
  wallE.position.set(0.59, 0.38, 0);
  const wallW = wallE.clone();
  wallW.position.x = -0.59;
  g.add(wallN, wallS, wallE, wallW);
  const coil = cyl(0.48, 0.48, 0.38, 0xc4a06a, 10);
  coil.position.y = 0.42;
  const core = cyl(0.14, 0.14, 0.42, 0x8a6a42, 8, false);
  core.position.y = 0.42;
  g.add(coil, core);
  return g;
}

/**
 * PAPER life ring: a short torus of terracotta / kraft boxes on the deck.
 * Cream bands on a hull-family rust ring — not iron, not a cylinder.
 */
function lifeRing() {
  const g = new THREE.Group();
  g.userData.dress = "life-ring";
  const n = 6;
  const r = 0.34;
  for (let layer = 0; layer < 2; layer++) {
    const y = 0.08 + layer * 0.14;
    const rot = layer * (Math.PI / n);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rot;
      const cream = (i + layer) % 3 === 0;
      const seg = part(0.28, 0.14, 0.18, cream ? 0xc4b496 : 0x6e2e22, false);
      seg.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      seg.rotation.y = a;
      g.add(seg);
    }
  }
  return g;
}

/**
 * Short kraft wooden brow from the north timber lip toward the basin.
 * Paper boxes, wood hexes already in this file. Stops short of the ferry.
 */
function gangplank() {
  const g = new THREE.Group();
  g.userData.dress = "brow";
  g.userData.mode = "PAPER";

  /** /g/brow67 FAIL BROW: 0.55 m slab was a line from spawn. Dinghy hulls
   *  that passed are 2.4 m tall — match that height, keep dark vs teal. */
  const plank = part(7.4, 2.4, 12, 0x4a3220);
  plank.position.set(0, 0, 0);
  plank.userData.part = "plank";
  g.add(plank);

  const wear = part(6.8, 0.35, 11.2, 0xc4b496, false);
  wear.position.set(0, 1.3, 0);
  g.add(wear);

  for (const sx of [-3.5, 3.5]) {
    const rail = part(0.32, 0.28, 11.4, 0x7a5230, false);
    rail.position.set(sx, 1.55, 0);
    g.add(rail);
  }

  return g;
}

/** Rust drum in the north basin channel. Brow at the lip never read from spawn. */
function channelBuoy() {
  const g = new THREE.Group();
  g.userData.dress = "buoy";
  g.userData.mode = "PAPER";

  const body = part(8.2, 8.4, 8.2, 0x6e2e22);
  body.userData.part = "body";
  g.add(body);

  const band = part(8.6, 1.6, 8.6, 0xc4b496, false);
  band.position.y = 1.2;
  g.add(band);

  const cap = part(6.8, 0.8, 6.8, 0x8a6238, false);
  cap.position.y = 4.4;
  g.add(cap);

  return g;
}

/** Terracotta/kraft life ring on the camera-facing hull, offset from the rust buoy.
 *  /g/ring71 FAIL RING: 1.2 m segs at r=2.8 read as hull furniture from spawn.
 *  /g/ring72 FAIL RING: 8 segs at x+10.2 sat on the wheelhouse and read as cabin.
 *  Copy the held buoy: one 8 m rust cube + kraft band, parked on the bow. */
function basinRing() {
  const g = new THREE.Group();
  g.userData.dress = "ring";
  g.userData.mode = "PAPER";

  const body = part(8.2, 8.4, 8.2, 0x6e2e22);
  body.userData.part = "body";
  g.add(body);

  const band = part(8.6, 1.6, 8.6, 0xc4b496, false);
  band.position.y = 1.2;
  g.add(band);

  const face = part(8.4, 8.4, 1.4, 0xc4b496, false);
  face.position.z = -4.6;
  g.add(face);

  return g;
}

/** Tall rust funnel above the held buoy. Ring round stopped: +X left the frame.
 *  /g/funnel74 FAIL FUNNEL: 12 m stick at y=14 sat inside the buoy blob. */
function basinFunnel() {
  const g = new THREE.Group();
  g.userData.dress = "funnel";
  g.userData.mode = "PAPER";

  const body = part(3.6, 40.0, 3.6, 0x6e2e22);
  body.userData.part = "body";
  g.add(body);

  const band = part(4.2, 3.0, 4.2, 0xc4b496, false);
  band.position.y = 8;
  g.add(band);

  const cap = part(2.8, 1.2, 2.8, 0x8a6238, false);
  cap.position.y = 20.4;
  g.add(cap);

  return g;
}

/** Buoy-class rust cargo on the north timber. Funnel round stopped: verticals unread. */
function basinCargo() {
  const g = new THREE.Group();
  g.userData.dress = "cargo";
  g.userData.mode = "PAPER";

  /** /g/cargo77 FAIL CARGO: 8 m cube at x+4.2 had a kraft cap, so the
   *  downward spawn camera read it as more beige decking. Rust TOP, pier-wide. */
  const body = part(12, 6.4, 16, 0x6e2e22);
  body.userData.part = "body";
  g.add(body);

  const band = part(12.4, 1.4, 16.4, 0xc4b496, false);
  band.position.y = 0;
  g.add(band);

  const top = part(12.4, 0.5, 16.4, 0x6e2e22, false);
  top.userData.part = "top";
  top.position.y = 3.2;
  g.add(top);

  return g;
}

/** Crate with a canvas tarp lashed over it. */
function canvasCrate() {
  const g = new THREE.Group();
  g.userData.dress = "crate";
  const body = part(1.38, 0.82, 1.12, 0x7a5230);
  body.position.y = 0.41;
  const tarp = part(1.5, 0.08, 1.24, 0xc4b496, false);
  tarp.position.y = 0.86;
  tarp.rotation.z = 0.04;
  const lash = part(1.52, 0.05, 0.08, 0x8a6a42, false);
  lash.position.y = 0.9;
  g.add(body, tarp, lash);
  return g;
}

/**
 * Small open-front lean-to: warm plaster back, wood sides, canvas roof, rust ridge.
 * Open face is +X so a left-of-road placement looks toward the tarmac.
 */
function leanTo() {
  const g = new THREE.Group();
  g.userData.dress = "lean-to";

  const back = part(0.16, 2.65, 3.4, 0xe4d2b0);
  back.position.set(-1.85, 1.35, 0);
  const sideA = part(3.5, 2.35, 0.14, 0x8a6238);
  sideA.position.set(-0.15, 1.2, -1.66);
  const sideB = sideA.clone();
  sideB.position.z = 1.66;
  g.add(back, sideA, sideB);

  const postA = part(0.16, 2.15, 0.16, 0x6a4a2a);
  postA.position.set(1.55, 1.1, -1.55);
  const postB = postA.clone();
  postB.position.z = 1.55;
  g.add(postA, postB);

  const roof = part(4.15, 0.1, 3.85, 0xc4b496);
  roof.position.set(-0.05, 2.72, 0);
  roof.rotation.z = -0.32;
  const ridge = part(0.18, 0.12, 3.95, 0x6e2e22, false);
  ridge.position.set(-1.85, 3.28, 0);
  g.add(roof, ridge);

  const bench = part(1.55, 0.42, 2.05, 0x9a6a40, false);
  bench.position.set(-0.55, 0.22, 0);
  g.add(bench);
  return g;
}

function pierPalm(lean) {
  const g = new THREE.Group();
  g.userData.dress = "palm";
  g.rotation.z = lean;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.28, 5.4, 6),
    new THREE.MeshLambertMaterial({ color: 0x7a5230 }),
  );
  trunk.position.y = 2.7;
  trunk.castShadow = true;
  g.add(trunk);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f6b32 });
  for (let i = 0; i < 5; i++) {
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.8, 5), leafMat);
    const a = (i / 5) * Math.PI * 2;
    frond.position.set(Math.cos(a) * 0.35, 5.5, Math.sin(a) * 0.35);
    frond.rotation.z = Math.cos(a) * 0.85;
    frond.rotation.x = Math.sin(a) * 0.85;
    g.add(frond);
  }
  return g;
}

/**
 * Extra palms around the pier / port apron, not an inland forest.
 * Local x is east of the port; +along is toward the water.
 */
export const PIER_PALM_OFFSETS = Object.freeze([
  Object.freeze({ x: -14.5, along: 10 }),
  Object.freeze({ x: -12.6, along: 2 }),
  Object.freeze({ x: -15.2, along: -8 }),
  Object.freeze({ x: -12.8, along: -20 }),
  Object.freeze({ x: -15.0, along: 16 }),
  Object.freeze({ x: -13.4, along: 22 }),
  Object.freeze({ x: 14.5, along: 8 }),
  Object.freeze({ x: 12.6, along: 14 }),
  Object.freeze({ x: 15.2, along: 4 }),
  Object.freeze({ x: 13.5, along: -22 }),
]);

/** Land-side kit kept off the paved corridor. Same local axes as the palms. */
export const QUAY_LAND_SPOTS = Object.freeze([
  Object.freeze({ x: -13.6, along: -13, kind: "lean-to" }),
  Object.freeze({ x: -12.4, along: -6, kind: "stack" }),
  Object.freeze({ x: -15.3, along: -20, kind: "rope-box" }),
  Object.freeze({ x: -12.5, along: 12, kind: "canvas" }),
  Object.freeze({ x: 15.3, along: 6, kind: "canvas" }),
  Object.freeze({ x: 12.4, along: -22, kind: "stack" }),
  Object.freeze({ x: 15.1, along: 12, kind: "rope-box" }),
]);

/**
 * Dark rubber tyre hung off the timber lip toward the water.
 * PAPER torus + cylinder lanyard. Bollard greys already in this file —
 * not a highway wheel, not a new grey hex.
 */
function fender() {
  const g = new THREE.Group();
  g.userData.dress = "fender";

  const lanyard = cyl(0.03, 0.03, 0.38, 0x3a3d44, 6, false);
  lanyard.position.y = -0.1;

  const tyre = new THREE.Mesh(
    new THREE.TorusGeometry(0.4, 0.14, 8, 10),
    new THREE.MeshLambertMaterial({ color: 0x2a2d32 }),
  );
  tyre.position.y = -0.62;
  tyre.castShadow = true;
  tyre.receiveShadow = true;

  g.add(lanyard, tyre);
  return g;
}

/**
 * Extra kraft PAPER coils on the timber deck of each quay.
 * Local x is east of the port; along is toward the water from pier centre.
 * Stay on the 11 m deck, off the centre walk, short of the ferry berth.
 */
export const QUAY_DECK_SPOTS = Object.freeze([
  Object.freeze({ x: -3.35, along: 6, kind: "rope" }),
  Object.freeze({ x: 3.3, along: 22, kind: "rope" }),
]);

/**
 * PAPER life rings on the timber deck, on the north/south bollard lines.
 * Local x is east of the port; along is toward the water from pier centre.
 * Stay on the 11 m deck, off the paved road (ROAD_CLEAR 11) and centre walk.
 */
export const LIFE_RING_SPOTS = Object.freeze([
  Object.freeze({ x: -4.95, along: -16 }),
  Object.freeze({ x: 4.95, along: -16 }),
  Object.freeze({ x: -4.95, along: 14 }),
  Object.freeze({ x: 4.95, along: 14 }),
]);

/**
 * Rubber tyres on the seaward timber face. Local x is east of the port;
 * along is toward the water from pier centre. Just past the 43 m lip
 * (pier is 86 m long), still on the 11 m width.
 */
export const FENDER_SPOTS = Object.freeze([
  Object.freeze({ x: -3.7, along: 43.22 }),
  Object.freeze({ x: -1.25, along: 43.22 }),
  Object.freeze({ x: 1.25, along: 43.22 }),
  Object.freeze({ x: 3.7, along: 43.22 }),
]);

export function quayWorldPoint(spec, localX, along) {
  const toward = spec.id === "north" ? 1 : -1;
  return { x: spec.port.x + localX, z: spec.port.z + toward * along };
}

/**
 * Working-harbour dressing for one island port.
 * helpers.scene — THREE.Scene to add into
 * helpers.heightAt(spec, x, z) — same land height as main.js
 */
export function makeQuay(spec, helpers) {
  const toward = spec.id === "north" ? 1 : -1;
  const { x, z } = spec.port;
  const y = helpers.heightAt(spec, x, z);
  const pierZ = z + toward * 38;
  const deckY = y + 0.5;

  const root = new THREE.Group();
  root.name = "quay-" + spec.id;
  root.userData.kind = "quay";

  const d1 = dinghy();
  d1.position.set(x + 3.2, 1.55, z + toward * 102);
  d1.rotation.y = spec.id === "north" ? 0.08 : Math.PI + 0.08;
  root.add(d1);

  const d2 = dinghy();
  d2.position.set(x - 3.8, 1.48, z + toward * 97);
  d2.rotation.y = spec.id === "north" ? -0.14 : Math.PI - 0.14;
  root.add(d2);

  if (spec.id === "north") {
    const brow = gangplank();
    /** /g/brow68 FAIL BROW: dinghy-tall lip slab still unread. Round stopped. */
    brow.position.set(x, 1.7, z + toward * 86);
    root.add(brow);

    /** /g/buoy69 FAIL BUOY: sat inside the sage dinghies at toward*102.
     *  Park on the camera-facing cream hull — same slot as fend54. */
    const buoy = channelBuoy();
    buoy.position.set(x, 5.4, z + toward * 116);
    root.add(buoy);

    /** /g/ring72 FAIL RING: x+10.2 overlapped the wheelhouse (local x 6–11).
     *  Park on the bow, right of the held buoy, clear of the cabin. */
    const ring = basinRing();
    ring.position.set(x + 15.4, 5.4, z + toward * 116);
    root.add(ring);

    /** /g/ring73 FAIL RING: bow cube at x+15.4 sat under the spawn camera.
     *  Ring round stopped. Funnel uses the held buoy's x=0 slot, stacked up. */
    /** /g/funnel74 FAIL FUNNEL: 12 m at y=14 sat inside the buoy blob.
     *  Lift a 40 m rust stick into the cyan sky above that slot. */
    const funnel = basinFunnel();
    funnel.position.set(x, 32.0, z + toward * 116);
    root.add(funnel);

    /** /g/cargo77 FAIL CARGO: east-of-walk kraft-capped cube still unread.
     *  Pier-wide rust slab on the centre lip so the overhead frame is rust. */
    const cargo = basinCargo();
    cargo.position.set(x, deckY + 3.2, pierZ + toward * 40);
    root.add(cargo);

    // Extra kraft stack on the north timber, west of the walk, short of the brow.
    const stackN = crateStack();
    stackN.position.set(x - 3.3, deckY, pierZ - toward * 12);
    stackN.rotation.y = 0.28;
    root.add(stackN);
  }

  for (const along of [-24, -8, 10, 26]) {
    for (const side of [-5.15, 5.15]) {
      const post = bollard();
      post.position.set(x + side, deckY, pierZ + toward * along);
      root.add(post);
    }
  }

  for (const along of [-20, 6, 22]) {
    for (const side of [-4.8, 4.8]) {
      const ring = lifeRing();
      ring.position.set(x + side, deckY, pierZ + toward * along);
      ring.rotation.y = side > 0 ? -0.2 : 0.15;
      root.add(ring);
    }
  }

  const cart = handcart();
  cart.position.set(x + 2.35, deckY, pierZ - toward * 18);
  cart.rotation.y = toward > 0 ? 0.22 : Math.PI - 0.18;
  root.add(cart);

  const stackA = crateStack();
  stackA.position.set(x - 3.05, deckY, pierZ - toward * 6);
  stackA.rotation.y = 0.35;
  root.add(stackA);

  const stackB = crateStack();
  stackB.position.set(x + 3.35, deckY, pierZ + toward * 8);
  stackB.rotation.y = -0.48;
  root.add(stackB);

  const rope = ropeCoil();
  rope.position.set(x - 3.55, deckY, pierZ + toward * 22);
  root.add(rope);

  for (const along of [-32, 0, 18]) {
    for (const side of [-5.15, 5.15]) {
      const post = bollard();
      post.position.set(x + side, deckY, pierZ + toward * along);
      root.add(post);
    }
  }

  const stackC = crateStack();
  stackC.position.set(x - 3.2, deckY, pierZ - toward * 28);
  stackC.rotation.y = -0.22;
  root.add(stackC);

  const stackD = crateStack();
  stackD.position.set(x + 3.4, deckY, pierZ + toward * 16);
  stackD.rotation.y = 0.55;
  root.add(stackD);

  const tarpA = canvasCrate();
  tarpA.position.set(x - 3.45, deckY, pierZ + toward * 2);
  tarpA.rotation.y = 0.2;
  root.add(tarpA);

  const tarpB = canvasCrate();
  tarpB.position.set(x + 3.55, deckY, pierZ - toward * 22);
  tarpB.rotation.y = -0.3;
  root.add(tarpB);

  const boxA = ropeBox();
  boxA.position.set(x + 3.5, deckY, pierZ - toward * 10);
  boxA.rotation.y = 0.4;
  root.add(boxA);

  const boxB = ropeBox();
  boxB.position.set(x - 3.6, deckY, pierZ + toward * 12);
  boxB.rotation.y = -0.15;
  root.add(boxB);

  const ropeB = ropeCoil();
  ropeB.position.set(x + 3.15, deckY, pierZ + toward * 30);
  root.add(ropeB);

  for (const spot of QUAY_DECK_SPOTS) {
    const obj = spot.kind === "crate" ? crateStack() : ropeCoil();
    obj.position.set(x + spot.x, deckY, pierZ + toward * spot.along);
    obj.rotation.y = spot.x > 0 ? -0.22 : 0.16;
    root.add(obj);
  }

  for (const spot of LIFE_RING_SPOTS) {
    const ring = lifeRing();
    ring.position.set(x + spot.x, deckY, pierZ + toward * spot.along);
    ring.rotation.y = spot.x > 0 ? -0.12 : 0.18;
    root.add(ring);
  }

  FENDER_SPOTS.forEach((spot, i) => {
    const tyre = fender();
    tyre.position.set(x + spot.x, deckY, pierZ + toward * spot.along);
    tyre.rotation.z = (i % 2 ? 1 : -1) * 0.1;
    root.add(tyre);
  });

  for (const spot of QUAY_LAND_SPOTS) {
    const at = quayWorldPoint(spec, spot.x, spot.along);
    const gy = helpers.heightAt(spec, at.x, at.z);
    let obj;
    if (spot.kind === "lean-to") obj = leanTo();
    else if (spot.kind === "rope-box") obj = ropeBox();
    else if (spot.kind === "canvas") obj = canvasCrate();
    else obj = crateStack();
    obj.position.set(at.x, gy, at.z);
    obj.rotation.y = spot.kind === "lean-to" ? 0 : spot.x > 0 ? -0.2 : 0.18;
    root.add(obj);
  }

  PIER_PALM_OFFSETS.forEach((spot, i) => {
    const at = quayWorldPoint(spec, spot.x, spot.along);
    const gy = helpers.heightAt(spec, at.x, at.z);
    if (gy < 0.35) return;
    const tree = pierPalm((i % 2 ? 1 : -1) * (0.07 + (i % 3) * 0.02));
    tree.position.set(at.x, gy, at.z);
    root.add(tree);
  });

  const sign = makePortSign(spec, helpers);
  if (sign) root.add(sign);

  const southSign = makeSouthSign(spec, helpers);
  if (southSign) root.add(southSign);

  const lamps = makeQuayLamps(spec, helpers);
  if (lamps) root.add(lamps);

  helpers.scene.add(root);
  return root;
}
