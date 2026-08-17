import * as THREE from "three";

/**
 * PAPER house-shop interior dress. Downstairs shop counter plus a living-room
 * hint — not a pure house, not a pure shop, not warehouse / farm / factory.
 * No WASD. Tap-to-walk stays in interior.js.
 *
 * Call dressHouseShop(scene) when plot.kind or plot.use is "house_shop".
 * Idempotent: a second call only shows the existing dress.
 */

const WOOD = 0x8a6238;
const WOOD_DARK = 0x6a4428;
const WOOD_TOP = 0x9a6a40;
const SOFA = 0xa84232;
const SOFA_DARK = 0x8a3228;
const LINEN = 0xf4ead8;
const CREAM = 0xe8d7b8;
const CORAL = 0xc45c3a;
const TEAL = 0x2a7a72;
const TIN = 0xc4a574;
const GREEN = 0x5f8a32;
const RUG = 0xa84232;
const BRASS = 0xc4a574;
const SHADE = 0xf0c878;
const PAPER_CARD = 0xf3efe4;
const HOUSE_KINDS = new Set(["interior-table", "interior-chair", "interior-lamp"]);

export function isHouseShopPlot(plot) {
  if (!plot) return false;
  return plot.kind === "house_shop" || plot.use === "house_shop";
}

function paperBox(w, h, d, color, kind = "house-shop-prop") {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  m.castShadow = true;
  m.receiveShadow = true;
  m.userData.kind = kind;
  m.userData.mode = "PAPER";
  return m;
}

function makeCounter(x, z) {
  const g = new THREE.Group();
  g.name = "house-shop-counter";
  g.userData.kind = "house-shop-counter";
  g.userData.mode = "PAPER";
  const y0 = 0.16;
  const topY = y0 + 0.92;
  const top = paperBox(2.55, 0.08, 0.78, WOOD_TOP, "house-shop-counter");
  top.position.set(0, topY, 0);
  g.add(top);
  const body = paperBox(2.42, 0.82, 0.7, WOOD, "house-shop-counter");
  body.position.set(0, y0 + 0.41, 0);
  g.add(body);
  const kick = paperBox(2.42, 0.1, 0.08, WOOD_DARK, "house-shop-counter");
  kick.position.set(0, y0 + 0.05, 0.36);
  g.add(kick);
  const till = paperBox(0.4, 0.18, 0.3, WOOD_DARK, "house-shop-till");
  till.position.set(0.78, topY + 0.13, -0.06);
  g.add(till);
  const tillLid = paperBox(0.36, 0.06, 0.26, CORAL, "house-shop-till");
  tillLid.position.set(0.78, topY + 0.24, -0.06);
  g.add(tillLid);
  const jar = paperBox(0.18, 0.24, 0.18, TEAL, "house-shop-goods");
  jar.position.set(-0.82, topY + 0.16, 0.1);
  g.add(jar);
  const tin = paperBox(0.2, 0.16, 0.2, TIN, "house-shop-goods");
  tin.position.set(-0.48, topY + 0.12, 0.12);
  g.add(tin);
  const stack = paperBox(0.24, 0.1, 0.18, LINEN, "house-shop-goods");
  stack.position.set(-0.12, topY + 0.09, 0.14);
  g.add(stack);
  g.position.set(x, 0, z);
  return g;
}

/** Small kraft / terracotta jar or tin sitting on a shelf plank. */
function shelfJar(color, h = 0.18) {
  const m = paperBox(0.14, h, 0.14, color, "house-shop-goods");
  m.userData.part = "shelf-jar";
  return m;
}

/**
 * Freestanding kraft cabinet. Back carcass + two planks — not a solid cube —
 * so 2–3 kraft/terracotta jars sit on the boards, readable from the door.
 */
function makeShelfBox(x, z, yaw, rows) {
  const g = new THREE.Group();
  g.name = "house-shop-shelf";
  g.userData.kind = "house-shop-shelf";
  g.userData.mode = "PAPER";
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  const y0 = 0.16;
  const w = 0.98;
  const d = 0.44;
  const h = 1.48;
  const body = paperBox(w, h, 0.14, WOOD, "house-shop-shelf");
  body.position.set(0, y0 + h / 2, -d / 2 + 0.07);
  g.add(body);
  const back = paperBox(w - 0.06, h - 0.1, 0.06, WOOD_DARK, "house-shop-shelf");
  back.position.set(0, y0 + h / 2, -d / 2 + 0.05);
  g.add(back);
  for (const sx of [-w / 2 + 0.04, w / 2 - 0.04]) {
    const cheek = paperBox(0.07, h, d - 0.06, WOOD, "house-shop-shelf");
    cheek.position.set(sx, y0 + h / 2, 0.02);
    g.add(cheek);
  }
  const goods = rows || [
    [CORAL, TIN],
    [LINEN],
  ];
  for (let i = 0; i < 2; i++) {
    const y = y0 + 0.44 + i * 0.54;
    const plank = paperBox(w - 0.12, 0.05, d - 0.1, WOOD_TOP, "house-shop-shelf");
    plank.position.set(0, y, 0.04);
    g.add(plank);
    const row = goods[i] || [];
    for (let k = 0; k < row.length; k++) {
      const t = row.length === 1 ? 0 : k / (row.length - 1) - 0.5;
      const gh = 0.16 + (k % 2) * 0.06;
      const item = shelfJar(row[k], gh);
      item.position.set(t * 0.46, y + gh / 2 + 0.04, 0.1);
      g.add(item);
    }
  }
  return g;
}

