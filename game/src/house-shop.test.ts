import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { makeInteriorScene } from "../public/harbour/interior.js";
import {
  dressHouseShop,
  isHouseShopPlot,
  undressHouseShop,
} from "../public/harbour/house-shop.js";

const WOOD = 0x8a6238;
const WOOD_TOP = 0x9a6a40;
const TIN = 0xc4a574;
const CREAM = 0xe8d7b8;
const KRAFT = new Set([WOOD, WOOD_TOP, TIN, CREAM, 0x6a4428, 0xf4ead8, 0xf3efe4]);

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

describe("house-shop PAPER shop bell", () => {
  it("matches house-shop plots only", () => {
    expect(isHouseShopPlot({ use: "house_shop" })).toBe(true);
    expect(isHouseShopPlot({ kind: "house_shop" })).toBe(true);
    expect(isHouseShopPlot({ use: "house" })).toBe(false);
    expect(isHouseShopPlot(null)).toBe(false);
  });

  it("hangs a small kraft PAPER bell above the house-shop counter", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressHouseShop(scene);

    const dress = interior.getObjectByName("house-shop-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");
    expect(dress!.visible).toBe(true);

    const bells: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.kind === "house-shop-bell" && obj.name === "house-shop-bell") {
        bells.push(obj);
      }
    });
    expect(bells.length).toBeGreaterThanOrEqual(1);

    const bell = bells[0];
    expect(bell.userData.kind).toBe("house-shop-bell");
    expect(bell.userData.mode).toBe("PAPER");
    expect(bell.position.y).toBeGreaterThan(1.4);
    expect(bell.position.y).toBeLessThan(2.2);
    expect(Math.abs(bell.position.x)).toBeLessThan(1.4);
    expect(bell.position.z).toBeGreaterThan(0.1);
    expect(bell.position.z).toBeLessThan(1.1);

    const colors = hexes(bell);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === TIN)).toBe(true);
    expect(colors.some((c) => c === WOOD)).toBe(true);
    expect(colors.every((c) => c === TIN || c === WOOD)).toBe(true);
    expect(colors.every((c) => !isGrey(c))).toBe(true);

    bell.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("house-shop-bell");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
  });

  it("keeps dress idempotent and hides the bell on undress", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressHouseShop(scene);
    dressHouseShop(scene);
    const dresses = [];
    interior.traverse((obj) => {
      if (obj.name === "house-shop-dress") dresses.push(obj);
    });
    expect(dresses.length).toBe(1);

    undressHouseShop(scene);
    const dress = interior.getObjectByName("house-shop-dress");
    expect(dress).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(interior.userData.interiorUse).toBe("house");
  });
});

describe("house-shop PAPER receipt pad", () => {
  it("sits a kraft PAPER pad on the house-shop counter", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressHouseShop(scene);

    const dress = interior.getObjectByName("house-shop-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");

    const pads: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.kind === "house-shop-pad" && obj.name === "house-shop-pad") {
        pads.push(obj);
      }
    });
    expect(pads.length).toBe(1);

    const pad = pads[0];
    expect(pad.userData.kind).toBe("house-shop-pad");
    expect(pad.userData.mode).toBe("PAPER");
    // Counter top is ~1.12; pad sits on it, not hanging with the bell.
    expect(pad.position.y).toBeGreaterThan(1.0);
    expect(pad.position.y).toBeLessThan(1.25);
    expect(Math.abs(pad.position.x)).toBeLessThan(1.2);
    expect(pad.position.z).toBeGreaterThan(0.1);
    expect(pad.position.z).toBeLessThan(0.9);

    const bell = dress!.getObjectByName("house-shop-bell");
    expect(bell).toBeTruthy();
    const offset = Math.hypot(pad.position.x - bell!.position.x, pad.position.z - bell!.position.z);
    expect(offset).toBeGreaterThan(0.25);

    const colors = hexes(pad);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => KRAFT.has(c))).toBe(true);
    expect(colors.some((c) => c === WOOD || c === WOOD_TOP)).toBe(true);
    expect(colors.some((c) => c === CREAM || c === TIN)).toBe(true);
    expect(colors.every((c) => !isGrey(c))).toBe(true);

    pad.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("house-shop-pad");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
  });

  it("keeps dress idempotent and hides the pad on undress", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressHouseShop(scene);
    dressHouseShop(scene);

    const pads: THREE.Object3D[] = [];
    interior.traverse((obj) => {
      if (obj.name === "house-shop-pad") pads.push(obj);
    });
    expect(pads.length).toBe(1);

    undressHouseShop(scene);
    const dress = interior.getObjectByName("house-shop-dress");
    const pad = interior.getObjectByName("house-shop-pad");
    expect(dress).toBeTruthy();
    expect(pad).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(interior.userData.interiorUse).toBe("house");
  });
});
