import * as THREE from "three";

/**
 * Placeable South street cart — kerb stall, not a handheld wagon.
 * Door-scale: counter ~1.1 m, umbrella ~2.15 m against the 1.7 m player.
 * Caribbean fruit / melon / fish-and-chips looks.
 */

const CREAM = 0xf4ead8;
const STEEL = 0x8a9096;
const WOOD = 0x6a4a2a;
const WHEEL = 0x1c1c20;

const CART_LOOK = {
  fruit: { body: 0xc45c12, umbrella: 0x2f8f4e, label: "fruit cart" },
  watermelon: { body: 0x1f6b3a, umbrella: 0xe25b6a, label: "watermelon cart" },
  fish_chips: { body: 0xd4a017, umbrella: 0x2a6b8a, label: "fish and chips cart" },
};

function box(w, h, d, color) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export const HOTDOG_CART_MESH_COUNT = 11;
export const STREET_CART_MESH_COUNT = HOTDOG_CART_MESH_COUNT;

export function makeStreetCart(kind) {
  const look = CART_LOOK[kind] || CART_LOOK.fruit;
  const g = new THREE.Group();
  g.name = "street-cart";
  g.userData.mode = "PAPER";
  g.userData.kind = "street-cart";
  g.userData.cartKind = kind || "fruit";
  g.userData.label = look.label;
  g.userData.layer = "world";

  const body = box(1.35, 0.72, 0.78, look.body);
  body.position.y = 0.86;
  body.userData.part = "body";

  const counter = box(1.42, 0.06, 0.86, CREAM);
  counter.position.y = 1.24;
  counter.userData.part = "counter";

  const pole = box(0.05, 0.92, 0.05, STEEL);
  pole.position.y = 1.72;
  pole.userData.part = "pole";

  const umbrella = box(1.7, 0.08, 1.7, look.umbrella);
  umbrella.position.y = 2.18;
  umbrella.userData.part = "umbrella";

  const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.1, 8);
  const wheelMat = new THREE.MeshLambertMaterial({ color: WHEEL });
  const wheelL = new THREE.Mesh(wheelGeo, wheelMat);
  wheelL.rotation.z = Math.PI / 2;
  wheelL.position.set(-0.55, 0.22, 0.28);
  wheelL.userData.part = "wheel";
  const wheelR = wheelL.clone();
  wheelR.position.set(0.55, 0.22, 0.28);
  const wheelL2 = wheelL.clone();
  wheelL2.position.set(-0.55, 0.22, -0.28);
  const wheelR2 = wheelL.clone();
  wheelR2.position.set(0.55, 0.22, -0.28);

  const handle = box(0.08, 0.08, 0.7, WOOD);
  handle.position.set(0, 1.12, -0.52);
  handle.userData.part = "handle";

  const bin = box(0.28, 0.22, 0.28, STEEL);
  bin.position.set(0.42, 1.4, 0.12);
  bin.userData.part = "bin";

  const sign = box(0.7, 0.16, 0.04, CREAM);
  sign.position.set(0, 1.42, 0.42);
  sign.userData.part = "sign";

  g.add(body, counter, pole, umbrella, wheelL, wheelR, wheelL2, wheelR2, handle, bin, sign);
  return g;
}

/** Starter cart. Same mesh as fruit. */
export function makeHotdogCart() {
  return makeStreetCart("fruit");
}

export function makeCrate() {
  const g = new THREE.Group();
  g.name = "delivery-crate";
  g.userData.kind = "crate";
  g.userData.label = "delivery crate";
  g.userData.layer = "logistics";
  g.userData.mode = "PAPER";

  const kraft = 0xc4a574;
  const strap = 0x5a3a22;
  const tape = 0xd4b07a;
  const wood = box(1.55, 1.05, 1.2, kraft);
  wood.position.y = 0.54;
  wood.userData.part = "crate";
  const lid = box(1.58, 0.1, 1.24, 0xb08958);
  lid.position.y = 1.1;
  lid.userData.part = "lid";
  const band = box(1.62, 0.12, 0.16, strap);
  band.position.y = 0.7;
  band.userData.part = "strap";
  const band2 = box(0.16, 0.12, 1.28, strap);
  band2.position.y = 0.7;
  band2.userData.part = "strap";
  const seal = box(0.55, 0.04, 0.18, tape);
  seal.position.set(0, 1.16, 0);
  seal.userData.part = "tape";

  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x5fe3a0,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.06, 20), glowMat);
  ring.position.y = 0.04;
  ring.userData.part = "glow";
  ring.userData.pulse = true;
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.55, 2.4, 10),
    new THREE.MeshBasicMaterial({
      color: 0x5fe3a0,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    }),
  );
  shaft.position.y = 1.3;
  shaft.userData.part = "glow";
  shaft.userData.pulse = true;

  const pick = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 2.4, 8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  pick.position.y = 1.1;
  pick.userData.part = "pick";
  g.add(wood, lid, band, band2, seal, ring, shaft, pick);
  g.userData.glow = [ring, shaft];
  return g;
}

/** Hired vendor. Stands by the cart. ~1.7 m like the player. */
export function makeVendor() {
  const g = new THREE.Group();
  g.name = "vendor";
  g.userData.kind = "vendor";
  g.userData.label = "hired vendor";
  g.userData.layer = "world";
  g.userData.mode = "PAPER";
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.28, 0.85, 4, 8),
    new THREE.MeshLambertMaterial({ color: 0xc4a574 }),
  );
  body.position.y = 0.85;
  body.userData.part = "body";
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0xf2d2a8 }),
  );
  head.position.y = 1.62;
  head.userData.part = "head";
  const hat = box(0.42, 0.1, 0.42, 0xb42318);
  hat.position.y = 1.84;
  hat.userData.part = "hat";
  g.add(body, head, hat);
  return g;
}

/** Kept so old imports do not boot-fail. Does not parent a wagon on the player. */
export function dressCart(player) {
  return player;
}
