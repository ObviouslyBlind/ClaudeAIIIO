import * as THREE from "three";

/** Channel midpoint is the origin. Sit in the water south of North port so the side profile reads from the quay. */
const HOME_Z = -2200;
const SLIDE = 42;
const SLIDE_SPEED = 0.07;

function part(w, h, d, color, shadow = true) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

/**
 * Small authored ferry: hull, pitched cabin, deck posts.
 * Long axis along +X so North-port cameras see a boat, not a bow-on slab.
 */
export function makeFerry() {
  const g = new THREE.Group();
  g.name = "ferry";
  g.userData.kind = "ferry";

  const hull = part(36, 2.3, 11, 0x8a3b2a);
  hull.position.y = 0.55;
  g.add(hull);

  const keel = part(32, 0.7, 7.2, 0x5a2a1c, false);
  keel.position.y = -0.35;
  g.add(keel);

  const bow = part(8, 1.7, 8.4, 0x8a3b2a);
  bow.position.set(18.5, 0.65, 0);
  g.add(bow);

  const stern = part(5.5, 1.5, 9.2, 0x8a3b2a);
  stern.position.set(-17.8, 0.55, 0);
  g.add(stern);

  const gunwale = part(37, 0.32, 11.4, 0xd9cbb3, false);
  gunwale.position.y = 1.62;
  g.add(gunwale);

  const deck = part(34, 0.16, 10.2, 0xc4a574, false);
  deck.position.y = 1.78;
  g.add(deck);

  const cabin = part(12, 3.6, 7.4, 0xf3efe4);
  cabin.position.set(-3.2, 3.6, 0);
  g.add(cabin);

  const roofL = part(12.8, 0.16, 4.6, 0x7a3a2c, false);
  roofL.rotation.x = 0.52;
  roofL.position.set(-3.2, 5.85, -1.9);
  const roofR = part(12.8, 0.16, 4.6, 0x7a3a2c, false);
  roofR.rotation.x = -0.52;
  roofR.position.set(-3.2, 5.85, 1.9);
  g.add(roofL, roofR);

  const door = part(1.2, 2.1, 0.12, 0x4a3220, false);
  door.position.set(-3.2, 2.85, 3.78);
  g.add(door);

  for (const x of [-7.2, -3.2, 0.8]) {
    const win = part(1.35, 1.05, 0.1, 0x8ec4d4, false);
    win.position.set(x, 4.15, 3.76);
    const winB = win.clone();
    winB.position.z = -3.76;
    g.add(win, winB);
  }

  const stack = part(1.3, 3.4, 1.3, 0x4a4f57, false);
  stack.position.set(4.2, 5.4, 0);
  g.add(stack);
  const stackCap = part(1.6, 0.28, 1.6, 0x2a2d32, false);
  stackCap.position.set(4.2, 7.15, 0);
  g.add(stackCap);

  for (let i = -4; i <= 5; i++) {
    const post = part(0.28, 1.45, 0.28, 0x5a3a22, false);
    post.position.set(i * 2.6, 2.5, 5.15);
    const postB = post.clone();
    postB.position.z = -5.15;
    g.add(post, postB);
  }

  g.position.set(0, 0, HOME_Z);
  return g;
}

let elapsed = 0;

export function tickFerry(ferry, dt) {
  elapsed += dt;
  ferry.position.x = Math.sin(elapsed * SLIDE_SPEED) * SLIDE;
}
