import {
  BUILDING_CATALOG,
  DEVELOP_COST,
  isLandUse,
  paperCostFor,
  type LandUseId,
} from "./buildings.ts";
import type { Visitor } from "./sim.ts";

export { BUILDING_CATALOG, DEVELOP_COST };
export type { LandUseId };

export type IslandId = "north" | "south";
export type PlotBand = "shore" | "street" | "field";
export type PlotClass = "by_right" | "reserved";
export type LandUse = LandUseId | null;
export type Ring = [number, number][];

/** Metres. Origin is the channel midpoint. +Z is south. */
export type IslandSpec = {
  id: IslandId;
  name: string;
  cx: number;
  cz: number;
  rx: number;
  rz: number;
  peak: number;
  port: { x: number; z: number };
  hill: { x: number; z: number };
};

export type Parcel = {
  id: string;
  island: IslandId;
  ring: Ring;
  x: number;
  z: number;
  area: number;
  band: PlotBand;
  class: PlotClass;
  price: number;
  owner: string | null;
  use: LandUse;
};

export type Road = {
  island: IslandId;
  kind: "paved" | "dirt";
  points: { x: number; z: number }[];
  /** Spline control points. Paved only. Traffic and taxi follow `points`. */
  nodes?: { x: number; z: number }[];
};

export type LandBoard = {
  plots: Parcel[];
  roads: Road[];
};

/**
 * Inhabited Caribbean island scale, not a pocket cay.
 * Each ellipse is about 8.0 km east-west by 4.4 km north-south.
 * Centres sit 18 km apart so the channel stays a crossing, not a ditch.
 */
export const ISLANDS: Record<IslandId, IslandSpec> = {
  north: {
    id: "north",
    name: "North",
    cx: 0,
    cz: -9000,
    rx: 4000,
    rz: 2200,
    peak: 140,
    port: { x: 0, z: -6950 },
    hill: { x: -900, z: -10200 },
  },
  south: {
    id: "south",
    name: "South",
    cx: 0,
    cz: 9000,
    rx: 4000,
    rz: 2200,
    peak: 110,
    port: { x: 0, z: 6950 },
    hill: { x: 900, z: 10200 },
  },
};

/** Half-width of the paved carriageway plus a grass verge, metres. */
export const ROAD_CLEAR = 11;

function inlandSign(spec: IslandSpec): number {
  return spec.id === "north" ? -1 : 1;
}

function hash(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function roadNodes(spec: IslandSpec): { x: number; z: number }[] {
  const s = inlandSign(spec);
  const p = spec.port;
  return [
    { x: p.x, z: p.z + s * 50 },
    { x: p.x + 160, z: p.z + s * 720 },
    { x: p.x - 220, z: p.z + s * 1480 },
    { x: p.x + 280, z: p.z + s * 2280 },
    { x: p.x - 90, z: p.z + s * 3180 },
  ];
}

function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

function sampleSpline(nodes: { x: number; z: number }[], perSeg = 8): { x: number; z: number }[] {
  if (nodes.length < 2) return nodes.slice();
  const out: { x: number; z: number }[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const p0 = nodes[Math.max(0, i - 1)];
    const p1 = nodes[i];
    const p2 = nodes[i + 1];
    const p3 = nodes[Math.min(nodes.length - 1, i + 2)];
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

export function pavedPolyline(spec: IslandSpec): { x: number; z: number }[] {
  return sampleSpline(roadNodes(spec), 8);
}

export function roadPoint(spec: IslandSpec, t: number): { x: number; z: number } {
  const pts = pavedPolyline(spec);
  const clamped = Math.max(0, Math.min(1, t));
  const f = clamped * (pts.length - 1);
  const i = Math.min(pts.length - 2, Math.floor(f));
  const u = f - i;
  return {
    x: pts[i].x + (pts[i + 1].x - pts[i].x) * u,
    z: pts[i].z + (pts[i + 1].z - pts[i].z) * u,
  };
}

export function distToSegment(
  p: { x: number; z: number },
  a: { x: number; z: number },
  b: { x: number; z: number },
): number {
  const vx = b.x - a.x;
  const vz = b.z - a.z;
  const len2 = vx * vx + vz * vz || 1;
  let t = ((p.x - a.x) * vx + (p.z - a.z) * vz) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + vx * t), p.z - (a.z + vz * t));
}

export function distToPaved(spec: IslandSpec, x: number, z: number): number {
  const pts = pavedPolyline(spec);
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    best = Math.min(best, distToSegment({ x, z }, pts[i], pts[i + 1]));
  }
  return best;
}

