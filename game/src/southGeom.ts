/**
 * South island land geometry (metres). Fictional. Not OSM / Earth.
 *
 * Left of spawn looking inland is −X (west). The port sits on the west
 * channel shore. Island Hwy runs east with slight bends, north of the volcano,
 * and meets the east coast. North island is unchanged.
 */

export type XZ = { x: number; z: number };

/** West / left-hand channel quay. Keep in sync with ISLANDS.south.port. */
export const SOUTH_PORT: XZ = { x: -2280, z: 7280 };
/** Blocks the middle. Highway goes around on the channel side. */
export const SOUTH_VOLCANO: XZ = { x: 220, z: 9480 };

export const VOLCANO_R = 780;
export const VOLCANO_CRATER_R = 72;
export const VOLCANO_RIM_R = 125;
export const HIGHWAY_CLEAR_M = 16;
export const SOUTH_MIN_LOT_M2 = 120;
export const SOUTH_MAX_LOT_M2 = 9000;

/** Spawn on the quay, a few metres inland along the highway (+X). */
export function southSpawnPad(): XZ {
  return { x: SOUTH_PORT.x + 10, z: SOUTH_PORT.z };
}

export const SOUTH_RAB = {
  harbour: { x: -2080, z: 7440, name: "Harbour Circus" },
  west: { x: -980, z: 7680, name: "Cane Circus" },
  pass: { x: 1320, z: 7860, name: "Ash Circus" },
  east: { x: 2480, z: 7980, name: "Haven Circus" },
} as const;

export type SouthTownId = "quayward" | "canebrake" | "saltwind" | "ash-pass" | "east-haven";

export type SouthTown = {
  id: SouthTownId;
  name: string;
  x: number;
  z: number;
  side: "west" | "east";
  /** Short drive off the highway vs a real inland trip. */
  access: "highway" | "inland";
};

/**
 * Three west of the volcano, two east. Staggered: one town hugs the highway,
 * the next is a drive inland. No buildings — these are centres only.
 */
export const SOUTH_TOWNS: readonly SouthTown[] = [
  { id: "quayward", name: "Quayward", x: -1960, z: 7620, side: "west", access: "highway" },
  { id: "canebrake", name: "Canebrake", x: -1080, z: 8720, side: "west", access: "inland" },
  { id: "saltwind", name: "Saltwind", x: -1860, z: 10020, side: "west", access: "inland" },
  { id: "ash-pass", name: "Ash Pass", x: 1480, z: 8080, side: "east", access: "highway" },
  { id: "east-haven", name: "East Haven", x: 2520, z: 9120, side: "east", access: "inland" },
];

/** West quay → east coast. Slight left/right bends. North of the volcano. */
export const SOUTH_HIGHWAY_NODES: XZ[] = [
  SOUTH_PORT,
  SOUTH_RAB.harbour,
  { x: -1520, z: 7560 },
  SOUTH_RAB.west,
  { x: -240, z: 7840 },
  { x: 480, z: 7960 },
  SOUTH_RAB.pass,
  { x: 1920, z: 7780 },
  SOUTH_RAB.east,
  { x: 2920, z: 7860 },
];

export function distToSegment(p: XZ, a: XZ, b: XZ): number {
  const vx = b.x - a.x;
  const vz = b.z - a.z;
  const len2 = vx * vx + vz * vz || 1;
  let t = ((p.x - a.x) * vx + (p.z - a.z) * vz) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + vx * t), p.z - (a.z + vz * t));
}

export function distToPolyline(pts: XZ[], x: number, z: number): number {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    best = Math.min(best, distToSegment({ x, z }, pts[i]!, pts[i + 1]!));
  }
  return best;
}

export function distToHighway(x: number, z: number): number {
  return distToPolyline(SOUTH_HIGHWAY_NODES, x, z);
}

export function volcanoDist(x: number, z: number): number {
  return Math.hypot(x - SOUTH_VOLCANO.x, z - SOUTH_VOLCANO.z);
}

export function inVolcanoExclusion(x: number, z: number, pad = 40): boolean {
  return volcanoDist(x, z) < VOLCANO_R + pad;
}

export function circlePolyline(c: XZ, radius: number, n = 24): XZ[] {
  const pts: XZ[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push({ x: c.x + Math.cos(a) * radius, z: c.z + Math.sin(a) * radius });
  }
  return pts;
}

function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

export function sampleSpline(nodes: XZ[], perSeg = 8): XZ[] {
  if (nodes.length < 2) return nodes.slice();
  const out: XZ[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const p0 = nodes[Math.max(0, i - 1)]!;
    const p1 = nodes[i]!;
    const p2 = nodes[i + 1]!;
    const p3 = nodes[Math.min(nodes.length - 1, i + 2)]!;
    const n = i === nodes.length - 2 ? perSeg : perSeg - 1;
    for (let s = 0; s <= n; s++) {
      const t = s / perSeg;
      out.push({
        x: catmull(p0.x, p1.x, p2.x, p3.x, t),
        z: catmull(p0.z, p1.z, p2.z, p3.z, t),
      });
    }
  }
  return out;
}

export function linePoints(a: XZ, b: XZ, n = 6): XZ[] {
  const pts: XZ[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
  }
  return pts;
}

export function wiggleLine(a: XZ, b: XZ, n: number, amp: number, seed: number): XZ[] {
  const pts: XZ[] = [];
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  const px = -dz / len;
  const pz = dx / len;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const w = i === 0 || i === n ? 0 : Math.sin(t * Math.PI * (1.4 + (seed % 5) * 0.2) + seed) * amp;
    pts.push({ x: a.x + dx * t + px * w, z: a.z + dz * t + pz * w });
  }
  return pts;
}