function makeShortShelf(x, z, yaw) {
  const g = new THREE.Group();
  g.name = "house-shop-shelf";
  g.userData.kind = "house-shop-shelf";
  g.userData.mode = "PAPER";
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  const width = 1.15;
  const back = paperBox(width, 1.35, 0.07, WOOD_DARK, "house-shop-shelf");
  back.position.set(0, 0.16 + 0.68, -0.18);
  g.add(back);
  const goods = [
    [CORAL, TIN, GREEN],
    [TEAL, LINEN, CORAL],
  ];
  for (let i = 0; i < 2; i++) {
    const y = 0.58 + i * 0.46;
    const plank = paperBox(width - 0.08, 0.05, 0.32, WOOD_TOP, "house-shop-shelf");
    plank.position.set(0, y, -0.02);
    g.add(plank);
    const row = goods[i];
    for (let k = 0; k < row.length; k++) {
      const t = k / (row.length - 1) - 0.5;
      const gh = 0.16 + (k % 2) * 0.06;
      const item = paperBox(0.14, gh, 0.12, row[k], "house-shop-goods");
      item.position.set(t * 0.72, y + gh / 2 + 0.03, 0.04);
      g.add(item);
    }
  }
  return g;
}

function makeSofa(x, z, yaw) {
  const g = new THREE.Group();
  g.name = "house-shop-sofa";
  g.userData.kind = "house-shop-sofa";
  g.userData.mode = "PAPER";
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  const y0 = 0.16;
  const seat = paperBox(1.55, 0.28, 0.62, SOFA, "house-shop-sofa");
  seat.position.set(0, y0 + 0.28, 0);
  g.add(seat);
  const back = paperBox(1.55, 0.52, 0.16, SOFA_DARK, "house-shop-sofa");
  back.position.set(0, y0 + 0.52, -0.28);
  g.add(back);
  for (const dx of [-0.78, 0.78]) {
    const arm = paperBox(0.16, 0.38, 0.62, SOFA_DARK, "house-shop-sofa");
    arm.position.set(dx, y0 + 0.38, 0);
    g.add(arm);
  }
  const cushion = paperBox(0.62, 0.08, 0.48, LINEN, "house-shop-sofa");
  cushion.position.set(-0.28, y0 + 0.46, 0.04);
  g.add(cushion);
  return g;
}

function makeChair(x, z, yaw) {
  const g = new THREE.Group();
  g.name = "house-shop-chair";
  g.userData.kind = "house-shop-chair";
  g.userData.mode = "PAPER";
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  const y0 = 0.16;
  const seatY = y0 + 0.42;
  g.add(paperBox(0.4, 0.06, 0.4, WOOD_TOP, "house-shop-chair"));
  g.children[0].position.set(0, seatY, 0);
  for (const [dx, dz] of [
    [-0.15, -0.15],
    [0.15, -0.15],
    [-0.15, 0.15],
    [0.15, 0.15],
  ]) {
    const leg = paperBox(0.06, seatY - y0, 0.06, WOOD, "house-shop-chair");
    leg.position.set(dx, y0 + (seatY - y0) / 2, dz);
    g.add(leg);
  }
  const back = paperBox(0.38, 0.46, 0.06, WOOD, "house-shop-chair");
  back.position.set(0, seatY + 0.26, -0.17);
  g.add(back);
  return g;
}

