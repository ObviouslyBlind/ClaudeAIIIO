import { describe, expect, it } from "vitest";
import { createLandBoard } from "./land.ts";
import {
  circusMeshRadii,
  clipPolylineOutsideCircle,
  clipPolylineOutsideCircuses,
  circusesFromGraph,
  circusArmDir,
  circusGiveWayRings,
  circusMergeFilletM,
  circusMergeRing,
  enterCircusRings,
  segmentCircleHits,
  snapPolylineEndToCircle,
} from "../public/harbour/roadclip.js";
import { offsetPolyline } from "../public/harbour/roads.js";
import { carriagewayWidthM, laneOffsetM } from "../public/harbour/roadclass.js";

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

  it("circle-cuts an offset dual onto the outer ring face for drawing", () => {
    const map = createLandBoard();
    const node = map.graph.nodes.find((n) => n.id === "s-rab-harbour")!;
    const edge = map.graph.edges.find(
      (e) => e.name === "Island Hwy" && e.cls === "highway" && (e.a === node.id || e.b === node.id) && (e.a === "s-port" || e.b === "s-port"),
    )!;
    const { clip, outer } = circusMeshRadii(node.radius);
    const lane = laneOffsetM("highway");
    const chains = clipPolylineOutsideCircuses(
      offsetPolyline(edge.points, lane),
      circusesFromGraph(map.graph).filter((c) => c.id === node.id),
    );
    expect(chains.length).toBe(1);
    const ch = chains[0]!;
    const d0 = Math.hypot(ch[0]!.x - node.x, ch[0]!.z - node.z);
    const d1 = Math.hypot(ch[ch.length - 1]!.x - node.x, ch[ch.length - 1]!.z - node.z);
    const near = Math.min(d0, d1);
    expect(near).toBeCloseTo(clip, 0);
    expect(near).toBeGreaterThan(outer - 3);
    expect(near).toBeLessThan(outer + 1);
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

function ringContains(ring: number[][], x: number, z: number) {
  const pts = ring.slice();
  if (
    pts.length > 1 &&
    pts[0]![0] === pts[pts.length - 1]![0] &&
    pts[0]![1] === pts[pts.length - 1]![1]
  ) {
    pts.pop();
  }
  let inside = false;
  const n = pts.length;
  for (let i = 0, j = n - 1; i < n; i++) {
    const a = pts[i]!;
    const b = pts[j]!;
    const zi = a[1]!;
    const zj = b[1]!;
    if ((zi > z) !== (zj > z)) {
      const xi = a[0]!;
      const xj = b[0]!;
      if (x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
    }
    j = i;
  }
  return inside;
}

describe("circus merge flares", () => {
  it("fillets a dual into the ring instead of a chord trapezoid", () => {
    const outer = 42;
    const half = carriagewayWidthM("highway") / 2;
    const dir = { x: 1, z: 0 };
    const ring = circusMergeRing(0, 0, dir, outer, half);
    const F = circusMergeFilletM(half, outer);
    expect(F).toBeGreaterThan(8);
    let maxLat = 0;
    let onCircle = 0;
    for (const p of ring) {
      maxLat = Math.max(maxLat, Math.abs(p[1]!));
      const d = Math.hypot(p[0]!, p[1]!);
      if (Math.abs(d - outer) < 0.35) onCircle += 1;
    }
    expect(maxLat).toBeGreaterThan(half + 0.8);
    expect(onCircle).toBeGreaterThan(4);

    const xc = Math.sqrt((outer + F) ** 2 - (half + F) ** 2);
    const midA = lerpHalf(-Math.PI / 2, Math.atan2(-(half + F), -xc));
    const mx = xc + Math.cos(midA) * F;
    const mz = half + F + Math.sin(midA) * F;
    const px = Math.sqrt(outer * outer - half * half);
    const nx = mx + (px - mx) * 0.45;
    const nz = mz + (half - mz) * 0.45;
    expect(nz).toBeGreaterThan(half);
    expect(ringContains(ring, nx, nz), "fillet missed the kerb armpit").toBe(true);
    expect(ringContains(ring, 80, 0)).toBe(false);
    expect(ringContains(ring, 0, 0)).toBe(false);
    expect(circusGiveWayRings(0, 0, dir, outer, half).length).toBeGreaterThan(4);
  });

  it("flares Island Hwy into Harbour Circus on the live graph", () => {
    const map = createLandBoard();
    const node = map.graph.nodes.find((n) => n.id === "s-rab-harbour")!;
    const edge = map.graph.edges.find(
      (e) => e.name === "Island Hwy" && e.cls === "highway" && (e.a === node.id || e.b === node.id) && (e.a === "s-port" || e.b === "s-port"),
    )!;
    const { outer } = circusMeshRadii(node.radius);
    const half = carriagewayWidthM("highway") / 2;
    const dir = circusArmDir(node, edge);
    const ring = circusMergeRing(node.x, node.z, dir, outer, half);
    const rx = dir.z;
    const rz = -dir.x;
    let maxLat = 0;
    for (const p of ring) {
      const dx = p[0]! - node.x;
      const dz = p[1]! - node.z;
      maxLat = Math.max(maxLat, Math.abs(dx * rx + dz * rz));
    }
    expect(maxLat).toBeGreaterThan(half + 0.8);
    const F = circusMergeFilletM(half, outer);
    const xc = Math.sqrt((outer + F) ** 2 - (half + F) ** 2);
    const midA = lerpHalf(-Math.PI / 2, Math.atan2(-(half + F), -xc));
    const along = xc + Math.cos(midA) * F;
    const lat = half + F + Math.sin(midA) * F;
    const px = Math.sqrt(outer * outer - half * half);
    const a = along + (px - along) * 0.45;
    const b = lat + (half - lat) * 0.45;
    const x = node.x + dir.x * a + rx * b;
    const z = node.z + dir.z * a + rz * b;
    expect(ringContains(ring, x, z), "Harbour Circus merge missed the Hwy armpit").toBe(true);
  });
});

function lerpHalf(a0: number, a1: number) {
  let d = a1 - a0;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a0 + d * 0.5;
}
