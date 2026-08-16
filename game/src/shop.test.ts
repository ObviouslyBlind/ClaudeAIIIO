import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { makeInteriorScene } from "../public/harbour/interior.js";
import { dressShop, isShopPlot, undressShop } from "../public/harbour/shop.js";

const WOOD = 0x8a6238;
const CREAM = 0xe8d7b8;
const STRAP = 0x5a3a22;
const LINEN = 0xf4ead8;
const PAPER_CARD = 0xf3efe4;
const CORAL = 0xc45c3a;
const KRAFT = new Set([WOOD, CREAM, STRAP]);
const SLIP_SHEET = new Set([CREAM, LINEN, PAPER_CARD]);
const SLIP_EDGE = new Set([WOOD, STRAP]);
const SLIP = new Set([...SLIP_SHEET, ...SLIP_EDGE]);
const STAMP = new Set([WOOD, STRAP, CORAL]);
const RECEIPT = new Set([WOOD, PAPER_CARD, LINEN]);

function hexes(root: THREE.Object3D) {
  const colors: number[] = [];
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    const mat = mesh.material as THREE.MeshLambertMaterial | undefined;
    if (mesh.isMesh && mat?.color) colors.push(mat.color.getHex());
  });
  return colors;
}

function isGrey(hex: number) {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  return Math.max(r, g, b) - Math.min(r, g, b) < 18;
}

function shopParcels(root: THREE.Object3D) {
  const out: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.userData?.kind === "shop-parcel" && obj.name === "shop-parcel") {
      out.push(obj);
    }
  });
  return out;
}

function shopBags(root: THREE.Object3D) {
  const out: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.userData?.kind === "shop-bag" && obj.name === "shop-bag") {
      out.push(obj);
    }
  });
  return out;
}

function shopDrawers(root: THREE.Object3D) {
  const out: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.userData?.kind === "shop-drawer" && obj.name === "shop-drawer") {
      out.push(obj);
    }
  });
  return out;
}

function shopScales(root: THREE.Object3D) {
  const out: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.userData?.kind === "shop-scale" && obj.name === "shop-scale") {
      out.push(obj);
    }
  });
  return out;
}

function shopWeights(root: THREE.Object3D) {
  const out: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.userData?.kind === "shop-weight" && obj.name === "shop-weight") {
      out.push(obj);
    }
  });
  return out;
}

function shopSlips(root: THREE.Object3D) {
  const out: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.userData?.kind === "shop-slip" && obj.name === "shop-slip") {
      out.push(obj);
    }
  });
  return out;
}

function shopStamps(root: THREE.Object3D) {
  const out: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.userData?.kind === "shop-stamp" && obj.name === "shop-stamp") {
      out.push(obj);
    }
  });
  return out;
}

function shopReceipts(root: THREE.Object3D) {
  const out: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.userData?.kind === "shop-receipt" && obj.name === "shop-receipt") {
      out.push(obj);
    }
  });
  return out;
}

describe("shop PAPER wrapped parcel", () => {
  it("matches shop plots only", () => {
    expect(isShopPlot({ use: "shop" })).toBe(true);
    expect(isShopPlot({ kind: "shop" })).toBe(true);
    expect(isShopPlot({ kind: "house_shop" })).toBe(true);
    expect(isShopPlot({ use: "house" })).toBe(false);
    expect(isShopPlot(null)).toBe(false);
  });

  it("puts a kraft PAPER wrapped parcel on the shop counter", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressShop(scene);

    const dress = interior.getObjectByName("shop-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");
    expect(dress!.visible).toBe(true);

    const counter = dress!.getObjectByName("shop-counter");
    expect(counter).toBeTruthy();

    const parcels = shopParcels(counter!);
    expect(parcels.length).toBe(1);

    const parcel = parcels[0];
    expect(parcel.userData.kind).toBe("shop-parcel");
    expect(parcel.userData.mode).toBe("PAPER");
    expect(parcel.position.y).toBeGreaterThan(1.0);
    expect(parcel.position.y).toBeLessThan(1.4);
    expect(Math.abs(parcel.position.x)).toBeLessThan(1.5);
    expect(Math.abs(parcel.position.z)).toBeLessThan(0.5);

    const colors = hexes(parcel);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => KRAFT.has(c))).toBe(true);
    expect(colors.some((c) => c === CREAM)).toBe(true);
    expect(colors.some((c) => c === STRAP)).toBe(true);
    expect(colors.some((c) => c === WOOD)).toBe(true);
    expect(colors.every((c) => !isGrey(c))).toBe(true);

    parcel.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("shop-parcel");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
  });

  it("keeps dress idempotent and hides the parcel on undress", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressShop(scene);
    dressShop(scene);
    expect(interior.children.filter((c) => c.name === "shop-dress").length).toBe(1);
    expect(shopParcels(interior).length).toBe(1);

    undressShop(scene);
    const dress = interior.getObjectByName("shop-dress");
    expect(dress).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(interior.userData.interiorUse).toBe("house");
  });
});

