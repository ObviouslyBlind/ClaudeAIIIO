import * as THREE from "three";
import { dressFactory, isFactoryPlot, undressFactory } from "./factory.js";
import { dressWarehouse, isWarehousePlot, undressWarehouse } from "./warehouse.js";
import { dressShop, isShopPlot, undressShop } from "./shop.js";
import { dressHouseShop, isHouseShopPlot, undressHouseShop } from "./house-shop.js";

/** Player eye-height on the downstairs floor, metres. */
export const DOWNSTAIRS_Y = 1.15;
/** Player eye-height on the upstairs floor, metres. */
export const UPSTAIRS_Y = 3.85;
/** Interior room half-extents, metres. */
export const ROOM = { hw: 3.6, hd: 3.1 };

/**
 * Owned + developed only. NPC land, vacant lots, and unset use are SKIP.
 * @param {{ owner?: string | null, use?: string | null } | null | undefined} plot
 */
export function canEnter(plot) {
  if (!plot) return false;
  return plot.owner === "visitor" && Boolean(plot.use);
}

const WOOD = 0x5a3a22;
const WOOD_FLOOR = 0x8a5530;
const WOOD_FLOOR_UP = 0x7a4a28;
const WOOD_TOP = 0x6e4428;
const PLASTER = 0xf4ead8;
const PLASTER_SIDE = 0xefe0c8;
const FRAME = 0x3d2a1c;
const GLASS = 0x8ec4d4;
const SHUTTER = 0x2a7a72;
const DOOR = 0x4a3220;
const LINEN = 0xf7f1e6;
const CORAL = 0xc45c3a;
const RUG = 0xa84232;
const BRASS = 0xc4a574;
const SHADE = 0xf0c878;
const PAPER_CARD = 0xf3efe4;

function box(w, h, d, color, x, y, z, kind, extra = {}, matOpts = {}) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color, ...matOpts }),
  );
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  m.userData.kind = kind;
  Object.assign(m.userData, extra);
  return m;
}

function cyl(rTop, rBot, h, color, x, y, z, kind, extra = {}, matOpts = {}) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(rTop, rBot, h, 8),
    new THREE.MeshLambertMaterial({ color, ...matOpts }),
  );
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  m.userData.kind = kind;
  Object.assign(m.userData, extra);
  return m;
}

function uniqueSorted(values) {
  return [...new Set(values.map((v) => Math.round(v * 1000) / 1000))].sort((a, b) => a - b);
}

function openingHit(alongMid, yMid, openings) {
  return openings.some((o) => {
    const a0 = o.along - o.width / 2;
    const a1 = o.along + o.width / 2;
    return alongMid > a0 && alongMid < a1 && yMid > o.sill && yMid < o.head;
  });
}

/** Wall in the XY plane (constant z), boxes around window/door openings. */
function addWallZ(parent, { z, x0, x1, y0, y1, thick, color, openings, kind }) {
  const xs = uniqueSorted([x0, x1, ...openings.flatMap((o) => [o.along - o.width / 2, o.along + o.width / 2])]);
  const ys = uniqueSorted([y0, y1, ...openings.flatMap((o) => [o.sill, o.head])]);
  for (let i = 0; i < xs.length - 1; i++) {
    const w = xs[i + 1] - xs[i];
    if (w < 0.03) continue;
    const xm = (xs[i] + xs[i + 1]) / 2;
    for (let j = 0; j < ys.length - 1; j++) {
      const h = ys[j + 1] - ys[j];
      if (h < 0.03) continue;
      const ym = (ys[j] + ys[j + 1]) / 2;
      if (openingHit(xm, ym, openings)) continue;
      parent.add(box(w, h, thick, color, xm, ym, z, kind));
    }
  }
}

/** Wall in the ZY plane (constant x). */
function addWallX(parent, { x, z0, z1, y0, y1, thick, color, openings, kind }) {
  const zs = uniqueSorted([z0, z1, ...openings.flatMap((o) => [o.along - o.width / 2, o.along + o.width / 2])]);
  const ys = uniqueSorted([y0, y1, ...openings.flatMap((o) => [o.sill, o.head])]);
  for (let i = 0; i < zs.length - 1; i++) {
    const d = zs[i + 1] - zs[i];
    if (d < 0.03) continue;
    const zm = (zs[i] + zs[i + 1]) / 2;
    for (let j = 0; j < ys.length - 1; j++) {
      const h = ys[j + 1] - ys[j];
      if (h < 0.03) continue;
      const ym = (ys[j] + ys[j + 1]) / 2;
      if (openingHit(zm, ym, openings)) continue;
      parent.add(box(thick, h, d, color, x, ym, zm, kind));
    }
  }
}

