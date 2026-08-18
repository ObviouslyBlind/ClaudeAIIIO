/**
 * South island roads, empty town footprints, beach stall lots.
 * Zero buildings. NPC town seeding stays North-only.
 */

import { bboxOverlap, ringBBox, ringsOverlap } from "./kernel/plots.ts";
import {
  circlePolyline,
  distToPolyline,
  HIGHWAY_CLEAR_M,
  inVolcanoExclusion,
  linePoints,
  sampleSpline,
  SOUTH_HIGHWAY_NODES,
  SOUTH_MIN_LOT_M2,
  SOUTH_MAX_LOT_M2,
  SOUTH_PORT,
  SOUTH_RAB,
  SOUTH_TOWNS,
  SOUTH_VOLCANO,
  volcanoDist,
  wiggleLine,
  type XZ,
} from "./southGeom.ts";
import { zoneForBand } from "./zones.ts";
import type { IslandSpec, Parcel, PlotBand, PlotClass, Ring, Road, TaxiStop } from "./land.ts";

export type SouthBuilt = {
  plots: Parcel[];
  roads: Road[];
  stops: TaxiStop[];
};

type HeightFn = (spec: IslandSpec, x: number, z: number) => number;

const STREET_CLEAR = 11;
const RAB_R = 18;

function hash(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function houseNumberFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return 2 + (((h >>> 0) % 49) * 2);
}

function ringArea(ring: Ring): number {
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, z1] = ring[i]!;
    const [x2, z2] = ring[(i + 1) % ring.length]!;
    a += x1 * z2 - x2 * z1;
  }
  return Math.abs(a) / 2;
}

function ringCentroid(ring: Ring): XZ {
  let x = 0;
  let z = 0;
  for (const p of ring) {
    x += p[0];
    z += p[1];
  }
  return { x: x / ring.length, z: z / ring.length };
}

function pointInRing(x: number, z: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i]!;
    const [xj, zj] = ring[j]!;
    const hit = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-9) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

function quad(a: XZ, b: XZ, perp: XZ, setback: number, depth: number, skew: number): Ring {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  return [
    [a.x + perp.x * setback, a.z + perp.z * setback],
    [b.x + perp.x * setback, b.z + perp.z * setback],
    [b.x + perp.x * (setback + depth) + dx * skew, b.z + perp.z * (setback + depth) + dz * skew],
    [a.x + perp.x * (setback + depth) - dx * skew, a.z + perp.z * (setback + depth) - dz * skew],
  ];
}

function priceOf(area: number, band: PlotBand, portDist: number): number {
  const bandMul = band === "shore" ? 1.55 : band === "street" ? 1 : 0.62;
  const distMul = 1.35 - Math.min(0.7, portDist / 520);
  return Math.max(24, Math.round(area * 0.12 * bandMul * distMul));
}

function publicQuay(x: number, z: number): boolean {
  const along = (z - SOUTH_PORT.z) * -1;
  const across = Math.abs(x - SOUTH_PORT.x);
  const east = x - SOUTH_PORT.x;
  if (across < 36 && along > -18 && along < 16) return true;
  if (east > 18 && east < 280 && along > -24 && along < 8) return true;
  return false;
}

type ClearRoad = { points: XZ[]; clear: number };

function ringHitsRoads(ring: Ring, roads: ClearRoad[]): boolean {
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(2, Math.ceil(len / 2));
    for (let s = 0; s <= n; s++) {
      const t = s / n;
      const x = a[0] + (b[0] - a[0]) * t;
      const z = a[1] + (b[1] - a[1]) * t;
      for (const r of roads) {
        if (distToPolyline(r.points, x, z) < r.clear) return true;
      }
    }
  }
  for (const r of roads) {
    for (const p of r.points) {
      if (pointInRing(p.x, p.z, ring)) return true;
    }
  }
  return false;
}

function overlapsExisting(out: Parcel[], ring: Ring): boolean {
  const box = ringBBox(ring);
  for (const p of out) {
    if (!bboxOverlap(box, ringBBox(p.ring))) continue;
    if (ringsOverlap(ring, p.ring)) return true;
  }
  return false;
}

type PushOpts = {
  spec: IslandSpec;
  heightAt: HeightFn;
  clear: ClearRoad[];
  street: string;
  band: PlotBand;
  cls?: PlotClass;
  zone?: Parcel["zone"];
  minArea?: number;
  skipRoads?: boolean;
};

