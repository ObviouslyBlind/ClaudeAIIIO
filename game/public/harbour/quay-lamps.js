import * as THREE from "three";

/**
 * PAPER lamp posts along the north and south timber quays.
 * Square wooden post, kraft/warm glass lantern. Not a street-prop iron
 * kit, not Capital Rift cyan, not OSM.
 *
 * Hook from quay.js `makeQuay` only. Do not import from main.js.
 */

const WOOD = 0x8a6238;
const WOOD_DARK = 0x6a4a2a;
/** Same kraft as port-sign board. */
const KRAFT = 0xefe4c8;
/** Paper-lamp amber, kin to window-lights GLOW. */
const GLOW = 0xe8a45a;

/**
 * Local pier spots. `side` is east of the port; `along` is toward the water
 * from pier centre (`pierZ = port.z + toward * 38`). Stay on the 11 m timber
 * deck (`|along| < 43`).
 *
 * `/g/lamps55` FAIL: 0.4 m glass, inland along.
 * `/g/lamps56` FAIL: 2.6 m glass still a speck — live spawn camera sits
 * ~130 m inland of the seaward lip (`player + {20,24,-40}`). Put lanterns
 * on the near deck AND the look-at lip, glass ~8 m so they read like the
 * north-face fender.
 */
export const QUAY_LAMP_SPOTS = Object.freeze([
  Object.freeze({ side: -3.2, along: -32 }),
  Object.freeze({ side: 3.2, along: -18 }),
  Object.freeze({ side: -3.2, along: 36 }),
  Object.freeze({ side: 3.2, along: 40 }),
  Object.freeze({ side: 0, along: 42 }),
]);

const glassMat = new THREE.MeshLambertMaterial({
  color: KRAFT,
  emissive: GLOW,
  emissiveIntensity: 1.35,
});

function part(w, h, d, color, shadow = true) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  m.castShadow = shadow;
  m.receiveShadow = true;
  m.userData.mode = "PAPER";
  return m;
}

/**
 * One timber post with a kraft glass box on top. No iron arm.
 * Live spawn camera is ~130 m from the seaward lip; 2.6 m glass vanished
 * (`/g/lamps56`). 8 m cream lanterns match the fender's angular size.
 */
function paperLamp() {
  const g = new THREE.Group();
  g.name = "quay-lamp";
  g.userData.kind = "quay-lamp";
  g.userData.dress = "quay-lamp";
  g.userData.mode = "PAPER";

  const base = part(2.6, 0.36, 2.6, WOOD);
  base.position.y = 0.18;
  base.userData.part = "base";

  const post = part(2.1, 14.2, 2.1, WOOD_DARK);
  post.position.y = 7.28;
  post.userData.part = "post";

  const collar = part(2.8, 0.4, 2.8, WOOD, false);
  collar.position.y = 14.35;
  collar.userData.part = "collar";

  const drip = part(2.2, 0.22, 2.2, KRAFT, false);
  drip.position.y = 14.62;
  drip.userData.part = "drip";

  const glass = new THREE.Mesh(new THREE.BoxGeometry(8.2, 10.4, 8.2), glassMat);
  glass.position.y = 20.0;
  glass.castShadow = false;
  glass.receiveShadow = true;
  glass.userData.mode = "PAPER";
  glass.userData.part = "glass";
  glass.userData.kind = "quay-lamp-glass";

  const cap = part(9.1, 0.55, 9.1, WOOD, false);
  cap.position.y = 25.4;
  cap.userData.part = "cap";

  const brace = part(0.35, 2.4, 0.35, WOOD);
  brace.position.set(1.15, 13.1, 0);
  brace.rotation.z = 0.7;
  brace.userData.part = "brace";

  const ring = new THREE.Group();
  ring.name = "ring";
  ring.userData.part = "ring";
  ring.userData.mode = "PAPER";
  ring.position.set(0, 14.2, 1.15);
  const top = part(0.7, 0.16, 0.16, KRAFT, false);
  top.position.set(0, 0.36, 0);
  const bot = part(0.7, 0.16, 0.16, KRAFT, false);
  bot.position.set(0, -0.36, 0);
  const left = part(0.16, 0.72, 0.16, KRAFT, false);
  left.position.set(-0.3, 0, 0);
  const right = part(0.16, 0.72, 0.16, KRAFT, false);
  right.position.set(0.3, 0, 0);
  ring.add(top, bot, left, right);

  g.add(base, post, collar, drip, glass, cap, brace, ring);
  return g;
}

/**
 * A few warm paper lamps on the timber pier of one island port.
 * helpers.heightAt(spec, x, z) — same land height as quay.js
 */
export function makeQuayLamps(spec, helpers) {
  if (!spec || (spec.id !== "north" && spec.id !== "south")) return null;

  const toward = spec.id === "north" ? 1 : -1;
  const { x, z } = spec.port;
  const y = helpers && helpers.heightAt ? helpers.heightAt(spec, x, z) : 1.12;
  const pierZ = z + toward * 38;
  const deckY = y + 0.5;

  const g = new THREE.Group();
  g.name = "quay-lamps-" + spec.id;
  g.userData.kind = "quay-lamps";
  g.userData.dress = "quay-lamps";
  g.userData.mode = "PAPER";

  for (const spot of QUAY_LAMP_SPOTS) {
    const lamp = paperLamp();
    lamp.position.set(x + spot.side, deckY, pierZ + toward * spot.along);
    g.add(lamp);
  }
  return g;
}