function dressWindowZ(parent, x, z, sill, head, w, inward) {
  const h = head - sill;
  const midY = (sill + head) / 2;
  const n = inward;
  parent.add(box(w + 0.18, h + 0.18, 0.07, FRAME, x, midY, z + n * 0.07, "interior-window"));
  parent.add(box(w, h, 0.04, GLASS, x, midY, z + n * 0.1, "interior-window", {}, { transparent: true, opacity: 0.45 }));
  parent.add(box(w + 0.3, 0.07, 0.16, WOOD, x, sill - 0.02, z + n * 0.1, "interior-trim"));
  const sh = h * 0.9;
  parent.add(box(0.2, sh, 0.05, SHUTTER, x - w / 2 - 0.14, midY, z + n * 0.13, "interior-window"));
  parent.add(box(0.2, sh, 0.05, SHUTTER, x + w / 2 + 0.14, midY, z + n * 0.13, "interior-window"));
}

function dressWindowX(parent, z, x, sill, head, w, inward) {
  const h = head - sill;
  const midY = (sill + head) / 2;
  const n = inward;
  parent.add(box(0.07, h + 0.18, w + 0.18, FRAME, x + n * 0.07, midY, z, "interior-window"));
  parent.add(box(0.04, h, w, GLASS, x + n * 0.1, midY, z, "interior-window", {}, { transparent: true, opacity: 0.45 }));
  parent.add(box(0.16, 0.07, w + 0.3, WOOD, x + n * 0.1, sill - 0.02, z, "interior-trim"));
  const sh = h * 0.9;
  parent.add(box(0.05, sh, 0.2, SHUTTER, x + n * 0.13, midY, z - w / 2 - 0.14, "interior-window"));
  parent.add(box(0.05, sh, 0.2, SHUTTER, x + n * 0.13, midY, z + w / 2 + 0.14, "interior-window"));
}

function paperPlaque(x, y, z) {
  const g = new THREE.Group();
  g.name = "paper-plaque";
  g.userData.kind = "interior-paper";
  g.userData.mode = "PAPER";
  g.add(box(1.55, 0.5, 0.05, WOOD, x, y, z, "interior-paper", { mode: "PAPER" }));
  const card = box(1.38, 0.36, 0.04, PAPER_CARD, x, y, z + 0.03, "interior-paper");
  card.userData.mode = "PAPER";
  g.add(card);
  return g;
}

function makeTable(x, z) {
  const g = new THREE.Group();
  g.name = "table";
  g.userData.kind = "interior-table";
  g.userData.mode = "PAPER";
  g.position.set(x, 0, z);
  const y0 = 0.16;
  const topY = y0 + 0.72;
  const paper = { mode: "PAPER" };
  g.add(box(1.7, 0.07, 1.05, WOOD_TOP, 0, topY, 0, "interior-table", paper));
  g.add(box(1.58, 0.04, 0.93, PAPER_CARD, 0, topY + 0.055, 0, "interior-table", paper));
  g.add(box(1.52, 0.08, 0.08, WOOD, 0, topY - 0.08, 0.44, "interior-prop", paper));
  g.add(box(1.52, 0.08, 0.08, WOOD, 0, topY - 0.08, -0.44, "interior-prop", paper));
  const legH = 0.68;
  for (const [dx, dz] of [
    [-0.74, -0.42],
    [0.74, -0.42],
    [-0.74, 0.42],
    [0.74, 0.42],
  ]) {
    g.add(box(0.08, legH, 0.08, WOOD, dx, y0 + legH / 2, dz, "interior-prop", paper));
  }
  return g;
}

function makeChair(x, z, yaw) {
  const g = new THREE.Group();
  g.name = "chair";
  g.userData.kind = "interior-chair";
  g.userData.mode = "PAPER";
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  const y0 = 0.16;
  const seat = y0 + 0.44;
  const paper = { mode: "PAPER" };
  g.add(box(0.46, 0.06, 0.46, PAPER_CARD, 0, seat, 0, "interior-chair", paper));
  g.add(box(0.48, 0.05, 0.48, WOOD_TOP, 0, seat - 0.05, 0, "interior-prop", paper));
  for (const [dx, dz] of [
    [-0.18, -0.18],
    [0.18, -0.18],
    [-0.18, 0.18],
    [0.18, 0.18],
  ]) {
    g.add(box(0.07, seat - y0, 0.07, WOOD, dx, y0 + (seat - y0) / 2, dz, "interior-prop", paper));
  }
  g.add(box(0.44, 0.52, 0.07, WOOD, 0, seat + 0.28, -0.2, "interior-prop", paper));
  return g;
}

/** Small kraft paper hanging lamp — wood stem, cream shade, warm glow. */
function makeHangingLamp(x, y, z) {
  const g = new THREE.Group();
  g.name = "lamp";
  g.userData.kind = "interior-lamp";
  g.userData.mode = "PAPER";
  g.position.set(x, y, z);
  const paper = { mode: "PAPER" };
  g.add(box(0.03, 0.36, 0.03, WOOD, 0, 0.26, 0, "interior-prop", paper));
  g.add(box(0.1, 0.04, 0.1, WOOD_TOP, 0, 0.07, 0, "interior-prop", paper));
  g.add(
    box(0.36, 0.14, 0.36, PAPER_CARD, 0, 0, 0, "interior-prop", paper, {
      emissive: SHADE,
      emissiveIntensity: 0.48,
    }),
  );
  g.add(
    box(0.08, 0.06, 0.08, 0xfff1d0, 0, -0.1, 0, "interior-prop", paper, {
      emissive: 0xfff1d0,
      emissiveIntensity: 0.55,
    }),
  );
  return g;
}