function ringHitsPaved(spec: IslandSpec, ring: Ring): boolean {
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(2, Math.ceil(len / 2));
    for (let s = 0; s <= n; s++) {
      const t = s / n;
      const x = a[0] + (b[0] - a[0]) * t;
      const z = a[1] + (b[1] - a[1]) * t;
      if (distToPaved(spec, x, z) < ROAD_CLEAR) return true;
    }
  }
  for (const p of pavedPolyline(spec)) {
    if (pointInRing(p.x, p.z, ring)) return true;
  }
  return false;
}

function ringArea(ring: Ring): number {
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, z1] = ring[i];
    const [x2, z2] = ring[(i + 1) % ring.length];
    a += x1 * z2 - x2 * z1;
  }
  return Math.abs(a) / 2;
}

function ringCentroid(ring: Ring): { x: number; z: number } {
  let x = 0;
  let z = 0;
  for (const p of ring) {
    x += p[0];
    z += p[1];
  }
  return { x: x / ring.length, z: z / ring.length };
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

/** Standing on the dirt counts, not only within 22 m of the centroid. */
export function standingOnParcel(
  x: number,
  z: number,
  plot: { x: number; z: number; ring: Ring },
  centroidReachM = 22,
): boolean {
  if (pointInRing(x, z, plot.ring)) return true;
  return Math.hypot(x - plot.x, z - plot.z) < centroidReachM;
}

function publicQuay(spec: IslandSpec, x: number, z: number): boolean {
  const along = (z - spec.port.z) * (spec.id === "north" ? 1 : -1);
  const across = Math.abs(x - spec.port.x);
  return across < 18 && along > -28 && along < 92;
}

function priceOf(spec: IslandSpec, area: number, band: PlotBand, portDist: number): number {
  const rate = spec.id === "north" ? 0.32 : 0.12;
  const bandMul = band === "shore" ? 1.55 : band === "street" ? 1 : 0.62;
  const distMul = 1.35 - Math.min(0.7, portDist / 520);
  return Math.max(24, Math.round(area * rate * bandMul * distMul));
}

function quad(
  a: { x: number; z: number },
  b: { x: number; z: number },
  perp: { x: number; z: number },
  setback: number,
  depth: number,
  skew: number,
): Ring {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  return [
    [a.x + perp.x * setback, a.z + perp.z * setback],
    [b.x + perp.x * setback, b.z + perp.z * setback],
    [b.x + perp.x * (setback + depth) + dx * skew, b.z + perp.z * (setback + depth) + dz * skew],
    [a.x + perp.x * (setback + depth) - dx * skew, a.z + perp.z * (setback + depth) - dz * skew],
  ];
}

function pushParcel(
  out: Parcel[],
  spec: IslandSpec,
  ring: Ring,
  band: PlotBand,
  n: number,
): void {
  const c = ringCentroid(ring);
  if (heightAt(spec, c.x, c.z) < 0.4) return;
  if (publicQuay(spec, c.x, c.z)) return;
  if (ringHitsPaved(spec, ring)) return;
  const area = ringArea(ring);
  if (area < 180 || area > 9000) return;
  const portDist = Math.hypot(c.x - spec.port.x, c.z - spec.port.z);
  out.push({
    id: `${spec.id}-${band}-${n}`,
    island: spec.id,
    ring,
    x: c.x,
    z: c.z,
    area: Math.round(area),
    band,
    class: "by_right",
    price: priceOf(spec, area, band, portDist),
    owner: null,
    use: null,
  });
}

function lotsAlongRoad(spec: IslandSpec): { lots: Parcel[]; dirt: Road[] } {
  const lots: Parcel[] = [];
  const dirt: Road[] = [];
  const steps = 18;
  for (let i = 0; i < steps; i++) {
    const a = roadPoint(spec, i / steps);
    const b = roadPoint(spec, (i + 1) / steps);
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const perp = { x: -(b.z - a.z) / len, z: (b.x - a.x) / len };
    for (const side of [-1, 1] as const) {
      const p = { x: perp.x * side, z: perp.z * side };
      const h = hash(i * 17 + side * 9 + (spec.id === "north" ? 1 : 3));
      const streetDepth = 18 + h * 14;
      const street = quad(a, b, p, 18, streetDepth, (h - 0.5) * 0.08);
      const before = lots.length;
      pushParcel(lots, spec, street, "street", lots.length);
      const fieldSetback = 18 + streetDepth + 10;
      const field = quad(a, b, p, fieldSetback, 32 + h * 18, (h - 0.4) * 0.1);
      pushParcel(lots, spec, field, "field", lots.length);
      if (lots.length > before + 1) {
        const fieldPlot = lots[lots.length - 1];
        const inner = {
          x: (a.x + b.x) / 2 + p.x * (fieldSetback + 2),
          z: (a.z + b.z) / 2 + p.z * (fieldSetback + 2),
        };
        dirt.push({
          island: spec.id,
          kind: "dirt",
          points: [inner, { x: fieldPlot.x, z: fieldPlot.z }],
        });
      }
    }
  }
  return { lots, dirt };
}

function shoreLots(spec: IslandSpec): Parcel[] {
  const lots: Parcel[] = [];
  const toward = spec.id === "north" ? 1 : -1;
  for (let i = -5; i <= 5; i++) {
    if (Math.abs(i) < 2) continue;
    const x0 = i * 28;
    const z0 = spec.port.z - toward * 36;
    const h = hash(40 + i + (spec.id === "north" ? 0 : 8));
    const w = 22 + h * 8;
    const d = 18 + h * 10;
    const ring: Ring = [
      [x0 - w / 2, z0],
      [x0 + w / 2, z0],
      [x0 + w / 2 + 3, z0 - toward * d],
      [x0 - w / 2 - 2, z0 - toward * d],
    ];
    pushParcel(lots, spec, ring, "shore", 200 + lots.length);
  }
  return lots;
}

export function createLandBoard(): LandBoard {
  const plots: Parcel[] = [];
  const dirt: Road[] = [];
  for (const spec of Object.values(ISLANDS)) {
    const built = lotsAlongRoad(spec);
    plots.push(...built.lots, ...shoreLots(spec));
    dirt.push(...built.dirt);
  }
  const leaseable = plots.filter((p) => p.class === "by_right");
  for (const p of leaseable.slice(0, 2)) {
    p.owner = "npc";
    p.use = p.band === "field" ? "farm" : "stall";
  }
  const south = leaseable.filter((p) => p.island === "south");
  for (const p of south.slice(0, 2)) {
    p.owner = "npc";
    p.use = p.band === "field" ? "farm" : "stall";
  }
  const roads = Object.values(ISLANDS).flatMap((spec) => [
    { island: spec.id, kind: "paved" as const, nodes: roadNodes(spec), points: pavedPolyline(spec) },
    ...dirt.filter((d) => d.island === spec.id),
  ]);
  return { plots, roads };
}

export function buildPlots(): Parcel[] {
  return createLandBoard().plots;
}

export function buildRoadsForAll(): Road[] {
  return createLandBoard().roads;
}

export function getPlot(board: LandBoard, id: string): Parcel | undefined {
  return board.plots.find((p) => p.id === id);
}

export function findParcelAt(board: LandBoard, x: number, z: number): Parcel | undefined {
  const hits = board.plots.filter((p) => pointInRing(x, z, p.ring));
  if (!hits.length) return undefined;
  return hits.reduce((a, b) => (a.area <= b.area ? a : b));
}

export function leasePlot(
  board: LandBoard,
  visitor: Visitor,
  plotId: string,
  owner = "visitor",
): { ok: true; paid: number; plot: Parcel } | { ok: false; reason: string } {
  const plot = getPlot(board, plotId);
  if (!plot) return { ok: false, reason: "no_plot" };
  if (plot.class === "reserved") return { ok: false, reason: "reserved" };
  if (plot.owner) return { ok: false, reason: "owned" };
  if (visitor.cash < plot.price) return { ok: false, reason: "no_cash" };
  if (visitor.cash - plot.price < DEVELOP_COST) return { ok: false, reason: "need_develop_cash" };
  visitor.cash = Math.round((visitor.cash - plot.price) * 10000) / 10000;
  plot.owner = owner;
  return { ok: true, paid: plot.price, plot };
}

export function developPlot(
  board: LandBoard,
  visitor: Visitor,
  plotId: string,
  use: Exclude<LandUse, null>,
): { ok: true; paid: number; plot: Parcel } | { ok: false; reason: string } {
  const plot = getPlot(board, plotId);
  if (!plot) return { ok: false, reason: "no_plot" };
  if (plot.owner !== "visitor") return { ok: false, reason: "not_yours" };
  if (plot.use) return { ok: false, reason: "already_built" };
  if (!isLandUse(use)) return { ok: false, reason: "bad_use" };
  const cost = paperCostFor(use);
  if (visitor.cash < cost) return { ok: false, reason: "no_cash" };
  visitor.cash = Math.round((visitor.cash - cost) * 10000) / 10000;
  plot.use = use;
  return { ok: true, paid: cost, plot };
}

/** Same formula the harbour client uses. Keep in sync with public/harbour/main.js */
export function heightAt(spec: IslandSpec, x: number, z: number): number {
  const dx = (x - spec.cx) / spec.rx;
  const dz = (z - spec.cz) / spec.rz;
  const ang = Math.atan2(dz, dx);
  const edge = 1 + 0.06 * Math.sin(ang * 5) + 0.03 * Math.sin(ang * 9 + 1.1);
  const r = Math.hypot(dx, dz);
  const toward = spec.id === "north" ? 1 : -1;
  const along = (z - spec.port.z) * toward;
  const across = Math.abs(x - spec.port.x);
  if (across < 16 && along > -24 && along < 90) return 1.12;
  if (r > edge) return -8;
  const t = r / edge;
  const portD = Math.hypot(x - spec.port.x, z - spec.port.z);
  const hillD = Math.hypot(x - spec.hill.x, z - spec.hill.z);
  let h = (1 - t) * (1 - t) * spec.peak * 0.35;
  h += spec.peak * 0.7 * Math.max(0, 1 - hillD / 900) ** 2;
  if (portD < 160) {
    const flatten = 1.15 + portD * 0.002;
    h = Math.min(Math.max(h, 1.05), flatten);
  }
  if (t > 0.8) {
    const beach = (t - 0.8) / 0.2;
    h = h * (1 - beach) + 0.35 * beach;
  }
  return h;
}

export function landSnapshot(board: LandBoard, visitor: Visitor) {
  return {
    mode: "PAPER" as const,
    provenance: "SIMULATED",
    note: "Authored island parcels in metres. Not Earth. Not OSM. Leases are paper.",
    islands: ISLANDS,
    developCost: DEVELOP_COST,
    catalog: BUILDING_CATALOG,
    visitor: {
      cash: visitor.cash,
      leases: board.plots.filter((p) => p.owner === "visitor").map((p) => p.id),
    },
    plots: board.plots,
    roads: board.roads,
  };
}
