import * as THREE from "three";
import { dressWindowLights } from "./window-lights.js";

/**
 * PAPER placeholder buildings. Pitched roofs, warm walls — not grey cubes.
 * Keep FALLBACK_CATALOG in sync with game/src/buildings.ts.
 */

export const BUILDING_IDS = ["house", "shop", "house_shop", "farm", "warehouse", "factory"];

export const FALLBACK_CATALOG = [
  { id: "house", label: "House", paperCost: 40, provenance: "PAPER" },
  { id: "shop", label: "Shop", paperCost: 55, provenance: "PAPER" },
  { id: "house_shop", label: "House with shop", paperCost: 80, provenance: "PAPER" },
  { id: "farm", label: "Small farm", paperCost: 40, provenance: "PAPER" },
  { id: "warehouse", label: "Warehouse", paperCost: 120, provenance: "PAPER" },
  { id: "factory", label: "Factory", paperCost: 180, provenance: "PAPER" },
];

const WOOD = 0x5a3a22;
const STONE = 0x9a8a72;
const FRAME = 0x3d2a1c;
const GLASS = 0x8ec4d4;
const DOOR = 0x4a3220;
const AWNING_A = 0xc45c3a;
const AWNING_B = 0xf4ead8;
const BRICK = 0x8a6a55;
/** Same cream as cottage walls / awning stripes — PAPER kraft, not a new hex. */
const KRAFT = 0xf4ead8;
const CROP = [0x5f8a32, 0x7a9a3a, 0x4e7a28];

function part(w, h, d, color, shadow = true) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

function gableEnd(w, h, color) {
  const geo = new THREE.BufferGeometry();
  const hw = w / 2;
  geo.setAttribute("position", new THREE.Float32BufferAttribute([-hw, 0, 0, hw, 0, 0, 0, h, 0], 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide }));
}

function windowPane(g, x, y, z, w = 1.05, h = 0.9, face = "+z") {
  const alongZ = face === "+z" || face === "-z";
  const n = face === "+z" || face === "+x" ? 1 : -1;
  if (alongZ) {
    const frame = part(w + 0.16, h + 0.16, 0.08, FRAME, false);
    frame.position.set(x, y, z);
    const glass = part(w, h, 0.06, GLASS, false);
    glass.position.set(x, y, z + n * 0.04);
    const sill = part(w + 0.28, 0.08, 0.18, STONE, false);
    sill.position.set(x, y - h / 2 - 0.08, z + n * 0.06);
    g.add(frame, glass, sill);
  } else {
    const frame = part(0.08, h + 0.16, w + 0.16, FRAME, false);
    frame.position.set(x, y, z);
    const glass = part(0.06, h, w, GLASS, false);
    glass.position.set(x + n * 0.04, y, z);
    const sill = part(0.18, 0.08, w + 0.28, STONE, false);
    sill.position.set(x + n * 0.06, y - h / 2 - 0.08, z);
    g.add(frame, glass, sill);
  }
}

/** Two sloped planes + gables + fascia so the eaves read from spawn. */
function addPitchedRoof(g, W, D, wallTop, wall, roof, rake = 1.55) {
  const overW = 1.45;
  const overD = 0.55;
  const left = part(W + overW, 0.14, D * 0.62 + overD, roof, false);
  left.rotation.x = 0.48;
  left.userData.roof = true;
  left.position.set(0, wallTop + 0.72, -D * 0.22);
  const right = part(W + overW, 0.14, D * 0.62 + overD, roof, false);
  right.rotation.x = -0.48;
  right.userData.roof = true;
  right.position.set(0, wallTop + 0.72, D * 0.22);
  g.add(left, right);
  const gA = gableEnd(D, rake, wall);
  gA.rotation.y = Math.PI / 2;
  gA.position.set(-W / 2 - 0.01, wallTop, 0);
  const gB = gableEnd(D, rake, wall);
  gB.rotation.y = -Math.PI / 2;
  gB.position.set(W / 2 + 0.01, wallTop, 0);
  g.add(gA, gB);
  const ridge = part(W + overW + 0.12, 0.12, 0.22, roof, false);
  ridge.position.y = wallTop + rake - 0.08;
  g.add(ridge);
  const fasciaF = part(W + overW, 0.2, 0.12, WOOD, false);
  fasciaF.position.set(0, wallTop + 0.28, D / 2 + 0.42);
  const fasciaB = part(W + overW, 0.2, 0.12, WOOD, false);
  fasciaB.position.set(0, wallTop + 0.28, -D / 2 - 0.42);
  g.add(fasciaF, fasciaB);
  const bargeL = part(0.12, 0.18, D + 0.7, WOOD, false);
  bargeL.position.set(-W / 2 - 0.62, wallTop + rake * 0.42, 0);
  const bargeR = part(0.12, 0.18, D + 0.7, WOOD, false);
  bargeR.position.set(W / 2 + 0.62, wallTop + rake * 0.42, 0);
  g.add(bargeL, bargeR);
}