describe("shop PAPER kraft bag", () => {
  it("puts one kraft PAPER shopping bag on the shop counter", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressShop(scene);

    const dress = interior.getObjectByName("shop-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");
    expect(dress!.userData.provenance).toBe("SIMULATED");

    const counter = dress!.getObjectByName("shop-counter");
    expect(counter).toBeTruthy();

    const bags = shopBags(counter!);
    expect(bags.length).toBe(1);

    const bag = bags[0];
    expect(bag.userData.kind).toBe("shop-bag");
    expect(bag.userData.mode).toBe("PAPER");
    expect(bag.userData.provenance).toBe("SIMULATED");

    const top = counter!.children.find((c) => {
      const mesh = c as THREE.Mesh;
      const mat = mesh.material as THREE.MeshLambertMaterial | undefined;
      return mesh.isMesh && mat?.color?.getHex() === 0xf4ead8;
    }) as THREE.Mesh;
    expect(top).toBeTruthy();
    expect(bag.position.y).toBeGreaterThan(top.position.y);
    expect(bag.position.y - top.position.y).toBeLessThan(0.35);
    expect(Math.abs(bag.position.x)).toBeLessThan(1.5);
    expect(Math.abs(bag.position.z)).toBeLessThan(0.5);

    const parcels = shopParcels(counter!);
    expect(parcels.length).toBe(1);
    const dx = bag.position.x - parcels[0].position.x;
    const dz = bag.position.z - parcels[0].position.z;
    expect(Math.hypot(dx, dz)).toBeGreaterThan(0.15);

    const colors = hexes(bag);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => KRAFT.has(c))).toBe(true);
    expect(colors.some((c) => c === CREAM)).toBe(true);
    expect(colors.some((c) => c === STRAP)).toBe(true);
    expect(colors.every((c) => !isGrey(c))).toBe(true);

    bag.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("shop-bag");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
  });

  it("keeps dress idempotent and hides the bag on undress", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressShop(scene);
    dressShop(scene);
    expect(interior.children.filter((c) => c.name === "shop-dress").length).toBe(1);
    expect(shopBags(interior).length).toBe(1);

    undressShop(scene);
    const dress = interior.getObjectByName("shop-dress");
    expect(dress).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(shopBags(interior).length).toBe(1);
    expect(interior.userData.interiorUse).toBe("house");
  });
});

