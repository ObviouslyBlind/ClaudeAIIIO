/**
 * Queries and routing over the road graph.
 *
 * Everything here works on nodes and edges, so a route is a walk over roads
 * that physically touch. There is no "is this other polyline close enough"
 * guess, which is what used to fling the cab across open dirt.
 */

import { carriagewayWidthM, laneOffsetM, roadClassSpec } from "./roadclass.js";

export function nodeById(graph, id) {
  if (!graph) return null;
  return graph.nodes.find((n) => n.id === id) || null;
}

export function islandEdges(graph, islandId) {
  if (!graph) return [];
  return graph.edges.filter((e) => e.island === islandId && e.points && e.points.length >= 2);
}

/** Paved edges only. The cab does not take field tracks. */
export function drivableEdges(graph, islandId) {
  return islandEdges(graph, islandId).filter((e) => !roadClassSpec(e.cls).dirt);
}

export function edgeLength(edge) {
  let acc = 0;
  for (let i = 0; i < edge.points.length - 1; i++) {
    acc += Math.hypot(edge.points[i + 1].x - edge.points[i].x, edge.points[i + 1].z - edge.points[i].z);
  }
  return acc;
}

/** Closest point on an edge, with the index and distance along it. */
export function projectOnEdge(edge, x, z) {
  let best = { x: edge.points[0].x, z: edge.points[0].z, i: 0, t: 0, dist: Infinity, along: 0 };
  let acc = 0;
  for (let i = 0; i < edge.points.length - 1; i++) {
    const a = edge.points[i];
    const b = edge.points[i + 1];
    const vx = b.x - a.x;
    const vz = b.z - a.z;
    const len2 = vx * vx + vz * vz || 1;
    const len = Math.sqrt(len2);
    let t = ((x - a.x) * vx + (z - a.z) * vz) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = a.x + vx * t;
    const pz = a.z + vz * t;
    const dist = Math.hypot(x - px, z - pz);
    if (dist < best.dist) best = { x: px, z: pz, i, t, dist, along: acc + t * len };
    acc += len;
  }
  return best;
}

export function nearestEdge(graph, islandId, x, z, opts = {}) {
  const edges = opts.includeDirt ? islandEdges(graph, islandId) : drivableEdges(graph, islandId);
  let best = null;
  for (const edge of edges) {
    const proj = projectOnEdge(edge, x, z);
    if (!best || proj.dist < best.proj.dist) best = { edge, proj };
  }
  return best;
}

function slicePoints(points, fromIdx, fromPt, toIdx, toPt) {
  const out = [{ x: fromPt.x, z: fromPt.z }];
  if (fromIdx < toIdx) {
    for (let i = fromIdx + 1; i <= toIdx; i++) out.push({ x: points[i].x, z: points[i].z });
  } else if (fromIdx > toIdx) {
    for (let i = fromIdx; i > toIdx; i--) out.push({ x: points[i].x, z: points[i].z });
  }
  out.push({ x: toPt.x, z: toPt.z });
  return out;
}

/** Walk an edge from one end node to the other. */
export function edgeRun(edge, fromNodeId) {
  const pts = edge.points.map((p) => ({ x: p.x, z: p.z }));
  return edge.a === fromNodeId ? pts : pts.reverse();
}

/** Walk part of an edge, between a projected point and one of its nodes. */
export function edgePartial(edge, proj, toNodeId) {
  const last = edge.points.length - 1;
  if (edge.b === toNodeId) {
    return slicePoints(edge.points, proj.i, proj, last, edge.points[last]);
  }
  return slicePoints(edge.points, proj.i, proj, 0, edge.points[0]);
}

/** Arc round a circus kerb from one entry point to another, the short way. */
export function circusArc(node, from, to, steps = 10) {
  const r = node.radius || 0;
  if (!r) return [];
  const a0 = Math.atan2(from.z - node.z, from.x - node.x);
  const a1 = Math.atan2(to.z - node.z, to.x - node.x);
  let delta = a1 - a0;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  const out = [];
  for (let i = 1; i < steps; i++) {
    const a = a0 + (delta * i) / steps;
    out.push({ x: node.x + Math.cos(a) * r, z: node.z + Math.sin(a) * r });
  }
  return out;
}

function otherEnd(edge, nodeId) {
  return edge.a === nodeId ? edge.b : edge.a;
}