function tagPaper(mesh, partName) {
  mesh.userData.part = partName;
  mesh.userData.mode = "PAPER";
  return mesh;
}

/**
 * Brick stack with kraft flashing/cap so a House reads as a building, not a lid.
 * Short darker brick pot/cap on top so the stack is not a flat brick stub.
 * Optional tiny side stack for warehouse roofs.
 */
function addChimney(g, x, baseY, z, h = 1.85, tinyStack = false) {
  const chimney = new THREE.Group();
  chimney.name = "chimney";
  chimney.userData.part = "chimney";
  chimney.userData.mode = "PAPER";
  chimney.position.set(x, baseY, z);

  const stack = tagPaper(part(0.7, h, 0.7, BRICK), "chimney");
  stack.position.set(0, h / 2, 0);
  const flash = tagPaper(part(0.94, 0.14, 0.94, KRAFT, false), "chimney");
  flash.position.set(0, 0.16, 0);
  const course = tagPaper(part(0.78, 0.1, 0.78, KRAFT, false), "chimney");
  course.position.set(0, h * 0.58, 0);
  const cap = tagPaper(part(0.88, 0.12, 0.88, KRAFT, false), "chimney");
  cap.position.set(0, h + 0.04, 0);
  const potCap = tagPaper(part(0.8, 0.2, 0.8, BRICK, false), "chimney");
  potCap.position.set(0, h + 0.2, 0);
  const pot = tagPaper(part(0.26, 0.34, 0.26, BRICK, false), "chimney");
  pot.position.set(-0.12, h + 0.46, 0);
  chimney.add(stack, flash, course, cap, potCap, pot);

  if (tinyStack) {
    const tiny = tagPaper(part(0.34, h * 0.55, 0.34, BRICK, false), "stack");
    tiny.position.set(0.52, h * 0.28, 0.06);
    const tinyCap = tagPaper(part(0.42, 0.08, 0.42, KRAFT, false), "stack");
    tinyCap.position.set(0.52, h * 0.55 + 0.04, 0.06);
    chimney.add(tiny, tinyCap);
  } else {
    const potB = tagPaper(part(0.2, 0.26, 0.2, KRAFT, false), "stack");
    potB.position.set(0.14, h + 0.42, 0);
    chimney.add(potB);
  }

  g.add(chimney);
}

function addSteps(g, x, zFace, width = 1.55, treads = 3) {
  for (let i = 0; i < treads; i++) {
    const tread = part(width + i * 0.14, 0.15, 0.4, STONE, false);
    tread.position.set(x, 0.1 + i * 0.15, zFace + 0.28 + (treads - 1 - i) * 0.36);
    g.add(tread);
  }
}

/**
 * Kraft PAPER stoop past the stone treads so a House reads as entered from
 * the street, not a door in a wall. Original KRAFT — not a new hex.
 * Short kraft wood rail (two posts + one rail) on the street edge so the
 * stoop is not a bare plank. Original WOOD — already in this file.
 */
function addPorch(g, x, zFace, width = 2.2) {
  const porch = new THREE.Group();
  porch.name = "porch";
  porch.userData.mode = "PAPER";

  const slab = tagPaper(part(width, 0.1, 0.95, KRAFT, false), "porch");
  slab.position.set(x, 0.05, zFace + 1.72);
  const lip = tagPaper(part(width + 0.1, 0.12, 0.16, KRAFT, false), "doorstep");
  lip.position.set(x, 0.07, zFace + 2.16);
  const postH = 0.62;
  const postY = 0.1 + postH / 2;
  const postZ = zFace + 2.08;
  const inset = 0.12;
  const postL = tagPaper(part(0.08, postH, 0.08, WOOD, false), "rail");
  postL.position.set(x - width / 2 + inset, postY, postZ);
  const postR = tagPaper(part(0.08, postH, 0.08, WOOD, false), "rail");
  postR.position.set(x + width / 2 - inset, postY, postZ);
  const rail = tagPaper(part(width - inset * 2, 0.07, 0.06, WOOD, false), "rail");
  rail.position.set(x, 0.1 + 0.48, postZ);
  porch.add(slab, lip, postL, postR, rail);
  g.add(porch);
}