function makeCoffeeTable(x, z) {
  const g = new THREE.Group();
  g.name = "house-shop-table";
  g.userData.kind = "house-shop-table";
  g.userData.mode = "PAPER";
  const y0 = 0.16;
  const topY = y0 + 0.42;
  const top = paperBox(0.95, 0.06, 0.55, WOOD_TOP, "house-shop-table");
  top.position.set(x, topY, z);
  g.add(top);
  for (const [dx, dz] of [
    [-0.38, -0.18],
    [0.38, -0.18],
    [-0.38, 0.18],
    [0.38, 0.18],
  ]) {
    const leg = paperBox(0.06, topY - y0, 0.06, WOOD, "house-shop-table");
    leg.position.set(x + dx, y0 + (topY - y0) / 2, z + dz);
    g.add(leg);
  }
  const cup = paperBox(0.1, 0.08, 0.1, CREAM, "house-shop-prop");
  cup.position.set(x + 0.12, topY + 0.07, z);
  g.add(cup);
  // Kraft napkin on the table top — offset from the cup.
  // Table-top surface is topY + half the 0.06 top.
  g.add(makeTableNapkin(x - 0.22, topY + 0.03, z + 0.08));
  // Kraft spoon on the table top — offset from the cup, napkin, saucer, jars.
  g.add(makeTableSpoon(x + 0.32, topY + 0.03, z - 0.16));
  // Kraft knife on the table top — offset from the spoon, napkin, saucer, jars.
  g.add(makeTableKnife(x - 0.32, topY + 0.03, z - 0.18));
  // Tiny kraft PAPER cup — offset from the knife, spoon, napkin, saucer.
  g.add(makeTableCup(x + 0.12, topY + 0.03, z + 0.18));
  // Tiny kraft PAPER coaster — offset from the cup, knife, spoon, napkin.
  g.add(makeTableCoaster(x + 0.42, topY + 0.03, z + 0.12));
  // Tiny kraft PAPER blotter — offset from the coaster, cup, knife, spoon, napkin.
  g.add(makeTableBlotter(x + 0.02, topY + 0.03, z - 0.18));
  // Tiny kraft PAPER stamp — offset from the blotter, coaster, cup, knife, spoon, napkin, saucer.
  g.add(makeTableStamp(x - 0.44, topY + 0.03, z + 0.24));
  return g;
}

/**
 * Tiny kraft PAPER stamp on the living-room table — wood handle, cream pad.
 * Offset from the blotter, coaster, cup, knife, spoon, napkin, and saucer.
 * PAPER boxes only. No new hexes.
 */
function makeTableStamp(x, y, z) {
  const g = new THREE.Group();
  g.name = "house-shop-stamp";
  g.userData.kind = "house-shop-stamp";
  g.userData.mode = "PAPER";
  g.userData.part = "stamp";
  g.position.set(x, y, z);
  const pad = paperBox(0.07, 0.01, 0.05, CREAM, "house-shop-stamp");
  pad.position.set(0, 0.005, 0);
  const handle = paperBox(0.04, 0.028, 0.03, WOOD, "house-shop-stamp");
  handle.position.set(0, 0.024, 0);
  g.add(pad, handle);
  return g;
}

/**
 * Tiny kraft PAPER blotter on the living-room table — wood board, cream pad.
 * Offset from the coaster, cup, knife, spoon, napkin, and saucer.
 * PAPER boxes only. No new hexes.
 */
function makeTableBlotter(x, y, z) {
  const g = new THREE.Group();
  g.name = "house-shop-blotter";
  g.userData.kind = "house-shop-blotter";
  g.userData.mode = "PAPER";
  g.userData.part = "blotter";
  g.position.set(x, y, z);
  const board = paperBox(0.12, 0.008, 0.09, WOOD, "house-shop-blotter");
  board.position.set(0, 0.004, 0);
  const pad = paperBox(0.1, 0.008, 0.075, CREAM, "house-shop-blotter");
  pad.position.set(0, 0.012, 0);
  g.add(board, pad);
  return g;
}

/**
 * Tiny kraft PAPER coaster on the living-room table — cream disc, wood ring.
 * Offset from the cup, knife, spoon, napkin, and saucer.
 * PAPER boxes only. No new hexes.
 */
function makeTableCoaster(x, y, z) {
  const g = new THREE.Group();
  g.name = "house-shop-coaster";
  g.userData.kind = "house-shop-coaster";
  g.userData.mode = "PAPER";
  g.userData.part = "coaster";
  g.position.set(x, y, z);
  const disc = paperBox(0.1, 0.01, 0.1, CREAM, "house-shop-coaster");
  disc.position.set(0, 0.005, 0);
  const ring = paperBox(0.06, 0.008, 0.06, WOOD, "house-shop-coaster");
  ring.position.set(0, 0.012, 0);
  g.add(disc, ring);
  return g;
}

/**
 * Tiny kraft PAPER cup on the living-room table — cream body, linen rim,
 * wood handle. Offset from the knife, spoon, napkin, and saucer.
 * PAPER boxes only. No new hexes. Not the counter cup.
 */
