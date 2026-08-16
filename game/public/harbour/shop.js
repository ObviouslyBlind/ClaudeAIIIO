import * as THREE from "three";

/**
 * PAPER shop interior dress. Kraft-paper counter (cream top, wood body), a
 * small wooden till with a kraft drawer slightly pulled out, a kraft wrapped
 * parcel, a standing kraft shopping bag, a short wall shelf with two kraft
 * boxes, plus two shelf bays — not the house living room and not the
 * warehouse. No WASD. Tap-to-walk stays in interior.js.
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

/**
 * Small kraft PAPER till drawer: thin cream tray slightly pulled toward +z
 * (camera), wood lip + strap pull. Paper boxes only. Child of the till.
 */
function kraftDrawer() {
  const g = new THREE.Group();
  g.name = "shop-drawer";
  g.userData.kind = "shop-drawer";
  g.userData.mode = "PAPER";
  const w = 0.34;
  const h = 0.05;
  const d = 0.2;
  const tray = paperBox(w, h, d, CREAM, "shop-drawer");
  g.add(tray);
  const lip = paperBox(w + 0.02, 0.03, 0.03, WOOD, "shop-drawer");
  lip.position.z = d / 2 + 0.005;
  g.add(lip);
  const pull = paperBox(0.07, 0.025, 0.03, STRAP, "shop-drawer");
  pull.position.z = d / 2 + 0.02;
  g.add(pull);
  return g;
}

/** Small wooden till on the counter: wood body, kraft lid, kraft drawer. Paper boxes only. */
function cashBox(x, y, z) {
  const g = new THREE.Group();
  g.name = "shop-till";
  g.userData.kind = "shop-till";
  g.userData.mode = "PAPER";
  g.position.set(x, y, z);
  const h = 0.16;
  const body = paperBox(0.42, h, 0.3, WOOD, "shop-till");
  g.add(body);
  const band = paperBox(0.45, 0.04, 0.33, WOOD_DARK, "shop-till");
  band.position.y = -0.02;
  g.add(band);
  const lid = paperBox(0.44, 0.05, 0.32, LINEN, "shop-till");
  lid.position.y = h / 2 + 0.02;
  g.add(lid);
  // Kraft till drawer — thin box slightly pulled toward the camera.
  const drawer = kraftDrawer();
  drawer.position.set(0, -0.02, 0.12);
  g.add(drawer);
  return g;
}

/**
 * Small kraft wrapped parcel on the counter: cream box + strap + wood
 * label. Paper boxes only. Not a till, not a goods crate.
 */
function wrappedParcel(x, y, z) {
  const g = new THREE.Group();
  g.name = "shop-parcel";
  g.userData.kind = "shop-parcel";
  g.userData.mode = "PAPER";
  g.position.set(x, y, z);
  const w = 0.2;
  const h = 0.12;
  const d = 0.16;
  const body = paperBox(w, h, d, CREAM, "shop-parcel");
  g.add(body);
  const band = paperBox(w + 0.02, 0.035, d + 0.02, STRAP, "shop-parcel");
  g.add(band);
  const label = paperBox(0.07, 0.02, 0.05, WOOD, "shop-parcel");
  label.position.y = h / 2 + 0.01;
  g.add(label);
  return g;
}

/**
 * Small standing kraft PAPER shopping bag on the counter: cream body + two
 * thin strap handles. Paper boxes only. Beside the parcel / till, not on them.
 */
function kraftBag(x, y, z) {
  const g = new THREE.Group();
  g.name = "shop-bag";
  g.userData.kind = "shop-bag";
  g.userData.mode = "PAPER";
  g.userData.provenance = "SIMULATED";
  g.position.set(x, y, z);
  const w = 0.14;
  const h = 0.2;
  const d = 0.1;
  const body = paperBox(w, h, d, CREAM, "shop-bag");
  g.add(body);
  const handleH = 0.09;
  const handleL = paperBox(0.02, handleH, 0.02, STRAP, "shop-bag");
  handleL.position.set(-0.035, h / 2 + handleH / 2, 0);
  g.add(handleL);
  const handleR = paperBox(0.02, handleH, 0.02, STRAP, "shop-bag");
  handleR.position.set(0.035, h / 2 + handleH / 2, 0);
  g.add(handleR);
  return g;
}

/**
 * Short wall shelf above the counter: one plank, two kraft boxes.
 * Original WOOD / WOOD_DARK / WOOD_TOP / TIN. Not a till, not jars.
 */