function addDoor(g, x, y, z, w, h) {
  const surround = part(w + 0.28, h + 0.22, 0.08, WOOD, false);
  surround.position.set(x, y, z);
  const leaf = part(w, h, 0.1, DOOR, false);
  leaf.position.set(x, y, z + 0.04);
  const handle = part(0.08, 0.08, 0.12, 0xc4a574, false);
  handle.position.set(x + w * 0.28, y, z + 0.12);
  const lintel = part(w + 0.48, 0.14, 0.16, WOOD, false);
  lintel.position.set(x, y + h / 2 + 0.16, z + 0.02);
  g.add(surround, leaf, handle, lintel);
}

function addShopAwning(g, W, D, y) {
  for (const px of [-W * 0.4, W * 0.4]) {
    const post = part(0.16, y - 0.15, 0.16, WOOD, false);
    post.position.set(px, (y - 0.15) / 2, D / 2 + 1.95);
    g.add(post);
  }
  const n = 6;
  const stripW = (W * 0.92) / n;
  for (let i = 0; i < n; i++) {
    const strip = part(stripW - 0.04, 0.07, 1.95, i % 2 ? AWNING_B : AWNING_A, false);
    strip.position.set(-W * 0.46 + stripW * (i + 0.5), y, D / 2 + 1.12);
    strip.rotation.x = 0.28;
    strip.userData.roof = true;
    g.add(strip);
  }
  const valanceN = 7;
  for (let i = 0; i < valanceN; i++) {
    const flap = part(W * 0.1, 0.28, 0.08, i % 2 ? AWNING_B : AWNING_A, false);
    flap.position.set(-W * 0.42 + i * ((W * 0.84) / (valanceN - 1)), y - 0.42, D / 2 + 1.92);
    g.add(flap);
  }
  const bar = part(W * 0.94, 0.08, 0.08, WOOD, false);
  bar.position.set(0, y - 0.18, D / 2 + 1.98);
  g.add(bar);
}

/**
 * Small kraft board in a wood frame on the shop front so a Shop reads as a
 * shop, not only an awning. Original KRAFT / WOOD — not a new hex.
 */
function addShopSign(g, x, y, zFace) {
  const board = new THREE.Group();
  board.name = "shop-sign";
  board.userData.part = "sign";
  board.userData.mode = "PAPER";

  const frame = tagPaper(part(1.48, 0.52, 0.08, WOOD, false), "sign");
  frame.position.set(x, y, zFace + 0.12);
  const face = tagPaper(part(1.28, 0.36, 0.04, KRAFT, false), "sign");
  face.position.set(x, y, zFace + 0.18);
  const pegL = tagPaper(part(0.07, 0.07, 0.2, WOOD, false), "sign");
  pegL.position.set(x - 0.46, y + 0.18, zFace + 0.06);
  const pegR = tagPaper(part(0.07, 0.07, 0.2, WOOD, false), "sign");
  pegR.position.set(x + 0.46, y + 0.18, zFace + 0.06);
  board.add(frame, face, pegL, pegR);
  g.add(board);
}

