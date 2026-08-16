import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { dressFarm, isFarmPlot, undressFarm } from "../public/harbour/farm.js";

const KRAFT = 0xf4ead8;
const WOOD = 0x7a5230;
const METAL = 0x6a6a62;

function hexes(root: THREE.Object3D) {
  const colors: number[] = [];
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    const mat = mesh.material as THREE.MeshLambertMaterial | undefined;
    if (mesh.isMesh && mat?.color) colors.push(mat.color.getHex());
  });
  return colors;
}

describe("farm PAPER milk churn", () => {
  it("matches farm plots only", () => {
    expect(isFarmPlot({ use: "farm" })).toBe(true);
    expect(isFarmPlot({ kind: "farm" })).toBe(true);
    expect(isFarmPlot({ use: "house" })).toBe(false);
    expect(isFarmPlot(null)).toBe(false);
  });

  it("puts a kraft PAPER milk churn beside the trough", () => {
    const scene = new THREE.Scene();
    dressFarm(scene);

    const dress = scene.getObjectByName("farm-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");
    expect(dress!.userData.provenance).toBe("SIMULATED");
    expect(dress!.visible).toBe(true);

    const churns: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.kind === "farm-churn" && obj.name === "farm-churn") {
        churns.push(obj);
      }
    });
    expect(churns.length).toBe(1);

    const churn = churns[0];
    expect(churn.userData.kind).toBe("farm-churn");
    expect(churn.userData.mode).toBe("PAPER");

    const trough = dress!.getObjectByName("farm-trough")!;
    expect(trough).toBeTruthy();
    const dist = Math.hypot(churn.position.x - trough.position.x, churn.position.z - trough.position.z);
    expect(dist).toBeGreaterThan(0.2);
    expect(dist).toBeLessThan(0.7);

    const colors = hexes(churn);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === KRAFT)).toBe(true);
    expect(colors.some((c) => c === WOOD)).toBe(true);
    expect(colors.some((c) => c === METAL)).toBe(true);

    churn.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        expect(["BoxGeometry", "CylinderGeometry"]).toContain(mesh.geometry.type);
        expect(mesh.userData.kind).toBe("farm-churn");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
  });

  it("keeps dress idempotent and hides the churn on undress", () => {
    const scene = new THREE.Scene();
    dressFarm(scene);
    dressFarm(scene);
    expect(scene.children.filter((c) => c.name === "farm-dress").length).toBe(1);

    undressFarm(scene);
    const dress = scene.getObjectByName("farm-dress");
    expect(dress).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(scene.userData.interiorUse).toBe("house");
  });
});
