import * as THREE from "three";

/**
 * PAPER farm-shed interior dress. Tools, grain sacks, kraft planter beds,
 * a small wood-post scarecrow at the back of the crop beds, a short wood
 * fence rail behind it, a small wood water trough beside the beds, a kraft
 * milk churn beside the trough, a short wood pail beside the churn, a small
 * kraft pitchfork leaning by the trough and pail, a small kraft PAPER egg
 * basket beside the trough, a small kraft PAPER grain scoop on the workbench,
 * a small kraft PAPER lantern on the workbench, a small kraft PAPER seed
 * packet on the workbench, a tiny kraft PAPER pail lid on the pail, a tiny
 * kraft PAPER mug on the workbench, a tiny kraft PAPER egg on the
 * workbench, a tiny kraft PAPER pail on the workbench, a tiny kraft PAPER
 * broom leaning by the workbench, a tiny kraft PAPER rake leaning by the
 * workbench, a tiny kraft PAPER hoe leaning by the workbench, a tiny
 * kraft PAPER sickle leaning by the workbench, a tiny
 * kraft PAPER scythe leaning by the workbench, a tiny
 * kraft PAPER ladle leaning by the workbench, a tiny
 * kraft PAPER spade leaning by the workbench, a tiny
 * kraft PAPER trowel leaning by the workbench, a tiny
 * kraft PAPER shears leaning by the workbench, and
 * dim warm light — not the
 * house living room, warehouse crates, shop, or factory.
 * No WASD. Tap-to-walk stays in interior.js.
 *
 * Call dressFarm(scene) when plot.kind or plot.use is "farm".
 * Idempotent: a second call only shows the existing dress.
 */

const WOOD = 0x7a5230;
const WOOD_DARK = 0x5a3a22;
const HANDLE = 0x8a6238;
const METAL = 0x6a6a62;
const SACK = 0xc4a878;
const SACK_DARK = 0xb09060;
const SACK_PALE = 0xd4bc90;
const SACK_TIE = 0x6a4a28;
const STRAW = 0xc8a848;
const STRAW_DARK = 0xa88838;
const FLOOR_DIM = 0x5a3a22;
const WALL_DIM = 0xb89058;
const WALL_SIDE_DIM = 0xa87a48;
const LAMP_METAL = 0x5a4030;
const LAMP_BULB = 0xffd090;
const PAPER_CARD = 0xf3efe4;
/** Same cream as cottage walls — PAPER kraft, not a new hex. */
const KRAFT = 0xf4ead8;
/** Outdoor farm crop greens from buildings.js. */
const LEAF = [0x5f8a32, 0x7a9a3a, 0x4e7a28];
const HOUSE_KINDS = new Set(["interior-table", "interior-chair", "interior-bed", "interior-lamp"]);
const FARM_LIGHT = 0.48;
const FARM_LAMP_HEX = 0xffc070;
const FARM_BG = 0x221810;
const SCENE_LIGHT_SCALE = 0.38;

export function isFarmPlot(plot) {
  if (!plot) return false;
  return plot.kind === "farm" || plot.use === "farm";
}

function paperBox(w, h, d, color, kind = "farm-prop") {
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

function paperCyl(rTop, rBot, h, color, kind = "farm-prop", segments = 8) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(rTop, rBot, h, segments),
    new THREE.MeshLambertMaterial({ color }),
  );
  m.castShadow = true;
  m.receiveShadow = true;
  m.userData.kind = kind;
  m.userData.mode = "PAPER";
  return m;
}

function sack(w, h, d, color, x, y, z, yaw = 0) {
  const g = new THREE.Group();
  g.name = "farm-sack";
  g.userData.kind = "farm-sack";
  g.userData.mode = "PAPER";
  g.position.set(x, y, z);
  g.rotation.y = yaw;
  const body = paperBox(w, h, d, color, "farm-sack");
  g.add(body);
  const cinch = paperBox(w * 0.58, 0.07, d * 0.58, SACK_TIE, "farm-sack");
  cinch.position.y = h / 2 + 0.01;
  g.add(cinch);
  const neck = paperBox(w * 0.44, 0.14, d * 0.44, color, "farm-sack");
  neck.position.y = h / 2 + 0.1;
  g.add(neck);
  return g;
}

function hayBale(w, h, d, x, y, z, yaw = 0) {
  const g = new THREE.Group();
  g.name = "farm-hay";
  g.userData.kind = "farm-hay";
  g.userData.mode = "PAPER";
  g.position.set(x, y, z);
  g.rotation.y = yaw;
  g.add(paperBox(w, h, d, STRAW, "farm-hay"));
  const band = paperBox(w + 0.04, 0.05, d + 0.04, STRAW_DARK, "farm-hay");
  band.position.y = h * 0.12 - h / 2;
  g.add(band);
  const band2 = paperBox(w + 0.04, 0.05, d + 0.04, STRAW_DARK, "farm-hay");
  band2.position.y = h * 0.38 - h / 2;
  g.add(band2);
  return g;
}

function pitchfork() {
  const g = new THREE.Group();
  g.userData.kind = "farm-tool";
  g.userData.mode = "PAPER";
  const handle = paperBox(0.05, 1.28, 0.05, HANDLE, "farm-tool");
  handle.position.y = 0.64;
  g.add(handle);
  const bar = paperBox(0.22, 0.03, 0.03, METAL, "farm-tool");
  bar.position.y = 1.3;
  g.add(bar);
  for (const dx of [-0.09, -0.03, 0.03, 0.09]) {
    const tine = paperBox(0.022, 0.28, 0.022, METAL, "farm-tool");
    tine.position.set(dx, 1.44, 0);
    g.add(tine);
  }
  return g;
}

function shovel() {
  const g = new THREE.Group();
  g.userData.kind = "farm-tool";
  g.userData.mode = "PAPER";
  const handle = paperBox(0.05, 1.18, 0.05, HANDLE, "farm-tool");
  handle.position.y = 0.59;
  g.add(handle);
  const neck = paperBox(0.06, 0.1, 0.04, METAL, "farm-tool");
  neck.position.y = 1.22;
  g.add(neck);
  const blade = paperBox(0.22, 0.28, 0.04, METAL, "farm-tool");
  blade.position.y = 1.4;
  g.add(blade);
  return g;
}

function rake() {
  const g = new THREE.Group();
  g.userData.kind = "farm-tool";
  g.userData.mode = "PAPER";
  const handle = paperBox(0.05, 1.22, 0.05, HANDLE, "farm-tool");
  handle.position.y = 0.61;
  g.add(handle);
  const head = paperBox(0.42, 0.04, 0.06, WOOD, "farm-tool");
  head.position.y = 1.24;
  g.add(head);
  for (const dx of [-0.16, -0.08, 0, 0.08, 0.16]) {
    const tooth = paperBox(0.03, 0.14, 0.03, WOOD_DARK, "farm-tool");
    tooth.position.set(dx, 1.16, 0.04);
    g.add(tooth);
  }
  return g;
}

