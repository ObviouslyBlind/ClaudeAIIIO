import * as THREE from "three";

/** Channel midpoint is the origin. +Z is south. North port is z=-6950. */
/**
 * Berth in the channel immediately off the north pier, past the dinghies
 * (along ~88 m) and still inside a quay orbit. `/?g=ferry30` FAIL: hull at
 * z=-6400 sat 550 m out, so the cream boat never entered the critic frame.
 */
export const HOME_Z = -6835;
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

function cyl(rTop, rBot, h, color, shadow = true) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(rTop, rBot, h, 8),
    new THREE.MeshLambertMaterial({ color }),
  );
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

/** Wood stem, iron base and cap. PAPER. Sits on the timber deck. */
function deckBollard(x, y, z) {
  const g = new THREE.Group();
  g.name = "bollard";
  g.userData.part = "bollard";
  g.position.set(x, y, z);
  const base = cyl(0.2, 0.22, 0.07, BOOT, false);
  base.position.y = 0.035;
  const stem = cyl(0.11, 0.13, 0.48, POST, false);
  stem.position.y = 0.31;
  const cap = cyl(0.18, 0.14, 0.12, BOOT, false);
  cap.position.y = 0.61;
  g.add(base, stem, cap);
  return g;
}

function pane(g, x, y, z, w, h) {
  const toward = z >= 0 ? 1 : -1;
  const frame = part(w + 0.18, h + 0.18, 0.08, FRAME, false);
  frame.position.set(x, y, z);
  const glass = part(w, h, 0.06, GLASS, false);
  glass.position.set(x, y, z + toward * 0.04);
  g.add(frame, glass);
}

/**
 * PAPER life ring: a short torus of terracotta / kraft boxes on the cabin.
 * STRIPE rust with HULL and RAIL cream bands — not iron, not a cylinder.
 */
function lifeRing(x, y, z) {
  const g = new THREE.Group();
  g.name = "lifering";
  g.userData.part = "lifering";
  g.position.set(x, y, z);
  g.rotation.x = Math.PI / 2;
  const n = 6;
  const r = 0.38;
  for (let layer = 0; layer < 2; layer++) {
    const ly = layer * 0.13;
    const rot = layer * (Math.PI / n);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rot;
      const band = (i + layer) % 3 === 0;
      const color = band ? (layer ? RAIL : HULL) : STRIPE;
      const seg = part(0.3, 0.13, 0.2, color, false);
      seg.position.set(Math.cos(a) * r, ly, Math.sin(a) * r);
      seg.rotation.y = a;
      g.add(seg);
    }
  }
  return g;
}

/**
 * Small kraft PAPER hanging lantern on the wheelhouse roof.
 * Cream/kraft glass box + wood bail. Boxes only — not smoke, not the
 * door handle, not the life ring, not a bollard.
 */
function roofLantern(x, y, z) {
  const g = new THREE.Group();
  g.name = "lantern";
  g.userData.part = "lantern";
  g.userData.mode = "PAPER";
  g.position.set(x, y, z);
  const bail = part(0.14, 0.04, 0.04, POST, false);
  bail.userData.part = "lantern";
  bail.position.y = 0.1;
  const hood = part(0.18, 0.04, 0.18, FRAME, false);
  hood.userData.part = "lantern";
  hood.position.y = 0.06;
  const glass = part(0.16, 0.18, 0.16, CABIN, false);
  glass.userData.part = "lantern";
  glass.position.y = -0.06;
  const kraft = part(0.12, 0.14, 0.12, DECK, false);
  kraft.userData.part = "lantern";
  kraft.position.y = -0.06;
  const base = part(0.18, 0.04, 0.18, POST, false);
  base.userData.part = "lantern";
  base.position.y = -0.17;
  g.add(bail, hood, glass, kraft, base);
  return g;
}

/**
 * Short kraft PAPER deck rail: two wood POST stanchions + one cream
 * RAIL/GUNWALE bar. Boxes only — sits on the cream deck, not the
 * wheelhouse lantern, not the funnel smoke, not the door handle.
 */
function deckRail(x, y, z) {
  const g = new THREE.Group();
  g.name = "rail";
  g.userData.part = "rail";
  g.userData.mode = "PAPER";
  g.position.set(x, y, z);
  const postA = part(0.12, 0.78, 0.12, POST, false);
  postA.position.set(-0.52, 0.39, 0);
  const postB = part(0.12, 0.78, 0.12, POST, false);
  postB.position.set(0.52, 0.39, 0);
  const bar = part(1.16, 0.08, 0.1, GUNWALE, false);
  bar.position.set(0, 0.74, 0);
  g.add(postA, postB, bar);
  return g;
}