function makeTableCup(x, y, z) {
  const g = new THREE.Group();
  g.name = "house-shop-table-cup";
  g.userData.kind = "house-shop-table-cup";
  g.userData.mode = "PAPER";
  g.userData.part = "cup";
  g.position.set(x, y, z);
  const body = paperBox(0.07, 0.06, 0.07, CREAM, "house-shop-table-cup");
  body.position.set(0, 0.03, 0);
  const rim = paperBox(0.078, 0.012, 0.078, LINEN, "house-shop-table-cup");
  rim.position.set(0, 0.066, 0);
  const handle = paperBox(0.02, 0.03, 0.02, WOOD, "house-shop-table-cup");
  handle.position.set(0.05, 0.032, 0);
  g.add(body, rim, handle);
  return g;
}

/**
 * Tiny kraft PAPER napkin on the living-room table — folded LINEN / CREAM / WOOD
 * boxes. Offset from the table cup and from the counter cup, saucer, kettle,
 * bell, and pad. PAPER boxes only. No new hexes.
 */
function makeTableNapkin(x, y, z) {
  const g = new THREE.Group();
  g.name = "house-shop-napkin";
  g.userData.kind = "house-shop-napkin";
  g.userData.mode = "PAPER";
  g.userData.part = "napkin";
  g.position.set(x, y, z);
  const sheet = paperBox(0.14, 0.01, 0.12, LINEN, "house-shop-napkin");
  sheet.position.set(0, 0.005, 0);
  const fold = paperBox(0.1, 0.012, 0.09, CREAM, "house-shop-napkin");
  fold.position.set(0.015, 0.016, 0.008);
  fold.rotation.y = 0.22;
  const hem = paperBox(0.07, 0.01, 0.06, WOOD, "house-shop-napkin");
  hem.position.set(-0.02, 0.022, -0.01);
  hem.rotation.y = -0.16;
  g.add(sheet, fold, hem);
  return g;
}

/**
 * Tiny kraft PAPER spoon on the living-room table — wood handle, linen bowl.
 * Offset from the table cup and napkin, and from the counter saucer / shelf
 * jars. PAPER boxes only. No new hexes.
 */
function makeTableSpoon(x, y, z) {
  const g = new THREE.Group();
  g.name = "house-shop-spoon";
  g.userData.kind = "house-shop-spoon";
  g.userData.mode = "PAPER";
  g.userData.part = "spoon";
  g.position.set(x, y, z);
  const handle = paperBox(0.012, 0.008, 0.09, WOOD, "house-shop-spoon");
  handle.position.set(0, 0.006, 0.028);
  const neck = paperBox(0.016, 0.007, 0.018, CREAM, "house-shop-spoon");
  neck.position.set(0, 0.007, -0.022);
  const bowl = paperBox(0.032, 0.01, 0.03, LINEN, "house-shop-spoon");
  bowl.position.set(0, 0.008, -0.048);
  g.add(handle, neck, bowl);
  return g;
}

/**
 * Tiny kraft PAPER knife on the living-room table — wood handle, linen
 * bolster, cream blade. Offset from the spoon, napkin, saucer, and shelf
 * jars. PAPER boxes only. No new hexes.
 */
function makeTableKnife(x, y, z) {
  const g = new THREE.Group();
  g.name = "house-shop-knife";
  g.userData.kind = "house-shop-knife";
  g.userData.mode = "PAPER";
  g.userData.part = "knife";
  g.position.set(x, y, z);
  const handle = paperBox(0.012, 0.008, 0.08, WOOD, "house-shop-knife");
  handle.position.set(0, 0.006, 0.026);
  const bolster = paperBox(0.02, 0.008, 0.014, LINEN, "house-shop-knife");
  bolster.position.set(0, 0.007, -0.018);
  const blade = paperBox(0.016, 0.006, 0.07, CREAM, "house-shop-knife");
  blade.position.set(0, 0.007, -0.058);
  g.add(handle, bolster, blade);
  return g;
}

function hangingLamp(x, y, z) {
  const g = new THREE.Group();
  g.name = "house-shop-lamp";
  g.userData.kind = "house-shop-lamp";
  g.userData.mode = "PAPER";
  const stem = paperBox(0.04, 0.32, 0.04, WOOD_DARK, "house-shop-lamp");
  stem.position.set(x, y + 0.2, z);
  const shade = paperBox(0.48, 0.16, 0.48, SHADE, "house-shop-lamp");
  shade.position.set(x, y, z);
  const bulb = paperBox(0.09, 0.06, 0.09, 0xfff1d0, "house-shop-lamp");
  bulb.position.set(x, y - 0.1, z);
  g.add(stem, shade, bulb);
  return g;
}

