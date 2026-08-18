/**
 * Junction hubs: buffer the last metres of each arm and union those
 * 2–4 rectangles. That is a T or an L. It is not the whole island.
 *
 * Island-wide union filled greens and merged nearby streets into a splat.
 * Ribbons still draw the runs. Hubs only exist at joins.
 */
import polygonClipping from "./vendor/polygon-clipping.js";
import { carriagewayWidthM, roadClassSpec } from "./roadclass.js";

/** Keep in sync with SHOULDER_PAD_M in roads.js. */
export const FOOT_SHOULDER_M = 2.2;

function clsOf(road) {
  if (road.cls) return road.cls;
  if (road.kind === "dirt") return "track";
  if (road.lanes === 4) return "highway";
  if (/Harbour Rd/.test(road.name || "")) return "avenue";
  return "street";
}

export function isNetworkRoad(road) {
  return !!road && road.kind === "paved" && !road.roundabout && road.lanes !== 4;
}

function closeRing(ring) {
  if (!ring.length) return ring;
  const a = ring[0];
  const b = ring[ring.length - 1];
  if (a[0] === b[0] && a[1] === b[1]) return ring;
  return ring.concat([[a[0], a[1]]]);
}

function snap(n) {
  return Math.round(n * 50) / 50;
}

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

/** Square-capped at the junction end only. The far end must not eat a block of kerb. */
export function segmentRing(a, b, half) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  const tx = dx / len;
  const tz = dz / len;
  const rx = tz * half;
  const rz = -tx * half;
  const ax = a.x - tx * half;
  const az = a.z - tz * half;
  const bx = b.x + tx * 0.2;
  const bz = b.z + tz * 0.2;
  return closeRing([
    [snap(ax + rx), snap(az + rz)],
    [snap(ax - rx), snap(az - rz)],
    [snap(bx - rx), snap(bz - rz)],
    [snap(bx + rx), snap(bz + rz)],
  ]);
}

export function unionGeoms(geoms) {
  if (!geoms.length) return [];
  if (geoms.length === 1) return [geoms[0]];
  let acc = [geoms[0]];
  for (let i = 1; i < geoms.length; i++) {
    acc = polygonClipping.union(acc, geoms[i]);
  }
  return acc;
}

export function ringContains(ring, x, z) {
  let inside = false;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i][0];
    const zi = ring[i][1];
    const xj = ring[j][0];
    const zj = ring[j][1];
    if (zi === zj) continue;
    const hit = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

export function multiContains(mp, x, z) {
  if (!mp) return false;
  for (const poly of mp) {
    if (!poly[0] || !ringContains(poly[0], x, z)) continue;
    let inHole = false;
    for (let h = 1; h < poly.length; h++) {
      if (ringContains(poly[h], x, z)) inHole = true;
    }
    if (!inHole) return true;
  }
  return false;
}

/**
 * Keep the parts of a polyline that sit outside `insideFn`.
 * Crossing segments are cut on the boundary so a kerb meets the hub
 * instead of stopping a densify-step short (the grey hairline).
 */
export function clipPolylineToOutside(pts, insideFn) {
  if (!pts || pts.length < 2 || !insideFn) return pts || [];
  const runs = [];
  let run = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const inn = insideFn(p.x, p.z);
    if (inn) {
      if (run.length) {
        const cut = boundaryPoint(run[run.length - 1], p, insideFn);
        if (cut) run.push(cut);
        if (run.length >= 2) runs.push(run);
        run = [];
      }
    } else {
      if (!run.length && i > 0 && insideFn(pts[i - 1].x, pts[i - 1].z)) {
        const cut = boundaryPoint(pts[i - 1], p, insideFn);
        if (cut) run.push(cut);
      }
      run.push(p);
    }
  }
  if (run.length >= 2) runs.push(run);
  return runs;
}

function boundaryPoint(insidePt, outsidePt, insideFn) {
  let a = insidePt;
  let b = outsidePt;
  if (!insideFn(a.x, a.z) && insideFn(b.x, b.z)) {
    a = outsidePt;
    b = insidePt;
  }
  if (!insideFn(a.x, a.z)) return { x: b.x, z: b.z };
  let cut = { x: b.x, z: b.z };
  for (let k = 0; k < 12; k++) {
    const t = 0.5;
    const p = { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
    if (insideFn(p.x, p.z)) a = p;
    else {
      cut = p;
      b = p;
    }
  }
  return cut;
}

/**
 * Union of the arm-end rectangles at one node. 2–4 rects. Not the island.
 * Dual highway arms use the full carriageway (both lanes + median), not one lane.
 */
export function buildHubFootprint(graph, node, pad) {
  const tarmac = [];
  const grit = [];
  const walk = [];
  if (!graph || !node || !pad) return { tarmac: [], shoulder: [], sidewalk: [] };
  const along = pad.side / 2 + 1.2;
  for (const e of graph.edges) {
    if (e.a !== node.id && e.b !== node.id) continue;
    if (!e.points || e.points.length < 2) continue;
    const spec = roadClassSpec(e.cls);
    if (spec.dirt) continue;
    const dir = armDir(node, e);
    const far = { x: node.x + dir.x * along, z: node.z + dir.z * along };
    const origin = { x: node.x, z: node.z };
    const half = carriagewayWidthM(e.cls) / 2;
    tarmac.push([segmentRing(origin, far, half)]);
    grit.push([segmentRing(origin, far, half + FOOT_SHOULDER_M / 2)]);
    if (spec.sidewalkM > 0) {
      walk.push([segmentRing(origin, far, half + FOOT_SHOULDER_M / 2 + spec.sidewalkM)]);
    }
  }
  return {
    tarmac: unionGeoms(tarmac),
    shoulder: unionGeoms(grit),
    sidewalk: unionGeoms(walk),
  };
}

export { clsOf };
