import * as THREE from "three";

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

function windowPane(g, x, y, z, w = 1.05, h = 0.9) {
  const frame = part(w + 0.16, h + 0.16, 0.08, 0x3d2a1c, false);
  frame.position.set(x, y, z);
  const glass = part(w, h, 0.06, 0x8ec4d4, false);
  glass.position.set(x, y, z + 0.03);
  g.add(frame, glass);
}

/** Two sloped planes + gables. Pitch is visible from spawn, not a flat slab. */
function addPitchedRoof(g, W, D, wallTop, wall, roof, rake = 1.55) {
  const left = part(W + 0.9, 0.14, D * 0.62, roof, false);
  left.rotation.x = 0.48;
  left.userData.roof = true;
  left.position.set(0, wallTop + 0.72, -D * 0.22);
  const right = part(W + 0.9, 0.14, D * 0.62, roof, false);
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
  const ridge = part(W + 1.0, 0.12, 0.22, roof, false);
  ridge.position.y = wallTop + rake - 0.08;
  g.add(ridge);
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
  const plinth = part(W + 0.5, 0.38, D + 0.7, 0x9a8a72, false);
  plinth.position.y = 0.19;
  g.add(plinth);
  const walls = part(W, H, D, wall);
  walls.position.y = 0.38 + H / 2;
  g.add(walls);
  addPitchedRoof(g, W, D, 0.38 + H, wall, roof, shed ? 1.15 : 1.55);
  if (!shed) {
    const chimney = part(0.55, 1.7, 0.55, 0x8a6a55);
    chimney.position.set(-W * 0.28, 0.38 + H + 1.5, -D * 0.12);
    g.add(chimney);
  }
  const door = part(shed ? 0.85 : 1.05, shed ? 1.7 : 2.05, 0.1, 0x4a3220, false);
  door.position.set(-W * 0.12, shed ? 1.15 : 1.4, D / 2 + 0.08);
  g.add(door);
  const step = part(shed ? 1.1 : 1.35, 0.18, 0.7, 0x9a8a72, false);
  step.position.set(-W * 0.12, 0.28, D / 2 + 0.55);
  g.add(step);
  windowPane(g, W * 0.28, shed ? 1.7 : 2.15, D / 2 + 0.08, shed ? 0.7 : 1.05, shed ? 0.7 : 0.9);
  if (!shed) windowPane(g, -W * 0.38, 2.15, D / 2 + 0.08, 0.85, 0.8);
  if (shop) {
    const porch = part(W * 0.95, 0.1, 2.1, 0xc4a574, false);
    porch.position.set(0, 2.35, D / 2 + 1.05);
    g.add(porch);
    for (const px of [-W * 0.38, W * 0.38]) {
      const post = part(0.16, 2.2, 0.16, 0x5a3a22, false);
      post.position.set(px, 1.25, D / 2 + 1.85);
      g.add(post);
    }
    const awning = part(W * 0.9, 0.07, 1.85, 0xc45c3a, false);
    awning.position.set(0, 2.55, D / 2 + 1.15);
    awning.rotation.x = 0.22;
    g.add(awning);
    const sign = part(2.8, 0.7, 0.08, 0x3d2a1c, false);
    sign.position.set(W * 0.08, 3.15, D / 2 + 0.12);
    g.add(sign);
    for (let i = 0; i < 3; i++) {
      const crate = part(0.7, 0.55, 0.7, 0x8a6238, false);
      crate.position.set(W * 0.42 - i * 0.85, 0.65, D / 2 + 1.35);
      g.add(crate);
    }
  }
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
  const linkRoof = part(2.8, 0.12, 2.1, 0x7a2e22, false);
  linkRoof.rotation.x = 0.42;
  linkRoof.userData.roof = true;
  linkRoof.position.set(1.1, 2.85, -0.35);
  const linkRoofB = part(2.8, 0.12, 2.1, 0x7a2e22, false);
  linkRoofB.rotation.x = -0.42;
  linkRoofB.userData.roof = true;
  linkRoofB.position.set(1.1, 2.85, 0.35);
  g.add(linkRoof, linkRoofB);
  return g;
}

