import * as THREE from "three";

/**
 * PAPER warehouse interior dress. Crates and dimmer light — not the house
 * living room. No WASD. Tap-to-walk stays in interior.js.
 *
 * Call dressWarehouse(scene) when plot.kind or plot.use is "warehouse".
 * Idempotent: a second call only shows the existing dress.
 */

const WOOD = 0x8a6238;
const WOOD_DARK = 0x7a5230;
const WOOD_LIGHT = 0x9a6a40;
const STRAP = 0x5a3a22;
const FLOOR_DIM = 0x6a4a32;
const WALL_DIM = 0xc4b08a;
const WALL_SIDE_DIM = 0xb8a07c;
const LAMP_METAL = 0x4a4036;
const LAMP_BULB = 0xe8d8a8;
const PAPER_CARD = 0xf3efe4;
const HOUSE_KINDS = new Set(["interior-table", "interior-chair", "interior-bed", "interior-lamp"]);
const WAREHOUSE_LIGHT = 0.42;
const WAREHOUSE_BG = 0x1a1612;
const SCENE_LIGHT_SCALE = 0.32;

export function isWarehousePlot(plot) {
  if (!plot) return false;
  return plot.kind === "warehouse" || plot.use === "warehouse";
}

function paperBox(w, h, d, color, kind = "warehouse-crate") {
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

function crateBox(w, h, d, color, x, y, z) {
  const g = new THREE.Group();
  g.userData.kind = "warehouse-crate";
  g.userData.mode = "PAPER";
  const body = paperBox(w, h, d, color);
  g.add(body);
  const band = paperBox(w + 0.04, 0.05, d + 0.04, STRAP, "warehouse-crate");
  band.position.y = h * 0.08 - h / 2;
  g.add(band);
  const band2 = paperBox(w + 0.04, 0.05, d + 0.04, STRAP, "warehouse-crate");
  band2.position.y = h * 0.42 - h / 2;
  g.add(band2);
  g.position.set(x, y, z);
  return g;
}

function crateStack(x, z, yaw, layers, y0 = 0.16, name = "crate-stack") {
  const g = new THREE.Group();
  g.name = name;
  g.userData.kind = "warehouse-crate";
  g.userData.mode = "PAPER";
  if (name === "warehouse-floor-crate") g.userData.part = "floor-crate";
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
    g.add(crateBox(w, h, d, color, dx, y + h / 2, dz));
    y += h;
  }
  return g;
}

/** Soft kraft grain sack — squat boxes + cinch, not a strapped crate. */
function grainSack(w, h, d, color, x, y, z, yaw = 0) {
  const g = new THREE.Group();
  g.name = "warehouse-sack";
  g.userData.kind = "warehouse-sack";
  g.userData.mode = "PAPER";
  g.position.set(x, y, z);
  g.rotation.y = yaw;
  g.add(paperBox(w, h, d, color, "warehouse-sack"));
  const cinch = paperBox(w * 0.58, 0.07, d * 0.58, STRAP, "warehouse-sack");
  cinch.position.y = h / 2 + 0.01;
  g.add(cinch);
  const neck = paperBox(w * 0.44, 0.14, d * 0.44, color, "warehouse-sack");
  neck.position.y = h / 2 + 0.1;
  g.add(neck);
  return g;
}

/**
 * Small kraft hand-truck / dolly. Wood handles + iron wheels as boxes —
 * not a cylinder cart, not a crate. Parked beside the pallet.
 */
function handTruck(x, z, yaw = 0) {
  const g = new THREE.Group();
  g.name = "warehouse-dolly";
  g.userData.kind = "warehouse-dolly";
  g.userData.mode = "PAPER";
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  const y0 = 0.16;
  const wheelL = paperBox(0.07, 0.14, 0.14, LAMP_METAL, "warehouse-dolly");
  wheelL.position.set(-0.15, y0 + 0.07, 0.04);
  const wheelR = paperBox(0.07, 0.14, 0.14, LAMP_METAL, "warehouse-dolly");
  wheelR.position.set(0.15, y0 + 0.07, 0.04);
  const toe = paperBox(0.36, 0.04, 0.2, WOOD, "warehouse-dolly");
  toe.position.set(0, y0 + 0.1, 0.16);
  const railL = paperBox(0.045, 0.78, 0.045, WOOD_DARK, "warehouse-dolly");
  railL.position.set(-0.11, y0 + 0.48, -0.02);
  const railR = paperBox(0.045, 0.78, 0.045, WOOD_DARK, "warehouse-dolly");
  railR.position.set(0.11, y0 + 0.48, -0.02);
  const brace = paperBox(0.24, 0.04, 0.04, WOOD, "warehouse-dolly");
  brace.position.set(0, y0 + 0.42, -0.02);
  const handleL = paperBox(0.045, 0.045, 0.26, WOOD_LIGHT, "warehouse-dolly");
  handleL.position.set(-0.11, y0 + 0.88, -0.12);
  const handleR = paperBox(0.045, 0.045, 0.26, WOOD_LIGHT, "warehouse-dolly");
  handleR.position.set(0.11, y0 + 0.88, -0.12);
  const grip = paperBox(0.26, 0.045, 0.045, WOOD_LIGHT, "warehouse-dolly");
  grip.position.set(0, y0 + 0.88, -0.24);
  g.add(wheelL, wheelR, toe, railL, railR, brace, handleL, handleR, grip);
  return g;
}

