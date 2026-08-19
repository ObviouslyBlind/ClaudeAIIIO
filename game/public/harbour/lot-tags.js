/**
 * World $ / YOURS signs on the lot dirt.
 * Depth-tested billboards — carts and buildings cover them.
 * Vacant: tap opens the buy-ask. Yours: inspect. Placing: PLACE.
 *
 * World overlay: no signs (Lots chip owns them).
 * Lots: a few nearby vacant prices, not the whole highway.
 * Placing: PLACE on yours only.
 */

import * as THREE from "three";

export const TAG_POOL = 6;
/** Metres. One stretch of street, not every Quayward $ lot. */
export const TAG_RADIUS_M = 140;
export const TAG_RADIUS_LOTS_M = 140;
/** Planted on the dirt, not a HUD plate. */
export const TAG_Y_M = 1.15;
export const TAG_W_M = 4.2;
export const TAG_H_M = 1.15;

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

export function pickTagPlots(plots, player, overlay, limit = TAG_POOL, placing = false) {
  const lotsOn = overlay === "lots" || overlay === "yours";
  const radius = lotsOn || placing ? TAG_RADIUS_LOTS_M : TAG_RADIUS_M;
  const r2 = radius * radius;
  const out = [];
  for (const p of plots || []) {
    const kind = tagKindFor(p);
    if (kind === "none") continue;
    if (placing) {
      if (kind !== "yours") continue;
    } else if (overlay === "lots") {
      if (kind !== "buy") continue;
    } else if (overlay === "yours") {
      if (kind !== "yours") continue;
    } else {
      continue;
    }
    const dx = p.x - player.x;
    const dz = p.z - player.z;
    const d2 = dx * dx + dz * dz;
    if (d2 > r2) continue;
    out.push({ plot: p, d2, kind });
  }
  out.sort((a, b) => a.d2 - b.d2);
  return out.slice(0, limit);
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

  function tick(playerPos, dt = 0.016, overlay = "world", placing = false) {
    placingMode = Boolean(placing);
    const showTags = overlay === "lots" || overlay === "yours" || placingMode;
    if (!showTags) {
      hideAll();
      return;
    }
    clock -= dt;
    if (clock <= 0) {
      clock = 0.2;
      shownCache = pickTagPlots(getPlots(), playerPos, overlay, TAG_POOL, placingMode);
    }
    for (let i = 0; i < TAG_POOL; i++) {
      const rec = spriteAt(i);
      const slot = shownCache[i];
      if (!slot) {
        rec.sprite.visible = false;
        rec.sprite.userData.plotId = null;
        continue;
      }
      const p = slot.plot;
      const spec = specOf && specOf(p.island);
      const y = (spec && heightAt ? heightAt(spec, p.x, p.z) : 1) + TAG_Y_M;
      rec.sprite.position.set(p.x, y, p.z);
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
