import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { makeInteriorScene } from "../public/harbour/interior.js";
import {
  dressWarehouse,
  isWarehousePlot,
  undressWarehouse,
} from "../public/harbour/warehouse.js";

const KRAFT = new Set([0x8a6238, 0x7a5230, 0x9a6a40, 0x5a3a22]);

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

function floorCrates(root: THREE.Object3D) {
  const out: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.name === "warehouse-floor-crate") out.push(obj);
  });
  return out;
}

describe("warehouse PAPER floor crates", () => {
  it("matches warehouse plots only", () => {
    expect(isWarehousePlot({ use: "warehouse" })).toBe(true);
    expect(isWarehousePlot({ kind: "warehouse" })).toBe(true);
    expect(isWarehousePlot({ use: "house" })).toBe(false);
    expect(isWarehousePlot(null)).toBe(false);
  });

  it("puts 2–4 kraft PAPER crates on the downstairs floor", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressWarehouse(scene);

    const dress = interior.getObjectByName("warehouse-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");
    expect(dress!.visible).toBe(true);

    const crates = floorCrates(dress!);
    expect(crates.length).toBeGreaterThanOrEqual(2);
    expect(crates.length).toBeLessThanOrEqual(4);

    for (const crate of crates) {
      expect(crate.userData.kind).toBe("warehouse-crate");
      expect(crate.userData.mode).toBe("PAPER");
      expect(crate.userData.part).toBe("floor-crate");
      expect(crate.position.y).toBe(0);
      expect(Math.abs(crate.position.x)).toBeLessThan(3.2);
      expect(Math.abs(crate.position.z)).toBeLessThan(3.0);
      const colors = hexes(crate);
      expect(colors.length).toBeGreaterThan(0);
      expect(colors.every((c) => KRAFT.has(c))).toBe(true);
      expect(colors.some((c) => c === 0x8a6238 || c === 0x7a5230 || c === 0x9a6a40)).toBe(true);
      expect(colors.every((c) => !isGrey(c))).toBe(true);
    }
  });

  it("keeps dress idempotent and hides crates on undress", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressWarehouse(scene);
    dressWarehouse(scene);
    expect(interior.children.filter((c) => c.name === "warehouse-dress").length).toBe(1);
    expect(floorCrates(interior).length).toBeGreaterThanOrEqual(2);

    undressWarehouse(scene);
    const dress = interior.getObjectByName("warehouse-dress");
    expect(dress).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(interior.userData.interiorUse).toBe("house");
  });
});
