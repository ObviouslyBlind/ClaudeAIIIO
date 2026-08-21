/**
 * Place pose: a rectangle on XZ, yaw about +Y.
 * Cart pads are short off the road; the ghost must sit inside the ring.
 * PAPER / SIMULATED.
 */

/**
 * Ground stall, not the umbrella. Body 1.35×0.78, counter 1.42×0.86,
 * ghost scale 1.12 → about 1.59×0.96. Keep this in sync with firstLoop.
 */
export const CART_FOOTPRINT_M = { w: 1.58, d: 1.02 };
/** Catalogue buildings — ghost only until develop stores a pose. */
export const BUILDING_FOOTPRINT_M = { w: 7.2, d: 6.4 };
export const PLACE_ROTATE_RAD_PER_S = 1.35;
export const PLACE_GHOST_OK = 0x3dcc6e;
export const PLACE_GHOST_BAD = 0xe25b6a;
/** Street lots still allow the verge. Must match firstLoop PLACE_CORRIDOR_M. */
export const PLACE_GHOST_CORRIDOR_M = 22;
/** Pointer this close to a pad centroid binds to that pad, not a nearby lot. */
export const SNAP_PAD_M = 5.5;

export function isPlaceRotateKey(ev) {
  if (!ev) return false;
  const k = ev.key || "";
  const code = ev.code || "";
  return code === "KeyR" || k === "r" || k === "R";
}

export function footprintCorners(x, z, yaw, w, d) {
  const hw = (w || CART_FOOTPRINT_M.w) / 2;
  const hd = (d || CART_FOOTPRINT_M.d) / 2;
  const c = Math.cos(yaw || 0);
  const s = Math.sin(yaw || 0);
  const pts = [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
  ];
  return pts.map(([lx, lz]) => ({
    x: x + lx * c + lz * s,
    z: z - lx * s + lz * c,
  }));
}

export function pointInClosedRing(x, z, ring) {
  if (!ring || ring.length < 3) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    const xi = a[0];
    const zi = a[1];
    const xj = b[0];
    const zj = b[1];
    const hit = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-9) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

export function footprintInRing(x, z, yaw, w, d, ring) {
  if (!pointInClosedRing(x, z, ring)) return false;
  for (const p of footprintCorners(x, z, yaw, w, d)) {
    if (!pointInClosedRing(p.x, p.z, ring)) return false;
  }
  return true;
}

/** Pads: the whole rectangle must sit on the dirt. Lots: ring or verge. */
export function ghostFitsPlot(x, z, yaw, w, d, plot) {
  if (!plot) return false;
  if (plot.class === "cart_pad") {
    return footprintInRing(x, z, yaw, w, d, plot.ring);
  }
  if (plot.buildingId) return false;
  if (plot.ring && footprintInRing(x, z, yaw, w, d, plot.ring)) return true;
  const px = Number(plot.x);
  const pz = Number(plot.z);
  if (!Number.isFinite(px) || !Number.isFinite(pz)) return false;
  return Math.hypot(x - px, z - pz) <= PLACE_GHOST_CORRIDOR_M;
}

/**
 * Pull a slightly-off pad tap onto the last pose that still fits the dirt.
 * Far taps stay where they are and fail — do not steal a street lot.
 */
export function snapPlacePose(x, z, yaw, w, d, plot) {
  const px = Number(x);
  const pz = Number(z);
  if (!plot) return { x: px, z: pz, ok: false };
  if (plot.class !== "cart_pad") {
    return { x: px, z: pz, ok: ghostFitsPlot(px, pz, yaw, w, d, plot) };
  }
  if (footprintInRing(px, pz, yaw, w, d, plot.ring)) return { x: px, z: pz, ok: true };
  const cx = Number(plot.x);
  const cz = Number(plot.z);
  if (!Number.isFinite(cx) || !Number.isFinite(cz)) return { x: px, z: pz, ok: false };
  if (!footprintInRing(cx, cz, yaw, w, d, plot.ring)) return { x: cx, z: cz, ok: false };
  const dist = Math.hypot(px - cx, pz - cz);
  if (dist > SNAP_PAD_M) return { x: px, z: pz, ok: false };
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    const sx = cx + (px - cx) * mid;
    const sz = cz + (pz - cz) * mid;
    if (footprintInRing(sx, sz, yaw, w, d, plot.ring)) lo = mid;
    else hi = mid;
  }
  return { x: cx + (px - cx) * lo, z: cz + (pz - cz) * lo, ok: true };
}
