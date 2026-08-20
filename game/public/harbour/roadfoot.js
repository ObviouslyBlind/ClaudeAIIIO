/**
 * Junction hubs: one contour per node (SeloSlav / PathPhalt), not stacked
 * rectangles. Ribbons stop on that outline so the visible kerb is one edge.
 *
 * Island-wide union filled greens. Hubs only exist at joins.
 */
import polygonClipping from "./vendor/polygon-clipping.js";
import { carriagewayWidthM, roadClassSpec } from "./roadclass.js";
import { circusMeshRadii } from "./roadclip.js";

/** Keep in sync with SHOULDER_PAD_M in roads.js. */
export const FOOT_SHOULDER_M = 2.2;
/**
 * Lip past the circus outer ring. PathPhalt/Curva: the ring is the join;
 * this only covers the chord where a ribbon meets the circle. 12 m stubs
 * sat in the grass as extra black rectangles.
 */
export const CIRCUS_ARM_STUB_M = 2.4;
/** Overlap the ring so a 1-px sand seam cannot show at the lip. */
export const CIRCUS_ARM_TUCK_M = 2;

function clsOf(road) {
  if (road.cls) return road.cls;
  if (road.kind === "dirt") return "track";
  if (road.lanes === 4) return "highway";
  if (/Harbour Rd/.test(road.name || "")) return "avenue";
  return "street";
}

export function isNetworkRoad(road) {
  return !!road && road.kind === "paved" && !road.roundabout && road.lanes !== 4;
}

function closeRing(ring) {
  if (!ring.length) return ring;
  const a = ring[0];
  const b = ring[ring.length - 1];
  if (a[0] === b[0] && a[1] === b[1]) return ring;
  return ring.concat([[a[0], a[1]]]);
}

function snap(n) {
  return Math.round(n * 50) / 50;
}

export function circleRing(cx, cz, r, steps = 40) {
  const ring = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    ring.push([snap(cx + Math.cos(t) * r), snap(cz + Math.sin(t) * r)]);
  }
  return closeRing(ring);
}

/** Closed outline of a constant-width ribbon. Used to bite a join out of the end. */
export function ribbonOutline(pts, half) {
  if (!pts || pts.length < 2 || !(half > 0)) return null;
  const left = [];
  const right = [];
  for (let i = 0; i < pts.length; i++) {
    let dx;
    let dz;
    if (i === 0) {
      dx = pts[1].x - pts[0].x;
      dz = pts[1].z - pts[0].z;
    } else if (i === pts.length - 1) {
      dx = pts[i].x - pts[i - 1].x;
      dz = pts[i].z - pts[i - 1].z;
    } else {
      dx = pts[i + 1].x - pts[i - 1].x;
      dz = pts[i + 1].z - pts[i - 1].z;
    }
    const len = Math.hypot(dx, dz) || 1;
    const rx = dz / len;
    const rz = -dx / len;
    left.push([snap(pts[i].x - rx * half), snap(pts[i].z - rz * half)]);
    right.push([snap(pts[i].x + rx * half), snap(pts[i].z + rz * half)]);
  }
  return closeRing(left.concat(right.reverse()));
}

/**
 * Ribbon minus a join (circus disc or hub plate). Extending the centreline
 * into the join first is required: a strip clipped *on* the circle does not
 * overlap it, so a difference is a no-op and the end stays a square chord.
 */
export function biteRibbonWith(pts, half, cutter) {
  const ring = ribbonOutline(pts, half);
  if (!ring || !cutter || !cutter.length) return ring ? [[ring]] : [];
  return diffGeoms([[ring]], cutter);
}

function armDir(node, edge) {
  const pts = edge.points;
  const fromA = edge.a === node.id;
  const a = fromA ? pts[0] : pts[pts.length - 1];
  const b = fromA ? pts[1] : pts[pts.length - 2];
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  return { x: dx / len, z: dz / len };
}

/** Square-capped at the junction end only. The far end must not eat a block of kerb. */
export function segmentRing(a, b, half) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  const tx = dx / len;
  const tz = dz / len;
  const rx = tz * half;
  const rz = -tx * half;
  const ax = a.x - tx * half;
  const az = a.z - tz * half;
  const bx = b.x + tx * 0.2;
  const bz = b.z + tz * 0.2;
  return closeRing([
    [snap(ax + rx), snap(az + rz)],
    [snap(ax - rx), snap(az - rz)],
    [snap(bx - rx), snap(bz - rz)],
    [snap(bx + rx), snap(bz + rz)],
  ]);
}

