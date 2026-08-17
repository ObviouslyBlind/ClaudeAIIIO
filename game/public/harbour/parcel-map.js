import * as THREE from "three";

/**
 * Whole-island parcel map (PAPER / SIMULATED).
 *
 * Every parcel gets a flat tinted fill, a dark boundary, and — while you are
 * near it — a floating price tag ("$1,121" vacant, "YOURS" on your leases).
 * The cadastral read is the point: land is the product, so land is drawn.
 *
 * One merged fill mesh + one merged line mesh per island (2 draw calls), and
 * a small pooled set of label sprites. No per-parcel meshes, no observers,
 * nothing on a timer that could freeze a live session.
 */

/** Fill tints. Light map-greens like a printed plat, not lawn texture. */
export const FILL_VACANT = { street: 0x9ccb70, field: 0x8fbf66, shore: 0xd9c489 };
export const FILL_VISITOR = 0x86e39a;
export const FILL_NPC = 0x7fa95a;
export const FILL_SELECTED = 0xf0d060;
/** Boundary ink. */
export const LINE_INK = 0x2f4a26;

/** Metres. Labels only near the player; the far map stays clean geometry. */
export const LABEL_RADIUS_M = 420;
/** Pooled sprites. Bounded so a dense town cannot mint unbounded canvases. */
export const LABEL_POOL = 72;
/** Metres between shown tags. Street cuts sit ~45 m apart; without a floor
 *  their tags stack into an unreadable shingle pile. */
export const LABEL_MIN_GAP_M = 26;
/** Metres above ground. */
const FILL_LIFT = 0.35;
const LINE_LIFT = 0.5;
/** Bilinear grid per quad so fills follow the terrain instead of cutting it. */
const GRID = 4;

export function fillColorFor(plot, selectedId) {
  if (selectedId && plot.id === selectedId) return FILL_SELECTED;
  if (plot.owner === "visitor") return FILL_VISITOR;
  if (plot.owner) return FILL_NPC;
  return FILL_VACANT[plot.band] ?? FILL_VACANT.field;
}

/** Vacant land shows its PAPER price. Your land says so. NPC land stays quiet. */
export function labelTextFor(plot) {
  if (plot.owner === "visitor") return "YOURS";
  if (plot.owner) return null;
  return "$" + Number(plot.price).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/** Card title: "14 Harbour Rd". Uses the plot's stamped name, or a fallback. */
export function plotDisplayName(plot) {
  if (!plot) return "Land";
  if (plot.name) return plot.name;
  const street =
    plot.street ||
    (plot.band === "shore" ? "Shore Rd" : plot.band === "field" ? "Field Lane" : "Harbour Rd");
  let h = 0;
  const id = String(plot.id || "");
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const n = 2 + (((h >>> 0) % 49) * 2);
  return `${n} ${street}`;
}

function hash01(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return ((h >>> 0) % 1000) / 1000;
}

/** Bilinear point on a quad ring. */
function quadPoint(ring, u, v) {
  const ax = ring[0][0] + (ring[1][0] - ring[0][0]) * u;
  const az = ring[0][1] + (ring[1][1] - ring[0][1]) * u;
  const bx = ring[3][0] + (ring[2][0] - ring[3][0]) * u;
  const bz = ring[3][1] + (ring[2][1] - ring[3][1]) * u;
  return { x: ax + (bx - ax) * v, z: az + (bz - az) * v };
}

function drawLabel(canvas, text, yours) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = yours ? "rgba(38,128,66,0.92)" : "rgba(24,30,20,0.85)";
  const r = 14;
  const w = canvas.width;
  const h = canvas.height;
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
  ctx.fillStyle = "#f4f2ea";
  ctx.font = "700 26px 'Segoe UI', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, h / 2 + 1);
}