/**
 * Small kraft shop bell hanging above the counter — wood cord, tin body,
 * wood clapper. PAPER boxes only. Not a lamp, not a till.
 */
function hangingBell(x, y, z) {
  const g = new THREE.Group();
  g.name = "house-shop-bell";
  g.userData.kind = "house-shop-bell";
  g.userData.mode = "PAPER";
  g.position.set(x, y, z);
  const cord = paperBox(0.035, 0.28, 0.035, WOOD, "house-shop-bell");
  cord.position.set(0, 0.22, 0);
  const cap = paperBox(0.08, 0.045, 0.08, TIN, "house-shop-bell");
  cap.position.set(0, 0.06, 0);
  const body = paperBox(0.16, 0.12, 0.16, TIN, "house-shop-bell");
  body.position.set(0, -0.02, 0);
  const rim = paperBox(0.22, 0.04, 0.22, TIN, "house-shop-bell");
  rim.position.set(0, -0.1, 0);
  const clapper = paperBox(0.05, 0.08, 0.05, WOOD, "house-shop-bell");
  clapper.position.set(0, -0.14, 0);
  g.add(cord, cap, body, rim, clapper);
  return g;
}

/**
 * Small kraft receipt pad / tally card on the counter — cream pad, darker
 * slip on top. PAPER boxes only. Not a till, not the bell.
 */
function makeReceiptPad(x, y, z) {
  const g = new THREE.Group();
  g.name = "house-shop-pad";
  g.userData.kind = "house-shop-pad";
  g.userData.mode = "PAPER";
  g.position.set(x, y, z);
  const pad = paperBox(0.28, 0.018, 0.36, CREAM, "house-shop-pad");
  pad.position.set(0, 0.009, 0);
  const slip = paperBox(0.22, 0.01, 0.28, WOOD, "house-shop-pad");
  slip.position.set(0.01, 0.023, 0.01);
  g.add(pad, slip);
  return g;
}

/**
 * Small kraft PAPER jar on the counter — tin body, cream band, wood lid.
 * PAPER boxes only. Offset from the receipt pad and bell. Not a till.
 */
function makeCounterJar(x, y, z) {
  const g = new THREE.Group();
  g.name = "house-shop-jar";
  g.userData.kind = "house-shop-jar";
  g.userData.mode = "PAPER";
  g.position.set(x, y, z);
  const body = paperBox(0.14, 0.18, 0.14, TIN, "house-shop-jar");
  body.position.set(0, 0.09, 0);
  const band = paperBox(0.15, 0.04, 0.15, CREAM, "house-shop-jar");
  band.position.set(0, 0.1, 0);
  const lid = paperBox(0.16, 0.04, 0.16, WOOD, "house-shop-jar");
  lid.position.set(0, 0.2, 0);
  g.add(body, band, lid);
  return g;
}

/**
 * Small kraft PAPER cup on the counter — cream/linen body, wood handle,
 * linen saucer underneath. PAPER boxes only. Offset from the kettle, jar,
 * receipt pad, and bell. Does not replace the cup.
 */
function makeCounterCup(x, y, z) {
  const g = new THREE.Group();
  g.name = "house-shop-cup";
  g.userData.kind = "house-shop-cup";
  g.userData.mode = "PAPER";
  g.position.set(x, y, z);
  const saucerH = 0.012;
  const saucer = paperBox(0.18, saucerH, 0.18, LINEN, "house-shop-cup");
  saucer.userData.part = "saucer";
  saucer.position.set(0, saucerH / 2, 0);
  const body = paperBox(0.1, 0.1, 0.1, CREAM, "house-shop-cup");
  body.position.set(0, saucerH + 0.05, 0);
  const rim = paperBox(0.11, 0.02, 0.11, LINEN, "house-shop-cup");
  rim.position.set(0, saucerH + 0.11, 0);
  const handle = paperBox(0.03, 0.06, 0.03, WOOD, "house-shop-cup");
  handle.position.set(0.075, saucerH + 0.06, 0);
  g.add(saucer, body, rim, handle);
  return g;
}

/**
 * Small kraft PAPER kettle on the counter — tin body, wood handle, cream lid.
 * PAPER boxes only. Offset from the jar, receipt pad, and bell. Not a till.
 */
