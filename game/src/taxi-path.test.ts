import { describe, expect, it } from "vitest";
import { createLandBoard } from "./land.ts";
import { pathAlongPolyline, projectOnPolyline } from "../public/harbour/taxi.js";

describe("taxi paved path", () => {
  it("projects onto paved polylines and never follows dirt points", () => {
    const board = createLandBoard();
    const paved = board.roads.find((r) => r.kind === "paved" && r.island === "north")!;
    const dirt = board.roads.find((r) => r.kind === "dirt" && r.island === "north")!;
    expect(paved.points.length).toBeGreaterThan(4);

    const start = paved.points[1];
    const end = paved.points[paved.points.length - 2];
    const path = pathAlongPolyline(paved.points, start.x, start.z, end.x, end.z);
    expect(path.length).toBeGreaterThan(2);

    for (const p of path) {
      const onPaved = projectOnPolyline(paved.points, p.x, p.z);
      expect(onPaved.dist).toBeLessThan(0.5);
      const onDirt = projectOnPolyline(dirt.points, p.x, p.z);
      expect(onDirt.dist).toBeGreaterThan(5);
    }

    const off = { x: dirt.points[0].x, z: dirt.points[0].z };
    const dest = projectOnPolyline(paved.points, off.x, off.z);
    expect(dest.dist).toBeGreaterThan(6.5);
  });
});
