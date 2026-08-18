/**
 * The road network as a graph, not a pile of polylines.
 *
 * The old model gave every road its own point list and hoped neighbours were
 * close enough. Junctions were then faked by *deleting* the minor road near a
 * major one, which left stubs ending in the sand, and — because that trim was
 * render-only — let the taxi drive over tarmac that was not drawn.
 *
 * Here a junction is a node. An edge physically starts and ends on its nodes,
 * so the renderer and the taxi read the same geometry and the network is
 * connected by construction.
 */

import { ROAD_CLASSES, carriagewayWidthM, isDirtClass, roadWidthM } from "../public/harbour/roadclass.js";
import type { IslandId, Road } from "./land.ts";

export type XZ = { x: number; z: number };

export type RoadClass = "highway" | "avenue" | "street" | "lane" | "track";

export type RoadNodeKind = "junction" | "terminus" | "circus";

export type RoadNode = {
  id: string;
  island: IslandId;
  x: number;
  z: number;
  kind: RoadNodeKind;
  name?: string;
  /** Circus only: kerb radius. Edges stop on this circle, never at the centre. */
  radius?: number;
};

export type RoadEdge = {
  id: string;
  island: IslandId;
  name: string;
  cls: RoadClass;
  a: string;
  b: string;
  /** points[0] is exactly node `a`; the last point is exactly node `b`. */
  points: XZ[];
};

export type RoadGraph = {
  nodes: RoadNode[];
  edges: RoadEdge[];
};

export { ROAD_CLASSES, carriagewayWidthM, roadWidthM, isDirtClass };

function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

function spline(nodes: XZ[], perSeg: number): XZ[] {
  if (nodes.length < 3) return nodes.slice();
  const out: XZ[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const p0 = nodes[Math.max(0, i - 1)]!;
    const p1 = nodes[i]!;
    const p2 = nodes[i + 1]!;
    const p3 = nodes[Math.min(nodes.length - 1, i + 2)]!;
    const last = i === nodes.length - 2 ? perSeg : perSeg - 1;
    for (let s = 0; s <= last; s++) {
      const t = s / perSeg;
      out.push({
        x: catmull(p0.x, p1.x, p2.x, p3.x, t),
        z: catmull(p0.z, p1.z, p2.z, p3.z, t),
      });
    }
  }
  return out;
}

function densify(pts: XZ[], stepM: number): XZ[] {
  const out: XZ[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const n = Math.max(1, Math.ceil(len / stepM));
    for (let s = 0; s < n; s++) {
      const t = s / n;
      out.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
    }
  }
  out.push({ ...pts[pts.length - 1]! });
  return out;
}

function dedupe(pts: XZ[], minM = 0.5): XZ[] {
  const out: XZ[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.z - last.z) > minM) out.push({ x: p.x, z: p.z });
  }
  return out;
}

export function circlePolyline(c: XZ, radius: number, steps = 32): XZ[] {
  const out: XZ[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    out.push({ x: c.x + Math.cos(t) * radius, z: c.z + Math.sin(t) * radius });
  }
  return out;
}

/** Where an edge leaves a node. Circuses hand out a point on the kerb ring. */
function anchorOf(node: RoadNode, toward: XZ): XZ {
  if (node.kind !== "circus" || !node.radius) return { x: node.x, z: node.z };
  const dx = toward.x - node.x;
  const dz = toward.z - node.z;
  const len = Math.hypot(dx, dz) || 1;
  return { x: node.x + (dx / len) * node.radius, z: node.z + (dz / len) * node.radius };
}

export type EdgeSpec = {
  name: string;
  cls: RoadClass;
  from: RoadNode;
  to: RoadNode;
  /** Shaping points between the two nodes. Endpoints are always the nodes. */
  via?: XZ[];
  /** Curve through the via points instead of running straight legs. */
  smooth?: boolean;
};

export class RoadGraphBuilder {
  private readonly island: IslandId;
  private readonly nodeList: RoadNode[] = [];
  private readonly edgeList: RoadEdge[] = [];
  private seq = 0;

  constructor(island: IslandId) {
    this.island = island;
  }

  node(id: string, x: number, z: number, kind: RoadNodeKind = "junction", name?: string): RoadNode {
    const existing = this.nodeList.find((n) => n.id === id);
    if (existing) return existing;
    const n: RoadNode = { id, island: this.island, x, z, kind, ...(name ? { name } : {}) };
    this.nodeList.push(n);
    return n;
  }

  circus(id: string, x: number, z: number, radius: number, name: string): RoadNode {
    const existing = this.nodeList.find((n) => n.id === id);
    if (existing) return existing;
    const n: RoadNode = { id, island: this.island, x, z, kind: "circus", radius, name };
    this.nodeList.push(n);
    return n;
  }

