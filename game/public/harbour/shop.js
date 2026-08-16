import * as THREE from "three";

/**
 * PAPER shop interior dress. Counter, shelves, and goods crates — not the
 * house living room and not the warehouse. No WASD. Tap-to-walk stays in
 * interior.js.
 *
 * Call dressShop(scene) when plot.kind or plot.use is "shop" or "house_shop".
 * Idempotent: a second call only shows the existing dress.
 */

const WOOD = 0x8a6238;
const WOOD_DARK = 0x6a4428;
const WOOD_TOP = 0x9a6a40;
const STRAP = 0x5a3a22;
const CREAM = 0xe8d7b8;
const CREAM_SIDE = 0xdfc9a8;
const FLOOR_SHOP = 0x9a6440;
const CORAL = 0xc45c3a;
const TEAL = 0x2a7a72;
const TIN = 0xc4a574;
const LINEN = 0xf4ead8;
const GREEN = 0x5f8a32;
const PAPER_CARD = 0xf3efe4;
const LAMP_WOOD = 0x5a3a22;
const LAMP_SHADE = 0xf0c878;
const LAMP_BULB = 0xfff1d0;
const HOUSE_KINDS = new Set(["interior-table", "interior-chair", "interior-bed", "interior-lamp"]);
const SHOP_LIGHT = 1.22;
const SHOP_BG = 0x2c241c;
const SCENE_LIGHT_SCALE = 0.92;

export function isShopPlot(plot) {
  if (!plot) return false;
  const k = plot.kind;
  const u = plot.use;
  return k === "shop" || k === "house_shop" || u === "shop" || u === "house_shop";
}

function paperBox(w, h, d, color, kind = "shop-prop") {
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

function goodsCrate(w, h, d, color, x, y, z) {
  const g = new THREE.Group();
  g.userData.kind = "shop-crate";
  g.userData.mode = "PAPER";
  const body = paperBox(w, h, d, color, "shop-crate");
  g.add(body);
  const rim = paperBox(w + 0.03, 0.04, d + 0.03, STRAP, "shop-crate");
  rim.position.y = h / 2 - 0.02;
  g.add(rim);
  g.position.set(x, y, z);
  return g;
}

function goodsOn(parent, colors, y, zSpread = 0.16) {
  const n = colors.length;
  const span = Math.min(0.72, 0.18 * n);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1) - 0.5;
    const tin = paperBox(0.14, 0.16 + (i % 2) * 0.06, 0.14, colors[i], "shop-goods");
    tin.position.set(t * span * 2, y + 0.1, (i % 2 ? 1 : -1) * zSpread * 0.25);
    parent.add(tin);
  }
}

function crateWithGoods(x, z, yaw, crateColor, goods) {
  const g = new THREE.Group();
  g.name = "shop-crate";
  g.userData.kind = "shop-crate";
  g.userData.mode = "PAPER";
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  const h = 0.42;
  g.add(goodsCrate(0.62, h, 0.52, crateColor, 0, 0.16 + h / 2, 0));
  goodsOn(g, goods, 0.16 + h, 0.12);
  return g;
}

function shelfBay(x, z, yaw, width = 1.35) {
  const g = new THREE.Group();
  g.name = "shop-shelf";
  g.userData.kind = "shop-shelf";
  g.userData.mode = "PAPER";
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  const back = paperBox(width, 1.85, 0.08, WOOD_DARK, "shop-shelf");
  back.position.set(0, 0.16 + 0.92, -0.22);
  g.add(back);
  const posts = [-width / 2 + 0.05, width / 2 - 0.05];
  for (const px of posts) {
    const post = paperBox(0.07, 1.85, 0.28, WOOD, "shop-shelf");
    post.position.set(px, 0.16 + 0.92, -0.08);
    g.add(post);
  }
  const goodsRows = [
    [CORAL, TIN, GREEN, LINEN],
    [TEAL, CORAL, TIN, GREEN, LINEN],
    [GREEN, LINEN, CORAL, TEAL],
  ];
  for (let i = 0; i < 3; i++) {
    const y = 0.52 + i * 0.48;
    const plank = paperBox(width - 0.08, 0.05, 0.36, WOOD_TOP, "shop-shelf");
    plank.position.set(0, y, -0.04);
    g.add(plank);
    const row = goodsRows[i];
    const span = width - 0.28;
    for (let k = 0; k < row.length; k++) {
      const t = row.length === 1 ? 0 : k / (row.length - 1) - 0.5;
      const gh = 0.18 + (k % 3) * 0.08;
      const gw = 0.13 + (k % 2) * 0.04;
      const item = paperBox(gw, gh, 0.13, row[k], "shop-goods");
      item.position.set(t * span, y + gh / 2 + 0.03, 0.02);
      g.add(item);
    }
  }
  return g;
}