function hoe() {
  const g = new THREE.Group();
  g.userData.kind = "farm-tool";
  g.userData.mode = "PAPER";
  const handle = paperBox(0.05, 1.2, 0.05, HANDLE, "farm-tool");
  handle.position.y = 0.6;
  g.add(handle);
  const blade = paperBox(0.26, 0.04, 0.16, METAL, "farm-tool");
  blade.position.y = 1.24;
  g.add(blade);
  return g;
}

function hangTool(tool, x, y, z) {
  tool.position.set(x, y, z);
  tool.rotation.x = 0.08;
  return tool;
}

function leanTool(tool, x, y, z, yaw) {
  tool.position.set(x, y, z);
  tool.rotation.y = yaw;
  tool.rotation.x = 0.32;
  return tool;
}

function hangingLantern(x, y, z) {
  const g = new THREE.Group();
  g.name = "farm-lamp";
  g.userData.kind = "farm-lamp";
  g.userData.mode = "PAPER";
  const stem = paperBox(0.04, 0.42, 0.04, LAMP_METAL, "farm-lamp");
  stem.position.set(x, y + 0.22, z);
  const cage = paperBox(0.22, 0.28, 0.22, LAMP_METAL, "farm-lamp");
  cage.position.set(x, y - 0.08, z);
  const bulb = paperBox(0.14, 0.16, 0.14, LAMP_BULB, "farm-lamp");
  bulb.position.set(x, y - 0.08, z);
  g.add(stem, cage, bulb);
  return g;
}

function paperMark(x, y, z) {
  const g = new THREE.Group();
  g.name = "farm-paper";
  g.userData.kind = "interior-paper";
  g.userData.mode = "PAPER";
  g.add(paperBox(0.72, 0.28, 0.03, WOOD_DARK, "interior-paper"));
  const card = paperBox(0.62, 0.2, 0.02, PAPER_CARD, "interior-paper");
  card.position.z = 0.03;
  g.add(card);
  g.position.set(x, y, z);
  return g;
}

function planterBed(len, wid, x, z, yaw = 0, seed = 0) {
  const g = new THREE.Group();
  g.name = "farm-planter";
  g.userData.kind = "farm-planter";
  g.userData.mode = "PAPER";
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  const y0 = 0.16;
  const h = 0.2;
  const body = paperBox(len, h, wid, KRAFT, "farm-planter");
  body.position.y = y0 + h / 2;
  g.add(body);
  const band = paperBox(len + 0.03, 0.04, wid + 0.03, WOOD_DARK, "farm-planter");
  band.position.y = y0 + 0.06;
  g.add(band);
  const soil = paperBox(len * 0.88, 0.06, wid * 0.72, SACK_TIE, "farm-planter");
  soil.position.y = y0 + h + 0.01;
  g.add(soil);
  const n = 4;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1) - 0.5;
    const cropH = 0.14 + ((i + seed) % 3) * 0.07;
    const crop = paperBox(0.18, cropH, wid * 0.38, LEAF[(i + seed) % 3], "farm-crop");
    crop.position.set(t * (len * 0.72), y0 + h + 0.04 + cropH / 2, (i + seed) % 2 ? 0.04 : -0.04);
    g.add(crop);
  }
  return g;
}

/**
 * Small PAPER scarecrow: wood post + kraft / terracotta cloth boxes.
 * Hexes already in this file (WOOD, KRAFT, WALL_SIDE_DIM, SACK, STRAW).
 * Stands at the back of the crop beds; centre aisle stays clear.
 */
function scarecrow() {
  const g = new THREE.Group();
  g.name = "farm-scarecrow";
  g.userData.kind = "farm-scarecrow";
  g.userData.mode = "PAPER";
  const y0 = 0.16;
  const post = paperBox(0.08, 1.18, 0.08, WOOD, "farm-scarecrow");
  post.position.y = y0 + 0.59;
  g.add(post);
  const bar = paperBox(0.07, 0.07, 0.56, WOOD_DARK, "farm-scarecrow");
  bar.position.y = y0 + 0.94;
  g.add(bar);
  const body = paperBox(0.14, 0.32, 0.26, WALL_SIDE_DIM, "farm-scarecrow");
  body.position.y = y0 + 0.78;
  g.add(body);
  const sleeveL = paperBox(0.1, 0.26, 0.1, KRAFT, "farm-scarecrow");
  sleeveL.position.set(0, y0 + 0.84, -0.26);
  g.add(sleeveL);
  const sleeveR = paperBox(0.1, 0.26, 0.1, KRAFT, "farm-scarecrow");
  sleeveR.position.set(0, y0 + 0.84, 0.26);
  g.add(sleeveR);
  const head = paperBox(0.16, 0.16, 0.14, SACK, "farm-scarecrow");
  head.position.y = y0 + 1.16;
  g.add(head);
  const brim = paperBox(0.26, 0.05, 0.26, STRAW, "farm-scarecrow");
  brim.position.y = y0 + 1.26;
  g.add(brim);
  return g;
}

/**
 * Short PAPER wood fence: three posts + one rail.
 * Hexes already in this file (WOOD, WOOD_DARK). Sits behind the scarecrow
 * as a back edge for the crop beds; centre aisle stays clear.
 */
function cropFence() {
  const g = new THREE.Group();
  g.name = "farm-fence";
  g.userData.kind = "farm-fence";
  g.userData.mode = "PAPER";
  const y0 = 0.16;
  const postH = 0.78;
  for (const dx of [-0.52, 0, 0.52]) {
    const post = paperBox(0.07, postH, 0.07, WOOD, "farm-fence");
    post.position.set(dx, y0 + postH / 2, 0);
    g.add(post);
  }
  const rail = paperBox(1.12, 0.06, 0.05, WOOD_DARK, "farm-fence");
  rail.position.set(0, y0 + 0.52, 0);
  g.add(rail);
  return g;
}

/**
 * Small PAPER wood water trough: box body, dark rim, metal water sheet.
 * Hexes already in this file (WOOD, WOOD_DARK, METAL). Sits beside the
 * crop beds on the wall side; centre aisle stays clear.
 */
