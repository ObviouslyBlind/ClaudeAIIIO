import * as THREE from "three";

/** Metres. On the carriageway (paved width 6.2). */
const ON_PAVED = 6.5;
/** Metres. Player can board from the verge. */
const NEAR_PAVED = 12;
/** Metres. Dirt-track hit, not a taxi destination. */
const ON_DIRT = 5;
const SPEED = 42;
const TAXI_Y = 0.04;
/** Hailed cab leaves if nobody boards. */
export const TAXI_WAIT_MS = 60_000;

/**
 * Closest point on a polyline in XZ. Used to stay on paved points only.
 */
export function projectOnPolyline(points, x, z) {
  let best = { x, z, i: 0, t: 0, dist: Infinity, along: 0 };
  let acc = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const vx = b.x - a.x;
    const vz = b.z - a.z;
    const len2 = vx * vx + vz * vz || 1;
    const len = Math.sqrt(len2);
    let t = ((x - a.x) * vx + (z - a.z) * vz) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = a.x + vx * t;
    const pz = a.z + vz * t;
    const dist = Math.hypot(x - px, z - pz);
    if (dist < best.dist) {
      best = { x: px, z: pz, i, t, dist, along: acc + t * len };
    }
    acc += len;
  }
  return best;
}

function compactPath(path) {
  const out = [];
  for (const p of path) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.z - last.z) > 0.25) out.push(p);
  }
  return out;
}

/** Follow paved vertices from a projected start to a projected end. Never dirt. */
export function pathAlongPolyline(points, fromX, fromZ, toX, toZ) {
  if (!points || points.length < 2) return [];
  const from = projectOnPolyline(points, fromX, fromZ);
  const to = projectOnPolyline(points, toX, toZ);
  const path = [{ x: from.x, z: from.z }];
  if (from.i < to.i || (from.i === to.i && from.t <= to.t)) {
    for (let i = from.i + 1; i <= to.i; i++) path.push({ x: points[i].x, z: points[i].z });
  } else {
    for (let i = from.i; i > to.i; i--) path.push({ x: points[i].x, z: points[i].z });
  }
  path.push({ x: to.x, z: to.z });
  return compactPath(path);
}

/**
 * True when a hailed cab (coming / waiting) has waited long enough with no board.
 * Pass nowMs — do not sleep in tests.
 */
export function taxiWaitExpired(mode, startedAtMs, nowMs, limitMs = TAXI_WAIT_MS) {
  if (mode !== "coming" && mode !== "waiting") return false;
  if (startedAtMs == null) return false;
  return nowMs - startedAtMs >= limitMs;
}

/** Top-down island frame. +Z is south, so canvas Y grows south (north is up). */
export function islandMapBounds(spec, pad = 1.08) {
  return {
    minX: spec.cx - spec.rx * pad,
    maxX: spec.cx + spec.rx * pad,
    minZ: spec.cz - spec.rz * pad,
    maxZ: spec.cz + spec.rz * pad,
  };
}

export function worldToMapPx(bounds, x, z, w, h) {
  return {
    sx: ((x - bounds.minX) / (bounds.maxX - bounds.minX)) * w,
    sy: ((z - bounds.minZ) / (bounds.maxZ - bounds.minZ)) * h,
  };
}

export function mapPxToWorld(bounds, sx, sy, w, h) {
  return {
    x: bounds.minX + (sx / w) * (bounds.maxX - bounds.minX),
    z: bounds.minZ + (sy / h) * (bounds.maxZ - bounds.minZ),
  };
}

/** Rough map tap → closest paved point. Dirt is never a destination. */
export function pavedDestFromMapClick(roads, islandId, spec, sx, sy, w, h) {
  const world = mapPxToWorld(islandMapBounds(spec), sx, sy, w, h);
  let best = null;
  for (const r of roads) {
    if (r.kind !== "paved" || r.island !== islandId || !r.points || r.points.length < 2) continue;
    const proj = projectOnPolyline(r.points, world.x, world.z);
    if (!best || proj.dist < best.proj.dist) best = { road: r, proj };
  }
  return best;
}