function pushParcel(out: Parcel[], ring: Ring, opts: PushOpts): boolean {
  const c = ringCentroid(ring);
  if (opts.heightAt(opts.spec, c.x, c.z) < 0.4) return false;
  if (publicQuay(c.x, c.z)) return false;
  if (inVolcanoExclusion(c.x, c.z)) return false;
  if (volcanoDist(c.x, c.z) < 90) return false;
  if (!opts.skipRoads && ringHitsRoads(ring, opts.clear)) return false;
  if (overlapsExisting(out, ring)) return false;
  const area = ringArea(ring);
  const minA = opts.minArea ?? SOUTH_MIN_LOT_M2;
  if (area < minA || area > SOUTH_MAX_LOT_M2) return false;
  const portDist = Math.hypot(c.x - SOUTH_PORT.x, c.z - SOUTH_PORT.z);
  const band = opts.band;
  const id = `south-${band}-${out.length}`;
  const street = opts.street;
  out.push({
    id,
    island: "south",
    ring,
    x: c.x,
    z: c.z,
    area: Math.round(area),
    band,
    class: opts.cls ?? "by_right",
    price: priceOf(area, band, portDist),
    owner: null,
    use: null,
    street,
    name: `${houseNumberFor(id)} ${street}`,
    deposit: null,
    zone: opts.zone ?? zoneForBand(band),
  });
  return true;
}

function lotsAlong(
  lots: Parcel[],
  pts: XZ[],
  opts: PushOpts & { fromM: number; toM: number; cutM: number; seed: number; sides?: (-1 | 1)[]; setback?: number },
): void {
  if (pts.length < 2) return;
  let acc = 0;
  const sides = opts.sides ?? ([-1, 1] as const);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const segLen = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const cuts = Math.max(1, Math.round(segLen / opts.cutM));
    for (let k = 0; k < cuts; k++) {
      const d0 = acc + (segLen * k) / cuts;
      if (d0 < opts.fromM || d0 > opts.toM) continue;
      const sa = { x: a.x + ((b.x - a.x) * k) / cuts, z: a.z + ((b.z - a.z) * k) / cuts };
      const sb = {
        x: a.x + ((b.x - a.x) * (k + 1)) / cuts,
        z: a.z + ((b.z - a.z) * (k + 1)) / cuts,
      };
      for (const side of sides) {
        const perp = {
          x: (-(sb.z - sa.z) / segLen) * cuts * side,
          z: ((sb.x - sa.x) / segLen) * cuts * side,
        };
        const plen = Math.hypot(perp.x, perp.z) || 1;
        const p = { x: perp.x / plen, z: perp.z / plen };
        const hk = hash(opts.seed + i * 17 + k * 13 + side * 9);
        const depth = (opts.band === "shore" ? 14 : 16) + hk * 12;
        const lot = quad(sa, sb, p, opts.setback ?? 13, depth, (hk - 0.5) * 0.08);
        pushParcel(lots, lot, opts);
      }
    }
    acc += segLen;
  }
}

function plazaAt(
  lots: Parcel[],
  c: XZ,
  street: string,
  opts: Omit<PushOpts, "street" | "band">,
  hx = 28,
  hz = 22,
): void {
  const ring: Ring = [
    [c.x - hx, c.z - hz],
    [c.x + hx, c.z - hz],
    [c.x + hx * 0.92, c.z + hz],
    [c.x - hx * 1.05, c.z + hz * 0.9],
  ];
  pushParcel(lots, ring, {
    ...opts,
    street,
    band: "street",
    cls: "reserved",
    minArea: 400,
    skipRoads: true,
  });
  const last = lots[lots.length - 1];
  if (last && last.class === "reserved") last.name = `${street} Green`;
}

function paved(
  name: string,
  points: XZ[],
  joins: XZ,
  extra: Partial<Road> = {},
): Road {
  return {
    island: "south",
    kind: "paved",
    name,
    points,
    joins,
    ...extra,
  };
}

function dirt(name: string, points: XZ[]): Road {
  return { island: "south", kind: "dirt", name, points };
}

function rabRoad(c: XZ, name: string): Road {
  return {
    island: "south",
    kind: "paved",
    name,
    points: circlePolyline(c, RAB_R, 28),
    roundabout: true,
    joins: { x: c.x, z: c.z },
  };
}

