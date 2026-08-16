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
 */
export const CART_MESH_COUNT = 11;
/** Metres from player.position down to the soles. Same as player.js SOLE_Y. */
const SOLE_Y = -1.15;

const WOOD = 0x8a6238;
const WOOD_DARK = 0x6a4a2a;
const WOOD_LIGHT = 0x9a6a40;
const WOOD_CRATE = 0x7a5230;
const WOOD_HANDLE = 0x5a3a22;
const WHEEL = 0x3d2a1c;

function paperBox(w, h, d, color, shadow = true) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  mesh.castShadow = shadow;
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

  const crate = paperBox(0.48, 0.4, 0.48, WOOD_CRATE, false);
  crate.position.set(0, 0.73, -1.02);
  crate.userData.part = "crate";

  g.add(bed, sideL, sideR, tail, head, wheelL, wheelR, handleL, handleR, grip, crate);
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