function makeCounter(x, z) {
  const g = new THREE.Group();
  g.name = "shop-counter";
  g.userData.kind = "shop-counter";
  g.userData.mode = "PAPER";
  const y0 = 0.16;
  const topY = y0 + 0.92;
  g.add(paperBox(3.15, 0.08, 0.78, WOOD_TOP, "shop-counter"));
  g.children[0].position.set(0, topY, 0);
  const body = paperBox(3.05, 0.82, 0.7, WOOD, "shop-counter");
  body.position.set(0, y0 + 0.41, 0);
  g.add(body);
  const kick = paperBox(3.05, 0.12, 0.08, WOOD_DARK, "shop-counter");
  kick.position.set(0, y0 + 0.06, 0.38);
  g.add(kick);
  const till = paperBox(0.42, 0.18, 0.32, STRAP, "shop-till");
  till.position.set(0.85, topY + 0.13, -0.08);
  g.add(till);
  const tillTop = paperBox(0.38, 0.06, 0.28, CORAL, "shop-till");
  tillTop.position.set(0.85, topY + 0.24, -0.08);
  g.add(tillTop);
  const scaleBase = paperBox(0.28, 0.06, 0.28, WOOD_DARK, "shop-prop");
  scaleBase.position.set(-0.95, topY + 0.05, 0.05);
  g.add(scaleBase);
  const scalePost = paperBox(0.05, 0.22, 0.05, TIN, "shop-prop");
  scalePost.position.set(-0.95, topY + 0.18, 0.05);
  g.add(scalePost);
  const scalePan = paperBox(0.32, 0.03, 0.32, TIN, "shop-prop");
  scalePan.position.set(-0.95, topY + 0.3, 0.05);
  g.add(scalePan);
  const jar = paperBox(0.16, 0.22, 0.16, TEAL, "shop-goods");
  jar.position.set(-0.35, topY + 0.15, 0.12);
  g.add(jar);
  const stack = paperBox(0.22, 0.08, 0.18, LINEN, "shop-goods");
  stack.position.set(0.2, topY + 0.08, 0.18);
  g.add(stack);
  g.position.set(x, 0, z);
  return g;
}

function hangingLamp(x, y, z) {
  const g = new THREE.Group();
  g.name = "shop-lamp";
  g.userData.kind = "shop-lamp";
  g.userData.mode = "PAPER";
  const stem = paperBox(0.04, 0.38, 0.04, LAMP_WOOD, "shop-lamp");
  stem.position.set(x, y + 0.22, z);
  const shade = paperBox(0.55, 0.16, 0.55, LAMP_SHADE, "shop-lamp");
  shade.position.set(x, y, z);
  const bulb = paperBox(0.1, 0.07, 0.1, LAMP_BULB, "shop-lamp");
  bulb.position.set(x, y - 0.12, z);
  g.add(stem, shade, bulb);
  return g;
}

function paperMark(x, y, z) {
  const g = new THREE.Group();
  g.name = "shop-paper";
  g.userData.kind = "interior-paper";
  g.userData.mode = "PAPER";
  g.add(paperBox(0.85, 0.32, 0.04, CORAL, "interior-paper"));
  const card = paperBox(0.72, 0.22, 0.03, PAPER_CARD, "interior-paper");
  card.position.z = 0.03;
  g.add(card);
  g.position.set(x, y, z);
  return g;
}