export function unionGeoms(geoms) {
  if (!geoms.length) return [];
  if (geoms.length === 1) return [geoms[0]];
  try {
    const all = polygonClipping.union(...geoms);
    if (all && all.length) return all;
  } catch {
    /* pairwise below */
  }
  let acc = [geoms[0]];
  for (let i = 1; i < geoms.length; i++) {
    try {
      acc = polygonClipping.union(acc, geoms[i]);
    } catch {
      acc = acc.concat([geoms[i]]);
    }
  }
  return acc;
}

export function diffGeoms(subject, clip) {
  if (!subject || !subject.length) return [];
  if (!clip || !clip.length) return subject;
  try {
    const out = polygonClipping.difference(subject, clip);
    return out && out.length ? out : subject;
  } catch {
    return subject;
  }
}

export function ringContains(ring, x, z) {
  let inside = false;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i][0];
    const zi = ring[i][1];
    const xj = ring[j][0];
    const zj = ring[j][1];
    if (zi === zj) continue;
    const hit = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

export function multiContains(mp, x, z) {
  if (!mp) return false;
  for (const poly of mp) {
    if (!poly[0] || !ringContains(poly[0], x, z)) continue;
    let inHole = false;
    for (let h = 1; h < poly.length; h++) {
      if (ringContains(poly[h], x, z)) inHole = true;
    }
    if (!inHole) return true;
  }
  return false;
}

/**
 * Keep the parts of a polyline that sit outside `insideFn`.
 * Crossing segments are cut on the boundary so a kerb meets the hub
 * instead of stopping a densify-step short (the grey hairline).
 */
export function clipPolylineToOutside(pts, insideFn) {
  if (!pts || pts.length < 2 || !insideFn) return pts || [];
  const runs = [];
  let run = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const inn = insideFn(p.x, p.z);
    if (inn) {
      if (run.length) {
        const cut = boundaryPoint(run[run.length - 1], p, insideFn);
        if (cut) run.push(cut);
        if (run.length >= 2) runs.push(run);
        run = [];
      }
    } else {
      if (!run.length && i > 0 && insideFn(pts[i - 1].x, pts[i - 1].z)) {
        const cut = boundaryPoint(pts[i - 1], p, insideFn);
        if (cut) run.push(cut);
      }
      run.push(p);
    }
  }
  if (run.length >= 2) runs.push(run);
  return runs;
}

function boundaryPoint(insidePt, outsidePt, insideFn) {
  let a = insidePt;
  let b = outsidePt;
  if (!insideFn(a.x, a.z) && insideFn(b.x, b.z)) {
    a = outsidePt;
    b = insidePt;
  }
  if (!insideFn(a.x, a.z)) return { x: b.x, z: b.z };
  let cut = { x: b.x, z: b.z };
  for (let k = 0; k < 12; k++) {
    const t = 0.5;
    const p = { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
    if (insideFn(p.x, p.z)) a = p;
    else {
      cut = p;
      b = p;
    }
  }
  return cut;
}

/**
 * Radial join outline. At each angle, take the farthest point that still
 * sits inside some arm's rectangle *or* a kerb fillet disc. 15/30/45/90°
 * all fall out of the same loop. The kerb is a rounded T/L, not two
 * overlapping boxes and not a Clipper union of a disc that only touches.
 *
 * @param {{ x: number, z: number }} node
 * @param {{ dx: number, dz: number, half: number, reach: number }[]} arms
 * @param {number} extraHalf
 * @param {number} [steps]
 */
export function junctionContour(node, arms, extraHalf, steps, withFillets) {
  const n = steps || 128;
  const hub = Math.max(1.2, extraHalf + 0.8);
  const fillets = withFillets === false ? [] : filletSpecs(node, arms, extraHalf);
  const ring = [];
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2;
    const ux = Math.cos(ang);
    const uz = Math.sin(ang);
    let r = hub;
    for (const arm of arms) {
      const along = ux * arm.dx + uz * arm.dz;
      if (along <= 1e-4) continue;
      const lateral = Math.abs(ux * arm.dz - uz * arm.dx);
      const half = arm.half + extraHalf;
      const side = lateral <= 1e-5 ? Infinity : half / lateral;
      const front = arm.reach / along;
      r = Math.max(r, Math.min(side, front));
    }
    for (const f of fillets) {
      const hit = rayCircleFar(node.x, node.z, ux, uz, f.cx, f.cz, f.rad);
      if (hit != null) r = Math.max(r, hit);
    }
    ring.push([snap(node.x + ux * r), snap(node.z + uz * r)]);
  }
  return closeRing(ring);
}

