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
 * from pier centre. Stay on the 11 m timber deck, clear of bollards.
 */
export const QUAY_LAMP_SPOTS = Object.freeze([
  Object.freeze({ side: -4.55, along: -28 }),
  Object.freeze({ side: 4.55, along: -20 }),
  Object.freeze({ side: 4.55, along: -12 }),
  Object.freeze({ side: -4.55, along: -4 }),
  Object.freeze({ side: 4.55, along: 4 }),
  Object.freeze({ side: -4.55, along: 20 }),
  Object.freeze({ side: 4.55, along: 28 }),
]);

const glassMat = new THREE.MeshLambertMaterial({
  color: KRAFT,
  emissive: GLOW,
  emissiveIntensity: 0.4,
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

/** One timber post with a kraft glass box on top. No iron arm. */
function paperLamp() {
  const g = new THREE.Group();
  g.name = "quay-lamp";
  g.userData.kind = "quay-lamp";
  g.userData.dress = "quay-lamp";
  g.userData.mode = "PAPER";

  const post = part(0.16, 2.55, 0.16, WOOD_DARK);
  post.position.y = 1.28;
  post.userData.part = "post";

  const collar = part(0.28, 0.08, 0.28, WOOD, false);
  collar.position.y = 2.36;
  collar.userData.part = "collar";

  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.48, 0.38), glassMat);
  glass.position.y = 2.62;
  glass.castShadow = false;
  glass.receiveShadow = true;
  glass.userData.mode = "PAPER";
  glass.userData.part = "glass";
  glass.userData.kind = "quay-lamp-glass";

  const cap = part(0.46, 0.08, 0.46, WOOD, false);
  cap.position.y = 2.9;
  cap.userData.part = "cap";

  const brace = part(0.06, 0.32, 0.06, WOOD);
  brace.position.set(0.14, 2.14, 0);
  brace.rotation.z = 0.7;
  brace.userData.part = "brace";

  /** Kraft hanging loop under the glass. PAPER boxes, not iron. */
  const ring = new THREE.Group();
  ring.name = "ring";
  ring.userData.part = "ring";
  ring.userData.mode = "PAPER";
  ring.position.set(0, 2.22, 0.16);
  const top = part(0.11, 0.03, 0.03, KRAFT, false);
  top.position.set(0, 0.065, 0);
  const bot = part(0.11, 0.03, 0.03, KRAFT, false);
  bot.position.set(0, -0.065, 0);
  const left = part(0.03, 0.13, 0.03, KRAFT, false);
  left.position.set(-0.05, 0, 0);
  const right = part(0.03, 0.13, 0.03, KRAFT, false);
  right.position.set(0.05, 0, 0);
  ring.add(top, bot, left, right);

  g.add(post, collar, glass, cap, brace, ring);
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
