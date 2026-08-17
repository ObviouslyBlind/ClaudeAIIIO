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
  DEVELOP_COST,
  isStarterPlot,
  pickStarterPlotAt,
  STARTER_CASH,
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
    expect(heightAt(n, n.port.x, n.port.z + 28)).toBeLessThan(0.25);
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

  it("leaves vacant street lots on the inland walk from the north quay that $1000 PAPER can lease and develop", () => {
    const board = createLandBoard();
    const spec = ISLANDS.north;
    const pts = pavedPolyline(spec);
    const starters: { id: string; price: number }[] = [];
    let dist = 0;
    for (let i = 1; i < pts.length && dist < 220; i++) {
      dist += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
      const dx = pts[i].x - pts[i - 1].x;
      const dz = pts[i].z - pts[i - 1].z;
      const len = Math.hypot(dx, dz) || 1;
      const px = -dz / len;
      const pz = dx / len;
      for (const side of [-1, 1] as const) {
        const hit = findParcelAt(board, pts[i].x + px * side * 22, pts[i].z + pz * side * 22);
        if (
          hit &&
          !hit.owner &&
          hit.band === "street" &&
          hit.price <= 500 &&
          hit.price + DEVELOP_COST <= 1_000
        ) {
          starters.push({ id: hit.id, price: hit.price });
        }
      }
    }
    const unique = [...new Map(starters.map((s) => [s.id, s])).values()];
    expect(unique.length).toBeGreaterThanOrEqual(2);

    const visitor = createVisitor(1_000);
    const pick = unique.sort((a, b) => a.price - b.price)[0]!;
    expect(leasePlot(board, visitor, pick.id).ok).toBe(true);
    expect(developPlot(board, visitor, pick.id, "house").ok).toBe(true);
  });

  it("keeps $1000 PAPER starter street lots at north spawn, not 6500 m² fields", () => {
    const board = createLandBoard();
    const spec = ISLANDS.north;
    const starters = board.plots.filter((p) => isStarterPlot(p, spec));
    expect(starters.length).toBeGreaterThanOrEqual(2);
    expect(starters.every((p) => p.band === "street")).toBe(true);
    expect(starters.every((p) => p.price + DEVELOP_COST <= STARTER_CASH)).toBe(true);
    expect(starters.every((p) => p.area < 2000)).toBe(true);
    expect(starters.some((p) => p.price <= 500)).toBe(true);

    const street = starters.sort((a, b) => a.price - b.price)[0]!;
    const snapped = pickStarterPlotAt(board.plots, street.x + 12, street.z + 12, spec);
    expect(snapped).toBeTruthy();
    expect(isStarterPlot(snapped!, spec)).toBe(true);

    const nearField = board.plots
      .filter((p) => p.island === "north" && p.band === "field")
      .sort(
        (a, b) =>
          Math.hypot(a.x - spec.port.x, a.z - spec.port.z) -
          Math.hypot(b.x - spec.port.x, b.z - spec.port.z),
      )[0]!;
    expect(isStarterPlot(nearField, spec)).toBe(false);
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

  it("refuses a lease that would leave too little PAPER to develop", () => {
    const board = createLandBoard();
    const visitor = createVisitor(1_000);
    const plot = board.plots.find((p) => !p.owner && p.class === "by_right")!;
    plot.price = 1_000 - DEVELOP_COST + 1;
    const result = leasePlot(board, visitor, plot.id);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("need_develop_cash");
    expect(visitor.cash).toBe(1_000);
    expect(plot.owner).toBeNull();
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

  it("names every lot as a house number on the street it fronts", () => {
    const board = createLandBoard();
    expect(board.plots.every((p) => /^\d+ .+$/.test(p.name))).toBe(true);
    expect(board.plots.some((p) => p.street === "Harbour Rd")).toBe(true);
    expect(board.plots.some((p) => p.street === "Mill St")).toBe(true);
    const mill = board.plots.filter((p) => p.street === "Mill St");
    expect(mill.length).toBeGreaterThan(0);
    expect(mill.every((p) => p.name.endsWith("Mill St"))).toBe(true);
  });
});
