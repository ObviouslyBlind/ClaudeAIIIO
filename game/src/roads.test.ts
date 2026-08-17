import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createLandBoard, heightAt, ISLANDS } from "./land.ts";
import {
  ASPHALT,
  CAMERA_FAR_M,
  DIRT,
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

type RoadMesh = {
  userData: { roadKind?: string; widthM?: number };
  geometry: {
    parameters?: { width: number };
    attributes: { position: { count: number; getX: (i: number) => number; getZ: (i: number) => number } };
    index: { count: number } | null;
  };
  material: { color: { getHex: () => number } };
};

function ribbonWidthM(mesh: RoadMesh) {
  const pos = mesh.geometry.attributes.position;
  return Math.hypot(pos.getX(0) - pos.getX(1), pos.getZ(0) - pos.getZ(1));
}

describe("paved street from spawn", () => {
  it("draws a black tarmac ribbon 6–8 m wide, no kerb kit; dirt stays thin and brown", () => {
    const map = createLandBoard();
    const added: RoadMesh[] = [];
    const scene = { add(obj: RoadMesh) { added.push(obj); } };
    makeRoads(map, { scene, specOf: (id: "north" | "south") => ISLANDS[id], heightAt });

    const paved = added.filter((m) => m.userData.roadKind === "paved");
    const dirt = added.filter((m) => m.userData.roadKind === "dirt");
    const extras = added.filter((m) =>
      m.userData.roadKind === "centre-line" || m.userData.roadKind === "verge" || m.userData.roadKind === "curb",
    );
    const pavedRoads = map.roads.filter((r) => r.kind === "paved");
    const dirtRoads = map.roads.filter((r) => r.kind === "dirt");

    expect(paved.length).toBe(pavedRoads.length);
    expect(extras.length).toBe(0);
    expect(dirt.length).toBe(dirtRoads.length);
    expect(dirt.length).toBeGreaterThan(4);

    expect(PAVED_WIDTH_M).toBeGreaterThanOrEqual(6);
    expect(PAVED_WIDTH_M).toBeLessThanOrEqual(8);
    expect(paved[0].geometry.parameters).toBeUndefined();
    expect(ribbonWidthM(paved[0])).toBeCloseTo(PAVED_WIDTH_M, 3);
    expect(paved[0].userData.widthM).toBe(PAVED_WIDTH_M);
    expect(dirt[0].geometry.parameters).toBeUndefined();
    expect(ribbonWidthM(dirt[0])).toBeCloseTo(DIRT_WIDTH_M, 3);
    expect(dirt[0].userData.widthM).toBe(DIRT_WIDTH_M);
    expect(DIRT_WIDTH_M).toBe(2.6);
    expect(DIRT_WIDTH_M).toBeLessThan(4);

    expect(paved[0].material.color.getHex()).toBe(ASPHALT);
    expect(dirt[0].material.color.getHex()).toBe(DIRT);
    expect(DIRT).toBe(0x8a6238);
    expect(lum(ASPHALT)).toBeLessThan(0.12);
    expect(lum(dirt[0].material.color.getHex())).toBeGreaterThan(lum(ASPHALT));

    const dirtKinds = new Set(map.roads.filter((r) => r.kind === "dirt").map((r) => r.kind));
    expect(dirtKinds.has("dirt")).toBe(true);
    expect(added.some((m) => m.userData.roadKind === "dirt" && ribbonWidthM(m) >= 6)).toBe(false);
  });

  it("extrudes each dirt polyline as one brown ribbon, not a chain of box slabs", () => {
    const map = createLandBoard();
    const added: RoadMesh[] = [];
    const scene = { add(obj: RoadMesh) { added.push(obj); } };
    makeRoads(map, { scene, specOf: (id: "north" | "south") => ISLANDS[id], heightAt });

    const dirt = added.filter((m) => m.userData.roadKind === "dirt");
    const dirtRoads = map.roads.filter((r) => r.kind === "dirt");
    expect(dirt.length).toBe(dirtRoads.length);

    for (let i = 0; i < dirt.length; i++) {
      const mesh = dirt[i];
      const pts = dirtRoads[i].points;
      const pos = mesh.geometry.attributes.position;
      expect(mesh.geometry.parameters).toBeUndefined();
      expect(pos.count).toBeGreaterThanOrEqual(8);
      expect(mesh.geometry.index?.count ?? 0).toBeGreaterThan(24);
      expect(ribbonWidthM(mesh)).toBeCloseTo(DIRT_WIDTH_M, 2);
      expect(mesh.userData.widthM).toBe(DIRT_WIDTH_M);
      expect(mesh.material.color.getHex()).toBe(DIRT);

      const start = { x: pos.getX(0), z: pos.getZ(0) };
      const last = pos.count - 4;
      const end = { x: pos.getX(last), z: pos.getZ(last) };
      const firstPt = pts[0];
      const lastPt = pts[pts.length - 1];
      const startDist = Math.min(
        Math.hypot(start.x - firstPt.x, start.z - firstPt.z),
        Math.hypot(start.x - lastPt.x, start.z - lastPt.z),
      );
      const endDist = Math.min(
        Math.hypot(end.x - firstPt.x, end.z - firstPt.z),
        Math.hypot(end.x - lastPt.x, end.z - lastPt.z),
      );
      expect(startDist).toBeLessThan(DIRT_WIDTH_M);
      expect(endDist).toBeLessThan(DIRT_WIDTH_M);
    }
  });

  it("extrudes each paved polyline as one mesh, not a chain of box slabs", () => {
    const map = createLandBoard();
    const added: RoadMesh[] = [];
    const scene = { add(obj: RoadMesh) { added.push(obj); } };
    makeRoads(map, { scene, specOf: (id: "north" | "south") => ISLANDS[id], heightAt });

    const paved = added.filter((m) => m.userData.roadKind === "paved");
    const pavedRoads = map.roads.filter((r) => r.kind === "paved");
    expect(paved.length).toBe(pavedRoads.length);
    expect(paved.length).toBe(2);

    for (let i = 0; i < paved.length; i++) {
      const mesh = paved[i];
      const pts = pavedRoads[i].points;
      const pos = mesh.geometry.attributes.position;
      expect(pos.count).toBeGreaterThan(8);
      expect(mesh.geometry.index?.count ?? 0).toBeGreaterThan(24);
      expect(ribbonWidthM(mesh)).toBeCloseTo(PAVED_WIDTH_M, 3);

      const start = { x: pos.getX(0), z: pos.getZ(0) };
      const last = pos.count - 4;
      const end = { x: pos.getX(last), z: pos.getZ(last) };
      const midL = { x: (start.x + end.x) / 2, z: (start.z + end.z) / 2 };
      const midR = {
        x: (pos.getX(1) + pos.getX(last + 1)) / 2,
        z: (pos.getZ(1) + pos.getZ(last + 1)) / 2,
      };
      expect(Math.hypot(midR.x - midL.x, midR.z - midL.z)).toBeGreaterThan(PAVED_WIDTH_M * 0.5);

      const firstPt = pts[0];
      const lastPt = pts[pts.length - 1];
      const startDist = Math.min(
        Math.hypot(start.x - firstPt.x, start.z - firstPt.z),
        Math.hypot(start.x - lastPt.x, start.z - lastPt.z),
      );
      const endDist = Math.min(
        Math.hypot(end.x - firstPt.x, end.z - firstPt.z),
        Math.hypot(end.x - lastPt.x, end.z - lastPt.z),
      );
      expect(startDist).toBeLessThan(PAVED_WIDTH_M);
      expect(endDist).toBeLessThan(PAVED_WIDTH_M);
    }
  });

  it("places the spawn camera on the quay looking inland along the tarmac", () => {
    const n = spawnCameraOffset("north");
    const s = spawnCameraOffset("south");
    const nl = spawnLookAtOffset("north");
    const sl = spawnLookAtOffset("south");

    expect(n.y).toBeGreaterThan(18);
    expect(n.y).toBeLessThan(40);
    expect(s.y).toBe(n.y);
    expect(Math.abs(n.x)).toBeLessThan(40);
    expect(n.z).toBeGreaterThan(0);
    expect(s.z).toBeLessThan(0);
    expect(nl.z).toBeLessThan(-40);
    expect(sl.z).toBeGreaterThan(40);

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
      const spine = ndc(px, py + 2, pz + inland * 80);
      expect(inFrame(player)).toBe(true);
      expect(inFrame(spine)).toBe(true);
    }

    const north = ISLANDS.north;
    const o = spawnCameraOffset("north");
    const l = spawnLookAtOffset("north");
    const px = north.port.x;
    const pz = north.port.z - 8;
    const py = heightAt(north, px, pz) + 1.15;
    const cam = new THREE.PerspectiveCamera(55, 16 / 9, 0.4, CAMERA_FAR_M);
    cam.position.set(px + o.x, py + o.y, pz + o.z);
    cam.lookAt(px + l.x, py + l.y, pz + l.z);
    cam.updateMatrixWorld();
    const berth = new THREE.Vector3(0, 1.2, -6835).project(cam);
    expect(berth.z).toBeGreaterThanOrEqual(1);
  });
});
