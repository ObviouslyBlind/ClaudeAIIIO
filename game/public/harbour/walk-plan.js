/**
 * Tap-to-walk planner. Land only. Brisk walk, not a taxi sprint.
 * PAPER / SIMULATED. Shared by the harbour client and unit tests.
 */

/** Brisk walk. 22 m/s was a vehicle. */
export const WALK_SPEED_MPS = 3.6;

/** Sample land every this many metres along a straight tap. */
export const WALK_SAMPLE_M = 4;

/** Coarse BFS cell. */
export const WALK_CELL_M = 8;

/** One tap will not send you across the island. */
export const WALK_RANGE_M = 180;

/** Extra metres of search around the tap segment when the straight line is wet. */
export const WALK_SEARCH_PAD_M = 72;

/** Metres from player.position down to the soles. Keep in sync with player.js. */
export const PLAYER_SOLE_M = 1.15;

/** One left-right stride cycle. Gait phase uses this. */
export const STRIDE_M = 1.4;

/** Keep in sync with game/src/walk.ts BEACH_THRESHOLD_M. */
export const WALK_BEACH_M = 0.25;

/** Dest pin stays after you arrive, then fades. */
export const WALK_HOLD_MS = 5000;

export function hypot2(ax, az, bx, bz) {
  return Math.hypot(bx - ax, bz - az);
}

export function clampWalkRange(fromX, fromZ, toX, toZ, rangeM = WALK_RANGE_M) {
  const d = hypot2(fromX, fromZ, toX, toZ);
  if (!(d > rangeM) || d < 1e-6) return { x: toX, z: toZ };
  const t = rangeM / d;
  return { x: fromX + (toX - fromX) * t, z: fromZ + (toZ - fromZ) * t };
}

export function samplesAlong(ax, az, bx, bz, stepM = WALK_SAMPLE_M) {
  const d = hypot2(ax, az, bx, bz);
  if (d < 1e-6) return [{ x: ax, z: az }];
  const n = Math.max(1, Math.ceil(d / stepM));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push({ x: ax + (bx - ax) * t, z: az + (bz - az) * t });
  }
  return pts;
}

export function walkableAlong(ax, az, bx, bz, canWalkAt, stepM = WALK_SAMPLE_M) {
  const pts = samplesAlong(ax, az, bx, bz, stepM);
  for (const p of pts) {
    if (!canWalkAt(p.x, p.z)) return false;
  }
  return true;
}

function cellOf(x, z, cellM = WALK_CELL_M) {
  return { ix: Math.round(x / cellM), iz: Math.round(z / cellM) };
}

function cellWorld(ix, iz, cellM = WALK_CELL_M) {
  return { x: ix * cellM, z: iz * cellM };
}

function keyOf(ix, iz) {
  return ix + ":" + iz;
}

/**
 * Snap a wet tap onto nearby land (one or two cells). Null if the shore is further.
 */
export function snapToLand(x, z, canWalkAt, cellM = WALK_CELL_M) {
  if (canWalkAt(x, z)) return { x, z };
  let best = null;
  let bestD = Infinity;
  const c = cellOf(x, z, cellM);
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      const p = cellWorld(c.ix + dx, c.iz + dz, cellM);
      if (!canWalkAt(p.x, p.z)) continue;
      const d = hypot2(x, z, p.x, p.z);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
  }
  return best;
}

function simplifyPath(pts, canWalkAt) {
  if (pts.length <= 2) return pts.slice();
  const out = [pts[0]];
  let i = 0;
  while (i < pts.length - 1) {
    let j = pts.length - 1;
    while (j > i + 1 && !walkableAlong(pts[i].x, pts[i].z, pts[j].x, pts[j].z, canWalkAt)) {
      j--;
    }
    out.push(pts[j]);
    i = j;
  }
  return out;
}

