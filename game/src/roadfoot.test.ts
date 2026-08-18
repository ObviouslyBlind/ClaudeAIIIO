import { describe, expect, it } from "vitest";
import { createLandBoard } from "./land.ts";
import { junctionPad } from "../public/harbour/roadnet.js";
import { buildHubFootprint, multiContains, segmentRing, unionGeoms } from "../public/harbour/roadfoot.js";

describe("road hub footprints", () => {
  it("unions two overlapping rectangles into one T, not two stacked strips", () => {
    const thru = segmentRing({ x: 0, z: 0 }, { x: 40, z: 0 }, 3);
    const stem = segmentRing({ x: 20, z: 0 }, { x: 20, z: 20 }, 3);
    const u = unionGeoms([[thru], [stem]]);
    expect(u.length).toBe(1);
    expect(u[0].length).toBe(1);
    expect(multiContains(u, 20, 0)).toBe(true);
    expect(multiContains(u, 20, 10)).toBe(true);
    expect(multiContains(u, 5, 0)).toBe(true);
    expect(multiContains(u, 20, 25)).toBe(false);
    expect(multiContains(u, 10, 10)).toBe(false);
  });

  it("fills a Quayward 90° corner as one L, and keeps the walk outside the tarmac", () => {
    const graph = createLandBoard().graph;
    const se = graph.nodes.find((n) => n.id === "s-quay-se")!;
    const pad = junctionPad(graph, se)!;
    const foot = buildHubFootprint(graph, se, pad);
    expect(multiContains(foot.tarmac, se.x, se.z)).toBe(true);
    expect(multiContains(foot.sidewalk, se.x + 6, se.z + 6)).toBe(true);
    expect(multiContains(foot.tarmac, se.x + 6, se.z + 6)).toBe(false);
    expect(multiContains(foot.tarmac, se.x + 20, se.z + 20)).toBe(false);
  });
});