function waterTrough() {
  const g = new THREE.Group();
  g.name = "farm-trough";
  g.userData.kind = "farm-trough";
  g.userData.mode = "PAPER";
  const y0 = 0.16;
  const len = 0.68;
  const wid = 0.26;
  const h = 0.16;
  const body = paperBox(len, h, wid, WOOD, "farm-trough");
  body.position.y = y0 + h / 2;
  g.add(body);
  const band = paperBox(len + 0.03, 0.04, wid + 0.03, WOOD_DARK, "farm-trough");
  band.position.y = y0 + h - 0.02;
  g.add(band);
  const water = paperBox(len * 0.78, 0.03, wid * 0.58, METAL, "farm-trough");
  water.position.y = y0 + h + 0.01;
  g.add(water);
  for (const [dx, dz] of [
    [-0.26, -0.08],
    [0.26, -0.08],
    [-0.26, 0.08],
    [0.26, 0.08],
  ]) {
    const leg = paperBox(0.05, 0.1, 0.05, WOOD_DARK, "farm-trough");
    leg.position.set(dx, y0 + 0.05, dz);
    g.add(leg);
  }
  return g;
}

/**
 * Small PAPER kraft milk churn / can: kraft cylinder, wood lid, metal hoops.
 * Hexes already in this file (KRAFT, WOOD, METAL). Sits beside the water
 * trough on the wall side; centre aisle stays clear.
 */
function milkChurn() {
  const g = new THREE.Group();
  g.name = "farm-churn";
  g.userData.kind = "farm-churn";
  g.userData.mode = "PAPER";
  const y0 = 0.16;
  const body = paperCyl(0.09, 0.1, 0.32, KRAFT, "farm-churn");
  body.position.y = y0 + 0.16;
  g.add(body);
  const hoopLo = paperCyl(0.105, 0.105, 0.03, METAL, "farm-churn");
  hoopLo.position.y = y0 + 0.08;
  g.add(hoopLo);
  const hoopHi = paperCyl(0.1, 0.1, 0.03, METAL, "farm-churn");
  hoopHi.position.y = y0 + 0.24;
  g.add(hoopHi);
  const lid = paperCyl(0.07, 0.08, 0.06, WOOD, "farm-churn");
  lid.position.y = y0 + 0.35;
  g.add(lid);
  const handle = paperBox(0.12, 0.03, 0.03, METAL, "farm-churn");
  handle.position.y = y0 + 0.4;
  g.add(handle);
  return g;
}

/**
 * Short PAPER wood pail: tapered bucket, kraft lip, dark hoop, thin handle.
 * Hexes already in this file (WOOD, WOOD_DARK, HANDLE, KRAFT). Sits beside
 * the milk churn on the wall side; does not intersect the trough water.
 */
function farmPail() {
  const g = new THREE.Group();
  g.name = "farm-pail";
  g.userData.kind = "farm-pail";
  g.userData.mode = "PAPER";
  const y0 = 0.16;
  const body = paperCyl(0.08, 0.09, 0.18, WOOD, "farm-pail");
  body.position.y = y0 + 0.09;
  g.add(body);
  const band = paperCyl(0.095, 0.095, 0.025, WOOD_DARK, "farm-pail");
  band.position.y = y0 + 0.05;
  g.add(band);
  const lip = paperCyl(0.07, 0.075, 0.035, KRAFT, "farm-pail");
  lip.position.y = y0 + 0.17;
  g.add(lip);
  const postL = paperBox(0.025, 0.12, 0.025, HANDLE, "farm-pail");
  postL.position.set(-0.07, y0 + 0.2, 0);
  g.add(postL);
  const postR = paperBox(0.025, 0.12, 0.025, HANDLE, "farm-pail");
  postR.position.set(0.07, y0 + 0.2, 0);
  g.add(postR);
  const hoop = paperBox(0.16, 0.025, 0.025, HANDLE, "farm-pail");
  hoop.position.set(0, y0 + 0.27, 0);
  g.add(hoop);
  return g;
}

/**
 * Small PAPER kraft pitchfork: wood shaft, dark collar, three metal tines.
 * Hexes already in this file (WOOD, WOOD_DARK, METAL). PAPER boxes only.
 * Leans by the trough and pail on the wall side; centre aisle stays clear.
 */
function farmFork() {
  const g = new THREE.Group();
  g.name = "farm-fork";
  g.userData.kind = "farm-fork";
  g.userData.mode = "PAPER";
  const y0 = 0.16;
  const shaft = paperBox(0.04, 0.88, 0.04, WOOD, "farm-fork");
  shaft.position.y = y0 + 0.44;
  g.add(shaft);
  const bar = paperBox(0.16, 0.03, 0.03, WOOD_DARK, "farm-fork");
  bar.position.y = y0 + 0.86;
  g.add(bar);
  for (const dx of [-0.06, 0, 0.06]) {
    const tine = paperBox(0.02, 0.2, 0.02, METAL, "farm-fork");
    tine.position.set(dx, y0 + 0.97, 0);
    g.add(tine);
  }
  return g;
}

/**
 * Small PAPER kraft egg basket: wood body, handle hoop, cream kraft eggs.
 * Hexes already in this file (WOOD, HANDLE, KRAFT). PAPER boxes only.
 * Sits beside the trough on the wall side, offset from the churn, pail,
 * and pitchfork; centre aisle stays clear.
 */
function farmBasket() {
  const g = new THREE.Group();
  g.name = "farm-basket";
  g.userData.kind = "farm-basket";
  g.userData.mode = "PAPER";
  const y0 = 0.16;
  const body = paperBox(0.22, 0.1, 0.16, WOOD, "farm-basket");
  body.position.y = y0 + 0.05;
  g.add(body);
  const rim = paperBox(0.24, 0.025, 0.18, HANDLE, "farm-basket");
  rim.position.y = y0 + 0.1;
  g.add(rim);
  const postL = paperBox(0.02, 0.1, 0.02, HANDLE, "farm-basket");
  postL.position.set(-0.07, y0 + 0.16, 0);
  g.add(postL);
  const postR = paperBox(0.02, 0.1, 0.02, HANDLE, "farm-basket");
  postR.position.set(0.07, y0 + 0.16, 0);
  g.add(postR);
  const hoop = paperBox(0.16, 0.02, 0.02, HANDLE, "farm-basket");
  hoop.position.set(0, y0 + 0.22, 0);
  g.add(hoop);
  const eggA = paperBox(0.055, 0.045, 0.045, KRAFT, "farm-basket");
  eggA.position.set(-0.04, y0 + 0.13, 0.02);
  g.add(eggA);
  const eggB = paperBox(0.05, 0.042, 0.042, KRAFT, "farm-basket");
  eggB.position.set(0.035, y0 + 0.125, -0.015);
  g.add(eggB);
  const eggC = paperBox(0.048, 0.04, 0.04, KRAFT, "farm-basket");
  eggC.position.set(0, y0 + 0.128, 0.03);
  g.add(eggC);
  return g;
}


