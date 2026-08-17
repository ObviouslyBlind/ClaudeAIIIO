import * as THREE from "three";

/**
 * Placeable hotdog cart — the starting street stall, not a handheld wagon.
 * Door-scale: counter ~1.1 m, umbrella ~2.15 m against the 1.7 m player.
 */

const RED = 0xb42318;
const CREAM = 0xf4ead8;
const STEEL = 0x8a9096;
const WOOD = 0x6a4a2a;
const WHEEL = 0x1c1c20;
const MUSTARD = 0xe2c04a;

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

export function makeHotdogCart() {
  const g = new THREE.Group();
  g.name = "hotdog-cart";
  g.userData.mode = "PAPER";
  g.userData.kind = "hotdog-cart";

  const body = box(1.35, 0.72, 0.78, RED);
  body.position.y = 0.86;
  body.userData.part = "body";

  const counter = box(1.42, 0.06, 0.86, CREAM);
  counter.position.y = 1.24;
  counter.userData.part = "counter";

  const pole = box(0.05, 0.92, 0.05, STEEL);
  pole.position.y = 1.72;
  pole.userData.part = "pole";

  const umbrella = box(1.7, 0.08, 1.7, MUSTARD);
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

export function makeCrate() {
  const g = new THREE.Group();
  g.name = "delivery-crate";
  g.userData.kind = "crate";
  g.userData.mode = "PAPER";
  const wood = box(0.9, 0.55, 0.7, WOOD);
  wood.position.y = 0.28;
  wood.userData.part = "crate";
  const lid = box(0.92, 0.06, 0.72, 0x8a6238);
  lid.position.y = 0.58;
  lid.userData.part = "lid";
  g.add(wood, lid);
  return g;
}

/** Kept so old imports do not boot-fail. Does not parent a wagon on the player. */
export function dressCart(player) {
  return player;
}
