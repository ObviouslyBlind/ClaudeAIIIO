import { describe, expect, it } from "vitest";
import { buildPlots, createLandBoard, heightAt, ISLANDS, leasePlot } from "./land.ts";
import { createVisitor } from "./sim.ts";

describe("harbour land board", () => {
  it("authors two Caribbean-scale islands with a channel between the ports", () => {
    const n = ISLANDS.north;
    const s = ISLANDS.south;
    expect(n.rx * 2).toBeGreaterThanOrEqual(1800);
    expect(s.rx * 2).toBeGreaterThanOrEqual(1800);
    expect(s.port.z - n.port.z).toBeGreaterThan(400);
    expect(n.port.z).toBeLessThan(0);
    expect(s.port.z).toBeGreaterThan(0);
    expect(heightAt(n, n.port.x, n.port.z)).toBeGreaterThan(0.5);
    expect(heightAt(s, s.port.x, s.port.z)).toBeGreaterThan(0.5);
    expect(heightAt(n, 0, 0)).toBeLessThan(0);
  });

  it("prices North dearer than South, quay dearer than inland", () => {
    const plots = buildPlots();
    const nQuay = plots.find((p) => p.id === "N-0-0")!;
    const nInland = plots.find((p) => p.id === "N-0-4")!;
    const sQuay = plots.find((p) => p.id === "S-0-0")!;
    const sInland = plots.find((p) => p.id === "S-0-4")!;
    expect(nQuay.price).toBeGreaterThan(sQuay.price);
    expect(nQuay.price).toBeGreaterThan(nInland.price);
    expect(sQuay.price).toBeGreaterThan(sInland.price);
  });

  it("keeps the public quay reserved and leases a vacant town plot for paper cash", () => {
    const board = createLandBoard();
    const visitor = createVisitor(1_000);
    const reserved = leasePlot(board, visitor, "N-3-0");
    expect(reserved.ok).toBe(false);
    if (reserved.ok) return;
    expect(reserved.reason).toBe("reserved");

    const before = visitor.cash;
    const town = leasePlot(board, visitor, "N-2-1");
    expect(town.ok).toBe(true);
    if (!town.ok) return;
    expect(visitor.cash).toBeCloseTo(before - town.paid, 4);
    expect(town.plot.owner).toBe("visitor");

    const again = leasePlot(board, visitor, "N-2-1");
    expect(again.ok).toBe(false);
  });
});
