import { describe, expect, it } from "vitest";
import { createLandBoard } from "./land.ts";
import {
  buildIslandFootprints,
  isNetworkRoad,
  multiContains,
  segmentRing,
  unionGeoms,
} from "../public/harbour/roadfoot.js";

describe("road footprints", () => {
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

  it("covers Quayward corners with one tarmac polygon and a walk outside the kerb", () => {
    const map = createLandBoard();
    const roads = map.roads.filter((r) => r.island === "south" && isNetworkRoad(r));
    const foot = buildIslandFootprints(roads);
    const sw = map.graph.nodes.find((n) => n.id === "s-quay-sw")!;
    const se = map.graph.nodes.find((n) => n.id === "s-quay-se")!;
    expect(multiContains(foot.tarmac, sw.x, sw.z)).toBe(true);
    expect(multiContains(foot.tarmac, se.x, se.z)).toBe(true);
    // Outer kerb exists: a few metres SE of the SE corner, on the walk band.
    expect(multiContains(foot.sidewalk, se.x + 6, se.z + 6)).toBe(true);
    expect(multiContains(foot.tarmac, se.x + 6, se.z + 6)).toBe(false);
  });
});
