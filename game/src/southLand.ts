/**
 * South island road network, empty town footprints, beach and field lots.
 * Zero buildings. NPC town seeding stays North-only.
 *
 * Roads are authored as a graph (see roadGraph.ts): every junction is a node
 * and every edge physically ends on its nodes. Nothing is "near" anything —
 * the network is connected by construction, so the renderer and the taxi
 * cannot disagree about where the tarmac is.
 */

import { bboxOverlap, ringBBox, ringsOverlap } from "./kernel/plots.ts";
import {
  distToPolyline,
  inVolcanoExclusion,
  linePoints,
  sampleSpline,
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
import {
  RoadGraphBuilder,
  graphToRoads,
  roadWidthM,
  type RoadClass,
  type RoadGraph,
  type RoadNode,
} from "./roadGraph.ts";
import { zoneForBand } from "./zones.ts";
import type { IslandSpec, Parcel, PlotBand, PlotClass, Ring, Road, TaxiStop } from "./land.ts";

export type SouthBuilt = {
  plots: Parcel[];
  roads: Road[];
  stops: TaxiStop[];
  graph: RoadGraph;
};

type HeightFn = (spec: IslandSpec, x: number, z: number) => number;

/** Circus kerb radius. Edges stop here; the ring carries traffic round. */
const RAB_R = 34;

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

type Station = { at: XZ; dir: XZ; perp: XZ };

function stationAt(pts: XZ[], dist: number): Station | null {
  let left = dist;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    if (left <= len) {
      const t = left / len;
      const dir = { x: (b.x - a.x) / len, z: (b.z - a.z) / len };
      return {
        at: { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t },
        dir,
        perp: { x: -dir.z, z: dir.x },
      };
    }
    left -= len;
  }
  return null;
}

/** Interior shaping points strictly between two distances along a path. */
function sliceBetween(pts: XZ[], fromM: number, toM: number): XZ[] {
  const out: XZ[] = [];
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const at = acc + len;
    if (at > fromM + 1 && at < toM - 1) out.push({ x: b.x, z: b.z });
    acc = at;
  }
  return out;
}

function offsetBy(at: XZ, dir: XZ, m: number): XZ {
  return { x: at.x + dir.x * m, z: at.z + dir.z * m };
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
  // Floor low enough that a small South stall plot still prices below North
  // land per m². A $24 floor made the tiniest lots the dearest on the board.
  return Math.max(12, Math.round(area * 0.12 * bandMul * distMul));
}

function publicQuay(x: number, z: number): boolean {
  const along = (z - SOUTH_PORT.z) * -1;
  const across = Math.abs(x - SOUTH_PORT.x);
  const east = x - SOUTH_PORT.x;
  if (across < 36 && along > -18 && along < 16) return true;
  if (east > 18 && east < 280 && along > -24 && along < 8) return true;
  return false;
}

type Box = { minX: number; maxX: number; minZ: number; maxZ: number };
type ClearRoad = { points: XZ[]; clear: number; box?: Box };

function pointsBox(pts: XZ[], pad: number): Box {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }
  return { minX: minX - pad, maxX: maxX + pad, minZ: minZ - pad, maxZ: maxZ + pad };
}

function ringBox(ring: Ring): Box {
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

function boxesMiss(a: Box, b: Box): boolean {
  return a.maxX < b.minX || a.minX > b.maxX || a.maxZ < b.minZ || a.minZ > b.maxZ;
}

/** Keep a lot off the tarmac, the sidewalk, and a metre of verge past it. */
function clearanceFor(road: Road): number {
  if (road.roundabout) return RAB_R + 10;
  return roadWidthM((road.cls ?? "street") as RoadClass) / 2 + 4;
}

function ringHitsRoads(ring: Ring, roads: ClearRoad[]): boolean {
  // Most roads are nowhere near most lots. Reject on bounding boxes first;
  // without this the per-lot polyline sweep dominates board build time.
  const box = ringBox(ring);
  const near: ClearRoad[] = [];
  for (const r of roads) {
    const rb = r.box ?? (r.box = pointsBox(r.points, r.clear + 2));
    if (!boxesMiss(box, rb)) near.push(r);
  }
  if (!near.length) return false;

  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(2, Math.ceil(len / 2));
    for (let s = 0; s <= n; s++) {
      const t = s / n;
      const x = a[0] + (b[0] - a[0]) * t;
      const z = a[1] + (b[1] - a[1]) * t;
      for (const r of near) {
        if (distToPolyline(r.points, x, z) < r.clear) return true;
      }
    }
  }
  for (const r of near) {
    for (const p of r.points) {
      if (p.x < box.minX || p.x > box.maxX || p.z < box.minZ || p.z > box.maxZ) continue;
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
        const depth = opts.band === "field" ? 70 + hk * 28 : 12 + hk * 8;
        const lot = quad(sa, sb, p, opts.setback ?? 12, depth, (hk - 0.5) * 0.06);
        pushParcel(lots, lot, opts);
      }
    }
    acc += segLen;
  }
}

