import { describe, expect, it } from "vitest";
import { createLandBoard } from "./land.ts";
import { SOUTH_PORT, SOUTH_TOWNS, ROAD_TURN_DEG } from "./southGeom.ts";
import { carriagewayWidthM, roadClassSpec } from "../public/harbour/roadclass.js";
import { drivableEdges, projectOnEdge, routeOnGraph, junctionPad, trimPolylineForPads } from "../public/harbour/roadnet.js";

function nodeOf(graph: { nodes: { id: string }[] }, id: string) {
  return graph.nodes.find((n) => n.id === id)!;
}

function orient(a: { x: number; z: number }, b: { x: number; z: number }, c: { x: number; z: number }) {
  return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
}

/** Strict crossing: touching at a shared endpoint does not count. */
function properIntersect(
  a: { x: number; z: number },
  b: { x: number; z: number },
  c: { x: number; z: number },
  d: { x: number; z: number },
) {
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  return o1 * o2 < -1e-6 && o3 * o4 < -1e-6;
}

describe("road graph", () => {
  it("ends every edge exactly on its nodes, so roads physically meet", () => {
    const graph = createLandBoard().graph;
    expect(graph.edges.length).toBeGreaterThan(20);
    for (const edge of graph.edges) {
      const a = nodeOf(graph, edge.a) as { x: number; z: number; kind: string; radius?: number };
      const b = nodeOf(graph, edge.b) as { x: number; z: number; kind: string; radius?: number };
      expect(a, `edge ${edge.id} has no node ${edge.a}`).toBeTruthy();
      expect(b, `edge ${edge.id} has no node ${edge.b}`).toBeTruthy();
      const head = edge.points[0]!;
      const tail = edge.points[edge.points.length - 1]!;
      // A circus hands out points on its kerb; everything else is the node itself.
      const err = (n: typeof a, p: { x: number; z: number }) =>
        n.kind === "circus" ? Math.abs(Math.hypot(p.x - n.x, p.z - n.z) - (n.radius ?? 0)) : Math.hypot(p.x - n.x, p.z - n.z);
      expect(err(a, head)).toBeLessThan(0.01);
      expect(err(b, tail)).toBeLessThan(0.01);
    }
  });

  it("keeps every paved node reachable from the South quay", () => {
    const graph = createLandBoard().graph;
    const paved = drivableEdges(graph, "south");
    const adj = new Map<string, string[]>();
    for (const e of paved) {
      if (!adj.has(e.a)) adj.set(e.a, []);
      if (!adj.has(e.b)) adj.set(e.b, []);
      adj.get(e.a)!.push(e.b);
      adj.get(e.b)!.push(e.a);
    }
    const seen = new Set(["s-port"]);
    const queue = ["s-port"];
    while (queue.length) {
      const cur = queue.shift()!;
      for (const next of adj.get(cur) ?? []) {
        if (seen.has(next)) continue;
        seen.add(next);
        queue.push(next);
      }
    }
    const pavedNodes = new Set(paved.flatMap((e) => [e.a, e.b]));
    const stranded = [...pavedNodes].filter((id) => !seen.has(id));
    expect(stranded).toEqual([]);
  });

  it("authors a full hierarchy: highway, avenue, street, lane and track", () => {
    const graph = createLandBoard().graph;
    const count = (cls: string) => graph.edges.filter((e) => e.cls === cls).length;
    expect(count("highway")).toBeGreaterThan(2);
    expect(count("avenue")).toBeGreaterThan(4);
    expect(count("street")).toBeGreaterThan(4);
    expect(count("lane")).toBeGreaterThan(4);
    expect(count("track")).toBeGreaterThan(4);
    expect(graph.nodes.filter((n) => n.kind === "circus")).toHaveLength(4);
    // Every junction actually joins something.
    for (const node of graph.nodes.filter((n) => n.kind === "junction")) {
      const arms = graph.edges.filter((e) => e.a === node.id || e.b === node.id);
      expect(arms.length, `junction ${node.id} has ${arms.length} arm(s)`).toBeGreaterThanOrEqual(2);
    }
  });

  it("routes the cab from the quay to every town without leaving tarmac", () => {
    const board = createLandBoard();
    const graph = board.graph;
    const paved = drivableEdges(graph, "south");
    const onTarmac = (x: number, z: number) => {
      let best = Infinity;
      for (const e of paved) {
        const d = projectOnEdge(e, x, z).dist - carriagewayWidthM(e.cls) / 2;
        best = Math.min(best, d);
      }
      return best;
    };

    for (const town of SOUTH_TOWNS) {
      const route = routeOnGraph(graph, "south", SOUTH_PORT.x + 10, SOUTH_PORT.z, town.x, town.z);
      expect(route, `no route to ${town.name}`).toBeTruthy();
      expect(route!.points.length).toBeGreaterThan(4);
      for (let i = 0; i < route!.points.length - 1; i++) {
        const a = route!.points[i]!;
        const b = route!.points[i + 1]!;
        // No teleporting between disconnected roads.
        expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeLessThan(60);
        const mx = (a.x + b.x) / 2;
        const mz = (a.z + b.z) / 2;
        // Allow a circus kerb, which is ring tarmac rather than an edge.
        const nearCircus = graph.nodes.some(
          (n) => n.kind === "circus" && Math.abs(Math.hypot(mx - n.x, mz - n.z) - (n.radius ?? 0)) < 8,
        );
        if (!nearCircus) expect(onTarmac(mx, mz), `off tarmac heading to ${town.name}`).toBeLessThan(1.5);
      }
    }
  });

  it("never routes the cab down a field track", () => {
    const board = createLandBoard();
    const graph = board.graph;
    const tracks = graph.edges.filter((e) => roadClassSpec(e.cls).dirt);
    expect(tracks.length).toBeGreaterThan(4);
    const haven = SOUTH_TOWNS.find((t) => t.id === "east-haven")!;
    const route = routeOnGraph(graph, "south", SOUTH_PORT.x + 10, SOUTH_PORT.z, haven.x, haven.z)!;
    expect(route).toBeTruthy();
    for (const p of route.points) {
      const onTrack = Math.min(...tracks.map((t) => projectOnEdge(t, p.x, p.z).dist));
      expect(onTrack).toBeGreaterThan(2);
    }
  });

  it("never lets paved roads cut through each other without a shared node", () => {
    const graph = createLandBoard().graph;
    const paved = graph.edges.filter((e) => e.cls !== "track");
    const hits: string[] = [];
    for (let i = 0; i < paved.length; i++) {
      const A = paved[i]!;
      for (let j = i + 1; j < paved.length; j++) {
        const B = paved[j]!;
        if (A.a === B.a || A.a === B.b || A.b === B.a || A.b === B.b) continue;
        for (let u = 0; u < A.points.length - 1; u++) {
          for (let v = 0; v < B.points.length - 1; v++) {
            if (properIntersect(A.points[u]!, A.points[u + 1]!, B.points[v]!, B.points[v + 1]!)) {
              hits.push(`${A.name} × ${B.name}`);
            }
          }
        }
      }
    }
    expect(hits).toEqual([]);
  });

  it("keeps Quayward SW as a 90° T: Strand continues south, the south loop is the stem", () => {
    const graph = createLandBoard().graph;
    const sw = graph.nodes.find((n) => n.id === "s-quay-sw");
    expect(sw).toBeTruthy();
    const pad = junctionPad(graph, sw);
    expect(pad?.kind).toBe("tee");
    const arms = graph.edges.filter((e) => e.cls !== "track" && (e.a === sw!.id || e.b === sw!.id));
    expect(arms.length).toBe(3);
    const strand = arms.find((e) => e.name === "South Strand")!;
    const far = strand.a === sw!.id ? strand.points[1]! : strand.points[strand.points.length - 2]!;
    const dx = far.x - sw!.x;
    const dz = far.z - sw!.z;
    const len = Math.hypot(dx, dz) || 1;
    expect(dz / len).toBeGreaterThan(0.98);
    expect(Math.abs(dx / len)).toBeLessThan(0.1);
    const loopEast = arms.find((e) => {
      if (e.name !== "Quayward Loop") return false;
      const p = e.a === sw!.id ? e.points[1]! : e.points[e.points.length - 2]!;
      return p.x > sw!.x + 10;
    })!;
    const trimmed = trimPolylineForPads(loopEast.points, graph, loopEast);
    const orig = loopEast.a === sw!.id ? loopEast.points[0]! : loopEast.points[loopEast.points.length - 1]!;
    const end = loopEast.a === sw!.id ? trimmed[0]! : trimmed[trimmed.length - 1]!;
    expect(Math.hypot(orig.x - sw!.x, orig.z - sw!.z)).toBeLessThan(0.01);
    expect(Math.hypot(end.x - sw!.x, end.z - sw!.z)).toBeGreaterThan(2);

    const dirs = arms.map((e) => {
      const p = e.a === sw!.id ? e.points[1]! : e.points[e.points.length - 2]!;
      const x = p.x - sw!.x;
      const z = p.z - sw!.z;
      const n = Math.hypot(x, z) || 1;
      return { x: x / n, z: z / n };
    });
    const legal = [...ROAD_TURN_DEG, 180];
    for (let i = 0; i < dirs.length; i++) {
      for (let j = i + 1; j < dirs.length; j++) {
        const dot = Math.max(-1, Math.min(1, dirs[i]!.x * dirs[j]!.x + dirs[i]!.z * dirs[j]!.z));
        const deg = (Math.acos(dot) * 180) / Math.PI;
        expect(
          legal.some((d) => Math.abs(deg - d) < 4),
          `SW arm angle ${deg.toFixed(1)}° is not 15/30/45/90/180`,
        ).toBe(true);
      }
    }
  });
});