function makeCounterKettle(x, y, z) {
  const g = new THREE.Group();
  g.name = "house-shop-kettle";
  g.userData.kind = "house-shop-kettle";
  g.userData.mode = "PAPER";
  g.position.set(x, y, z);
  const body = paperBox(0.16, 0.12, 0.14, TIN, "house-shop-kettle");
  body.position.set(0, 0.06, 0);
  const spout = paperBox(0.08, 0.04, 0.05, TIN, "house-shop-kettle");
  spout.position.set(0.1, 0.08, 0);
  const handle = paperBox(0.04, 0.1, 0.04, WOOD, "house-shop-kettle");
  handle.position.set(-0.1, 0.14, 0);
  const lid = paperBox(0.12, 0.03, 0.12, CREAM, "house-shop-kettle");
  lid.position.set(0, 0.135, 0);
  g.add(body, spout, handle, lid);
  return g;
}

/**
 * Tiny kraft PAPER jug on the counter — tin body, wood handle, cream lip.
 * PAPER boxes only. Offset from the kettle, jar, pad, bell, cup, saucer,
 * stamp, blotter, coaster, napkin, spoon, and knife. Not a till.
 */
function makeCounterJug(x, y, z) {
  const g = new THREE.Group();
  g.name = "house-shop-jug";
  g.userData.kind = "house-shop-jug";
  g.userData.mode = "PAPER";
  g.userData.part = "jug";
  g.position.set(x, y, z);
  const body = paperBox(0.1, 0.12, 0.1, TIN, "house-shop-jug");
  body.position.set(0, 0.06, 0);
  const lip = paperBox(0.08, 0.03, 0.08, CREAM, "house-shop-jug");
  lip.position.set(0, 0.135, 0);
  const handle = paperBox(0.03, 0.08, 0.03, WOOD, "house-shop-jug");
  handle.position.set(-0.075, 0.07, 0);
  const spout = paperBox(0.05, 0.03, 0.04, TIN, "house-shop-jug");
  spout.position.set(0.07, 0.12, 0);
  g.add(body, lip, handle, spout);
  return g;
}

/**
 * Tiny kraft PAPER pot on the counter — tin body, wood handles, cream rim.
 * PAPER boxes only. Offset from the jug, kettle, jar, pad, bell, cup, saucer,
 * stamp, blotter, coaster, napkin, spoon, and knife. Not a till.
 */
function makeCounterPot(x, y, z) {
  const g = new THREE.Group();
  g.name = "house-shop-pot";
  g.userData.kind = "house-shop-pot";
  g.userData.mode = "PAPER";
  g.userData.part = "pot";
  g.position.set(x, y, z);
  const body = paperBox(0.09, 0.08, 0.09, TIN, "house-shop-pot");
  body.position.set(0, 0.04, 0);
  const rim = paperBox(0.1, 0.02, 0.1, CREAM, "house-shop-pot");
  rim.position.set(0, 0.09, 0);
  const handleL = paperBox(0.025, 0.03, 0.025, WOOD, "house-shop-pot");
  handleL.position.set(-0.06, 0.065, 0);
  const handleR = paperBox(0.025, 0.03, 0.025, WOOD, "house-shop-pot");
  handleR.position.set(0.06, 0.065, 0);
  g.add(body, rim, handleL, handleR);
  return g;
}

/**
 * Tiny kraft PAPER tin on the counter — tin body, cream band, wood lid.
 * PAPER boxes only. Offset from the pan, pot, jug, kettle, jar, pad, bell,
 * cup, and saucer. Not a till.
 */
function makeCounterTin(x, y, z) {
  const g = new THREE.Group();
  g.name = "house-shop-tin";
  g.userData.kind = "house-shop-tin";
  g.userData.mode = "PAPER";
  g.userData.part = "tin";
  g.position.set(x, y, z);
  const body = paperBox(0.08, 0.07, 0.08, TIN, "house-shop-tin");
  body.position.set(0, 0.035, 0);
  const band = paperBox(0.085, 0.02, 0.085, CREAM, "house-shop-tin");
  band.position.set(0, 0.04, 0);
  const lid = paperBox(0.09, 0.018, 0.09, WOOD, "house-shop-tin");
  lid.position.set(0, 0.079, 0);
  g.add(body, band, lid);
  return g;
}

/**
 * Tiny kraft PAPER pan on the counter — tin body, wood handle, cream rim.
 * PAPER boxes only. Offset from the pot, jug, kettle, jar, pad, bell, cup,
 * saucer, stamp, blotter, coaster, napkin, spoon, and knife. Not a till.
 */
function makeCounterPan(x, y, z) {
  const g = new THREE.Group();
  g.name = "house-shop-pan";
  g.userData.kind = "house-shop-pan";
  g.userData.mode = "PAPER";
  g.userData.part = "pan";
  g.position.set(x, y, z);
  const body = paperBox(0.11, 0.035, 0.11, TIN, "house-shop-pan");
  body.position.set(0, 0.018, 0);
  const rim = paperBox(0.12, 0.016, 0.12, CREAM, "house-shop-pan");
  rim.position.set(0, 0.043, 0);
  const handle = paperBox(0.07, 0.018, 0.022, WOOD, "house-shop-pan");
  handle.position.set(0.085, 0.028, 0);
  g.add(body, rim, handle);
  return g;
}