describe("shop PAPER kraft till drawer", () => {
  it("pulls a thin kraft PAPER drawer out of the shop till", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressShop(scene);

    const dress = interior.getObjectByName("shop-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");

    const counter = dress!.getObjectByName("shop-counter");
    expect(counter).toBeTruthy();
    const till = counter!.getObjectByName("shop-till");
    expect(till).toBeTruthy();
    expect(till!.userData.kind).toBe("shop-till");

    const drawers = shopDrawers(till!);
    expect(drawers.length).toBe(1);

    const drawer = drawers[0];
    expect(drawer.userData.kind).toBe("shop-drawer");
    expect(drawer.userData.mode).toBe("PAPER");
    expect(drawer.parent?.name).toBe("shop-till");
    // Thin tray, slightly pulled toward +z (camera), still on the till.
    expect(drawer.position.z).toBeGreaterThan(0.06);
    expect(drawer.position.z).toBeLessThan(0.22);
    expect(Math.abs(drawer.position.x)).toBeLessThan(0.08);
    expect(Math.abs(drawer.position.y)).toBeLessThan(0.08);

    expect(shopParcels(counter!).length).toBe(1);
    expect(shopBags(counter!).length).toBe(1);
    expect(counter!.getObjectByName("shop-wall-shelf")).toBeTruthy();

    const colors = hexes(drawer);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => KRAFT.has(c))).toBe(true);
    expect(colors.some((c) => c === CREAM)).toBe(true);
    expect(colors.some((c) => c === WOOD)).toBe(true);
    expect(colors.some((c) => c === STRAP)).toBe(true);
    expect(colors.every((c) => !isGrey(c))).toBe(true);

    let boxes = 0;
    drawer.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("shop-drawer");
        expect(mesh.userData.mode).toBe("PAPER");
        const box = mesh.geometry as THREE.BoxGeometry;
        expect(box.parameters.height).toBeLessThan(0.08);
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(2);
  });

  it("keeps dress idempotent and hides the drawer on undress", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressShop(scene);
    dressShop(scene);
    expect(interior.children.filter((c) => c.name === "shop-dress").length).toBe(1);
    expect(shopDrawers(interior).length).toBe(1);
    expect(shopParcels(interior).length).toBe(1);
    expect(shopBags(interior).length).toBe(1);

    undressShop(scene);
    const dress = interior.getObjectByName("shop-dress");
    expect(dress).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(shopDrawers(interior).length).toBe(1);
    expect(interior.userData.interiorUse).toBe("house");
  });
});

describe("shop PAPER kraft counter scale", () => {
  it("puts a small kraft PAPER scale on the shop counter beside the till", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressShop(scene);

    const dress = interior.getObjectByName("shop-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");

    const counter = dress!.getObjectByName("shop-counter");
    expect(counter).toBeTruthy();
    const till = counter!.getObjectByName("shop-till");
    expect(till).toBeTruthy();
    expect(till!.userData.kind).toBe("shop-till");

    const scales = shopScales(counter!);
    expect(scales.length).toBe(1);

    const scale = scales[0];
    expect(scale.userData.kind).toBe("shop-scale");
    expect(scale.userData.mode).toBe("PAPER");
    expect(scale.parent?.name).toBe("shop-counter");
    // On the counter beside the till — not on the pulled drawer.
    expect(scale.position.y).toBeGreaterThan(1.0);
    expect(scale.position.y).toBeLessThan(1.4);
    expect(Math.abs(scale.position.x)).toBeLessThan(1.5);
    expect(Math.abs(scale.position.z)).toBeLessThan(0.5);
    const dx = scale.position.x - till.position.x;
    const dz = scale.position.z - till.position.z;
    expect(Math.hypot(dx, dz)).toBeGreaterThan(0.12);
    expect(Math.hypot(dx, dz)).toBeLessThan(0.55);
    expect(shopDrawers(scale).length).toBe(0);

    expect(shopParcels(counter!).length).toBe(1);
    expect(shopBags(counter!).length).toBe(1);
    expect(shopDrawers(till!).length).toBe(1);
    expect(counter!.getObjectByName("shop-wall-shelf")).toBeTruthy();

    const colors = hexes(scale);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => KRAFT.has(c))).toBe(true);
    expect(colors.some((c) => c === CREAM)).toBe(true);
    expect(colors.some((c) => c === WOOD)).toBe(true);
    expect(colors.some((c) => c === STRAP)).toBe(true);
    expect(colors.every((c) => !isGrey(c))).toBe(true);

    let boxes = 0;
    scale.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("shop-scale");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(2);
  });

  it("keeps dress idempotent and hides the scale on undress", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressShop(scene);
    dressShop(scene);
    expect(interior.children.filter((c) => c.name === "shop-dress").length).toBe(1);
    expect(shopScales(interior).length).toBe(1);
    expect(shopDrawers(interior).length).toBe(1);
    expect(shopParcels(interior).length).toBe(1);
    expect(shopBags(interior).length).toBe(1);

    undressShop(scene);
    const dress = interior.getObjectByName("shop-dress");
    expect(dress).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(shopScales(interior).length).toBe(1);
    expect(interior.userData.interiorUse).toBe("house");
  });
});