function hangingLamp(x, y, z) {
  const g = new THREE.Group();
  g.name = "warehouse-lamp";
  g.userData.kind = "warehouse-lamp";
  g.userData.mode = "PAPER";
  const stem = paperBox(0.04, 0.55, 0.04, LAMP_METAL, "warehouse-lamp");
  stem.position.set(x, y + 0.22, z);
  const shade = paperBox(0.52, 0.16, 0.52, LAMP_METAL, "warehouse-lamp");
  shade.position.set(x, y - 0.12, z);
  const bulb = paperBox(0.12, 0.08, 0.12, LAMP_BULB, "warehouse-lamp");
  bulb.position.set(x, y - 0.22, z);
  g.add(stem, shade, bulb);
  return g;
}

function paperMark(x, y, z) {
  const g = new THREE.Group();
  g.name = "warehouse-paper";
  g.userData.kind = "interior-paper";
  g.userData.mode = "PAPER";
  g.add(paperBox(0.72, 0.28, 0.03, STRAP, "interior-paper"));
  const card = paperBox(0.62, 0.2, 0.02, PAPER_CARD, "interior-paper");
  card.position.z = 0.03;
  g.add(card);
  g.position.set(x, y, z);
  return g;
}

/**
 * Small iron wall hook — plate + arm + downturned tip, optional rope loop
 * and a tiny hanging sack. PAPER boxes only. Not a crate, not a lamp.
 */
/**
 * Kraft clipboard on the wall — wood board, cream sheet, strap clip.
 * PAPER boxes only. Not a crate, not the door paper mark.
 */
function wallClipboard(x, y, z, yaw = 0) {
  const g = new THREE.Group();
  g.name = "warehouse-clipboard";
  g.userData.kind = "warehouse-clipboard";
  g.userData.mode = "PAPER";
  g.position.set(x, y, z);
  g.rotation.y = yaw;
  const board = paperBox(0.36, 0.48, 0.03, WOOD, "warehouse-clipboard");
  const sheet = paperBox(0.3, 0.38, 0.02, PAPER_CARD, "warehouse-clipboard");
  sheet.position.set(0, -0.02, 0.025);
  const clip = paperBox(0.2, 0.07, 0.05, WOOD_DARK, "warehouse-clipboard");
  clip.position.set(0, 0.18, 0.04);
  const jaw = paperBox(0.08, 0.04, 0.04, STRAP, "warehouse-clipboard");
  jaw.position.set(0, 0.2, 0.07);
  const nail = paperBox(0.035, 0.035, 0.04, STRAP, "warehouse-clipboard");
  nail.position.set(0, 0.26, 0.01);
  g.add(board, sheet, clip, jaw, nail);
  return g;
}

/**
 * Kraft broom leaning on the wall — wood stick + bristle block.
 * PAPER boxes only. Not a crate, not a hook.
 */
function kraftBroom(x, z, yaw = 0) {
  const g = new THREE.Group();
  g.name = "warehouse-broom";
  g.userData.kind = "warehouse-broom";
  g.userData.mode = "PAPER";
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  // Lean the stick toward the +X wall.
  g.rotation.z = -0.38;
  const y0 = 0.16;
  const stick = paperBox(0.045, 1.1, 0.045, WOOD, "warehouse-broom");
  stick.position.set(0, y0 + 0.65, 0);
  const bristles = paperBox(0.26, 0.2, 0.1, WOOD_DARK, "warehouse-broom");
  bristles.position.set(0, y0 + 0.1, 0);
  g.add(stick, bristles);
  return g;
}

/**
 * Small kraft hanging lantern — wood bail + warm cream glass box.
 * PAPER boxes only. Not a crate, not the iron hanging lamp.
 */
