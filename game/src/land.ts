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
  /** Branch roads only: where this road meets its parent (the junction). */
  joins?: { x: number; z: number };
  /** Street name, shown on the taxi map. */
  name?: string;
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
/** First-frame lots. Keep in sync with public/harbour/main.js */
export const SPAWN_PARCEL_M = 420;
export const STARTER_CASH = 1_000;
/** Metres. Tap this close to a starter street centroid to select it. */
export const STARTER_SNAP_M = 40;

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

/**
 * Side streets: short paved branches off the harbour road, so lots front a
 * street of their own instead of stacking four zoning rows on one spine.
 * `t` is the fraction along the spine; `side` flips the branch direction.
 */
export const SIDE_STREET_SPECS: { t: number; side: 1 | -1; len: number; name: string }[] = [
  { t: 0.1, side: -1, len: 150, name: "Market St" },
  { t: 0.18, side: 1, len: 170, name: "Mill St" },
  { t: 0.3, side: -1, len: 160, name: "Chapel St" },
  { t: 0.46, side: 1, len: 150, name: "Weir St" },
];

/** A branch road's polyline. First point sits ON the spine (the junction). */
export function sideStreetPolyline(
  spec: IslandSpec,
  branch: { t: number; side: 1 | -1; len: number },
): { x: number; z: number }[] {
  const a = roadPoint(spec, Math.max(0, branch.t - 0.01));
  const b = roadPoint(spec, Math.min(1, branch.t + 0.01));
  const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  const perp = { x: (-(b.z - a.z) / len) * branch.side, z: ((b.x - a.x) / len) * branch.side };
  const j = roadPoint(spec, branch.t);
  const pts: { x: number; z: number }[] = [];
  const n = 6;
  const wiggle = hash(branch.t * 97 + branch.side * 3) - 0.5;
  for (let i = 0; i <= n; i++) {
    const d = (branch.len * i) / n;
    pts.push({
      x: j.x + perp.x * d + ((b.x - a.x) / len) * wiggle * d * 0.14,
      z: j.z + perp.z * d + ((b.z - a.z) / len) * wiggle * d * 0.14,
    });
  }
  return pts;
}

export function sideStreets(spec: IslandSpec): Road[] {
  return SIDE_STREET_SPECS.map((s) => ({
    island: spec.id,
    kind: "paved" as const,
    points: sideStreetPolyline(spec, s),
    joins: { x: sideStreetPolyline(spec, s)[0].x, z: sideStreetPolyline(spec, s)[0].z },
    name: s.name,
  }));
}

/** Named taxi stops, derived from the network so an expanding map keeps working. */
export type TaxiStop = { id: string; name: string; x: number; z: number };

export function taxiStops(spec: IslandSpec): TaxiStop[] {
  const stops: TaxiStop[] = [];
  const port = roadPoint(spec, 0.015);
  stops.push({ id: `${spec.id}-port`, name: `${spec.name} Port`, x: port.x, z: port.z });
  SIDE_STREET_SPECS.forEach((s, i) => {
    const pts = sideStreetPolyline(spec, s);
    const j = pts[0];
    const end = pts[pts.length - 1];
    stops.push({ id: `${spec.id}-jct-${i}`, name: s.name, x: j.x, z: j.z });
    stops.push({ id: `${spec.id}-end-${i}`, name: `${s.name} End`, x: end.x, z: end.z });
  });
  const inland = roadPoint(spec, 0.985);
  stops.push({ id: `${spec.id}-inland`, name: "Road End", x: inland.x, z: inland.z });
  return stops;
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

function distToPolyline(pts: { x: number; z: number }[], x: number, z: number): number {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    best = Math.min(best, distToSegment({ x, z }, pts[i], pts[i + 1]));
  }
  return best;
}

/** Spine plus side streets. Parcels must clear every carriageway. */
function allPavedPolylines(spec: IslandSpec): { x: number; z: number }[][] {
  return [pavedPolyline(spec), ...SIDE_STREET_SPECS.map((s) => sideStreetPolyline(spec, s))];
}

