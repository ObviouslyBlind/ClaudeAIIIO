import { describe, expect, it } from "vitest";
import { createLandBoard, heightAt, ISLANDS } from "./land.ts";
import {
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
    expect(SPAWN_SPAN_M).toBeLessThan(500);
    for (const car of north) {
      expect(car.along).toBeLessThan(SPAWN_SPAN_M + 40);
      expect(car.mesh.position.y).toBeGreaterThan(0.5);
    }
    const port = ISLANDS.north.port;
    const nearest = Math.min(
      ...north.map((c) => Math.hypot(c.mesh.position.x - port.x, c.mesh.position.z - port.z)),
    );
    expect(nearest).toBeLessThan(120);
  });
});
