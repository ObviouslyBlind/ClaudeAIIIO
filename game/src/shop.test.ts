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