describe("shop PAPER kraft scale weight", () => {
  it("puts a small kraft PAPER weight on the shop counter beside the scale", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressShop(scene);

    const dress = interior.getObjectByName("shop-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");

    const counter = dress!.getObjectByName("shop-counter");
    expect(counter).toBeTruthy();
    const till = counter!.getObjectByName("shop-till");
    expect(till).toBeTruthy();
    expect(till!.userData.kind).toBe("shop-till");

    const scales = shopScales(counter!);
    expect(scales.length).toBe(1);
    const scale = scales[0];

    const weights = shopWeights(counter!);
    expect(weights.length).toBe(1);

    const weight = weights[0];
    expect(weight.userData.kind).toBe("shop-weight");
    expect(weight.userData.mode).toBe("PAPER");
    expect(weight.parent?.name).toBe("shop-counter");
    // On the counter beside the scale — not on the pan, not replacing it.
    expect(weight.position.y).toBeGreaterThan(1.0);
    expect(weight.position.y).toBeLessThan(1.4);
    expect(Math.abs(weight.position.x)).toBeLessThan(1.5);
    expect(Math.abs(weight.position.z)).toBeLessThan(0.5);
    const dx = weight.position.x - scale.position.x;
    const dz = weight.position.z - scale.position.z;
    expect(Math.hypot(dx, dz)).toBeGreaterThan(0.12);
    expect(Math.hypot(dx, dz)).toBeLessThan(0.55);
    expect(shopScales(weight).length).toBe(0);

    expect(shopParcels(counter!).length).toBe(1);
    expect(shopBags(counter!).length).toBe(1);
    expect(shopDrawers(till!).length).toBe(1);
    expect(shopScales(counter!).length).toBe(1);
    expect(counter!.getObjectByName("shop-wall-shelf")).toBeTruthy();

    const colors = hexes(weight);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => KRAFT.has(c))).toBe(true);
    expect(colors.some((c) => c === CREAM)).toBe(true);
    expect(colors.some((c) => c === WOOD)).toBe(true);
    expect(colors.some((c) => c === STRAP)).toBe(true);
    expect(colors.every((c) => !isGrey(c))).toBe(true);

    let boxes = 0;
    weight.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("shop-weight");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(2);
  });

  it("keeps dress idempotent and hides the weight on undress", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressShop(scene);
    dressShop(scene);
    expect(interior.children.filter((c) => c.name === "shop-dress").length).toBe(1);
    expect(shopWeights(interior).length).toBe(1);
    expect(shopScales(interior).length).toBe(1);
    expect(shopDrawers(interior).length).toBe(1);
    expect(shopParcels(interior).length).toBe(1);
    expect(shopBags(interior).length).toBe(1);

    undressShop(scene);
    const dress = interior.getObjectByName("shop-dress");
    expect(dress).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(shopWeights(interior).length).toBe(1);
    expect(interior.userData.interiorUse).toBe("house");
  });
});