function makeTableLamp(x, y, z) {
  const g = new THREE.Group();
  g.name = "lamp";
  g.userData.kind = "interior-lamp";
  g.add(box(0.18, 0.04, 0.18, WOOD, x, y, z, "interior-prop"));
  g.add(box(0.05, 0.28, 0.05, BRASS, x, y + 0.16, z, "interior-prop"));
  g.add(box(0.28, 0.16, 0.28, SHADE, x, y + 0.36, z, "interior-prop"));
  return g;
}

/** Small kraft framed picture — wood frame, cream card. Not a plaque. */
function makeFramedPicture(x, y, z) {
  const g = new THREE.Group();
  g.name = "picture";
  g.userData.kind = "interior-picture";
  g.userData.mode = "PAPER";
  g.position.set(x, y, z);
  const paper = { mode: "PAPER" };
  g.add(box(0.72, 0.54, 0.05, WOOD, 0, 0, 0, "interior-picture", paper));
  g.add(box(0.58, 0.4, 0.04, PAPER_CARD, 0, 0, 0.03, "interior-picture", paper));
  g.add(box(0.5, 0.06, 0.02, WOOD, 0, -0.06, 0.055, "interior-picture", paper));
  g.add(box(0.18, 0.1, 0.02, WOOD, -0.1, 0.02, 0.055, "interior-picture", paper));
  return g;
}

/** Small kraft PAPER stool — cream seat, three wood box legs. Not a chair. */
function makeStool(x, z) {
  const g = new THREE.Group();
  g.name = "stool";
  g.userData.kind = "interior-stool";
  g.userData.mode = "PAPER";
  g.position.set(x, 0, z);
  const y0 = 0.16;
  const seatY = y0 + 0.34;
  const paper = { mode: "PAPER" };
  g.add(box(0.3, 0.05, 0.3, WOOD_TOP, 0, seatY, 0, "interior-stool", paper));
  const legH = seatY - y0;
  for (const [dx, dz] of [
    [0, -0.1],
    [-0.09, 0.06],
    [0.09, 0.06],
  ]) {
    g.add(box(0.05, legH, 0.05, WOOD, dx, y0 + legH / 2, dz, "interior-stool", paper));
  }
  return g;
}

/** Small kraft PAPER mug on the table — cream card body, wood foot, rim, handle. */
function makeMug(x, y, z) {
  const g = new THREE.Group();
  g.name = "mug";
  g.userData.kind = "interior-mug";
  g.userData.mode = "PAPER";
  g.position.set(x, y, z);
  const paper = { mode: "PAPER" };
  g.add(cyl(0.032, 0.036, 0.018, WOOD, 0, 0.009, 0, "interior-mug", paper));
  g.add(cyl(0.038, 0.044, 0.08, PLASTER, 0, 0.058, 0, "interior-mug", paper));
  g.add(cyl(0.04, 0.036, 0.016, WOOD_TOP, 0, 0.106, 0, "interior-mug", paper));
  g.add(box(0.014, 0.048, 0.014, WOOD, 0.05, 0.06, 0, "interior-mug", paper));
  g.add(box(0.028, 0.014, 0.014, WOOD, 0.036, 0.082, 0, "interior-mug", paper));
  g.add(box(0.028, 0.014, 0.014, WOOD, 0.036, 0.038, 0, "interior-mug", paper));
  return g;
}

/** Small kraft PAPER napkin on the table — folded PAPER_CARD / LINEN / PLASTER boxes. */
function makeNapkin(x, y, z) {
  const g = new THREE.Group();
  g.name = "napkin";
  g.userData.kind = "interior-napkin";
  g.userData.mode = "PAPER";
  g.position.set(x, y, z);
  const paper = { mode: "PAPER" };
  g.add(box(0.15, 0.008, 0.15, LINEN, 0, 0.004, 0, "interior-napkin", paper));
  const fold = box(0.13, 0.008, 0.13, PAPER_CARD, 0.006, 0.012, 0.004, "interior-napkin", paper);
  fold.rotation.y = Math.PI / 8;
  g.add(fold);
  g.add(box(0.09, 0.008, 0.11, PLASTER, 0.01, 0.02, 0.002, "interior-napkin", paper));
  return g;
}

