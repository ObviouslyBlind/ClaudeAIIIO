/**
 * Circus node mesh vs edge cut.
 *
 * Graph edges already stop on the kerb ring. Dual ribbons sit a lane-offset
 * off that centreline, so they used to end in the sand beside the ring.
 * Clip each drawn polyline to the *outer* tarmac circle (CS2-style: the
 * node owns the join; the edge stops at the node boundary). Do not fake
 * the join with arm discs, and do not chord the stone island.
 */

/** Metres past the graph kerb. Duals hit this circle face-on instead of beside it. */
export const CIRCUS_OUTER_PAD_M = 6;
/** Ribbons tuck this far under the ring so a 1-px sand seam cannot show. */
export const CIRCUS_OVERLAP_M = 0.5;
/** Circulatory asphalt width (matches the old ring: PAVED 7.2 + 5). */
export const CIRCUS_RING_WIDTH_M = 12.2;

/**
 * @param {number} [kerbR]
 * @returns {{ kerb: number, outer: number, inner: number, clip: number }}
 */
export function circusMeshRadii(kerbR) {
  const kerb = kerbR || 34;
  const outer = kerb + CIRCUS_OUTER_PAD_M;
  const inner = Math.max(6, outer - CIRCUS_RING_WIDTH_M);
  return { kerb, outer, inner, clip: Math.max(inner + 1, outer - CIRCUS_OVERLAP_M) };
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
    if (t > 1e-5 && t < 1 - 1e-5) ts.push(t);
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
