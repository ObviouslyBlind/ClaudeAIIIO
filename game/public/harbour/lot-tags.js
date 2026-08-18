/**
 * HTML $ bars over lots. Real buttons, not Three sprites.
 * Vacant: opens the buy-ask. Taken / yours: inspect only.
 */

import * as THREE from "three";

export const TAG_POOL = 80;
export const TAG_RADIUS_M = 420;
export const TAG_RADIUS_LOTS_M = 1100;

export function tagKindFor(plot) {
  if (!plot) return "none";
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

export function pickTagPlots(plots, player, overlay, limit = TAG_POOL) {
  const radius = overlay === "lots" ? TAG_RADIUS_LOTS_M : TAG_RADIUS_M;
  const r2 = radius * radius;
  const out = [];
  for (const p of plots || []) {
    const kind = tagKindFor(p);
    if (kind === "none") continue;
    const dx = p.x - player.x;
    const dz = p.z - player.z;
    const d2 = dx * dx + dz * dz;
    if (d2 > r2) continue;
    out.push({ plot: p, d2, kind });
  }
  out.sort((a, b) => {
    if (a.kind === "buy" && b.kind !== "buy") return -1;
    if (b.kind === "buy" && a.kind !== "buy") return 1;
    return a.d2 - b.d2;
  });
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

export function mountLotTags({ canvas, camera, heightAt, specOf, getPlots, onBuy, onInspect, onPlace }) {
  let root = document.getElementById("lot-tags");
  if (!root) {
    root = document.createElement("div");
    root.id = "lot-tags";
    document.body.appendChild(root);
  }
  const buttons = [];
  const tmp = new THREE.Vector3();
  let clock = 0;
  let placingMode = false;

  function buttonAt(i) {
    if (buttons[i]) return buttons[i];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lot-tag";
    btn.hidden = true;
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const id = btn.dataset.plotId;
      const plots = getPlots() || [];
      const plot = plots.find((p) => p.id === id);
      if (!plot) return;
      const kind = tagKindFor(plot);
      if (placingMode) {
        if (kind === "yours" && onPlace) onPlace(plot);
        return;
      }
      if (kind === "buy") {
        if (onBuy) onBuy(plot);
      } else if (onInspect) {
        onInspect(plot);
      }
    });
    root.appendChild(btn);
    buttons[i] = btn;
    return btn;
  }

  function tick(playerPos, dt = 0.016, overlay = "world", placing = false) {
    placingMode = Boolean(placing);
    if (overlay !== "lots") {
      root.hidden = true;
      for (const btn of buttons) {
        if (btn) btn.hidden = true;
      }
      return;
    }
    root.hidden = false;
    clock -= dt;
    if (clock > 0) return;
    clock = overlay === "lots" ? 0.12 : 0.28;
    if (!camera || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return;
    const shown = pickTagPlots(getPlots(), playerPos, overlay, TAG_POOL).filter((slot) =>
      placingMode ? slot.kind === "yours" : true,
    );
    for (let i = 0; i < TAG_POOL; i++) {
      const btn = buttonAt(i);
      const slot = shown[i];
      if (!slot) {
        btn.hidden = true;
        btn.dataset.plotId = "";
        continue;
      }
      const p = slot.plot;
      const spec = specOf(p.island);
      const y = (spec && heightAt ? heightAt(spec, p.x, p.z) : 1) + 4.2;
      tmp.set(p.x, y, p.z).project(camera);
      const pos = ndcToLayer(tmp, rect);
      if (!pos) {
        btn.hidden = true;
        continue;
      }
      const kind = slot.kind;
      const text = tagLabelFor(p, placingMode);
      btn.hidden = false;
      btn.dataset.plotId = p.id;
      btn.dataset.kind = kind;
      btn.className = "lot-tag is-" + kind;
      btn.textContent = text;
      btn.style.left = pos.x + "px";
      btn.style.top = pos.y + "px";
    }
  }

  return { tick, root };
}
