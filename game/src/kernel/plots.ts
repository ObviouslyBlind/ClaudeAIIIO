/**
 * Plot index: unique ids, no overlapping rings, 64 m interest cells.
 * Works on plot-like records. Does not author the islands.
 */

export const PLOT_CELL_M = 64;

export type Ring = [number, number][];

export type PlotLike = {
  id: string;
  island: string;
  x: number;
  z: number;
  ring: Ring;
};

export type BBox = { minX: number; maxX: number; minZ: number; maxZ: number };

export type PlotIndex = {
  cellSize: number;
  byId: Map<string, PlotLike>;
  cells: Map<string, Set<string>>;
};

export function ringBBox(ring: Ring): BBox {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const [x, z] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  return { minX, maxX, minZ, maxZ };
}

export function bboxOverlap(a: BBox, b: BBox): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
}

function orient(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  cx: number,
  cz: number,
): number {
  return (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
}

function edgesCross(a1: Ring[number], a2: Ring[number], b1: Ring[number], b2: Ring[number]): boolean {
  const o1 = orient(a1[0], a1[1], a2[0], a2[1], b1[0], b1[1]);
  const o2 = orient(a1[0], a1[1], a2[0], a2[1], b2[0], b2[1]);
  const o3 = orient(b1[0], b1[1], b2[0], b2[1], a1[0], a1[1]);
  const o4 = orient(b1[0], b1[1], b2[0], b2[1], a2[0], a2[1]);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

export function pointInRing(x: number, z: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i];
    const [xj, zj] = ring[j];
    const hit = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-9) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

/** Interior overlap only. Shared edges of adjacent lots are allowed. */
export function ringsOverlap(a: Ring, b: Ring): boolean {
  if (!bboxOverlap(ringBBox(a), ringBBox(b))) return false;
  const ca = ringCentroid(a);
  const cb = ringCentroid(b);
  if (pointInRing(ca.x, ca.z, b) || pointInRing(cb.x, cb.z, a)) return true;
  for (const [x, z] of a) {
    if (pointInRing(x, z, b)) return true;
  }
  for (const [x, z] of b) {
    if (pointInRing(x, z, a)) return true;
  }
  for (let i = 0; i < a.length; i++) {
    const a1 = a[i];
    const a2 = a[(i + 1) % a.length];
    for (let k = 0; k < b.length; k++) {
      if (edgesCross(a1, a2, b[k], b[(k + 1) % b.length])) return true;
    }
  }
  return false;
}

export function ringCentroid(ring: Ring): { x: number; z: number } {
  let x = 0;
  let z = 0;
  for (const p of ring) {
    x += p[0];
    z += p[1];
  }
  const n = ring.length || 1;
  return { x: x / n, z: z / n };
}

export function uniquePlotIds(plots: { id: string }[]): boolean {
  const seen = new Set<string>();
  for (const p of plots) {
    if (!p.id || seen.has(p.id)) return false;
    seen.add(p.id);
  }
  return true;
}

export function overlappingPairs(plots: PlotLike[]): [string, string][] {
  const pairs: [string, string][] = [];
  for (let i = 0; i < plots.length; i++) {
    const a = plots[i];
    const boxA = ringBBox(a.ring);
    for (let j = i + 1; j < plots.length; j++) {
      const b = plots[j];
      if (a.island !== b.island) continue;
      if (!bboxOverlap(boxA, ringBBox(b.ring))) continue;
      if (ringsOverlap(a.ring, b.ring)) pairs.push([a.id, b.id]);
    }
  }
  return pairs;
}

function cellIndex(n: number, cellSize = PLOT_CELL_M): number {
  return Math.floor(n / cellSize);
}

export function plotCellKey(
  island: string,
  x: number,
  z: number,
  cellSize = PLOT_CELL_M,
): string {
  return `${island}:${cellIndex(x, cellSize)}:${cellIndex(z, cellSize)}`;
}

export function indexPlots(plots: PlotLike[], cellSize = PLOT_CELL_M): PlotIndex {
  const byId = new Map<string, PlotLike>();
  const cells = new Map<string, Set<string>>();
  for (const p of plots) {
    byId.set(p.id, p);
    const key = plotCellKey(p.island, p.x, p.z, cellSize);
    let bucket = cells.get(key);
    if (!bucket) {
      bucket = new Set();
      cells.set(key, bucket);
    }
    bucket.add(p.id);
  }
  return { cellSize, byId, cells };
}

/**
 * Plots whose centroids sit in the query cell plus neighbour rings.
 * Radius 0 still includes the home cell.
 */
export function plotsNear(
  index: PlotIndex,
  island: string,
  x: number,
  z: number,
  radius = PLOT_CELL_M,
): PlotLike[] {
  const size = index.cellSize;
  const ring = Math.max(0, Math.ceil(Math.max(0, radius) / size));
  const cx = cellIndex(x, size);
  const cz = cellIndex(z, size);
  const out: PlotLike[] = [];
  const seen = new Set<string>();
  for (let dx = -ring; dx <= ring; dx++) {
    for (let dz = -ring; dz <= ring; dz++) {
      const bucket = index.cells.get(`${island}:${cx + dx}:${cz + dz}`);
      if (!bucket) continue;
      for (const id of bucket) {
        if (seen.has(id)) continue;
        seen.add(id);
        const plot = index.byId.get(id);
        if (plot) out.push(plot);
      }
    }
  }
  return out;
}
