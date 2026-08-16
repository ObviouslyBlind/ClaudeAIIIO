import type { Visitor } from "./sim.ts";

export type IslandId = "north" | "south";
export type PlotBand = "shore" | "street" | "field";
export type PlotClass = "by_right" | "reserved";
export type LandUse = "farm" | "stall" | null;
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
};

export type LandBoard = {
  plots: Parcel[];
  roads: Road[];
};

/**
 * Small inhabited Caribbean cay scale, not Jamaica.
 * Each ellipse is about 2.0 km east-west by 1.2 km north-south (~1.9 km²).
 */
export const ISLANDS: Record<IslandId, IslandSpec> = {
  north: {
    id: "north",
    name: "North",
    cx: 0,
    cz: -820,
    rx: 1000,
    rz: 580,
    peak: 92,
    port: { x: 0, z: -310 },
    hill: { x: -240, z: -980 },
  },
  south: {
    id: "south",
    name: "South",
    cx: 0,
    cz: 820,
    rx: 1000,
    rz: 580,
    peak: 74,
    port: { x: 0, z: 310 },
    hill: { x: 220, z: 980 },
  },
};

export const DEVELOP_COST = 40;

function inlandSign(spec: IslandSpec): number {
  return spec.id === "north" ? -1 : 1;
}

function hash(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function roadPoint(spec: IslandSpec, t: number): { x: number; z: number } {
  const clamped = Math.max(0, Math.min(1, t));
  return {
    x: spec.port.x + Math.sin(clamped * 5.1) * 16,
    z: spec.port.z + inlandSign(spec) * (48 + clamped * 430),
  };
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

function lotsAlongRoad(spec: IslandSpec): Parcel[] {
  const lots: Parcel[] = [];
  const steps = 12;
  for (let i = 0; i < steps; i++) {
    const a = roadPoint(spec, i / steps);
    const b = roadPoint(spec, (i + 1) / steps);
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const perp = { x: -(b.z - a.z) / len, z: (b.x - a.x) / len };
    for (const side of [-1, 1] as const) {
      const p = { x: perp.x * side, z: perp.z * side };
      const h = hash(i * 17 + side * 9 + (spec.id === "north" ? 1 : 3));
      const street = quad(a, b, p, 7, 20 + h * 16, (h - 0.5) * 0.18);
      pushParcel(lots, spec, street, "street", lots.length);
      const field = quad(a, b, p, 28 + h * 8, 36 + h * 22, (h - 0.4) * 0.22);
      pushParcel(lots, spec, field, "field", lots.length);
    }
  }
  return lots;
}

function shoreLots(spec: IslandSpec): Parcel[] {
  const lots: Parcel[] = [];
  const toward = spec.id === "north" ? 1 : -1;
  for (let i = -5; i <= 5; i++) {
    if (Math.abs(i) < 2) continue;
    const x0 = i * 28;
    const z0 = spec.port.z + toward * 8;
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

function buildRoads(spec: IslandSpec, parcels: Parcel[]): Road[] {
  const paved = [];
  for (let i = 0; i <= 16; i++) paved.push(roadPoint(spec, i / 16));
  const dirt: Road[] = [];
  for (const p of parcels.filter((x) => x.band === "field" && x.island === spec.id).slice(0, 8)) {
    const t = Math.max(0, Math.min(1, Math.abs(p.z - spec.port.z) / 480));
    dirt.push({
      island: spec.id,
      kind: "dirt",
      points: [roadPoint(spec, t), { x: p.x, z: p.z }],
    });
  }
  return [{ island: spec.id, kind: "paved", points: paved }, ...dirt];
}

export function buildPlots(): Parcel[] {
  const plots: Parcel[] = [];
  for (const spec of Object.values(ISLANDS)) {
    plots.push(...lotsAlongRoad(spec), ...shoreLots(spec));
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
  return plots;
}

export function buildRoadsForAll(plots: Parcel[]): Road[] {
  return Object.values(ISLANDS).flatMap((spec) => buildRoads(spec, plots));
}

export function createLandBoard(): LandBoard {
  const plots = buildPlots();
  return { plots, roads: buildRoadsForAll(plots) };
}

export function getPlot(board: LandBoard, id: string): Parcel | undefined {
  return board.plots.find((p) => p.id === id);
}

export function findParcelAt(board: LandBoard, x: number, z: number): Parcel | undefined {
  return board.plots.find((p) => pointInRing(x, z, p.ring));
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
  if (use !== "farm" && use !== "stall") return { ok: false, reason: "bad_use" };
  if (visitor.cash < DEVELOP_COST) return { ok: false, reason: "no_cash" };
  visitor.cash = Math.round((visitor.cash - DEVELOP_COST) * 10000) / 10000;
  plot.use = use;
  return { ok: true, paid: DEVELOP_COST, plot };
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
  h += spec.peak * 0.7 * Math.max(0, 1 - hillD / 320) ** 2;
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
    visitor: {
      cash: visitor.cash,
      leases: board.plots.filter((p) => p.owner === "visitor").map((p) => p.id),
    },
    plots: board.plots,
    roads: board.roads,
  };
}
