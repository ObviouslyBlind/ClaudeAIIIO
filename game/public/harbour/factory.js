import * as THREE from "three";

/**
 * PAPER factory interior dress. Workbenches, kraft machine boxes, iron
 * stock, cooler light — not the house living room, warehouse crates, shop,
 * or farm. No WASD. Tap-to-walk stays in interior.js.
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
  g.add(workbench(-3.08, 0.15, 2.15, 0.68, Math.PI / 2));
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
