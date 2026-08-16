import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createLandBoard, heightAt, ISLANDS } from "./land.ts";
import {
  COLORS,
  createTraffic,
  pointAlongPolyline,
  polylineLength,
  SPAWN_SPAN_M,
} from "../public/harbour/traffic.js";
import { projectOnPolyline } from "../public/harbour/taxi.js";

describe("road node traffic", () => {
  it("keeps sampled cars on the paved spline, never on dirt", () => {
    const board = createLandBoard();
    const paved = board.roads.find((r) => r.kind === "paved" && r.island === "north")!;
    const dirt = board.roads.find((r) => r.kind === "dirt" && r.island === "north")!;
    const total = polylineLength(paved.points);
    expect(total).toBeGreaterThan(2500);
    expect(paved.nodes?.length).toBeGreaterThanOrEqual(4);

    for (let i = 0; i < 12; i++) {
      const p = pointAlongPolyline(paved.points, (i / 12) * total + 40);
      const onPaved = projectOnPolyline(paved.points, p.x, p.z);
      expect(onPaved.dist).toBeLessThan(0.6);
      const onDirt = projectOnPolyline(dirt.points, p.x, p.z);
      expect(onDirt.dist).toBeGreaterThan(5);
    }

    const looped = pointAlongPolyline(paved.points, total + 3);
    const start = pointAlongPolyline(paved.points, 3);
    expect(Math.hypot(looped.x - start.x, looped.z - start.z)).toBeLessThan(1);
  });

  it("parks several cars on the first stretch of tarmac, not kilometres inland", () => {
    const board = createLandBoard();
    const added: unknown[] = [];
    const scene = { add(obj: unknown) { added.push(obj); } };
    const traffic = createTraffic({
      scene,
      getMap: () => board,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });
    const north = traffic.cars.filter((c) => c.islandId === "north");
    expect(north.length).toBeGreaterThanOrEqual(5);
    expect(SPAWN_SPAN_M).toBeLessThan(220);
    for (const car of north) {
      expect(car.along).toBeLessThanOrEqual(SPAWN_SPAN_M + 40);
      expect(car.mesh.position.y).toBeGreaterThan(0.5);
    }
    const port = ISLANDS.north.port;
    const nearest = Math.min(
      ...north.map((c) => Math.hypot(c.mesh.position.x - port.x, c.mesh.position.z - port.z)),
    );
    expect(nearest).toBeLessThan(120);
  });

  it("keeps north cars on the first paved stretch after a tick, not in the seaward channel", () => {
    const board = createLandBoard();
    const scene = { add() {} };
    const spec = ISLANDS.north;
    const player = {
      position: { x: spec.port.x, y: 2, z: spec.port.z - 8 },
    };
    const traffic = createTraffic({
      scene,
      getMap: () => board,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
      getPlayer: () => player,
      getIslandId: () => "north" as const,
    });
    traffic.tick(0.2);
    const north = traffic.cars.filter((c) => c.islandId === "north");
    expect(north.length).toBeGreaterThanOrEqual(5);
    const nearest = Math.min(
      ...north.map((c) => Math.hypot(c.mesh.position.x - spec.port.x, c.mesh.position.z - spec.port.z)),
    );
    expect(nearest).toBeLessThan(120);
    for (const car of north) {
      expect(car.along).toBeLessThanOrEqual(SPAWN_SPAN_M + 40);
      expect(car.mesh.position.z).toBeLessThan(spec.port.z + 40);
    }
  });

  it("builds a sedan mesh: painted body, cabin glass, bumpers, wheels — no debug mast", () => {
    const board = createLandBoard();
    const scene = { add() {} };
    const traffic = createTraffic({
      scene,
      getMap: () => board,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });
    const mesh = traffic.cars[0]!.mesh as THREE.Group;
    const parts = new Map<string, number>();
    const colors: number[] = [];
    let mast = 0;
    mesh.traverse((obj) => {
      const m = obj as THREE.Mesh & { userData: { part?: string } };
      const name = m.userData?.part;
      if (name) parts.set(name, (parts.get(name) ?? 0) + 1);
      const mat = m.material as THREE.MeshLambertMaterial | undefined;
      if (mat?.color) colors.push(mat.color.getHex());
      const geo = m.geometry as THREE.BufferGeometry & { parameters?: { height?: number; radiusTop?: number } };
      const h = geo?.parameters?.height ?? 0;
      const r = geo?.parameters?.radiusTop ?? 1;
      if (h > 2.4 && r < 0.2 && mat?.color?.getHex() === 0xff0000) mast += 1;
    });
    expect(parts.get("body")).toBe(1);
    expect(parts.get("cabin")).toBe(1);
    expect(parts.get("glass")).toBeGreaterThanOrEqual(2);
    expect(parts.get("bumper")).toBe(2);
    expect(parts.get("wheel")).toBe(4);
    expect(parts.get("mirror")).toBe(2);
    expect(parts.get("plate")).toBeGreaterThanOrEqual(1);
    expect(parts.get("hub")).toBe(4);
    expect(parts.get("aerial")).toBe(1);
    expect(parts.get("wiper")).toBeGreaterThanOrEqual(2);
    expect(colors).toContain(0xc45c3a);
    expect(mast).toBe(0);
    expect(mesh.children.length).toBeGreaterThan(6);
  });

  it("gives paved sedans a few original-palette body colours, not taxi yellow", () => {
    const board = createLandBoard();
    const scene = { add() {} };
    const traffic = createTraffic({
      scene,
      getMap: () => board,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });
    function bodyHex(root: THREE.Object3D) {
      let hex = -1;
      root.traverse((obj) => {
        if (obj.userData?.part !== "body") return;
        const mat = (obj as THREE.Mesh).material as THREE.MeshLambertMaterial;
        if (mat?.color) hex = mat.color.getHex();
      });
      return hex;
    }
    const north = traffic.cars.filter((c) => c.islandId === "north");
    const paints = north.map((c) => bodyHex(c.mesh));
    expect(paints.length).toBe(6);
    expect(new Set(paints).size).toBe(paints.length);
    expect(paints).toEqual(COLORS);
    expect(paints).toContain(0xc45c3a);
    expect(paints).toContain(0x4a6e8a);
    expect(paints).toContain(0x6a8f44);
    expect(paints).toContain(0x2a7a72);
    const taxiYellow = new Set([0xf0c430, 0xf6d65a, 0xffe14a]);
    expect(paints.some((h) => taxiYellow.has(h))).toBe(false);
    expect(paints.every((h) => h === 0xf4ead8 || h === 0xe8d7b8)).toBe(false);
  });

  it("puts a kraft cream license plate on every sedan rear", () => {
    const board = createLandBoard();
    const scene = { add() {} };
    const traffic = createTraffic({
      scene,
      getMap: () => board,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });
    expect(traffic.cars.length).toBeGreaterThan(0);
    for (const car of traffic.cars) {
      let plates = 0;
      const plateHexes: number[] = [];
      car.mesh.traverse((obj: THREE.Object3D) => {
        if (obj.userData?.part !== "plate") return;
        plates += 1;
        const mat = (obj as THREE.Mesh).material as THREE.MeshLambertMaterial;
        if (mat?.color) plateHexes.push(mat.color.getHex());
      });
      expect(plates).toBeGreaterThanOrEqual(1);
      expect(plateHexes).toContain(0xf4ead8);
    }
  });

  it("puts a short kraft cream PAPER aerial on every sedan roof", () => {
    const board = createLandBoard();
    const scene = { add() {} };
    const traffic = createTraffic({
      scene,
      getMap: () => board,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });
    expect(traffic.cars.length).toBeGreaterThan(0);
    for (const car of traffic.cars) {
      const aerials: THREE.Mesh[] = [];
      car.mesh.traverse((obj: THREE.Object3D) => {
        if (obj.userData?.part === "aerial") aerials.push(obj as THREE.Mesh);
      });
      expect(aerials.length).toBe(1);
      const aerial = aerials[0]!;
      const mat = aerial.material as THREE.MeshLambertMaterial;
      expect(mat.color.getHex()).toBe(0xf4ead8);
      const geo = aerial.geometry as THREE.BoxGeometry;
      expect(geo.parameters.height).toBeGreaterThan(0.12);
      expect(geo.parameters.height).toBeLessThan(0.4);
      expect(geo.parameters.width).toBeLessThan(0.12);
      expect(geo.parameters.depth).toBeLessThan(0.12);
      expect(aerial.position.y).toBeGreaterThan(1.5);
    }
  });

  it("puts two thin kraft PAPER wipers on every sedan windscreen", () => {
    const board = createLandBoard();
    const scene = { add() {} };
    const traffic = createTraffic({
      scene,
      getMap: () => board,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });
    expect(traffic.cars.length).toBeGreaterThan(0);
    for (const car of traffic.cars) {
      const wipers: THREE.Mesh[] = [];
      car.mesh.traverse((obj: THREE.Object3D) => {
        if (obj.userData?.part === "wiper") wipers.push(obj as THREE.Mesh);
      });
      expect(wipers.length).toBeGreaterThanOrEqual(2);
      for (const wiper of wipers) {
        const mat = wiper.material as THREE.MeshLambertMaterial;
        expect(mat.color.getHex()).toBe(0xf4ead8);
        const geo = wiper.geometry as THREE.BoxGeometry;
        expect(geo.parameters.height).toBeLessThan(0.12);
        expect(geo.parameters.depth).toBeLessThan(0.12);
        expect(wiper.position.z).toBeGreaterThan(0.6);
        expect(wiper.position.y).toBeGreaterThan(0.9);
        expect(wiper.position.y).toBeLessThan(1.5);
      }
    }
  });
});
