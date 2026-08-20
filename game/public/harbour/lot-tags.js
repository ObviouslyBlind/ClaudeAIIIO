/**
 * World $ / YOURS signs on the lot dirt.
 * Depth-tested billboards — carts and buildings cover them.
 * Vacant: tap opens the buy-ask. Yours: inspect. Placing: PLACE.
 *
 * YOURS stays on in World. Lots to buy shows vacant $ tags.
 * Your lots never shows prices. World never shows buy $.
 * Close-up scale stays small. Zoom-out tags grow with camera radius.
 */

import * as THREE from "three";

export const TAG_POOL = 12;
export const TAG_POOL_FAR = 96;
/** Metres. Close walk: one stretch of street. Zoom-out grows this. */
export const TAG_RADIUS_M = 140;
export const TAG_RADIUS_LOTS_M = 140;
/** Camera radius where vacant $ pads spread across the view. */
export const TAG_MAP_CAM_M = 72;
/** Planted on the dirt, not a HUD plate. */
export const TAG_Y_M = 1.15;
export const TAG_W_M = 4.2;
export const TAG_H_M = 1.15;
export const TAG_W_MIN_M = 2.4;
export const TAG_W_MAX_M = 88;

export function tagKindFor(plot) {
  if (!plot) return "none";
  if (plot.class === "reserved") return "none";
  if (plot.owner === "visitor") return "yours";
  if (plot.owner) return "taken";
  return "buy";
}

export function tagLabelFor(plot, placing = false) {
  const kind = tagKindFor(plot);
  if (kind === "yours") return placing ? "PLACE" : "YOURS";
  if (kind === "taken") return "TAKEN";
  if (kind === "buy") {
    return (
      "$" + Number(plot.price).toLocaleString("en-US", { maximumFractionDigits: 0 })
    );
  }
  return "";
}

export function tagViewRadiusM(camRadius) {
  const r = Number(camRadius) || 8;
  return Math.max(TAG_RADIUS_M, r * 2.6);
}

export function tagPoolForRadius(camRadius) {
  const r = Number(camRadius) || 8;
  if (r < 40) return TAG_POOL;
  if (r < TAG_MAP_CAM_M) return 28;
  if (r < 220) return 56;
  return TAG_POOL_FAR;
}

/** World metres. Grows with zoom-out; clamped so close-up YOURS is not a billboard. */
export function tagWorldScale(camRadius) {
  const r = Math.max(6, Number(camRadius) || 8);
  const w = Math.min(TAG_W_MAX_M, Math.max(TAG_W_MIN_M, TAG_W_MIN_M + (r - 8) * 0.14));
  return { w, h: w * (TAG_H_M / TAG_W_M) };
}

export function pickTagPlots(plots, player, overlay, limit = TAG_POOL, placing = false, opts = {}) {
  const camR = Number(opts.camRadius);
  const radius = Number(opts.viewRadius) || tagViewRadiusM(Number.isFinite(camR) ? camR : 8);
  const r2 = radius * radius;
  const yours = [];
  const buy = [];
  for (const p of plots || []) {
    const kind = tagKindFor(p);
    if (kind === "none" || kind === "taken") continue;
    const dx = p.x - player.x;
    const dz = p.z - player.z;
    const d2 = dx * dx + dz * dz;
    if (kind === "yours") {
      yours.push({ plot: p, d2, kind });
      continue;
    }
    if (d2 > r2) continue;
    if (kind === "buy") buy.push({ plot: p, d2, kind });
  }
  yours.sort((a, b) => a.d2 - b.d2);
  buy.sort((a, b) => a.d2 - b.d2);

  if (placing) return yours.slice(0, limit);

  const wantYours = true;
  const wantBuy = overlay === "lots";
  const onlyYours = overlay === "yours" || overlay === "world";
  const out = [];
  if (wantYours && (overlay === "lots" || overlay === "yours" || overlay === "world")) {
    for (const row of yours) {
      if (out.length >= limit) break;
      out.push(row);
    }
  }
  if (onlyYours) return out;
  if (wantBuy) {
    for (const row of buy) {
      if (out.length >= limit) break;
      out.push(row);
    }
  }
  return out;
}

export function ndcToLayer(ndc, rect) {
  if (!ndc || !Number.isFinite(ndc.x) || !Number.isFinite(ndc.y) || !Number.isFinite(ndc.z)) {
    return null;
  }
  if (ndc.z < -1 || ndc.z > 1) return null;
  if (Math.abs(ndc.x) > 1.2 || Math.abs(ndc.y) > 1.2) return null;
  return {
    x: rect.left + (ndc.x * 0.5 + 0.5) * rect.width,
    y: rect.top + (-ndc.y * 0.5 + 0.5) * rect.height,
  };
}

