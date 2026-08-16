import { describe, expect, it } from "vitest";
import {
  buildPlots,
  createLandBoard,
  developPlot,
  distToPaved,
  findParcelAt,
  heightAt,
  ISLANDS,
  leasePlot,
  pavedPolyline,
  pointInRing,
  roadNodes,
  ROAD_CLEAR,
  standingOnParcel,
} from "./land.ts";
import { createVisitor } from "./sim.ts";

describe("harbour land board", () => {
  it("authors two Caribbean-scale islands with a channel between the ports", () => {
    const n = ISLANDS.north;
    const s = ISLANDS.south;
    expect(n.rx * 2).toBeGreaterThanOrEqual(7000);
    expect(s.rx * 2).toBeGreaterThanOrEqual(7000);
    expect(s.port.z - n.port.z).toBeGreaterThan(12000);
    expect(s.cz - n.cz).toBeGreaterThan(16000);
    expect(heightAt(n, n.port.x, n.port.z)).toBeGreaterThan(0.5);
    expect(heightAt(s, s.port.x, s.port.z)).toBeGreaterThan(0.5);
    expect(heightAt(n, 0, 0)).toBeLessThan(0);
  });

  it("covers the harbour with irregular land parcels, not a given lot grid", () => {
    const plots = buildPlots();
    expect(plots.length).toBeGreaterThan(40);
    expect(plots.every((p) => p.ring.length >= 4)).toBe(true);
    expect(plots.every((p) => p.area > 180)).toBe(true);
    expect(plots.some((p) => p.band === "field")).toBe(true);
    expect(plots.some((p) => p.band === "street")).toBe(true);
    const sample = plots[0];
    const squareish =
      Math.abs(sample.ring[1][0] - sample.ring[0][0]) === 20 &&
      Math.abs(sample.ring[1][1] - sample.ring[0][1]) === 0;
    expect(squareish).toBe(false);
    const northStreet = plots.filter((p) => p.island === "north" && p.band === "street");
    const southStreet = plots.filter((p) => p.island === "south" && p.band === "street");
    const nMin = Math.min(...northStreet.map((p) => p.price / p.area));
    const sMax = Math.max(...southStreet.map((p) => p.price / p.area));
    expect(nMin).toBeGreaterThan(sMax);
  });

  it("keeps parcel corners and edges off the paved road", () => {
    const board = createLandBoard();
    for (const p of board.plots) {
      const spec = ISLANDS[p.island];
      for (let i = 0; i < p.ring.length; i++) {
        const a = p.ring[i];
        const b = p.ring[(i + 1) % p.ring.length];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const n = Math.max(2, Math.ceil(len / 2));
        for (let s = 0; s <= n; s++) {
          const t = s / n;
          const x = a[0] + (b[0] - a[0]) * t;
          const z = a[1] + (b[1] - a[1]) * t;
          expect(distToPaved(spec, x, z)).toBeGreaterThanOrEqual(ROAD_CLEAR - 0.05);
        }
      }
    }
  });

  it("authors a curving paved spline, not a 5 m wiggle on a straight", () => {
    const n = ISLANDS.north;
    const nodes = roadNodes(n);
    const pts = pavedPolyline(n);
    expect(nodes.length).toBeGreaterThanOrEqual(4);
    expect(pts.length).toBeGreaterThan(nodes.length);
    const xs = pts.map((p) => p.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(200);
    const along = Math.hypot(pts[pts.length - 1].x - pts[0].x, pts[pts.length - 1].z - pts[0].z);
    expect(along).toBeGreaterThan(2500);
  });

  it("lets you lease a piece of ground underfoot and then develop it", () => {
    const board = createLandBoard();
    const visitor = createVisitor(1_000);
    const vacant = board.plots
      .filter((p) => !p.owner && p.class === "by_right" && p.price <= visitor.cash)
      .sort((a, b) => a.price - b.price)[0]!;
    expect(pointInRing(vacant.x, vacant.z, vacant.ring)).toBe(true);
    expect(findParcelAt(board, vacant.x, vacant.z)?.id).toBe(vacant.id);

    const before = visitor.cash;
    const leased = leasePlot(board, visitor, vacant.id);
    expect(leased.ok).toBe(true);
    if (!leased.ok) return;
    expect(visitor.cash).toBeCloseTo(before - leased.paid, 4);

    const built = developPlot(board, visitor, vacant.id, "farm");
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(vacant.use).toBe("farm");

    const again = developPlot(board, visitor, vacant.id, "stall");
    expect(again.ok).toBe(false);
  });

  it("counts standing inside a large field as on that parcel, not only the centroid", () => {
    const board = createLandBoard();
    const field = board.plots
      .filter((p) => p.band === "field" && p.ring.length >= 4)
      .sort((a, b) => b.area - a.area)[0]!;
    expect(standingOnParcel(field.x, field.z, field)).toBe(true);
    const [ax, az] = field.ring[0];
    const [bx, bz] = field.ring[1];
    const [cx, cz] = field.ring[2];
    const insideX = (ax + bx + cx + field.x) / 4;
    const insideZ = (az + bz + cz + field.z) / 4;
    expect(pointInRing(insideX, insideZ, field.ring)).toBe(true);
    expect(standingOnParcel(insideX, insideZ, field)).toBe(true);
    expect(standingOnParcel(0, 0, field)).toBe(false);
  });
});
