import * as THREE from "three";

/** Channel midpoint is the origin. Sit in the water south of North port so the side profile reads from the quay. */
const HOME_Z = -2200;
const SLIDE = 42;
const SLIDE_SPEED = 0.07;

const HULL = 0xe6dcc8;
const BOOT = 0x2a3d44;
const STRIPE = 0xc45a3a;
const DECK = 0xc4a574;
const GUNWALE = 0xd9cbb3;
const CABIN = 0xf3efe4;
const ROOF = 0x6e3a28;
const GLASS = 0x8ec4d4;
const FRAME = 0x3d2a1c;
const RAIL = 0xe8e0d0;
const POST = 0x5a3a22;
const STACK = 0x4a4f57;
const STACK_CAP = 0x2a2d32;
const RAMP = 0xb08a58;
const DOOR = 0x4a3220;

function part(w, h, d, color, shadow = true) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

function pane(g, x, y, z, w, h) {
  const toward = z >= 0 ? 1 : -1;
  const frame = part(w + 0.18, h + 0.18, 0.08, FRAME, false);
  frame.position.set(x, y, z);
  const glass = part(w, h, 0.06, GLASS, false);
  glass.position.set(x, y, z + toward * 0.04);
  g.add(frame, glass);
}

/** Posts plus top and mid rails along +X. */
function addRail(g, x0, x1, z, y = 2.52) {
  const len = x1 - x0;
  const mid = (x0 + x1) / 2;
  const n = Math.max(2, Math.round(len / 2.35));
  for (let i = 0; i <= n; i++) {
    const post = part(0.16, 1.32, 0.16, POST, false);
    post.position.set(x0 + (i / n) * len, y, z);
    g.add(post);
  }
  const top = part(len + 0.22, 0.1, 0.12, RAIL, false);
  top.position.set(mid, y + 0.66, z);
  const midr = part(len + 0.22, 0.08, 0.1, RAIL, false);
  midr.position.set(mid, y + 0.2, z);
  g.add(top, midr);
}

/**
 * Small passenger ferry: cream hull with bow rake, brick stripe, cabin windows,
 * deck rails, and a gangway on the north face. Long axis along +X so North-port
 * cameras see a boat, not a bow-on slab.
 */