describe("shop PAPER kraft receipt slip", () => {
  it("puts a small kraft PAPER slip on the shop counter beside the till", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressShop(scene);

    const dress = interior.getObjectByName("shop-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");

    const counter = dress!.getObjectByName("shop-counter");
    expect(counter).toBeTruthy();
    const till = counter!.getObjectByName("shop-till");
    expect(till).toBeTruthy();
    expect(till!.userData.kind).toBe("shop-till");

    const slips = shopSlips(counter!);
    expect(slips.length).toBe(1);

    const slip = slips[0];
    expect(slip.userData.kind).toBe("shop-slip");
    expect(slip.userData.mode).toBe("PAPER");
    expect(slip.parent?.name).toBe("shop-counter");
    // On the counter beside the till — not on the drawer / scale / weight / parcel / bag.
    expect(slip.position.y).toBeGreaterThan(1.0);
    expect(slip.position.y).toBeLessThan(1.4);
    expect(Math.abs(slip.position.x)).toBeLessThan(1.5);
    expect(Math.abs(slip.position.z)).toBeLessThan(0.5);

    const neighbors = [
      till,
      shopScales(counter!)[0],
      shopWeights(counter!)[0],
      shopParcels(counter!)[0],
      shopBags(counter!)[0],
    ];
    for (const other of neighbors) {
      const dx = slip.position.x - other.position.x;
      const dz = slip.position.z - other.position.z;
      expect(Math.hypot(dx, dz)).toBeGreaterThan(0.12);
    }
    const drawer = shopDrawers(till!)[0];
    expect(drawer).toBeTruthy();
    const ddx = slip.position.x - (till!.position.x + drawer.position.x);
    const ddz = slip.position.z - (till!.position.z + drawer.position.z);
    expect(Math.hypot(ddx, ddz)).toBeGreaterThan(0.12);
    expect(shopDrawers(slip).length).toBe(0);
    expect(shopScales(slip).length).toBe(0);
    expect(shopWeights(slip).length).toBe(0);
    expect(shopParcels(slip).length).toBe(0);
    expect(shopBags(slip).length).toBe(0);

    expect(shopParcels(counter!).length).toBe(1);
    expect(shopBags(counter!).length).toBe(1);
    expect(shopDrawers(till!).length).toBe(1);
    expect(shopScales(counter!).length).toBe(1);
    expect(shopWeights(counter!).length).toBe(1);
    expect(counter!.getObjectByName("shop-wall-shelf")).toBeTruthy();

    const colors = hexes(slip);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => SLIP.has(c))).toBe(true);
    expect(colors.some((c) => SLIP_SHEET.has(c))).toBe(true);
    expect(colors.some((c) => SLIP_EDGE.has(c))).toBe(true);
    expect(colors.every((c) => !isGrey(c))).toBe(true);

    let boxes = 0;
    slip.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("shop-slip");
        expect(mesh.userData.mode).toBe("PAPER");
        const box = mesh.geometry as THREE.BoxGeometry;
        expect(box.parameters.height).toBeLessThan(0.04);
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(2);
  });

  it("keeps dress idempotent and hides the slip on undress", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressShop(scene);
    dressShop(scene);
    expect(interior.children.filter((c) => c.name === "shop-dress").length).toBe(1);
    expect(shopSlips(interior).length).toBe(1);
    expect(shopWeights(interior).length).toBe(1);
    expect(shopScales(interior).length).toBe(1);
    expect(shopDrawers(interior).length).toBe(1);
    expect(shopParcels(interior).length).toBe(1);
    expect(shopBags(interior).length).toBe(1);

    undressShop(scene);
    const dress = interior.getObjectByName("shop-dress");
    expect(dress).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(shopSlips(interior).length).toBe(1);
    expect(interior.userData.interiorUse).toBe("house");
  });
});