function cottage(kind) {
  const g = new THREE.Group();
  const shop = kind === "shop";
  const shed = kind === "shed";
  const wall = shop ? 0xe8d7b8 : shed ? 0xe4d2b0 : 0xf4ead8;
  const roof = shop ? 0x7a2e22 : shed ? 0x6b3a22 : 0x6e4a32;
  const W = shop ? 8.8 : shed ? 4.2 : 6.4;
  const D = shop ? 6.8 : shed ? 3.6 : 5.2;
  const H = shop ? 3.35 : shed ? 2.15 : 2.55;
  const plinth = part(W + 0.55, 0.38, D + 0.75, STONE, false);
  plinth.position.y = 0.19;
  g.add(plinth);
  const walls = part(W, H, D, wall);
  walls.position.y = 0.38 + H / 2;
  g.add(walls);
  for (const sx of [-1, 1]) {
    const quoin = part(0.16, H + 0.08, 0.16, 0xd9cbb3, false);
    quoin.position.set(sx * (W / 2 - 0.02), 0.38 + H / 2, D / 2 + 0.02);
    g.add(quoin);
  }
  addPitchedRoof(g, W, D, 0.38 + H, wall, roof, shed ? 1.15 : 1.55);
  addChimney(g, -W * 0.34, 0.38 + H + (shed ? 0.28 : 0.42), -D * 0.06, shed ? 1.2 : 1.9);
  addDoor(g, -W * 0.12, shed ? 1.15 : 1.42, D / 2 + 0.08, shed ? 0.85 : 1.05, shed ? 1.55 : 1.95);
  addSteps(g, -W * 0.12, D / 2, shed ? 1.2 : 1.55, shed ? 2 : 3);
  if (!shop && !shed) addPorch(g, -W * 0.12, D / 2, 2.2);
  if (shop) {
    windowPane(g, W * 0.34, 1.9, D / 2 + 0.08, 1.55, 1.35);
    windowPane(g, -W * 0.42, 1.9, D / 2 + 0.08, 1.45, 1.35);
    windowPane(g, W * 0.12, 2.15, -D / 2 - 0.08, 0.9, 0.8, "-z");
    windowPane(g, W / 2 + 0.08, 2.1, 0, 0.9, 0.8, "+x");
  } else {
    windowPane(g, W * 0.28, shed ? 1.7 : 2.15, D / 2 + 0.08, shed ? 0.7 : 1.05, shed ? 0.7 : 0.9);
    if (!shed) {
      windowPane(g, -W * 0.38, 2.15, D / 2 + 0.08, 0.85, 0.8);
      windowPane(g, W * 0.12, 2.05, -D / 2 - 0.08, 0.9, 0.8, "-z");
      windowPane(g, W / 2 + 0.08, 2.05, 0, 0.85, 0.75, "+x");
    }
  }
  if (shop) {
    addShopAwning(g, W, D, 2.72);
    addShopSign(g, W * 0.08, 3.28, D / 2);
    for (let i = 0; i < 4; i++) {
      const crate = part(0.7, 0.55, 0.7, i % 2 ? 0x8a6238 : 0x7a5230, false);
      crate.position.set(W * 0.44 - i * 0.82, 0.65, D / 2 + 1.42);
      g.add(crate);
    }
    const barrel = part(0.55, 0.7, 0.55, 0x6a4a2a, false);
    barrel.position.set(-W * 0.42, 0.72, D / 2 + 1.55);
    g.add(barrel);
  }
  return g;
}

function stallMesh() {
  const g = new THREE.Group();
  const W = 5.6;
  const D = 3.8;
  const deck = part(W + 0.4, 0.22, D + 0.5, 0xc4a574, false);
  deck.position.y = 0.22;
  g.add(deck);
  const back = part(W, 2.35, 0.18, 0xe8d7b8);
  back.position.set(0, 1.4, -D / 2 + 0.1);
  const sideL = part(0.16, 2.15, D * 0.85, 0xe4d2b0);
  sideL.position.set(-W / 2 + 0.08, 1.3, -0.15);
  const sideR = sideL.clone();
  sideR.position.x = W / 2 - 0.08;
  g.add(back, sideL, sideR);
  const counter = part(W * 0.92, 0.85, 0.55, WOOD);
  counter.position.set(0, 0.85, D / 2 - 0.15);
  g.add(counter);
  addPitchedRoof(g, W, D * 0.72, 2.55, 0xe8d7b8, 0x7a2e22, 1.2);
  addShopAwning(g, W, D, 2.45);
  addSteps(g, 0, D / 2, 1.7, 2);
  addChimney(g, -W * 0.32, 2.7, -D * 0.18, 1.05);
  addShopSign(g, 0, 2.85, D / 2);
  for (let i = 0; i < 3; i++) {
    const crate = part(0.65, 0.5, 0.65, i % 2 ? 0x8a6238 : 0x7a5230, false);
    crate.position.set(-1.4 + i * 1.15, 1.5, 0.35);
    g.add(crate);
  }
  windowPane(g, 0.9, 1.85, -D / 2 + 0.22, 1.1, 0.85);
  return g;
}