/** Small kraft PAPER spoon on the table — wood handle, plaster bowl. Boxes only. */
function makeSpoon(x, y, z) {
  const g = new THREE.Group();
  g.name = "spoon";
  g.userData.kind = "interior-spoon";
  g.userData.mode = "PAPER";
  g.userData.part = "spoon";
  g.position.set(x, y, z);
  const paper = { mode: "PAPER", part: "spoon" };
  g.add(box(0.012, 0.008, 0.09, WOOD, 0, 0.006, 0.028, "interior-spoon", paper));
  g.add(box(0.016, 0.007, 0.018, WOOD, 0, 0.007, -0.022, "interior-spoon", paper));
  g.add(box(0.032, 0.01, 0.03, PLASTER, 0, 0.008, -0.048, "interior-spoon", paper));
  return g;
}

/** Small kraft PAPER fork on the table — wood handle, linen neck, plaster tines. Boxes only. */
function makeFork(x, y, z) {
  const g = new THREE.Group();
  g.name = "fork";
  g.userData.kind = "interior-fork";
  g.userData.mode = "PAPER";
  g.userData.part = "fork";
  g.position.set(x, y, z);
  const paper = { mode: "PAPER", part: "fork" };
  g.add(box(0.012, 0.008, 0.09, WOOD, 0, 0.006, 0.028, "interior-fork", paper));
  g.add(box(0.018, 0.007, 0.016, LINEN, 0, 0.007, -0.022, "interior-fork", paper));
  g.add(box(0.006, 0.008, 0.034, PLASTER, -0.01, 0.008, -0.048, "interior-fork", paper));
  g.add(box(0.006, 0.008, 0.034, PLASTER, 0, 0.008, -0.048, "interior-fork", paper));
  g.add(box(0.006, 0.008, 0.034, PLASTER, 0.01, 0.008, -0.048, "interior-fork", paper));
  return g;
}

/** Small kraft PAPER book on the table — wood covers, cream/plaster pages. */
function makeBook(x, y, z) {
  const g = new THREE.Group();
  g.name = "book";
  g.userData.kind = "interior-book";
  g.userData.mode = "PAPER";
  g.position.set(x, y, z);
  const paper = { mode: "PAPER" };
  g.add(box(0.22, 0.012, 0.16, WOOD, 0, 0.006, 0, "interior-book", paper));
  g.add(box(0.2, 0.028, 0.145, PAPER_CARD, 0.004, 0.026, 0, "interior-book", paper));
  g.add(box(0.19, 0.012, 0.138, PLASTER, 0.006, 0.032, 0, "interior-book", paper));
  g.add(box(0.22, 0.012, 0.16, WOOD, 0, 0.046, 0, "interior-book", paper));
  g.add(box(0.018, 0.046, 0.16, WOOD, -0.11, 0.026, 0, "interior-book", paper));
  return g;
}

/** Small kraft PAPER vase / jug on the table — cream body, wood foot and rim. */
function makeVase(x, y, z) {
  const g = new THREE.Group();
  g.name = "vase";
  g.userData.kind = "interior-vase";
  g.userData.mode = "PAPER";
  g.position.set(x, y, z);
  const paper = { mode: "PAPER" };
  g.add(cyl(0.045, 0.05, 0.03, WOOD, 0, 0.015, 0, "interior-vase", paper));
  g.add(cyl(0.055, 0.07, 0.16, PLASTER, 0, 0.11, 0, "interior-vase", paper));
  g.add(cyl(0.04, 0.055, 0.04, PLASTER_SIDE, 0, 0.21, 0, "interior-vase", paper));
  g.add(cyl(0.042, 0.038, 0.025, WOOD_TOP, 0, 0.242, 0, "interior-vase", paper));
  g.add(box(0.02, 0.1, 0.02, WOOD, 0.07, 0.14, 0, "interior-vase", paper));
  g.add(box(0.04, 0.02, 0.02, WOOD, 0.05, 0.19, 0, "interior-vase", paper));
  g.add(box(0.04, 0.02, 0.02, WOOD, 0.05, 0.09, 0, "interior-vase", paper));
  return g;
}

/** Small kraft paper wall clock — wood rim, cream face, wood hands. Not a till. */
function makeWallClock(x, y, z) {
  const g = new THREE.Group();
  g.name = "clock";
  g.userData.kind = "interior-clock";
  g.userData.mode = "PAPER";
  g.position.set(x, y, z);
  const paper = { mode: "PAPER" };
  const rim = box(0.38, 0.38, 0.05, WOOD, 0, 0, 0, "interior-clock", paper);
  g.add(rim);
  const rimTurn = box(0.38, 0.38, 0.05, WOOD, 0, 0, 0, "interior-clock", paper);
  rimTurn.rotation.z = Math.PI / 4;
  g.add(rimTurn);
  const face = box(0.3, 0.3, 0.04, PAPER_CARD, 0, 0, 0.03, "interior-clock", paper);
  g.add(face);
  const faceTurn = box(0.3, 0.3, 0.04, PAPER_CARD, 0, 0, 0.03, "interior-clock", paper);
  faceTurn.rotation.z = Math.PI / 4;
  g.add(faceTurn);
  g.add(box(0.03, 0.11, 0.02, WOOD, 0.015, 0.035, 0.055, "interior-prop", paper));
  g.add(box(0.022, 0.14, 0.02, WOOD, -0.012, 0.05, 0.058, "interior-prop", paper));
  g.add(box(0.045, 0.045, 0.03, WOOD, 0, 0, 0.062, "interior-prop", paper));
  return g;
}