/**
 * Circus outline: outer circle plus each paved arm, with a fillet disc
 * in each kerb armpit. Same radial-max contour as a T/L hub, so the join
 * is one kerb, not a ribbon slamming a RingGeometry.
 */
export function circusContour(node, arms, fillets, outer, steps) {
  const n = steps || 384;
  const hub = Math.max(8, outer || 0);
  const ring = [];
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2;
    const ux = Math.cos(ang);
    const uz = Math.sin(ang);
    let r = hub;
    for (const arm of arms || []) {
      const along = ux * arm.dx + uz * arm.dz;
      if (along <= 1e-4) continue;
      const lateral = Math.abs(ux * arm.dz - uz * arm.dx);
      const side = lateral <= 1e-5 ? Infinity : arm.half / lateral;
      const front = arm.reach / along;
      r = Math.max(r, Math.min(side, front));
    }
    for (const f of fillets || []) {
      const hit = rayCircleFar(node.x, node.z, ux, uz, f.cx, f.cz, f.rad);
      if (hit != null) r = Math.max(r, hit);
    }
    ring.push([snap(node.x + ux * r), snap(node.z + uz * r)]);
  }
  return closeRing(ring);
}

function rayCircleFar(ox, oz, ux, uz, cx, cz, rad) {
  const fx = ox - cx;
  const fz = oz - cz;
  const b = 2 * (fx * ux + fz * uz);
  const c = fx * fx + fz * fz - rad * rad;
  const disc = b * b - 4 * c;
  if (disc < 0) return null;
  const s = Math.sqrt(disc);
  const t = Math.max((-b - s) / 2, (-b + s) / 2);
  return t > 0.2 ? t : null;
}

function filletSpecs(node, arms, extraHalf) {
  const out = [];
  for (let i = 0; i < arms.length; i++) {
    for (let j = i + 1; j < arms.length; j++) {
      const a = arms[i];
      const b = arms[j];
      const ang = sectorAngle(a, b);
      if (ang < 0.44 || ang > 1.92) continue;
      const r = Math.min(1.2, Math.min(a.half, b.half) * 0.28, (2.4 * Math.sin(ang / 2)) / Math.sin(Math.PI / 4));
      if (r < 0.7) continue;
      const c = kerbIntersect(node, a, b, r);
      if (!c) continue;
      out.push({ cx: c.x, cz: c.z, rad: r + extraHalf });
    }
  }
  return out;
}

/** Outward offset of a closed [x,z] ring. Grit is this lip, not a second fat star. */
export function swellRing(ring, extra) {
  if (!ring || ring.length < 4 || !(extra > 0)) return ring;
  const pts = [];
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i];
    if (i === ring.length - 1 && p[0] === ring[0][0] && p[1] === ring[0][1]) continue;
    pts.push(p);
  }
  const n = pts.length;
  if (n < 3) return ring;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    area += a[0] * b[1] - b[0] * a[1];
  }
  const sign = area >= 0 ? 1 : -1;
  const out = [];
  const miterMax = extra * 2.2;
  for (let i = 0; i < n; i++) {
    const a = pts[(i + n - 1) % n];
    const b = pts[i];
    const c = pts[(i + 1) % n];
    const dx1 = b[0] - a[0];
    const dz1 = b[1] - a[1];
    const dx2 = c[0] - b[0];
    const dz2 = c[1] - b[1];
    const l1 = Math.hypot(dx1, dz1) || 1;
    const l2 = Math.hypot(dx2, dz2) || 1;
    const n1x = (sign * dz1) / l1;
    const n1z = (sign * -dx1) / l1;
    const n2x = (sign * dz2) / l2;
    const n2z = (sign * -dx2) / l2;
    const ox = n1x + n2x;
    const oz = n1z + n2z;
    const ol2 = ox * ox + oz * oz || 1;
    let mx = ox * ((extra * 2) / ol2);
    let mz = oz * ((extra * 2) / ol2);
    const ml = Math.hypot(mx, mz);
    if (ml > miterMax) {
      mx *= miterMax / ml;
      mz *= miterMax / ml;
    }
    out.push([snap(b[0] + mx), snap(b[1] + mz)]);
  }
  return closeRing(out);
}