function houseShopMesh() {
  const g = new THREE.Group();
  const house = cottage("house");
  house.position.x = -3.6;
  const shop = cottage("shop");
  shop.position.x = 5.2;
  g.add(house, shop);
  const link = part(2.4, 2.2, 3.2, 0xead9c0);
  link.position.set(1.1, 1.5, 0);
  g.add(link);
  const linkRoof = part(2.9, 0.12, 2.2, 0x7a2e22, false);
  linkRoof.rotation.x = 0.42;
  linkRoof.userData.roof = true;
  linkRoof.position.set(1.1, 2.92, -0.38);
  const linkRoofB = part(2.9, 0.12, 2.2, 0x7a2e22, false);
  linkRoofB.rotation.x = -0.42;
  linkRoofB.userData.roof = true;
  linkRoofB.position.set(1.1, 2.92, 0.38);
  g.add(linkRoof, linkRoofB);
  const fascia = part(2.95, 0.16, 0.1, WOOD, false);
  fascia.position.set(1.1, 2.55, 1.55);
  g.add(fascia);
  addSteps(g, 1.1, 1.6, 1.4, 2);
  addChimney(g, 1.1, 2.85, -0.4, 1.2);
  return g;
}

function addCropRow(g, z, span, i) {
  const soil = part(span, 0.16, 0.72, i % 2 ? 0x6b4a28 : 0x7a5a28, false);
  soil.position.set(0, 0.08, z);
  g.add(soil);
  const cropH = 0.28 + (i % 3) * 0.32;
  const crop = part(span * 0.9, cropH, 0.38, CROP[i % 3], false);
  crop.position.set(0, 0.16 + cropH / 2, z);
  g.add(crop);
  const clumps = 4 + (i % 2);
  for (let c = 0; c < clumps; c++) {
    const puff = part(0.42, cropH * 0.55, 0.42, CROP[(i + c) % 3], false);
    puff.position.set(-span * 0.38 + c * ((span * 0.76) / Math.max(1, clumps - 1)), 0.16 + cropH + 0.12, z);
    g.add(puff);
  }
}

function farmMesh(area) {
  const g = new THREE.Group();
  const span = Math.min(16, Math.sqrt(area) * 0.48);
  const rows = 8;
  for (let i = 0; i < rows; i++) {
    addCropRow(g, -span * 0.38 + i * 1.05, span, i);
  }
  const path = part(1.15, 0.08, span * 0.95, 0x8a6a48, false);
  path.position.set(span * 0.18, 0.05, 0);
  g.add(path);
  for (let i = -3; i <= 3; i++) {
    const post = part(0.12, 1.15, 0.12, WOOD, false);
    post.position.set(-span * 0.52, 0.58, i * 1.15);
    const postB = post.clone();
    postB.position.x = span * 0.52;
    g.add(post, postB);
  }
  for (const x of [-span * 0.52, span * 0.52]) {
    const rail = part(0.08, 0.1, 7.4, 0x6a4a2a, false);
    rail.position.set(x, 0.72, 0);
    const railB = part(0.08, 0.1, 7.4, 0x6a4a2a, false);
    railB.position.set(x, 0.42, 0);
    g.add(rail, railB);
  }
  const tank = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.55, 1.4, 8),
    new THREE.MeshLambertMaterial({ color: 0x6a8a74 }),
  );
  tank.position.set(span * 0.38, 0.8, span * 0.28);
  tank.castShadow = true;
  g.add(tank);
  const trough = part(1.8, 0.35, 0.55, 0x6a4a2a, false);
  trough.position.set(span * 0.22, 0.28, span * 0.08);
  g.add(trough);
  const pole = part(0.12, 1.85, 0.12, WOOD, false);
  pole.position.set(-span * 0.12, 0.95, -span * 0.08);
  const arms = part(1.15, 0.1, 0.1, WOOD, false);
  arms.position.set(-span * 0.12, 1.45, -span * 0.08);
  const head = part(0.32, 0.32, 0.28, 0xf4ead8, false);
  head.position.set(-span * 0.12, 1.85, -span * 0.08);
  const hat = part(0.42, 0.12, 0.42, AWNING_A, false);
  hat.position.set(-span * 0.12, 2.05, -span * 0.08);
  g.add(pole, arms, head, hat);
  const shed = cottage("shed");
  shed.position.set(span * 0.32, 0, span * 0.22);
  shed.rotation.y = 0.4;
  g.add(shed);
  return g;
}

