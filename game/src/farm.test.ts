import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { dressFarm, isFarmPlot, undressFarm } from "../public/harbour/farm.js";

const KRAFT = 0xf4ead8;
const WOOD = 0x7a5230;
const WOOD_DARK = 0x5a3a22;
const HANDLE = 0x8a6238;
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

describe("farm PAPER wood pail", () => {
  it("puts one kraft wood PAPER pail beside the churn", () => {
    const scene = new THREE.Scene();
    dressFarm(scene);

    const dress = scene.getObjectByName("farm-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");
    expect(dress!.visible).toBe(true);

    const pails: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.kind === "farm-pail" && obj.name === "farm-pail") {
        pails.push(obj);
      }
    });
    expect(pails.length).toBe(1);

    const pail = pails[0];
    expect(pail.userData.kind).toBe("farm-pail");
    expect(pail.userData.mode).toBe("PAPER");

    const churn = dress!.getObjectByName("farm-churn")!;
    expect(churn).toBeTruthy();
    const dist = Math.hypot(pail.position.x - churn.position.x, pail.position.z - churn.position.z);
    expect(dist).toBeGreaterThan(0.15);
    expect(dist).toBeLessThan(0.7);

    const trough = dress!.getObjectByName("farm-trough")!;
    const toTrough = Math.hypot(pail.position.x - trough.position.x, pail.position.z - trough.position.z);
    expect(toTrough).toBeGreaterThan(0.5);

    const colors = hexes(pail);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === KRAFT)).toBe(true);
    expect(colors.some((c) => c === WOOD || c === WOOD_DARK)).toBe(true);
    expect(colors.every((c) => [KRAFT, WOOD, WOOD_DARK, HANDLE, METAL].includes(c))).toBe(true);

    pail.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        expect(["BoxGeometry", "CylinderGeometry"]).toContain(mesh.geometry.type);
        expect(mesh.userData.kind).toBe("farm-pail");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
  });

  it("keeps dress idempotent and hides the pail on undress", () => {
    const scene = new THREE.Scene();
    dressFarm(scene);
    dressFarm(scene);
    expect(scene.children.filter((c) => c.name === "farm-dress").length).toBe(1);
    const dressed = scene.getObjectByName("farm-dress")!;
    const pails: THREE.Object3D[] = [];
    dressed.traverse((obj) => {
      if (obj.name === "farm-pail") pails.push(obj);
    });
    expect(pails.length).toBe(1);

    undressFarm(scene);
    const dress = scene.getObjectByName("farm-dress");
    expect(dress).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(scene.userData.interiorUse).toBe("house");
  });
});