function distToAnyPaved(spec: IslandSpec, x: number, z: number): number {
  let best = Infinity;
  for (const pts of allPavedPolylines(spec)) best = Math.min(best, distToPolyline(pts, x, z));
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
      if (distToAnyPaved(spec, x, z) < ROAD_CLEAR) return true;
    }
  }
  for (const pts of allPavedPolylines(spec)) {
    for (const p of pts) {
      if (pointInRing(p.x, p.z, ring)) return true;
    }
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
  return across < 22 && along > -18 && along < 16;
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

/** NPC farms sit inland so the quay walk is vacant. */
const NPC_INLAND_M = 700;

/** One row of house lots flanking a polyline street. Real zoning: lots front
 *  the street they sit on, instead of four stacked rows on one spine. */
function lotsAlongPolyline(
  lots: Parcel[],
  spec: IslandSpec,
  pts: { x: number; z: number }[],
  opts: { fromM: number; toM: number; cutM: number; seed: number },
): void {
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const segLen = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const cuts = Math.max(1, Math.round(segLen / opts.cutM));
    for (let k = 0; k < cuts; k++) {
      const d0 = acc + (segLen * k) / cuts;
      if (d0 < opts.fromM || d0 > opts.toM) continue;
      const sa = {
        x: a.x + ((b.x - a.x) * k) / cuts,
        z: a.z + ((b.z - a.z) * k) / cuts,
      };
      const sb = {
        x: a.x + ((b.x - a.x) * (k + 1)) / cuts,
        z: a.z + ((b.z - a.z) * (k + 1)) / cuts,
      };
      for (const side of [-1, 1] as const) {
        const perp = {
          x: (-(sb.z - sa.z) / segLen) * cuts * side,
          z: (((sb.x - sa.x) / segLen) * cuts * side),
        };
        const plen = Math.hypot(perp.x, perp.z) || 1;
        const p = { x: perp.x / plen, z: perp.z / plen };
        const hk = hash(opts.seed + i * 17 + k * 13 + side * 9);
        const depth = 18 + hk * 14;
        const street = quad(sa, sb, p, 13, depth, (hk - 0.5) * 0.08);
        pushParcel(lots, spec, street, "street", lots.length);
      }
    }
    acc += segLen;
  }
}

/** Dirt lane running on from a street end, with working fields flanking it. */
function fieldsOnDirtLane(
  lots: Parcel[],
  dirt: Road[],
  spec: IslandSpec,
  from: { x: number; z: number },
  dir: { x: number; z: number },
  seed: number,
): void {
  const laneLen = 190;
  const end = { x: from.x + dir.x * laneLen, z: from.z + dir.z * laneLen };
  if (heightAt(spec, end.x, end.z) < 0.4) return;
  dirt.push({ island: spec.id, kind: "dirt", points: [from, end] });
  for (const side of [-1, 1] as const) {
    const p = { x: -dir.z * side, z: dir.x * side };
    for (let seg = 0; seg < 2; seg++) {
      const h = hash(seed + side * 11 + seg * 29);
      const a = { x: from.x + dir.x * (18 + seg * 88), z: from.z + dir.z * (18 + seg * 88) };
      const b = { x: from.x + dir.x * (94 + seg * 88), z: from.z + dir.z * (94 + seg * 88) };
      const field = quad(a, b, p, 6, 46 + h * 26, (h - 0.5) * 0.1);
      pushParcel(lots, spec, field, "field", lots.length);
    }
  }
}

