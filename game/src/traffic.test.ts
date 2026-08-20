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
import { ROAD_DRIVE_LIFT_M } from "../public/harbour/roads.js";

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
      const h = heightAt(ISLANDS.north, car.mesh.position.x, car.mesh.position.z);
      expect(car.mesh.position.y).toBeCloseTo(h + ROAD_DRIVE_LIFT_M, 4);
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
      expect(car.mesh.position.z).toBeLessThan(spec.port.z + 40);
    }
  });

  it("puts South highway cars in a black carriageway, not on the stone median", () => {
    const board = createLandBoard();
    const scene = { add() {} };
    const traffic = createTraffic({
      scene,
      getMap: () => board,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });
    const hwy = board.roads.find((r) => r.island === "south" && r.lanes === 4)!;
    const south = traffic.cars.filter((c) => c.islandId === "south" && c.roadIdx === 0);
    expect(south.length).toBeGreaterThan(2);
    for (const car of south) {
      const d = projectOnPolyline(hwy.points, car.mesh.position.x, car.mesh.position.z).dist;
      expect(d).toBeGreaterThan(6);
      expect(d).toBeLessThan(10);
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
    expect(parts.get("bolt")).toBe(1);
    expect(parts.get("board")).toBe(1);
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

  it("puts a tiny kraft PAPER spare-tyre bolt on every sedan boot", () => {
    const board = createLandBoard();
    const scene = { add() {} };
    const traffic = createTraffic({
      scene,
      getMap: () => board,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });
    expect(traffic.cars.length).toBeGreaterThan(0);
    const wheelRubber = 0x1c1c20;
    for (const car of traffic.cars) {
      const bolts: THREE.Mesh[] = [];
      let bodyHex = -1;
      const wheelHexes: number[] = [];
      let hubs = 0;
      car.mesh.traverse((obj: THREE.Object3D) => {
        const name = obj.userData?.part;
        if (name === "bolt") bolts.push(obj as THREE.Mesh);
        if (name === "hub") hubs += 1;
        if (name === "body") {
          const mat = (obj as THREE.Mesh).material as THREE.MeshLambertMaterial;
          if (mat?.color) bodyHex = mat.color.getHex();
        }
        if (name === "wheel") {
          const mat = (obj as THREE.Mesh).material as THREE.MeshLambertMaterial;
          if (mat?.color) wheelHexes.push(mat.color.getHex());
        }
      });
      expect(bolts.length).toBe(1);
      expect(hubs).toBe(4);
      const bolt = bolts[0]!;
      expect(bolt.geometry.type).toBe("BoxGeometry");
      const mat = bolt.material as THREE.MeshLambertMaterial;
      expect(mat.color.getHex()).toBe(0xf4ead8);
      const geo = bolt.geometry as THREE.BoxGeometry;
      expect(geo.parameters.width).toBeLessThan(0.16);
      expect(geo.parameters.height).toBeLessThan(0.16);
      expect(geo.parameters.depth).toBeLessThan(0.16);
      expect(bolt.position.z).toBeLessThan(-1.2);
      expect(bolt.position.y).toBeGreaterThan(0.9);
      expect(bolt.position.y).toBeLessThan(1.4);
      expect(COLORS).toContain(bodyHex);
      expect(wheelHexes.length).toBe(4);
      expect(wheelHexes.every((h) => h === wheelRubber)).toBe(true);
    }
  });

  it("puts one tiny kraft PAPER running board on every sedan; aerial and wiper remain", () => {
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
      const boards: THREE.Mesh[] = [];
      const aerials: THREE.Mesh[] = [];
      const wipers: THREE.Mesh[] = [];
      car.mesh.traverse((obj: THREE.Object3D) => {
        const name = obj.userData?.part;
        if (name === "board") boards.push(obj as THREE.Mesh);
        if (name === "aerial") aerials.push(obj as THREE.Mesh);
        if (name === "wiper") wipers.push(obj as THREE.Mesh);
      });
      expect(boards.length).toBe(1);
      expect(aerials.length).toBe(1);
      expect(wipers.length).toBeGreaterThanOrEqual(2);
      const step = boards[0]!;
      expect(step.geometry.type).toBe("BoxGeometry");
      const mat = step.material as THREE.MeshLambertMaterial;
      expect(mat.color.getHex()).toBe(0xf4ead8);
      const geo = step.geometry as THREE.BoxGeometry;
      expect(geo.parameters.width).toBeLessThan(0.16);
      expect(geo.parameters.height).toBeLessThan(0.16);
      expect(geo.parameters.depth).toBeLessThan(0.6);
      expect(Math.abs(step.position.x)).toBeGreaterThan(1.0);
      expect(step.position.y).toBeGreaterThan(0.2);
      expect(step.position.y).toBeLessThan(0.7);
      const aerial = aerials[0]!;
      expect(Math.hypot(step.position.x - aerial.position.x, step.position.z - aerial.position.z)).toBeGreaterThan(0.8);
      for (const wiper of wipers) {
        expect(Math.hypot(step.position.x - wiper.position.x, step.position.z - wiper.position.z)).toBeGreaterThan(0.8);
      }
    }
  });

  it("turns onto another graph edge instead of ping-ponging one road", () => {
    const board = createLandBoard();
    const scene = { add() {} };
    const traffic = createTraffic({
      scene,
      getMap: () => board,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });
    const car = traffic.cars.find((c) => c.islandId === "south");
    expect(car).toBeTruthy();
    const startEdge = car!.edgeId;
    for (let i = 0; i < 800; i++) traffic.tick(0.5);
    const still = traffic.cars.find((c) => c.slot === car!.slot && c.islandId === "south");
    expect(still).toBeTruthy();
    expect(still!.edgeId).not.toBe(startEdge);
  });
});
