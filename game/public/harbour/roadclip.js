/**
 * Circus node mesh vs edge cut.
 *
 * Graph edges already stop on the kerb ring. Dual ribbons sit a lane-offset
 * off that centreline, so they used to end in the sand beside the ring.
 * Draw the doughnut as a RingGeometry. Extend the black ribbon onto that
 * ring and stop before the grass island. Do not Clipper-union, clover-clip,
 * or fillet-sticker the join.
 */

/** Metres past the graph kerb. Duals hit this circle face-on instead of beside it. */
export const CIRCUS_OUTER_PAD_M = 8;
/** Ribbon ends this far past the fillet tangent, inside the flare rectangle. */
export const CIRCUS_FLARE_SPLICE_M = 4;
/** Circulatory asphalt width — as fat as Island Hwy so duals merge, not dump into a thin doughnut. */
export const CIRCUS_RING_WIDTH_M = 26;
/** Stop this far outside the stone island so duals sit on the ring, not the kerb. */
export const CIRCUS_ENTER_PAD_M = 1.6;

/**
 * @param {number} [kerbR]
 * @returns {{ kerb: number, outer: number, inner: number, clip: number, enter: number }}
 */
export function circusMeshRadii(kerbR) {
  const kerb = kerbR || 34;
  const outer = kerb + CIRCUS_OUTER_PAD_M;
  const inner = Math.max(6, outer - CIRCUS_RING_WIDTH_M);
  return {
    kerb,
    outer,
    inner,
    clip: outer,
    enter: inner + CIRCUS_ENTER_PAD_M,
  };
}

/** @param {{ x: number, z: number }} a @param {{ x: number, z: number }} b @param {number} t */
function lerp(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
}

/**
 * Parameter t in (0, 1) where segment a→b meets the circle, sorted.
 * @param {{ x: number, z: number }} a
 * @param {{ x: number, z: number }} b
 * @param {number} cx
 * @param {number} cz
 * @param {number} r
 * @returns {number[]}
 */
export function segmentCircleHits(a, b, cx, cz, r) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const fx = a.x - cx;
  const fz = a.z - cz;
  const A = dx * dx + dz * dz;
  if (A < 1e-12) return [];
  const B = 2 * (fx * dx + fz * dz);
  const C = fx * fx + fz * fz - r * r;
  const disc = B * B - 4 * A * C;
  if (disc < 0) return [];
  const s = Math.sqrt(Math.max(0, disc));
  const ts = [];
  for (const t of [(-B - s) / (2 * A), (-B + s) / (2 * A)]) {
    if (t >= -1e-8 && t <= 1 + 1e-8) ts.push(Math.max(0, Math.min(1, t)));
  }
  ts.sort((p, q) => p - q);
  return ts;
}

/**
 * Keep the parts of an open polyline that sit outside a circle.
 * Crossing segments get a vertex on the circle. A secant (both ends
 * outside, middle inside) splits into two chains so the chord cannot
 * pave the island.
 *
 * @param {{ x: number, z: number }[]} pts
 * @param {number} cx
 * @param {number} cz
 * @param {number} r
 * @returns {{ x: number, z: number }[][]}
 */
export function clipPolylineOutsideCircle(pts, cx, cz, r) {
  if (!pts || pts.length < 2) return [];
  const r2 = r * r;
  const dist2 = (p) => {
    const dx = p.x - cx;
    const dz = p.z - cz;
    return dx * dx + dz * dz;
  };
  const outside = (p) => dist2(p) >= r2 - 1e-4;

  const chains = [];
  let run = [];
  const flush = () => {
    if (run.length >= 2) chains.push(run);
    run = [];
  };

  if (outside(pts[0])) run.push(pts[0]);

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const aOut = outside(a);
    const bOut = outside(b);
    const hits = segmentCircleHits(a, b, cx, cz, r);

    if (aOut && bOut) {
      if (hits.length >= 2) {
        run.push(lerp(a, b, hits[0]));
        flush();
        run.push(lerp(a, b, hits[hits.length - 1]));
        run.push(b);
      } else {
        run.push(b);
      }
    } else if (aOut && !bOut) {
      run.push(lerp(a, b, hits[0] ?? 1));
      flush();
    } else if (!aOut && bOut) {
      run.push(lerp(a, b, hits[hits.length - 1] ?? 0));
      run.push(b);
    }
  }
  flush();
  return chains;
}

