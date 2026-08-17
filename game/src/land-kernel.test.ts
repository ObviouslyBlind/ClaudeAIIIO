import { describe, expect, it } from "vitest";
import { overlappingPairs, uniquePlotIds } from "./kernel/plots.ts";
import { buildPlots, createLandBoard } from "./land.ts";

describe("harbour land board kernel", () => {
  it("keeps unique plot ids and does not overlap rings on an island", () => {
    const plots = buildPlots();
    expect(uniquePlotIds(plots)).toBe(true);
    expect(overlappingPairs(plots)).toEqual([]);
    expect(plots.every((p) => p.deposit === "ore" || p.deposit === null)).toBe(true);
    expect(plots.filter((p) => p.band === "street").every((p) => p.deposit === null)).toBe(true);
    expect(plots.some((p) => p.deposit === "ore")).toBe(true);
  });

  it("seeds enough lots that a $1000 starter can still lease after overlap reject", () => {
    const board = createLandBoard();
    expect(board.plots.length).toBeGreaterThan(40);
  });
});
