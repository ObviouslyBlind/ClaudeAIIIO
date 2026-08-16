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
 * deck. `/g/lamps55` FAIL LAMPS: 0.4 m glass on inland along values read as
 * empty deck from the 24 m seaward spawn camera. Sit these on the seaward
 * half, short of the 43 m lip, so the cream lanterns sit in the ferry frame.
 */
export const QUAY_LAMP_SPOTS = Object.freeze([
  Object.freeze({ side: -4.55, along: 8 }),
  Object.freeze({ side: 4.55, along: 16 }),
  Object.freeze({ side: -4.55, along: 24 }),
  Object.freeze({ side: 4.55, along: 32 }),
  Object.freeze({ side: -4.55, along: 40 }),
  Object.freeze({ side: 4.55, along: 40 }),
]);

const glassMat = new THREE.MeshLambertMaterial({
  color: KRAFT,
  emissive: GLOW,
  emissiveIntensity: 0.85,
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
 * Spawn camera sits ~24 m up and ~80 m away; a 0.4 m lantern is a speck.
 * Scale matches the north-face ferry fender so the cream box reads.
 */
function paperLamp() {
  const g = new THREE.Group();
  g.name = "quay-lamp";
  g.userData.kind = "quay-lamp";
  g.userData.dress = "quay-lamp";
  g.userData.mode = "PAPER";

  /** Timber footing under the post. PAPER box, sits on the deck. */
  const base = part(1.55, 0.22, 1.55, WOOD);
  base.position.y = 0.11;
  base.userData.part = "base";

  const post = part(1.05, 8.4, 1.05, WOOD_DARK);
  post.position.y = 4.32;
  post.userData.part = "post";

  const collar = part(1.55, 0.28, 1.55, WOOD, false);
  collar.position.y = 8.42;
  collar.userData.part = "collar";

  /** Kraft drip cup on the collar, just under the glass. Not a new post. */
  const drip = part(1.2, 0.16, 1.2, KRAFT, false);
  drip.position.y = 8.6;
  drip.userData.part = "drip";

  const glass = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.2, 2.6), glassMat);
  glass.position.y = 10.3;
  glass.castShadow = false;
  glass.receiveShadow = true;
  glass.userData.mode = "PAPER";
  glass.userData.part = "glass";
  glass.userData.kind = "quay-lamp-glass";

  const cap = part(3.05, 0.32, 3.05, WOOD, false);
  cap.position.y = 12.02;
  cap.userData.part = "cap";

  const brace = part(0.22, 1.45, 0.22, WOOD);
  brace.position.set(0.62, 7.55, 0);
  brace.rotation.z = 0.7;
  brace.userData.part = "brace";

  /** Kraft hanging loop under the glass. PAPER boxes, not iron. */
  const ring = new THREE.Group();
  ring.name = "ring";
  ring.userData.part = "ring";
  ring.userData.mode = "PAPER";
  ring.position.set(0, 8.15, 0.7);
  const top = part(0.42, 0.1, 0.1, KRAFT, false);
  top.position.set(0, 0.22, 0);
  const bot = part(0.42, 0.1, 0.1, KRAFT, false);
  bot.position.set(0, -0.22, 0);
  const left = part(0.1, 0.44, 0.1, KRAFT, false);
  left.position.set(-0.18, 0, 0);
  const right = part(0.1, 0.44, 0.1, KRAFT, false);
  right.position.set(0.18, 0, 0);
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
