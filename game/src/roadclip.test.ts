import { describe, expect, it } from "vitest";
import { createLandBoard } from "./land.ts";
import {
  circusMeshRadii,
  clipPolylineOutsideCircle,
  clipPolylineOutsideCircuses,
  circusesFromGraph,
  segmentCircleHits,
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

  it("lands an Island Hwy dual carriageway on Harbour Circus, not 9 m beside it", () => {
    const map = createLandBoard();
    const node = map.graph.nodes.find((n) => n.id === "s-rab-harbour")!;
    const edge = map.graph.edges.find(
      (e) => e.name === "Island Hwy" && e.cls === "highway" && (e.a === node.id || e.b === node.id) && (e.a === "s-port" || e.b === "s-port"),
    )!;
    expect(edge).toBeTruthy();
    const { clip, inner } = circusMeshRadii(node.radius);
    const lane = laneOffsetM("highway");
    const chains = clipPolylineOutsideCircle(offsetPolyline(edge.points, lane), node.x, node.z, clip);
    expect(chains.length).toBe(1);
    const ch = chains[0]!;
    const d0 = Math.hypot(ch[0]!.x - node.x, ch[0]!.z - node.z);
    const d1 = Math.hypot(ch[ch.length - 1]!.x - node.x, ch[ch.length - 1]!.z - node.z);
    const near = Math.min(d0, d1);
    expect(near).toBeCloseTo(clip, 0);
    expect(near).toBeGreaterThan(inner);
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
