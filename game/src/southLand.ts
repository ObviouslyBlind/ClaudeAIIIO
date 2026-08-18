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
  southHighwaySpline,
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
/** Circulatory ring. Spurs start outside this, never at the circus centre. */
const RAB_R = 32;
const RAB_GAP = 34;

function hash(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function polylineLen(pts: XZ[]): number {
  let n = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    n += Math.hypot(pts[i + 1]!.x - pts[i]!.x, pts[i + 1]!.z - pts[i]!.z);
  }
  return n;
}

function pointAlong(pts: XZ[], dist: number): { at: XZ; dir: XZ } | null {
  let left = dist;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    if (left <= len) {
      const t = left / len;
      return {
        at: { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t },
        dir: { x: (b.x - a.x) / len, z: (b.z - a.z) / len },
      };
    }
    left -= len;
  }
  return null;
}

/** Spurs start at the roundabout ring, not the circus centre. */
function trimNearPoint(pts: XZ[], join: XZ, gap = RAB_GAP): XZ[] {
  if (pts.length < 2) return pts;
  const out = pts.filter((p) => Math.hypot(p.x - join.x, p.z - join.z) >= gap - 0.25);
  return out.length >= 2 ? out : pts;
}

/** First station on the ring, then the rest of the path. Never includes the centre. */
function leaveRing(center: XZ, rest: XZ[], r = RAB_GAP): XZ[] {
  const dest = rest.find((p) => Math.hypot(p.x - center.x, p.z - center.z) > r) ?? rest[rest.length - 1]!;
  const dx = dest.x - center.x;
  const dz = dest.z - center.z;
  const len = Math.hypot(dx, dz) || 1;
  const start = { x: center.x + (dx / len) * r, z: center.z + (dz / len) * r };
  const tail = rest.filter((p) => Math.hypot(p.x - center.x, p.z - center.z) > r + 1);
  return [start, ...tail];
}

/**
 * Y-fork: peel off a trunk toward dest. Start at the kerb so the ribbons
 * do not stack on the parent carriageway.
 */
function forkFromTrunk(trunk: XZ[], alongM: number, dest: XZ[], kerb: number): { pts: XZ[]; at: XZ } | null {
  const hit = pointAlong(trunk, alongM);
  if (!hit) return null;
  const first = dest[0]!;
  const vx = first.x - hit.at.x;
  const vz = first.z - hit.at.z;
  const len = Math.hypot(vx, vz) || 1;
  const dir = { x: vx / len, z: vz / len };
  const along = hit.dir.x * dir.x + hit.dir.z * dir.z;
  if (Math.abs(along) > 0.92) return null;
  const start = offsetBy(hit.at, dir, kerb + 1.2);
  const tail = dest.filter((p) => Math.hypot(p.x - hit.at.x, p.z - hit.at.z) > kerb + 10);
  return { pts: [start, ...tail], at: hit.at };
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
        const depth =
          opts.band === "field" ? 70 + hk * 28 : opts.band === "shore" ? 12 + hk * 8 : 12 + hk * 8;
        const lot = quad(sa, sb, p, opts.setback ?? (opts.band === "field" ? 16 : 11), depth, (hk - 0.5) * 0.06);
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
  gap = RAB_GAP,
  trimAt: XZ = joins,
): Road {
  return {
    island: "south",
    kind: "paved",
    name,
    points: trimNearPoint(points, trimAt, gap),
    joins,
    ...extra,
  };
}

function offsetBy(at: XZ, dir: XZ, m: number): XZ {
  return { x: at.x + dir.x * m, z: at.z + dir.z * m };
}

/** T-stubs off a trunk. They meet the kerb; they do not cross the carriageway. */
/** Field dirt may T off a row end. It must not then cut a named paved street. */
function dirtClearOfPaved(pts: XZ[], roads: Road[], origin: XZ): boolean {
  for (const p of pts) {
    if (Math.hypot(p.x - origin.x, p.z - origin.z) < 16) continue;
    for (const r of roads) {
      if (r.kind !== "paved") continue;
      if (distToPolyline(r.points, p.x, p.z) < 8) return false;
    }
  }
  return true;
}

