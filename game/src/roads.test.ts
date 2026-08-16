import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createLandBoard, heightAt, ISLANDS } from "./land.ts";
import {
  ASPHALT,
  CAMERA_FAR_M,
  DIRT_WIDTH_M,
  FOG_FAR_M,
  FOG_NEAR_M,
  PAVED_WIDTH_M,
  makeRoads,
  spawnCameraOffset,
  spawnLookAtOffset,
} from "../public/harbour/roads.js";

function lum(hex: number) {
  const r = ((hex >> 16) & 255) / 255;
  const g = ((hex >> 8) & 255) / 255;
  const b = (hex & 255) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

describe("paved street from spawn", () => {
  it("draws a black tarmac ribbon 6–8 m wide, no kerb kit; dirt stays thin and brown", () => {
    const map = createLandBoard();
    const added: { userData: { roadKind?: string }; geometry: { parameters: { width: number } }; material: { color: { getHex: () => number } } }[] =
      [];
    const scene = { add(obj: (typeof added)[number]) { added.push(obj); } };
    makeRoads(map, { scene, specOf: (id: "north" | "south") => ISLANDS[id], heightAt });

    const paved = added.filter((m) => m.userData.roadKind === "paved");
    const dirt = added.filter((m) => m.userData.roadKind === "dirt");
    const extras = added.filter((m) =>
      m.userData.roadKind === "centre-line" || m.userData.roadKind === "verge" || m.userData.roadKind === "curb",
    );

    expect(paved.length).toBeGreaterThan(8);
    expect(extras.length).toBe(0);
    expect(dirt.length).toBeGreaterThan(4);

    expect(PAVED_WIDTH_M).toBeGreaterThanOrEqual(6);
    expect(PAVED_WIDTH_M).toBeLessThanOrEqual(8);
    expect(paved[0].geometry.parameters.width).toBe(PAVED_WIDTH_M);
    expect(dirt[0].geometry.parameters.width).toBe(DIRT_WIDTH_M);
    expect(DIRT_WIDTH_M).toBeLessThan(4);

    expect(paved[0].material.color.getHex()).toBe(ASPHALT);
    expect(lum(ASPHALT)).toBeLessThan(0.12);
    expect(lum(dirt[0].material.color.getHex())).toBeGreaterThan(lum(ASPHALT));

    const dirtKinds = new Set(map.roads.filter((r) => r.kind === "dirt").map((r) => r.kind));
    expect(dirtKinds.has("dirt")).toBe(true);
    expect(added.some((m) => m.userData.roadKind === "dirt" && m.geometry.parameters.width >= 6)).toBe(
      false,
    );
  });

  it("places the spawn camera high, looking inland across the island mass", () => {
    const n = spawnCameraOffset("north");
    const s = spawnCameraOffset("south");
    const nl = spawnLookAtOffset("north");
    const sl = spawnLookAtOffset("south");

    expect(n.y).toBeGreaterThan(18);
    expect(n.y).toBeLessThan(40);
    expect(s.y).toBe(n.y);
    expect(Math.abs(n.x)).toBeLessThan(40);
    expect(nl.z).toBeLessThan(-80);
    expect(sl.z).toBeGreaterThan(80);

    const farM = ISLANDS.south.port.z - ISLANDS.north.port.z;
    const fogged = (farM - FOG_NEAR_M) / (FOG_FAR_M - FOG_NEAR_M);
    expect(farM).toBeGreaterThan(12000);
    expect(fogged).toBeGreaterThan(0.05);
    expect(fogged).toBeLessThan(0.35);
    expect(CAMERA_FAR_M).toBeGreaterThan(FOG_FAR_M);

    for (const id of ["north", "south"] as const) {
      const spec = ISLANDS[id];
      const o = spawnCameraOffset(id);
      const l = spawnLookAtOffset(id);
      const px = spec.port.x;
      const pz = spec.port.z + (id === "north" ? -8 : 8);
      const py = heightAt(spec, px, pz) + 1.15;
      const inland = id === "north" ? -1 : 1;
      const cam = new THREE.PerspectiveCamera(55, 16 / 9, 0.4, CAMERA_FAR_M);
      cam.position.set(px + o.x, py + o.y, pz + o.z);
      cam.lookAt(px + l.x, py + l.y, pz + l.z);
      cam.updateMatrixWorld();

      const ndc = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).project(cam);
      const inFrame = (v: THREE.Vector3) => Math.abs(v.x) < 0.95 && Math.abs(v.y) < 0.95 && v.z < 1;

      const player = ndc(px, py, pz);
      const roadInland = ndc(px, py, pz + inland * 900);
      const hill = ndc(spec.hill.x, heightAt(spec, spec.hill.x, spec.hill.z) + 4, spec.hill.z);

      expect(inFrame(player)).toBe(true);
      expect(inFrame(roadInland)).toBe(true);
      expect(inFrame(hill)).toBe(true);
    }
  });
});
