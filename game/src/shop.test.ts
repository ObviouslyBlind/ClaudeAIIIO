import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { makeInteriorScene } from "../public/harbour/interior.js";
import { dressShop, isShopPlot, undressShop } from "../public/harbour/shop.js";

const WOOD = 0x8a6238;
const CREAM = 0xe8d7b8;
const STRAP = 0x5a3a22;
const KRAFT = new Set([WOOD, CREAM, STRAP]);

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
