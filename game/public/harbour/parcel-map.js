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
/** Lots overlay: show tags across the nearby town, not only the next street. */
export const LABEL_RADIUS_LOTS_M = 2400;
/** Pooled sprites. Bounded so a dense town cannot mint unbounded canvases. */
export const LABEL_POOL = 72;
export const LABEL_POOL_LOTS = 160;
/** Metres between shown tags. Street cuts sit ~45 m apart; without a floor
 *  their tags stack into an unreadable shingle pile. */
export const LABEL_MIN_GAP_M = 26;
export const LABEL_MIN_GAP_LOTS_M = 12;
/** Metres above ground. */
const FILL_LIFT = 0.35;
const LINE_LIFT = 0.5;
/** Bilinear grid per quad so fills follow the terrain instead of cutting it. */
const GRID = 4;

export function fillColorFor(plot, selectedId) {
  if (selectedId && plot.id === selectedId) return FILL_SELECTED;
  if (plot.owner === "visitor") return FILL_VISITOR;
  if (plot.owner) return FILL_NPC;
  if (plot.class === "cart_pad") return 0xc4a574;
  return FILL_VACANT[plot.band] ?? FILL_VACANT.field;
}

/** Vacant land shows its PAPER price. Your land says so. NPC land stays quiet. */
export function labelTextFor(plot) {
  if (plot.class === "reserved") return null;
  if (plot.owner === "visitor") return "YOURS";
  if (plot.owner) return null;
  return "$" + Number(plot.price).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/** Screen-space box for a billboard tag. Used so a left-click on $146 hits even
 *  when THREE.Sprite.raycast misses the non-square scale. */
export function labelScreenBox(ndcX, ndcY, dist, scaleX, scaleY, viewW, viewH, fovDeg) {
  const sx = (ndcX * 0.5 + 0.5) * viewW;
  const sy = (-ndcY * 0.5 + 0.5) * viewH;
  const vFov = ((fovDeg || 50) * Math.PI) / 180;
  const m = viewH / (2 * Math.tan(vFov / 2) * Math.max(0.5, dist));
  return {
    sx,
    sy,
    hw: Math.max(48, (scaleX * m) / 2),
    hh: Math.max(28, (scaleY * m) / 2),
  };
}

export function pointInLabelBox(cx, cy, box) {
  return Math.abs(cx - box.sx) <= box.hw && Math.abs(cy - box.sy) <= box.hh;
}

/** CSS box of the harbour canvas. Window size is wrong inside a letterboxed tab. */
export function canvasBox(canvas) {
  if (canvas && typeof canvas.getBoundingClientRect === "function") {
    const r = canvas.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return r;
  }
  const w = typeof window !== "undefined" ? window.innerWidth : 1;
  const h = typeof window !== "undefined" ? window.innerHeight : 1;
  return { left: 0, top: 0, width: w || 1, height: h || 1 };
}

/** Map a click onto the harbour canvas, not the whole window. */
export function pointerToNdc(ev, canvas) {
  const r = canvasBox(canvas);
  return {
    x: ((ev.clientX - r.left) / r.width) * 2 - 1,
    y: -((ev.clientY - r.top) / r.height) * 2 + 1,
  };
}

/** Screen-space coords inside the canvas used by pickLabel. */
export function pickCoords(clientX, clientY, viewW, viewH, canvas) {
  if (canvas) {
    const r = canvasBox(canvas);
    return { x: clientX - r.left, y: clientY - r.top, w: r.width, h: r.height };
  }
  return { x: clientX, y: clientY, w: viewW, h: viewH };
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

  /** 3D billboards stay off. World $ / YOURS live in lot-tags.js with depth test. */
  function tick() {
    for (const rec of sprites) {
      if (rec && rec.sprite) rec.sprite.visible = false;
    }
  }

  /** Visible price tags. Left-click these to buy the lot. */
  function clickables() {
    const out = [];
    for (const rec of sprites) {
      if (rec && rec.sprite && rec.sprite.visible) out.push(rec.sprite);
    }
    return out;
  }

  /** Hit-test a click against visible $ tags in screen space. */
  function pickLabel(camera, clientX, clientY, viewW, viewH, canvas) {
    const coords = pickCoords(clientX, clientY, viewW, viewH, canvas);
    if (!camera || !coords.w || !coords.h) return null;
    const ndc = new THREE.Vector3();
    let best = null;
    const fov = camera.fov || 50;
    for (const rec of sprites) {
      if (!rec || !rec.sprite.visible) continue;
      const spr = rec.sprite;
      ndc.copy(spr.position).project(camera);
      if (!Number.isFinite(ndc.x) || ndc.z > 1 || ndc.z < -1) continue;
      const dist = camera.position.distanceTo(spr.position);
      const box = labelScreenBox(
        ndc.x,
        ndc.y,
        dist,
        spr.scale.x,
        spr.scale.y,
        coords.w,
        coords.h,
        fov,
      );
      if (!pointInLabelBox(coords.x, coords.y, box)) continue;
      const d = Math.hypot(coords.x - box.sx, coords.y - box.sy);
      if (!best || d < best.d) best = { d, plotId: spr.userData.plotId, sprite: spr };
    }
    return best;
  }

  return { buildIsland, has, setSelected, sync, tick, clickables, pickLabel };
}
