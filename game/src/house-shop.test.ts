import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { makeInteriorScene } from "../public/harbour/interior.js";
import {
  dressHouseShop,
  isHouseShopPlot,
  undressHouseShop,
} from "../public/harbour/house-shop.js";

const WOOD = 0x8a6238;
const TIN = 0xc4a574;

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
