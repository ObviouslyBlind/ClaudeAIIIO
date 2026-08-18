import { describe, expect, it } from "vitest";
import { createLandBoard } from "./land.ts";
import { junctionPad } from "../public/harbour/roadnet.js";
import { buildHubFootprint, clipPolylineToOutside, multiContains, segmentRing, unionGeoms } from "../public/harbour/roadfoot.js";

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

  it("cuts a polyline on a hub boundary instead of dropping the last densify step", () => {
    const inside = (x: number, z: number) => Math.abs(x) < 5 && Math.abs(z) < 5;
    const pts = [
      { x: -12, z: 0 },
      { x: -6, z: 0 },
      { x: -2, z: 0 },
      { x: 2, z: 0 },
      { x: 6, z: 0 },
      { x: 12, z: 0 },
    ];
    const runs = clipPolylineToOutside(pts, inside);
    expect(runs.length).toBe(2);
    expect(runs[0]![runs[0]!.length - 1]!.x).toBeLessThan(-4.5);
    expect(runs[0]![runs[0]!.length - 1]!.x).toBeGreaterThan(-5.5);
    expect(runs[1]![0]!.x).toBeGreaterThan(4.5);
    expect(runs[1]![0]!.x).toBeLessThan(5.5);
  });

  it("covers both dual lanes at a highway T, not only the median", () => {
    const graph = createLandBoard().graph;
    const node = graph.nodes.find((n) => n.id === "s-hwy-hc-j1")!;
    expect(node).toBeTruthy();
    const pad = junctionPad(graph, node)!;
    const foot = buildHubFootprint(graph, node, pad);
    const hwy = graph.edges.find((e) => e.cls === "highway" && (e.a === node.id || e.b === node.id))!;
    const pts = hwy.points;
    const fromA = hwy.a === node.id;
    const a = fromA ? pts[0]! : pts[pts.length - 1]!;
    const b = fromA ? pts[1]! : pts[pts.length - 2]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    const px = -dz / len;
    const pz = dx / len;
    expect(multiContains(foot.tarmac, node.x + px * 9, node.z + pz * 9)).toBe(true);
    expect(multiContains(foot.tarmac, node.x - px * 9, node.z - pz * 9)).toBe(true);
  });
});