function shortWallShelf(x, y, z) {
  const g = new THREE.Group();
  g.name = "shop-wall-shelf";
  g.userData.kind = "shop-shelf";
  g.userData.mode = "PAPER";
  g.position.set(x, y, z);
  const width = 0.86;
  const back = paperBox(width, 0.26, 0.05, WOOD_DARK, "shop-shelf");
  back.position.set(0, 0.08, -0.12);
  g.add(back);
  const plank = paperBox(width, 0.05, 0.26, WOOD_TOP, "shop-shelf");
  g.add(plank);
  for (const px of [-width / 2 + 0.07, width / 2 - 0.07]) {
    const bracket = paperBox(0.05, 0.1, 0.2, WOOD, "shop-shelf");
    bracket.position.set(px, -0.07, 0);
    g.add(bracket);
  }
  g.add(goodsCrate(0.22, 0.16, 0.18, TIN, -0.18, 0.105, 0.02));
  g.add(goodsCrate(0.2, 0.2, 0.16, WOOD, 0.17, 0.125, 0));
  return g;
}

function makeCounter(x, z) {
  const g = new THREE.Group();
  g.name = "shop-counter";
  g.userData.kind = "shop-counter";
  g.userData.mode = "PAPER";
  const y0 = 0.16;
  const topY = y0 + 0.94;
  const top = paperBox(2.95, 0.1, 0.92, LINEN, "shop-counter");
  top.position.set(0, topY, 0);
  g.add(top);
  const body = paperBox(2.82, 0.86, 0.8, WOOD, "shop-counter");
  body.position.set(0, y0 + 0.43, 0);
  g.add(body);
  const face = paperBox(2.82, 0.64, 0.05, CREAM, "shop-counter");
  face.position.set(0, y0 + 0.5, 0.42);
  g.add(face);
  const kick = paperBox(2.82, 0.12, 0.08, WOOD_DARK, "shop-counter");
  kick.position.set(0, y0 + 0.06, 0.42);
  g.add(kick);
  const stripe = paperBox(2.82, 0.1, 0.08, CORAL, "shop-counter");
  stripe.position.set(0, topY + 0.02, 0.44);
  g.add(stripe);
  // Wooden cash box on the linen top — kraft lid, wood body. Not a wallet.
  g.add(cashBox(0.88, topY + 0.13, -0.08));
  // Kraft wrapped parcel beside the till — cream box + strap. Not a wallet.
  g.add(wrappedParcel(1.22, topY + 0.11, 0.08));
  // Standing kraft shopping bag beside the parcel / till — cream body + straps.
  g.add(kraftBag(1.38, topY + 0.15, -0.18));
  // Two small kraft / terracotta jars beside the till. Original TIN + CORAL.
  const kraftJar = paperBox(0.12, 0.16, 0.12, TIN, "shop-goods");
  kraftJar.position.set(0.48, topY + 0.13, -0.04);
  g.add(kraftJar);
  const terraJar = paperBox(0.11, 0.2, 0.11, CORAL, "shop-goods");
  terraJar.position.set(0.6, topY + 0.15, 0.02);
  g.add(terraJar);
  const jar = paperBox(0.18, 0.24, 0.18, TEAL, "shop-goods");
  jar.position.set(-0.95, topY + 0.17, 0.12);
  g.add(jar);
  const tin = paperBox(0.2, 0.16, 0.2, CORAL, "shop-goods");
  tin.position.set(-0.58, topY + 0.13, 0.14);
  g.add(tin);
  const stack = paperBox(0.26, 0.09, 0.2, PAPER_CARD, "shop-goods");
  stack.position.set(-0.18, topY + 0.09, 0.16);
  g.add(stack);
  const green = paperBox(0.16, 0.2, 0.16, GREEN, "shop-goods");
  green.position.set(0.28, topY + 0.15, 0.12);
  g.add(green);
  // Short wall shelf above the counter — two kraft boxes, not only till + jars.
  g.add(shortWallShelf(-0.38, topY + 0.48, -0.28));
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

  // Spawn is (0, 1.15, 1.6); camera looks from +z. Counter sits in that view.
  g.add(makeCounter(-0.15, 0.48));
  g.add(shelfBay(-3.28, 0.15, Math.PI / 2, 1.45));
  g.add(shelfBay(-0.35, -2.52, 0, 1.55));
  g.add(crateWithGoods(2.35, 0.55, -0.18, WOOD, [CORAL, GREEN, TIN]));

  g.add(hangingLamp(-0.15, 2.18, 0.48));
  g.add(paperMark(-2.15, 1.62, 3.38));

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