function makeBed(cx, floorY, cz) {
  const g = new THREE.Group();
  g.name = "bed";
  g.userData.kind = "interior-bed";
  g.add(box(2.15, 0.28, 1.28, WOOD, cx, floorY + 0.22, cz, "interior-prop"));
  g.add(box(2.02, 0.16, 1.16, LINEN, cx, floorY + 0.42, cz, "interior-prop"));
  g.add(box(1.42, 0.08, 1.14, CORAL, cx + 0.24, floorY + 0.52, cz, "interior-prop"));
  g.add(box(0.36, 0.14, 0.5, LINEN, cx - 0.78, floorY + 0.54, cz - 0.28, "interior-prop"));
  g.add(box(0.36, 0.14, 0.5, LINEN, cx - 0.78, floorY + 0.54, cz + 0.28, "interior-prop"));
  // Kraft pillow on the linen — original PAPER_CARD, so the bed is not only wood + coral.
  g.add(box(0.3, 0.1, 0.4, PAPER_CARD, cx - 0.7, floorY + 0.66, cz, "interior-prop"));
  g.add(box(0.1, 0.88, 1.32, WOOD, cx - 1.12, floorY + 0.58, cz, "interior-prop"));
  g.add(box(0.08, 0.98, 0.08, WOOD, cx - 1.12, floorY + 0.62, cz - 0.6, "interior-prop"));
  g.add(box(0.08, 0.98, 0.08, WOOD, cx - 1.12, floorY + 0.62, cz + 0.6, "interior-prop"));
  return g;
}

/**
 * PAPER Caribbean house: plaster walls, wood floors, window openings,
 * downstairs table/chairs/stool/lamp/clock/picture/vase/mug/book/napkin/spoon/fork, upstairs bed. Low-poly boxes only.
 */