/** Dijkstra over junction nodes. Returns the node id chain, or null. */
export function nodePath(graph, islandId, startNodeIds, goalNodeIds) {
  const edges = drivableEdges(graph, islandId);
  const adj = new Map();
  for (const e of edges) {
    if (!adj.has(e.a)) adj.set(e.a, []);
    if (!adj.has(e.b)) adj.set(e.b, []);
    const len = edgeLength(e);
    adj.get(e.a).push({ to: e.b, edge: e, len });
    adj.get(e.b).push({ to: e.a, edge: e, len });
  }
  const goals = new Set(goalNodeIds);
  const dist = new Map();
  const prev = new Map();
  const queue = [];
  for (const [id, cost] of startNodeIds) {
    dist.set(id, cost);
    queue.push(id);
  }
  const visited = new Set();
  while (queue.length) {
    queue.sort((a, b) => (dist.get(a) ?? Infinity) - (dist.get(b) ?? Infinity));
    const cur = queue.shift();
    if (visited.has(cur)) continue;
    visited.add(cur);
    if (goals.has(cur)) {
      const chain = [cur];
      let walk = cur;
      while (prev.has(walk)) {
        walk = prev.get(walk).from;
        chain.push(walk);
      }
      chain.reverse();
      return chain.map((id, i) => ({ id, edge: i === 0 ? null : prev.get(chain[i]).edge }));
    }
    for (const link of adj.get(cur) || []) {
      const next = (dist.get(cur) ?? Infinity) + link.len;
      if (next < (dist.get(link.to) ?? Infinity)) {
        dist.set(link.to, next);
        prev.set(link.to, { from: cur, edge: link.edge });
        queue.push(link.to);
      }
    }
  }
  return null;
}

/** Shift a run onto the correct carriageway so a dual highway is not driven down the median. */
function toCarriageway(run, cls) {
  const off = laneOffsetM(cls);
  if (!off || run.length < 2) return run;
  const out = [];
  for (let i = 0; i < run.length; i++) {
    const a = run[Math.max(0, i - 1)];
    const b = run[Math.min(run.length - 1, i + 1)];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    out.push({ x: run[i].x + (dz / len) * off, z: run[i].z - (dx / len) * off });
  }
  return out;
}

function pushRun(points, run) {
  for (const p of run) {
    const last = points[points.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.z - last.z) > 0.3) points.push({ x: p.x, z: p.z });
  }
}

/**
 * Route between two world points across the graph.
 * The path only ever follows edge geometry and circus kerbs.
 */
export function routeOnGraph(graph, islandId, fromX, fromZ, toX, toZ) {
  const from = nearestEdge(graph, islandId, fromX, fromZ);
  const to = nearestEdge(graph, islandId, toX, toZ);
  if (!from || !to) return null;

  if (from.edge.id === to.edge.id) {
    const run = slicePoints(from.edge.points, from.proj.i, from.proj, to.proj.i, to.proj);
    const points = [];
    pushRun(points, toCarriageway(run, from.edge.cls));
    return points.length >= 2 ? { points, edge: to.edge, road: to.edge } : null;
  }

  const starts = new Map();
  const fromLen = edgeLength(from.edge);
  starts.set(from.edge.a, from.proj.along);
  starts.set(from.edge.b, Math.max(0, fromLen - from.proj.along));

  const goalIds = [to.edge.a, to.edge.b];
  const chain = nodePath(graph, islandId, starts, goalIds);
  if (!chain || !chain.length) return null;

  const points = [];
  const firstNode = chain[0].id;
  pushRun(points, toCarriageway(edgePartial(from.edge, from.proj, firstNode), from.edge.cls));

  for (let i = 1; i < chain.length; i++) {
    const step = chain[i];
    const prevId = chain[i - 1].id;
    const hub = nodeById(graph, prevId);
    const run = toCarriageway(edgeRun(step.edge, prevId), step.edge.cls);
    if (hub && hub.kind === "circus" && points.length) {
      pushRun(points, circusArc(hub, points[points.length - 1], run[0]));
    }
    pushRun(points, run);
  }

  const lastNode = chain[chain.length - 1].id;
  const tailRun = edgePartial(to.edge, to.proj, lastNode).slice().reverse();
  const tail = toCarriageway(tailRun, to.edge.cls);
  const hub = nodeById(graph, lastNode);
  if (hub && hub.kind === "circus" && points.length && tail.length) {
    pushRun(points, circusArc(hub, points[points.length - 1], tail[0]));
  }
  pushRun(points, tail);

  return points.length >= 2 ? { points, edge: to.edge, road: to.edge } : null;
}

/** Widest tarmac meeting a node — the junction pad has to cover all of it. */
export function junctionRadiusM(graph, node) {
  let widest = 0;
  for (const e of graph.edges) {
    if (e.a !== node.id && e.b !== node.id) continue;
    widest = Math.max(widest, carriagewayWidthM(e.cls));
  }
  return widest ? widest / 2 + 1.2 : 0;
}