/**
 * Clip against every circus, in order. Empty / 1-point leftovers drop.
 *
 * @param {{ x: number, z: number }[]} pts
 * @param {{ x: number, z: number, clip: number }[]} circuses
 * @returns {{ x: number, z: number }[][]}
 */
export function clipPolylineOutsideCircuses(pts, circuses) {
  if (!pts || pts.length < 2) return [];
  if (!circuses || !circuses.length) return [pts];
  let chains = [pts];
  for (const c of circuses) {
    const next = [];
    for (const ch of chains) {
      next.push(...clipPolylineOutsideCircle(ch, c.x, c.z, c.clip));
    }
    chains = next;
  }
  return chains.filter((ch) => ch && ch.length >= 2);
}

/**
 * Hits of the infinite line a→b with the circle. t is along a→b (may be
 * outside 0..1). Sorted.
 * @param {{ x: number, z: number }} a
 * @param {{ x: number, z: number }} b
 * @param {number} cx
 * @param {number} cz
 * @param {number} r
 * @returns {number[]}
 */
export function lineCircleHits(a, b, cx, cz, r) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const fx = a.x - cx;
  const fz = a.z - cz;
  const A = dx * dx + dz * dz;
  if (A < 1e-12) return [];
  const B = 2 * (fx * dx + fz * dz);
  const C = fx * fx + fz * fz - r * r;
  const disc = B * B - 4 * A * C;
  if (disc < 0) return [];
  const s = Math.sqrt(Math.max(0, disc));
  return [(-B - s) / (2 * A), (-B + s) / (2 * A)].sort((p, q) => p - q);
}

function distTo(p, cx, cz) {
  return Math.hypot(p.x - cx, p.z - cz);
}

/**
 * Move one end of an open polyline onto the circle: extend if the stub
 * stops short of the ring, trim if it has already gone inside.
 * @param {{ x: number, z: number }[]} pts
 * @param {number} cx
 * @param {number} cz
 * @param {number} r
 * @param {boolean} head
 * @returns {{ x: number, z: number }[]}
 */
export function snapPolylineEndToCircle(pts, cx, cz, r, head) {
  if (!pts || pts.length < 2) return pts || [];
  const a = head ? pts[1] : pts[pts.length - 2];
  const b = head ? pts[0] : pts[pts.length - 1];
  const hits = lineCircleHits(a, b, cx, cz, r);
  const forward = hits.filter((t) => t >= -1e-6);
  const aOut = distTo(a, cx, cz) >= r - 1e-4;
  let t = aOut ? forward[0] : forward[forward.length - 1];
  let p;
  if (t == null || !Number.isFinite(t)) {
    const d = distTo(b, cx, cz) || 1;
    p = { x: cx + ((b.x - cx) / d) * r, z: cz + ((b.z - cz) / d) * r };
  } else {
    p = lerp(a, b, t);
  }
  return head ? [p].concat(pts.slice(1)) : pts.slice(0, -1).concat([p]);
}

/**
 * Snap every end that sits on a circus onto `radiusOf(c)`.
 * @param {{ x: number, z: number }[]} pts
 * @param {{ x: number, z: number, outer: number }[]} circuses
 * @param {(c: object) => number} radiusOf
 * @returns {{ x: number, z: number }[]}
 */
export function snapPolylineToCircuses(pts, circuses, radiusOf) {
  if (!pts || pts.length < 2) return pts || [];
  if (!circuses || !circuses.length) return pts;
  let out = pts.slice();
  for (const c of circuses) {
    const r = radiusOf(c);
    const reach = (c.outer || r) + 90;
    if (distTo(out[0], c.x, c.z) < reach) out = snapPolylineEndToCircle(out, c.x, c.z, r, true);
    if (distTo(out[out.length - 1], c.x, c.z) < reach) out = snapPolylineEndToCircle(out, c.x, c.z, r, false);
  }
  return out;
}