describe("shop PAPER kraft ink stamp", () => {
  it("puts a small kraft PAPER stamp on the shop counter beside the till", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressShop(scene);

    const dress = interior.getObjectByName("shop-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");

    const counter = dress!.getObjectByName("shop-counter");
    expect(counter).toBeTruthy();
    const till = counter!.getObjectByName("shop-till");
    expect(till).toBeTruthy();
    expect(till!.userData.kind).toBe("shop-till");

    const stamps = shopStamps(counter!);
    expect(stamps.length).toBe(1);

    const stamp = stamps[0];
    expect(stamp.userData.kind).toBe("shop-stamp");
    expect(stamp.userData.mode).toBe("PAPER");
    expect(stamp.parent?.name).toBe("shop-counter");
    // On the counter beside the till — not on the drawer / scale / weight / slip / parcel / bag.
    expect(stamp.position.y).toBeGreaterThan(1.0);
    expect(stamp.position.y).toBeLessThan(1.4);
    expect(Math.abs(stamp.position.x)).toBeLessThan(1.5);
    expect(Math.abs(stamp.position.z)).toBeLessThan(0.5);

    const neighbors = [
      till,
      shopScales(counter!)[0],
      shopWeights(counter!)[0],
      shopSlips(counter!)[0],
      shopParcels(counter!)[0],
      shopBags(counter!)[0],
    ];
    for (const other of neighbors) {
      const dx = stamp.position.x - other.position.x;
      const dz = stamp.position.z - other.position.z;
      expect(Math.hypot(dx, dz)).toBeGreaterThan(0.12);
    }
    const drawer = shopDrawers(till!)[0];
    expect(drawer).toBeTruthy();
    const ddx = stamp.position.x - (till!.position.x + drawer.position.x);
    const ddz = stamp.position.z - (till!.position.z + drawer.position.z);
    expect(Math.hypot(ddx, ddz)).toBeGreaterThan(0.12);
    expect(shopDrawers(stamp).length).toBe(0);
    expect(shopScales(stamp).length).toBe(0);
    expect(shopWeights(stamp).length).toBe(0);
    expect(shopSlips(stamp).length).toBe(0);
    expect(shopParcels(stamp).length).toBe(0);
    expect(shopBags(stamp).length).toBe(0);

    expect(shopParcels(counter!).length).toBe(1);
    expect(shopBags(counter!).length).toBe(1);
    expect(shopDrawers(till!).length).toBe(1);
    expect(shopScales(counter!).length).toBe(1);
    expect(shopWeights(counter!).length).toBe(1);
    expect(shopSlips(counter!).length).toBe(1);
    expect(counter!.getObjectByName("shop-wall-shelf")).toBeTruthy();

    const colors = hexes(stamp);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => STAMP.has(c))).toBe(true);
    expect(colors.some((c) => c === WOOD)).toBe(true);
    expect(colors.some((c) => c === STRAP || c === CORAL)).toBe(true);
    expect(colors.every((c) => !isGrey(c))).toBe(true);

    let boxes = 0;
    stamp.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("shop-stamp");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(2);
  });

  it("keeps dress idempotent and hides the stamp on undress", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressShop(scene);
    dressShop(scene);
    expect(interior.children.filter((c) => c.name === "shop-dress").length).toBe(1);
    expect(shopStamps(interior).length).toBe(1);
    expect(shopSlips(interior).length).toBe(1);
    expect(shopWeights(interior).length).toBe(1);
    expect(shopScales(interior).length).toBe(1);
    expect(shopDrawers(interior).length).toBe(1);
    expect(shopParcels(interior).length).toBe(1);
    expect(shopBags(interior).length).toBe(1);

    undressShop(scene);
    const dress = interior.getObjectByName("shop-dress");
    expect(dress).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(shopStamps(interior).length).toBe(1);
    expect(interior.userData.interiorUse).toBe("house");
  });
});