function warehouseMesh() {
  const g = new THREE.Group();
  const W = 16.4;
  const D = 8.2;
  const H = 4.4;
  const wall = 0xe2c9a0;
  const roof = 0xa33b24;
  const plinth = part(W + 0.6, 0.4, D + 0.8, 0x8a7a62, false);
  plinth.position.y = 0.2;
  g.add(plinth);
  const walls = part(W, H, D, wall);
  walls.position.y = 0.4 + H / 2;
  g.add(walls);
  addPitchedRoof(g, W, D, 0.4 + H, wall, roof, 2.1);
  addChimney(g, W * 0.38, 0.4 + H + 1.1, -D * 0.15, 1.55, true);
  addChimney(g, -W * 0.42, 0.4 + H + 1.1, D * 0.1, 1.25);
  const dock = part(W * 0.55, 0.28, 3.2, STONE, false);
  dock.position.set(-2.2, 0.55, D / 2 + 1.4);
  g.add(dock);
  addSteps(g, -5.4, D / 2 + 1.4, 1.7, 3);
  const canopy = part(W * 0.58, 0.1, 3.4, roof, false);
  canopy.rotation.x = 0.28;
  canopy.userData.roof = true;
  canopy.position.set(-2.2, 3.35, D / 2 + 1.5);
  g.add(canopy);
  const canopyFascia = part(W * 0.58, 0.16, 0.1, WOOD, false);
  canopyFascia.position.set(-2.2, 2.85, D / 2 + 2.95);
  g.add(canopyFascia);
  for (const px of [-W * 0.18, W * 0.02]) {
    const post = part(0.22, 2.8, 0.22, WOOD, false);
    post.position.set(px, 1.7, D / 2 + 2.4);
    g.add(post);
  }
  const door = part(3.2, 3.1, 0.12, DOOR, false);
  door.position.set(-2.2, 1.95, D / 2 + 0.08);
  g.add(door);
  for (let i = 0; i < 3; i++) {
    const slat = part(3.0, 0.22, 0.06, 0x3d2a1c, false);
    slat.position.set(-2.2, 1.15 + i * 0.7, D / 2 + 0.16);
    g.add(slat);
  }
  windowPane(g, 5.2, 3.1, D / 2 + 0.08, 1.4, 1.1);
  windowPane(g, 7.1, 3.1, D / 2 + 0.08, 1.4, 1.1);
  windowPane(g, 6.15, 3.1, -D / 2 - 0.08, 1.5, 1.0, "-z");
  for (let i = 0; i < 4; i++) {
    const crate = part(1.1, 0.95, 1.1, i % 2 ? 0x8a6238 : 0x7a5230, false);
    crate.position.set(4.6 - i * 1.25, 0.9, D / 2 + 1.55);
    g.add(crate);
  }
  return g;
}

function factoryMesh() {
  const g = new THREE.Group();
  const wall = 0xb85a3a;
  const roof = 0x2f6b4f;
  const W = 18.5;
  const D = 10.4;
  const H = 5.2;
  const plinth = part(W + 0.7, 0.45, D + 0.8, 0x7a6a55, false);
  plinth.position.y = 0.22;
  g.add(plinth);
  const hall = part(W, H, D, wall);
  hall.position.y = 0.45 + H / 2;
  g.add(hall);
  const belt = part(W + 0.08, 0.28, D + 0.08, 0x8a4a38, false);
  belt.position.y = 2.15;
  g.add(belt);
  const bayW = W / 3;
  for (let i = 0; i < 3; i++) {
    const cx = -W / 2 + bayW * (i + 0.5);
    const left = part(bayW + 0.55, 0.14, D * 0.58 + 0.4, roof, false);
    left.rotation.x = 0.55;
    left.userData.roof = true;
    left.position.set(cx, 0.45 + H + 0.85, -D * 0.2);
    const right = part(bayW + 0.55, 0.14, D * 0.58 + 0.4, roof, false);
    right.rotation.x = -0.22;
    right.userData.roof = true;
    right.position.set(cx, 0.45 + H + 0.55, D * 0.22);
    g.add(left, right);
    const gable = gableEnd(D, 1.7, wall);
    gable.rotation.y = Math.PI / 2;
    gable.position.set(cx - bayW / 2 + 0.02, 0.45 + H, 0);
    g.add(gable);
    const eave = part(bayW + 0.4, 0.16, 0.12, WOOD, false);
    eave.position.set(cx, 0.45 + H + 0.18, D / 2 + 0.45);
    g.add(eave);
  }
  const stack = part(1.35, 9.4, 1.35, 0x8a4a38);
  stack.position.set(-W * 0.32, 0.45 + H + 3.2, -D * 0.18);
  const stackCap = part(1.7, 0.35, 1.7, FRAME, false);
  stackCap.position.set(-W * 0.32, 0.45 + H + 8.0, -D * 0.18);
  const pot = part(0.45, 0.7, 0.45, FRAME, false);
  pot.position.set(-W * 0.32, 0.45 + H + 8.5, -D * 0.18);
  g.add(stack, stackCap, pot);
  addChimney(g, -W * 0.12, 0.45 + H + 0.35, -D * 0.28, 4.6);
  const office = cottage("house");
  office.position.set(W * 0.42, 0, D * 0.55);
  office.rotation.y = 0.08;
  g.add(office);
  addDoor(g, 2.4, 2.15, D / 2 + 0.08, 2.2, 3.2);
  addSteps(g, 2.4, D / 2, 2.4, 3);
  windowPane(g, -6.4, 3.4, D / 2 + 0.08, 1.6, 1.3);
  windowPane(g, -4.2, 3.4, D / 2 + 0.08, 1.6, 1.3);
  windowPane(g, 0.2, 3.4, D / 2 + 0.08, 1.6, 1.3);
  windowPane(g, -5.3, 3.4, -D / 2 - 0.08, 1.5, 1.2, "-z");
  const pipe = part(0.28, 0.28, 4.2, 0x6a4a38, false);
  pipe.position.set(-W * 0.28, 0.45 + H + 1.1, 0);
  g.add(pipe);
  return g;
}