function addHamletsAlong(
  roads: Road[],
  pts: XZ[],
  join: XZ,
  stem: string,
  seed: number,
  kerb = 7.2,
  opts: { fromM?: number; avoid?: XZ[] } = {},
): void {
  const len = polylineLen(pts);
  const avoid = opts.avoid ?? [];
  let d = opts.fromM ?? 190;
  let n = 0;
  while (d < len - 100 && n < 8) {
    const hit = pointAlong(pts, d);
    if (
      hit &&
      !inVolcanoExclusion(hit.at.x, hit.at.z, 60) &&
      avoid.every((c) => Math.hypot(hit.at.x - c.x, hit.at.z - c.z) > 90)
    ) {
      const perp = { x: -hit.dir.z, z: hit.dir.x };
      const depth = 48 + hash(seed + n) * 18;
      const a0 = offsetBy(hit.at, perp, kerb);
      const a1 = offsetBy(hit.at, perp, kerb + depth);
      roads.push(paved(`${stem} Row ${n + 1}`, linePoints(a0, a1, 4), hit.at, {}, kerb, hit.at));
      const dirtEnd = offsetBy(a1, perp, 58 + hash(seed + n + 3) * 36);
      const track = wiggleLine(a1, dirtEnd, 5, 10, seed + n);
      if (dirtClearOfPaved(track, roads, a1)) roads.push(dirt(`${stem} Track ${n + 1}`, track));
      if (n % 2 === 0) {
        const b0 = offsetBy(hit.at, perp, -kerb);
        const b1 = offsetBy(hit.at, perp, -(kerb + depth * 0.9));
        roads.push(paved(`${stem} Row ${n + 1}b`, linePoints(b0, b1, 4), hit.at, {}, kerb, hit.at));
        const dirtB = offsetBy(b1, perp, -(70 + hash(seed + n + 5) * 42));
        const field = wiggleLine(b1, dirtB, 6, 12, seed + n + 11);
        if (dirtClearOfPaved(field, roads, b1)) roads.push(dirt(`${stem} Field ${n + 1}`, field));
      }
    }
    d += 220 + hash(seed + n) * 40;
    n += 1;
  }
}

function dirt(name: string, points: XZ[]): Road {
  return { island: "south", kind: "dirt", name, points };
}

function isRabNode(p: XZ): boolean {
  return Object.values(SOUTH_RAB).some((r) => Math.hypot(p.x - r.x, p.z - r.z) < 1);
}

