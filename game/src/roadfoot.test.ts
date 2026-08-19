import { describe, expect, it } from "vitest";
import { createLandBoard } from "./land.ts";
import { junctionPad } from "../public/harbour/roadnet.js";
import { buildHubFootprint, buildCircusFootprint, clipPolylineToOutside, multiContains, segmentRing, unionGeoms, junctionContour, CIRCUS_ARM_STUB_M, biteRibbonWith, circleRing, swellRing } from "../public/harbour/roadfoot.js";
import { circusMeshRadii } from "../public/harbour/roadclip.js";
import { carriagewayWidthM } from "../public/harbour/roadclass.js";

describe("road hub footprints", () => {
  it("bites a square ribbon end into a circular kerb instead of leaving a chord", () => {
    const stub = [
      { x: 55, z: 0 },
      { x: 42, z: 0 },
      { x: 36, z: 0 },
    ];
    const disc = [[circleRing(0, 0, 42, 48)]];
    const bitten = biteRibbonWith(stub, 4, disc);
    expect(bitten.length).toBeGreaterThan(0);
    expect(multiContains(bitten, 50, 0)).toBe(true);
    expect(multiContains(bitten, 36, 0), "square end left inside the circus").toBe(false);
    expect(multiContains(bitten, 20, 0)).toBe(false);
  });

  it("swells a hub outline for grit instead of growing a second fillet star", () => {
    const square = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ];
    const lip = swellRing(square, 2);
    const poly = [[lip]];
    expect(multiContains(poly, 5, -1.5)).toBe(true);
    expect(multiContains(poly, 5, -6)).toBe(false);
    expect(multiContains(poly, 12, 12)).toBe(false);
  });

  it("fills a T as one rounded contour, not two stacked rectangles", () => {
    const arms = [
      { dx: 1, dz: 0, half: 3, reach: 20 },
      { dx: -1, dz: 0, half: 3, reach: 20 },
      { dx: 0, dz: 1, half: 3, reach: 20 },
    ];
    const ring = junctionContour({ x: 0, z: 0 }, arms, 0);
    const poly = [[ring]];
    expect(multiContains(poly, 0, 0)).toBe(true);
    expect(multiContains(poly, 0, 10)).toBe(true);
    expect(multiContains(poly, 8, 0)).toBe(true);
    expect(multiContains(poly, 10, 10)).toBe(false);
    expect(multiContains(poly, 0, 25)).toBe(false);
  });

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
    expect(foot.sidewalk.length).toBeGreaterThan(0);
    expect(multiContains(foot.sidewalk, se.x, se.z)).toBe(false);
    expect(multiContains(foot.tarmac, se.x + 20, se.z + 20)).toBe(false);
    expect(foot.tarmac[0]?.[0]?.length).toBeGreaterThan(16);
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

  it("meets Island Hwy at the outer lane, not the median", () => {
    const graph = createLandBoard().graph;
    const node = graph.nodes.find((n) => n.id === "s-hwy-hc-j1")!;
    const pad = junctionPad(graph, node)!;
    const sands = graph.edges.find((e) => e.name === "Channel Sands" && (e.a === node.id || e.b === node.id))!;
    const hwy = graph.edges.find((e) => e.cls === "highway" && (e.a === node.id || e.b === node.id))!;
    const trimM = pad.trim[sands.id] || 0;
    expect(trimM).toBeGreaterThan(14);
    expect(pad.trim[hwy.id] || 0).toBe(0);
    const sPts = sands.points;
    const sFromA = sands.a === node.id;
    const sa = sFromA ? sPts[0]! : sPts[sPts.length - 1]!;
    const sb = sFromA ? sPts[1]! : sPts[sPts.length - 2]!;
    const sLen = Math.hypot(sb.x - sa.x, sb.z - sa.z) || 1;
    const sx = (sb.x - sa.x) / sLen;
    const sz = (sb.z - sa.z) / sLen;
    const hPts = hwy.points;
    const hFromA = hwy.a === node.id;
    const ha = hFromA ? hPts[0]! : hPts[hPts.length - 1]!;
    const hb = hFromA ? hPts[1]! : hPts[hPts.length - 2]!;
    const hLen = Math.hypot(hb.x - ha.x, hb.z - ha.z) || 1;
    const hx = (hb.x - ha.x) / hLen;
    const hz = (hb.z - ha.z) / hLen;
    const end = { x: node.x + sx * trimM, z: node.z + sz * trimM };
    const dist = Math.abs((end.x - node.x) * hz - (end.z - node.z) * hx);
    expect(dist).toBeGreaterThan(8);
    expect(dist).toBeLessThan(13.5);
    const foot = buildHubFootprint(graph, node, pad);
    expect(multiContains(foot.tarmac, end.x, end.z)).toBe(true);
  });

  it("does not lay a runway plate under a through road", () => {
    const graph = createLandBoard().graph;
    const hwyT = graph.nodes.find((n) => n.id === "s-hwy-hc-j1")!;
    const hwyPad = junctionPad(graph, hwyT)!;
    const hwy = graph.edges.find((e) => e.cls === "highway" && (e.a === hwyT.id || e.b === hwyT.id))!;
    expect(hwyPad.throughEdgeIds).toContain(hwy.id);
    expect(hwyPad.along[hwy.id]).toBeLessThan(carriagewayWidthM("highway") / 2 + 2);
    const sw = graph.nodes.find((n) => n.id === "s-quay-sw")!;
    const swPad = junctionPad(graph, sw)!;
    const strand = graph.edges.find((e) => e.name === "South Strand" && (e.a === sw.id || e.b === sw.id))!;
    expect(swPad.throughEdgeIds).toContain(strand.id);
    expect(swPad.along[strand.id]).toBeLessThan(carriagewayWidthM(strand.cls) / 2 + 2);
  });

  it("fills the inner T kerb with a tangent fillet, not a square rectangle crotch", () => {
    const graph = createLandBoard().graph;
    for (const id of ["s-quay-sw", "s-hwy-hc-j1"]) {
      const n = graph.nodes.find((x) => x.id === id)!;
      const pad = junctionPad(graph, n)!;
      const foot = buildHubFootprint(graph, n, pad);
      const arms: { dx: number; dz: number; half: number }[] = [];
      for (const e of graph.edges) {
        if (e.a !== n.id && e.b !== n.id) continue;
        if (!e.points || e.points.length < 2) continue;
        const pts = e.points;
        const fromA = e.a === n.id;
        const a = fromA ? pts[0]! : pts[pts.length - 1]!;
        const b = fromA ? pts[1]! : pts[pts.length - 2]!;
        const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
        arms.push({
          dx: (b.x - a.x) / len,
          dz: (b.z - a.z) / len,
          half: carriagewayWidthM(e.cls) / 2,
        });
      }
      expect(foot.tarmac.length, `${id} one hub plate`).toBe(1);
      let checked = 0;
      for (let i = 0; i < arms.length; i++) {
        for (let j = i + 1; j < arms.length; j++) {
          const a = arms[i]!;
          const b = arms[j]!;
          const ang = Math.acos(Math.max(-1, Math.min(1, a.dx * b.dx + a.dz * b.dz)));
          if (ang < 0.5 || ang > 1.9) continue;
          let aP = { x: a.dz, z: -a.dx };
          let bP = { x: b.dz, z: -b.dx };
          if (aP.x * b.dx + aP.z * b.dz < 0) aP = { x: -aP.x, z: -aP.z };
          if (bP.x * a.dx + bP.z * a.dz < 0) bP = { x: -bP.x, z: -bP.z };
          const det = aP.x * bP.z - aP.z * bP.x;
          if (Math.abs(det) < 1e-5) continue;
          const extra = 0.75;
          const ha = a.half + extra;
          const hb = b.half + extra;
          const p = {
            x: n.x + (ha * bP.z - hb * aP.z) / det,
            z: n.z + (aP.x * hb - bP.x * ha) / det,
          };
          checked += 1;
          expect(multiContains(foot.tarmac, p.x, p.z), `${id} fillet missed armpit`).toBe(true);
          const far = {
            x: n.x + ((a.half + 12) * bP.z - (b.half + 12) * aP.z) / det,
            z: n.z + (aP.x * (b.half + 12) - bP.x * (a.half + 12)) / det,
          };
          expect(multiContains(foot.tarmac, far.x, far.z), `${id} fillet ate the grass`).toBe(false);
        }
      }
      expect(checked, id).toBeGreaterThan(0);
    }
  });

  it("keeps hub sidewalk off the tarmac heart at the joins you can see from spawn", () => {
    const graph = createLandBoard().graph;
    for (const id of ["s-quay-sw", "s-quay-se", "s-hwy-hc-j1"]) {
      const n = graph.nodes.find((x) => x.id === id)!;
      const pad = junctionPad(graph, n)!;
      const fp = buildHubFootprint(graph, n, pad);
      expect(multiContains(fp.tarmac, n.x, n.z), `${id} tarmac`).toBe(true);
      expect(multiContains(fp.sidewalk, n.x, n.z), `${id} walk on tarmac`).toBe(false);
    }
  });

  it("makes Harbour Circus one tarmac piece covering both duals and Quayward, not stacked tapes", () => {
    const graph = createLandBoard().graph;
    const n = graph.nodes.find((x) => x.id === "s-rab-harbour")!;
    const foot = buildCircusFootprint(graph, n);
    const { outer, inner } = circusMeshRadii(n.radius);
    expect(multiContains(foot.tarmac, n.x, n.z), "stone island should be a hole").toBe(false);
    expect(foot.tarmac.length).toBe(1);
    const hwy = graph.edges.find(
      (e) => e.cls === "highway" && (e.a === n.id || e.b === n.id) && (e.a === "s-port" || e.b === "s-port"),
    )!;
    const pts = hwy.points;
    const fromA = hwy.a === n.id;
    const a = fromA ? pts[0]! : pts[pts.length - 1]!;
    const b = fromA ? pts[1]! : pts[pts.length - 2]!;
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const dx = (b.x - a.x) / len;
    const dz = (b.z - a.z) / len;
    const onRing = { x: n.x + dx * ((inner + outer) / 2), z: n.z + dz * ((inner + outer) / 2) };
    expect(multiContains(foot.tarmac, onRing.x, onRing.z)).toBe(true);
    const quay = graph.edges.find((e) => e.name === "Quayward Rd" && (e.a === n.id || e.b === n.id))!;
    const qPts = quay.points;
    const qFromA = quay.a === n.id;
    const qa = qFromA ? qPts[0]! : qPts[qPts.length - 1]!;
    const qb = qFromA ? qPts[1]! : qPts[qPts.length - 2]!;
    const qLen = Math.hypot(qb.x - qa.x, qb.z - qa.z) || 1;
    const qx = (qb.x - qa.x) / qLen;
    const qz = (qb.z - qa.z) / qLen;
    expect(multiContains(foot.tarmac, n.x + qx * ((inner + outer) / 2), n.z + qz * ((inner + outer) / 2))).toBe(true);
    expect(inner).toBeGreaterThan(10);
    expect(CIRCUS_ARM_STUB_M).toBeLessThan(5);
    expect(multiContains(foot.clip, n.x, n.z), "clip is the outer disc").toBe(true);
    expect(multiContains(foot.clip, n.x + dx * (outer + 10), n.z + dz * (outer + 10)), "12 m grass stub").toBe(false);
  });
});
