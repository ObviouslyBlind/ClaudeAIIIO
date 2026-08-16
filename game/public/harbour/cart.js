import * as THREE from "three";

/**
 * Player cart. PLAN: spawn as people with a cart.
 * Parent a PAPER handcart on the player mesh. Do not move player.position.
 * Do not replace the person from player.js.
 *
 * Same sole plane as player.js (figure at y = -1.15). Wheels sit on the ground.
 * Person faces +Z; the cart trails on -Z with handles toward the hands.
 *
 * Warm wood — harbour crate family: 0x8a6238 / 0x7a5230 / 0x9a6a40.
 * Bed load: two small kraft crates + one canvas roll + a short kraft rope coil
 * + a thin kraft canvas strap over the visitor crate.
 */
export const CART_MESH_COUNT = 16;
/** Metres from player.position down to the soles. Same as player.js SOLE_Y. */
const SOLE_Y = -1.15;

const WOOD = 0x8a6238;
const WOOD_DARK = 0x6a4a2a;
const WOOD_LIGHT = 0x9a6a40;
const WOOD_CRATE = 0x7a5230;
const WOOD_HANDLE = 0x5a3a22;
const WHEEL = 0x3d2a1c;
/** Same canvas as quay tarps / dinghy gunwales — not a new hex. */
const CANVAS = 0xc4b496;

function paperBox(w, h, d, color, shadow = true) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  return mesh;
}

function paperRoll(radius, length, color) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, 8),
    new THREE.MeshLambertMaterial({ color }),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeHandcart() {
  const g = new THREE.Group();
  g.name = "paper-cart";
  g.userData.mode = "PAPER";
  g.userData.kind = "cart";

  const bed = paperBox(0.72, 0.1, 1.0, WOOD);
  bed.position.set(0, 0.48, -0.98);
  bed.userData.part = "bed";

  const sideL = paperBox(0.05, 0.28, 0.96, WOOD_DARK, false);
  sideL.position.set(-0.335, 0.62, -0.98);
  sideL.userData.part = "side";
  const sideR = paperBox(0.05, 0.28, 0.96, WOOD_DARK, false);
  sideR.position.set(0.335, 0.62, -0.98);
  sideR.userData.part = "side";

  const tail = paperBox(0.68, 0.28, 0.05, WOOD_LIGHT, false);
  tail.position.set(0, 0.62, -1.46);
  tail.userData.part = "end";
  const head = paperBox(0.68, 0.22, 0.05, WOOD_LIGHT, false);
  head.position.set(0, 0.59, -0.5);
  head.userData.part = "end";

  const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.08, 8);
  const wheelMat = new THREE.MeshLambertMaterial({ color: WHEEL });
  const wheelL = new THREE.Mesh(wheelGeo, wheelMat);
  wheelL.rotation.z = Math.PI / 2;
  wheelL.position.set(-0.44, 0.22, -1.05);
  wheelL.castShadow = true;
  wheelL.receiveShadow = true;
  wheelL.userData.part = "wheel";
  const wheelR = new THREE.Mesh(wheelGeo, wheelMat);
  wheelR.rotation.z = Math.PI / 2;
  wheelR.position.set(0.44, 0.22, -1.05);
  wheelR.castShadow = true;
  wheelR.receiveShadow = true;
  wheelR.userData.part = "wheel";

  const handleL = paperBox(0.05, 0.05, 0.95, WOOD_HANDLE, false);
  handleL.position.set(-0.22, 0.95, -0.72);
  handleL.userData.part = "handle";
  const handleR = paperBox(0.05, 0.05, 0.95, WOOD_HANDLE, false);
  handleR.position.set(0.22, 0.95, -0.72);
  handleR.userData.part = "handle";
  const grip = paperBox(0.5, 0.05, 0.05, WOOD_HANDLE, false);
  grip.position.set(0, 0.95, -0.26);
  grip.userData.part = "grip";

  // Two small kraft crates + canvas roll + a short kraft rope coil on the bed
  // so spawn reads as a loaded market cart, not an empty wood frame.
  // Sit on the bed top (y = 0.53). Coil is paper boxes, not a cylinder.
  // Thin kraft canvas strap sits on the visitor crate lid — paper box only.
  const crate = paperBox(0.3, 0.32, 0.28, WOOD_CRATE, false);
  crate.position.set(-0.13, 0.69, -1.2);
  crate.userData.part = "crate";

  const strap = paperBox(0.32, 0.04, 0.08, CANVAS, false);
  strap.position.set(-0.13, 0.87, -1.2);
  strap.userData.part = "strap";

  const crate2 = paperBox(0.2, 0.16, 0.2, WOOD_LIGHT, false);
  crate2.position.set(0.16, 0.61, -1.24);
  crate2.userData.part = "crate";

  const roll = paperRoll(0.12, 0.42, CANVAS);
  roll.rotation.x = Math.PI / 2;
  roll.position.set(0.14, 0.65, -0.86);
  roll.userData.part = "roll";

  const coil = paperBox(0.2, 0.08, 0.2, CANVAS, false);
  coil.position.set(-0.16, 0.57, -0.84);
  coil.userData.part = "coil";
  const coilTop = paperBox(0.16, 0.07, 0.16, CANVAS, false);
  coilTop.position.set(-0.16, 0.645, -0.84);
  coilTop.userData.part = "coil";

  g.add(bed, sideL, sideR, tail, head, wheelL, wheelR, handleL, handleR, grip, crate, strap, crate2, roll, coil, coilTop);
  return g;
}

export function dressCart(player) {
  if (!player || player.userData.cart) return player;
  const cart = makeHandcart();
  cart.position.set(0, SOLE_Y, 0);
  player.add(cart);
  player.userData.cart = true;
  return player;
}
