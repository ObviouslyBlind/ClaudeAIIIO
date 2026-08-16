import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createLandBoard, distToPaved, heightAt, ISLANDS, ROAD_CLEAR } from "./land.ts";
import {
  LAMP_GLASS,
  LAMP_GLOW,
  makeStreetProps,
  NORTH_PORT_STRETCH_M,
  offsetFromCentreline,
  ROAD_CLEAR_M,
  STREET_SETBACK_MAX_M,
  STREET_SETBACK_MIN_M,
  streetSetbackM,
} from "../public/harbour/street-props.js";

describe("street prop setback", () => {
  it("keeps furniture 12–16 m off the paved centreline, outside ROAD_CLEAR", () => {
    expect(ROAD_CLEAR_M).toBe(ROAD_CLEAR);
    expect(STREET_SETBACK_MIN_M).toBeGreaterThan(ROAD_CLEAR);
    expect(STREET_SETBACK_MIN_M).toBe(12);
    expect(STREET_SETBACK_MAX_M).toBe(16);

    for (let i = 0; i < 9; i++) {
      const s = streetSetbackM(i);
      expect(s).toBeGreaterThanOrEqual(STREET_SETBACK_MIN_M);
      expect(s).toBeLessThanOrEqual(STREET_SETBACK_MAX_M);
      expect(s).toBeGreaterThanOrEqual(ROAD_CLEAR);
    }

    const o = offsetFromCentreline(0, 0, 0, 10, 1, 14);
    expect(Math.hypot(o.x, o.z)).toBeCloseTo(14, 5);
    expect(Math.abs(o.x)).toBeCloseTo(14, 5);
  });

  it("plants lamps, benches, and signs on the north port verge, not on tarmac or fields", () => {
    const map = createLandBoard();
    const added: THREE.Object3D[] = [];
    const scene = { add(obj: THREE.Object3D) { added.push(obj); } };
    const root = makeStreetProps(map, {
      scene,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });
    expect(added).toEqual([root]);

    const placed = (root.userData.placed || []) as {
      kind: string;
      island: string;
      x: number;
      z: number;
      setback: number;
      along: number;
    }[];
    expect(placed.length).toBeGreaterThan(20);
    expect(placed.some((p) => p.kind === "lamp")).toBe(true);
    expect(placed.some((p) => p.kind === "bench")).toBe(true);
    expect(placed.some((p) => p.kind === "sign")).toBe(true);

    const northPort = placed.filter(
      (p) => p.island === "north" && p.along <= NORTH_PORT_STRETCH_M,
    );
    expect(northPort.length).toBeGreaterThanOrEqual(16);

    const port = ISLANDS.north.port;
    const nearSpawn = northPort.filter((p) => Math.hypot(p.x - port.x, p.z - port.z) < 220);
    expect(nearSpawn.length).toBeGreaterThanOrEqual(8);

    for (const p of placed) {
      const spec = ISLANDS[p.island as "north" | "south"];
      expect(p.setback).toBeGreaterThanOrEqual(STREET_SETBACK_MIN_M);
      expect(p.setback).toBeLessThanOrEqual(STREET_SETBACK_MAX_M);
      expect(distToPaved(spec, p.x, p.z)).toBeGreaterThanOrEqual(ROAD_CLEAR);
      expect(heightAt(spec, p.x, p.z)).toBeGreaterThanOrEqual(0.4);
      const field = map.plots.find(
        (plot) => plot.band === "field" && plot.island === p.island && Math.hypot(plot.x - p.x, plot.z - p.z) < 8,
      );
      expect(field).toBeUndefined();
    }
  });

  it("builds paper lamps with warm glass and wood/iron posts, not cylinders", () => {
    const map = createLandBoard();
    const scene = { add(_obj: THREE.Object3D) {} };
    const root = makeStreetProps(map, {
      scene,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });

    const lamps: THREE.Object3D[] = [];
    root.traverse((obj) => {
      if (obj.userData?.prop === "lamp") lamps.push(obj);
    });
    expect(lamps.length).toBeGreaterThan(4);
    expect(LAMP_GLASS).toBe(0xf3d6a0);
    expect(LAMP_GLOW).toBe(0xe8a45a);
    const glassR = (LAMP_GLASS >> 16) & 255;
    const glassB = LAMP_GLASS & 255;
    expect(glassR).toBeGreaterThan(glassB);

    for (const lamp of lamps) {
      expect(lamp.userData.mode).toBe("PAPER");
      let boxes = 0;
      let glass = 0;
      let wood = 0;
      let iron = 0;
      lamp.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        const mat = mesh.material as THREE.MeshLambertMaterial;
        expect(mat.type).toBe("MeshLambertMaterial");
        const hex = mat.color.getHex();
        if (mesh.userData.part === "glass") {
          glass += 1;
          expect(hex).toBe(LAMP_GLASS);
          expect(mat.emissive.getHex()).toBe(LAMP_GLOW);
        }
        if (hex === 0x8a6238) wood += 1;
        if (hex === 0x3a322c || hex === 0x2a2420) iron += 1;
      });
      expect(boxes).toBeGreaterThan(8);
      expect(glass).toBe(4);
      expect(wood).toBeGreaterThan(0);
      expect(iron).toBeGreaterThan(0);
    }
  });
});