function perpToward(arm, other) {
  let p = { x: arm.dz, z: -arm.dx };
  if (p.x * other.dx + p.z * other.dz < 0) p = { x: -p.x, z: -p.z };
  return p;
}

/** Intersection of two offset kerb lines. extra=0 is the square armpit. extra=r is a tangent fillet centre. */
function kerbIntersect(node, a, b, extra) {
  const aP = perpToward(a, b);
  const bP = perpToward(b, a);
  const det = aP.x * bP.z - aP.z * bP.x;
  if (Math.abs(det) < 1e-5) return null;
  const ha = a.half + extra;
  const hb = b.half + extra;
  return {
    x: node.x + (ha * bP.z - hb * aP.z) / det,
    z: node.z + (aP.x * hb - bP.x * ha) / det,
  };
}

function sectorAngle(a, b) {
  return Math.acos(Math.max(-1, Math.min(1, a.dx * b.dx + a.dz * b.dz)));
}

function hubArms(graph, node, pad) {
  const alongDefault = pad.side / 2 + 1.2;
  const arms = [];
  for (const e of graph.edges) {
    if (e.a !== node.id && e.b !== node.id) continue;
    if (!e.points || e.points.length < 2) continue;
    const spec = roadClassSpec(e.cls);
    if (spec.dirt) continue;
    const dir = armDir(node, e);
    const along = pad.along && pad.along[e.id] != null ? pad.along[e.id] : alongDefault;
    arms.push({
      dx: dir.x,
      dz: dir.z,
      half: carriagewayWidthM(e.cls) / 2,
      reach: along,
      walk: spec.sidewalkM || 0,
    });
  }
  return arms;
}

/**
 * One contour at the node. Dual arms use the full carriageway.
 * Ribbons clip on `clip`. The drawn kerb is this outline, not 2–4 boxes.
 */
export function buildHubFootprint(graph, node, pad) {
  if (!graph || !node || !pad) return { tarmac: [], shoulder: [], sidewalk: [], clip: [] };
  const arms = hubArms(graph, node, pad);
  if (!arms.length) return { tarmac: [], shoulder: [], sidewalk: [], clip: [] };
  const tarRing = junctionContour(node, arms, 0);
  const gritRing = swellRing(junctionContour(node, arms, 0, 128, false), 1.1);
  const tar = [[tarRing]];
  const grit = [[gritRing]];
  const walkOnly = arms.filter((a) => a.walk > 0).map((a) => ({ ...a, half: a.half + a.walk }));
  const walk = walkOnly.length
    ? diffGeoms([[swellRing(junctionContour(node, walkOnly, 0, 128, false), 1.1)]], tar)
    : [];
  return {
    tarmac: tar,
    shoulder: grit.length ? diffGeoms(grit, tar) : [],
    sidewalk: walk,
    clip: tar,
    outerClip: grit,
  };
}

/**
 * Circus clip is the outer disc. Drawn mesh is a RingGeometry doughnut.
 * Ribbons run onto that ring; they are not bitten to a clover outline.
 */
export function buildCircusFootprint(graph, node) {
  if (!graph || !node || !node.radius) {
    return { tarmac: [], shoulder: [], sidewalk: [], clip: [], inner: 0, outer: 0, reach: 0 };
  }
  const { outer, inner } = circusMeshRadii(node.radius);
  const cx = node.x;
  const cz = node.z;
  const disc = [[circleRing(cx, cz, outer, 96)]];
  const grit = [[circleRing(cx, cz, outer + FOOT_SHOULDER_M, 96)]];
  const holed = diffGeoms(disc, [[circleRing(cx, cz, inner, 64)]]);
  return {
    tarmac: holed && holed.length ? holed : disc,
    shoulder: diffGeoms(grit, disc),
    sidewalk: [],
    clip: disc,
    outerClip: grit,
    inner,
    outer,
    reach: outer,
  };
}

export { clsOf };