function bfsLand(fromX, fromZ, toX, toZ, canWalkAt) {
  const cellM = WALK_CELL_M;
  const start = cellOf(fromX, fromZ, cellM);
  const goal = cellOf(toX, toZ, cellM);
  const minX = Math.min(fromX, toX) - WALK_SEARCH_PAD_M;
  const maxX = Math.max(fromX, toX) + WALK_SEARCH_PAD_M;
  const minZ = Math.min(fromZ, toZ) - WALK_SEARCH_PAD_M;
  const maxZ = Math.max(fromZ, toZ) + WALK_SEARCH_PAD_M;
  const ix0 = Math.floor(minX / cellM);
  const ix1 = Math.ceil(maxX / cellM);
  const iz0 = Math.floor(minZ / cellM);
  const iz1 = Math.ceil(maxZ / cellM);
  const walkCell = (ix, iz) => {
    if (ix < ix0 || ix > ix1 || iz < iz0 || iz > iz1) return false;
    const p = cellWorld(ix, iz, cellM);
    return canWalkAt(p.x, p.z);
  };
  if (!walkCell(start.ix, start.iz) || !walkCell(goal.ix, goal.iz)) return null;

  const startKey = keyOf(start.ix, start.iz);
  const goalKey = keyOf(goal.ix, goal.iz);
  if (startKey === goalKey) return [{ x: fromX, z: fromZ }, { x: toX, z: toZ }];

  const came = new Map();
  const dist = new Map();
  dist.set(startKey, 0);
  const q = [{ ix: start.ix, iz: start.iz }];
  const nbr = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  let found = false;
  let guard = 0;
  while (q.length && guard++ < 4000) {
    const cur = q.shift();
    const ck = keyOf(cur.ix, cur.iz);
    if (ck === goalKey) {
      found = true;
      break;
    }
    const cd = dist.get(ck) ?? 0;
    for (const [dx, dz] of nbr) {
      const nx = cur.ix + dx;
      const nz = cur.iz + dz;
      if (!walkCell(nx, nz)) continue;
      const nk = keyOf(nx, nz);
      const step = dx !== 0 && dz !== 0 ? 1.414 : 1;
      const nd = cd + step;
      if (dist.has(nk) && dist.get(nk) <= nd) continue;
      dist.set(nk, nd);
      came.set(nk, ck);
      q.push({ ix: nx, iz: nz });
    }
  }
  if (!found) return null;

  const cells = [];
  let k = goalKey;
  while (k) {
    const parts = k.split(":");
    cells.push({ ix: Number(parts[0]), iz: Number(parts[1]) });
    k = came.get(k);
  }
  cells.reverse();
  const pts = [{ x: fromX, z: fromZ }];
  for (let i = 1; i < cells.length - 1; i++) {
    pts.push(cellWorld(cells[i].ix, cells[i].iz, cellM));
  }
  pts.push({ x: toX, z: toZ });
  return simplifyPath(pts, canWalkAt);
}

/**
 * Waypoints from here to the tap, on land. Null if the tap is water with no nearby shore,
 * or if no land path exists inside the search box.
 */
export function planWalk(fromX, fromZ, toX, toZ, canWalkAt) {
  if (!canWalkAt || typeof canWalkAt !== "function") return null;
  const capped = clampWalkRange(fromX, fromZ, toX, toZ);
  const dest = snapToLand(capped.x, capped.z, canWalkAt);
  if (!dest) return null;
  if (hypot2(fromX, fromZ, dest.x, dest.z) < 0.35) return null;
  if (walkableAlong(fromX, fromZ, dest.x, dest.z, canWalkAt)) {
    return [
      { x: fromX, z: fromZ },
      { x: dest.x, z: dest.z },
    ];
  }
  return bfsLand(fromX, fromZ, dest.x, dest.z, canWalkAt);
}

/**
 * Step along remaining waypoints. `path` is the remaining targets (not including current pos).
 */
export function advanceAlong(x, z, path, dt, speed = WALK_SPEED_MPS) {
  const step = Math.max(0, Number(speed) || 0) * Math.max(0, Number(dt) || 0);
  const pts = Array.isArray(path) ? path.slice() : [];
  if (!pts.length || step <= 0) {
    return { x, z, path: pts, done: pts.length === 0, moved: 0 };
  }
  let px = x;
  let pz = z;
  let remain = step;
  while (pts.length && remain > 0) {
    const t = pts[0];
    const d = hypot2(px, pz, t.x, t.z);
    if (d <= remain || d < 1e-4) {
      remain -= d;
      px = t.x;
      pz = t.z;
      pts.shift();
      continue;
    }
    px += ((t.x - px) / d) * remain;
    pz += ((t.z - pz) / d) * remain;
    remain = 0;
  }
  return {
    x: px,
    z: pz,
    path: pts,
    done: pts.length === 0,
    moved: step - remain,
  };
}

export function gaitPhase(distM, strideM = STRIDE_M) {
  const s = strideM > 0 ? strideM : STRIDE_M;
  return (Number(distM) || 0) * (Math.PI / s);
}

export function faceYaw(dx, dz) {
  if (Math.hypot(dx, dz) < 1e-6) return 0;
  return Math.atan2(dx, dz);
}
