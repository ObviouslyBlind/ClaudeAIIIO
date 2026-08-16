import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createLandBoard, heightAt, ISLANDS } from "./land.ts";
import {
  createTraffic,
  pointAlongPolyline,
  polylineLength,
  SPAWN_SPAN_M,
} from "../public/harbour/traffic.js";
import { projectOnPolyline } from "../public/harbour/taxi.js";
import { CAMERA_FAR_M, spawnCameraOffset, spawnLookAtOffset } from "../public/harbour/roads.js";

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

  it("puts at least three north cars inside the spawn camera frame", () => {
    const board = createLandBoard();
    const scene = { add() {} };
    const traffic = createTraffic({
      scene,
      getMap: () => board,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });
    const spec = ISLANDS.north;
    const o = spawnCameraOffset("north");
    const l = spawnLookAtOffset("north");
    const px = spec.port.x;
    const pz = spec.port.z - 8;
    const py = heightAt(spec, px, pz) + 1.15;
    const cam = new THREE.PerspectiveCamera(55, 16 / 9, 0.4, CAMERA_FAR_M);
    cam.position.set(px + o.x, py + o.y, pz + o.z);
    cam.lookAt(px + l.x, py + l.y, pz + l.z);
    cam.updateMatrixWorld();
    const inFrame = (c: { mesh: { position: THREE.Vector3 } }) => {
      const v = c.mesh.position.clone().project(cam);
      return Math.abs(v.x) < 0.92 && Math.abs(v.y) < 0.92 && v.z < 1;
    };
    const visible = traffic.cars.filter((c) => c.islandId === "north" && inFrame(c));
    expect(visible.length).toBeGreaterThanOrEqual(3);
  });
});