export function makeInteriorScene() {
  const group = new THREE.Group();
  group.name = "interior";
  group.userData.kind = "interior";
  group.userData.mode = "PAPER";
  group.userData.provenance = "SIMULATED";

  const X0 = -4.1;
  const X1 = 4.1;
  const Z0 = -3.6;
  const Z1 = 3.6;
  const Y0 = 0.16;
  const Y1 = 2.78;
  const U0 = 2.86;
  const U1 = 5.06;

  const downWins = [
    { along: -2.05, width: 1.15, sill: 0.9, head: 2.05 },
    { along: 1.15, width: 1.15, sill: 0.9, head: 2.05 },
  ];
  const downSideWin = [{ along: 0.15, width: 1.1, sill: 0.9, head: 2.05 }];
  const downRightWin = [{ along: 1.85, width: 0.95, sill: 1.15, head: 2.05 }];
  const doorOpen = [{ along: 0, width: 1.2, sill: Y0, head: 2.18 }];

  const down = new THREE.Group();
  down.name = "downstairs";
  down.userData.kind = "downstairs";
  down.add(box(8.2, 0.16, 7.2, WOOD_FLOOR, 0, 0.08, 0, "interior-floor", { level: "downstairs" }));
  down.add(box(8.0, 0.1, 0.08, WOOD, 0, 0.21, Z0 + 0.12, "interior-trim"));
  down.add(box(8.0, 0.1, 0.08, WOOD, 0, 0.21, Z1 - 0.12, "interior-trim"));
  down.add(box(0.08, 0.1, 6.9, WOOD, X0 + 0.12, 0.21, 0, "interior-trim"));
  down.add(box(0.08, 0.1, 6.9, WOOD, X1 - 0.12, 0.21, 0, "interior-trim"));

  addWallZ(down, { z: -3.52, x0: X0, x1: X1, y0: Y0, y1: Y1, thick: 0.16, color: PLASTER, openings: downWins, kind: "interior-wall" });
  addWallZ(down, { z: 3.52, x0: X0, x1: X1, y0: Y0, y1: Y1, thick: 0.16, color: PLASTER, openings: doorOpen, kind: "interior-wall" });
  addWallX(down, { x: X0, z0: Z0, z1: Z1, y0: Y0, y1: Y1, thick: 0.16, color: PLASTER_SIDE, openings: downSideWin, kind: "interior-wall" });
  addWallX(down, { x: X1, z0: Z0, z1: Z1, y0: Y0, y1: Y1, thick: 0.16, color: PLASTER_SIDE, openings: downRightWin, kind: "interior-wall" });

  for (const w of downWins) dressWindowZ(down, w.along, -3.52, w.sill, w.head, w.width, +1);
  dressWindowX(down, downSideWin[0].along, X0, downSideWin[0].sill, downSideWin[0].head, downSideWin[0].width, +1);
  dressWindowX(down, downRightWin[0].along, X1, downRightWin[0].sill, downRightWin[0].head, downRightWin[0].width, -1);

  // Kraft card + terracotta face under the table — original PAPER_CARD / RUG.
  down.add(box(2.55, 0.03, 1.85, PAPER_CARD, -0.15, 0.175, -0.35, "interior-prop"));
  down.add(box(2.28, 0.03, 1.58, RUG, -0.15, 0.195, -0.35, "interior-prop"));
  down.add(makeTable(-0.15, -0.35));
  // Kraft PAPER vase on the table top — offset so chairs still read around it.
  down.add(makeVase(0.4, 0.955, -0.18));
  // Kraft PAPER mug on the table top — offset from the vase so both read.
  down.add(makeMug(-0.58, 0.955, -0.52));
  // Kraft PAPER book on the table top — offset from the mug and vase.
  down.add(makeBook(-0.05, 0.955, 0.08));
  // Kraft PAPER napkin on the table top — offset from the mug, vase, and book.
  down.add(makeNapkin(0.22, 0.955, -0.68));
  // Kraft PAPER spoon on the table top — offset from mug, vase, book, napkin.
  down.add(makeSpoon(-0.62, 0.955, -0.12));
  // Kraft PAPER fork on the table top — offset from mug, vase, book, napkin, spoon.
  down.add(makeFork(0.58, 0.955, -0.48));
  down.add(makeChair(-0.15, 0.55, 0));
  down.add(makeChair(-0.15, -1.22, Math.PI));
  down.add(makeChair(-1.28, -0.35, Math.PI / 2));
  // Kraft PAPER stool on the open +x side of the table — not upstairs.
  down.add(makeStool(1.02, -0.08));
  down.add(makeHangingLamp(-0.15, 2.12, -0.35));
  // Kraft wall clock on the back wall, right of the windows — not a shop till.
  down.add(makeWallClock(2.72, 1.78, -3.38));
  // Kraft framed picture on the back wall, left of the windows — not a plaque.
  down.add(makeFramedPicture(-3.25, 1.72, -3.38));

  down.add(box(1.35, 0.72, 0.38, WOOD, -3.35, 0.52, -2.55, "interior-prop"));
  down.add(box(1.28, 0.06, 0.36, WOOD_TOP, -3.35, 0.9, -2.55, "interior-prop"));

  down.add(box(0.12, 2.12, 0.14, WOOD, -0.66, 1.22, 3.52, "interior-trim"));
  down.add(box(0.12, 2.12, 0.14, WOOD, 0.66, 1.22, 3.52, "interior-trim"));
  down.add(box(1.44, 0.12, 0.14, WOOD, 0, 2.22, 3.52, "interior-trim"));
  const door = box(1.15, 2.05, 0.1, DOOR, 0, 1.1, 3.58, "exit");
  const handle = box(0.08, 0.08, 0.12, BRASS, 0.42, 0.05, 0.08, "exit");
  door.add(handle);
  down.add(door);
  down.add(paperPlaque(-2.15, 1.72, 3.42));

  for (const x of [-2.5, -0.4, 1.4]) {
    down.add(box(0.12, 0.1, 6.6, WOOD, x, 2.68, 0, "interior-trim"));
  }
  group.add(down);

  const stairs = new THREE.Group();
  stairs.name = "stairs";
  stairs.userData.kind = "stairs";
  stairs.add(box(0.1, 2.5, 3.15, WOOD, 2.44, 1.32, -1.05, "stairs"));
  stairs.add(box(0.12, 1.02, 0.12, WOOD, 2.48, 0.67, -2.18, "stairs"));
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const y = 0.18 + t * 2.55;
    const z = -2.35 + i * 0.38;
    stairs.add(
      box(1.35, 0.18, 0.42, 0x9a7a52, 3.15, y, z, "stairs", {
        level: t < 0.5 ? "downstairs" : "upstairs",
      }),
    );
    stairs.add(box(0.06, 0.82, 0.06, WOOD, 2.5, y + 0.52, z, "stairs"));
  }
  const rail = box(0.07, 0.07, 3.35, WOOD, 2.5, 1.58, -1.02, "stairs");
  rail.rotation.x = -Math.atan2(2.55, 2.66);
  stairs.add(rail);
  group.add(stairs);

  const upWinsBack = [
    { along: -2.05, width: 1.1, sill: 3.55, head: 4.55 },
    { along: 0.85, width: 1.1, sill: 3.55, head: 4.55 },
  ];
  const upWinLeft = [{ along: -0.2, width: 1.05, sill: 3.55, head: 4.55 }];
  const upWinFront = [{ along: -2.4, width: 1.05, sill: 3.55, head: 4.55 }];

  const up = new THREE.Group();
  up.name = "upstairs";
  up.userData.kind = "upstairs";
  up.add(box(6.55, 0.16, 7.2, WOOD_FLOOR_UP, -0.825, 2.78, 0, "interior-floor", { level: "upstairs" }));
  up.add(box(1.65, 0.16, 3.05, WOOD_FLOOR_UP, 3.275, 2.78, 2.075, "interior-floor", { level: "upstairs" }));
  up.add(box(1.65, 0.16, 1.05, WOOD_FLOOR_UP, 3.275, 2.78, -3.075, "interior-floor", { level: "upstairs" }));

  addWallZ(up, { z: -3.52, x0: X0, x1: X1, y0: U0, y1: U1, thick: 0.16, color: PLASTER, openings: upWinsBack, kind: "interior-wall" });
  addWallZ(up, { z: 3.52, x0: X0, x1: X1, y0: U0, y1: U1, thick: 0.16, color: PLASTER, openings: upWinFront, kind: "interior-wall" });
  addWallX(up, { x: X0, z0: Z0, z1: Z1, y0: U0, y1: U1, thick: 0.16, color: PLASTER_SIDE, openings: upWinLeft, kind: "interior-wall" });
  addWallX(up, { x: X1, z0: Z0, z1: Z1, y0: U0, y1: U1, thick: 0.16, color: PLASTER_SIDE, openings: [], kind: "interior-wall" });

  for (const w of upWinsBack) dressWindowZ(up, w.along, -3.52, w.sill, w.head, w.width, +1);
  dressWindowZ(up, upWinFront[0].along, 3.52, upWinFront[0].sill, upWinFront[0].head, upWinFront[0].width, -1);
  dressWindowX(up, upWinLeft[0].along, X0, upWinLeft[0].sill, upWinLeft[0].head, upWinLeft[0].width, +1);

  up.add(makeBed(-1.55, U0, -1.85));
  up.add(box(0.48, 0.42, 0.42, WOOD, -0.22, U0 + 0.21, -1.85, "interior-prop"));
  up.add(makeTableLamp(-0.22, U0 + 0.44, -1.85));
  up.add(box(1.15, 0.04, 1.55, RUG, -1.55, U0 + 0.02, -0.55, "interior-prop"));
  up.add(paperPlaque(1.55, 4.15, 3.42));
  group.add(up);

  const lamp = new THREE.PointLight(0xfff1d0, 1.65, 18, 2);
  lamp.position.set(-0.15, 2.22, -0.35);
  group.add(lamp);

  group.visible = false;
  return group;
}

