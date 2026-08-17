/**
 * Roadside drop: van stops on the carriageway, crate sits on the verge.
 * Keep in sync with game/src/roadside.ts
 */

import { pathAlongPolyline, projectOnPolyline } from "./taxi.js";

export const SHOULDER_M = 5.6;
export const DRIVE_AWAY_M = 110;

function pointAhead(points, fromAlong, extra) {
  const last = points[points.length - 1];
  let target = fromAlong + extra;
  let acc = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (len < 1e-4) continue;
    if (acc + len >= target) {
      const t = (target - acc) / len;
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
    }
    acc += len;
  }
  if (extra > 0 && fromAlong - extra > 4) return pointAhead(points, fromAlong, -extra);
  return { x: last.x, z: last.z };
}

/** Nearest paved road to a plot. Crate on the plot side of the kerb. */
export function roadsideDrop(roads, island, x, z) {
  let best = null;
  for (const road of roads || []) {
    if (road.island !== island || road.kind !== "paved" || !road.points || road.points.length < 2) {
      continue;
    }
    const hit = projectOnPolyline(road.points, x, z);
    if (!best || hit.dist < best.hit.dist) best = { road, hit };
  }
  if (!best) return null;
  const pts = best.road.points;
  const a = pts[best.hit.i];
  const b = pts[Math.min(best.hit.i + 1, pts.length - 1)];
  const tx = b.x - a.x;
  const tz = b.z - a.z;
  const tlen = Math.hypot(tx, tz) || 1;
  let rx = tz / tlen;
  let rz = -tx / tlen;
  const toward =
    (best.hit.x + rx * SHOULDER_M - x) ** 2 + (best.hit.z + rz * SHOULDER_M - z) ** 2;
  const other =
    (best.hit.x - rx * SHOULDER_M - x) ** 2 + (best.hit.z - rz * SHOULDER_M - z) ** 2;
  if (other < toward) {
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
    road: best.road,
  };
}

export function vanAwayPath(drop) {
  if (!drop || !drop.road || !drop.road.points) return [{ x: drop.awayX, z: drop.awayZ }];
  const path = pathAlongPolyline(drop.road.points, drop.curbX, drop.curbZ, drop.awayX, drop.awayZ);
  return path.length >= 2 ? path : [{ x: drop.curbX, z: drop.curbZ }, { x: drop.awayX, z: drop.awayZ }];
}
