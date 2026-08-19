import { describe, expect, it } from "vitest";
import { createLandBoard } from "./land.ts";
import {
  circusMeshRadii,
  clipPolylineOutsideCircle,
  clipPolylineOutsideCircuses,
  circusesFromGraph,
  enterCircusRings,
  segmentCircleHits,
  snapPolylineEndToCircle,
} from "../public/harbour/roadclip.js";
import { offsetPolyline } from "../public/harbour/roads.js";
import { laneOffsetM } from "../public/harbour/roadclass.js";

describe("circus circle clip", () => {
  it("cuts a radial run on the circle and drops the interior", () => {
    const pts = [];
    for (let x = -80; x <= 80; x += 8) pts.push({ x, z: 0 });
    const chains = clipPolylineOutsideCircle(pts, 0, 0, 40);
    expect(chains.length).toBe(2);
    const left = chains[0]![chains[0]!.length - 1]!;
    const right = chains[1]![0]!;
    expect(Math.hypot(left.x, left.z)).toBeCloseTo(40, 1);
    expect(Math.hypot(right.x, right.z)).toBeCloseTo(40, 1);
    expect(left.x).toBeLessThan(0);
    expect(right.x).toBeGreaterThan(0);
  });

  it("splits a secant so a chord cannot pave the island", () => {
    const pts = [
      { x: -50, z: 10 },
      { x: 50, z: 10 },
    ];
    const hits = segmentCircleHits(pts[0]!, pts[1]!, 0, 0, 30);
    expect(hits.length).toBe(2);
    const chains = clipPolylineOutsideCircle(pts, 0, 0, 30);
    expect(chains.length).toBe(2);
    for (const ch of chains) {
      for (const p of ch) expect(Math.hypot(p.x, p.z)).toBeGreaterThanOrEqual(30 - 0.05);
    }
  });

  it("extends a kerb stub onto the circus ring instead of stopping in the sand", () => {
    const pts = [
      { x: 80, z: 0 },
      { x: 34, z: 0 },
    ];
    const out = snapPolylineEndToCircle(pts, 0, 0, 28, false);
    expect(out[out.length - 1]!.x).toBeCloseTo(28, 1);
    expect(out[0]!.x).toBe(80);
  });

  it("runs an Island Hwy dual onto Harbour Circus, not 9 m beside the kerb", () => {
    const map = createLandBoard();
    const node = map.graph.nodes.find((n) => n.id === "s-rab-harbour")!;
    const edge = map.graph.edges.find(
      (e) => e.name === "Island Hwy" && e.cls === "highway" && (e.a === node.id || e.b === node.id) && (e.a === "s-port" || e.b === "s-port"),
    )!;
    expect(edge).toBeTruthy();
    const { enter, inner, outer } = circusMeshRadii(node.radius);
    const lane = laneOffsetM("highway");
    const chains = enterCircusRings(offsetPolyline(edge.points, lane), circusesFromGraph(map.graph).filter((c) => c.id === node.id));
    expect(chains.length).toBe(1);
    const ch = chains[0]!;
    const d0 = Math.hypot(ch[0]!.x - node.x, ch[0]!.z - node.z);
    const d1 = Math.hypot(ch[ch.length - 1]!.x - node.x, ch[ch.length - 1]!.z - node.z);
    const near = Math.min(d0, d1);
    expect(near).toBeLessThan(enter + 1.5);
    expect(near).toBeGreaterThan(inner);
    expect(near).toBeLessThan(outer);
  });

  it("clips every south circus in one pass without eating the whole highway", () => {
    const map = createLandBoard();
    const circuses = circusesFromGraph(map.graph);
    expect(circuses.length).toBe(4);
    const edge = map.graph.edges.find((e) => e.name === "Island Hwy" && e.cls === "highway")!;
    const chains = clipPolylineOutsideCircuses(edge.points, circuses);
    expect(chains.length).toBeGreaterThanOrEqual(1);
    expect(chains[0]!.length).toBeGreaterThan(2);
  });
});
