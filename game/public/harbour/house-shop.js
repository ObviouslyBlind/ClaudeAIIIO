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

/** Freestanding kraft cabinet — two planks of tins, readable from the door. */
function makeShelfBox(x, z, yaw) {
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
  const body = paperBox(w, h, d, WOOD, "house-shop-shelf");
  body.position.set(0, y0 + h / 2, 0);
  g.add(body);
  const back = paperBox(w - 0.06, h - 0.1, 0.06, WOOD_DARK, "house-shop-shelf");
  back.position.set(0, y0 + h / 2, -d / 2 + 0.05);
  g.add(back);
  const goods = [
    [CORAL, TIN, GREEN],
    [TEAL, LINEN, CORAL],
  ];
  for (let i = 0; i < 2; i++) {
    const y = y0 + 0.44 + i * 0.54;
    const plank = paperBox(w - 0.12, 0.05, d - 0.1, WOOD_TOP, "house-shop-shelf");
    plank.position.set(0, y, 0.04);
    g.add(plank);
    const row = goods[i];
    for (let k = 0; k < row.length; k++) {
      const t = k / (row.length - 1) - 0.5;
      const gh = 0.22 + (k % 2) * 0.08;
      const item = paperBox(0.2, gh, 0.16, row[k], "house-shop-goods");
      item.position.set(t * 0.62, y + gh / 2 + 0.04, 0.08);
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
  g.add(makeShelfBox(-0.78, -0.52, 0));
  g.add(makeShelfBox(0.78, -0.52, 0));
  g.add(makeShortShelf(-3.28, 0.45, Math.PI / 2));
  g.add(hangingLamp(0, 2.18, 0.48));
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