function farmMesh(area) {
  const g = new THREE.Group();
  const span = Math.min(16, Math.sqrt(area) * 0.48);
  for (let i = 0; i < 6; i++) {
    const row = part(span, 0.18, 0.55, i % 2 ? 0x5f8a32 : 0x7a5a28, false);
    row.position.set(0, 0.1, -span * 0.34 + i * 1.05);
    g.add(row);
  }
  for (let i = -3; i <= 3; i++) {
    const post = part(0.12, 1.05, 0.12, 0x6a4a2a, false);
    post.position.set(-span * 0.52, 0.52, i * 1.15);
    const postB = post.clone();
    postB.position.x = span * 0.52;
    g.add(post, postB);
  }
  const tank = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.55, 1.4, 8),
    new THREE.MeshLambertMaterial({ color: 0x6a8a74 }),
  );
  tank.position.set(span * 0.38, 0.8, span * 0.28);
  tank.castShadow = true;
  g.add(tank);
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
  const dock = part(W * 0.55, 0.28, 3.2, 0x9a8a72, false);
  dock.position.set(-2.2, 0.55, D / 2 + 1.4);
  g.add(dock);
  const canopy = part(W * 0.58, 0.1, 3.4, 0xa33b24, false);
  canopy.rotation.x = 0.28;
  canopy.userData.roof = true;
  canopy.position.set(-2.2, 3.35, D / 2 + 1.5);
  g.add(canopy);
  for (const px of [-W * 0.18, W * 0.02]) {
    const post = part(0.22, 2.8, 0.22, 0x5a3a22, false);
    post.position.set(px, 1.7, D / 2 + 2.4);
    g.add(post);
  }
  const door = part(3.2, 3.1, 0.12, 0x4a3220, false);
  door.position.set(-2.2, 1.95, D / 2 + 0.08);
  g.add(door);
  windowPane(g, 5.2, 3.1, D / 2 + 0.08, 1.4, 1.1);
  windowPane(g, 7.1, 3.1, D / 2 + 0.08, 1.4, 1.1);
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
  const bayW = W / 3;
  for (let i = 0; i < 3; i++) {
    const cx = -W / 2 + bayW * (i + 0.5);
    const left = part(bayW + 0.4, 0.14, D * 0.58, roof, false);
    left.rotation.x = 0.55;
    left.userData.roof = true;
    left.position.set(cx, 0.45 + H + 0.85, -D * 0.2);
    const right = part(bayW + 0.4, 0.14, D * 0.58, roof, false);
    right.rotation.x = -0.22;
    right.userData.roof = true;
    right.position.set(cx, 0.45 + H + 0.55, D * 0.22);
    g.add(left, right);
    const gable = gableEnd(D, 1.7, wall);
    gable.rotation.y = Math.PI / 2;
    gable.position.set(cx - bayW / 2 + 0.02, 0.45 + H, 0);
    g.add(gable);
  }
  const chimney = part(1.35, 9.4, 1.35, 0x8a4a38);
  chimney.position.set(-W * 0.32, 0.45 + H + 3.2, -D * 0.18);
  g.add(chimney);
  const cap = part(1.7, 0.35, 1.7, 0x3d2a1c, false);
  cap.position.set(-W * 0.32, 0.45 + H + 8.0, -D * 0.18);
  g.add(cap);
  const office = cottage("house");
  office.position.set(W * 0.42, 0, D * 0.55);
  office.rotation.y = 0.08;
  g.add(office);
  const door = part(2.4, 3.4, 0.12, 0x3d2a1c, false);
  door.position.set(2.4, 2.15, D / 2 + 0.08);
  g.add(door);
  windowPane(g, -6.4, 3.4, D / 2 + 0.08, 1.6, 1.3);
  windowPane(g, -4.2, 3.4, D / 2 + 0.08, 1.6, 1.3);
  windowPane(g, 0.2, 3.4, D / 2 + 0.08, 1.6, 1.3);
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
  if (kind === "farm") g = farmMesh(area);
  else if (kind === "house") g = cottage("house");
  else if (kind === "shop") g = cottage("shop");
  else if (kind === "house_shop") g = houseShopMesh();
  else if (kind === "warehouse") g = warehouseMesh();
  else if (kind === "factory") g = factoryMesh();
  else g = cottage("house");
  g.userData.kind = "building";
  g.userData.use = use;
  g.userData.paper = true;
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