/**
 * Small PAPER kraft grain scoop: wood handle, kraft bowl, dark rim.
 * Hexes already in this file (WOOD, KRAFT, WOOD_DARK). PAPER boxes only.
 * Sits on the farm workbench top; not on the trough, churn, pail, fork,
 * or basket.
 */
function farmScoop() {
  const g = new THREE.Group();
  g.name = "farm-scoop";
  g.userData.kind = "farm-scoop";
  g.userData.mode = "PAPER";
  const floor = paperBox(0.16, 0.025, 0.11, KRAFT, "farm-scoop");
  floor.position.y = 0.013;
  g.add(floor);
  const rim = paperBox(0.17, 0.03, 0.12, WOOD_DARK, "farm-scoop");
  rim.position.y = 0.04;
  g.add(rim);
  const back = paperBox(0.03, 0.07, 0.11, WOOD_DARK, "farm-scoop");
  back.position.set(-0.07, 0.04, 0);
  g.add(back);
  const handle = paperBox(0.16, 0.03, 0.03, WOOD, "farm-scoop");
  handle.position.set(-0.16, 0.05, 0);
  g.add(handle);
  return g;
}

/**
 * Small PAPER kraft lantern: wood frame, warm bulb glass.
 * Hexes already in this file (WOOD, LAMP_BULB). PAPER boxes only.
 * Sits on the farm workbench top; not the hanging farm-lamp, scoop,
 * trough, churn, pail, fork, or basket.
 */
function farmLantern() {
  const g = new THREE.Group();
  g.name = "farm-lantern";
  g.userData.kind = "farm-lantern";
  g.userData.mode = "PAPER";
  const base = paperBox(0.12, 0.03, 0.12, WOOD, "farm-lantern");
  base.position.y = 0.015;
  g.add(base);
  const glass = paperBox(0.09, 0.11, 0.09, LAMP_BULB, "farm-lantern");
  glass.position.y = 0.085;
  g.add(glass);
  const hood = paperBox(0.13, 0.03, 0.13, WOOD, "farm-lantern");
  hood.position.y = 0.155;
  g.add(hood);
  const bail = paperBox(0.08, 0.02, 0.02, WOOD, "farm-lantern");
  bail.position.y = 0.185;
  g.add(bail);
  return g;
}

/**
 * Tiny PAPER kraft seed packet: kraft envelope, wood flap, warm seed mark.
 * Hexes already in this file (WOOD, LAMP_BULB, KRAFT). PAPER boxes only.
 * Sits on the farm workbench top; not the lantern, scoop, trough, churn,
 * pail, fork, or basket.
 */
function farmSeed() {
  const g = new THREE.Group();
  g.name = "farm-seed";
  g.userData.kind = "farm-seed";
  g.userData.part = "seed";
  g.userData.mode = "PAPER";
  const body = paperBox(0.07, 0.09, 0.018, KRAFT, "farm-seed");
  body.userData.part = "seed";
  body.position.y = 0.045;
  g.add(body);
  const flap = paperBox(0.07, 0.018, 0.022, WOOD, "farm-seed");
  flap.userData.part = "seed";
  flap.position.y = 0.096;
  g.add(flap);
  const mark = paperBox(0.028, 0.028, 0.012, LAMP_BULB, "farm-seed");
  mark.userData.part = "seed";
  mark.position.set(0, 0.04, 0.008);
  g.add(mark);
  return g;
}

/**
 * Tiny kraft PAPER pail lid: one small kraft box + a wood knob.
 * Hexes already in this file (KRAFT, WOOD). PAPER boxes only — no grey.
 * Sits on/beside the pail; offset from lantern, scoop, seed, basket, fork.
 */
function farmLid() {
  const g = new THREE.Group();
  g.name = "farm-lid";
  g.userData.kind = "farm-lid";
  g.userData.part = "lid";
  g.userData.mode = "PAPER";
  const disc = paperBox(0.11, 0.02, 0.11, KRAFT, "farm-lid");
  disc.userData.part = "lid";
  disc.position.y = 0.01;
  g.add(disc);
  const knob = paperBox(0.028, 0.022, 0.028, WOOD, "farm-lid");
  knob.userData.part = "lid";
  knob.position.y = 0.031;
  g.add(knob);
  return g;
}

/**
 * Tiny kraft PAPER mug: kraft cup + wood rim and handle.
 * Hexes already in this file (KRAFT, WOOD). PAPER boxes only — no grey.
 * Sits on the farm workbench top; offset from lid, seed, lantern, scoop,
 * basket, and fork.
 */
function farmMug() {
  const g = new THREE.Group();
  g.name = "farm-mug";
  g.userData.kind = "farm-mug";
  g.userData.part = "mug";
  g.userData.mode = "PAPER";
  const body = paperBox(0.06, 0.07, 0.06, KRAFT, "farm-mug");
  body.userData.part = "mug";
  body.position.y = 0.035;
  g.add(body);
  const rim = paperBox(0.068, 0.012, 0.068, WOOD, "farm-mug");
  rim.userData.part = "mug";
  rim.position.y = 0.074;
  g.add(rim);
  const handle = paperBox(0.018, 0.04, 0.018, WOOD, "farm-mug");
  handle.userData.part = "mug";
  handle.position.set(0.042, 0.038, 0);
  g.add(handle);
  return g;
}

/**
 * Tiny kraft PAPER egg: one kraft body + a smaller kraft tip.
 * Hexes already in this file (KRAFT). PAPER boxes only — no grey.
 * Sits on the farm workbench top; offset from mug, lid, seed, lantern,
 * scoop, basket, fork, and the tiny workbench pail.
 */
function farmEgg() {
  const g = new THREE.Group();
  g.name = "farm-egg";
  g.userData.kind = "farm-egg";
  g.userData.part = "egg";
  g.userData.mode = "PAPER";
  const body = paperBox(0.04, 0.046, 0.036, KRAFT, "farm-egg");
  body.userData.part = "egg";
  body.position.y = 0.023;
  g.add(body);
  const tip = paperBox(0.028, 0.018, 0.026, KRAFT, "farm-egg");
  tip.userData.part = "egg";
  tip.position.y = 0.054;
  g.add(tip);
  return g;
}

/**
 * Tiny kraft PAPER pail: kraft bucket, wood rim, thin wood bail.
 * Hexes already in this file (KRAFT, WOOD). PAPER boxes only — no grey.
 * Sits on the farm workbench top; offset from egg, mug, lid, seed, lantern,
 * scoop, basket, and fork. Not the floor wood farm-pail by the churn.
 */
