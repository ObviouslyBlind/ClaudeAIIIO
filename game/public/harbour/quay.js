import * as THREE from "three";

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
  g.add(stem, cap);
  return g;
}

/**
 * Tiny rowboat. Hull along +Z so it sits beside the pier, not bow-on.
 * Sage planks, not the ferry's mahogany.
 */
function dinghy() {
  const g = new THREE.Group();

  const hull = part(2.35, 0.72, 6.1, 0x5c6e52);
  hull.position.y = 0.22;
  g.add(hull);

  const keel = part(1.55, 0.22, 5.2, 0x3d4a38, false);
  keel.position.y = -0.12;
  g.add(keel);

  const bow = part(1.55, 0.58, 1.35, 0x5c6e52);
  bow.position.set(0, 0.26, 3.35);
  g.add(bow);

  const stern = part(2.15, 0.5, 0.65, 0x5c6e52);
  stern.position.set(0, 0.2, -3.15);
  g.add(stern);

  const gunwale = part(2.5, 0.12, 6.25, 0xc4b496, false);
  gunwale.position.y = 0.6;
  g.add(gunwale);

  for (const zz of [-1.35, 0.55]) {
    const seat = part(2.05, 0.12, 0.42, 0x8a6238, false);
    seat.position.set(0, 0.46, zz);
    g.add(seat);
  }

  const oarL = part(0.11, 0.08, 4.1, 0x6a4a2a, false);
  oarL.position.set(-1.45, 0.7, 0.35);
  oarL.rotation.y = 0.16;
  const oarR = part(0.11, 0.08, 4.1, 0x6a4a2a, false);
  oarR.position.set(1.45, 0.7, 0.35);
  oarR.rotation.y = -0.16;
  g.add(oarL, oarR);

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
  d1.position.set(x + 9.4, 0.42, z + toward * 88);
  d1.rotation.y = spec.id === "north" ? 0.08 : Math.PI + 0.08;
  root.add(d1);

  const d2 = dinghy();
  d2.position.set(x - 10.6, 0.36, z + toward * 82);
  d2.rotation.y = spec.id === "north" ? -0.14 : Math.PI - 0.14;
  root.add(d2);

  for (const along of [-24, -8, 10, 26]) {
    for (const side of [-5.15, 5.15]) {
      const post = bollard();
      post.position.set(x + side, deckY, pierZ + toward * along);
      root.add(post);
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

  helpers.scene.add(root);
  return root;
}