function lotsAlongRoad(spec: IslandSpec): { lots: Parcel[]; dirt: Road[] } {
  const lots: Parcel[] = [];
  const dirt: Road[] = [];
  const spine = pavedPolyline(spec);

  // Town: one row of house lots on the spine's first stretch (starter walk).
  lotsAlongPolyline(lots, spec, spine, {
    fromM: 30,
    toM: 900,
    cutM: 44,
    seed: spec.id === "north" ? 1 : 3,
  });

  // Every side street carries its own single row of lots.
  SIDE_STREET_SPECS.forEach((s, i) => {
    const pts = sideStreetPolyline(spec, s);
    lotsAlongPolyline(lots, spec, pts, {
      fromM: 26,
      toM: s.len - 12,
      cutM: 40,
      seed: 100 + i * 7 + (spec.id === "north" ? 0 : 50),
    });
    // Farmland continues past the street end on a dirt lane.
    const a = pts[pts.length - 2];
    const b = pts[pts.length - 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    fieldsOnDirtLane(
      lots,
      dirt,
      spec,
      b,
      { x: (b.x - a.x) / len, z: (b.z - a.z) / len },
      200 + i * 13,
    );
  });

  // Outskirts: fields along the inland half of the spine, one row each side,
  // each with its own dirt access track.
  const steps = 18;
  for (let i = 6; i < steps; i++) {
    const a = roadPoint(spec, i / steps);
    const b = roadPoint(spec, (i + 1) / steps);
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const perp = { x: -(b.z - a.z) / len, z: (b.x - a.x) / len };
    for (const side of [-1, 1] as const) {
      const p = { x: perp.x * side, z: perp.z * side };
      const h = hash(i * 17 + side * 9 + (spec.id === "north" ? 1 : 3));
      const field = quad(a, b, p, 16, 40 + h * 24, (h - 0.4) * 0.1);
      const before = lots.length;
      pushParcel(lots, spec, field, "field", lots.length);
      if (lots.length > before) {
        const fieldPlot = lots[lots.length - 1];
        const inner = {
          x: (a.x + b.x) / 2 + p.x * 14,
          z: (a.z + b.z) / 2 + p.z * 14,
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

function seedNpcLots(plots: Parcel[]): void {
  for (const spec of Object.values(ISLANDS)) {
    const ranked = plots
      .filter((p) => p.island === spec.id && p.class === "by_right" && !p.owner)
      .map((p) => ({ p, d: Math.hypot(p.x - spec.port.x, p.z - spec.port.z) }))
      .sort((a, b) => b.d - a.d);
    const inland = ranked.filter((x) => x.d > NPC_INLAND_M);
    const pick = (inland.length >= 2 ? inland : ranked).slice(0, 2);
    for (const { p } of pick) {
      p.owner = "npc";
      p.use = p.band === "field" ? "farm" : "stall";
    }
  }
}

/** Street uses cycle so an NPC town reads as a town, not a row of clones. */
const NPC_TOWN_USES: Exclude<LandUse, null>[] = ["house", "shop", "house_shop", "house", "warehouse"];
/** Per island. The world starts inhabited (evergreen), the player interferes. */
const NPC_TOWN_LOTS = 10;
/** Leave everything a $1000 starter could want: cheap street lots near spawn stay vacant. */
const NPC_TOWN_MIN_PORT_M = 260;

function seedNpcTown(plots: Parcel[]): void {
  for (const spec of Object.values(ISLANDS)) {
    const candidates = plots
      .filter(
        (p) =>
          p.island === spec.id &&
          p.class === "by_right" &&
          !p.owner &&
          p.band === "street" &&
          Math.hypot(p.x - spec.port.x, p.z - spec.port.z) > NPC_TOWN_MIN_PORT_M,
      )
      .sort(
        (a, b) =>
          Math.hypot(a.x - spec.port.x, a.z - spec.port.z) -
          Math.hypot(b.x - spec.port.x, b.z - spec.port.z),
      );
    candidates.slice(0, NPC_TOWN_LOTS).forEach((p, i) => {
      p.owner = "npc";
      p.use = NPC_TOWN_USES[i % NPC_TOWN_USES.length];
    });
    const farms = plots
      .filter(
        (p) =>
          p.island === spec.id && p.class === "by_right" && !p.owner && p.band === "field",
      )
      .sort((a, b) => b.area - a.area)
      .slice(0, 4);
    for (const p of farms) {
      p.owner = "npc";
      p.use = "farm";
    }
  }
}

export function createLandBoard(): LandBoard {
  const plots: Parcel[] = [];
  const dirt: Road[] = [];
  for (const spec of Object.values(ISLANDS)) {
    const built = lotsAlongRoad(spec);
    plots.push(...built.lots, ...shoreLots(spec));
    dirt.push(...built.dirt);
  }
  seedNpcLots(plots);
  seedNpcTown(plots);
  // Spine first per island: taxi and traffic treat roads[0] as the trunk.
  const roads = Object.values(ISLANDS).flatMap((spec) => [
    {
      island: spec.id,
      kind: "paved" as const,
      nodes: roadNodes(spec),
      points: pavedPolyline(spec),
      name: "Harbour Rd",
    },
    ...sideStreets(spec),
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

/** Cheap vacant north street lots (or already yours) inside the spawn window. */
export function isStarterPlot(
  plot: Parcel,
  spec: IslandSpec = ISLANDS.north,
  cash = STARTER_CASH,
): boolean {
  if (plot.island !== spec.id) return false;
  if (Math.hypot(plot.x - spec.port.x, plot.z - spec.port.z) >= SPAWN_PARCEL_M) return false;
  if (plot.owner === "visitor") return true;
  if (plot.owner) return false;
  if (plot.band !== "street") return false;
  return plot.price + DEVELOP_COST <= cash;
}

/** Prefer a starter street lot under the tap, else the nearest within STARTER_SNAP_M. */
export function pickStarterPlotAt(
  plots: Parcel[],
  x: number,
  z: number,
  spec: IslandSpec = ISLANDS.north,
  cash = STARTER_CASH,
): Parcel | undefined {
  const starters = plots.filter((p) => isStarterPlot(p, spec, cash));
  const inside = starters.filter((p) => pointInRing(x, z, p.ring));
  if (inside.length) return inside.reduce((a, b) => (a.area <= b.area ? a : b));
  let best: Parcel | undefined;
  let bestD = STARTER_SNAP_M;
  for (const p of starters) {
    const d = Math.hypot(x - p.x, z - p.z);
    if (d < bestD) {
      best = p;
      bestD = d;
    }
  }
  return best;
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
  if (across < 22 && along > -16 && along < 14) return 1.12;
  // Harbour cove: the pier slot widens seaward and meets the open sea, so the
  // port reads as a coastal harbour, not a carved pond behind a beach spit.
  if (along >= 14) {
    const reach = along - 14;
    const mouth = 8 + reach * 0.55;
    if (across < mouth) return -2 - 6 * Math.min(1, reach / 90);
  }
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
    stops: Object.values(ISLANDS).flatMap((spec) => taxiStops(spec)),
  };
}