function farmTablePail() {
  const g = new THREE.Group();
  g.name = "farm-table-pail";
  g.userData.kind = "farm-table-pail";
  g.userData.part = "pail";
  g.userData.mode = "PAPER";
  const body = paperBox(0.055, 0.06, 0.055, KRAFT, "farm-table-pail");
  body.userData.part = "pail";
  body.position.y = 0.03;
  g.add(body);
  const rim = paperBox(0.062, 0.012, 0.062, WOOD, "farm-table-pail");
  rim.userData.part = "pail";
  rim.position.y = 0.066;
  g.add(rim);
  const bail = paperBox(0.038, 0.012, 0.012, WOOD, "farm-table-pail");
  bail.userData.part = "pail";
  bail.position.y = 0.082;
  g.add(bail);
  return g;
}

/**
 * Tiny kraft PAPER broom: wood shaft, kraft bristle head.
 * Hexes already in this file (WOOD, KRAFT). PAPER boxes only — no grey.
 * Leans by the farm workbench; offset from seed, lid, mug, egg, pail,
 * lantern, scoop, and the floor trough cluster.
 */
function farmBroom() {
  const g = new THREE.Group();
  g.name = "farm-broom";
  g.userData.kind = "farm-broom";
  g.userData.part = "broom";
  g.userData.mode = "PAPER";
  const y0 = 0.16;
  const shaft = paperBox(0.022, 0.28, 0.022, WOOD, "farm-broom");
  shaft.userData.part = "broom";
  shaft.position.y = y0 + 0.14;
  g.add(shaft);
  const head = paperBox(0.08, 0.07, 0.036, KRAFT, "farm-broom");
  head.userData.part = "broom";
  head.position.y = y0 + 0.035;
  g.add(head);
  return g;
}

/**
 * Tiny kraft PAPER rake: wood shaft, kraft comb head.
 * Hexes already in this file (WOOD, KRAFT). PAPER boxes only — no grey.
 * Leans by the farm workbench; offset from broom, seed, lid, mug, egg, pail,
 * lantern, scoop, and the floor trough cluster. Not the hanging farm-tool rake.
 */
function farmRake() {
  const g = new THREE.Group();
  g.name = "farm-rake";
  g.userData.kind = "farm-rake";
  g.userData.part = "rake";
  g.userData.mode = "PAPER";
  const y0 = 0.16;
  const shaft = paperBox(0.022, 0.28, 0.022, WOOD, "farm-rake");
  shaft.userData.part = "rake";
  shaft.position.y = y0 + 0.14;
  g.add(shaft);
  const head = paperBox(0.09, 0.03, 0.036, KRAFT, "farm-rake");
  head.userData.part = "rake";
  head.position.y = y0 + 0.028;
  g.add(head);
  return g;
}

/**
 * Tiny kraft PAPER hoe: wood shaft, kraft chopping blade.
 * Hexes already in this file (WOOD, KRAFT). PAPER boxes only — no grey.
 * Leans by the farm workbench; offset from rake, broom, seed, lid, mug,
 * egg, pail, lantern, scoop, and the floor trough cluster. Not the
 * hanging farm-tool hoe by the sacks. Not the tiny kraft PAPER sickle
 * or scythe.
 */
function farmHoe() {
  const g = new THREE.Group();
  g.name = "farm-hoe";
  g.userData.kind = "farm-hoe";
  g.userData.part = "hoe";
  g.userData.mode = "PAPER";
  const y0 = 0.16;
  const shaft = paperBox(0.022, 0.28, 0.022, WOOD, "farm-hoe");
  shaft.userData.part = "hoe";
  shaft.position.y = y0 + 0.14;
  g.add(shaft);
  const blade = paperBox(0.08, 0.04, 0.05, KRAFT, "farm-hoe");
  blade.userData.part = "hoe";
  blade.position.y = y0 + 0.032;
  g.add(blade);
  return g;
}

/**
 * Tiny kraft PAPER sickle: wood shaft, kraft hooked blade.
 * Hexes already in this file (WOOD, KRAFT). PAPER boxes only — no grey.
 * Leans by the farm workbench; offset from hoe, rake, broom, seed, lid,
 * mug, egg, pail, lantern, scoop, and the floor trough cluster. Not the
 * hanging farm-tool hoe or rake. Not the tiny kraft PAPER scythe.
 */
function farmSickle() {
  const g = new THREE.Group();
  g.name = "farm-sickle";
  g.userData.kind = "farm-sickle";
  g.userData.part = "sickle";
  g.userData.mode = "PAPER";
  const y0 = 0.16;
  const shaft = paperBox(0.022, 0.26, 0.022, WOOD, "farm-sickle");
  shaft.userData.part = "sickle";
  shaft.position.y = y0 + 0.13;
  g.add(shaft);
  const blade = paperBox(0.07, 0.03, 0.04, KRAFT, "farm-sickle");
  blade.userData.part = "sickle";
  blade.position.set(0.03, y0 + 0.028, 0);
  g.add(blade);
  return g;
}

/**
 * Tiny kraft PAPER scythe: wood shaft, kraft long blade.
 * Hexes already in this file (WOOD, KRAFT). PAPER boxes only — no grey.
 * Leans by the farm workbench; offset from sickle, hoe, rake, broom, seed,
 * lid, mug, egg, pail, lantern, scoop, and the floor trough cluster. Not
 * the hanging farm-tool hoe or rake. Not the tiny kraft PAPER sickle
 * or ladle.
 */
function farmScythe() {
  const g = new THREE.Group();
  g.name = "farm-scythe";
  g.userData.kind = "farm-scythe";
  g.userData.part = "scythe";
  g.userData.mode = "PAPER";
  const y0 = 0.16;
  const shaft = paperBox(0.022, 0.26, 0.022, WOOD, "farm-scythe");
  shaft.userData.part = "scythe";
  shaft.position.y = y0 + 0.13;
  g.add(shaft);
  const blade = paperBox(0.09, 0.025, 0.035, KRAFT, "farm-scythe");
  blade.userData.part = "scythe";
  blade.position.set(0.035, y0 + 0.026, 0);
  g.add(blade);
  return g;
}

/**
 * Tiny kraft PAPER ladle: wood handle, kraft bowl.
 * Hexes already in this file (WOOD, KRAFT). PAPER boxes only — no grey.
 * Leans by the farm workbench; offset from scythe, sickle, hoe, rake,
 * broom, seed, lid, mug, egg, pail, lantern, scoop, and the floor
 * trough cluster. Not the hanging farm-tool hoe or rake. Not the tiny
 * kraft PAPER scythe, sickle, or spade.
 */
