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
 * `/g/lamps56` FAIL: 2.6 m cream glass still a speck at ~130 m.
 * `/g/lamps57` FAIL: 8 m cream cubes read as flat white pier planks.
 * Tall dark posts (above the 24 m spawn camera) + amber lanterns on top
 * so they silhouette against cyan sky, not the kraft deck.
 */
export const QUAY_LAMP_SPOTS = Object.freeze([
  Object.freeze({ side: -3.2, along: -32 }),
  Object.freeze({ side: 3.2, along: -18 }),
  Object.freeze({ side: -3.2, along: 36 }),
  Object.freeze({ side: 3.2, along: 40 }),
  Object.freeze({ side: 0, along: 42 }),
]);

const glassMat = new THREE.MeshLambertMaterial({
  color: GLOW,
  emissive: GLOW,
  emissiveIntensity: 1.45,
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
 * Tall dark post + amber lantern on top. No iron arm.
 * `/g/lamps57`: 8 m cream cubes looked like pier planks from the downward
 * spawn look. Posts reach past camera height (24 m) so they read as
 * verticals against cyan sky; lanterns stay amber GLOW, not kraft cream.
 */
function paperLamp() {
  const g = new THREE.Group();
  g.name = "quay-lamp";
  g.userData.kind = "quay-lamp";
  g.userData.dress = "quay-lamp";
  g.userData.mode = "PAPER";

  const base = part(2.8, 0.4, 2.8, WOOD);
  base.position.y = 0.2;
  base.userData.part = "base";

  const post = part(2.4, 32, 2.4, WOOD_DARK);
  post.position.y = 16.2;
  post.userData.part = "post";

  const collar = part(3.2, 0.45, 3.2, WOOD, false);
  collar.position.y = 32.4;
  collar.userData.part = "collar";

  const drip = part(2.6, 0.24, 2.6, KRAFT, false);
  drip.position.y = 32.72;
  drip.userData.part = "drip";

  const glass = new THREE.Mesh(new THREE.BoxGeometry(4.6, 4.6, 4.6), glassMat);
  glass.position.y = 35.2;
  glass.castShadow = false;
  glass.receiveShadow = true;
  glass.userData.mode = "PAPER";
  glass.userData.part = "glass";
  glass.userData.kind = "quay-lamp-glass";

  const cap = part(5.4, 0.5, 5.4, WOOD, false);
  cap.position.y = 37.7;
  cap.userData.part = "cap";

  const brace = part(0.4, 3.2, 0.4, WOOD);
  brace.position.set(1.35, 28.4, 0);
  brace.rotation.z = 0.55;
  brace.userData.part = "brace";

  const ring = new THREE.Group();
  ring.name = "ring";
  ring.userData.part = "ring";
  ring.userData.mode = "PAPER";
  ring.position.set(0, 32.5, 1.4);
  const top = part(0.8, 0.18, 0.18, KRAFT, false);
  top.position.set(0, 0.4, 0);
  const bot = part(0.8, 0.18, 0.18, KRAFT, false);
  bot.position.set(0, -0.4, 0);
  const left = part(0.18, 0.8, 0.18, KRAFT, false);
  left.position.set(-0.34, 0, 0);
  const right = part(0.18, 0.8, 0.18, KRAFT, false);
  right.position.set(0.34, 0, 0);
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