/** Duals and streets run onto the ring and stop before the stone island. */
export function enterCircusRings(pts, circuses) {
  if (!pts || pts.length < 2) return [];
  if (!circuses || !circuses.length) return [pts];
  const snapped = snapPolylineToCircuses(pts, circuses, (c) => c.enter);
  let chains = [snapped];
  for (const c of circuses) {
    const next = [];
    for (const ch of chains) {
      next.push(...clipPolylineOutsideCircle(ch, c.x, c.z, c.inner + 0.25));
    }
    chains = next;
  }
  return chains.filter((ch) => ch && ch.length >= 2);
}

/** Circuses on this graph, with the mesh radii the renderer uses. */
export function circusesFromGraph(graph) {
  if (!graph || !graph.nodes) return [];
  const out = [];
  for (const n of graph.nodes) {
    if (n.kind !== "circus" || !n.radius) continue;
    out.push({ id: n.id, name: n.name, x: n.x, z: n.z, ...circusMeshRadii(n.radius) });
  }
  return out;
}

/**
 * Unit direction from the circus centre out along a paved arm.
 * Graph edges start on the kerb, not the centre — use centre→kerb so the
 * flare is radial to the ring.
 */
export function circusArmDir(node, edge) {
  if (!node || !edge || !edge.points || edge.points.length < 2) return { x: 1, z: 0 };
  const pts = edge.points;
  const fromA = edge.a === node.id;
  const a = fromA ? pts[0] : pts[pts.length - 1];
  const b = fromA ? pts[1] : pts[pts.length - 2];
  let dx = a.x - node.x;
  let dz = a.z - node.z;
  if (Math.hypot(dx, dz) < 1) {
    dx = b.x - node.x;
    dz = b.z - node.z;
  }
  const len = Math.hypot(dx, dz) || 1;
  return { x: dx / len, z: dz / len };
}

/**
 * Fillet between a radial kerb and the outer ring. Big enough that the
 * clover reads as a merge from the play camera; small enough that a dual
 * cannot swallow a 45° neighbour (Quayward).
 */
export function circusMergeFilletM(half, outer) {
  const h = Math.max(1.2, half || 0);
  const o = Math.max(h + 4, outer || 0);
  return Math.min(14, o * 0.32, Math.max(7.5, h * 0.5 + 5));
}

/** Fillet radius, tangent station, and how far the join owns the arm. */
export function circusMergeGeom(half, outer) {
  const h = Math.max(1.2, half || 0);
  const R = Math.max(h + 2, outer || 0);
  const F = circusMergeFilletM(h, R);
  const xc = Math.sqrt(Math.max(1, (R + F) * (R + F) - (h + F) * (h + F)));
  return { half: h, outer: R, filletM: F, xc, reach: xc + 6 };
}

/**
 * Where a drawn ribbon must stop so its square prism wall sits inside the
 * flare, not on the outer ring. The flare mesh owns the last metres and
 * the tangent kerb.
 */
export function circusRibbonClipR(half, outer) {
  const g = circusMergeGeom(half, outer);
  const splice = g.xc + CIRCUS_FLARE_SPLICE_M;
  const lid = g.reach - 1.2;
  return Math.max(g.outer + 3.2, Math.min(splice, lid));
}

function lerpAngle(a0, a1, t) {
  let d = a1 - a0;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a0 + d * t;
}

function appendLocalArc(ring, world, cx, cz, r, a0, a1, steps) {
  const n = Math.max(2, steps | 0);
  for (let i = 1; i <= n; i++) {
    const a = lerpAngle(a0, a1, i / n);
    ring.push(world(cx + Math.cos(a) * r, cz + Math.sin(a) * r));
  }
}