function farmLadle() {
  const g = new THREE.Group();
  g.name = "farm-ladle";
  g.userData.kind = "farm-ladle";
  g.userData.part = "ladle";
  g.userData.mode = "PAPER";
  const y0 = 0.16;
  const handle = paperBox(0.022, 0.22, 0.022, WOOD, "farm-ladle");
  handle.userData.part = "ladle";
  handle.position.y = y0 + 0.11;
  g.add(handle);
  const bowl = paperBox(0.06, 0.04, 0.05, KRAFT, "farm-ladle");
  bowl.userData.part = "ladle";
  bowl.position.set(0.02, y0 + 0.024, 0);
  g.add(bowl);
  return g;
}

/**
 * Tiny kraft PAPER spade: wood shaft, kraft blade.
 * Hexes already in this file (WOOD, KRAFT). PAPER boxes only — no grey.
 * Leans by the farm workbench; offset from ladle, scythe, sickle, hoe,
 * rake, broom, seed, lid, mug, egg, pail, lantern, scoop, and the floor
 * trough cluster. Not the hanging farm-tool shovel. Not the tiny
 * kraft PAPER ladle or scythe.
 */
function farmSpade() {
  const g = new THREE.Group();
  g.name = "farm-spade";
  g.userData.kind = "farm-spade";
  g.userData.part = "spade";
  g.userData.mode = "PAPER";
  const y0 = 0.16;
  const shaft = paperBox(0.022, 0.26, 0.022, WOOD, "farm-spade");
  shaft.userData.part = "spade";
  shaft.position.y = y0 + 0.13;
  g.add(shaft);
  const blade = paperBox(0.07, 0.05, 0.04, KRAFT, "farm-spade");
  blade.userData.part = "spade";
  blade.position.y = y0 + 0.03;
  g.add(blade);
  return g;
}

/**
 * Tiny kraft PAPER trowel: wood shaft, kraft blade.
 * Hexes already in this file (WOOD, KRAFT). PAPER boxes only — no grey.
 * Leans by the farm workbench; offset from spade, ladle, scythe, sickle,
 * hoe, rake, broom, seed, lid, mug, egg, pail, lantern, scoop, and the
 * hanging farm-tools. Not the hanging farm-tool shovel. Not the tiny
 * kraft PAPER spade or ladle.
 */
function farmTrowel() {
  const g = new THREE.Group();
  g.name = "farm-trowel";
  g.userData.kind = "farm-trowel";
  g.userData.part = "trowel";
  g.userData.mode = "PAPER";
  const y0 = 0.16;
  const shaft = paperBox(0.02, 0.2, 0.02, WOOD, "farm-trowel");
  shaft.userData.part = "trowel";
  shaft.position.y = y0 + 0.1;
  g.add(shaft);
  const blade = paperBox(0.06, 0.035, 0.045, KRAFT, "farm-trowel");
  blade.userData.part = "trowel";
  blade.position.y = y0 + 0.024;
  g.add(blade);
  return g;
}

/**
 * Tiny kraft PAPER shears: wood handles, kraft blades.
 * Hexes already in this file (WOOD, KRAFT). PAPER boxes only — no grey.
 * Leans by the farm workbench; offset from trowel, spade, ladle, scythe,
 * sickle, hoe, rake, broom, seed, lid, mug, egg, pail, lantern, scoop,
 * and the hanging farm-tools. Not the hanging farm-tool shovel. Not the
 * tiny kraft PAPER trowel or spade.
 */
function farmShears() {
  const g = new THREE.Group();
  g.name = "farm-shears";
  g.userData.kind = "farm-shears";
  g.userData.part = "shears";
  g.userData.mode = "PAPER";
  const y0 = 0.16;
  const handleL = paperBox(0.016, 0.11, 0.016, WOOD, "farm-shears");
  handleL.userData.part = "shears";
  handleL.position.set(-0.012, y0 + 0.09, 0);
  g.add(handleL);
  const handleR = paperBox(0.016, 0.11, 0.016, WOOD, "farm-shears");
  handleR.userData.part = "shears";
  handleR.position.set(0.012, y0 + 0.09, 0);
  g.add(handleR);
  const blades = paperBox(0.05, 0.08, 0.016, KRAFT, "farm-shears");
  blades.userData.part = "shears";
  blades.position.y = y0 + 0.03;
  g.add(blades);
  return g;
}

function workbench(x, z) {
  const g = new THREE.Group();
  g.name = "farm-bench";
  g.userData.kind = "farm-bench";
  g.userData.mode = "PAPER";
  const y0 = 0.16;
  const topY = y0 + 0.78;
  const top = paperBox(1.55, 0.08, 0.58, WOOD, "farm-bench");
  top.position.set(x, topY, z);
  g.add(top);
  for (const [dx, dz] of [
    [-0.68, -0.2],
    [0.68, -0.2],
    [-0.68, 0.2],
    [0.68, 0.2],
  ]) {
    const leg = paperBox(0.08, 0.74, 0.08, WOOD_DARK, "farm-bench");
    leg.position.set(x + dx, y0 + 0.37, z + dz);
    g.add(leg);
  }
  return g;
}