function kraftLantern(x, y, z) {
  const g = new THREE.Group();
  g.name = "warehouse-lantern";
  g.userData.kind = "warehouse-lantern";
  g.userData.mode = "PAPER";
  g.position.set(x, y, z);
  const cord = paperBox(0.03, 0.22, 0.03, WOOD_DARK, "warehouse-lantern");
  cord.position.y = 0.2;
  const bail = paperBox(0.12, 0.03, 0.03, WOOD, "warehouse-lantern");
  bail.position.y = 0.08;
  const hood = paperBox(0.16, 0.04, 0.16, WOOD, "warehouse-lantern");
  hood.position.y = 0.04;
  const glass = paperBox(0.12, 0.14, 0.12, LAMP_BULB, "warehouse-lantern");
  glass.position.y = -0.06;
  const base = paperBox(0.14, 0.03, 0.14, WOOD, "warehouse-lantern");
  base.position.y = -0.145;
  g.add(cord, bail, hood, glass, base);
  return g;
}


/**
 * Small kraft shipping pallet on the floor — wood stringers + deck slats.
 * PAPER boxes only. Not a crate, not the rope coil.
 */
function kraftPallet(x, z, yaw = 0) {
  const g = new THREE.Group();
  g.name = "warehouse-pallet";
  g.userData.kind = "warehouse-pallet";
  g.userData.mode = "PAPER";
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  const y0 = 0.16;
  const stringerL = paperBox(0.72, 0.06, 0.08, WOOD_DARK, "warehouse-pallet");
  stringerL.position.set(0, y0 + 0.03, -0.22);
  const stringerC = paperBox(0.72, 0.06, 0.08, WOOD_DARK, "warehouse-pallet");
  stringerC.position.set(0, y0 + 0.03, 0);
  const stringerR = paperBox(0.72, 0.06, 0.08, WOOD_DARK, "warehouse-pallet");
  stringerR.position.set(0, y0 + 0.03, 0.22);
  const slatA = paperBox(0.1, 0.04, 0.56, WOOD, "warehouse-pallet");
  slatA.position.set(-0.28, y0 + 0.08, 0);
  const slatB = paperBox(0.1, 0.04, 0.56, WOOD_LIGHT, "warehouse-pallet");
  slatB.position.set(-0.1, y0 + 0.08, 0);
  const slatC = paperBox(0.1, 0.04, 0.56, WOOD, "warehouse-pallet");
  slatC.position.set(0.1, y0 + 0.08, 0);
  const slatD = paperBox(0.1, 0.04, 0.56, WOOD_LIGHT, "warehouse-pallet");
  slatD.position.set(0.28, y0 + 0.08, 0);
  g.add(stringerL, stringerC, stringerR, slatA, slatB, slatC, slatD);
  return g;
}

/**
 * Small kraft rope coil on the floor — short stack of squat boxes, not a
 * crate and not a new grey. PAPER boxes only (helpers already in this file).
 */
function kraftCoil(x, z, yaw = 0) {
  const g = new THREE.Group();
  g.name = "warehouse-coil";
  g.userData.kind = "warehouse-coil";
  g.userData.mode = "PAPER";
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  const y0 = 0.16;
  const outer = paperBox(0.36, 0.1, 0.36, WOOD, "warehouse-coil");
  outer.position.set(0, y0 + 0.05, 0);
  const mid = paperBox(0.28, 0.08, 0.28, WOOD_DARK, "warehouse-coil");
  mid.position.set(0, y0 + 0.12, 0);
  const core = paperBox(0.12, 0.05, 0.12, STRAP, "warehouse-coil");
  core.position.set(0, y0 + 0.175, 0);
  const tail = paperBox(0.06, 0.04, 0.16, WOOD_LIGHT, "warehouse-coil");
  tail.position.set(0.14, y0 + 0.04, 0.12);
  g.add(outer, mid, core, tail);
  return g;
}