/** Dual carriageway as separate spans that meet the circus rings, never the island. */
function splitIslandHwy(): Road[] {
  const nodes = SOUTH_HIGHWAY_NODES;
  const spans: XZ[][] = [];
  let cur: XZ[] = [nodes[0]!];
  for (let i = 1; i < nodes.length; i++) {
    cur.push(nodes[i]!);
    if (isRabNode(nodes[i]!) || i === nodes.length - 1) {
      spans.push(cur);
      cur = [nodes[i]!];
    }
  }
  return spans
    .filter((s) => s.length >= 2)
    .map((span) => {
      let pts = sampleSpline(span, 8);
      for (const n of span) {
        if (isRabNode(n)) pts = trimNearPoint(pts, n, RAB_GAP);
      }
      return {
        island: "south" as const,
        kind: "paved" as const,
        name: "Island Hwy",
        lanes: 4 as const,
        points: pts,
        nodes: span.map((p) => ({ ...p })),
      };
    });
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
  const hwySegs = splitIslandHwy();
  for (const seg of hwySegs) roads.push(seg);

  const harbour = SOUTH_RAB.harbour;
  const cane = SOUTH_RAB.west;
  const ash = SOUTH_RAB.pass;
  const haven = SOUTH_RAB.east;
  const circuses: XZ[] = [harbour, cane, ash, haven];

  roads.push(rabRoad(harbour, SOUTH_RAB.harbour.name));
  roads.push(rabRoad(cane, SOUTH_RAB.west.name));
  roads.push(rabRoad(ash, SOUTH_RAB.pass.name));
  roads.push(rabRoad(haven, SOUTH_RAB.east.name));

  const quayward = SOUTH_TOWNS[0]!;
  const canebrake = SOUTH_TOWNS[1]!;
  const saltwind = SOUTH_TOWNS[2]!;
  const ashPass = SOUTH_TOWNS[3]!;
  const eastHaven = SOUTH_TOWNS[4]!;

  // Harbour Circus: highway + Quayward only. Strand forks off Quayward so the
  // circus is a 3-exit ring, not a star of beach roads through one point.
  const quayPts = trimNearPoint(leaveRing(harbour, [quayward]), quayward, 20);
  roads.push(paved("Quayward Rd", quayPts, harbour, {}, 0));
  const quayRoad = roads.find((r) => r.name === "Quayward Rd")!;
  const strandDest = sampleSpline(
    [
      { x: -2220, z: 8120 },
      { x: -2140, z: 9180 },
      { x: saltwind.x, z: saltwind.z },
    ],
    6,
  );
  const strandAlong = Math.min(90, polylineLen(quayRoad.points) * 0.42);
  const strandFork = forkFromTrunk(quayRoad.points, strandAlong, strandDest, 7.2);
  if (!strandFork) throw new Error("south land: South Strand must Y-fork off Quayward Rd");
  roads.push(paved("South Strand", trimNearPoint(strandFork.pts, saltwind, 18), strandFork.at, {}, 0));

  const eastHwy = hwySegs[1];
  const channelDest = sampleSpline(
    [
      { x: -1600, z: 7260 },
      { x: -980, z: 7240 },
      { x: -420, z: 7220 },
    ],
    6,
  );
  const channelFork = eastHwy ? forkFromTrunk(eastHwy.points, 80, channelDest, 16) : null;
  if (!channelFork) throw new Error("south land: Channel Sands must Y-fork off Island Hwy");
  roads.push(paved("Channel Sands", channelFork.pts, channelFork.at, {}, 0));

  const strandRoad = roads.find((r) => r.name === "South Strand")!;
  const palmDest = sampleSpline(
    [
      { x: -1680, z: 8380 },
      { x: -1480, z: 8680 },
    ],
    6,
  );
  const palmAlong = Math.min(240, polylineLen(strandRoad.points) * 0.28);
  const palmFork = forkFromTrunk(strandRoad.points, palmAlong, palmDest, 7.2);
  if (!palmFork) throw new Error("south land: Palm Arc must Y-fork off South Strand");
  roads.push(paved("Palm Arc", palmFork.pts, palmFork.at, {}, 0));

  // One block loop around the green — not a hash of streets through each other.
  const hx = 68;
  const hz = 46;
  const quayLoop: XZ[] = [
    { x: quayward.x - hx, z: quayward.z - hz },
    { x: quayward.x + hx, z: quayward.z - hz },
    { x: quayward.x + hx, z: quayward.z + hz },
    { x: quayward.x - hx, z: quayward.z + hz },
    { x: quayward.x - hx, z: quayward.z - hz },
  ];
  roads.push(paved("Quayward Loop", quayLoop, quayward, {}, 16));

  const caneStart = leaveRing(cane, [canebrake])[0]!;
  const caneSpur = wiggleLine(caneStart, canebrake, 12, 36, 7);
  roads.push(paved("Canebrake Rd", trimNearPoint(caneSpur, canebrake, 16), cane, {}, 0));
  // Y-fork on one kerb — two peels, not a cross stacked on the town point.
  const caneLen = polylineLen(caneSpur);
  const millHit = pointAlong(caneSpur, Math.max(90, caneLen * 0.72));
  if (millHit) {
    const left = { x: -millHit.dir.z, z: millHit.dir.x };
    const fwd = millHit.dir;
    const peel = (ang: number, depth: number): XZ[] => {
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      const dir = { x: left.x * c + fwd.x * s, z: left.z * c + fwd.z * s };
      return linePoints(offsetBy(millHit.at, dir, 7.2), offsetBy(millHit.at, dir, depth), 4);
    };
    roads.push(paved("Mill Fork", peel(0.42, 96), millHit.at, {}, 7.2, millHit.at));
    roads.push(paved("Cane End", peel(-0.42, 88), millHit.at, {}, 7.2, millHit.at));
  }
  const brakeHit = pointAlong(caneSpur, caneLen * 0.48);
  if (brakeHit) {
    const left = { x: -brakeHit.dir.z, z: brakeHit.dir.x };
    const side = hash(17) > 0.5 ? 1 : -1;
    roads.push(
      paved(
        "Brake Lane",
        linePoints(offsetBy(brakeHit.at, left, 7.2 * side), offsetBy(brakeHit.at, left, 70 * side), 4),
        brakeHit.at,
        {},
        7.2,
        brakeHit.at,
      ),
    );
  }

  const strandForHigh = roads.find((r) => r.name === "South Strand")!;
  const highDest = sampleSpline(
    [
      { x: saltwind.x - 240, z: saltwind.z - 80 },
      { x: saltwind.x + 260, z: saltwind.z + 110 },
    ],
    6,
  );
  const highAlong = Math.max(40, polylineLen(strandForHigh.points) * 0.78);
  const highFork = forkFromTrunk(strandForHigh.points, highAlong, highDest, 7.2);
  const highStreet = highFork ? highFork.pts : wiggleLine({ x: saltwind.x - 240, z: saltwind.z - 80 }, { x: saltwind.x + 260, z: saltwind.z + 110 }, 10, 12, 19);
  roads.push(paved("Saltwind High St", highStreet, highFork?.at ?? strandForHigh.points[strandForHigh.points.length - 1]!, {}, 0));
  for (let i = 0; i < 4; i++) {
    const hit = pointAlong(highStreet, polylineLen(highStreet) * (0.2 + i * 0.2));
    if (!hit) continue;
    const side = i % 2 ? 1 : -1;
    const kerb = 7.2;
    const start = offsetBy(hit.at, { x: -hit.dir.z * side, z: hit.dir.x * side }, kerb);
    const end = offsetBy(hit.at, { x: -hit.dir.z * side, z: hit.dir.x * side }, kerb + 48 + i * 6);
    roads.push(paved(`Saltwind Alley ${i + 1}`, linePoints(start, end, 3), hit.at, {}, kerb, hit.at));
  }

  const passSpur = trimNearPoint(leaveRing(ash, [ashPass]), ashPass, 16);
  roads.push(paved("Pass Rd", passSpur, ash, {}, 0));

  const havenStart = leaveRing(haven, [eastHaven])[0]!;
  const havenSpur = trimNearPoint(wiggleLine(havenStart, eastHaven, 12, 28, 23), eastHaven, 24);
  roads.push(paved("Haven Rd", havenSpur, haven, {}, 0));
  const loop: XZ[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = (i / 20) * Math.PI * 2;
    loop.push({ x: eastHaven.x + Math.cos(t) * 92, z: eastHaven.z + Math.sin(t) * 68 });
  }
  roads.push(paved("Haven Crescent", loop, eastHaven, {}, 22));

  addHamletsAlong(roads, caneSpur, cane, "Cane", 41, 7.2, { avoid: circuses });
  addHamletsAlong(roads, havenSpur, haven, "Haven", 53, 7.2, { avoid: circuses });
  addHamletsAlong(roads, roads.find((r) => r.name === "South Strand")!.points, harbour, "Strand", 67, 7.2, {
    avoid: circuses,
  });
  for (const seg of hwySegs) addHamletsAlong(roads, seg.points, harbour, "Hwy", 79, 16, { avoid: circuses });
  addHamletsAlong(roads, passSpur, ash, "Ash", 88, 7.2, { fromM: 70, avoid: circuses });

  const clear: ClearRoad[] = roads.map((r) => ({
    points: r.points,
    clear: r.name === "Island Hwy" || r.lanes === 4 ? HIGHWAY_CLEAR_M : r.roundabout ? 22 : STREET_CLEAR,
  }));
  // Split spans omit the circus chords; lots must still clear the highway spine
  // that distToPaved / height grade use (ROAD_CLEAR = STREET_CLEAR = 11).
  clear.push({ points: southHighwaySpline(), clear: STREET_CLEAR });

  const base = { spec, heightAt, clear };

  plazaAt(lots, quayward, "Quayward", base, 22, 18);
  plazaAt(lots, canebrake, "Canebrake", base, 26, 20);
  plazaAt(lots, saltwind, "Saltwind", base, 30, 16);
  plazaAt(lots, ashPass, "Ash Pass", base, 20, 20);
  plazaAt(lots, { x: eastHaven.x, z: eastHaven.z }, "East Haven", base, 24, 20);

  const streetOpts = { ...base, band: "street" as const, fromM: 16, toM: 1200, cutM: 16, seed: 3, sides: [-1, 1] as (-1 | 1)[] };

  lotsAlong(lots, roads.find((r) => r.name === "Quayward Rd")!.points, {
    ...streetOpts,
    street: "Quayward Rd",
    toM: 180,
    seed: 11,
  });
  for (const r of roads.filter((x) => x.name?.startsWith("Quayward ") && x.name !== "Quayward Rd" && x.name !== "Quayward Path")) {
    lotsAlong(lots, r.points, { ...streetOpts, street: r.name || "Quayward", toM: 160, cutM: 16, seed: 15 });
  }

  lotsAlong(lots, roads.find((r) => r.name === "Canebrake Rd")!.points, {
    ...streetOpts,
    street: "Canebrake Rd",
    fromM: 24,
    toM: 1100,
    cutM: 16,
    seed: 21,
  });
  for (const name of ["Mill Fork", "Cane End", "Brake Lane"]) {
    const r = roads.find((x) => x.name === name);
    if (r) lotsAlong(lots, r.points, { ...streetOpts, street: name, toM: 160, seed: 22 });
  }

  lotsAlong(lots, highStreet, { ...streetOpts, street: "Saltwind High St", fromM: 12, toM: 560, cutM: 20, seed: 31 });
  for (const r of roads.filter((x) => x.name?.startsWith("Saltwind Alley"))) {
    lotsAlong(lots, r.points, { ...streetOpts, street: r.name || "Alley", toM: 80, cutM: 18, seed: 32 });
  }

  lotsAlong(lots, passSpur, { ...streetOpts, street: "Pass Rd", toM: 140, seed: 41 });

  lotsAlong(lots, havenSpur, { ...streetOpts, street: "Haven Rd", fromM: 40, toM: 1200, cutM: 22, seed: 51 });
  lotsAlong(lots, loop, { ...streetOpts, street: "Haven Crescent", fromM: 8, toM: 900, cutM: 22, seed: 52 });

  for (const r of roads.filter((x) => x.kind === "paved" && x.name?.includes(" Row "))) {
    lotsAlong(lots, r.points, { ...streetOpts, street: r.name || "Row", fromM: 6, toM: 140, cutM: 18, seed: 60 });
  }

  const shoreOpts = {
    ...base,
    band: "shore" as const,
    zone: "commercial" as const,
    fromM: 24,
    toM: 1100,
    cutM: 20,
    setback: 11,
    sides: [-1, 1] as (-1 | 1)[],
    seed: 70,
  };
  lotsAlong(lots, roads.find((r) => r.name === "Channel Sands")!.points, {
    ...shoreOpts,
    street: "Channel Sands",
    toM: 760,
    seed: 71,
  });
  lotsAlong(lots, roads.find((r) => r.name === "Palm Arc")!.points, {
    ...shoreOpts,
    street: "Palm Arc",
    toM: 520,
    seed: 72,
  });
  lotsAlong(lots, roads.find((r) => r.name === "South Strand")!.points, {
    ...shoreOpts,
    street: "South Strand",
    fromM: 40,
    toM: 1200,
    cutM: 20,
    seed: 73,
  });

  const fieldOpts = {
    ...base,
    band: "field" as const,
    fromM: 8,
    toM: 220,
    cutM: 36,
    setback: 16,
    sides: [-1, 1] as (-1 | 1)[],
    seed: 80,
  };
  for (const r of roads.filter((x) => x.kind === "dirt")) {
    lotsAlong(lots, r.points, { ...fieldOpts, street: r.name || "Field Lane", seed: 81 + (r.name?.length ?? 0) });
  }

  // Extra inland fields off the long drives.
  const fieldRoads = [roads.find((x) => x.name === "Canebrake Rd")!, roads.find((x) => x.name === "Haven Rd")!].filter(
    Boolean,
  );
  for (const r of fieldRoads) {
    const pts = r.points;
    if (pts.length < 3) continue;
    for (const frac of [0.28, 0.48, 0.68, 0.84]) {
      const i = Math.min(pts.length - 2, Math.max(1, Math.floor(frac * (pts.length - 1))));
      const a = pts[i]!;
      const b = pts[i + 1]!;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz) || 1;
      for (const side of [-1, 1] as const) {
        const p = { x: (-dz / len) * side, z: (dx / len) * side };
        const field = quad(a, b, p, 18, 72 + hash(frac * 9 + side + (r.name?.length ?? 1)) * 24, 0.04);
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