export function buildSouthLand(spec: IslandSpec, heightAt: HeightFn): SouthBuilt {
  const lots: Parcel[] = [];
  const roads: Road[] = [];
  const highwayPts = sampleSpline(SOUTH_HIGHWAY_NODES, 8);
  const highway: Road = {
    island: "south",
    kind: "paved",
    name: "Island Hwy",
    lanes: 4,
    nodes: SOUTH_HIGHWAY_NODES.map((p) => ({ ...p })),
    points: highwayPts,
  };
  roads.push(highway);

  const harbour = SOUTH_RAB.harbour;
  const cane = SOUTH_RAB.west;
  const ash = SOUTH_RAB.pass;
  const haven = SOUTH_RAB.east;

  roads.push(rabRoad(harbour, SOUTH_RAB.harbour.name));
  roads.push(rabRoad(cane, SOUTH_RAB.west.name));
  roads.push(rabRoad(ash, SOUTH_RAB.pass.name));
  roads.push(rabRoad(haven, SOUTH_RAB.east.name));

  const beachChannel = wiggleLine(harbour, { x: -420, z: 7220 }, 10, 18, 2);
  beachChannel.splice(1, 0, { x: -1600, z: 7260 });
  const beachPalm = wiggleLine(harbour, { x: -1680, z: 8380 }, 8, 22, 5);
  const beachStrand = [
    harbour,
    { x: -2220, z: 8120 },
    { x: -2140, z: 9180 },
    { x: SOUTH_TOWNS[2]!.x, z: SOUTH_TOWNS[2]!.z },
  ];

  roads.push(paved("Channel Sands", sampleSpline(beachChannel, 6), harbour));
  roads.push(paved("Palm Arc", sampleSpline(beachPalm, 6), harbour));
  roads.push(paved("South Strand", sampleSpline(beachStrand, 6), harbour));

  const quayward = SOUTH_TOWNS[0]!;
  const canebrake = SOUTH_TOWNS[1]!;
  const saltwind = SOUTH_TOWNS[2]!;
  const ashPass = SOUTH_TOWNS[3]!;
  const eastHaven = SOUTH_TOWNS[4]!;

  const quaySpur = linePoints(harbour, quayward, 5);
  roads.push(paved("Quayward Rd", quaySpur, harbour));

  // Tight grid — three east–west, three north–south, not a clone of the others.
  const gridEw = [-42, 0, 44];
  const gridNs = [-48, 8, 52];
  for (const dz of gridEw) {
    const a = { x: quayward.x - 72, z: quayward.z + dz };
    const b = { x: quayward.x + 78, z: quayward.z + dz + 3 };
    roads.push(paved(`Quayward ${dz < 0 ? "South" : dz > 0 ? "North" : "Mid"}`, linePoints(a, b, 4), harbour));
  }
  for (const dx of gridNs) {
    const a = { x: quayward.x + dx, z: quayward.z - 58 };
    const b = { x: quayward.x + dx + 2, z: quayward.z + 62 };
    roads.push(paved(`Quayward ${dx < 0 ? "West" : dx > 0 ? "East" : "Spine"}`, linePoints(a, b, 4), harbour));
  }

  const caneSpur = wiggleLine(cane, canebrake, 12, 36, 7);
  roads.push(paved("Canebrake Rd", caneSpur, cane));
  // Organic Y-forks.
  const ySw = wiggleLine(canebrake, { x: canebrake.x - 150, z: canebrake.z + 90 }, 6, 14, 11);
  const ySe = wiggleLine(canebrake, { x: canebrake.x + 130, z: canebrake.z + 110 }, 6, 16, 13);
  const yW = wiggleLine(canebrake, { x: canebrake.x - 120, z: canebrake.z - 40 }, 5, 10, 17);
  roads.push(paved("Mill Fork", ySw, cane));
  roads.push(paved("Cane End", ySe, cane));
  roads.push(paved("Brake Lane", yW, cane));

  const highA = { x: saltwind.x - 240, z: saltwind.z - 80 };
  const highB = { x: saltwind.x + 260, z: saltwind.z + 110 };
  const highStreet = wiggleLine(highA, highB, 10, 12, 19);
  roads.push(paved("Saltwind High St", highStreet, harbour));
  for (let i = 0; i < 4; i++) {
    const t = 0.18 + i * 0.2;
    const px = highA.x + (highB.x - highA.x) * t;
    const pz = highA.z + (highB.z - highA.z) * t;
    const dx = highB.x - highA.x;
    const dz = highB.z - highA.z;
    const len = Math.hypot(dx, dz) || 1;
    const side = i % 2 ? 1 : -1;
    const end = { x: px + (-dz / len) * side * (48 + i * 6), z: pz + (dx / len) * side * (48 + i * 6) };
    roads.push(paved(`Saltwind Alley ${i + 1}`, linePoints({ x: px, z: pz }, end, 3), harbour));
  }

  const passSpur = linePoints(ash, ashPass, 4);
  roads.push(paved("Pass Rd", passSpur, ash));
  const spokes = [0.15, 0.9, 1.7, 2.55, 3.5];
  spokes.forEach((ang, i) => {
    const len = 68 + (i % 3) * 14;
    const end = { x: ashPass.x + Math.cos(ang) * len, z: ashPass.z + Math.sin(ang) * len };
    roads.push(paved(`Ash Spoke ${i + 1}`, linePoints(ashPass, end, 4), ash));
  });

  const havenSpur = wiggleLine(haven, eastHaven, 12, 28, 23);
  roads.push(paved("Haven Rd", havenSpur, haven));
  const loop: XZ[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = (i / 20) * Math.PI * 2;
    loop.push({ x: eastHaven.x + Math.cos(t) * 92, z: eastHaven.z + Math.sin(t) * 68 });
  }
  roads.push(paved("Haven Crescent", loop, haven));
  roads.push(
    paved(
      "Haven Chord",
      linePoints(
        { x: eastHaven.x - 80, z: eastHaven.z - 8 },
        { x: eastHaven.x + 86, z: eastHaven.z + 12 },
        4,
      ),
      haven,
    ),
  );

  roads.push(dirt("Quayward Path", wiggleLine(quayward, canebrake, 8, 24, 29)));
  roads.push(dirt("Cane Path", wiggleLine(canebrake, saltwind, 10, 30, 31)));
  roads.push(
    dirt(
      "South Path",
      sampleSpline(
        [
          saltwind,
          { x: -400, z: 10340 },
          { x: 1100, z: 10420 },
          { x: eastHaven.x, z: eastHaven.z + 40 },
        ],
        6,
      ),
    ),
  );
  roads.push(dirt("Pass Path", wiggleLine(ashPass, eastHaven, 9, 22, 37)));

  const clear: ClearRoad[] = roads.map((r) => ({
    points: r.points,
    clear: r.name === "Island Hwy" || r.lanes === 4 ? HIGHWAY_CLEAR_M : r.roundabout ? 14 : STREET_CLEAR,
  }));

  const base = { spec, heightAt, clear };

  plazaAt(lots, quayward, "Quayward", base, 22, 18);
  plazaAt(lots, canebrake, "Canebrake", base, 26, 20);
  plazaAt(lots, saltwind, "Saltwind", base, 30, 16);
  plazaAt(lots, ashPass, "Ash Pass", base, 20, 20);
  plazaAt(lots, { x: eastHaven.x, z: eastHaven.z }, "East Haven", base, 24, 20);

  const streetOpts = { ...base, band: "street" as const, fromM: 28, toM: 900, cutM: 32, seed: 3 };

  lotsAlong(lots, quaySpur, { ...streetOpts, street: "Quayward Rd", toM: 160, seed: 11 });
  for (const r of roads.filter((x) => x.name?.startsWith("Quayward ") && x.name !== "Quayward Rd" && x.name !== "Quayward Path")) {
    lotsAlong(lots, r.points, { ...streetOpts, street: r.name || "Quayward", toM: 140, cutM: 28, seed: 15 });
  }

  lotsAlong(lots, caneSpur, { ...streetOpts, street: "Canebrake Rd", fromM: 80, toM: 980, cutM: 36, seed: 21 });
  lotsAlong(lots, ySw, { ...streetOpts, street: "Mill Fork", toM: 140, seed: 22 });
  lotsAlong(lots, ySe, { ...streetOpts, street: "Cane End", toM: 150, seed: 23 });
  lotsAlong(lots, yW, { ...streetOpts, street: "Brake Lane", toM: 110, seed: 24 });

  lotsAlong(lots, highStreet, { ...streetOpts, street: "Saltwind High St", fromM: 20, toM: 520, cutM: 30, seed: 31 });
  for (const r of roads.filter((x) => x.name?.startsWith("Saltwind Alley"))) {
    lotsAlong(lots, r.points, { ...streetOpts, street: r.name || "Alley", toM: 70, cutM: 26, sides: [1], seed: 32 });
  }

  lotsAlong(lots, passSpur, { ...streetOpts, street: "Pass Rd", toM: 120, seed: 41 });
  for (const r of roads.filter((x) => x.name?.startsWith("Ash Spoke"))) {
    lotsAlong(lots, r.points, { ...streetOpts, street: r.name || "Spoke", fromM: 16, toM: 90, cutM: 28, seed: 42 });
  }

  lotsAlong(lots, havenSpur, { ...streetOpts, street: "Haven Rd", fromM: 60, toM: 1100, cutM: 36, seed: 51 });
  lotsAlong(lots, loop, { ...streetOpts, street: "Haven Crescent", fromM: 8, toM: 900, cutM: 34, seed: 52 });
  lotsAlong(lots, roads.find((r) => r.name === "Haven Chord")!.points, {
    ...streetOpts,
    street: "Haven Chord",
    toM: 160,
    seed: 53,
  });

  const shoreOpts = {
    ...base,
    band: "shore" as const,
    zone: "commercial" as const,
    fromM: 40,
    toM: 900,
    cutM: 22,
    setback: 12,
    sides: [1] as (-1 | 1)[],
    seed: 70,
  };
  lotsAlong(lots, roads.find((r) => r.name === "Channel Sands")!.points, {
    ...shoreOpts,
    street: "Channel Sands",
    toM: 720,
    seed: 71,
  });
  lotsAlong(lots, roads.find((r) => r.name === "Palm Arc")!.points, {
    ...shoreOpts,
    street: "Palm Arc",
    toM: 480,
    seed: 72,
  });
  lotsAlong(lots, roads.find((r) => r.name === "South Strand")!.points, {
    ...shoreOpts,
    street: "South Strand",
    fromM: 80,
    toM: 1100,
    cutM: 24,
    seed: 73,
  });

  // Inland fields off dirt and the long Canebrake drive (ore lives on fields).
  const fieldRoads = [
    ...roads.filter((x) => x.kind === "dirt"),
    roads.find((x) => x.name === "Canebrake Rd")!,
    roads.find((x) => x.name === "Haven Rd")!,
  ].filter(Boolean);
  for (const r of fieldRoads) {
    const pts = r.points;
    if (pts.length < 3) continue;
    for (const frac of [0.35, 0.55, 0.75]) {
      const i = Math.min(pts.length - 2, Math.max(1, Math.floor(frac * (pts.length - 1))));
      const a = pts[i]!;
      const b = pts[i + 1]!;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz) || 1;
      for (const side of [-1, 1] as const) {
        const p = { x: (-dz / len) * side, z: (dx / len) * side };
        const field = quad(a, b, p, 18, 48 + hash(frac * 9 + side + (r.name?.length ?? 1)) * 22, 0.05);
        pushParcel(lots, field, { ...base, street: "Field Lane", band: "field" });
      }
    }
  }

  const stops: TaxiStop[] = [
    { id: "south-port", name: "South Port", x: SOUTH_PORT.x, z: SOUTH_PORT.z },
    { id: "south-harbour-circus", name: SOUTH_RAB.harbour.name, x: harbour.x, z: harbour.z },
    { id: "south-cane-circus", name: SOUTH_RAB.west.name, x: cane.x, z: cane.z },
    { id: "south-ash-circus", name: SOUTH_RAB.pass.name, x: ash.x, z: ash.z },
    { id: "south-haven-circus", name: SOUTH_RAB.east.name, x: haven.x, z: haven.z },
    ...SOUTH_TOWNS.map((t) => ({ id: `south-town-${t.id}`, name: t.name, x: t.x, z: t.z })),
    { id: "south-east-shore", name: "East Shore", x: 2920, z: 7860 },
  ];

  return { plots: lots, roads, stops };
}

export function southTaxiStops(): TaxiStop[] {
  return [
    { id: "south-port", name: "South Port", x: SOUTH_PORT.x, z: SOUTH_PORT.z },
    { id: "south-harbour-circus", name: SOUTH_RAB.harbour.name, x: SOUTH_RAB.harbour.x, z: SOUTH_RAB.harbour.z },
    { id: "south-cane-circus", name: SOUTH_RAB.west.name, x: SOUTH_RAB.west.x, z: SOUTH_RAB.west.z },
    { id: "south-ash-circus", name: SOUTH_RAB.pass.name, x: SOUTH_RAB.pass.x, z: SOUTH_RAB.pass.z },
    { id: "south-haven-circus", name: SOUTH_RAB.east.name, x: SOUTH_RAB.east.x, z: SOUTH_RAB.east.z },
    ...SOUTH_TOWNS.map((t) => ({ id: `south-town-${t.id}`, name: t.name, x: t.x, z: t.z })),
    { id: "south-east-shore", name: "East Shore", x: 2920, z: 7860 },
  ];
}

export { SOUTH_PORT, SOUTH_TOWNS, SOUTH_VOLCANO };
