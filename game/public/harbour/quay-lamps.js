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
 * Playtest scale (D036): a person is ~2 m. Lamp posts are street-lamp
 * tall (~3.2 m), not the 32 m critic towers that wrecked inland spawn.
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

/** Street-lamp tall. Visitor is ~2 m; a 32 m post reads as a tower. */
function paperLamp() {
  const g = new THREE.Group();
  g.name = "quay-lamp";
  g.userData.kind = "quay-lamp";
  g.userData.dress = "quay-lamp";
  g.userData.mode = "PAPER";

  const base = part(0.32, 0.12, 0.32, WOOD);
  base.position.y = 0.06;
  base.userData.part = "base";

  const post = part(0.14, 3.2, 0.14, WOOD_DARK);
  post.position.y = 1.66;
  post.userData.part = "post";

  const collar = part(0.22, 0.08, 0.22, WOOD, false);
  collar.position.y = 3.22;
  collar.userData.part = "collar";

  const drip = part(0.28, 0.06, 0.28, KRAFT, false);
  drip.position.y = 3.28;
  drip.userData.part = "drip";

  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.38), glassMat);
  glass.position.y = 3.52;
  glass.castShadow = false;
  glass.receiveShadow = true;
  glass.userData.mode = "PAPER";
  glass.userData.part = "glass";
  glass.userData.kind = "quay-lamp-glass";

  const cap = part(0.42, 0.08, 0.42, WOOD, false);
  cap.position.y = 3.74;
  cap.userData.part = "cap";

  const brace = part(0.06, 0.42, 0.06, WOOD);
  brace.position.set(0.12, 2.95, 0);
  brace.rotation.z = 0.55;
  brace.userData.part = "brace";

  const ring = new THREE.Group();
  ring.name = "ring";
  ring.userData.part = "ring";
  ring.userData.mode = "PAPER";
  ring.position.set(0, 3.24, 0.16);
  const top = part(0.16, 0.04, 0.04, KRAFT, false);
  top.position.set(0, 0.08, 0);
  const bot = part(0.16, 0.04, 0.04, KRAFT, false);
  bot.position.set(0, -0.08, 0);
  const left = part(0.04, 0.16, 0.04, KRAFT, false);
  left.position.set(-0.07, 0, 0);
  const right = part(0.04, 0.16, 0.04, KRAFT, false);
  right.position.set(0.07, 0, 0);
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
