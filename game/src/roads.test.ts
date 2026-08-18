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
  LOCAL_WIDTH_M,
  HIGHWAY_LANE_OFFSET_M,
  HIGHWAY_MEDIAN_M,
  HIGHWAY_RAB_SKIP_M,
  makeRoads,
  spawnCameraOffset,
  spawnLookAtOffset,
} from "../public/harbour/roads.js";
import { ROAD_CLASSES, carriagewayWidthM, roadWidthM } from "../public/harbour/roadclass.js";
import { SOUTH_RAB } from "./southGeom.ts";

function lum(hex: number) {
  const r = ((hex >> 16) & 255) / 255;
  const g = ((hex >> 8) & 255) / 255;
  const b = (hex & 255) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

type RoadMesh = {
  userData: { roadKind?: string; widthM?: number; island?: string; roadName?: string };
  geometry: {
    parameters?: { width: number; innerRadius?: number };
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
    const extraCarriages = pavedRoads.filter((r) => r.lanes === 4).length;

    expect(paved.length).toBe(pavedRoads.length + extraCarriages);
    expect(extras.length).toBe(0);
    const walks = added.filter((m) => m.userData.roadKind === "sidewalk");
    expect(walks.length).toBeGreaterThan(4);
    expect(walks.every((m) => ribbonWidthM(m) < PAVED_WIDTH_M)).toBe(true);
    expect(dirt.length).toBe(dirtRoads.length);
    expect(dirt.length).toBeGreaterThan(4);

    expect(PAVED_WIDTH_M).toBeGreaterThanOrEqual(6);
    expect(PAVED_WIDTH_M).toBeLessThanOrEqual(8);
    expect(paved[0].geometry.parameters).toBeUndefined();
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

  it("reads as a hierarchy: highway wider than avenue wider than street wider than lane", () => {
    const map = createLandBoard();
    const added: RoadMesh[] = [];
    const scene = { add(obj: RoadMesh) { added.push(obj); } };
    makeRoads(map, { scene, specOf: (id: "north" | "south") => ISLANDS[id], heightAt });

    const widthFor = (cls: string) => {
      const road = map.roads.find((r) => r.cls === cls && !r.roundabout);
      expect(road, `no ${cls} authored`).toBeTruthy();
      const mesh = added.find(
        (m) => m.userData.roadKind === "paved" && m.userData.roadName === road!.name,
      );
      expect(mesh, `no mesh for ${cls}`).toBeTruthy();
      return ribbonWidthM(mesh!);
    };

    const highway = widthFor("highway");
    const avenue = widthFor("avenue");
    const street = widthFor("street");
    const lane = widthFor("lane");

    // One highway carriageway is narrower than an avenue; the pair plus the
    // median is what makes it read big, so compare the full footprint too.
    expect(carriagewayWidthM("highway")).toBeGreaterThan(roadWidthM("avenue"));
    expect(roadWidthM("avenue")).toBeGreaterThan(roadWidthM("street"));
    expect(roadWidthM("street")).toBeGreaterThan(roadWidthM("lane"));
    expect(roadWidthM("lane")).toBeGreaterThan(roadWidthM("track"));
    // Each step is big enough to see from the play camera, not a 2 m nuance.
    expect(roadWidthM("avenue") - roadWidthM("street")).toBeGreaterThan(3);
    expect(roadWidthM("street") - roadWidthM("lane")).toBeGreaterThan(3);

    expect(highway).toBeCloseTo(ROAD_CLASSES.highway.carriageM, 3);
    expect(avenue).toBeCloseTo(ROAD_CLASSES.avenue.carriageM, 3);
    expect(street).toBeCloseTo(ROAD_CLASSES.street.carriageM, 3);
    expect(lane).toBeCloseTo(ROAD_CLASSES.lane.carriageM, 3);
  });

  it("gives every paved road a shoulder and every junction a slab of tarmac", () => {
    const map = createLandBoard();
    const added: RoadMesh[] = [];
    const scene = { add(obj: RoadMesh) { added.push(obj); } };
    makeRoads(map, { scene, specOf: (id: "north" | "south") => ISLANDS[id], heightAt });

    // A road with no rim reads as black tape laid on sand.
    const shoulders = added.filter((m) => m.userData.roadKind === "shoulder");
    expect(shoulders.length).toBeGreaterThan(10);
    for (const road of map.roads.filter((r) => r.kind === "paved" && !r.roundabout)) {
      const tarmac = added.find(
        (m) => m.userData.roadKind === "paved" && m.userData.roadName === road.name,
      );
      const rim = shoulders.find((m) => String(m.userData.roadName || "").startsWith(road.name || ""));
      expect(rim, `no shoulder for ${road.name}`).toBeTruthy();
      if (tarmac) expect(ribbonWidthM(rim!)).toBeGreaterThan(ribbonWidthM(tarmac));
    }

    // Junctions are covered, not carved out of the minor road.
    const pads = added.filter((m) => m.userData.roadKind === "junction");
    const junctions = map.graph.nodes.filter((n) => n.kind === "junction");
    expect(junctions.length).toBeGreaterThan(8);
    expect(pads.length).toBeGreaterThanOrEqual(junctions.length);
    for (const node of junctions) {
      const arms = map.graph.edges.filter((e) => e.a === node.id || e.b === node.id);
      const widest = Math.max(...arms.map((e) => carriagewayWidthM(e.cls)));
      const pad = pads.find(
        (m) => Math.abs((m.userData.widthM ?? 0) - (widest + 2.4)) < 0.01,
      );
      expect(pad, `junction ${node.id} pad too small for its arms`).toBeTruthy();
    }
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
    const northRoads = pavedRoads.filter((r) => r.island === "north");
    const northMeshes = paved.filter((m) => m.userData.island === "north");
    expect(northMeshes.length).toBe(northRoads.length);
    expect(paved.length).toBeGreaterThanOrEqual(4);

    for (let i = 0; i < northRoads.length; i++) {
      const mesh = northMeshes[i];
      const pts = northRoads[i].points;
      const pos = mesh.geometry.attributes.position;
      expect(pos.count).toBeGreaterThan(8);
      expect(mesh.geometry.index?.count ?? 0).toBeGreaterThan(24);
      const cls = /Harbour Rd/.test(northRoads[i].name ?? "") ? "avenue" : "street";
      expect(ribbonWidthM(mesh)).toBeCloseTo(ROAD_CLASSES[cls].carriageM, 3);

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

    const hwy = pavedRoads.find((r) => r.lanes === 4);
    expect(hwy).toBeTruthy();
    const hwyMeshes = paved.filter((m) => m.userData.roadName === "Island Hwy");
    expect(hwyMeshes.length).toBeGreaterThanOrEqual(2);
    expect(hwyMeshes.length % 2).toBe(0);
    expect(added.some((m) => m.userData.roadKind === "median")).toBe(true);
    expect(added.some((m) => m.userData.roadKind === "island")).toBe(true);

    const rowMesh = paved.find((m) => String(m.userData.roadName || "").includes("Row"));
    if (rowMesh) {
      expect(ribbonWidthM(rowMesh)).toBeCloseTo(LOCAL_WIDTH_M, 1);
      expect(LOCAL_WIDTH_M).toBeLessThan(PAVED_WIDTH_M);
    }

    expect(HIGHWAY_RAB_SKIP_M).toBeGreaterThan(30);
    expect(HIGHWAY_RAB_SKIP_M).toBeLessThan(80);
    expect(HIGHWAY_MEDIAN_M).toBeGreaterThan(5);
    expect(HIGHWAY_LANE_OFFSET_M).toBeGreaterThan(PAVED_WIDTH_M / 2);
    const harbour = SOUTH_RAB.harbour;
    let nearestHwy = Infinity;
    for (const mesh of hwyMeshes) {
      const pos = mesh.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const d = Math.hypot(pos.getX(i) - harbour.x, pos.getZ(i) - harbour.z);
        expect(d).toBeGreaterThan(20);
        nearestHwy = Math.min(nearestHwy, d);
      }
    }
    // Graph ends on the kerb (~34 m). Drawing must actually reach it — not
    // omit the last stations and leave sand between the dual ribbons and the ring.
    expect(nearestHwy).toBeLessThan(38);
    const circus = added.find((m) => m.userData.roadName === "Harbour Circus");
    expect(circus).toBeTruthy();
    expect(circus!.geometry.parameters).toBeTruthy();
    expect(circus!.geometry.parameters!.innerRadius).toBeGreaterThan(10);
    const circusArms = added.filter((m) => m.userData.roadName === "Harbour Circus arm");
    expect(circusArms.length).toBeGreaterThanOrEqual(3);
  });

  it("places the spawn camera on the quay looking inland along the tarmac", () => {
    const n = spawnCameraOffset("north");
    const s = spawnCameraOffset("south");
    const nl = spawnLookAtOffset("north");
    const sl = spawnLookAtOffset("south");

    expect(n.y).toBeGreaterThan(18);
    expect(n.y).toBeLessThan(40);
    expect(s.y).toBeGreaterThanOrEqual(n.y);
    expect(s.y).toBeLessThan(40);
    expect(Math.abs(n.x)).toBeLessThan(40);
    expect(n.z).toBeGreaterThan(0);
    expect(s.x).toBeLessThan(0);
    expect(s.z).toBeLessThan(0);
    expect(sl.x).toBeGreaterThan(40);
    expect(sl.z).toBeGreaterThan(40);
    expect(nl.z).toBeLessThan(-40);

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
      const px = spec.port.x + (id === "south" ? 10 : 0);
      const pz = spec.port.z + (id === "north" ? -8 : 0);
      const py = heightAt(spec, px, pz) + 1.15;
      const cam = new THREE.PerspectiveCamera(55, 16 / 9, 0.4, CAMERA_FAR_M);
      cam.position.set(px + o.x, py + o.y, pz + o.z);
      cam.lookAt(px + l.x, py + l.y, pz + l.z);
      cam.updateMatrixWorld();

      const ndc = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).project(cam);
      const inFrame = (v: THREE.Vector3) => Math.abs(v.x) < 0.95 && Math.abs(v.y) < 0.95 && v.z < 1;

      const player = ndc(px, py, pz);
      const spine =
        id === "north" ? ndc(px, py + 2, pz - 80) : ndc(px + 80, py + 2, pz);
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