/**
 * Tiny kraft PAPER kettle on the counter — tin body, wood handle, cream lid.
 * PAPER boxes only. Offset from the pan, tin, pot, jug, saucer, knife, spoon,
 * napkin, cup, coaster, blotter, and stamp. Not the larger counter kettle.
 */
function makeTinyKettle(x, y, z) {
  const g = new THREE.Group();
  g.name = "house-shop-tiny-kettle";
  g.userData.kind = "house-shop-tiny-kettle";
  g.userData.mode = "PAPER";
  g.userData.part = "kettle";
  g.position.set(x, y, z);
  const body = paperBox(0.07, 0.055, 0.06, TIN, "house-shop-tiny-kettle");
  body.position.set(0, 0.028, 0);
  const spout = paperBox(0.035, 0.018, 0.022, TIN, "house-shop-tiny-kettle");
  spout.position.set(0.045, 0.038, 0);
  const handle = paperBox(0.018, 0.04, 0.018, WOOD, "house-shop-tiny-kettle");
  handle.position.set(-0.05, 0.048, 0);
  const lid = paperBox(0.05, 0.014, 0.05, CREAM, "house-shop-tiny-kettle");
  lid.position.set(0, 0.062, 0);
  g.add(body, spout, handle, lid);
  return g;
}

/**
 * Tiny kraft PAPER colander on the counter — tin bowl, cream rim, wood handles.
 * PAPER boxes only. Offset from the kettle, pan, tin, pot, jug, saucer, knife,
 * spoon, napkin, cup, coaster, blotter, and stamp. Not a till.
 */
function makeTinyColander(x, y, z) {
  const g = new THREE.Group();
  g.name = "house-shop-colander";
  g.userData.kind = "house-shop-colander";
  g.userData.mode = "PAPER";
  g.userData.part = "colander";
  g.position.set(x, y, z);
  const body = paperBox(0.09, 0.04, 0.09, TIN, "house-shop-colander");
  body.position.set(0, 0.02, 0);
  const rim = paperBox(0.1, 0.012, 0.1, CREAM, "house-shop-colander");
  rim.position.set(0, 0.046, 0);
  const handleL = paperBox(0.022, 0.016, 0.022, WOOD, "house-shop-colander");
  handleL.position.set(-0.06, 0.038, 0);
  const handleR = paperBox(0.022, 0.016, 0.022, WOOD, "house-shop-colander");
  handleR.position.set(0.06, 0.038, 0);
  g.add(body, rim, handleL, handleR);
  return g;
}

function tableLamp(x, y, z) {
  const g = new THREE.Group();
  g.name = "house-shop-lamp";
  g.userData.kind = "house-shop-lamp";
  g.userData.mode = "PAPER";
  g.add(paperBox(0.16, 0.04, 0.16, WOOD, "house-shop-lamp"));
  g.children[0].position.set(x, y, z);
  const stem = paperBox(0.04, 0.24, 0.04, BRASS, "house-shop-lamp");
  stem.position.set(x, y + 0.14, z);
  g.add(stem);
  const shade = paperBox(0.26, 0.14, 0.26, SHADE, "house-shop-lamp");
  shade.position.set(x, y + 0.32, z);
  g.add(shade);
  return g;
}

function paperMark(x, y, z) {
  const g = new THREE.Group();
  g.name = "house-shop-paper";
  g.userData.kind = "interior-paper";
  g.userData.mode = "PAPER";
  g.add(paperBox(0.78, 0.3, 0.04, TEAL, "interior-paper"));
  const card = paperBox(0.66, 0.2, 0.03, PAPER_CARD, "interior-paper");
  card.position.z = 0.03;
  g.add(card);
  g.position.set(x, y, z);
  return g;
}

