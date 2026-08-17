import * as THREE from "three";

/**
 * PAPER factory interior dress. Workbenches, kraft machine boxes, iron
 * stock, hanging wrench, cooler light — not the house living room,
 * warehouse crates, shop, or farm. No WASD. Tap-to-walk stays in interior.js.
 *
 * Call dressFactory(scene) when plot.kind or plot.use is "factory".
 * Idempotent: a second call only shows the existing dress.
 */

const BENCH_WOOD = 0x6a4a32;
const BENCH_LEG = 0x5a3a22;
/** Same crate kraft as warehouse / pier — original palette, not a new hex. */
const KRAFT = 0x8a6238;
const KRAFT_LIGHT = 0x9a6a40;
const IRON = 0x6a7068;
const IRON_DARK = 0x4a524c;
const IRON_LIGHT = 0x8a9088;
const IRON_RUST = 0x6a5a4a;
const FLOOR_COOL = 0x5e625c;
const WALL_COOL = 0xb8c0b8;
const WALL_SIDE_COOL = 0xacb4ac;
const LAMP_METAL = 0x3a4248;
const LAMP_BULB = 0xd8e8f0;
const PAPER_CARD = 0xf3efe4;
const STRAP = 0x3a3834;
const HOUSE_KINDS = new Set(["interior-table", "interior-chair", "interior-bed", "interior-lamp"]);
const FACTORY_LIGHT = 0.58;
const FACTORY_LIGHT_COLOR = 0xb8c8d8;
const FACTORY_BG = 0x161a1e;
const SCENE_LIGHT_SCALE = 0.42;

export function isFactoryPlot(plot) {
  if (!plot) return false;
  return plot.kind === "factory" || plot.use === "factory";
}