function taxiMat(color, extra = {}) {
  return new THREE.MeshLambertMaterial({ color, ...extra });
}

function taxiBox(w, h, d, mat, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = shadow;
  m.receiveShadow = true;
  m.frustumCulled = false;
  m.userData.mode = "PAPER";
  return m;
}

function tagPart(mesh, part) {
  mesh.userData.part = part;
  mesh.userData.mode = "PAPER";
  return mesh;
}

/** Four black tyres with a hub so the cab is not a floating box. */
function addTaxiWheels(g, tyreMat, hubMat) {
  const tyreGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.36, 10);
  tyreGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.38, 8);
  hubGeo.rotateZ(Math.PI / 2);
  for (const [x, z] of [
    [1.28, 1.55],
    [-1.28, 1.55],
    [1.28, -1.55],
    [-1.28, -1.55],
  ]) {
    const tyre = new THREE.Mesh(tyreGeo, tyreMat);
    tyre.position.set(x, 0.48, z);
    tyre.castShadow = true;
    tyre.frustumCulled = false;
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.position.set(x, 0.48, z);
    hub.frustumCulled = false;
    g.add(tyre, hub);
  }
}

/**
 * Yellow cab that reads from the quay: wheels, glass, roof lamp.
 * Compact warm PAPER taxi-sign box — original cream lamp, not a sedan lid,
 * not a debug mast, not a cop lightbar.
 */
export function makeTaxiMesh() {
  const g = new THREE.Group();
  g.frustumCulled = false;
  const yellow = taxiMat(0xf0c430, { emissive: 0xf0c430, emissiveIntensity: 0.18 });
  const cabin = taxiMat(0xf6d65a, { emissive: 0xf6d65a, emissiveIntensity: 0.12 });
  const dark = taxiMat(0x1a1a1e);
  const chrome = taxiMat(0xc8c4b8);
  const glass = taxiMat(0x3a5a6c, { emissive: 0x1a3040, emissiveIntensity: 0.22 });
  /** Original taxi lamp cream. Warm PAPER glow, not neon. */
  const lamp = taxiMat(0xfff3a0, { emissive: 0xfff3a0, emissiveIntensity: 0.78 });
  const lampSide = taxiMat(0x2a2a2e);
  const head = taxiMat(0xfff4d2, { emissive: 0xffe9a8, emissiveIntensity: 0.4 });
  const tail = taxiMat(0xc42a22, { emissive: 0x8a1814, emissiveIntensity: 0.35 });

  const body = taxiBox(2.45, 1.05, 5.05, yellow);
  body.position.y = 0.92;
  g.add(body);

  const bumperF = taxiBox(2.52, 0.28, 0.28, dark, false);
  bumperF.position.set(0, 0.52, 2.58);
  const bumperR = taxiBox(2.52, 0.28, 0.28, dark, false);
  bumperR.position.set(0, 0.52, -2.58);
  g.add(bumperF, bumperR);

  const roof = taxiBox(2.18, 0.92, 2.45, cabin);
  roof.position.set(0, 1.68, -0.22);
  g.add(roof);

  const wind = taxiBox(2.02, 0.72, 0.16, glass, false);
  wind.position.set(0, 1.62, 1.08);
  wind.rotation.x = -0.42;
  g.add(wind);

  const rearGlass = taxiBox(1.95, 0.58, 0.12, glass, false);
  rearGlass.position.set(0, 1.62, -1.42);
  rearGlass.rotation.x = 0.28;
  g.add(rearGlass);

  for (const z of [0.22, -0.55]) {
    const side = taxiBox(0.08, 0.48, 0.95, glass, false);
    side.position.set(1.12, 1.62, z);
    const sideB = side.clone();
    sideB.position.x = -1.12;
    g.add(side, sideB);
  }

  const roofTopY = 1.68 + 0.46;
  const lampZ = -0.12;
  const lampBase = tagPart(taxiBox(0.7, 0.08, 0.42, lampSide, false), "lamp");
  lampBase.position.set(0, roofTopY + 0.04, lampZ);
  const sign = tagPart(taxiBox(0.92, 0.5, 0.4, lamp), "lamp");
  sign.position.set(0, roofTopY + 0.33, lampZ);
  const cap = tagPart(taxiBox(0.98, 0.06, 0.44, lampSide, false), "lamp");
  cap.position.set(0, sign.position.y + 0.28, lampZ);
  g.add(lampBase, sign, cap);
  for (const x of [-0.48, 0.48]) {
    const end = tagPart(taxiBox(0.06, 0.52, 0.42, lampSide, false), "lamp");
    end.position.set(x, sign.position.y, lampZ);
    g.add(end);
  }

  for (const x of [-0.72, 0.72]) {
    const hl = taxiBox(0.42, 0.22, 0.12, head, false);
    hl.position.set(x, 0.78, 2.56);
    const tl = taxiBox(0.38, 0.18, 0.1, tail, false);
    tl.position.set(x, 0.78, -2.56);
    g.add(hl, tl);
  }

  addTaxiWheels(g, dark, chrome);

  g.userData.kind = "taxi";
  g.userData.mode = "PAPER";
  return g;
}