describe("shop PAPER kraft receipt", () => {
  it("puts a small kraft PAPER receipt on the shop counter beside the till", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressShop(scene);

    const dress = interior.getObjectByName("shop-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");

    const counter = dress!.getObjectByName("shop-counter");
    expect(counter).toBeTruthy();
    const till = counter!.getObjectByName("shop-till");
    expect(till).toBeTruthy();
    expect(till!.userData.kind).toBe("shop-till");

    const receipts = shopReceipts(counter!);
    expect(receipts.length).toBe(1);

    const receipt = receipts[0];
    expect(receipt.userData.kind).toBe("shop-receipt");
    expect(receipt.userData.part).toBe("receipt");
    expect(receipt.userData.mode).toBe("PAPER");
    expect(receipt.parent?.name).toBe("shop-counter");
    // On the counter beside the till — not on the drawer / scale / weight /
    // slip / stamp / parcel / bag. Not a wallet.
    expect(receipt.position.y).toBeGreaterThan(1.0);
    expect(receipt.position.y).toBeLessThan(1.4);
    expect(Math.abs(receipt.position.x)).toBeLessThan(1.5);
    expect(Math.abs(receipt.position.z)).toBeLessThan(0.5);

    const neighbors = [
      till,
      shopScales(counter!)[0],
      shopWeights(counter!)[0],
      shopSlips(counter!)[0],
      shopStamps(counter!)[0],
      shopParcels(counter!)[0],
      shopBags(counter!)[0],
    ];
    for (const other of neighbors) {
      const dx = receipt.position.x - other.position.x;
      const dz = receipt.position.z - other.position.z;
      expect(Math.hypot(dx, dz)).toBeGreaterThan(0.12);
    }
    const drawer = shopDrawers(till!)[0];
    expect(drawer).toBeTruthy();
    const ddx = receipt.position.x - (till!.position.x + drawer.position.x);
    const ddz = receipt.position.z - (till!.position.z + drawer.position.z);
    expect(Math.hypot(ddx, ddz)).toBeGreaterThan(0.12);
    expect(shopDrawers(receipt).length).toBe(0);
    expect(shopScales(receipt).length).toBe(0);
    expect(shopWeights(receipt).length).toBe(0);
    expect(shopSlips(receipt).length).toBe(0);
    expect(shopStamps(receipt).length).toBe(0);
    expect(shopParcels(receipt).length).toBe(0);
    expect(shopBags(receipt).length).toBe(0);

    expect(shopStamps(counter!).length).toBe(1);
    expect(shopScales(counter!).length).toBe(1);
    expect(till!.userData.kind).toBe("shop-till");
    expect(shopParcels(counter!).length).toBe(1);
    expect(shopBags(counter!).length).toBe(1);
    expect(shopDrawers(till!).length).toBe(1);
    expect(shopWeights(counter!).length).toBe(1);
    expect(shopSlips(counter!).length).toBe(1);
    expect(counter!.getObjectByName("shop-wall-shelf")).toBeTruthy();

    const colors = hexes(receipt);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => RECEIPT.has(c))).toBe(true);
    expect(colors.some((c) => c === WOOD)).toBe(true);
    expect(colors.some((c) => c === PAPER_CARD || c === LINEN)).toBe(true);
    expect(colors.every((c) => c === PAPER_CARD || !isGrey(c))).toBe(true);

    let boxes = 0;
    receipt.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("shop-receipt");
        expect(mesh.userData.part).toBe("receipt");
        expect(mesh.userData.mode).toBe("PAPER");
        const box = mesh.geometry as THREE.BoxGeometry;
        expect(box.parameters.height).toBeLessThan(0.04);
        expect(Math.max(box.parameters.width, box.parameters.height, box.parameters.depth)).toBeLessThan(
          0.15,
        );
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(2);
  });

  it("keeps dress idempotent and hides the receipt on undress", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressShop(scene);
    dressShop(scene);
    expect(interior.children.filter((c) => c.name === "shop-dress").length).toBe(1);
    expect(shopReceipts(interior).length).toBe(1);
    expect(shopStamps(interior).length).toBe(1);
    expect(shopScales(interior).length).toBe(1);
    expect(interior.getObjectByName("shop-till")).toBeTruthy();
    expect(shopSlips(interior).length).toBe(1);
    expect(shopWeights(interior).length).toBe(1);
    expect(shopDrawers(interior).length).toBe(1);
    expect(shopParcels(interior).length).toBe(1);
    expect(shopBags(interior).length).toBe(1);

    undressShop(scene);
    const dress = interior.getObjectByName("shop-dress");
    expect(dress).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(shopReceipts(interior).length).toBe(1);
    expect(shopStamps(interior).length).toBe(1);
    expect(shopScales(interior).length).toBe(1);
    expect(interior.getObjectByName("shop-till")).toBeTruthy();
    expect(interior.userData.interiorUse).toBe("house");
  });
});
