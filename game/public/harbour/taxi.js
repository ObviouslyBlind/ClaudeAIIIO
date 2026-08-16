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

function makeTaxiMesh() {
  const g = new THREE.Group();
  const yellow = new THREE.MeshLambertMaterial({ color: 0xf0c430 });
  const cabin = new THREE.MeshLambertMaterial({ color: 0xf6d65a });
  const dark = new THREE.MeshLambertMaterial({ color: 0x2a2a2e });
  const glass = new THREE.MeshLambertMaterial({ color: 0x4a6a78 });
  const lamp = new THREE.MeshLambertMaterial({ color: 0xfff3a0 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.82, 3.7), yellow);
  body.position.y = 0.68;
  body.castShadow = true;
  g.add(body);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.62, 1.65), cabin);
  roof.position.set(0, 1.32, -0.22);
  roof.castShadow = true;
  g.add(roof);

  const wind = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.38, 0.08), glass);
  wind.position.set(0, 1.34, 0.58);
  g.add(wind);

  const sign = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.2, 0.55), lamp);
  sign.position.set(0, 1.76, -0.22);
  g.add(sign);

  const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.26, 8);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const [x, z] of [
    [0.92, 1.12],
    [-0.92, 1.12],
    [0.92, -1.12],
    [-0.92, -1.12],
  ]) {
    const w = new THREE.Mesh(wheelGeo, dark);
    w.position.set(x, 0.3, z);
    g.add(w);
  }
  g.userData.kind = "taxi";
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