function paintTag(canvas, text, kind) {
  if (!canvas || typeof document === "undefined") return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const yours = kind === "yours";
  ctx.fillStyle = yours ? "rgba(47,138,76,0.94)" : "rgba(24,30,20,0.9)";
  const r = 14;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(w - r, 0);
  ctx.arcTo(w, 0, w, r, r);
  ctx.lineTo(w, h - r);
  ctx.arcTo(w, h, w - r, h, r);
  ctx.lineTo(r, h);
  ctx.arcTo(0, h, 0, h - r, r);
  ctx.lineTo(0, r);
  ctx.arcTo(0, 0, r, 0, r);
  ctx.fill();
  ctx.strokeStyle = yours ? "#5fe3a0" : "rgba(244,242,234,0.28)";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = "#f4f2ea";
  ctx.font = "700 28px 'Segoe UI', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, h / 2 + 1);
}

export function mountLotTags({ worldAdd, heightAt, specOf, getPlots }) {
  const pool = [];
  let placingMode = false;
  let shownCache = [];
  let clock = 0;
  let lastOverlay = "";
  let lastPlacing = false;
  const root = typeof document !== "undefined" ? document.getElementById("lot-tags") : null;
  if (root) root.hidden = true;

  function spriteAt(i) {
    if (pool[i]) return pool[i];
    const canvas = typeof document !== "undefined" ? document.createElement("canvas") : { width: 160, height: 56 };
    canvas.width = 160;
    canvas.height = 56;
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        depthTest: true,
        depthWrite: false,
        transparent: true,
      }),
    );
    sprite.name = "lot-tag";
    sprite.center.set(0.5, 0);
    sprite.scale.set(TAG_W_M, TAG_H_M, 1);
    sprite.renderOrder = 1;
    sprite.visible = false;
    sprite.frustumCulled = false;
    sprite.userData.kind = "parcel-label";
    sprite.userData.mode = "PAPER";
    sprite.userData.plotId = null;
    sprite.userData.layer = "lots";
    if (worldAdd) worldAdd(sprite);
    pool[i] = { sprite, canvas, texture, text: "" };
    return pool[i];
  }

  function hideAll() {
    shownCache = [];
    clock = 0;
    if (root) root.hidden = true;
    for (const rec of pool) {
      if (rec && rec.sprite) rec.sprite.visible = false;
    }
  }

  function tick(playerPos, dt = 0.016, overlay = "world", placing = false, camRadius = 8) {
    placingMode = Boolean(placing);
    const radius = tagViewRadiusM(camRadius);
    const poolN = tagPoolForRadius(camRadius);
    if (overlay !== lastOverlay || placingMode !== lastPlacing) {
      lastOverlay = overlay;
      lastPlacing = placingMode;
      clock = 0;
      shownCache = [];
    }
    if (!placingMode && (overlay === "foot" || overlay === "minerals")) {
      hideAll();
      return;
    }
    const showTags = overlay === "lots" || overlay === "yours" || overlay === "world" || placingMode;
    if (!showTags) {
      hideAll();
      return;
    }
    clock -= dt;
    if (clock <= 0) {
      clock = 0.2;
      shownCache = pickTagPlots(getPlots(), playerPos, overlay, poolN, placingMode, { camRadius, viewRadius: radius });
    }
    const scale = tagWorldScale(camRadius);
    const used = shownCache.length;
    for (let i = 0; i < Math.max(used, pool.length); i++) {
      if (i >= used) {
        const rec = pool[i];
        if (rec && rec.sprite) {
          rec.sprite.visible = false;
          rec.sprite.userData.plotId = null;
        }
        continue;
      }
      const rec = spriteAt(i);
      const slot = shownCache[i];
      const p = slot.plot;
      const spec = specOf && specOf(p.island);
      const y = (spec && heightAt ? heightAt(spec, p.x, p.z) : 1) + TAG_Y_M;
      rec.sprite.position.set(p.x, y, p.z);
      rec.sprite.scale.set(scale.w, scale.h, 1);
      const text = tagLabelFor(p, placingMode);
      const key = p.id + ":" + text;
      if (rec.text !== key) {
        rec.text = key;
        paintTag(rec.canvas, text, slot.kind);
        rec.texture.needsUpdate = true;
      }
      rec.sprite.userData.plotId = p.id;
      rec.sprite.userData.plot = p;
      rec.sprite.userData.label = text;
      rec.sprite.visible = true;
    }
  }

  function clickables() {
    const out = [];
    for (const rec of pool) {
      if (rec && rec.sprite && rec.sprite.visible) out.push(rec.sprite);
    }
    return out;
  }

  return { tick, clickables, root };
}
