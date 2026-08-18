import { describe, expect, it } from "vitest";
import { createLandBoard } from "./land.ts";
import { junctionPad } from "../public/harbour/roadnet.js";
import { junctionKerbQuads } from "../public/harbour/roadjoin.js";

describe("junction kerb quads", () => {
  it("fills the SW T with L-bands on the kerb, not through the tarmac heart", () => {
    const graph = createLandBoard().graph;
    const sw = graph.nodes.find((n) => n.id === "s-quay-sw")!;
    const pad = junctionPad(graph, sw)!;
    const { walks, tarmac } = junctionKerbQuads(graph, sw, pad);
    expect(walks.length).toBeGreaterThanOrEqual(4);
    expect(tarmac.length).toBeGreaterThan(0);
    for (const q of walks) {
      for (const p of [q.a, q.b, q.c, q.d]) {
        const d = Math.hypot(p.x - sw.x, p.z - sw.z);
        expect(d, "walk quad covered the tarmac heart").toBeGreaterThan(3.2);
      }
    }
  });

  it("uses a square outer kerb at a 90° loop corner, not a 3-point miter", () => {
    const graph = createLandBoard().graph;
    const se = graph.nodes.find((n) => n.id === "s-quay-se")!;
    const pad = junctionPad(graph, se)!;
    const { walks } = junctionKerbQuads(graph, se, pad);
    // Two arms at 90°: inner L (2 quads) + outer 270° L (2 quads).
    expect(walks.length).toBe(4);
    const pts = walks.flatMap((q) => [q.a, q.b, q.c, q.d]);
    const outer = pts.reduce((best, p) => (p.x + p.z > best.x + best.z ? p : best));
    const dx = outer.x - se.x;
    const dz = outer.z - se.z;
    expect(dx).toBeGreaterThan(5);
    expect(dz).toBeGreaterThan(5);
    // Square kerb: equal offsets. A 3-point miter would shoot the bisector.
    expect(Math.abs(dx - dz)).toBeLessThan(0.8);
  });
});
