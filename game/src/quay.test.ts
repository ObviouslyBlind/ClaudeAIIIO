import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { distToPaved, heightAt, ISLANDS, ROAD_CLEAR } from "./land.ts";
import {
  makeQuay,
  PIER_PALM_OFFSETS,
  QUAY_LAND_SPOTS,
  quayWorldPoint,
} from "../public/harbour/quay.js";

function collectDress(root: THREE.Object3D, kind: string) {
  const out: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.userData?.dress === kind) out.push(obj);
  });
  return out;
}

function hexes(root: THREE.Object3D) {
  const colors: number[] = [];
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    const mat = mesh.material as THREE.MeshLambertMaterial | THREE.MeshLambertMaterial[] | undefined;
    if (!mat) return;
    if (Array.isArray(mat)) {
      for (const m of mat) if (m.color) colors.push(m.color.getHex());
    } else if (mat.color) colors.push(mat.color.getHex());
  });
  return colors;
}

function isGrey(hex: number) {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  return Math.max(r, g, b) - Math.min(r, g, b) < 18;
}

describe("quay harbour dressing", () => {
  it("clusters 8–12 extra palms near the pier and keeps land kit off the paved road", () => {
    expect(PIER_PALM_OFFSETS.length).toBeGreaterThanOrEqual(8);
    expect(PIER_PALM_OFFSETS.length).toBeLessThanOrEqual(12);
    expect(QUAY_LAND_SPOTS.some((s) => s.kind === "lean-to")).toBe(true);

    for (const id of ["north", "south"] as const) {
      const spec = ISLANDS[id];
      for (const spot of [...PIER_PALM_OFFSETS, ...QUAY_LAND_SPOTS]) {
        expect(Math.abs(spot.x)).toBeGreaterThanOrEqual(ROAD_CLEAR);
        expect(Math.abs(spot.x)).toBeLessThan(16);
        expect(Math.hypot(spot.x, spot.along)).toBeLessThan(45);
        const at = quayWorldPoint(spec, spot.x, spot.along);
        expect(distToPaved(spec, at.x, at.z)).toBeGreaterThanOrEqual(ROAD_CLEAR);
        expect(heightAt(spec, at.x, at.z)).toBeGreaterThanOrEqual(0.35);
      }
    }
  });

  it("plants the extra kit on the north quay in wood, canvas, rust, and plaster", () => {
    const added: THREE.Object3D[] = [];
    const scene = { add(obj: THREE.Object3D) { added.push(obj); } };
    const root = makeQuay(ISLANDS.north, { scene, heightAt });
    expect(added).toEqual([root]);
    expect(collectDress(root, "palm").length).toBe(PIER_PALM_OFFSETS.length);
    expect(collectDress(root, "lean-to").length).toBe(1);
    expect(collectDress(root, "crate").length).toBeGreaterThanOrEqual(6);
    expect(collectDress(root, "bollard").length).toBeGreaterThanOrEqual(12);
    expect(collectDress(root, "rope-box").length).toBeGreaterThanOrEqual(2);
    expect(collectDress(root, "rope").length).toBeGreaterThanOrEqual(2);
    const colors = hexes(root);
    expect(colors.some(isGrey)).toBe(true);
    expect(colors.every(isGrey)).toBe(false);
    expect(colors).toContain(0xe4d2b0);
    expect(colors).toContain(0xc4b496);
    expect(colors).toContain(0x6e2e22);
    expect(colors).toContain(0x8a6238);
  });
});
