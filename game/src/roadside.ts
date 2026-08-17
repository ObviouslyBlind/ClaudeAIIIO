/**
 * Roadside drop: van stops on the carriageway, crate sits on the verge.
 * PAPER / SIMULATED. Shared by the first-loop order and the harbour van.
 */

import type { IslandId, Road } from "./land.ts";

/** Metres from road centreline onto the grass lip (paved half-width ~3.6). */
export const SHOULDER_M = 5.6;
/** Metres the van keeps driving after the drop. */
export const DRIVE_AWAY_M = 110;

export type DropPoint = {
  curbX: number;
  curbZ: number;
  x: number;
  z: number;
  awayX: number;
  awayZ: number;
  roadName: string;
  island: IslandId;
};

function projectOnPolyline(
  points: { x: number; z: number }[],
  x: number,
  z: number,
): { x: number; z: number; i: number; t: number; dist: number; along: number } {
  let best = { x, z, i: 0, t: 0, dist: Infinity, along: 0 };
  let acc = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const vx = b.x - a.x;
    const vz = b.z - a.z;
    const len2 = vx * vx + vz * vz || 1;
    const len = Math.sqrt(len2);
    let t = ((x - a.x) * vx + (z - a.z) * vz) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = a.x + vx * t;
    const pz = a.z + vz * t;
    const dist = Math.hypot(x - px, z - pz);
    if (dist < best.dist) {
      best = { x: px, z: pz, i, t, dist, along: acc + t * len };
    }
    acc += len;
  }
  return best;
}

function pointAhead(
  points: { x: number; z: number }[],
  fromAlong: number,
  extra: number,
): { x: number; z: number } {
  const last = points[points.length - 1]!;
  let target = fromAlong + extra;
  let acc = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (len < 1e-4) continue;
    if (acc + len >= target) {
      const t = (target - acc) / len;
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
    }
    acc += len;
  }
  if (extra > 0 && fromAlong - extra > 4) {
    return pointAhead(points, fromAlong, -extra);
  }
  return { x: last.x, z: last.z };
}

/** Nearest paved road to a plot. Crate on the plot side of the kerb. */
export function roadsideDrop(
  roads: Road[],
  island: IslandId,
  x: number,
  z: number,
): DropPoint | null {
  let best: { road: Road; hit: ReturnType<typeof projectOnPolyline> } | null = null;
  for (const road of roads) {
    if (road.island !== island || road.kind !== "paved" || (road.points?.length ?? 0) < 2) continue;
    const hit = projectOnPolyline(road.points, x, z);
    if (!best || hit.dist < best.hit.dist) best = { road, hit };
  }
  if (!best) return null;
  const pts = best.road.points;
  const a = pts[best.hit.i]!;
  const b = pts[Math.min(best.hit.i + 1, pts.length - 1)]!;
  const tx = b.x - a.x;
  const tz = b.z - a.z;
  const tlen = Math.hypot(tx, tz) || 1;
  let rx = tz / tlen;
  let rz = -tx / tlen;
  const toward = (best.hit.x + rx * SHOULDER_M - x) ** 2 + (best.hit.z + rz * SHOULDER_M - z) ** 2;
  const away = (best.hit.x - rx * SHOULDER_M - x) ** 2 + (best.hit.z - rz * SHOULDER_M - z) ** 2;
  if (away < toward) {
    rx = -rx;
    rz = -rz;
  }
  const ahead = pointAhead(pts, best.hit.along, DRIVE_AWAY_M);
  return {
    curbX: best.hit.x,
    curbZ: best.hit.z,
    x: best.hit.x + rx * SHOULDER_M,
    z: best.hit.z + rz * SHOULDER_M,
    awayX: ahead.x,
    awayZ: ahead.z,
    roadName: best.road.name || "Harbour Rd",
    island,
  };
}
