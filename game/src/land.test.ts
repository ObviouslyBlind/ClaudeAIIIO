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
  pointInRing,
  ROAD_CLEAR,
} from "./land.ts";
import { createVisitor } from "./sim.ts";

describe("harbour land board", () => {
  it("authors two Caribbean-scale islands with a channel between the ports", () => {
    const n = ISLANDS.north;
    const s = ISLANDS.south;
    expect(n.rx * 2).toBeGreaterThanOrEqual(1800);
    expect(s.rx * 2).toBeGreaterThanOrEqual(1800);
    expect(s.port.z - n.port.z).toBeGreaterThan(3000);
    expect(s.cz - n.cz).toBeGreaterThan(4000);
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

  it("keeps parcel corners off the paved road", () => {
    const board = createLandBoard();
    for (const p of board.plots) {
      const spec = ISLANDS[p.island];
      for (const [x, z] of p.ring) {
        expect(distToPaved(spec, x, z)).toBeGreaterThanOrEqual(ROAD_CLEAR - 0.05);
      }
    }
  });

  it("lets you lease a piece of ground underfoot and then develop it", () => {
    const board = createLandBoard();
    const visitor = createVisitor(1_000);
    const vacant = board.plots.find((p) => !p.owner && p.class === "by_right")!;
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
});