export function makeFerry() {
  const g = new THREE.Group();
  g.name = "ferry";
  g.userData.kind = "ferry";

  const transom = part(2.8, 1.85, 8.2, HULL);
  transom.position.set(-19.1, 0.42, 0);
  g.add(transom);

  const aft = part(7.0, 2.05, 10.2, HULL);
  aft.position.set(-14.2, 0.48, 0);
  g.add(aft);

  const mid = part(14.0, 2.28, 11.6, HULL);
  mid.position.set(-3.7, 0.55, 0);
  g.add(mid);

  const fwd = part(8.0, 2.2, 10.0, HULL);
  fwd.position.set(7.3, 0.62, 0);
  g.add(fwd);

  const shoulder = part(5.2, 2.05, 7.6, HULL);
  shoulder.position.set(13.9, 0.78, 0);
  g.add(shoulder);

  const stem = part(3.6, 1.95, 5.2, HULL);
  stem.position.set(18.3, 0.98, 0);
  g.add(stem);

  const tip = part(2.4, 1.7, 2.9, HULL);
  tip.position.set(21.2, 1.22, 0);
  g.add(tip);

  const rake = part(5.4, 1.85, 3.4, HULL);
  rake.rotation.z = 0.34;
  rake.position.set(20.6, 1.55, 0);
  g.add(rake);

  const keel = part(34.5, 0.52, 6.4, BOOT, false);
  keel.position.set(-1.2, -0.42, 0);
  g.add(keel);
  const bootAft = part(8.4, 0.42, 9.4, BOOT, false);
  bootAft.position.set(-15.4, -0.18, 0);
  g.add(bootAft);
  const bootMid = part(14.2, 0.42, 10.6, BOOT, false);
  bootMid.position.set(-3.7, -0.12, 0);
  g.add(bootMid);

  const stripeAft = part(7.0, 0.36, 10.32, STRIPE, false);
  stripeAft.position.set(-14.2, 1.05, 0);
  const stripeMid = part(14.0, 0.36, 11.72, STRIPE, false);
  stripeMid.position.set(-3.7, 1.12, 0);
  const stripeFwd = part(8.0, 0.36, 10.12, STRIPE, false);
  stripeFwd.position.set(7.3, 1.18, 0);
  g.add(stripeAft, stripeMid, stripeFwd);

  const gunAft = part(7.2, 0.28, 10.5, GUNWALE, false);
  gunAft.position.set(-14.2, 1.58, 0);
  const gunMid = part(14.2, 0.28, 11.9, GUNWALE, false);
  gunMid.position.set(-3.7, 1.66, 0);
  const gunFwd = part(8.2, 0.28, 10.3, GUNWALE, false);
  gunFwd.position.set(7.3, 1.72, 0);
  const gunBow = part(5.4, 0.24, 7.8, GUNWALE, false);
  gunBow.position.set(13.9, 1.88, 0);
  g.add(gunAft, gunMid, gunFwd, gunBow);

  const deckAft = part(8.4, 0.14, 9.4, DECK, false);
  deckAft.position.set(-14.6, 1.74, 0);
  const deckMid = part(16.2, 0.14, 10.6, DECK, false);
  deckMid.position.set(-3.2, 1.8, 0);
  const deckFwd = part(10.5, 0.14, 8.8, DECK, false);
  deckFwd.position.set(10.4, 1.88, 0);
  g.add(deckAft, deckMid, deckFwd);

  const cabin = part(16.5, 3.35, 7.6, CABIN);
  cabin.position.set(-2.4, 3.52, 0);
  g.add(cabin);

  const cabinRoof = part(17.2, 0.18, 8.15, ROOF, false);
  cabinRoof.position.set(-2.4, 5.28, 0);
  g.add(cabinRoof);
  const eaveL = part(17.2, 0.1, 0.28, ROOF, false);
  eaveL.position.set(-2.4, 5.18, -4.15);
  const eaveR = eaveL.clone();
  eaveR.position.z = 4.15;
  g.add(eaveL, eaveR);

  const wheel = part(5.2, 2.35, 6.2, CABIN);
  wheel.position.set(8.6, 4.95, 0);
  g.add(wheel);
  const wheelRoof = part(5.8, 0.16, 6.7, ROOF, false);
  wheelRoof.position.set(8.6, 6.2, 0);
  g.add(wheelRoof);

  const door = part(1.15, 2.05, 0.12, DOOR, false);
  door.position.set(-9.4, 2.88, -3.86);
  g.add(door);

  for (const x of [-6.6, -3.6, -0.6, 2.4, 5.2]) {
    pane(g, x, 4.05, 3.86, 1.45, 1.12);
    pane(g, x, 4.05, -3.86, 1.45, 1.12);
  }
  for (const x of [7.2, 9.9]) {
    pane(g, x, 5.15, 3.16, 1.35, 1.05);
    pane(g, x, 5.15, -3.16, 1.35, 1.05);
  }
  const bowFrame = part(0.08, 1.22, 2.45, FRAME, false);
  bowFrame.position.set(11.24, 5.15, 0);
  const bowGlass = part(0.06, 1.05, 2.2, GLASS, false);
  bowGlass.position.set(11.3, 5.15, 0);
  g.add(bowFrame, bowGlass);

  const stack = part(1.35, 3.5, 1.35, STACK, false);
  stack.position.set(5.6, 7.05, 0);
  g.add(stack);
  const stackCap = part(1.7, 0.28, 1.7, STACK_CAP, false);
  stackCap.position.set(5.6, 8.85, 0);
  g.add(stackCap);

  addRail(g, -17.6, -11.0, 5.18);
  addRail(g, -17.6, -11.0, -5.18);
  addRail(g, 6.4, 16.2, 5.08, 2.62);
  addRail(g, 6.4, 16.2, -5.08, 2.62);
  addRail(g, -10.6, 5.8, 3.95, 5.94);
  addRail(g, -10.6, 5.8, -3.95, 5.94);

  const ramp = part(2.25, 0.14, 7.4, RAMP, false);
  ramp.rotation.x = -0.3;
  ramp.position.set(-12.2, 1.12, -8.35);
  g.add(ramp);
  const hinge = part(2.55, 0.22, 0.5, 0x8a6238, false);
  hinge.position.set(-12.2, 1.72, -5.35);
  g.add(hinge);
  const rampPostA = part(0.14, 0.85, 0.14, POST, false);
  rampPostA.position.set(-13.2, 1.55, -7.4);
  const rampPostB = rampPostA.clone();
  rampPostB.position.x = -11.2;
  g.add(rampPostA, rampPostB);
  const rampRail = part(2.15, 0.08, 0.1, RAIL, false);
  rampRail.rotation.x = -0.3;
  rampRail.position.set(-12.2, 1.95, -8.1);
  g.add(rampRail);

  const rudder = part(0.18, 1.15, 0.7, BOOT, false);
  rudder.position.set(-20.55, -0.15, 0);
  g.add(rudder);

  g.position.set(0, 0, HOME_Z);
  return g;
}

let elapsed = 0;

export function tickFerry(ferry, dt) {
  elapsed += dt;
  ferry.position.x = Math.sin(elapsed * SLIDE_SPEED) * SLIDE;
}
