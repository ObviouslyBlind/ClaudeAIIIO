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
 * + a thin kraft canvas strap over the visitor crate + a small kraft lantern
 * (WOOD post + cream glass box) near the headboard + a small kraft water jug
 * (WOOD body, canvas neck, wood handle) on the front-right of the bed
 * + a small kraft produce apple (WOOD_LIGHT tray + CANVAS fruit) at center-front
 * + a tiny kraft produce carrot (WOOD_LIGHT root + CANVAS greens) at bed center
 * + a tiny kraft produce potato (WOOD_CRATE box) on the right of the bed
 * + a tiny kraft produce onion (WOOD box) on the left of the bed
 * + a tiny kraft produce garlic (CANVAS box) at the tail of the bed
 * + a tiny kraft produce cabbage (WOOD_LIGHT box) left of the garlic
 * + a tiny kraft produce leek (WOOD box) right of the garlic
 * + a tiny kraft produce turnip (WOOD_CRATE box) ahead of the garlic
 * + a tiny kraft produce beet (WOOD box) left of the turnip
 * + a tiny kraft produce radish (WOOD_LIGHT box) right of the turnip
 * + a tiny kraft produce squash (WOOD box) ahead of the radish
 * + a tiny kraft produce parsnip (WOOD_LIGHT box) left of the squash
 * + a tiny kraft produce yam (WOOD_LIGHT box) between the parsnip and the squash
 * + a tiny kraft produce plum (WOOD_LIGHT box) ahead of the yam
 * + a tiny kraft produce fig (WOOD_LIGHT box) left of the plum
 * + a tiny kraft produce apricot (WOOD_LIGHT box) behind the fig
 * + a tiny kraft produce date (WOOD_LIGHT box) right of the apricot
 * + a tiny kraft produce olive (WOOD_LIGHT box) left of the date
 * + a tiny kraft produce walnut (WOOD_LIGHT box) right of the olive
 * + a tiny kraft produce hazel (WOOD_LIGHT box) behind the walnut.
 * Wheels: kraft cream hub discs (paper boxes) on the outer face of each wheel.
 * Grip: a short kraft hitch pin (paper box) through the handle.
 */