/** One by-right commercial street lot within ~80 m of the south quay. */
function seedPortStreetLot(
  lots: Parcel[],
  roads: Road[],
  base: Omit<PushOpts, "street" | "band">,
): void {
  const hwy = roads.find(
    (r) =>
      r.name === "Island Hwy" &&
      r.points.some((p) => Math.hypot(p.x - SOUTH_PORT.x, p.z - SOUTH_PORT.z) < 6),
  );
  if (!hwy) return;
  const setback = clearanceFor(hwy) + 2;
  const front = 16;
  for (const dist of [40, 48, 36, 56, 64, 72]) {
    const st = stationAt(hwy.points, dist);
    if (!st) continue;
    const sa = offsetBy(st.at, { x: -st.dir.x, z: -st.dir.z }, front / 2);
    const sb = offsetBy(st.at, st.dir, front / 2);
    for (const side of [-1, 1] as const) {
      const perp = { x: st.perp.x * side, z: st.perp.z * side };
      const ring = quad(sa, sb, perp, setback, 14, 0);
      if (
        pushParcel(lots, ring, {
          ...base,
          street: "Island Hwy",
          band: "street",
          zone: "commercial",
        })
      ) {
        return;
      }
    }
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

/**
 * A run of road broken at real junction nodes.
 * Returns the nodes so side roads can hang off them.
 */
function runWithJunctions(
  g: RoadGraphBuilder,
  name: string,
  cls: RoadClass,
  from: RoadNode,
  to: RoadNode,
  path: XZ[],
  fractions: number[],
  idStem: string,
  smooth = false,
): { nodes: RoadNode[]; path: XZ[] } {
  const len = polylineLen(path);
  const cuts = fractions
    .map((f) => ({ f, d: len * f }))
    .filter((c) => c.d > 60 && c.d < len - 60)
    .sort((a, b) => a.d - b.d);

  const nodes: RoadNode[] = [];
  let prev = from;
  let prevD = 0;
  cuts.forEach((cut, i) => {
    const st = stationAt(path, cut.d);
    if (!st) return;
    const node = g.node(`${idStem}-j${i + 1}`, st.at.x, st.at.z, "junction");
    g.edge({ name, cls, from: prev, to: node, via: sliceBetween(path, prevD, cut.d), smooth });
    nodes.push(node);
    prev = node;
    prevD = cut.d;
  });
  g.edge({ name, cls, from: prev, to, via: sliceBetween(path, prevD, len), smooth });
  return { nodes, path };
}

/** A field track running on past the end of a paved lane. */
function fieldTrack(
  g: RoadGraphBuilder,
  from: RoadNode,
  dir: XZ,
  name: string,
  id: string,
  seed: number,
): void {
  const len = 70 + hash(seed) * 46;
  const end = offsetBy({ x: from.x, z: from.z }, dir, len);
  if (inVolcanoExclusion(end.x, end.z, 40)) return;
  const endNode = g.node(id, end.x, end.z, "terminus");
  g.edge({
    name,
    cls: "track",
    from,
    to: endNode,
    via: wiggleLine({ x: from.x, z: from.z }, end, 5, 12, seed).slice(1, -1),
  });
}

/** Direction a dead-end lane was heading when it stopped. */
function headingInto(node: RoadNode, prev: XZ): XZ {
  const dx = node.x - prev.x;
  const dz = node.z - prev.z;
  const len = Math.hypot(dx, dz) || 1;
  return { x: dx / len, z: dz / len };
}

/** A single-track lane off a junction, with a field track carrying on past it. */
function spurFrom(
  g: RoadGraphBuilder,
  node: RoadNode,
  path: XZ[],
  stem: string,
  index: number,
  side: 1 | -1,
  seed: number,
): void {
  const along = polylineLen(path);
  const st = stationAt(path, Math.min(along - 1, Math.max(1, nearestAlong(path, node))));
  if (!st) return;
  const perp = { x: st.perp.x * side, z: st.perp.z * side };
  const depth = 74 + hash(seed + index) * 30;
  const end = offsetBy({ x: node.x, z: node.z }, perp, depth);
  const endNode = g.node(`${stem}-row${index}-end`, end.x, end.z, "terminus");
  g.edge({ name: `${stem} Row ${index}`, cls: "lane", from: node, to: endNode });
  fieldTrack(g, endNode, perp, `${stem} Track ${index}`, `${stem}-track${index}-end`, seed + index);
}

function nearestAlong(pts: XZ[], at: XZ): number {
  let acc = 0;
  let bestAlong = 0;
  let bestD = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const vx = b.x - a.x;
    const vz = b.z - a.z;
    const len = Math.hypot(vx, vz) || 1;
    let t = ((at.x - a.x) * vx + (at.z - a.z) * vz) / (len * len);
    t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(at.x - (a.x + vx * t), at.z - (a.z + vz * t));
    if (d < bestD) {
      bestD = d;
      bestAlong = acc + t * len;
    }
    acc += len;
  }
  return bestAlong;
}

/**
 * Field tracks wander, and a wandering track can swing back over a street.
 * Drop any that does. Dirt crossing tarmac is exactly what the taxi used to
 * be blamed for, and it looks wrong even when nothing drives it.
 */
const TRACK_CLEAR_M = 7;

function pruneStrayTracks(graph: RoadGraph): RoadGraph {
  const paved = graph.edges.filter((e) => e.cls !== "track");
  const boxes = paved.map((e) => ({ e, box: pointsBox(e.points, TRACK_CLEAR_M + 2) }));
  const keep = graph.edges.filter((edge) => {
    if (edge.cls !== "track") return true;
    const start = edge.points[0]!;
    for (const p of edge.points) {
      // The first stretch legitimately touches the lane it leaves.
      if (Math.hypot(p.x - start.x, p.z - start.z) < 20) continue;
      for (const { e, box } of boxes) {
        if (p.x < box.minX || p.x > box.maxX || p.z < box.minZ || p.z > box.maxZ) continue;
        if (distToPolyline(e.points, p.x, p.z) < TRACK_CLEAR_M) return false;
      }
    }
    return true;
  });
  const used = new Set(keep.flatMap((e) => [e.a, e.b]));
  return { nodes: graph.nodes.filter((n) => used.has(n.id)), edges: keep };
}

/** The whole South network, authored once as nodes and edges. */
function buildSouthGraph(): RoadGraph {
  const g = new RoadGraphBuilder("south");

  const harbour = SOUTH_RAB.harbour;
  const cane = SOUTH_RAB.west;
  const ash = SOUTH_RAB.pass;
  const haven = SOUTH_RAB.east;

  const nPort = g.node("s-port", SOUTH_PORT.x, SOUTH_PORT.z, "terminus", "South Port");
  const nHarbour = g.circus("s-rab-harbour", harbour.x, harbour.z, RAB_R, harbour.name);
  const nCane = g.circus("s-rab-cane", cane.x, cane.z, RAB_R, cane.name);
  const nAsh = g.circus("s-rab-ash", ash.x, ash.z, RAB_R, ash.name);
  const nHaven = g.circus("s-rab-haven", haven.x, haven.z, RAB_R, haven.name);
  const nEast = g.node("s-east", 2920, 7860, "terminus", "East Shore");

  const HWY = "Island Hwy";
  g.edge({ name: HWY, cls: "highway", from: nPort, to: nHarbour });
  // Channel Sands needs a real junction on this span, so the span is built in
  // two edges that meet at that node rather than one edge it merely touches.
  const hwyHarbourCanePath = sampleSpline(
    [
      { x: harbour.x, z: harbour.z },
      { x: -1520, z: 7560 },
      { x: cane.x, z: cane.z },
    ],
    8,
  );
  const hwyHarbourCane = runWithJunctions(
    g,
    HWY,
    "highway",
    nHarbour,
    nCane,
    hwyHarbourCanePath,
    [0.32],
    "s-hwy-hc",
    true,
  );
  g.edge({
    name: HWY,
    cls: "highway",
    from: nCane,
    to: nAsh,
    via: [
      { x: -240, z: 7840 },
      { x: 480, z: 7960 },
    ],
    smooth: true,
  });
  g.edge({ name: HWY, cls: "highway", from: nAsh, to: nHaven, via: [{ x: 1920, z: 7780 }], smooth: true });
  g.edge({ name: HWY, cls: "highway", from: nHaven, to: nEast });

  const quayward = SOUTH_TOWNS[0]!;
  const canebrake = SOUTH_TOWNS[1]!;
  const saltwind = SOUTH_TOWNS[2]!;
  const ashPass = SOUTH_TOWNS[3]!;
  const eastHaven = SOUTH_TOWNS[4]!;

  // Harbour Circus keeps three exits: the two highway spans and Quayward Rd.
  // The loop is a true rectangle. Quayward Rd hits the north edge at 45° so
  // the two north arms are due east-west — not a ~5° smashed diagonal.
  const hx = 74;
  const hz = 52;
  const northZ = quayward.z - hz;
  const nQuayward = g.node("s-quayward", harbour.x + (northZ - harbour.z), northZ, "junction");
  g.edge({ name: "Quayward Rd", cls: "avenue", from: nHarbour, to: nQuayward });

  const corners: RoadNode[] = [
    g.node("s-quay-nw", quayward.x - hx, northZ, "junction"),
    g.node("s-quay-ne", quayward.x + hx, northZ, "junction"),
    g.node("s-quay-se", quayward.x + hx, quayward.z + hz, "junction"),
    g.node("s-quay-sw", quayward.x - hx, quayward.z + hz, "junction"),
  ];
  g.edge({ name: "Quayward Loop", cls: "street", from: nQuayward, to: corners[0]! });
  g.edge({ name: "Quayward Loop", cls: "street", from: nQuayward, to: corners[1]! });
  g.edge({ name: "Quayward Loop", cls: "street", from: corners[1]!, to: corners[2]! });
  g.edge({ name: "Quayward Loop", cls: "street", from: corners[2]!, to: corners[3]! });
  g.edge({ name: "Quayward Loop", cls: "street", from: corners[3]!, to: corners[0]! });

  // South Strand continues the west side of the block due south (90°), then
  // turns 90° east and 90° south into Saltwind. No smashed diagonals.
  const sw = corners[3]!;
  const nPalmJ = g.node("s-strand-palm", sw.x, sw.z + 96, "junction");
  const nStrandKink = g.node("s-strand-east", sw.x, saltwind.z - 140, "junction");
  const nAppr = g.node("s-strand-appr", saltwind.x, saltwind.z - 140, "junction");
  const nSaltwind = g.node("s-saltwind", saltwind.x, saltwind.z, "junction");
  g.edge({ name: "South Strand", cls: "avenue", from: sw, to: nPalmJ });
  g.edge({ name: "South Strand", cls: "avenue", from: nPalmJ, to: nStrandKink });
  g.edge({ name: "South Strand", cls: "avenue", from: nStrandKink, to: nAppr });
  g.edge({ name: "South Strand", cls: "avenue", from: nAppr, to: nSaltwind });

  const nPalmTurn = g.node("s-palm-turn", nPalmJ.x + 400, nPalmJ.z, "junction");
  const palmEnd = g.node("s-palm-end", nPalmTurn.x + 220, nPalmTurn.z + 220, "terminus");
  g.edge({ name: "Palm Arc", cls: "street", from: nPalmJ, to: nPalmTurn });
  g.edge({ name: "Palm Arc", cls: "street", from: nPalmTurn, to: palmEnd });

  // Channel Sands leaves the highway east of Harbour Circus, not the ring.
  const nChannel = hwyHarbourCane.nodes[0];
  if (nChannel) {
    const nChannelEnd = g.node("s-channel-end", -420, 7220, "terminus");
    g.edge({
      name: "Channel Sands",
      cls: "street",
      from: nChannel,
      to: nChannelEnd,
      via: [
        { x: -1400, z: 7320 },
        { x: -980, z: 7250 },
      ],
      smooth: true,
    });
  }

  // Saltwind High St crosses the town green from the Strand.
  const nHighEast = g.node("s-high-east", saltwind.x + 280, saltwind.z, "terminus");
  const highPath = linePoints({ x: saltwind.x, z: saltwind.z }, { x: saltwind.x + 280, z: saltwind.z }, 5);
  const highRun = runWithJunctions(
    g,
    "Saltwind High St",
    "street",
    nSaltwind,
    nHighEast,
    highPath,
    [0.34, 0.68],
    "s-high",
  );
  highRun.nodes.forEach((node, i) => {
    const side: 1 | -1 = i % 2 ? 1 : -1;
    const st = stationAt(highPath, nearestAlong(highPath, node));
    if (!st) return;
    const dir = { x: st.perp.x * side, z: st.perp.z * side };
    const end = offsetBy({ x: node.x, z: node.z }, dir, 62 + i * 8);
    const endNode = g.node(`s-high-alley${i + 1}`, end.x, end.z, "terminus");
    g.edge({ name: `Saltwind Alley ${i + 1}`, cls: "lane", from: node, to: endNode });
    fieldTrack(g, endNode, dir, `Saltwind Track ${i + 1}`, `s-high-track${i + 1}`, 130 + i);
  });

  // Canebrake Rd runs inland off Cane Circus with hamlet junctions on the way.
  // The junction sits short of the green — a town square is not a crossroads.
  const nCanebrake = g.node("s-canebrake", canebrake.x, canebrake.z - 62, "junction");
  const canePath = wiggleLine({ x: cane.x, z: cane.z }, { x: canebrake.x, z: canebrake.z - 62 }, 10, 40, 7);
  const caneRun = runWithJunctions(
    g,
    "Canebrake Rd",
    "avenue",
    nCane,
    nCanebrake,
    canePath,
    [0.32, 0.55, 0.78],
    "s-cane",
    true,
  );
  caneRun.nodes.forEach((node, i) => spurFrom(g, node, canePath, "Cane", i + 1, i % 2 ? 1 : -1, 41));
  const nMill = g.node("s-mill-end", canebrake.x + 108, canebrake.z - 96, "terminus");
  g.edge({ name: "Mill Fork", cls: "lane", from: nCanebrake, to: nMill });
  fieldTrack(g, nMill, headingInto(nMill, nCanebrake), "Mill Track", "s-mill-track", 61);
  const nBrake = g.node("s-brake-end", canebrake.x - 96, canebrake.z - 88, "terminus");
  g.edge({ name: "Brake Lane", cls: "lane", from: nCanebrake, to: nBrake });
  fieldTrack(g, nBrake, headingInto(nBrake, nCanebrake), "Brake Track", "s-brake-track", 67);

  // Pass Rd off Ash Circus.
  const nAshPass = g.node("s-ashpass", ashPass.x, ashPass.z - 58, "junction");
  const passPath = linePoints({ x: ash.x, z: ash.z }, { x: ashPass.x, z: ashPass.z - 58 }, 5);
  const passRun = runWithJunctions(g, "Pass Rd", "avenue", nAsh, nAshPass, passPath, [0.42, 0.7], "s-pass");
  passRun.nodes.forEach((node, i) => spurFrom(g, node, passPath, "Ash", i + 1, i % 2 ? 1 : -1, 88));

  // Haven Rd and a crescent round East Haven.
  const nHavenTown = g.node("s-easthaven", eastHaven.x, eastHaven.z - 70, "junction");
  const havenPath = wiggleLine({ x: haven.x, z: haven.z }, { x: eastHaven.x, z: eastHaven.z - 70 }, 10, 32, 23);
  const havenRun = runWithJunctions(
    g,
    "Haven Rd",
    "avenue",
    nHaven,
    nHavenTown,
    havenPath,
    [0.34, 0.58, 0.8],
    "s-haven",
    true,
  );
  havenRun.nodes.forEach((node, i) => spurFrom(g, node, havenPath, "Haven", i + 1, i % 2 ? -1 : 1, 53));
  const cw = g.node("s-haven-w", eastHaven.x - 96, eastHaven.z + 12, "junction");
  const ce = g.node("s-haven-e", eastHaven.x + 96, eastHaven.z + 12, "junction");
  const cs = g.node("s-haven-s", eastHaven.x, eastHaven.z + 96, "junction");
  g.edge({ name: "Haven Crescent", cls: "street", from: nHavenTown, to: cw, via: [{ x: eastHaven.x - 92, z: eastHaven.z - 48 }], smooth: true });
  g.edge({ name: "Haven Crescent", cls: "street", from: cw, to: cs, via: [{ x: eastHaven.x - 78, z: eastHaven.z + 74 }], smooth: true });
  g.edge({ name: "Haven Crescent", cls: "street", from: cs, to: ce, via: [{ x: eastHaven.x + 78, z: eastHaven.z + 74 }], smooth: true });
  g.edge({ name: "Haven Crescent", cls: "street", from: ce, to: nHavenTown, via: [{ x: eastHaven.x + 92, z: eastHaven.z - 48 }], smooth: true });
  fieldTrack(g, cs, { x: 0, z: 1 }, "Haven Track", "s-haven-track-s", 71);
  fieldTrack(g, nAshPass, { x: 0, z: 1 }, "Pass Track", "s-pass-track", 77);
  fieldTrack(g, nCanebrake, { x: 0, z: 1 }, "Canebrake Track", "s-cane-track-s", 83);

  return pruneStrayTracks(g.build());
}

export function buildSouthLand(spec: IslandSpec, heightAt: HeightFn): SouthBuilt {
  const lots: Parcel[] = [];
  const graph = buildSouthGraph();
  const roads = graphToRoads(graph);

  const quayward = SOUTH_TOWNS[0]!;
  const canebrake = SOUTH_TOWNS[1]!;
  const saltwind = SOUTH_TOWNS[2]!;
  const ashPass = SOUTH_TOWNS[3]!;
  const eastHaven = SOUTH_TOWNS[4]!;

  const clear: ClearRoad[] = roads.map((r) => ({ points: r.points, clear: clearanceFor(r) }));
  // Split spans stop at the circus kerb, but the island spine still runs through
  // the middle of each circus. Lots clear that too (see distToPaved in land.ts).
  clear.push({ points: southHighwaySpline(), clear: 17 });

  const base = { spec, heightAt, clear };

  plazaAt(lots, quayward, "Quayward", base, 22, 18);
  plazaAt(lots, canebrake, "Canebrake", base, 26, 20);
  plazaAt(lots, saltwind, "Saltwind", base, 30, 16);
  plazaAt(lots, ashPass, "Ash Pass", base, 20, 20);
  plazaAt(lots, eastHaven, "East Haven", base, 24, 20);

  // One cheap street stall next to the south pad. Quayward $ lots sit ~350 m
  // inland; without this the spawn camera never sees a buyable $ tag.
  seedPortStreetLot(lots, roads, base);

  const byName = (name: string) => roads.filter((r) => r.name === name && !r.roundabout);
  const streetOpts = {
    ...base,
    band: "street" as const,
    fromM: 8,
    toM: 4000,
    cutM: 17,
    seed: 3,
    sides: [-1, 1] as (-1 | 1)[],
  };

  const frontages: { name: string; seed: number; cut?: number }[] = [
    { name: "Quayward Rd", seed: 11 },
    { name: "Quayward Loop", seed: 15, cut: 16 },
    { name: "South Strand", seed: 21 },
    { name: "Saltwind High St", seed: 31, cut: 16 },
    { name: "Canebrake Rd", seed: 41 },
    { name: "Pass Rd", seed: 45 },
    { name: "Haven Rd", seed: 51 },
    { name: "Haven Crescent", seed: 52, cut: 18 },
    { name: "Mill Fork", seed: 55, cut: 15 },
    { name: "Brake Lane", seed: 56, cut: 15 },
  ];
  for (const f of frontages) {
    for (const road of byName(f.name)) {
      lotsAlong(lots, road.points, {
        ...streetOpts,
        street: f.name,
        cutM: f.cut ?? streetOpts.cutM,
        setback: clearanceFor(road) + 1,
        seed: f.seed,
      });
    }
  }

  for (const road of roads.filter((r) => r.cls === "lane")) {
    lotsAlong(lots, road.points, {
      ...streetOpts,
      street: road.name || "Lane",
      cutM: 15,
      setback: clearanceFor(road) + 1,
      seed: 60 + (road.name?.length ?? 0),
    });
  }

  const shoreOpts = {
    ...base,
    band: "shore" as const,
    zone: "commercial" as const,
    fromM: 12,
    toM: 3000,
    cutM: 19,
    sides: [-1, 1] as (-1 | 1)[],
    seed: 70,
  };
  for (const name of ["Channel Sands", "Palm Arc"]) {
    for (const road of byName(name)) {
      lotsAlong(lots, road.points, {
        ...shoreOpts,
        street: name,
        setback: clearanceFor(road) + 1,
        seed: 71 + name.length,
      });
    }
  }

  const fieldOpts = {
    ...base,
    band: "field" as const,
    fromM: 6,
    toM: 400,
    cutM: 38,
    setback: 14,
    sides: [-1, 1] as (-1 | 1)[],
    seed: 80,
  };
  for (const road of roads.filter((r) => r.cls === "track")) {
    lotsAlong(lots, road.points, {
      ...fieldOpts,
      street: road.name || "Field Lane",
      seed: 81 + (road.name?.length ?? 0),
    });
  }

  const stops = southTaxiStops();
  return { plots: lots, roads, stops, graph };
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
