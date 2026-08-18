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

/** Outward unit from a node along one of its edges. */
function armDir(node, edge) {
  const pts = edge.points;
  const fromA = edge.a === node.id;
  const a = fromA ? pts[0] : pts[pts.length - 1];
  const b = fromA ? pts[1] : pts[pts.length - 2];
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  return { x: dx / len, z: dz / len };
}

/**
 * How a junction is drawn. A 90° corner is a square plate the ribbons stop at,
 * so they meet as an L instead of two strips crossing as a plus. A T trims the
 * stem only — the through road keeps running. Collinear 2-arm splits are a
 * continuation, not a corner, so they get no plate.
 */
export function junctionPad(graph, node) {
  if (!graph || !node || node.kind !== "junction") return null;
  const paved = [];
  for (const e of graph.edges) {
    if (e.a !== node.id && e.b !== node.id) continue;
    if (!e.points || e.points.length < 2) continue;
    if (roadClassSpec(e.cls).dirt) continue;
    paved.push({ edge: e, dir: armDir(node, e), width: carriagewayWidthM(e.cls) });
  }
  if (paved.length < 2) return null;

  let throughDot = 1;
  let through = null;
  for (let i = 0; i < paved.length; i++) {
    for (let j = i + 1; j < paved.length; j++) {
      const dot = paved[i].dir.x * paved[j].dir.x + paved[i].dir.z * paved[j].dir.z;
      if (dot < throughDot) {
        throughDot = dot;
        through = [paved[i], paved[j]];
      }
    }
  }

  const widest = Math.max(...paved.map((a) => a.width));
  const collinear = throughDot < -0.72;
  if (paved.length === 2 && collinear) return null;

  const corner = paved.length === 2 || !collinear;
  const side = corner ? Math.max(widest + 2.4, widest * Math.SQRT2 + 0.4) : widest + 2.4;
  const throughEdgeIds = collinear && through ? [through[0].edge.id, through[1].edge.id] : [];
  const trim = {};
  for (const a of paved) {
    if (throughEdgeIds.includes(a.edge.id)) {
      trim[a.edge.id] = 0;
      continue;
    }
    const other = Math.max(...paved.filter((o) => o.edge.id !== a.edge.id).map((o) => o.width));
    trim[a.edge.id] = Math.max(0, other / 2 - 0.2);
  }

  return {
    kind: corner ? "corner" : "tee",
    side,
    yaw: Math.atan2(paved[0].dir.x, paved[0].dir.z),
    throughEdgeIds,
    trim,
    walkM: Math.max(0, ...paved.map((a) => roadClassSpec(a.edge.cls).sidewalkM || 0)),
  };
}

/** Local-space test: is (x,z) inside the junction plate, plus an optional skirt. */
export function pointInJunctionPad(node, pad, x, z, extra = 0) {
  if (!node || !pad) return false;
  const dx = x - node.x;
  const dz = z - node.z;
  const c = Math.cos(pad.yaw || 0);
  const s = Math.sin(pad.yaw || 0);
  const lx = dx * c + dz * s;
  const lz = -dx * s + dz * c;
  const h = pad.side / 2 + extra;
  return Math.abs(lx) <= h && Math.abs(lz) <= h;
}

/** Widest tarmac meeting a node — the junction pad has to cover all of it. */
export function junctionRadiusM(graph, node) {
  const pad = junctionPad(graph, node);
  if (pad) return pad.side / 2;
  let widest = 0;
  for (const e of graph.edges) {
    if (e.a !== node.id && e.b !== node.id) continue;
    widest = Math.max(widest, carriagewayWidthM(e.cls));
  }
  return widest ? widest / 2 + 1.2 : 0;
}

function cutEndAt(pts, node, trimM, head) {
  if (trimM <= 0.5 || pts.length < 3) return pts;
  const seq = head ? pts.slice() : pts.slice().reverse();
  let i = 0;
  while (i < seq.length && Math.hypot(seq[i].x - node.x, seq[i].z - node.z) < trimM) i += 1;
  if (i <= 0 || i >= seq.length) return pts;
  const inside = seq[i - 1];
  const outside = seq[i];
  const d0 = Math.hypot(inside.x - node.x, inside.z - node.z);
  const d1 = Math.hypot(outside.x - node.x, outside.z - node.z);
  const t = (trimM - d0) / (d1 - d0 || 1);
  const cut = { x: inside.x + (outside.x - inside.x) * t, z: inside.z + (outside.z - inside.z) * t };
  const next = [cut].concat(seq.slice(i));
  return head ? next : next.reverse();
}

/**
 * Draw-only: stop a ribbon at the junction plate. The graph still ends on the
 * node, so the taxi and the lots keep the real join.
 */
export function trimPolylineForPads(pts, graph, edge) {
  if (!graph || !edge || !pts || pts.length < 3) return pts;
  let out = pts;
  const a = nodeById(graph, edge.a);
  const b = nodeById(graph, edge.b);
  const padA = junctionPad(graph, a);
  const padB = junctionPad(graph, b);
  if (padA && a) out = cutEndAt(out, a, padA.trim[edge.id] || 0, true);
  if (padB && b) out = cutEndAt(out, b, padB.trim[edge.id] || 0, false);
  return out.length >= 2 ? out : pts;
}