export function mountParcelMap({ worldAdd, specOf, heightAt, getPlots }) {
  /** plotId -> { fillStart, fillCount, lineStart, lineCount, island } */
  const ranges = new Map();
  /** islandId -> { fillGeo, lineGeo, fillMesh } */
  const islands = new Map();
  const sprites = [];
  let selectedId = null;
  let labelClock = 0;

  function paintRange(geo, start, count, hex, shade) {
    const col = geo.getAttribute("color");
    const c = new THREE.Color(hex).multiplyScalar(shade);
    for (let i = start; i < start + count; i++) col.setXYZ(i, c.r, c.g, c.b);
    col.needsUpdate = true;
  }

  function paintPlot(plot) {
    const rec = ranges.get(plot.id);
    if (!rec) return;
    const isle = islands.get(rec.island);
    if (!isle) return;
    const shade = 0.94 + hash01(plot.id) * 0.1;
    paintRange(isle.fillGeo, rec.fillStart, rec.fillCount, fillColorFor(plot, selectedId), shade);
  }

  function buildIsland(id) {
    if (islands.has(id)) return [];
    const spec = specOf(id);
    const plots = getPlots().filter((p) => p.island === id);
    const fillPos = [];
    const fillCol = [];
    const fillIdx = [];
    const linePos = [];
    const lineCol = [];
    const ink = new THREE.Color(LINE_INK);

    for (const p of plots) {
      const ring = p.ring;
      const fillStart = fillPos.length / 3;
      const shade = 0.94 + hash01(p.id) * 0.1;
      const tint = new THREE.Color(fillColorFor(p, selectedId)).multiplyScalar(shade);
      if (ring.length === 4) {
        const base = fillPos.length / 3;
        for (let vi = 0; vi <= GRID; vi++) {
          for (let ui = 0; ui <= GRID; ui++) {
            const pt = quadPoint(ring, ui / GRID, vi / GRID);
            fillPos.push(pt.x, heightAt(spec, pt.x, pt.z) + FILL_LIFT, pt.z);
            fillCol.push(tint.r, tint.g, tint.b);
          }
        }
        const stride = GRID + 1;
        for (let vi = 0; vi < GRID; vi++) {
          for (let ui = 0; ui < GRID; ui++) {
            const a = base + vi * stride + ui;
            fillIdx.push(a, a + stride, a + 1, a + 1, a + stride, a + stride + 1);
          }
        }
      } else {
        // Fan fallback for any non-quad ring.
        const base = fillPos.length / 3;
        fillPos.push(p.x, heightAt(spec, p.x, p.z) + FILL_LIFT, p.z);
        fillCol.push(tint.r, tint.g, tint.b);
        for (let i = 0; i < ring.length; i++) {
          const [x, z] = ring[i];
          fillPos.push(x, heightAt(spec, x, z) + FILL_LIFT, z);
          fillCol.push(tint.r, tint.g, tint.b);
          const a = base + 1 + i;
          const b = base + 1 + ((i + 1) % ring.length);
          fillIdx.push(base, a, b);
        }
      }
      const fillCount = fillPos.length / 3 - fillStart;

      const lineStart = linePos.length / 3;
      for (let i = 0; i < ring.length; i++) {
        const [ax, az] = ring[i];
        const [bx, bz] = ring[(i + 1) % ring.length];
        linePos.push(ax, heightAt(spec, ax, az) + LINE_LIFT, az);
        linePos.push(bx, heightAt(spec, bx, bz) + LINE_LIFT, bz);
        lineCol.push(ink.r, ink.g, ink.b, ink.r, ink.g, ink.b);
      }
      const lineCount = linePos.length / 3 - lineStart;
      ranges.set(p.id, { fillStart, fillCount, lineStart, lineCount, island: id });
    }

    const fillGeo = new THREE.BufferGeometry();
    fillGeo.setAttribute("position", new THREE.Float32BufferAttribute(fillPos, 3));
    fillGeo.setAttribute("color", new THREE.Float32BufferAttribute(fillCol, 3));
    fillGeo.setIndex(fillIdx);
    fillGeo.computeVertexNormals();
    const fillMesh = new THREE.Mesh(
      fillGeo,
      new THREE.MeshLambertMaterial({
        vertexColors: true,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
    );
    fillMesh.name = `parcel-fill:${id}`;
    fillMesh.userData.kind = "parcel-fill";
    fillMesh.userData.label = `${id} parcels`;
    fillMesh.userData.island = id;
    fillMesh.userData.part = "parcel-fill";
    fillMesh.userData.mode = "PAPER";
    fillMesh.receiveShadow = true;

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePos, 3));
    lineGeo.setAttribute("color", new THREE.Float32BufferAttribute(lineCol, 3));
    const lineMesh = new THREE.LineSegments(
      lineGeo,
      new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.65 }),
    );
    lineMesh.name = `parcel-lines:${id}`;
    lineMesh.userData.kind = "parcel-lines";
    lineMesh.userData.label = `${id} parcel lines`;
    lineMesh.userData.island = id;
    lineMesh.userData.mode = "PAPER";

    worldAdd(fillMesh);
    worldAdd(lineMesh);
    islands.set(id, { fillGeo, lineGeo, fillMesh });
    return [fillMesh];
  }

  function has(id) {
    return ranges.has(id);
  }

  function setSelected(id) {
    const prevId = selectedId;
    selectedId = id;
    const plots = getPlots();
    const prev = prevId ? plots.find((p) => p.id === prevId) : null;
    const next = id ? plots.find((p) => p.id === id) : null;
    if (prev) paintPlot(prev);
    if (next) paintPlot(next);
  }

  /** Repaint every mapped plot from the current snapshot (lease/restore). */
  function sync() {
    for (const p of getPlots()) {
      if (ranges.has(p.id)) paintPlot(p);
    }
  }

  function spriteAt(i) {
    if (sprites[i]) return sprites[i];
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 56;
    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }),
    );
    sprite.userData.kind = "parcel-label";
    sprite.userData.mode = "PAPER";
    sprite.userData.plot = null;
    sprite.userData.plotId = null;
    sprite.visible = false;
    sprite.renderOrder = 5;
    worldAdd(sprite);
    sprites[i] = { sprite, canvas, texture, text: "" };
    return sprites[i];
  }

  /** Assign pooled labels to the nearest labelled plots. Throttled. */
  function tick(playerPos, dt = 0.016) {
    labelClock -= dt;
    if (labelClock > 0) return;
    labelClock = 0.5;
    const near = [];
    for (const p of getPlots()) {
      const rec = ranges.get(p.id);
      if (!rec) continue;
      const text = labelTextFor(p);
      if (!text) continue;
      const d = Math.hypot(playerPos.x - p.x, playerPos.z - p.z);
      if (d > LABEL_RADIUS_M) continue;
      near.push({ p, d, text });
    }
    near.sort((a, b) => a.d - b.d);
    // Greedy spacing: nearest tags win, later tags need clear air.
    const shown = [];
    for (const cand of near) {
      if (shown.length >= LABEL_POOL) break;
      let clear = true;
      for (const kept of shown) {
        if (Math.hypot(cand.p.x - kept.p.x, cand.p.z - kept.p.z) < LABEL_MIN_GAP_M) {
          clear = false;
          break;
        }
      }
      if (clear) shown.push(cand);
    }
    for (let i = 0; i < LABEL_POOL; i++) {
      const slot = shown[i];
      if (!slot) {
        if (sprites[i]) sprites[i].sprite.visible = false;
        continue;
      }
      const rec = spriteAt(i);
      if (rec.text !== slot.text) {
        drawLabel(rec.canvas, slot.text, slot.text === "YOURS");
        rec.texture.needsUpdate = true;
        rec.text = slot.text;
      }
      const spec = specOf(slot.p.island);
      const s = Math.max(14, Math.min(32, 8 + Math.sqrt(slot.p.area) * 0.32));
      rec.sprite.position.set(
        slot.p.x,
        heightAt(spec, slot.p.x, slot.p.z) + 3 + s * 0.12,
        slot.p.z,
      );
      rec.sprite.scale.set(s, s * 0.42, 1);
      rec.sprite.userData.plot = slot.p;
      rec.sprite.userData.plotId = slot.p.id;
      rec.sprite.userData.label = slot.text;
      rec.sprite.visible = true;
    }
  }

  /** Visible price tags. Left-click these to open Lease / Close — not the dirt. */
  function clickables() {
    const out = [];
    for (const rec of sprites) {
      if (rec && rec.sprite && rec.sprite.visible) out.push(rec.sprite);
    }
    return out;
  }

  return { buildIsland, has, setSelected, sync, tick, clickables };
}
