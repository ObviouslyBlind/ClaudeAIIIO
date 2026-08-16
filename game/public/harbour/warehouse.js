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

function crateStack(x, z, yaw, layers, y0 = 0.16) {
  const g = new THREE.Group();
  g.name = "crate-stack";
  g.userData.kind = "warehouse-crate";
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
    g.add(crateBox(w, h, d, color, dx, y + h / 2, dz));
    y += h;
  }
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
  g.add(crateStack(1.55, 0.15, 0.14, low));

  const loftY = 2.94;
  g.add(crateStack(-2.4, -2.35, 0.08, low, loftY));
  g.add(crateStack(-0.7, -2.4, -0.1, mid, loftY));
  g.add(crateStack(1.1, -2.3, 0.06, low, loftY));

  g.add(hangingLamp(-0.4, 2.15, -0.2));
  g.add(hangingLamp(1.8, 2.15, 0.4));
  g.add(paperMark(-2.15, 1.55, 3.38));

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
