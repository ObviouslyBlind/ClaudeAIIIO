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
  it("draws dark asphalt 6–8 m wide with a dashed centre line; dirt stays thin and brown", () => {
    const map = createLandBoard();
    const added: { userData: { roadKind?: string }; geometry: { parameters: { width: number } }; material: { color: { getHex: () => number } } }[] =
      [];
    const scene = { add(obj: (typeof added)[number]) { added.push(obj); } };
    makeRoads(map, { scene, specOf: (id: "north" | "south") => ISLANDS[id], heightAt });

    const paved = added.filter((m) => m.userData.roadKind === "paved");
    const dirt = added.filter((m) => m.userData.roadKind === "dirt");
    const lines = added.filter((m) => m.userData.roadKind === "centre-line");
    const verge = added.filter((m) => m.userData.roadKind === "verge");
    const curb = added.filter((m) => m.userData.roadKind === "curb");

    expect(paved.length).toBeGreaterThan(8);
    expect(lines.length).toBeGreaterThan(8);
    expect(verge.length).toBe(paved.length);
    expect(curb.length).toBe(paved.length * 2);
    expect(dirt.length).toBeGreaterThan(4);

    expect(PAVED_WIDTH_M).toBeGreaterThanOrEqual(6);
    expect(PAVED_WIDTH_M).toBeLessThanOrEqual(8);
    expect(paved[0].geometry.parameters.width).toBe(PAVED_WIDTH_M);
    expect(dirt[0].geometry.parameters.width).toBe(DIRT_WIDTH_M);
    expect(DIRT_WIDTH_M).toBeLessThan(4);

    expect(paved[0].material.color.getHex()).toBe(ASPHALT);
    expect(lum(ASPHALT)).toBeLessThan(0.22);
    expect(lum(dirt[0].material.color.getHex())).toBeGreaterThan(lum(ASPHALT));

    const dirtKinds = new Set(map.roads.filter((r) => r.kind === "dirt").map((r) => r.kind));
    expect(dirtKinds.has("dirt")).toBe(true);
    expect(added.some((m) => m.userData.roadKind === "dirt" && m.geometry.parameters.width >= 6)).toBe(
      false,
    );
  });

  it("places the spawn camera inland-and-east so the street and far shore share one frame", () => {
    // Intended north: offset { x: 56, y: 54, z: -132 }, lookAt { x: 0, y: 2, z: 240 }.
    // East of the spine (not inland-only water). Inland of the player so look faces
    // the channel. Far shore: LEFT of the north spawn frame, RIGHT on south.
    const n = spawnCameraOffset("north");
    const s = spawnCameraOffset("south");
    const nl = spawnLookAtOffset("north");
    const sl = spawnLookAtOffset("south");

    expect(n).toEqual({ x: 56, y: 54, z: -132 });
    expect(s).toEqual({ x: 56, y: 54, z: 132 });
    expect(nl).toEqual({ x: 0, y: 2, z: 240 });
    expect(sl).toEqual({ x: 0, y: 2, z: -240 });

    expect(n.x).toBeGreaterThan(40);
    expect(n.z).toBeLessThan(0);
    expect(s.z).toBeGreaterThan(0);
    expect(n.y).toBeGreaterThan(40);
    expect(n.y).toBeLessThan(80);
    expect(nl.z).toBeGreaterThan(100);
    expect(sl.z).toBeLessThan(-100);

    const farM = ISLANDS.south.port.z - ISLANDS.north.port.z;
    const fogged = (farM - FOG_NEAR_M) / (FOG_FAR_M - FOG_NEAR_M);
    expect(farM).toBeGreaterThan(8000);
    expect(fogged).toBeGreaterThan(0.05);
    expect(fogged).toBeLessThan(0.25);
    expect(CAMERA_FAR_M).toBeGreaterThan(FOG_FAR_M);

    for (const id of ["north", "south"] as const) {
      const spec = ISLANDS[id];
      const o = spawnCameraOffset(id);
      const l = spawnLookAtOffset(id);
      const px = spec.port.x;
      const pz = spec.port.z + (id === "north" ? -8 : 8);
      const py = heightAt(spec, px, pz) + 1.15;
      const inland = id === "north" ? -1 : 1;
      const other = id === "north" ? ISLANDS.south : ISLANDS.north;
      const cam = new THREE.PerspectiveCamera(55, 16 / 9, 0.4, CAMERA_FAR_M);
      cam.position.set(px + o.x, py + o.y, pz + o.z);
      cam.lookAt(px + l.x, py + l.y, pz + l.z);
      cam.updateMatrixWorld();

      const ndc = (x: number, y: number, z: number) => {
        const v = new THREE.Vector3(x, y, z).project(cam);
        return v;
      };
      const inFrame = (v: THREE.Vector3) =>
        Math.abs(v.x) < 0.92 && Math.abs(v.y) < 0.92 && v.z < 1;

      const player = ndc(px, py, pz);
      const dash = ndc(px, py - 0.6, pz + inland * 20);
      const farShore = ndc(other.cx, 12, other.cz - Math.sign(other.cz) * other.rz);

      expect(inFrame(player)).toBe(true);
      expect(inFrame(dash)).toBe(true);
      expect(inFrame(farShore)).toBe(true);
      if (id === "north") expect(farShore.x).toBeLessThan(0);
      else expect(farShore.x).toBeGreaterThan(0);
      expect(farShore.y).toBeGreaterThan(0.1);
    }
  });
});