function wallHook(x, y, z, yaw = 0) {
  const g = new THREE.Group();
  g.name = "warehouse-hook";
  g.userData.kind = "warehouse-hook";
  g.userData.mode = "PAPER";
  g.position.set(x, y, z);
  g.rotation.y = yaw;
  const plate = paperBox(0.14, 0.18, 0.04, LAMP_METAL, "warehouse-hook");
  const arm = paperBox(0.045, 0.045, 0.18, LAMP_METAL, "warehouse-hook");
  arm.position.set(0, 0.02, 0.1);
  const tip = paperBox(0.045, 0.12, 0.045, LAMP_METAL, "warehouse-hook");
  tip.position.set(0, -0.04, 0.18);
  const loopTop = paperBox(0.07, 0.04, 0.05, STRAP, "warehouse-hook");
  loopTop.position.set(0, -0.12, 0.18);
  const loopL = paperBox(0.035, 0.14, 0.035, STRAP, "warehouse-hook");
  loopL.position.set(-0.055, -0.2, 0.18);
  const loopR = paperBox(0.035, 0.14, 0.035, STRAP, "warehouse-hook");
  loopR.position.set(0.055, -0.2, 0.18);
  const loopBot = paperBox(0.14, 0.035, 0.035, STRAP, "warehouse-hook");
  loopBot.position.set(0, -0.28, 0.18);
  const sack = paperBox(0.16, 0.2, 0.13, WOOD, "warehouse-hook");
  sack.position.set(0, -0.4, 0.18);
  const cinch = paperBox(0.09, 0.04, 0.08, STRAP, "warehouse-hook");
  cinch.position.set(0, -0.29, 0.18);
  g.add(plate, arm, tip, loopTop, loopL, loopR, loopBot, sack, cinch);
  return g;
}