function makeFarmDress() {
  const g = new THREE.Group();
  g.name = "farm-dress";
  g.userData.kind = "farm-dress";
  g.userData.mode = "PAPER";
  g.userData.provenance = "SIMULATED";

  g.add(sack(0.48, 0.62, 0.38, SACK, -3.15, 0.47, -2.48, 0.12));
  g.add(sack(0.42, 0.55, 0.34, SACK_DARK, -2.62, 0.44, -2.52, -0.18));
  g.add(sack(0.4, 0.5, 0.32, SACK_PALE, -2.88, 1.02, -2.46, 0.08));
  g.add(sack(0.46, 0.58, 0.36, SACK, -3.28, 0.45, -1.15, 0.4));
  g.add(sack(0.44, 0.56, 0.34, SACK_DARK, -3.22, 0.44, 0.85, 0.22));
  g.add(sack(0.5, 0.64, 0.4, SACK, -3.18, 0.48, 2.15, -0.15));
  g.add(sack(0.42, 0.52, 0.34, SACK_PALE, -2.68, 0.42, 2.28, 0.2));
  g.add(sack(0.38, 0.48, 0.3, SACK, 1.35, 0.4, 0.22, 0.3));

  g.add(hayBale(0.95, 0.48, 0.55, -1.15, 0.4, -2.52, 0.06));
  g.add(hayBale(0.88, 0.45, 0.5, -0.22, 0.38, -2.48, -0.1));
  g.add(hayBale(0.82, 0.42, 0.48, -0.7, 0.85, -2.5, 0.08));
  g.add(hayBale(0.9, 0.46, 0.52, 1.55, 0.39, -2.42, 0.14));

  const rail = paperBox(1.85, 0.06, 0.06, WOOD_DARK, "farm-prop");
  rail.position.set(-2.45, 1.72, -3.32);
  g.add(rail);
  g.add(hangTool(rake(), -3.05, 0.55, -3.28));
  g.add(hangTool(pitchfork(), -2.45, 0.52, -3.28));
  g.add(hangTool(shovel(), -1.85, 0.58, -3.28));
  g.add(leanTool(hoe(), -3.35, 0.22, 1.45, 0.55));
  g.add(leanTool(pitchfork(), 1.85, 0.18, 2.05, -0.4));

  g.add(workbench(-3.28, -0.15));
  const bucket = paperBox(0.28, 0.32, 0.28, WOOD_DARK, "farm-prop");
  bucket.position.set(-2.45, 0.32, -0.05);
  g.add(bucket);

  g.add(planterBed(1.42, 0.44, 2.58, -1.48, Math.PI / 2, 0));
  g.add(planterBed(1.32, 0.42, 2.64, 0.12, Math.PI / 2, 1));
  g.add(planterBed(1.05, 0.4, 2.62, 1.18, Math.PI / 2, 2));
  const crow = scarecrow();
  crow.position.set(2.92, 0, -2.18);
  g.add(crow);
  const fence = cropFence();
  fence.position.set(2.68, 0, -2.62);
  g.add(fence);
  const trough = waterTrough();
  trough.position.set(3.18, 0, 0.48);
  trough.rotation.y = Math.PI / 2;
  g.add(trough);
  const churn = milkChurn();
  churn.position.set(3.2, 0, 0.98);
  g.add(churn);
  const pail = farmPail();
  pail.position.set(3.02, 0, 1.28);
  g.add(pail);
  const fork = farmFork();
  fork.position.set(3.1, 0, 1.52);
  fork.rotation.z = -0.36;
  fork.rotation.y = 0.12;
  g.add(fork);
  const basket = farmBasket();
  basket.position.set(3.16, 0, -0.06);
  g.add(basket);
  const scoop = farmScoop();
  // Bench top surface: y0 0.16 + 0.78 + half top 0.04. Offset on the
  // 1.55 × 0.58 top at (-3.28, -0.15) — not the trough cluster.
  scoop.position.set(-3.08, 0.16 + 0.78 + 0.04, -0.06);
  scoop.rotation.y = 0.28;
  g.add(scoop);
  const lantern = farmLantern();
  // Opposite end of the 1.55 × 0.58 top from the scoop — not the
  // hanging farm-lamp, trough cluster, or scoop bowl.
  lantern.position.set(-3.52, 0.16 + 0.78 + 0.04, -0.28);
  g.add(lantern);
  const seed = farmSeed();
  // Front-center of the 1.55 × 0.58 top — offset from lantern and scoop,
  // not the trough cluster.
  seed.position.set(-3.38, 0.16 + 0.78 + 0.04, 0.08);
  seed.rotation.y = -0.22;
  g.add(seed);
  const lid = farmLid();
  // On the pail lip, under the handle hoop — not the workbench lantern,
  // scoop, or seed packet, and offset from basket and fork.
  lid.position.set(3.02, 0.16 + 0.18, 1.28);
  g.add(lid);
  const mug = farmMug();
  // Back-right of the 1.55 × 0.58 top — offset from lantern, scoop,
  // and seed; not the trough cluster (lid, basket, fork).
  mug.position.set(-2.92, 0.16 + 0.78 + 0.04, -0.28);
  g.add(mug);
  const egg = farmEgg();
  // Back-center of the 1.55 × 0.58 top — offset from mug, lantern,
  // scoop, and seed; not the trough cluster (lid, basket, fork).
  egg.position.set(-3.22, 0.16 + 0.78 + 0.04, -0.36);
  g.add(egg);
  const tablePail = farmTablePail();
  // Front-left of the 1.55 × 0.58 top — offset from egg, mug, lantern,
  // scoop, and seed; not the floor farm-pail or trough cluster.
  tablePail.position.set(-3.62, 0.16 + 0.78 + 0.04, -0.02);
  g.add(tablePail);
  const broom = farmBroom();
  // Floor beside the 1.55 × 0.58 bench — leans by the front-right
  // corner, not on the top (seed, mug, egg, pail, lantern, scoop).
  broom.position.set(-2.88, 0, 0.28);
  broom.rotation.z = -0.32;
  g.add(broom);
  const paperRake = farmRake();
  // Floor beside the 1.55 × 0.58 bench — leans by the back-left
  // corner, not the broom (front-right) or the top (seed, mug, egg,
  // pail, lantern, scoop). Not the hanging farm-tool rake on the rail.
  paperRake.position.set(-3.72, 0, -0.48);
  paperRake.rotation.z = 0.32;
  g.add(paperRake);
  const paperHoe = farmHoe();
  // Floor beside the 1.55 × 0.58 bench — leans by the front-left
  // corner, not the rake (back-left), broom (front-right), or the
  // top (seed, mug, egg, pail, lantern, scoop). Not the hanging
  // farm-tool hoe by the sacks.
  paperHoe.position.set(-3.68, 0, 0.22);
  paperHoe.rotation.z = -0.28;
  g.add(paperHoe);
  const paperSickle = farmSickle();
  // Floor beside the 1.55 × 0.58 bench — leans by the back-right
  // corner, not the hoe (front-left), rake (back-left), broom
  // (front-right), or the top (seed, mug, egg, pail, lantern, scoop).
  paperSickle.position.set(-2.78, 0, -0.52);
  paperSickle.rotation.z = 0.28;
  g.add(paperSickle);
  const paperScythe = farmScythe();
  // Floor beside the 1.55 × 0.58 bench — leans by the front-center
  // edge, not the sickle (back-right), hoe (front-left), rake
  // (back-left), broom (front-right), or the top (seed, mug, egg,
  // pail, lantern, scoop).
  paperScythe.position.set(-3.28, 0, 0.38);
  paperScythe.rotation.z = 0.3;
  g.add(paperScythe);
  const paperLadle = farmLadle();
  // Floor beside the 1.55 × 0.58 bench — leans by the back-center
  // edge, not the scythe (front-center at -3.28, 0, 0.38), sickle
  // (back-right), hoe (front-left), rake (back-left), broom
  // (front-right), or the top (seed, mug, egg, pail, lantern, scoop).
  paperLadle.position.set(-3.28, 0, -0.62);
  paperLadle.rotation.z = -0.3;
  g.add(paperLadle);
  const paperSpade = farmSpade();
  // Floor beside the 1.55 × 0.58 bench — leans by the mid-right
  // edge, not the ladle (back-center at -3.28, 0, -0.62), scythe
  // (front-center), sickle (back-right), hoe (front-left), rake
  // (back-left), broom (front-right), or the top (seed, mug, egg,
  // pail, lantern, scoop).
  paperSpade.position.set(-2.70, 0, -0.18);
  paperSpade.rotation.z = 0.26;
  g.add(paperSpade);
  const paperTrowel = farmTrowel();
  // Floor beside the 1.55 × 0.58 bench — leans by the far-right back
  // edge, not the spade (mid-right at -2.70, 0, -0.18), ladle
  // (back-center), scythe, sickle, hoe, rake, broom, or the top
  // (seed, mug, egg, pail, lantern, scoop). Not hanging farm-tools.
  paperTrowel.position.set(-2.55, 0, -0.42);
  paperTrowel.rotation.z = -0.28;
  g.add(paperTrowel);
  const paperShears = farmShears();
  // Floor beside the 1.55 × 0.58 bench — leans by the mid-right front
  // edge, not the trowel (far-right back at -2.55, 0, -0.42), spade
  // (mid-right), ladle, scythe, sickle, hoe, rake, broom, or the top
  // (seed, mug, egg, pail, lantern, scoop). Not hanging farm-tools.
  paperShears.position.set(-2.60, 0, 0.18);
  paperShears.rotation.z = 0.24;
  g.add(paperShears);

  const loftY = 2.94;
  g.add(sack(0.46, 0.56, 0.36, SACK, -2.55, loftY + 0.28, -2.35, 0.1));
  g.add(sack(0.42, 0.5, 0.32, SACK_DARK, -2.05, loftY + 0.25, -2.4, -0.12));
  g.add(hayBale(0.88, 0.42, 0.5, -0.55, loftY + 0.21, -2.32, 0.08));
  g.add(sack(0.4, 0.48, 0.32, SACK_PALE, 0.85, loftY + 0.24, -2.28, 0.16));

  g.add(hangingLantern(-0.55, 2.12, -0.25));
  g.add(hangingLantern(1.15, 2.12, 0.55));
  g.add(paperMark(-2.15, 1.55, 3.38));

  const postL = paperBox(0.14, 2.45, 0.14, WOOD_DARK, "farm-prop");
  postL.position.set(-2.05, 1.38, 1.85);
  const postR = paperBox(0.14, 2.45, 0.14, WOOD_DARK, "farm-prop");
  postR.position.set(2.15, 1.38, 1.85);
  g.add(postL, postR);

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

function setHouseFurnitureVisible(interior, visible) {
  interior.traverse((o) => {
    if (HOUSE_KINDS.has(o.userData?.kind)) o.visible = visible;
    if (o.userData?.kind === "interior-prop") o.visible = visible;
  });
}

function remember(obj, key, value) {
  if (obj.userData[key] == null) obj.userData[key] = value;
}

function tintInterior(interior, farm) {
  interior.traverse((o) => {
    if (o.isLight) {
      remember(o, "_houseIntensity", o.intensity);
      remember(o, "_houseColor", o.color ? o.color.getHex() : null);
      o.intensity = farm ? FARM_LIGHT : o.userData._houseIntensity;
      if (o.color) {
        o.color.setHex(farm ? FARM_LAMP_HEX : o.userData._houseColor);
      }
    }
    if (!o.material || !o.material.color) return;
    if (o.userData?.kind === "interior-wall") {
      remember(o, "_houseColor", o.material.color.getHex());
      const dim = o.geometry?.parameters?.width < 0.3 ? WALL_SIDE_DIM : WALL_DIM;
      o.material.color.setHex(farm ? dim : o.userData._houseColor);
    }
    if (o.userData?.kind === "interior-floor") {
      remember(o, "_houseColor", o.material.color.getHex());
      o.material.color.setHex(farm ? FLOOR_DIM : o.userData._houseColor);
    }
  });
}

function dimSceneLights(scene, farm) {
  if (!scene || !scene.children) return;
  for (const child of scene.children) {
    if (!child.isLight) continue;
    remember(child, "_houseIntensity", child.intensity);
    child.intensity = farm
      ? child.userData._houseIntensity * SCENE_LIGHT_SCALE
      : child.userData._houseIntensity;
  }
  if (scene.background && scene.background.isColor) {
    remember(scene, "_houseBg", scene.background.getHex());
    scene.background.setHex(farm ? FARM_BG : scene.userData._houseBg);
  }
}

/**
 * Dress an interior (or a scene that contains one) as a PAPER farm shed.
 * Hides living-room furniture, adds tools, sacks, planter beds, a
 * scarecrow, a short back-edge fence, a small wood water trough, a
 * kraft milk churn beside the trough, a short wood pail beside the
 * churn, a small kraft pitchfork leaning by the trough and pail, a
 * small kraft egg basket beside the trough, a small kraft grain scoop
 * on the workbench, a small kraft lantern on the workbench, a small
 * kraft seed packet on the workbench, a tiny kraft pail lid on the
 * pail, a tiny kraft mug on the workbench, a tiny kraft egg on
 * the workbench, a tiny kraft pail on the workbench, a tiny kraft
 * broom leaning by the workbench, a tiny kraft rake leaning by
 * the workbench, a tiny kraft hoe leaning by the workbench,
 * a tiny kraft sickle leaning by the workbench,
 * a tiny kraft scythe leaning by the workbench,
 * a tiny kraft ladle leaning by the workbench, and
 * a tiny kraft spade leaning by the workbench,
 * warms and dims lights.
 * @param {THREE.Object3D} scene
 */
export function dressFarm(scene) {
  if (!scene) return null;
  const interior = findInterior(scene) || scene;
  interior.userData.mode = "PAPER";
  interior.userData.interiorUse = "farm";
  interior.userData.provenance = "SIMULATED";
  setHouseFurnitureVisible(interior, false);
  tintInterior(interior, true);
  dimSceneLights(scene, true);
  let dress = interior.getObjectByName("farm-dress");
  if (!dress) {
    dress = makeFarmDress();
    interior.add(dress);
  }
  dress.visible = true;
  return interior;
}

/** Restore the house living room after a farm-shed visit. */
export function undressFarm(scene) {
  if (!scene) return null;
  const interior = findInterior(scene) || scene;
  const dress = interior.getObjectByName("farm-dress");
  if (dress) dress.visible = false;
  setHouseFurnitureVisible(interior, true);
  tintInterior(interior, false);
  dimSceneLights(scene, false);
  interior.userData.interiorUse = "house";
  return interior;
}
