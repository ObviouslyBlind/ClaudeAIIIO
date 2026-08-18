/**
 * Road footprints: buffer each centreline segment, boolean-union the lot.
 *
 * Overlapping ribbons at a T are two rectangles drawn on top of each other.
 * Union of those rectangles is one T-shaped polygon. That is the join.
 *
 * Clipper/Martinez lives in ./vendor/polygon-clipping.js (Angus Johnson /
 * Martinez–Rueda–Feito). Graph + taxi are unchanged.
 */
import polygonClipping from "./vendor/polygon-clipping.js";
import { roadClassSpec } from "./roadclass.js";

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

/** Square-capped rectangle for one centreline segment, GeoJSON ring.
 *  Ends extend by `half` so a 90° L's outer corner is a square and the
 *  node sits inside the tarmac, not on the outline. */
export function segmentRing(a, b, half) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  const tx = (dx / len) * half;
  const tz = (dz / len) * half;
  const rx = (dz / len) * half;
  const rz = (-dx / len) * half;
  const ax = a.x - tx;
  const az = a.z - tz;
  const bx = b.x + tx;
  const bz = b.z + tz;
  return closeRing([
    [snap(ax + rx), snap(az + rz)],
    [snap(ax - rx), snap(az - rz)],
    [snap(bx - rx), snap(bz - rz)],
    [snap(bx + rx), snap(bz + rz)],
  ]);
}

export function polylineRings(points, half) {
  const out = [];
  if (!points || points.length < 2) return out;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (Math.hypot(b.x - a.x, b.z - a.z) < 0.25) continue;
    out.push([segmentRing(a, b, half)]);
  }
  return out;
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

export function differenceGeoms(subject, clip) {
  if (!subject.length) return [];
  if (!clip.length) return subject;
  return polygonClipping.difference(subject, clip);
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

/** Point-in-multipolygon, holes respected. */
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

function halfFor(road, extra) {
  return roadClassSpec(clsOf(road)).carriageM / 2 + extra;
}

export function buildIslandFootprints(roads) {
  const tarmac = [];
  const grit = [];
  const walk = [];
  for (const road of roads) {
    if (!isNetworkRoad(road) || !road.points) continue;
    const spec = roadClassSpec(clsOf(road));
    tarmac.push(...polylineRings(road.points, spec.carriageM / 2));
    grit.push(...polylineRings(road.points, spec.carriageM / 2 + FOOT_SHOULDER_M / 2));
    if (spec.sidewalkM > 0) {
      walk.push(
        ...polylineRings(road.points, spec.carriageM / 2 + FOOT_SHOULDER_M / 2 + spec.sidewalkM),
      );
    }
  }
  const tarmacU = unionGeoms(tarmac);
  const gritU = unionGeoms(grit);
  const walkU = unionGeoms(walk);
  // Draw walk, then grit, then tarmac. Difference is what crashes Martinez on
  // this network; stacking the unions is the same picture from above.
  return {
    tarmac: tarmacU,
    shoulder: gritU,
    sidewalk: walkU,
  };
}

export { halfFor, clsOf };