function closeXy(ring) {
  if (!ring.length) return ring;
  const a = ring[0];
  const b = ring[ring.length - 1];
  if (a[0] === b[0] && a[1] === b[1]) return ring;
  ring.push([a[0], a[1]]);
  return ring;
}

/**
 * Closed [x,z] flare: road rectangle plus two kerb fillets tangent to the
 * outer circus circle. Replaces a chord trapezoid, which still read as a
 * square dump into the doughnut.
 *
 * @param {number} cx
 * @param {number} cz
 * @param {{ x: number, z: number }} dir  away from the circus along the arm
 * @param {number} outer
 * @param {number} half
 * @param {number} [filletM]
 * @returns {number[][]}
 */
export function circusMergeRing(cx, cz, dir, outer, half, filletM) {
  const ox = dir && Number.isFinite(dir.x) ? dir.x : 1;
  const oz = dir && Number.isFinite(dir.z) ? dir.z : 0;
  const len = Math.hypot(ox, oz) || 1;
  const dx = ox / len;
  const dz = oz / len;
  const rx = dz;
  const rz = -dx;
  const h = Math.max(1.2, half || 0);
  const R = Math.max(h + 2, outer || 0);
  let F = filletM == null ? circusMergeFilletM(h, R) : filletM;
  if (!(F > 0.4)) F = circusMergeFilletM(h, R);
  const world = (along, lat) => [cx + dx * along + rx * lat, cz + dz * along + rz * lat];

  if (R <= h + 0.4) {
    const cap = Math.min(h, R * 0.9);
    const dRing = Math.sqrt(Math.max(1, R * R - cap * cap));
    const dFar = R + 16;
    return closeXy([world(dRing, -cap), world(dRing, cap), world(dFar, h), world(dFar, -h)]);
  }

  const xc = Math.sqrt(Math.max(1, (R + F) * (R + F) - (h + F) * (h + F)));
  const dFar = xc + 6;
  const scale = R / (R + F);
  const tAlong = xc * scale;
  const tLat = (h + F) * scale;
  const aLineR = -Math.PI / 2;
  const aCircR = Math.atan2(-(h + F), -xc);
  const aCircL = Math.atan2(h + F, -xc);
  const aLineL = Math.PI / 2;
  const angR = Math.atan2(tLat, tAlong);
  const angL = -angR;

  const ring = [];
  ring.push(world(dFar, -h));
  ring.push(world(dFar, h));
  ring.push(world(xc, h));
  appendLocalArc(ring, world, xc, h + F, F, aLineR, aCircR, 20);
  appendLocalArc(ring, world, 0, 0, R, angR, angL, 24);
  appendLocalArc(ring, world, xc, -(h + F), F, aCircL, aLineL, 20);
  return closeXy(ring);
}

/**
 * Give-way dashes across the arm, on the ring face. Reads as an entry, not
 * a through-road that happens to hit a circle.
 *
 * @returns {number[][][]} closed rings
 */
export function circusGiveWayRings(cx, cz, dir, outer, half) {
  const ox = dir && Number.isFinite(dir.x) ? dir.x : 1;
  const oz = dir && Number.isFinite(dir.z) ? dir.z : 0;
  const len = Math.hypot(ox, oz) || 1;
  const dx = ox / len;
  const dz = oz / len;
  const rx = dz;
  const rz = -dx;
  const h = Math.max(1.2, half || 0);
  const R = Math.max(h + 2, outer || 0);
  const along = R + 0.9;
  const thick = 0.42;
  const dash = 1.22;
  const gap = 0.48;
  const inset = Math.min(1.5, h * 0.2);
  const p = (a, lat) => [cx + dx * a + rx * lat, cz + dz * a + rz * lat];
  const rings = [];
  let lat = -h + inset;
  const end = h - inset;
  while (lat + dash <= end + 0.02) {
    const a = lat;
    const b = lat + dash;
    rings.push(closeXy([
      p(along - thick / 2, a),
      p(along + thick / 2, a),
      p(along + thick / 2, b),
      p(along - thick / 2, b),
    ]));
    lat += dash + gap;
  }
  return rings;
}