  /**
   * Split an existing edge at the point nearest `at` and return the new node.
   * This is how a side road gets a real T-junction instead of stopping short.
   */
  junctionOn(edge: RoadEdge, at: XZ, id: string): RoadNode {
    const hit = nearestOnPoints(edge.points, at);
    const node = this.node(id, hit.x, hit.z, "junction");
    const head = edge.points.slice(0, hit.i + 1).concat([{ x: hit.x, z: hit.z }]);
    const tail = [{ x: hit.x, z: hit.z }].concat(edge.points.slice(hit.i + 1));
    const idx = this.edgeList.indexOf(edge);
    if (idx < 0 || head.length < 2 || tail.length < 2) return node;
    const first: RoadEdge = { ...edge, id: `${edge.id}-a`, b: node.id, points: dedupe(head) };
    const second: RoadEdge = { ...edge, id: `${edge.id}-b`, a: node.id, points: dedupe(tail) };
    snapEnds(first, this.nodeList);
    snapEnds(second, this.nodeList);
    this.edgeList.splice(idx, 1, first, second);
    return node;
  }

  edge(spec: EdgeSpec): RoadEdge {
    // Shaping points that fall inside a circus would drag the edge back over
    // the stone island. The ring is the connector; the centre is never road.
    const insideCircus = (p: XZ) =>
      [spec.from, spec.to].some(
        (n) => n.kind === "circus" && n.radius && Math.hypot(p.x - n.x, p.z - n.z) < n.radius + 2,
      );
    const via = (spec.via ?? []).filter((p) => !insideCircus(p)).map((p) => ({ x: p.x, z: p.z }));
    const headTarget = via[0] ?? { x: spec.to.x, z: spec.to.z };
    const tailTarget = via[via.length - 1] ?? { x: spec.from.x, z: spec.from.z };
    const start = anchorOf(spec.from, headTarget);
    const end = anchorOf(spec.to, tailTarget);

    let pts = [start, ...via, end];
    if (spec.smooth && pts.length >= 3) pts = spline(pts, 6);
    pts = dedupe(densify(pts, 26));
    // The graph's whole point: the ends ARE the nodes, to the metre.
    pts[0] = { ...start };
    pts[pts.length - 1] = { ...end };

    this.seq += 1;
    const e: RoadEdge = {
      id: `${this.island}-e${this.seq}`,
      island: this.island,
      name: spec.name,
      cls: spec.cls,
      a: spec.from.id,
      b: spec.to.id,
      points: pts,
    };
    this.edgeList.push(e);
    return e;
  }

  nodes(): RoadNode[] {
    return this.nodeList;
  }

  edges(): RoadEdge[] {
    return this.edgeList;
  }

  build(): RoadGraph {
    return { nodes: this.nodeList.slice(), edges: this.edgeList.slice() };
  }
}

function snapEnds(edge: RoadEdge, nodes: RoadNode[]): void {
  const a = nodes.find((n) => n.id === edge.a);
  const b = nodes.find((n) => n.id === edge.b);
  if (a && a.kind !== "circus") edge.points[0] = { x: a.x, z: a.z };
  if (b && b.kind !== "circus") edge.points[edge.points.length - 1] = { x: b.x, z: b.z };
}

export function nearestOnPoints(pts: XZ[], at: XZ): { x: number; z: number; i: number; dist: number } {
  let best = { x: pts[0]!.x, z: pts[0]!.z, i: 0, dist: Infinity };
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const vx = b.x - a.x;
    const vz = b.z - a.z;
    const len2 = vx * vx + vz * vz || 1;
    let t = ((at.x - a.x) * vx + (at.z - a.z) * vz) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = a.x + vx * t;
    const pz = a.z + vz * t;
    const dist = Math.hypot(at.x - px, at.z - pz);
    if (dist < best.dist) best = { x: px, z: pz, i, dist };
  }
  return best;
}

export function mergeGraphs(...graphs: RoadGraph[]): RoadGraph {
  return {
    nodes: graphs.flatMap((g) => g.nodes),
    edges: graphs.flatMap((g) => g.edges),
  };
}

export function edgesAtNode(graph: RoadGraph, nodeId: string): RoadEdge[] {
  return graph.edges.filter((e) => e.a === nodeId || e.b === nodeId);
}

export function edgeLengthM(edge: RoadEdge): number {
  let acc = 0;
  for (let i = 0; i < edge.points.length - 1; i++) {
    acc += Math.hypot(edge.points[i + 1]!.x - edge.points[i]!.x, edge.points[i + 1]!.z - edge.points[i]!.z);
  }
  return acc;
}

/**
 * Legacy `Road[]` view of the graph. Lots, props, traffic, foot traffic and the
 * roadside dropper still speak that shape; they now read it off the graph
 * instead of each authoring their own idea of where the tarmac is.
 */
export function graphToRoads(graph: RoadGraph): Road[] {
  const out: Road[] = [];
  for (const e of graph.edges) {
    const spec = ROAD_CLASSES[e.cls];
    const road: Road = {
      island: e.island,
      kind: spec.dirt ? "dirt" : "paved",
      name: e.name,
      points: e.points.map((p) => ({ x: p.x, z: p.z })),
      cls: e.cls,
      edgeId: e.id,
    };
    if (spec.dual) road.lanes = 4;
    out.push(road);
  }
  for (const n of graph.nodes) {
    if (n.kind !== "circus" || !n.radius) continue;
    out.push({
      island: n.island,
      kind: "paved",
      name: n.name ?? "Circus",
      points: circlePolyline({ x: n.x, z: n.z }, n.radius, 28),
      roundabout: true,
      joins: { x: n.x, z: n.z },
      nodeId: n.id,
    });
  }
  return out;
}