export const CART_MESH_COUNT = 46;
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
/** Cottage-wall cream — lantern glass (0xffd090 / 0xe8a45a not in this file). */
const GLASS = 0xf4ead8;

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

  // Kraft cream hub discs on the outer face of each wheel — paper boxes only.
  const hubL = paperBox(0.04, 0.14, 0.14, CANVAS, false);
  hubL.position.set(-0.5, 0.22, -1.05);
  hubL.userData.part = "hub";
  const hubR = paperBox(0.04, 0.14, 0.14, CANVAS, false);
  hubR.position.set(0.5, 0.22, -1.05);
  hubR.userData.part = "hub";

  const handleL = paperBox(0.05, 0.05, 0.95, WOOD_HANDLE, false);
  handleL.position.set(-0.22, 0.95, -0.72);
  handleL.userData.part = "handle";
  const handleR = paperBox(0.05, 0.05, 0.95, WOOD_HANDLE, false);
  handleR.position.set(0.22, 0.95, -0.72);
  handleR.userData.part = "handle";
  const grip = paperBox(0.5, 0.05, 0.05, WOOD_HANDLE, false);
  grip.position.set(0, 0.95, -0.26);
  grip.userData.part = "grip";

  // Short kraft hitch pin through the grip — paper box only, reads at spawn.
  const pin = paperBox(0.03, 0.14, 0.03, WHEEL, false);
  pin.position.set(0, 0.95, -0.26);
  pin.userData.part = "pin";

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

  // Small kraft lantern on the bed — WOOD post + cream glass box, paper only.
  // Front-left corner, inside the side rail, clear of the coil.
  const lanternPost = paperBox(0.04, 0.22, 0.04, WOOD, false);
  lanternPost.position.set(-0.28, 0.64, -0.58);
  lanternPost.userData.part = "lantern";
  const lanternGlass = paperBox(0.1, 0.12, 0.1, GLASS, false);
  lanternGlass.position.set(-0.28, 0.81, -0.58);
  lanternGlass.userData.part = "lantern";

  // Small kraft water jug on the bed — WOOD cylinder, canvas neck, wood handle.
  // Front-right corner, inside the side rail, clear of crates, roll, coil, lantern.
  // Sits on the bed top (y = 0.53). Paper box + cylinders only.
  const jugBody = paperRoll(0.055, 0.14, WOOD);
  jugBody.position.set(0.24, 0.6, -0.58);
  jugBody.userData.part = "jug";
  const jugNeck = paperRoll(0.03, 0.07, CANVAS);
  jugNeck.position.set(0.24, 0.705, -0.58);
  jugNeck.userData.part = "jug";
  const jugHandle = paperBox(0.02, 0.08, 0.04, WOOD_DARK, false);
  jugHandle.position.set(0.18, 0.64, -0.58);
  jugHandle.userData.part = "jug";

  // Small kraft produce apple on the bed — WOOD_LIGHT tray + CANVAS fruit.
  // Center-front, inside the rails, clear of crates, roll, coil, lantern, jug.
  // Sits on the bed top (y = 0.53). Paper boxes only.
  const appleBox = paperBox(0.1, 0.06, 0.1, WOOD_LIGHT, false);
  appleBox.position.set(-0.04, 0.56, -0.6);
  appleBox.userData.part = "apple";
  const apple = paperBox(0.06, 0.06, 0.06, CANVAS, false);
  apple.position.set(-0.04, 0.62, -0.6);
  apple.userData.part = "apple";

  // Tiny kraft produce carrot on the bed — WOOD_LIGHT root + CANVAS greens.
  // Bed center, inside the rails, clear of apple, jug, lantern, crates.
  // Sits on the bed top (y = 0.53). Paper boxes only.
  const carrot = paperBox(0.04, 0.04, 0.1, WOOD_LIGHT, false);
  carrot.position.set(0.02, 0.55, -1.0);
  carrot.userData.part = "carrot";
  const carrotTop = paperBox(0.035, 0.05, 0.035, CANVAS, false);
  carrotTop.position.set(0.02, 0.575, -0.94);
  carrotTop.userData.part = "carrot";

  // Tiny kraft produce potato on the bed — one WOOD_CRATE paper box.
  // Right of bed center, inside the rails, clear of carrot, apple, crates, roll.
  // Sits on the bed top (y = 0.53). Paper box only.
  const potato = paperBox(0.05, 0.045, 0.055, WOOD_CRATE, false);
  potato.position.set(0.26, 0.553, -1.04);
  potato.userData.part = "potato";

  // Tiny kraft produce onion on the bed — one WOOD paper box.
  // Left of bed center, inside the rails, clear of potato, carrot, apple, jug, lantern.
  // Sits on the bed top (y = 0.53). Paper box only.
  const onion = paperBox(0.05, 0.045, 0.05, WOOD, false);
  onion.position.set(-0.26, 0.553, -1.04);
  onion.userData.part = "onion";

  // Tiny kraft produce garlic on the bed — one CANVAS paper box.
  // Tail-center, inside the rails, clear of onion, potato, carrot, apple.
  // Sits on the bed top (y = 0.53). Paper box only.
  const garlic = paperBox(0.045, 0.04, 0.045, CANVAS, false);
  garlic.position.set(0, 0.553, -1.34);
  garlic.userData.part = "garlic";

  // Tiny kraft produce cabbage on the bed — one WOOD_LIGHT paper box.
  // Left of garlic at the tail, inside the rails, clear of garlic, onion, potato, carrot, apple.
  // Sits on the bed top (y = 0.53). Paper box only.
  const cabbage = paperBox(0.05, 0.045, 0.05, WOOD_LIGHT, false);
  cabbage.position.set(-0.22, 0.553, -1.38);
  cabbage.userData.mode = "PAPER";
  cabbage.userData.part = "cabbage";

  // Tiny kraft produce leek on the bed — one WOOD paper box.
  // Right of garlic at the tail, inside the rails, clear of cabbage, garlic, onion, potato, carrot, apple.
  // Sits on the bed top (y = 0.53). Paper box only.
  const leek = paperBox(0.05, 0.045, 0.05, WOOD, false);
  leek.position.set(0.22, 0.553, -1.38);
  leek.userData.mode = "PAPER";
  leek.userData.part = "leek";

  // Tiny kraft produce turnip on the bed — one WOOD_CRATE paper box.
  // Ahead of garlic at bed center, inside the rails, clear of leek, cabbage, garlic, onion, potato, carrot, apple.
  // Sits on the bed top (y = 0.53). Paper box only.
  const turnip = paperBox(0.05, 0.045, 0.05, WOOD_CRATE, false);
  turnip.position.set(0.08, 0.553, -1.16);
  turnip.userData.mode = "PAPER";
  turnip.userData.part = "turnip";

  // Tiny kraft produce beet on the bed — one WOOD paper box.
  // Left of the turnip, inside the rails, clear of turnip, leek, cabbage, garlic, onion, potato, carrot, apple.
  // Sits on the bed top (y = 0.53). Paper box only.
  const beet = paperBox(0.05, 0.045, 0.05, WOOD, false);
  beet.position.set(-0.28, 0.553, -1.20);
  beet.userData.mode = "PAPER";
  beet.userData.part = "beet";

  // Tiny kraft produce radish on the bed — one WOOD_LIGHT paper box.
  // Right of the turnip, inside the rails, clear of beet, turnip, leek, cabbage, garlic, onion, potato, carrot, apple.
  // Sits on the bed top (y = 0.53). Paper box only.
  const radish = paperBox(0.05, 0.045, 0.05, WOOD_LIGHT, false);
  radish.position.set(0.28, 0.553, -1.20);
  radish.userData.mode = "PAPER";
  radish.userData.part = "radish";

  // Tiny kraft produce squash on the bed — one WOOD paper box.
  // Ahead of the radish, inside the rails, clear of radish, beet, turnip, leek, cabbage, garlic, onion, potato, carrot, apple.
  // Sits on the bed top (y = 0.53). Paper box only.
  const squash = paperBox(0.05, 0.045, 0.05, WOOD, false);
  squash.position.set(0.28, 0.553, -0.78);
  squash.userData.mode = "PAPER";
  squash.userData.part = "squash";

  // Tiny kraft produce parsnip on the bed — one WOOD_LIGHT paper box.
  // Left of the squash, inside the rails, clear of squash, radish, beet, turnip, leek, cabbage, garlic, onion, potato, carrot, apple.
  // Sits on the bed top (y = 0.53). Paper box only.
  const parsnip = paperBox(0.05, 0.045, 0.05, WOOD_LIGHT, false);
  parsnip.position.set(-0.28, 0.553, -0.78);
  parsnip.userData.mode = "PAPER";
  parsnip.userData.part = "parsnip";

  // Tiny kraft produce yam on the bed — one WOOD_LIGHT paper box.
  // Between the parsnip and the squash, inside the rails, clear of parsnip, squash, radish, beet, turnip, leek, cabbage, garlic, onion, potato, carrot, apple.
  // Sits on the bed top (y = 0.53). Paper box only.
  const yam = paperBox(0.05, 0.045, 0.05, WOOD_LIGHT, false);
  yam.position.set(0, 0.553, -0.78);
  yam.userData.mode = "PAPER";
  yam.userData.part = "yam";

  // Tiny kraft produce plum on the bed — one WOOD_LIGHT paper box.
  // Ahead of the yam, inside the rails, clear of yam, parsnip, squash, radish, beet, turnip, leek, cabbage, garlic, onion, potato, carrot, apple.
  // Sits on the bed top (y = 0.53). Paper box only.
  const plum = paperBox(0.05, 0.045, 0.05, WOOD_LIGHT, false);
  plum.position.set(0.14, 0.553, -0.64);
  plum.userData.mode = "PAPER";
  plum.userData.part = "plum";

  // Tiny kraft produce fig on the bed — one WOOD_LIGHT paper box.
  // Left of the plum, inside the rails, clear of plum, yam, parsnip, squash, radish, beet, turnip, leek, cabbage, garlic, onion, potato, carrot, apple.
  // Sits on the bed top (y = 0.53). Paper box only.
  const fig = paperBox(0.05, 0.045, 0.05, WOOD_LIGHT, false);
  fig.position.set(-0.16, 0.553, -0.66);
  fig.userData.mode = "PAPER";
  fig.userData.part = "fig";

  // Tiny kraft produce apricot on the bed — one WOOD_LIGHT paper box.
  // Behind the fig, inside the rails, clear of fig, plum, yam, parsnip, squash, radish, beet, turnip, leek, cabbage, garlic, onion, potato, carrot, apple.
  // Sits on the bed top (y = 0.53). Paper box only.
  const apricot = paperBox(0.05, 0.045, 0.05, WOOD_LIGHT, false);
  apricot.position.set(-0.12, 0.553, -0.96);
  apricot.userData.mode = "PAPER";
  apricot.userData.part = "apricot";

  // Tiny kraft produce date on the bed — one WOOD_LIGHT paper box.
  // Right of the apricot, inside the rails, clear of apricot, fig, plum, yam, parsnip, squash, radish, beet, turnip, leek, cabbage, garlic, onion, potato, carrot, apple.
  // Sits on the bed top (y = 0.53). Paper box only.
  const date = paperBox(0.05, 0.045, 0.05, WOOD_LIGHT, false);
  date.position.set(0.16, 0.553, -0.90);
  date.userData.mode = "PAPER";
  date.userData.part = "date";

  // Tiny kraft produce olive on the bed — one WOOD_LIGHT paper box.
  // Left of the date, inside the rails, clear of date, apricot, fig, plum, yam, parsnip, squash, radish, beet, turnip, leek, cabbage, garlic, onion, potato, carrot, apple.
  // Sits on the bed top (y = 0.53). Paper box only.
  const olive = paperBox(0.05, 0.045, 0.05, WOOD_LIGHT, false);
  olive.position.set(-0.28, 0.553, -0.92);
  olive.userData.mode = "PAPER";
  olive.userData.part = "olive";

  // Tiny kraft produce walnut on the bed — one WOOD_LIGHT paper box.
  // Right of the olive, inside the rails, clear of olive, date, apricot, fig, plum, yam, parsnip, squash, radish, beet, turnip, leek, cabbage, garlic, onion, potato, carrot, apple.
  // Sits on the bed top (y = 0.53). Paper box only.
  const walnut = paperBox(0.05, 0.045, 0.05, WOOD_LIGHT, false);
  walnut.position.set(-0.08, 0.553, -1.08);
  walnut.userData.mode = "PAPER";
  walnut.userData.part = "walnut";

  // Tiny kraft produce hazel on the bed — one WOOD_LIGHT paper box.
  // Behind the walnut, inside the rails, clear of walnut, olive, date, apricot, fig, plum, yam, parsnip, squash, radish, beet, turnip, leek, cabbage, garlic, onion, potato, carrot, apple.
  // Sits on the bed top (y = 0.53). Paper box only.
  const hazel = paperBox(0.05, 0.045, 0.05, WOOD_LIGHT, false);
  hazel.position.set(-0.12, 0.553, -1.26);
  hazel.userData.mode = "PAPER";
  hazel.userData.part = "hazel";

  g.add(bed, sideL, sideR, tail, head, wheelL, wheelR, hubL, hubR, handleL, handleR, grip, pin, crate, strap, crate2, roll, coil, coilTop, lanternPost, lanternGlass, jugBody, jugNeck, jugHandle, appleBox, apple, carrot, carrotTop, potato, onion, garlic, cabbage, leek, turnip, beet, radish, squash, parsnip, yam, plum, fig, apricot, date, olive, walnut, hazel);
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