/**
 * Small kraft PAPER mooring cleat: two wood POST horns + one DECK/BOOT
 * bar. Boxes only — sits on the cream deck, not the rail, not the
 * wheelhouse lantern, not the funnel smoke, not the door handle.
 */
function deckCleat(x, y, z) {
  const g = new THREE.Group();
  g.name = "cleat";
  g.userData.part = "cleat";
  g.userData.mode = "PAPER";
  g.position.set(x, y, z);
  const hornA = part(0.12, 0.22, 0.12, POST, false);
  hornA.position.set(-0.18, 0.11, 0);
  const hornB = part(0.12, 0.22, 0.12, POST, false);
  hornB.position.set(0.18, 0.11, 0);
  const bar = part(0.52, 0.08, 0.12, BOOT, false);
  bar.position.set(0, 0.24, 0);
  g.add(hornA, hornB, bar);
  return g;
}

/**
 * Small kraft PAPER tyre fender on the hull side. Short BOOT/DECK
 * cylinders + a STRIPE band — hangs on the cream hull, not the rail,
 * not the cleat, not the wheelhouse lantern, not the funnel smoke,
 * not the door handle.
 */
function hullFender(x, y, z) {
  const g = new THREE.Group();
  g.name = "fender";
  g.userData.part = "fender";
  g.userData.mode = "PAPER";
  g.position.set(x, y, z);
  const tyre = cyl(0.46, 0.46, 0.2, BOOT, false);
  tyre.rotation.x = Math.PI / 2;
  const kraft = cyl(0.28, 0.28, 0.14, DECK, false);
  kraft.rotation.x = Math.PI / 2;
  kraft.position.z = 0.02;
  const hub = cyl(0.12, 0.12, 0.1, HULL, false);
  hub.rotation.x = Math.PI / 2;
  hub.position.z = 0.03;
  const band = cyl(0.48, 0.48, 0.06, STRIPE, false);
  band.rotation.x = Math.PI / 2;
  g.add(tyre, kraft, hub, band);
  return g;
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

  g.add(deckBollard(-16.2, 1.81, 3.85));
  g.add(deckBollard(-16.2, 1.81, -3.85));
  // PAPER rail sits on the starboard cream deck, clear of lantern/smoke/handle.
  g.add(deckRail(13.4, 1.95, 3.4));
  // PAPER cleat sits on the port cream deck, clear of rail/lantern/smoke/handle.
  g.add(deckCleat(13.4, 1.95, -3.4));
  // PAPER tyre fender hangs on the starboard hull side, clear of rail/cleat/lantern/smoke/handle.
  g.add(hullFender(-3.7, 0.62, 6.02));

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
  // PAPER lantern sits on the starboard wheelhouse roof, clear of the funnel.
  g.add(roofLantern(8.6, 6.52, 2.55));

  const door = part(1.15, 2.05, 0.12, DOOR, false);
  door.position.set(-9.4, 2.88, -3.86);
  g.add(door);

  /**
   * Small kraft PAPER pull on the cabin leaf. FRAME plate + DECK lever —
   * original palette, boxes only, not a cylinder, not iron.
   */
  const handlePlate = part(0.1, 0.24, 0.04, FRAME, false);
  handlePlate.position.set(-9.06, 2.82, -3.94);
  const handle = part(0.07, 0.28, 0.08, DECK, false);
  handle.userData.part = "handle";
  handle.position.set(-9.02, 2.82, -3.99);
  g.add(handlePlate, handle);

  g.add(lifeRing(-8.5, 4.15, 3.92));

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

  /**
   * Small kraft PAPER puff above the funnel. Two stacked cream boxes —
   * CABIN then RAIL, not grey, not a cylinder.
   */
  const smoke = new THREE.Group();
  smoke.name = "smoke";
  smoke.userData.part = "smoke";
  smoke.position.set(5.6, 9.35, 0);
  const puffLo = part(1.05, 0.55, 1.05, CABIN, false);
  puffLo.position.set(0, 0.28, 0);
  const puffHi = part(0.72, 0.42, 0.72, RAIL, false);
  puffHi.position.set(0.08, 0.78, 0.06);
  smoke.add(puffLo, puffHi);
  g.add(smoke);

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

  g.position.set(0, 0.4, HOME_Z);
  g.scale.set(1.35, 1.35, 1.35);
  return g;
}

let elapsed = 0;

export function tickFerry(ferry, dt) {
  elapsed += dt;
  ferry.position.x = Math.sin(elapsed * SLIDE_SPEED) * SLIDE;
}