function meshKind(use) {
  if (use === "stall") return "shop";
  if (BUILDING_IDS.includes(use)) return use;
  return "house";
}

/** Group at origin. Caller sets world position. Does not add to the scene. */
export function meshForUse(use, opts = {}) {
  const area = opts.area ?? 400;
  const kind = meshKind(use);
  let g;
  if (use === "stall") g = stallMesh();
  else if (kind === "farm") g = farmMesh(area);
  else if (kind === "house") g = cottage("house");
  else if (kind === "shop") g = cottage("shop");
  else if (kind === "house_shop") g = houseShopMesh();
  else if (kind === "warehouse") g = warehouseMesh();
  else if (kind === "factory") g = factoryMesh();
  else g = cottage("house");
  g.userData.kind = "building";
  g.userData.use = use;
  g.userData.paper = true;
  dressWindowLights(g);
  return g;
}

export function placeUse(scene, use, opts = {}) {
  const g = meshForUse(use, opts);
  g.position.set(opts.x ?? 0, opts.y ?? 0, opts.z ?? 0);
  g.rotation.y = opts.yaw ?? 0;
  scene.add(g);
  return g;
}

export function createCatalogPicker({ onPick, onCancel }) {
  let el = document.getElementById("catalog-picker");
  if (!el) {
    el = document.createElement("div");
    el.id = "catalog-picker";
    el.hidden = true;
    document.body.appendChild(el);
  }
  el.innerHTML =
    '<p class="catalog-badge">PAPER · SIMULATED</p>' +
    '<p class="catalog-hint">Pick a building, then tap your leased land.</p>' +
    '<div class="catalog-grid"></div>' +
    '<button type="button" id="catalog-cancel">Cancel</button>';
  const grid = el.querySelector(".catalog-grid");
  const cancel = el.querySelector("#catalog-cancel");
  cancel.addEventListener("click", () => {
    el.hidden = true;
    if (onCancel) onCancel();
  });

  function render(catalog, cash) {
    const rows = catalog && catalog.length ? catalog : FALLBACK_CATALOG;
    grid.replaceChildren();
    for (const spec of rows) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.id = spec.id;
      const cost = Number(spec.paperCost);
      btn.disabled = cash < cost;
      btn.innerHTML =
        spec.label +
        '<span class="catalog-cost">$' +
        cost.toLocaleString("en-US") +
        " PAPER</span>";
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        el.hidden = true;
        if (onPick) onPick(spec.id);
      });
      grid.appendChild(btn);
    }
  }

  return {
    open(catalog, cash) {
      render(catalog, cash);
      el.hidden = false;
    },
    close() {
      el.hidden = true;
    },
    isOpen() {
      return !el.hidden;
    },
  };
}