function makeShopDress() {
  const g = new THREE.Group();
  g.name = "shop-dress";
  g.userData.kind = "shop-dress";
  g.userData.mode = "PAPER";
  g.userData.provenance = "SIMULATED";

  g.add(makeCounter(-0.35, 0.42));
  g.add(shelfBay(-2.55, -2.55, 0));
  g.add(shelfBay(-0.95, -2.55, 0));
  g.add(shelfBay(0.65, -2.55, 0, 1.15));
  g.add(shelfBay(-3.32, -0.55, Math.PI / 2, 1.25));
  g.add(shelfBay(-3.32, 1.15, Math.PI / 2, 1.15));

  g.add(crateWithGoods(-2.55, 2.15, 0.12, WOOD, [CORAL, GREEN, TIN]));
  g.add(crateWithGoods(-1.55, 2.28, -0.08, WOOD_DARK, [TEAL, LINEN]));
  g.add(crateWithGoods(1.25, 2.18, 0.18, WOOD, [GREEN, CORAL, LINEN]));
  g.add(crateWithGoods(1.55, -0.15, -0.22, WOOD_DARK, [TIN, TEAL]));

  g.add(hangingLamp(-0.35, 2.18, 0.42));
  g.add(paperMark(-2.15, 1.62, 3.38));

  const loftY = 2.94;
  const upShelf = shelfBay(-1.85, -2.45, 0, 1.4);
  upShelf.position.y = loftY - 0.16;
  g.add(upShelf);
  const upCrate = crateWithGoods(0.15, -2.15, 0.1, WOOD, [CORAL, TIN]);
  upCrate.position.y = loftY - 0.16;
  g.add(upCrate);

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

function tintInterior(interior, shop) {
  interior.traverse((o) => {
    if (o.isLight) {
      remember(o, "_shopIntensity", o.intensity);
      remember(o, "_shopColor", o.color ? o.color.getHex() : null);
      o.intensity = shop ? SHOP_LIGHT : o.userData._shopIntensity;
      if (o.color) {
        o.color.setHex(shop ? 0xffe8c4 : o.userData._shopColor);
      }
    }
    if (!o.material || !o.material.color) return;
    if (o.userData?.kind === "interior-wall") {
      remember(o, "_shopColor", o.material.color.getHex());
      const cream = o.geometry?.parameters?.width < 0.3 ? CREAM_SIDE : CREAM;
      o.material.color.setHex(shop ? cream : o.userData._shopColor);
    }
    if (o.userData?.kind === "interior-floor") {
      remember(o, "_shopColor", o.material.color.getHex());
      o.material.color.setHex(shop ? FLOOR_SHOP : o.userData._shopColor);
    }
  });
}

function tintSceneLights(scene, shop) {
  if (!scene || !scene.children) return;
  for (const child of scene.children) {
    if (!child.isLight) continue;
    remember(child, "_shopIntensity", child.intensity);
    child.intensity = shop
      ? child.userData._shopIntensity * SCENE_LIGHT_SCALE
      : child.userData._shopIntensity;
  }
  if (scene.background && scene.background.isColor) {
    remember(scene, "_shopBg", scene.background.getHex());
    scene.background.setHex(shop ? SHOP_BG : scene.userData._shopBg);
  }
}

/**
 * Dress an interior (or a scene that contains one) as a PAPER shop.
 * Hides living-room furniture, adds counter, shelves, and goods crates.
 * @param {THREE.Object3D} scene
 */
export function dressShop(scene) {
  if (!scene) return null;
  const interior = findInterior(scene) || scene;
  interior.userData.mode = "PAPER";
  interior.userData.interiorUse = "shop";
  interior.userData.provenance = "SIMULATED";
  setHouseFurnitureVisible(interior, false);
  tintInterior(interior, true);
  tintSceneLights(scene, true);
  let dress = interior.getObjectByName("shop-dress");
  if (!dress) {
    dress = makeShopDress();
    interior.add(dress);
  }
  dress.visible = true;
  return interior;
}

/** Restore the house living room after a shop visit. */
export function undressShop(scene) {
  if (!scene) return null;
  const interior = findInterior(scene) || scene;
  const dress = interior.getObjectByName("shop-dress");
  if (dress) dress.visible = false;
  setHouseFurnitureVisible(interior, true);
  tintInterior(interior, false);
  tintSceneLights(scene, false);
  interior.userData.interiorUse = "house";
  return interior;
}