/**
 * Reparent harbour meshes into a group so enter/exit can hide them
 * without deleting the world. Lights and `keep` stay on the scene.
 */
export function wrapHarbourWorld(scene, { keep = [] } = {}) {
  const harbour = new THREE.Group();
  harbour.name = "harbour";
  harbour.userData.kind = "harbour";
  const keepSet = new Set(keep);
  const moving = [];
  for (const child of scene.children) {
    if (keepSet.has(child)) continue;
    if (child.isLight) continue;
    if (child.userData?.kind === "interior") continue;
    moving.push(child);
  }
  for (const child of moving) harbour.add(child);
  scene.add(harbour);
  return harbour;
}

export function objectWithKind(obj, kind) {
  let o = obj;
  while (o) {
    if (o.userData?.kind === kind) return o;
    o = o.parent;
  }
  return null;
}

function clampRoom(x, z) {
  return {
    x: Math.max(-ROOM.hw, Math.min(ROOM.hw, x)),
    z: Math.max(-ROOM.hd, Math.min(ROOM.hd, z)),
  };
}

/**
 * Enter/exit controller. Hides `harbourGroup`; never removes it from the scene.
 */
export function createInterior({ scene, player, setStatus, heightAt, specOf }) {
  const group = makeInteriorScene();
  scene.add(group);

  let harbourGroup = null;
  let inside = false;
  let plot = null;
  let floor = "downstairs";
  let walking = false;
  const walkTarget = new THREE.Vector3();
  const camTmp = new THREE.Vector3();
  let savedFog = null;
  let savedBg = null;
  const hiddenExtras = [];

  function setHarbour(g) {
    harbourGroup = g;
  }

  function isInside() {
    return inside;
  }

  function currentFloor() {
    return floor;
  }

  function currentPlot() {
    return plot;
  }

  function placePlayer(level) {
    floor = level;
    const y = level === "upstairs" ? UPSTAIRS_Y : DOWNSTAIRS_Y;
    if (level === "upstairs") player.position.set(-1.2, y, -0.4);
    else player.position.set(0, y, 1.6);
    walking = false;
  }

  function enter(p) {
    if (!canEnter(p)) return false;
    plot = p;
    inside = true;
    if (harbourGroup) harbourGroup.visible = false;
    hiddenExtras.length = 0;
    for (const child of scene.children) {
      if (child === group || child === player) continue;
      if (child.isLight) continue;
      if (child === harbourGroup) continue;
      if (!child.visible) continue;
      child.visible = false;
      hiddenExtras.push(child);
    }
    group.visible = true;
    savedFog = scene.fog;
    savedBg = scene.background;
    scene.fog = null;
    scene.background = new THREE.Color(0x2c241c);
    placePlayer("downstairs");
    if (isFactoryPlot(p)) {
      undressWarehouse(scene);
      undressShop(scene);
      undressHouseShop(scene);
      dressFactory(scene);
      if (setStatus) setStatus("Inside factory (PAPER). Tap the door or Exit to leave.");
    } else if (isWarehousePlot(p)) {
      undressFactory(scene);
      undressShop(scene);
      undressHouseShop(scene);
      dressWarehouse(scene);
      if (setStatus) setStatus("Inside warehouse (PAPER). Tap the door or Exit to leave.");
    } else if (isHouseShopPlot(p)) {
      undressWarehouse(scene);
      undressFactory(scene);
      undressShop(scene);
      dressHouseShop(scene);
      if (setStatus) {
        setStatus("Inside house-shop (PAPER). Counter downstairs, living room at the back. Exit at the door.");
      }
    } else if (isShopPlot(p)) {
      undressWarehouse(scene);
      undressFactory(scene);
      undressHouseShop(scene);
      dressShop(scene);
      if (setStatus) setStatus("Inside shop (PAPER). Tap the door or Exit to leave.");
    } else {
      undressWarehouse(scene);
      undressFactory(scene);
      undressShop(scene);
      undressHouseShop(scene);
      if (setStatus) {
        setStatus("Inside downstairs (PAPER). Tap stairs for upstairs. Exit returns to your plot.");
      }
    }
    return true;
  }

  function exit() {
    if (!inside) return null;
    undressWarehouse(scene);
    undressFactory(scene);
    undressShop(scene);
    undressHouseShop(scene);
    const left = plot;
    inside = false;
    group.visible = false;
    if (harbourGroup) harbourGroup.visible = true;
    for (const child of hiddenExtras) child.visible = true;
    hiddenExtras.length = 0;
    if (savedFog !== null) scene.fog = savedFog;
    if (savedBg !== null) scene.background = savedBg;
    savedFog = null;
    savedBg = null;
    walking = false;
    if (left && player) {
      const spec = specOf ? specOf(left.island) : null;
      const y = heightAt && spec ? heightAt(spec, left.x, left.z) + 1.15 : left.y ?? 1.15;
      player.position.set(left.x, y, left.z);
    }
    plot = null;
    floor = "downstairs";
    if (setStatus) setStatus("Back at your plot (PAPER).");
    return left;
  }

  function goStairs() {
    if (floor === "downstairs") {
      placePlayer("upstairs");
      if (setStatus) setStatus("Upstairs (PAPER). Tap stairs to go down.");
    } else {
      placePlayer("downstairs");
      if (setStatus) setStatus("Downstairs (PAPER). Tap the door or Exit to leave.");
    }
  }

  function handleRay(raycaster) {
    if (!inside) return false;
    const hits = raycaster.intersectObjects(group.children, true);
    if (!hits.length) return true;
    const stair = hits.find((h) => objectWithKind(h.object, "stairs"));
    if (stair) {
      goStairs();
      return true;
    }
    const door = hits.find((h) => objectWithKind(h.object, "exit"));
    if (door) {
      exit();
      return true;
    }
    const floorHit = hits.find((h) => objectWithKind(h.object, "interior-floor"));
    if (floorHit) {
      const level = objectWithKind(floorHit.object, "interior-floor")?.userData.level || floor;
      const c = clampRoom(floorHit.point.x, floorHit.point.z);
      const y = level === "upstairs" ? UPSTAIRS_Y : DOWNSTAIRS_Y;
      floor = level;
      walkTarget.set(c.x, y, c.z);
      walking = true;
    }
    return true;
  }

  function tick(dt) {
    if (!inside || !walking) return;
    const dx = walkTarget.x - player.position.x;
    const dz = walkTarget.z - player.position.z;
    const dist = Math.hypot(dx, dz);
    const step = 8 * dt;
    if (dist <= step) {
      player.position.copy(walkTarget);
      walking = false;
    } else {
      player.position.x += (dx / dist) * step;
      player.position.z += (dz / dist) * step;
    }
  }

  function updateCamera(camera, dt) {
    if (!inside) return false;
    camTmp.set(player.position.x + 0.4, player.position.y + 3.1, player.position.z + 6.2);
    camera.position.lerp(camTmp, 1 - Math.pow(0.001, dt));
    camera.lookAt(player.position.x, player.position.y + 0.45, player.position.z);
    return true;
  }

  return {
    group,
    setHarbour,
    isInside,
    currentFloor,
    currentPlot,
    enter,
    exit,
    goStairs,
    handleRay,
    tick,
    updateCamera,
  };
}
