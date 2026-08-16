import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createLandBoard, heightAt, ISLANDS } from "./land.ts";
import {
  TAXI_WAIT_MS,
  createTaxi,
  makeTaxiMesh,
  pavedDestFromMapClick,
  projectOnPolyline,
  taxiWaitExpired,
  worldToMapPx,
  islandMapBounds,
} from "../public/harbour/taxi.js";

describe("taxi wait timeout", () => {
  it("leaves after 60s while coming or waiting, not while boarded", () => {
    expect(TAXI_WAIT_MS).toBe(60_000);
    expect(taxiWaitExpired("coming", 1_000, 60_999)).toBe(false);
    expect(taxiWaitExpired("coming", 1_000, 61_000)).toBe(true);
    expect(taxiWaitExpired("waiting", 0, 59_999)).toBe(false);
    expect(taxiWaitExpired("waiting", 0, 60_000)).toBe(true);
    expect(taxiWaitExpired("boarded", 0, 120_000)).toBe(false);
    expect(taxiWaitExpired("hauling", 0, 120_000)).toBe(false);
    expect(taxiWaitExpired("idle", 0, 60_000)).toBe(false);
    expect(taxiWaitExpired("coming", null, 60_000)).toBe(false);
  });
});

describe("taxi map dest", () => {
  it("projects a rough map tap onto paved and never onto dirt", () => {
    const board = createLandBoard();
    const spec = ISLANDS.north;
    const paved = board.roads.find((r) => r.kind === "paved" && r.island === "north")!;
    const dirt = board.roads.find((r) => r.kind === "dirt" && r.island === "north")!;
    const bounds = islandMapBounds(spec);
    const w = 400;
    const h = 220;
    const tap = worldToMapPx(bounds, dirt.points[0].x, dirt.points[0].z, w, h);
    const dest = pavedDestFromMapClick(board.roads, "north", spec, tap.sx, tap.sy, w, h);
    expect(dest).toBeTruthy();
    expect(projectOnPolyline(paved.points, dest!.proj.x, dest!.proj.z).dist).toBeLessThan(0.5);
    expect(projectOnPolyline(dirt.points, dest!.proj.x, dest!.proj.z).dist).toBeGreaterThan(5);
  });
});

describe("taxi roof lamp", () => {
  it("sits a warm PAPER sign box on the cabin, not a sedan-only lid", () => {
    const mesh = makeTaxiMesh();
    expect(mesh.userData.kind).toBe("taxi");
    expect(mesh.userData.mode).toBe("PAPER");

    const lamps: THREE.Mesh[] = [];
    const colors: number[] = [];
    let mast = 0;
    mesh.traverse((obj) => {
      const m = obj as THREE.Mesh & { userData: { part?: string } };
      const mat = m.material as THREE.MeshLambertMaterial | undefined;
      if (mat?.color) colors.push(mat.color.getHex());
      if (m.userData?.part === "lamp") lamps.push(m);
      const geo = m.geometry as THREE.BufferGeometry & {
        parameters?: { height?: number; radiusTop?: number };
      };
      const h = geo?.parameters?.height ?? 0;
      const r = geo?.parameters?.radiusTop ?? 1;
      if (h > 2.4 && r < 0.2 && mat?.color?.getHex() === 0xff0000) mast += 1;
    });

    expect(colors).toContain(0xf0c430);
    expect(colors).toContain(0xfff3a0);
    expect(lamps.length).toBeGreaterThanOrEqual(3);
    expect(mast).toBe(0);

    const glow = lamps.find((m) => {
      const mat = m.material as THREE.MeshLambertMaterial;
      return mat.color.getHex() === 0xfff3a0 && mat.emissive.getHex() === 0xfff3a0;
    });
    expect(glow).toBeTruthy();
    expect(glow!.position.y).toBeGreaterThan(2.2);
    expect(glow!.position.y).toBeLessThan(3.1);
    const size = new THREE.Vector3();
    new THREE.Box3().setFromObject(glow!).getSize(size);
    expect(size.y).toBeGreaterThan(0.35);
    expect(size.y).toBeLessThan(0.8);
    expect(size.z).toBeLessThan(0.7);
  });

  it("parks the cab on paved at spawn so the roof lamp is in the first frame", () => {
    const board = createLandBoard();
    const spec = ISLANDS.north;
    const player = {
      position: { x: spec.port.x, y: 2, z: spec.port.z - 8 },
      rotation: { y: 0 },
    };
    const taxi = createTaxi({
      scene: { add() {} },
      player,
      getMap: () => board,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
      getIslandId: () => "north" as const,
      setWalking: () => {},
      setStatus: () => {},
      button: { addEventListener() {} },
    });
    expect(taxi.mesh.visible).toBe(true);
    const paved = board.roads.find((r) => r.kind === "paved" && r.island === "north")!;
    expect(projectOnPolyline(paved.points, taxi.mesh.position.x, taxi.mesh.position.z).dist).toBeLessThan(
      0.6,
    );
    expect(Math.hypot(taxi.mesh.position.x - spec.port.x, taxi.mesh.position.z - spec.port.z)).toBeLessThan(
      80,
    );
  });
});