export function createTaxi({
  scene,
  player,
  getMap,
  specOf,
  heightAt,
  getIslandId,
  setWalking,
  setStatus,
  button,
}) {
  const mesh = makeTaxiMesh();
  mesh.visible = false;
  scene.add(mesh);

  const overlayEl = typeof document !== "undefined" ? document.getElementById("taxi-map") : null;
  const overlayCanvas = typeof document !== "undefined" ? document.getElementById("taxi-map-canvas") : null;
  const overlayClose = typeof document !== "undefined" ? document.getElementById("taxi-map-close") : null;

  /** idle | coming | waiting | boarded | hauling */
  let mode = "idle";
  let island = "north";
  let road = null;
  let path = [];
  let pi = 0;
  let waitStartedAtMs = null;
  let overlayOpen = false;

  function pavedRoads(islandId) {
    const map = getMap();
    if (!map) return [];
    return map.roads.filter((r) => r.kind === "paved" && r.island === islandId);
  }

  function closestPaved(x, z, islandId) {
    let best = null;
    for (const r of pavedRoads(islandId)) {
      if (!r.points || r.points.length < 2) continue;
      const proj = projectOnPolyline(r.points, x, z);
      if (!best || proj.dist < best.proj.dist) best = { road: r, proj };
    }
    return best;
  }

  function nearestDirt(x, z, islandId) {
    const map = getMap();
    if (!map) return Infinity;
    let best = Infinity;
    for (const r of map.roads) {
      if (r.kind !== "dirt" || r.island !== islandId || !r.points || r.points.length < 2) continue;
      best = Math.min(best, projectOnPolyline(r.points, x, z).dist);
    }
    return best;
  }

  function place(x, z, yaw) {
    const spec = specOf(island);
    const y = heightAt(spec, x, z);
    mesh.position.set(x, y + TAXI_Y, z);
    if (yaw != null) mesh.rotation.y = yaw;
  }

  function attachPlayer() {
    player.position.x = mesh.position.x;
    player.position.z = mesh.position.z;
    player.position.y = mesh.position.y + 1.35;
    player.rotation.y = mesh.rotation.y;
  }

  function setPath(pts) {
    path = pts;
    pi = 0;
  }

  function pathDone() {
    return path.length < 2 || pi >= path.length - 1;
  }

  function driveTo(x, z) {
    if (!road) return false;
    const pts = pathAlongPolyline(road.points, mesh.position.x, mesh.position.z, x, z);
    if (pts.length < 2) return false;
    setPath(pts);
    return true;
  }

  function parkOnPaved() {
    const hit = closestPaved(player.position.x, player.position.z, island);
    if (!hit) return false;
    road = hit.road;
    const start = road.points[0];
    place(start.x, start.z, Math.atan2(road.points[1].x - start.x, road.points[1].z - start.z));
    mesh.visible = true;
    return true;
  }

  function sizeOverlayCanvas() {
    if (!overlayCanvas) return;
    const r = overlayCanvas.getBoundingClientRect();
    overlayCanvas.width = Math.max(160, Math.floor(r.width) || 320);
    overlayCanvas.height = Math.max(120, Math.floor(r.height) || 220);
  }

  function drawMap() {
    if (!overlayCanvas || !overlayOpen) return;
    const ctx = overlayCanvas.getContext("2d");
    if (!ctx) return;
    const spec = specOf(island);
    const w = overlayCanvas.width;
    const h = overlayCanvas.height;
    const bounds = islandMapBounds(spec);
    ctx.fillStyle = "#1d7a86";
    ctx.fillRect(0, 0, w, h);
    const c = worldToMapPx(bounds, spec.cx, spec.cz, w, h);
    const rxPx = (spec.rx / (bounds.maxX - bounds.minX)) * w;
    const rzPx = (spec.rz / (bounds.maxZ - bounds.minZ)) * h;
    ctx.fillStyle = spec.id === "north" ? "#4a7a3c" : "#3d8f4a";
    ctx.beginPath();
    ctx.ellipse(c.sx, c.sy, rxPx, rzPx, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2a2a2e";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    for (const r of pavedRoads(island)) {
      if (!r.points.length) continue;
      ctx.beginPath();
      r.points.forEach((p, i) => {
        const m = worldToMapPx(bounds, p.x, p.z, w, h);
        if (i === 0) ctx.moveTo(m.sx, m.sy);
        else ctx.lineTo(m.sx, m.sy);
      });
      ctx.stroke();
    }
    const me = worldToMapPx(bounds, mesh.position.x, mesh.position.z, w, h);
    ctx.fillStyle = "#f0c430";
    ctx.beginPath();
    ctx.arc(me.sx, me.sy, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  function openOverlay() {
    overlayOpen = true;
    if (overlayEl) overlayEl.hidden = false;
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        sizeOverlayCanvas();
        drawMap();
      });
    } else {
      sizeOverlayCanvas();
      drawMap();
    }
  }

  function closeOverlay() {
    overlayOpen = false;
    if (overlayEl) overlayEl.hidden = true;
  }

  function tryCollect() {
    const px = player.position.x;
    const pz = player.position.z;
    const hit = road ? { proj: projectOnPolyline(road.points, px, pz) } : closestPaved(px, pz, island);
    if (!hit || hit.proj.dist > NEAR_PAVED) return false;
    if (Math.hypot(px - mesh.position.x, pz - mesh.position.z) > 16) return false;
    setWalking(false);
    mode = "boarded";
    waitStartedAtMs = null;
    attachPlayer();
    openOverlay();
    setStatus("Taxi collected you. Tap the map to ride. PAPER · SIMULATED.");
    return true;
  }

  function hopOut() {
    if (mode === "idle") return;
    const riding = mode === "boarded" || mode === "hauling";
    mode = "idle";
    path = [];
    pi = 0;
    waitStartedAtMs = null;
    closeOverlay();
    if (riding) {
      const spec = specOf(island);
      player.position.y = heightAt(spec, player.position.x, player.position.z) + 1.15;
    }
  }

  function dismissUnboarded() {
    mode = "idle";
    path = [];
    pi = 0;
    road = null;
    waitStartedAtMs = null;
    mesh.visible = false;
    closeOverlay();
    setStatus("Taxi drove away. PAPER.");
  }

  function call() {
    island = getIslandId();
    const px = player.position.x;
    const pz = player.position.z;
    const hit = closestPaved(px, pz, island);
    if (!hit) {
      setStatus("No paved road here. PAPER.");
      return;
    }
    if (mode === "boarded" || mode === "hauling") {
      hopOut();
      setStatus("Out of the taxi. PAPER.");
      return;
    }
    const sameIsland = mesh.visible && road && road.island === island;
    road = hit.road;
    if (!sameIsland) parkOnPaved();
    mesh.visible = true;
    driveTo(hit.proj.x, hit.proj.z);
    mode = "coming";
    waitStartedAtMs = Date.now();
    setStatus("Taxi coming along the paved road. PAPER.");
  }

  /**
   * @returns {boolean} true if the tap is consumed (no walk)
   */
  function handleTap(x, z, tapIsland) {
    if (overlayOpen) return true;
    if (mode !== "boarded" && mode !== "hauling") return false;
    hopOut();
    const onDirt = nearestDirt(x, z, island) <= ON_DIRT;
    setStatus(
      onDirt ? "Taxi stays on paved. Dirt is forbidden. PAPER." : "Out of the taxi. PAPER.",
    );
    return false;
  }

  function pickMapDest(ev) {
    if (!overlayOpen || !overlayCanvas) return;
    const rect = overlayCanvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const sx = ((ev.clientX - rect.left) / rect.width) * overlayCanvas.width;
    const sy = ((ev.clientY - rect.top) / rect.height) * overlayCanvas.height;
    const spec = specOf(island);
    const map = getMap();
    const hit = map ? pavedDestFromMapClick(map.roads, island, spec, sx, sy, overlayCanvas.width, overlayCanvas.height) : null;
    if (!hit) {
      setStatus("No paved road here. PAPER.");
      return;
    }
    road = hit.road;
    if (!driveTo(hit.proj.x, hit.proj.z)) {
      setStatus("Taxi stays on paved. Dirt is forbidden. PAPER.");
      return;
    }
    mode = "hauling";
    setWalking(false);
    closeOverlay();
    setStatus("Taxi on paved. PAPER · SIMULATED.");
  }

  function tick(dt, nowMs = Date.now()) {
    if (taxiWaitExpired(mode, waitStartedAtMs, nowMs)) {
      dismissUnboarded();
      return;
    }
    if (mode === "idle" || !mesh.visible) return;

    if (!pathDone()) {
      let remain = SPEED * dt;
      while (remain > 0 && pi < path.length - 1) {
        const b = path[pi + 1];
        const dx = b.x - mesh.position.x;
        const dz = b.z - mesh.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.08) {
          pi += 1;
          continue;
        }
        const yaw = Math.atan2(dx, dz);
        if (dist <= remain) {
          place(b.x, b.z, yaw);
          pi += 1;
          remain -= dist;
        } else {
          place(mesh.position.x + (dx / dist) * remain, mesh.position.z + (dz / dist) * remain, yaw);
          remain = 0;
        }
      }
    }

    if (mode === "coming" && pathDone()) {
      const px = player.position.x;
      const pz = player.position.z;
      const proj = road ? projectOnPolyline(road.points, px, pz) : null;
      if (proj && proj.dist <= NEAR_PAVED) {
        const d = Math.hypot(mesh.position.x - proj.x, mesh.position.z - proj.z);
        if (d > 4) {
          driveTo(proj.x, proj.z);
        } else if (!tryCollect()) {
          mode = "waiting";
          setStatus("Taxi waiting on paved. Walk to the road. PAPER.");
        }
      } else if (!tryCollect()) {
        mode = "waiting";
        setStatus("Taxi waiting on paved. Walk to the road. PAPER.");
      }
    }

    if (mode === "waiting") {
      if (!tryCollect() && road) {
        const proj = projectOnPolyline(road.points, player.position.x, player.position.z);
        if (proj.dist <= NEAR_PAVED) {
          const d = Math.hypot(mesh.position.x - proj.x, mesh.position.z - proj.z);
          if (d > 4) {
            driveTo(proj.x, proj.z);
            mode = "coming";
          }
        }
      }
    }

    if (mode === "hauling" && pathDone()) {
      mode = "boarded";
      setStatus("Taxi stopped. Tap the map. PAPER · SIMULATED.");
      openOverlay();
    }

    if (mode === "boarded" || mode === "hauling") {
      setWalking(false);
      attachPlayer();
    }
  }

  button.addEventListener("click", call);
  if (typeof getIslandId === "function") island = getIslandId() || island;
  parkOnPaved();
  if (overlayCanvas) {
    overlayCanvas.addEventListener("pointerup", (ev) => {
      ev.stopPropagation();
      pickMapDest(ev);
    });
  }
  if (overlayClose) {
    overlayClose.addEventListener("click", () => {
      hopOut();
      setStatus("Out of the taxi. PAPER.");
    });
  }

  return { mesh, call, handleTap, hopOut, tick, mapOpen: () => overlayOpen };
}
