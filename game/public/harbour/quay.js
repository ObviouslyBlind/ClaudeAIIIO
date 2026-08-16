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
  const coil = cyl(0.7, 0.7, 0.52, 0xc4a06a, 12);
  coil.position.y = 0.26;
  const core = cyl(0.2, 0.2, 0.56, 0x8a6a42, 8, false);
  core.position.y = 0.26;
  const tail = part(0.13, 0.13, 0.85, 0xc4a06a, false);
  tail.position.set(0.52, 0.1, 0.42);
  g.add(coil, core, tail);
  return g;
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

  helpers.scene.add(root);
  return root;
}