function makeWarehouseDress() {
  const g = new THREE.Group();
  g.name = "warehouse-dress";
  g.userData.kind = "warehouse-dress";
  g.userData.mode = "PAPER";
  g.userData.provenance = "SIMULATED";

  const low = [
    [1.05, 0.72, 0.95, WOOD],
    [0.92, 0.58, 0.82, WOOD_DARK, 0.04, -0.04],
  ];
  const mid = [
    [1.18, 0.82, 1.05, WOOD_DARK],
    [0.88, 0.62, 0.78, WOOD_LIGHT, -0.06, 0.05],
    [0.7, 0.48, 0.62, WOOD, 0.08, -0.04],
  ];
  const long = [
    [1.35, 0.7, 0.88, WOOD],
    [1.22, 0.7, 0.8, WOOD_DARK],
  ];
  const floorA = [
    [1.22, 0.92, 1.08, WOOD_LIGHT],
    [0.95, 0.62, 0.85, WOOD, -0.05, 0.04],
  ];
  const floorB = [[1.12, 0.85, 0.98, WOOD]];
  const floorC = [
    [1.05, 0.78, 0.92, WOOD_DARK],
    [0.82, 0.52, 0.72, WOOD_LIGHT, 0.04, -0.03],
  ];
  const floorD = [[1.18, 0.88, 1.02, WOOD]];
  const pallet = [
    [1.02, 0.16, 0.78, WOOD_LIGHT],
    [0.78, 0.48, 0.62, WOOD, 0.05, -0.04],
  ];

  g.add(crateStack(-2.85, -2.52, 0.06, mid));
  g.add(crateStack(-1.35, -2.58, -0.08, low));
  g.add(crateStack(0.25, -2.5, 0.1, mid));
  g.add(crateStack(1.75, -2.55, -0.05, low));
  g.add(crateStack(3.15, -2.42, 0.12, long));
  g.add(crateStack(-3.32, -0.75, 0.42, mid));
  g.add(crateStack(-3.28, 0.85, 0.38, low));
  g.add(crateStack(-3.18, 2.15, 0.18, long));
  g.add(crateStack(3.32, -0.55, -0.28, mid));
  g.add(crateStack(3.22, 1.05, -0.22, low));

  // Open downstairs floor, in the enter-camera cone (player at 0, 1.6 looking −Z).
  g.add(crateStack(-1.35, -0.45, 0.08, floorA, 0.16, "warehouse-floor-crate"));
  g.add(crateStack(1.12, 0.05, -0.12, floorB, 0.16, "warehouse-floor-crate"));
  g.add(crateStack(-0.42, -1.72, 0.14, floorC, 0.16, "warehouse-floor-crate"));
  g.add(crateStack(1.28, -1.48, -0.06, floorD, 0.16, "warehouse-floor-crate"));
  // Left of the enter aisle (player at 0, 1.6), clear of the door at +Z.
  g.add(crateStack(-1.92, 0.75, 0.1, pallet, 0.16));
  // Two kraft grain sacks on/beside that pallet. Aisle at x≈0 stays open.
  g.add(grainSack(0.42, 0.5, 0.34, WOOD_LIGHT, -2.08, 0.41, 0.28, 0.16));
  g.add(grainSack(0.38, 0.46, 0.32, WOOD, -1.72, 0.39, 0.16, -0.2));
  // Small kraft dolly beside that pallet, still left of the aisle.
  g.add(handTruck(-2.22, 1.28, 0.48));

  const loftY = 2.94;
  g.add(crateStack(-2.4, -2.35, 0.08, low, loftY));
  g.add(crateStack(-0.7, -2.4, -0.1, mid, loftY));
  g.add(crateStack(1.1, -2.3, 0.06, low, loftY));

  g.add(hangingLamp(-0.4, 2.15, -0.2));
  g.add(hangingLamp(1.8, 2.15, 0.4));
  g.add(paperMark(-2.15, 1.55, 3.38));
  // Iron hook on the back wall, in the gap between the low and mid stacks.
  g.add(wallHook(-0.58, 1.62, -3.38));
  // Kraft clipboard on the back wall, in the gap between the mid and low stacks.
  g.add(wallClipboard(1.02, 1.58, -3.38));
  // Kraft broom leaning on the right wall, in the gap between the mid and low stacks.
  g.add(kraftBroom(3.32, -1.52));
  // Small kraft hanging lantern off the left post — wood bail + cream glass.
  // Clear of the back-wall clipboard/hook and the right-wall broom.
  g.add(kraftLantern(-1.88, 2.32, 1.85));
  // Small kraft rope coil on the downstairs floor, right of the aisle.
  // Clear of floor crates, broom, lantern, clipboard, and hook.
  g.add(kraftCoil(1.58, 1.48, 0.22));
  // Small kraft pallet on the downstairs floor, left of the aisle toward the door.
  // Clear of floor crates, coil, broom, lantern, clipboard, and hook.
  g.add(kraftPallet(-0.12, 2.18, 0.14));

  const postL = paperBox(0.16, 2.45, 0.16, STRAP, "warehouse-prop");
  postL.position.set(-2.05, 1.38, 1.85);
  const postR = paperBox(0.16, 2.45, 0.16, STRAP, "warehouse-prop");
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

function tintInterior(interior, warehouse) {
  interior.traverse((o) => {
    if (o.isLight) {
      remember(o, "_houseIntensity", o.intensity);
      remember(o, "_houseColor", o.color ? o.color.getHex() : null);
      o.intensity = warehouse ? WAREHOUSE_LIGHT : o.userData._houseIntensity;
      if (o.color) {
        o.color.setHex(warehouse ? 0xc8b890 : o.userData._houseColor);
      }
    }
    if (!o.material || !o.material.color) return;
    if (o.userData?.kind === "interior-wall") {
      remember(o, "_houseColor", o.material.color.getHex());
      const dim = o.geometry?.parameters?.width < 0.3 ? WALL_SIDE_DIM : WALL_DIM;
      o.material.color.setHex(warehouse ? dim : o.userData._houseColor);
    }
    if (o.userData?.kind === "interior-floor") {
      remember(o, "_houseColor", o.material.color.getHex());
      o.material.color.setHex(warehouse ? FLOOR_DIM : o.userData._houseColor);
    }
  });
}

function dimSceneLights(scene, warehouse) {
  if (!scene || !scene.children) return;
  for (const child of scene.children) {
    if (!child.isLight) continue;
    remember(child, "_houseIntensity", child.intensity);
    child.intensity = warehouse
      ? child.userData._houseIntensity * SCENE_LIGHT_SCALE
      : child.userData._houseIntensity;
  }
  if (scene.background && scene.background.isColor) {
    remember(scene, "_houseBg", scene.background.getHex());
    scene.background.setHex(warehouse ? WAREHOUSE_BG : scene.userData._houseBg);
  }
}

/**
 * Dress an interior (or a scene that contains one) as a PAPER warehouse.
 * Hides living-room furniture, adds crate stacks, dims lights.
 * @param {THREE.Object3D} scene
 */
export function dressWarehouse(scene) {
  if (!scene) return null;
  const interior = findInterior(scene) || scene;
  interior.userData.mode = "PAPER";
  interior.userData.interiorUse = "warehouse";
  interior.userData.provenance = "SIMULATED";
  setHouseFurnitureVisible(interior, false);
  tintInterior(interior, true);
  dimSceneLights(scene, true);
  let dress = interior.getObjectByName("warehouse-dress");
  if (!dress) {
    dress = makeWarehouseDress();
    interior.add(dress);
  }
  dress.visible = true;
  return interior;
}

/** Restore the house living room after a warehouse visit. */
export function undressWarehouse(scene) {
  if (!scene) return null;
  const interior = findInterior(scene) || scene;
  const dress = interior.getObjectByName("warehouse-dress");
  if (dress) dress.visible = false;
  setHouseFurnitureVisible(interior, true);
  tintInterior(interior, false);
  dimSceneLights(scene, false);
  interior.userData.interiorUse = "house";
  return interior;
}