function paperBox(w, h, d, color, kind = "factory-prop") {
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

function paperCyl(rTop, rBot, h, color, kind = "factory-prop", segments = 8) {
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

function workbench(x, z, w, d, yaw = 0) {
  const g = new THREE.Group();
  g.name = "factory-bench";
  g.userData.kind = "factory-bench";
  g.userData.mode = "PAPER";
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  const y0 = 0.16;
  const topY = y0 + 0.78;
  const apron = paperBox(w * 0.96, 0.1, d * 0.92, BENCH_WOOD, "factory-bench");
  apron.position.y = topY - 0.12;
  g.add(apron);
  const top = paperBox(w, 0.07, d, IRON, "factory-bench");
  top.position.y = topY;
  g.add(top);
  const lip = paperBox(w + 0.04, 0.03, d + 0.04, IRON_DARK, "factory-bench");
  lip.position.y = topY + 0.05;
  g.add(lip);
  const legH = 0.74;
  for (const [dx, dz] of [
    [-w * 0.42, -d * 0.38],
    [w * 0.42, -d * 0.38],
    [-w * 0.42, d * 0.38],
    [w * 0.42, d * 0.38],
  ]) {
    const leg = paperBox(0.09, legH, 0.09, BENCH_LEG, "factory-bench");
    leg.position.set(dx, y0 + legH / 2, dz);
    g.add(leg);
  }
  const viseBase = paperBox(0.28, 0.1, 0.22, IRON_DARK, "factory-stock");
  viseBase.position.set(w * 0.32, topY + 0.1, d * 0.08);
  const viseJaw = paperBox(0.08, 0.16, 0.2, IRON_LIGHT, "factory-stock");
  viseJaw.position.set(w * 0.32, topY + 0.2, d * 0.08);
  g.add(viseBase, viseJaw);
  return g;
}

/**
 * Wooden wall bench with kraft tool-block boxes on the top — not an iron mill,
 * not a warehouse floor crate. Reads from the enter camera. Centre stays open.
 */
function woodWorkbench(x, z, w = 1.85, d = 0.62, yaw = 0) {
  const g = new THREE.Group();
  g.name = "factory-wood-bench";
  g.userData.kind = "factory-bench";
  g.userData.mode = "PAPER";
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  const y0 = 0.16;
  const topY = y0 + 0.78;
  const apron = paperBox(w * 0.96, 0.1, d * 0.92, BENCH_LEG, "factory-bench");
  apron.position.y = topY - 0.12;
  g.add(apron);
  const top = paperBox(w, 0.08, d, BENCH_WOOD, "factory-bench");
  top.position.y = topY;
  g.add(top);
  const legH = 0.74;
  for (const [dx, dz] of [
    [-w * 0.42, -d * 0.38],
    [w * 0.42, -d * 0.38],
    [-w * 0.42, d * 0.38],
    [w * 0.42, d * 0.38],
  ]) {
    const leg = paperBox(0.09, legH, 0.09, BENCH_LEG, "factory-bench");
    leg.position.set(dx, y0 + legH / 2, dz);
    g.add(leg);
  }
  const blocks = [
    [-w * 0.28, 0.04, 0.3, 0.22, 0.26, KRAFT],
    [0.02, -0.06, 0.24, 0.18, 0.22, KRAFT_LIGHT],
    [w * 0.3, 0.02, 0.28, 0.26, 0.24, KRAFT],
  ];
  for (const [bx, bz, bw, bh, bd, color] of blocks) {
    const body = paperBox(bw, bh, bd, color, "factory-stock");
    body.position.set(bx, topY + 0.04 + bh / 2, bz);
    const lid = paperBox(bw * 0.92, 0.04, bd * 0.92, KRAFT_LIGHT, "factory-stock");
    lid.position.set(bx, topY + 0.04 + bh + 0.02, bz);
    const band = paperBox(bw + 0.02, 0.04, bd + 0.02, BENCH_LEG, "factory-stock");
    band.position.set(bx, topY + 0.04 + bh * 0.42, bz);
    g.add(body, lid, band);
  }
  return g;
}

/**
 * Small kraft scrap bin of wood / iron offcuts. Open crate, not a mill,
 * not a warehouse floor stack. Sits against a wall; centre aisle stays open.
 */
function scrapBin(x, z, yaw = 0) {
  const g = new THREE.Group();
  g.name = "factory-scrap";
  g.userData.kind = "factory-stock";
  g.userData.mode = "PAPER";
  g.userData.part = "scrap-bin";
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  const y0 = 0.16;
  const w = 0.56;
  const h = 0.32;
  const d = 0.42;
  const body = paperBox(w, h, d, KRAFT, "factory-stock");
  body.position.y = y0 + h / 2;
  const rim = paperBox(w + 0.04, 0.05, d + 0.04, BENCH_LEG, "factory-stock");
  rim.position.y = y0 + h;
  const band = paperBox(w + 0.03, 0.04, d + 0.03, BENCH_LEG, "factory-stock");
  band.position.y = y0 + h * 0.4;
  const offA = paperBox(0.4, 0.07, 0.1, KRAFT_LIGHT, "factory-stock");
  offA.position.set(-0.04, y0 + h + 0.06, -0.06);
  const offB = paperBox(0.28, 0.06, 0.09, BENCH_WOOD, "factory-stock");
  offB.position.set(0.08, y0 + h + 0.12, 0.05);
  const offC = paperBox(0.22, 0.05, 0.08, IRON_RUST, "factory-stock");
  offC.position.set(-0.06, y0 + h + 0.16, 0.04);
  g.add(body, rim, band, offA, offB, offC);
  return g;
}

/**
 * Dark iron floor grate / drain plate. Flat PAPER boxes on the floor,
 * against a wall; centre aisle stays open. Not a mill, not a crate.
 */
function floorGrate(x, z, yaw = 0) {
  const g = new THREE.Group();
  g.name = "factory-grate";
  g.userData.kind = "factory-prop";
  g.userData.mode = "PAPER";
  g.userData.part = "floor-grate";
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  const y0 = 0.16;
  const w = 0.68;
  const d = 0.68;
  const plate = paperBox(w, 0.04, d, IRON_DARK, "factory-prop");
  plate.position.y = y0 + 0.02;
  const well = paperBox(w * 0.7, 0.03, d * 0.7, LAMP_METAL, "factory-prop");
  well.position.y = y0 + 0.032;
  g.add(plate, well);
  for (let i = 0; i < 4; i++) {
    const bar = paperBox(w * 0.64, 0.025, 0.045, i % 2 ? IRON_RUST : IRON_LIGHT, "factory-prop");
    bar.position.set(0, y0 + 0.05, -0.18 + i * 0.12);
    g.add(bar);
  }
  return g;
}

/**
 * Chunky kraft mill on the floor — wood body, small iron press.
 * Reads from the enter camera (door +Z looking −Z). Not a warehouse crate.
 */
function kraftMachine(x, z, w = 1.52, d = 0.88, yaw = 0) {
  const g = new THREE.Group();
  g.name = "factory-machine";
  g.userData.kind = "factory-machine";
  g.userData.mode = "PAPER";
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  const y0 = 0.16;
  const bodyH = 0.72;
  const base = paperBox(w, 0.16, d, BENCH_LEG, "factory-machine");
  base.position.y = y0 + 0.08;
  const body = paperBox(w * 0.94, bodyH, d * 0.88, KRAFT, "factory-machine");
  body.position.y = y0 + 0.16 + bodyH / 2;
  const apron = paperBox(w * 0.98, 0.08, d * 0.92, BENCH_WOOD, "factory-machine");
  apron.position.y = y0 + 0.16 + bodyH + 0.04;
  const top = paperBox(w, 0.07, d, KRAFT_LIGHT, "factory-machine");
  top.position.y = y0 + 0.16 + bodyH + 0.1;
  const topY = y0 + 0.16 + bodyH + 0.14;
  const column = paperBox(0.14, 0.68, 0.14, IRON_DARK, "factory-machine");
  column.position.set(-w * 0.28, topY + 0.34, 0);
  const head = paperBox(0.52, 0.12, 0.38, IRON, "factory-machine");
  head.position.set(-w * 0.14, topY + 0.68, 0);
  const ram = paperBox(0.2, 0.16, 0.2, IRON_LIGHT, "factory-machine");
  ram.position.set(-w * 0.14, topY + 0.16, 0);
  const hopper = paperBox(0.42, 0.28, 0.36, KRAFT, "factory-machine");
  hopper.position.set(w * 0.28, topY + 0.18, 0);
  const strap = paperBox(w + 0.03, 0.05, d + 0.03, BENCH_LEG, "factory-machine");
  strap.position.y = y0 + 0.42;
  g.add(base, body, apron, top, column, head, ram, hopper, strap);
  return g;
}

function anvil(x, z, yaw = 0) {
  const g = new THREE.Group();
  g.name = "factory-anvil";
  g.userData.kind = "factory-stock";
  g.userData.mode = "PAPER";
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  const base = paperBox(0.55, 0.22, 0.38, IRON_DARK, "factory-stock");
  base.position.y = 0.27;
  const waist = paperBox(0.28, 0.28, 0.22, IRON, "factory-stock");
  waist.position.y = 0.52;
  const face = paperBox(0.72, 0.16, 0.28, IRON_LIGHT, "factory-stock");
  face.position.y = 0.74;
  const horn = paperBox(0.28, 0.1, 0.14, IRON, "factory-stock");
  horn.position.set(0.46, 0.74, 0);
  g.add(base, waist, face, horn);
  return g;
}

function plateStack(x, z, yaw, layers, y0 = 0.16) {
  const g = new THREE.Group();
  g.name = "factory-plates";
  g.userData.kind = "factory-stock";
  g.userData.mode = "PAPER";
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  let y = y0;
  for (const layer of layers) {
    const w = layer[0];
    const h = layer[1];
    const d = layer[2];
    const color = layer[3];
    const dx = layer[4] || 0;
    const dz = layer[5] || 0;
    const plate = paperBox(w, h, d, color, "factory-stock");
    plate.position.set(dx, y + h / 2, dz);
    g.add(plate);
    y += h;
  }
  return g;
}

function barRack(x, z, yaw) {
  const g = new THREE.Group();
  g.name = "factory-rack";
  g.userData.kind = "factory-stock";
  g.userData.mode = "PAPER";
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  const postL = paperBox(0.08, 1.55, 0.08, IRON_DARK, "factory-stock");
  postL.position.set(-0.55, 0.93, 0);
  const postR = paperBox(0.08, 1.55, 0.08, IRON_DARK, "factory-stock");
  postR.position.set(0.55, 0.93, 0);
  g.add(postL, postR);
  for (const hy of [0.42, 0.88, 1.34]) {
    const shelf = paperBox(1.22, 0.05, 0.36, IRON, "factory-stock");
    shelf.position.set(0, hy, 0);
    g.add(shelf);
    for (let i = 0; i < 5; i++) {
      const bar = paperBox(1.05, 0.06, 0.06, i % 2 ? IRON_LIGHT : IRON_RUST, "factory-stock");
      bar.position.set(0, hy + 0.07, -0.12 + i * 0.06);
      g.add(bar);
    }
  }
  return g;
}

/**
 * Small kraft/iron PAPER bench vise: kraft body, iron jaws.
 * Sits on a workbench top — not the oil can, floor bucket, or hanging wrench.
 */
function factoryVise(x, z, yaw = 0) {
  const g = new THREE.Group();
  g.name = "factory-vise";
  g.userData.kind = "factory-vise";
  g.userData.mode = "PAPER";
  // First workbench lip top: y0 0.16 + 0.78, lip centre +0.05, half lip 0.015.
  const sitY = 0.16 + 0.78 + 0.05 + 0.015;
  g.position.set(x, sitY, z);
  g.rotation.y = yaw;
  const body = paperBox(0.2, 0.08, 0.14, KRAFT, "factory-vise");
  body.position.y = 0.04;
  const cheek = paperBox(0.08, 0.1, 0.14, KRAFT, "factory-vise");
  cheek.position.set(-0.06, 0.13, 0);
  const fixedJaw = paperBox(0.04, 0.12, 0.14, IRON_DARK, "factory-vise");
  fixedJaw.position.set(-0.02, 0.16, 0);
  const moveJaw = paperBox(0.04, 0.12, 0.14, IRON, "factory-vise");
  moveJaw.position.set(0.06, 0.16, 0);
  const screw = paperBox(0.12, 0.03, 0.03, IRON_DARK, "factory-vise");
  screw.position.set(0.12, 0.12, 0);
  g.add(body, cheek, fixedJaw, moveJaw, screw);
  return g;
}

/**
 * Tiny kraft PAPER rag: folded KRAFT / PAPER_CARD / BENCH_WOOD boxes.
 * Sits on a workbench top — not the oil can, mallet, vise, floor bucket, or wrench.
 */
function factoryRag(x, z, yaw = 0) {
  const g = new THREE.Group();
  g.name = "factory-rag";
  g.userData.kind = "factory-rag";
  g.userData.mode = "PAPER";
  g.userData.part = "rag";
  // First workbench lip top: y0 0.16 + 0.78, lip centre +0.05, half lip 0.015.
  const sitY = 0.16 + 0.78 + 0.05 + 0.015;
  g.position.set(x, sitY, z);
  g.rotation.y = yaw;
  const sheet = paperBox(0.16, 0.014, 0.11, KRAFT, "factory-rag");
  sheet.position.y = 0.007;
  const fold = paperBox(0.1, 0.016, 0.08, PAPER_CARD, "factory-rag");
  fold.position.set(0.02, 0.02, 0.012);
  fold.rotation.y = 0.18;
  const hem = paperBox(0.07, 0.012, 0.055, BENCH_WOOD, "factory-rag");
  hem.position.set(-0.025, 0.026, -0.012);
  hem.rotation.y = -0.14;
  g.add(sheet, fold, hem);
  return g;
}

/**
 * Tiny kraft PAPER rivet (peg): KRAFT shank, BENCH_WOOD head. Boxes only.
 * Sits on a workbench top — not the rag, mallet, oil can, vise, floor bucket, or wrench.
 */
function factoryRivet(x, z, yaw = 0) {
  const g = new THREE.Group();
  g.name = "factory-rivet";
  g.userData.kind = "factory-rivet";
  g.userData.mode = "PAPER";
  g.userData.part = "rivet";
  // First workbench lip top: y0 0.16 + 0.78, lip centre +0.05, half lip 0.015.
  const sitY = 0.16 + 0.78 + 0.05 + 0.015;
  g.position.set(x, sitY, z);
  g.rotation.y = yaw;
  const shank = paperBox(0.028, 0.04, 0.028, KRAFT, "factory-rivet");
  shank.position.y = 0.02;
  const head = paperBox(0.05, 0.018, 0.05, BENCH_WOOD, "factory-rivet");
  head.position.y = 0.049;
  g.add(shank, head);
  return g;
}

/**
 * Small kraft PAPER mallet: KRAFT / BENCH_WOOD head, BENCH_LEG handle.
 * Sits on a workbench top — not the vise, oil can, floor bucket, or wrench.
 */
function factoryMallet(x, z, yaw = 0) {
  const g = new THREE.Group();
  g.name = "factory-mallet";
  g.userData.kind = "factory-mallet";
  g.userData.mode = "PAPER";
  // First workbench lip top: y0 0.16 + 0.78, lip centre +0.05, half lip 0.015.
  const sitY = 0.16 + 0.78 + 0.05 + 0.015;
  g.position.set(x, sitY, z);
  g.rotation.y = yaw;
  const handle = paperBox(0.22, 0.035, 0.035, BENCH_LEG, "factory-mallet");
  handle.position.set(-0.04, 0.028, 0);
  const head = paperBox(0.1, 0.08, 0.08, KRAFT, "factory-mallet");
  head.position.set(0.1, 0.05, 0);
  const face = paperBox(0.03, 0.07, 0.07, BENCH_WOOD, "factory-mallet");
  face.position.set(0.155, 0.05, 0);
  g.add(handle, head, face);
  return g;
}

/**
 * Tiny kraft PAPER oilcan: KRAFT body, KRAFT_LIGHT spout. Boxes only.
 * Sits on the left-wall bench — not the rag, rivet, wrench, scrap-bin, or grate.
 */
function paperOilcan(x, z, yaw = 0) {
  const g = new THREE.Group();
  g.name = "factory-paper-oilcan";
  g.userData.kind = "factory-paper-oilcan";
  g.userData.mode = "PAPER";
  g.userData.part = "oilcan";
  // Second workbench lip top: y0 0.16 + 0.78, lip centre +0.05, half lip 0.015.
  const sitY = 0.16 + 0.78 + 0.05 + 0.015;
  g.position.set(x, sitY, z);
  g.rotation.y = yaw;
  const body = paperBox(0.07, 0.08, 0.055, KRAFT, "factory-paper-oilcan");
  body.position.y = 0.04;
  const spout = paperBox(0.08, 0.016, 0.016, KRAFT_LIGHT, "factory-paper-oilcan");
  spout.position.set(0.055, 0.07, 0);
  const cap = paperBox(0.028, 0.018, 0.028, BENCH_WOOD, "factory-paper-oilcan");
  cap.position.set(0, 0.089, 0);
  g.add(body, spout, cap);
  return g;
}

/**
 * Tiny kraft PAPER funnel: KRAFT mouth, KRAFT_LIGHT cone, BENCH_WOOD spout.
 * Sits on the left-wall bench — not the oilcan, rag, rivet, or wrench.
 */
function paperFunnel(x, z, yaw = 0) {
  const g = new THREE.Group();
  g.name = "factory-paper-funnel";
  g.userData.kind = "factory-paper-funnel";
  g.userData.mode = "PAPER";
  g.userData.part = "funnel";
  // Second workbench lip top: y0 0.16 + 0.78, lip centre +0.05, half lip 0.015.
  const sitY = 0.16 + 0.78 + 0.05 + 0.015;
  g.position.set(x, sitY, z);
  g.rotation.y = yaw;
  const mouth = paperBox(0.08, 0.016, 0.08, KRAFT, "factory-paper-funnel");
  mouth.position.y = 0.068;
  const cone = paperBox(0.05, 0.036, 0.05, KRAFT_LIGHT, "factory-paper-funnel");
  cone.position.y = 0.042;
  const spout = paperBox(0.022, 0.028, 0.022, BENCH_WOOD, "factory-paper-funnel");
  spout.position.y = 0.014;
  g.add(mouth, cone, spout);
  return g;
}

/**
 * Tiny kraft PAPER cork: KRAFT body, KRAFT_LIGHT lip. Boxes only.
 * Sits on the left-wall bench — not the funnel, oilcan, or rag.
 */
function paperCork(x, z, yaw = 0) {
  const g = new THREE.Group();
  g.name = "factory-paper-cork";
  g.userData.kind = "factory-paper-cork";
  g.userData.mode = "PAPER";
  g.userData.part = "cork";
  // Second workbench lip top: y0 0.16 + 0.78, lip centre +0.05, half lip 0.015.
  const sitY = 0.16 + 0.78 + 0.05 + 0.015;
  g.position.set(x, sitY, z);
  g.rotation.y = yaw;
  const body = paperBox(0.032, 0.044, 0.032, KRAFT, "factory-paper-cork");
  body.position.y = 0.022;
  const lip = paperBox(0.04, 0.012, 0.04, KRAFT_LIGHT, "factory-paper-cork");
  lip.position.y = 0.05;
  g.add(body, lip);
  return g;
}

/**
 * Tiny kraft PAPER peg: KRAFT shank, KRAFT_LIGHT head. Boxes only.
 * Sits on the wood bench — not the cork, funnel, oilcan, rag, rivet, or wrench.
 */
function paperPeg(x, z, yaw = 0) {
  const g = new THREE.Group();
  g.name = "factory-paper-peg";
  g.userData.kind = "factory-paper-peg";
  g.userData.mode = "PAPER";
  g.userData.part = "peg";
  // Wood-bench top: y0 0.16 + 0.78, top half 0.04.
  const sitY = 0.16 + 0.78 + 0.04;
  g.position.set(x, sitY, z);
  g.rotation.y = yaw;
  const shank = paperBox(0.022, 0.04, 0.022, KRAFT, "factory-paper-peg");
  shank.position.y = 0.02;
  const head = paperBox(0.034, 0.012, 0.034, KRAFT_LIGHT, "factory-paper-peg");
  head.position.y = 0.046;
  g.add(shank, head);
  return g;
}

/**
 * Tiny kraft PAPER wood shaving: thin KRAFT / KRAFT_LIGHT curl. Boxes only.
 * Sits on the wood bench — not the peg, cork, funnel, oilcan, rag, rivet, or wrench.
 */
function paperShaving(x, z, yaw = 0) {
  const g = new THREE.Group();
  g.name = "factory-paper-shaving";
  g.userData.kind = "factory-paper-shaving";
  g.userData.mode = "PAPER";
  g.userData.part = "shaving";
  // Wood-bench top: y0 0.16 + 0.78, top half 0.04.
  const sitY = 0.16 + 0.78 + 0.04;
  g.position.set(x, sitY, z);
  g.rotation.y = yaw;
  const curl = paperBox(0.06, 0.01, 0.018, KRAFT, "factory-paper-shaving");
  curl.position.y = 0.006;
  curl.rotation.y = 0.22;
  const flake = paperBox(0.04, 0.008, 0.014, KRAFT_LIGHT, "factory-paper-shaving");
  flake.position.set(0.012, 0.012, 0.006);
  flake.rotation.y = -0.18;
  g.add(curl, flake);
  return g;
}

/**
 * Tiny kraft PAPER awl: KRAFT handle, KRAFT_LIGHT spike. Boxes only.
 * Sits on the left-wall bench — not the shaving, peg, cork, funnel, oilcan, rag, rivet, or wrench.
 */
function paperAwl(x, z, yaw = 0) {
  const g = new THREE.Group();
  g.name = "factory-paper-awl";
  g.userData.kind = "factory-paper-awl";
  g.userData.mode = "PAPER";
  g.userData.part = "awl";
  // Second workbench lip top: y0 0.16 + 0.78, lip centre +0.05, half lip 0.015.
  const sitY = 0.16 + 0.78 + 0.05 + 0.015;
  g.position.set(x, sitY, z);
  g.rotation.y = yaw;
  const handle = paperBox(0.055, 0.022, 0.022, KRAFT, "factory-paper-awl");
  handle.position.set(-0.012, 0.011, 0);
  const spike = paperBox(0.048, 0.01, 0.01, KRAFT_LIGHT, "factory-paper-awl");
  spike.position.set(0.036, 0.011, 0);
  g.add(handle, spike);
  return g;
}

/**
 * Tiny kraft PAPER rasp: KRAFT handle, KRAFT_LIGHT blade. Boxes only.
 * Sits on the wood bench — not the awl, shaving, peg, cork, funnel, oilcan, rag, rivet, or wrench.
 */
function paperRasp(x, z, yaw = 0) {
  const g = new THREE.Group();
  g.name = "factory-paper-rasp";
  g.userData.kind = "factory-paper-rasp";
  g.userData.mode = "PAPER";
  g.userData.part = "rasp";
  // Wood-bench top: y0 0.16 + 0.78, top half 0.04.
  const sitY = 0.16 + 0.78 + 0.04;
  g.position.set(x, sitY, z);
  g.rotation.y = yaw;
  const handle = paperBox(0.05, 0.02, 0.02, KRAFT, "factory-paper-rasp");
  handle.position.set(-0.02, 0.01, 0);
  const blade = paperBox(0.072, 0.014, 0.026, KRAFT_LIGHT, "factory-paper-rasp");
  blade.position.set(0.038, 0.01, 0);
  g.add(handle, blade);
  return g;
}

/**
 * Tiny kraft PAPER file: KRAFT handle, KRAFT_LIGHT blade. Boxes only.
 * Sits on the wood bench — not the rasp, awl, shaving, peg, cork, funnel, oilcan, rag, rivet, or wrench.
 */
function paperFile(x, z, yaw = 0) {
  const g = new THREE.Group();
  g.name = "factory-paper-file";
  g.userData.kind = "factory-paper-file";
  g.userData.mode = "PAPER";
  g.userData.part = "file";
  // Wood-bench top: y0 0.16 + 0.78, top half 0.04.
  const sitY = 0.16 + 0.78 + 0.04;
  g.position.set(x, sitY, z);
  g.rotation.y = yaw;
  const handle = paperBox(0.046, 0.018, 0.018, KRAFT, "factory-paper-file");
  handle.position.set(-0.018, 0.009, 0);
  const blade = paperBox(0.07, 0.012, 0.02, KRAFT_LIGHT, "factory-paper-file");
  blade.position.set(0.036, 0.009, 0);
  g.add(handle, blade);
  return g;
}

/**
 * Tiny kraft PAPER chisel: KRAFT handle, KRAFT_LIGHT blade. Boxes only.
 * Sits on the wood bench — not the file, rasp, awl, shaving, peg, cork, funnel, oilcan, rag, rivet, or wrench.
 */
function paperChisel(x, z, yaw = 0) {
  const g = new THREE.Group();
  g.name = "factory-paper-chisel";
  g.userData.kind = "factory-paper-chisel";
  g.userData.mode = "PAPER";
  g.userData.part = "chisel";
  // Wood-bench top: y0 0.16 + 0.78, top half 0.04.
  const sitY = 0.16 + 0.78 + 0.04;
  g.position.set(x, sitY, z);
  g.rotation.y = yaw;
  const handle = paperBox(0.042, 0.02, 0.02, KRAFT, "factory-paper-chisel");
  handle.position.set(-0.016, 0.01, 0);
  const blade = paperBox(0.058, 0.01, 0.026, KRAFT_LIGHT, "factory-paper-chisel");
  blade.position.set(0.032, 0.01, 0);
  g.add(handle, blade);
  return g;
}

/**
 * Tiny kraft PAPER mallet: KRAFT handle, KRAFT_LIGHT head. Boxes only.
 * Sits on the wood bench — not the chisel, file, rasp, awl, shaving, peg, cork, funnel, oilcan, rag, rivet, or wrench.
 */
function paperMallet(x, z, yaw = 0) {
  const g = new THREE.Group();
  g.name = "factory-paper-mallet";
  g.userData.kind = "factory-paper-mallet";
  g.userData.mode = "PAPER";
  g.userData.part = "mallet";
  // Wood-bench top: y0 0.16 + 0.78, top half 0.04.
  const sitY = 0.16 + 0.78 + 0.04;
  g.position.set(x, sitY, z);
  g.rotation.y = yaw;
  const handle = paperBox(0.05, 0.016, 0.016, KRAFT, "factory-paper-mallet");
  handle.position.set(-0.02, 0.016, 0);
  const head = paperBox(0.032, 0.032, 0.032, KRAFT_LIGHT, "factory-paper-mallet");
  head.position.set(0.022, 0.016, 0);
  g.add(handle, head);
  return g;
}

/**
 * Tiny kraft PAPER gouge: KRAFT handle, KRAFT_LIGHT blade. Boxes only.
 * Sits on the wood bench — not the mallet, chisel, file, rasp, awl, shaving, peg, cork, funnel, oilcan, rag, rivet, or wrench.
 */
function paperGouge(x, z, yaw = 0) {
  const g = new THREE.Group();
  g.name = "factory-paper-gouge";
  g.userData.kind = "factory-paper-gouge";
  g.userData.mode = "PAPER";
  g.userData.part = "gouge";
  // Wood-bench top: y0 0.16 + 0.78, top half 0.04.
  const sitY = 0.16 + 0.78 + 0.04;
  g.position.set(x, sitY, z);
  g.rotation.y = yaw;
  const handle = paperBox(0.04, 0.018, 0.018, KRAFT, "factory-paper-gouge");
  handle.position.set(-0.015, 0.01, 0);
  const blade = paperBox(0.05, 0.012, 0.03, KRAFT_LIGHT, "factory-paper-gouge");
  blade.position.set(0.028, 0.01, 0);
  g.add(handle, blade);
  return g;
}

/**
 * Tiny kraft PAPER plane: KRAFT body, KRAFT_LIGHT blade. Boxes only.
 * Sits on the wood bench — not the gouge, mallet, chisel, file, rasp, awl, shaving, peg, cork, funnel, oilcan, rag, rivet, or wrench.
 */
function paperPlane(x, z, yaw = 0) {
  const g = new THREE.Group();
  g.name = "factory-paper-plane";
  g.userData.kind = "factory-paper-plane";
  g.userData.mode = "PAPER";
  g.userData.part = "plane";
  // Wood-bench top: y0 0.16 + 0.78, top half 0.04.
  const sitY = 0.16 + 0.78 + 0.04;
  g.position.set(x, sitY, z);
  g.rotation.y = yaw;
  const body = paperBox(0.07, 0.02, 0.028, KRAFT, "factory-paper-plane");
  body.position.set(0, 0.011, 0);
  const blade = paperBox(0.016, 0.028, 0.022, KRAFT_LIGHT, "factory-paper-plane");
  blade.position.set(0.01, 0.02, 0);
  g.add(body, blade);
  return g;
}

/**
 * Tiny kraft PAPER vice: KRAFT body, KRAFT_LIGHT jaw. Boxes only.
 * Sits on the wood bench — not the plane, gouge, mallet, chisel, file, rasp, awl, shaving, peg, cork, funnel, oilcan, rag, rivet, or wrench.
 */
function paperVice(x, z, yaw = 0) {
  const g = new THREE.Group();
  g.name = "factory-paper-vice";
  g.userData.kind = "factory-paper-vice";
  g.userData.mode = "PAPER";
  g.userData.part = "vice";
  // Wood-bench top: y0 0.16 + 0.78, top half 0.04.
  const sitY = 0.16 + 0.78 + 0.04;
  g.position.set(x, sitY, z);
  g.rotation.y = yaw;
  const body = paperBox(0.05, 0.018, 0.032, KRAFT, "factory-paper-vice");
  body.position.set(0, 0.01, 0);
  const jaw = paperBox(0.018, 0.026, 0.028, KRAFT_LIGHT, "factory-paper-vice");
  jaw.position.set(0.012, 0.018, 0);
  g.add(body, jaw);
  return g;
}

/**
 * Tiny kraft PAPER clamp: KRAFT body, KRAFT_LIGHT jaw. Boxes only.
 * Sits on the wood bench — not the vice, plane, gouge, mallet, chisel, file, rasp, awl, shaving, peg, cork, funnel, oilcan, rag, rivet, or wrench.
 */
function paperClamp(x, z, yaw = 0) {
  const g = new THREE.Group();
  g.name = "factory-paper-clamp";
  g.userData.kind = "factory-paper-clamp";
  g.userData.mode = "PAPER";
  g.userData.part = "clamp";
  // Wood-bench top: y0 0.16 + 0.78, top half 0.04.
  const sitY = 0.16 + 0.78 + 0.04;
  g.position.set(x, sitY, z);
  g.rotation.y = yaw;
  const body = paperBox(0.048, 0.016, 0.03, KRAFT, "factory-paper-clamp");
  body.position.set(0, 0.009, 0);
  const jaw = paperBox(0.016, 0.024, 0.026, KRAFT_LIGHT, "factory-paper-clamp");
  jaw.position.set(0.01, 0.016, 0);
  g.add(body, jaw);
  return g;
}

/**
 * Tiny kraft PAPER adze: KRAFT handle, KRAFT_LIGHT blade. Boxes only.
 * Sits on the wood bench — not the clamp, vice, plane, gouge, mallet, chisel, file, rasp, awl, shaving, peg, cork, funnel, oilcan, rag, rivet, or wrench.
 */
function paperAdze(x, z, yaw = 0) {
  const g = new THREE.Group();
  g.name = "factory-paper-adze";
  g.userData.kind = "factory-paper-adze";
  g.userData.mode = "PAPER";
  g.userData.part = "adze";
  // Wood-bench top: y0 0.16 + 0.78, top half 0.04.
  const sitY = 0.16 + 0.78 + 0.04;
  g.position.set(x, sitY, z);
  g.rotation.y = yaw;
  const handle = paperBox(0.046, 0.016, 0.016, KRAFT, "factory-paper-adze");
  handle.position.set(-0.012, 0.01, 0);
  const blade = paperBox(0.014, 0.022, 0.032, KRAFT_LIGHT, "factory-paper-adze");
  blade.position.set(0.018, 0.012, 0);
  g.add(handle, blade);
  return g;
}

/**
 * Small kraft/iron PAPER oil can: short box body, thinner spout.
 * Sits on the first workbench top — not a mill, not the hanging wrench.
 */
function oilCan(x, z, yaw = 0) {
  const g = new THREE.Group();
  g.name = "factory-oilcan";
  g.userData.kind = "factory-oilcan";
  g.userData.mode = "PAPER";
  // First workbench lip top: y0 0.16 + 0.78, lip centre +0.05, half lip 0.015.
  const sitY = 0.16 + 0.78 + 0.05 + 0.015;
  g.position.set(x, sitY, z);
  g.rotation.y = yaw;
  const bodyH = 0.15;
  const bodyW = 0.14;
  const bodyD = 0.12;
  const body = paperBox(bodyW, bodyH, bodyD, KRAFT, "factory-oilcan");
  body.position.y = bodyH / 2;
  const spout = paperBox(0.18, 0.03, 0.03, IRON_DARK, "factory-oilcan");
  spout.position.set(bodyW * 0.55, bodyH - 0.005, 0);
  g.add(body, spout);
  return g;
}

/**
 * Small kraft/iron PAPER bucket on the factory floor: tapered kraft body,
 * iron hoop and bail. Boxes/cylinders only — not on the oil can or wrench.
 */
function factoryBucket(x, z, yaw = 0) {
  const g = new THREE.Group();
  g.name = "factory-bucket";
  g.userData.kind = "factory-bucket";
  g.userData.mode = "PAPER";
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  const y0 = 0.16;
  const bodyH = 0.2;
  const body = paperCyl(0.09, 0.11, bodyH, KRAFT, "factory-bucket");
  body.position.y = y0 + bodyH / 2;
  const hoop = paperCyl(0.115, 0.115, 0.028, IRON_DARK, "factory-bucket");
  hoop.position.y = y0 + 0.07;
  const lip = paperCyl(0.1, 0.1, 0.028, IRON, "factory-bucket");
  lip.position.y = y0 + bodyH;
  const postL = paperBox(0.022, 0.11, 0.022, IRON, "factory-bucket");
  postL.position.set(-0.08, y0 + bodyH + 0.04, 0);
  const postR = paperBox(0.022, 0.11, 0.022, IRON, "factory-bucket");
  postR.position.set(0.08, y0 + bodyH + 0.04, 0);
  const bail = paperBox(0.18, 0.022, 0.022, IRON_LIGHT, "factory-bucket");
  bail.position.set(0, y0 + bodyH + 0.1, 0);
  g.add(body, hoop, lip, postL, postR, bail);
  return g;
}

/**
 * Hanging iron open-end wrench on a wall peg. PAPER boxes only —
 * not a mill, not a crate, not a farm rake. Reads from the enter camera.
 */
function hangingWrench(x, y, z, yaw = 0) {
  const g = new THREE.Group();
  g.name = "factory-tool";
  g.userData.kind = "factory-tool";
  g.userData.mode = "PAPER";
  g.userData.part = "wrench";
  g.position.set(x, y, z);
  g.rotation.y = yaw;
  const peg = paperBox(0.06, 0.06, 0.1, IRON_DARK, "factory-tool");
  peg.position.set(0, 0.22, -0.04);
  const handle = paperBox(0.055, 0.42, 0.05, IRON, "factory-tool");
  handle.position.set(0, -0.08, 0);
  const neck = paperBox(0.08, 0.06, 0.06, IRON_LIGHT, "factory-tool");
  neck.position.set(0, 0.16, 0);
  const jaw = paperBox(0.16, 0.08, 0.07, IRON_LIGHT, "factory-tool");
  jaw.position.set(0.02, 0.24, 0);
  const prongA = paperBox(0.05, 0.1, 0.06, IRON, "factory-tool");
  prongA.position.set(0.1, 0.32, 0);
  const prongB = paperBox(0.05, 0.08, 0.06, IRON_RUST, "factory-tool");
  prongB.position.set(-0.04, 0.3, 0);
  g.add(peg, handle, neck, jaw, prongA, prongB);
  return g;
}

function hangingLamp(x, y, z) {
  const g = new THREE.Group();
  g.name = "factory-lamp";
  g.userData.kind = "factory-lamp";
  g.userData.mode = "PAPER";
  const stem = paperBox(0.04, 0.5, 0.04, LAMP_METAL, "factory-lamp");
  stem.position.set(x, y + 0.2, z);
  const shade = paperBox(0.48, 0.14, 0.48, LAMP_METAL, "factory-lamp");
  shade.position.set(x, y - 0.1, z);
  const bulb = paperBox(0.12, 0.08, 0.12, LAMP_BULB, "factory-lamp");
  bulb.position.set(x, y - 0.2, z);
  g.add(stem, shade, bulb);
  return g;
}

function paperMark(x, y, z) {
  const g = new THREE.Group();
  g.name = "factory-paper";
  g.userData.kind = "interior-paper";
  g.userData.mode = "PAPER";
  g.add(paperBox(0.72, 0.28, 0.03, STRAP, "interior-paper"));
  const card = paperBox(0.62, 0.2, 0.02, PAPER_CARD, "interior-paper");
  card.position.z = 0.03;
  g.add(card);
  g.position.set(x, y, z);
  return g;
}

function makeFactoryDress() {
  const g = new THREE.Group();
  g.name = "factory-dress";
  g.userData.kind = "factory-dress";
  g.userData.mode = "PAPER";
  g.userData.provenance = "SIMULATED";

  g.add(workbench(-1.35, -2.48, 2.35, 0.72, 0));
  // Left of the vise on the first bench top. Off the machines (z≈0.6).
  g.add(oilCan(-2.08, -2.36, 0.12));
  // Right of the oil can on the first bench top. Off the floor bucket and hanging wrench.
  g.add(factoryVise(-0.7, -2.34, 0));
  // Between the oil can and vise on the first bench top. Off the floor bucket and hanging wrench.
  g.add(factoryMallet(-1.42, -2.56, 0.18));
  // Right of the vise on the first bench top. Off the oil can, mallet, floor bucket, and hanging wrench.
  g.add(factoryRag(-0.28, -2.68, 0.22));
  // Left-south corner of the first bench. Off the rag, mallet, oil can, vise, floor bucket, and hanging wrench.
  g.add(factoryRivet(-2.42, -2.74, 0.08));
  g.add(workbench(-3.08, 0.15, 2.15, 0.68, Math.PI / 2));
  // Left-wall bench top. Off the rag, rivet, wrench, scrap-bin, and floor grate.
  g.add(paperOilcan(-3.02, 0.72, 0.1));
  // Left-wall bench, south of the oilcan. Off the rag, rivet, and wrench.
  g.add(paperFunnel(-3.14, -0.42, 0.08));
  // Left-wall bench, between the oilcan and funnel. Off the rag.
  g.add(paperCork(-2.86, 0.14, 0.06));
  // Left-wall bench, south of the funnel. Off shaving, peg, cork, oilcan, rag, rivet, wrench.
  g.add(paperAwl(-2.90, -0.90, 0.1));
  g.add(woodWorkbench(3.1, -1.18, 1.92, 0.64, Math.PI / 2));
  // Wood-bench north end. Off the cork, funnel, oilcan, rag, rivet, and wrench.
  g.add(paperPeg(2.96, -0.38, 0.05));
  // Wood-bench, south of the peg. Off cork, funnel, oilcan, rag, rivet, wrench.
  g.add(paperShaving(2.88, -1.35, 0.12));
  // Wood-bench, between peg and shaving toward the wall. Off awl, shaving, peg, cork, funnel, oilcan, rag, rivet, wrench.
  g.add(paperRasp(3.20, -0.90, 0.08));
  // Wood-bench south-west. Off rasp, awl, shaving, peg, cork, funnel, oilcan, rag, rivet, wrench.
  g.add(paperFile(2.80, -1.88, 0.06));
  // Wood-bench mid-east, toward the wall. Off file, rasp, awl, shaving, peg, cork, funnel, oilcan, rag, rivet, wrench.
  g.add(paperChisel(3.38, -1.54, 0.04));
  // Wood-bench north-east. Off chisel, file, rasp, awl, shaving, peg, cork, funnel, oilcan, rag, rivet, wrench.
  // (3.52, -2.10) is past the rotated top and onto the hanging wrench; keep it on the wood.
  g.add(paperMallet(3.36, -0.28, 0.05));
  // Wood-bench mid-east, between rasp and chisel. Off mallet, chisel, file, rasp, awl, shaving, peg, cork, funnel, oilcan, rag, rivet, wrench.
  g.add(paperGouge(3.34, -1.16, 0.06));
  // Wood-bench east, between mallet and rasp. Off gouge, mallet, chisel, file, rasp, awl, shaving, peg, cork, funnel, oilcan, rag, rivet, wrench.
  g.add(paperPlane(3.36, -0.62, 0.07));
  // Wood-bench west, south of peg. Off plane, gouge, mallet, chisel, file, rasp, awl, shaving, peg, cork, funnel, oilcan, rag, rivet, wrench.
  g.add(paperVice(2.88, -0.72, 0.05));
  // Wood-bench south, between shaving and file. Off vice, plane, gouge, mallet, chisel, file, rasp, awl, shaving, peg, cork, funnel, oilcan, rag, rivet, wrench.
  g.add(paperClamp(3.10, -1.72, 0.04));
  // Wood-bench west, between vice and shaving. Off clamp, vice, plane, gouge, mallet, chisel, file, rasp, awl, shaving, peg, cork, funnel, oilcan, rag, rivet, wrench.
  g.add(paperAdze(2.82, -1.08, 0.05));
  // Left wall, opposite the wood bench. Off the centre aisle (x≈0).
  g.add(scrapBin(-3.22, -2.62, 0.08));
  // Right wall, door side. Off the centre aisle (x≈0). Flat on the floor.
  g.add(floorGrate(3.2, 1.48, 0.06));
  // Right wall floor, between wood bench and grate. Not on the oil can or wrench.
  g.add(factoryBucket(3.18, 0.42, 0.1));
  g.add(kraftMachine(-1.42, 0.58, 1.55, 0.9, 0.06));
  g.add(kraftMachine(1.18, 1.32, 1.32, 0.78, -0.1));
  g.add(kraftMachine(0.22, -0.42, 1.48, 0.86, 0.12));
  g.add(anvil(-0.45, -1.22, 0.18));
  g.add(barRack(-3.12, -1.55, Math.PI / 2));
  g.add(barRack(-3.12, 1.85, Math.PI / 2));
  g.add(
    plateStack(0.95, -2.5, 0.08, [
      [0.95, 0.08, 0.72, IRON_DARK],
      [0.88, 0.07, 0.66, IRON, 0.03, -0.02],
      [0.82, 0.07, 0.6, IRON_LIGHT, -0.02, 0.03],
      [0.78, 0.06, 0.56, IRON_RUST, 0.02, -0.01],
    ]),
  );
  g.add(
    plateStack(1.55, 0.25, -0.12, [
      [0.82, 0.08, 0.62, IRON],
      [0.76, 0.07, 0.56, IRON_DARK, 0.02, 0.02],
      [0.7, 0.06, 0.5, IRON_LIGHT, -0.02, -0.02],
    ]),
  );

  const loftY = 2.94;
  g.add(
    plateStack(-2.2, -2.35, 0.06, [
      [0.9, 0.08, 0.7, IRON_DARK],
      [0.84, 0.07, 0.64, IRON],
    ], loftY),
  );
  const loftRack = barRack(0.4, -2.38, 0);
  loftRack.position.y = loftY - 0.16;
  g.add(loftRack);

  g.add(hangingLamp(-0.7, 2.18, -0.35));
  g.add(hangingLamp(1.15, 2.18, 0.45));
  // Right wall, above the wood bench. Off the centre aisle (x≈0).
  g.add(hangingWrench(3.28, 1.52, -2.08, 0));
  g.add(paperMark(-2.15, 1.55, 3.38));

  const postL = paperBox(0.14, 2.45, 0.14, IRON_DARK, "factory-prop");
  postL.position.set(-2.05, 1.38, 1.85);
  const postR = paperBox(0.14, 2.45, 0.14, IRON_DARK, "factory-prop");
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

function tintInterior(interior, factory) {
  interior.traverse((o) => {
    if (o.isLight) {
      remember(o, "_houseIntensity", o.intensity);
      remember(o, "_houseColor", o.color ? o.color.getHex() : null);
      o.intensity = factory ? FACTORY_LIGHT : o.userData._houseIntensity;
      if (o.color) {
        o.color.setHex(factory ? FACTORY_LIGHT_COLOR : o.userData._houseColor);
      }
    }
    if (!o.material || !o.material.color) return;
    if (o.userData?.kind === "interior-wall") {
      remember(o, "_houseColor", o.material.color.getHex());
      const cool = o.geometry?.parameters?.width < 0.3 ? WALL_SIDE_COOL : WALL_COOL;
      o.material.color.setHex(factory ? cool : o.userData._houseColor);
    }
    if (o.userData?.kind === "interior-floor") {
      remember(o, "_houseColor", o.material.color.getHex());
      o.material.color.setHex(factory ? FLOOR_COOL : o.userData._houseColor);
    }
  });
}

function dimSceneLights(scene, factory) {
  if (!scene || !scene.children) return;
  for (const child of scene.children) {
    if (!child.isLight) continue;
    remember(child, "_houseIntensity", child.intensity);
    child.intensity = factory
      ? child.userData._houseIntensity * SCENE_LIGHT_SCALE
      : child.userData._houseIntensity;
  }
  if (scene.background && scene.background.isColor) {
    remember(scene, "_houseBg", scene.background.getHex());
    scene.background.setHex(factory ? FACTORY_BG : scene.userData._houseBg);
  }
}

/**
 * Dress an interior (or a scene that contains one) as a PAPER factory workshop.
 * Hides living-room furniture, adds kraft machines, benches, and iron stock.
 * @param {THREE.Object3D} scene
 */
export function dressFactory(scene) {
  if (!scene) return null;
  const interior = findInterior(scene) || scene;
  interior.userData.mode = "PAPER";
  interior.userData.interiorUse = "factory";
  interior.userData.provenance = "SIMULATED";
  setHouseFurnitureVisible(interior, false);
  tintInterior(interior, true);
  dimSceneLights(scene, true);
  let dress = interior.getObjectByName("factory-dress");
  if (!dress) {
    dress = makeFactoryDress();
    interior.add(dress);
  }
  dress.visible = true;
  return interior;
}

/** Restore the house living room after a factory visit. */
export function undressFactory(scene) {
  if (!scene) return null;
  const interior = findInterior(scene) || scene;
  const dress = interior.getObjectByName("factory-dress");
  if (dress) dress.visible = false;
  setHouseFurnitureVisible(interior, true);
  tintInterior(interior, false);
  dimSceneLights(scene, false);
  interior.userData.interiorUse = "house";
  return interior;
}