function makeHouseShopDress() {
  const g = new THREE.Group();
  g.name = "house-shop-dress";
  g.userData.kind = "house-shop-dress";
  g.userData.mode = "PAPER";
  g.userData.provenance = "SIMULATED";

  // Door is at +z; enter camera looks through it at x≈0. Counter + two
  // shelf boxes sit in that strip so downstairs is not an empty dining room.
  g.add(makeCounter(0, 0.48));
  // Seven kraft/terracotta jars across the two door-facing cabinets.
  g.add(makeShelfBox(-0.78, -0.52, 0, [[CORAL, TIN, TIN], [LINEN]]));
  g.add(makeShelfBox(0.78, -0.52, 0, [[TIN, CORAL], [CREAM]]));
  g.add(makeShortShelf(-3.28, 0.45, Math.PI / 2));
  g.add(hangingLamp(0, 2.18, 0.48));
  // Kraft tin bell above the counter, offset from the lamp so both read.
  g.add(hangingBell(0.62, 1.78, 0.62));
  // Kraft receipt pad on the counter top, offset from the bell so both read.
  g.add(makeReceiptPad(0.18, 1.12, 0.36));
  // Kraft jar on the counter, offset from the pad and bell so all three read.
  g.add(makeCounterJar(-0.28, 1.12, 0.32));
  // Kraft kettle on the counter, offset from the jar, pad, and bell so all four read.
  g.add(makeCounterKettle(-0.62, 1.12, 0.38));
  // Kraft cup on the counter, offset from the kettle, jar, pad, and bell so all five read.
  g.add(makeCounterCup(0.48, 1.12, 0.22));
  // Tiny kraft PAPER jug on the counter, offset from kettle, jar, pad, bell, and cup.
  g.add(makeCounterJug(1.08, 1.12, 0.28));
  // Tiny kraft PAPER pot on the counter, offset from jug, kettle, jar, pad, bell, and cup.
  g.add(makeCounterPot(-0.96, 1.12, 0.26));
  // Tiny kraft PAPER pan on the counter, offset from pot, jug, kettle, jar, pad, bell, and cup.
  g.add(makeCounterPan(0.90, 1.12, 0.52));
  // Tiny kraft PAPER tin on the counter, offset from pan, pot, jug, kettle, jar, pad, bell, and cup.
  g.add(makeCounterTin(-1.10, 1.12, 0.55));
  // Tiny kraft PAPER kettle on the counter, offset from pan, tin, pot, jug, and table dress.
  g.add(makeTinyKettle(0.22, 1.12, 0.70));
  // Tiny kraft PAPER colander on the counter, offset from kettle, pan, tin, pot, jug, and table dress.
  g.add(makeTinyColander(-0.42, 1.12, 0.68));
  g.add(paperMark(-2.15, 1.62, 3.38));

  const rug = paperBox(1.55, 0.04, 1.25, RUG, "house-shop-rug");
  rug.position.set(-1.25, 0.18, -1.55);
  g.add(rug);
  g.add(makeSofa(-1.25, -2.15, 0));
  g.add(makeCoffeeTable(-1.25, -1.35));
  g.add(makeChair(-0.35, -1.55, -0.6));
  g.add(makeChair(-2.05, -1.45, 0.55));
  g.add(tableLamp(-2.85, 0.9, -2.45));
  const side = paperBox(0.85, 0.62, 0.34, WOOD, "house-shop-prop");
  side.position.set(-3.25, 0.47, -2.45);
  g.add(side);

  return g;
}

function findInterior(root) {
  if (!root) return null;
  if (root.userData?.kind === "interior") return root;
  let found = null;
  root.traverse((o) => {
    if (!found && o.userData?.kind === "interior") found = o;
  });
  return found;
}

/** Hide downstairs dining set only. Upstairs bed stays — this is still a house. */
function setDownstairsHouseVisible(interior, visible) {
  const down = interior.getObjectByName("downstairs");
  const root = down || interior;
  root.traverse((o) => {
    if (HOUSE_KINDS.has(o.userData?.kind)) o.visible = visible;
    if (o.userData?.kind === "interior-prop") o.visible = visible;
  });
}

/**
 * Dress an interior (or a scene that contains one) as a PAPER house-shop.
 * Shop counter toward the door; living-room hint toward the back wall.
 * @param {THREE.Object3D} scene
 */
export function dressHouseShop(scene) {
  if (!scene) return null;
  const interior = findInterior(scene) || scene;
  interior.userData.mode = "PAPER";
  interior.userData.interiorUse = "house_shop";
  interior.userData.provenance = "SIMULATED";
  setDownstairsHouseVisible(interior, false);
  const down = interior.getObjectByName("downstairs") || interior;
  let dress = interior.getObjectByName("house-shop-dress");
  if (!dress) {
    dress = makeHouseShopDress();
    down.add(dress);
  }
  dress.visible = true;
  return interior;
}

/** Restore the downstairs house dining set after a house-shop visit. */
export function undressHouseShop(scene) {
  if (!scene) return null;
  const interior = findInterior(scene) || scene;
  const dress = interior.getObjectByName("house-shop-dress");
  if (dress) dress.visible = false;
  setDownstairsHouseVisible(interior, true);
  interior.userData.interiorUse = "house";
  return interior;
}
