import { describe, expect, it } from "vitest";
import { createLandBoard } from "./land.ts";
import { SOUTH_PORT, SOUTH_TOWNS } from "./southGeom.ts";
import { pathAlongPolyline, projectOnPolyline, routeAcrossPaved } from "../public/harbour/taxi.js";

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

  it("keeps a South hail on paved: no hop through dirt", () => {
    const board = createLandBoard();
    const cane = SOUTH_TOWNS.find((t) => t.id === "canebrake")!;
    const route = routeAcrossPaved(board.roads, "south", SOUTH_PORT.x + 10, SOUTH_PORT.z, cane.x, cane.z);
    expect(route).toBeTruthy();
    expect(route!.points.length).toBeGreaterThan(8);
    const paved = board.roads.filter((r) => r.kind === "paved" && r.island === "south");
    const dirt = board.roads.filter((r) => r.kind === "dirt" && r.island === "south");
    const nearPaved = (x: number, z: number) => Math.min(...paved.map((r) => projectOnPolyline(r.points, x, z).dist));
    for (let i = 0; i < route!.points.length - 1; i++) {
      const a = route!.points[i]!;
      const b = route!.points[i + 1]!;
      const mx = (a.x + b.x) / 2;
      const mz = (a.z + b.z) / 2;
      expect(nearPaved(a.x, a.z)).toBeLessThan(10);
      expect(nearPaved(mx, mz)).toBeLessThan(12);
      if (dirt.length) {
        const dDirt = Math.min(...dirt.map((r) => projectOnPolyline(r.points, mx, mz).dist));
        expect(nearPaved(mx, mz)).toBeLessThanOrEqual(dDirt);
      }
    }
    const hwys = paved.filter((r) => r.lanes === 4);
    let lanePts = 0;
    for (const p of route!.points) {
      const dHwy = Math.min(...hwys.map((r) => projectOnPolyline(r.points, p.x, p.z).dist));
      const dOther = Math.min(
        ...paved.filter((r) => r.lanes !== 4).map((r) => projectOnPolyline(r.points, p.x, p.z).dist),
      );
      if (dHwy < dOther && dHwy < 12) {
        expect(dHwy).toBeGreaterThan(6);
        expect(dHwy).toBeLessThan(10);
        lanePts += 1;
      }
    }
    expect(lanePts).toBeGreaterThan(4);
  });
});
