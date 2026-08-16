import * as THREE from "three";
import { createTaxi } from "./taxi.js";
import { makeFerry, tickFerry } from "./ferry.js";
import { paintShoreColor, makeShoreFoam } from "./shore.js";
import { makeQuay } from "./quay.js";
import { createTraffic } from "./traffic.js";
import {
  CAMERA_FAR_M,
  FOG_FAR_M,
  FOG_NEAR_M,
  makeRoads,
  spawnCameraOffset,
  spawnLookAtOffset,
} from "./roads.js";
import { canEnter, createInterior, objectWithKind, wrapHarbourWorld } from "./interior.js";
import { createPlayCamera } from "./camera.js";
import { createFerryTicket } from "./ferry-ticket.js";
import { createCatalogPicker, meshForUse } from "./buildings.js";

function ensureDockButton(id, label) {
  let btn = document.getElementById(id);
  if (btn) return btn;
  btn = document.createElement("button");
  btn.type = "button";
  btn.id = id;
  btn.textContent = label;
  btn.title = "PAPER · SIMULATED";
  const dock = document.querySelector("nav.dock");
  const taxiBtn = document.getElementById("btn-taxi");
  if (dock && taxiBtn) dock.insertBefore(btn, taxiBtn);
  else if (dock) dock.appendChild(btn);
  return btn;
}

const canvas = document.getElementById("c");
const statusEl = document.getElementById("status");
const placeEl = document.getElementById("place");
const cashEl = document.getElementById("cash");
const plotLineEl = document.getElementById("plot-line");
const btnLease = document.getElementById("btn-lease");
const btnDevelop = document.getElementById("btn-develop");
const btnFerry = document.getElementById("btn-ferry");
const btnTaxi = document.getElementById("btn-taxi");
const btnEnter = ensureDockButton("btn-enter", "Enter");
const btnExit = ensureDockButton("btn-exit", "Exit");
if (btnEnter) btnEnter.hidden = false;
if (btnExit) btnExit.hidden = true;

function bootFail(err) {
  const msg = err && err.message ? err.message : String(err);
  if (statusEl) statusEl.textContent = "BOOT FAIL: " + msg;
  console.error(err);
}

function makeRenderer() {
  const opts = {
    canvas,
    antialias: false,
    powerPreference: "low-power",
    failIfMajorPerformanceCaveat: false,
  };
  try {
    return new THREE.WebGLRenderer(opts);
  } catch (first) {
    const gl =
      canvas.getContext("webgl2", { antialias: false, powerPreference: "low-power" }) ||
      canvas.getContext("webgl", { antialias: false, powerPreference: "low-power" });
    if (!gl) throw first;
    return new THREE.WebGLRenderer({ canvas, context: gl, antialias: false });
  }
}

let renderer = null;
try {
  renderer = makeRenderer();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  // Shadow maps allocate extra WebGL targets. Swiftshader critics already sit at GPU-cap.
  renderer.shadowMap.enabled = false;
} catch (err) {
  bootFail(err);
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7ec8d4);
scene.fog = new THREE.Fog(0x7ec8d4, FOG_NEAR_M, FOG_FAR_M);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.4, CAMERA_FAR_M);

scene.add(new THREE.HemisphereLight(0xb8e4ff, 0xc4a574, 1.15));
const sun = new THREE.DirectionalLight(0xfff1d0, 2.1);
sun.position.set(180, 260, 80);
sun.castShadow = false;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -220;
sun.shadow.camera.right = 220;
sun.shadow.camera.top = 220;
sun.shadow.camera.bottom = -220;
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 700;
scene.add(sun);

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const walkTarget = new THREE.Vector3();
const tmp = new THREE.Vector3();

let map = null;
let islandId = "north";
let selected = null;
let walking = false;
let lastTap = 0;
let taxi = null;
let traffic = null;
let harbourGroup = null;
let interior = null;
let placingUse = null;
let catalogPicker = null;

const player = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.55, 1.15, 4, 8),
  new THREE.MeshLambertMaterial({ color: 0xf2d2a8 }),
);
player.castShadow = true;
scene.add(player);

const plotMeshes = new Map();
const useMeshes = new Map();
const ground = [];
let ferryMesh = null;

function money(n) {
  return Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function specOf(id) {
  return map.islands[id];
}

/** Keep in sync with game/src/land.ts heightAt */
function heightAt(spec, x, z) {
  const dx = (x - spec.cx) / spec.rx;
  const dz = (z - spec.cz) / spec.rz;
  const ang = Math.atan2(dz, dx);
  const edge = 1 + 0.06 * Math.sin(ang * 5) + 0.03 * Math.sin(ang * 9 + 1.1);
  const r = Math.hypot(dx, dz);
  const toward = spec.id === "north" ? 1 : -1;
  const along = (z - spec.port.z) * toward;
  const across = Math.abs(x - spec.port.x);
  if (across < 16 && along > -24 && along < 90) return 1.12;
  if (r > edge) return -8;
  const t = r / edge;
  const portD = Math.hypot(x - spec.port.x, z - spec.port.z);
  const hillD = Math.hypot(x - spec.hill.x, z - spec.hill.z);
  let h = (1 - t) * (1 - t) * spec.peak * 0.35;
  h += spec.peak * 0.7 * Math.max(0, 1 - hillD / 900) ** 2;
  if (portD < 160) {
    const flatten = 1.15 + portD * 0.002;
    h = Math.min(Math.max(h, 1.05), flatten);
  }
  if (t > 0.8) {
    const beach = (t - 0.8) / 0.2;
    h = h * (1 - beach) + 0.35 * beach;
  }
  return h;
}

function landHeight(x, z) {
  return Math.max(heightAt(specOf("north"), x, z), heightAt(specOf("south"), x, z));
}

function nearestIsland(x, z) {
  const n = specOf("north");
  const s = specOf("south");
  const dn = Math.hypot(x - n.cx, z - n.cz);
  const ds = Math.hypot(x - s.cx, z - s.cz);
  return dn < ds ? "north" : "south";
}

function pointInRing(x, z, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const zi = ring[i][1];
    const xj = ring[j][0];
    const zj = ring[j][1];
    const hit = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-9) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

function findParcelAt(x, z) {
  const hits = map.plots.filter((p) => pointInRing(x, z, p.ring));
  if (!hits.length) return undefined;
  return hits.reduce((a, b) => (a.area <= b.area ? a : b));
}

function setStatus(t) {
  statusEl.textContent = t;
}

function parcelLabel(p) {
  const kind = p.band === "field" ? "field" : p.band === "shore" ? "shore land" : "street land";
  return kind + " · " + money(p.area) + " m²";
}

function nearParcel(p) {
  return (
    pointInRing(player.position.x, player.position.z, p.ring) ||
    Math.hypot(player.position.x - p.x, player.position.z - p.z) < 22
  );
}

function cheapestDevelop() {
  const cat = map.catalog && map.catalog.length ? map.catalog : [];
  if (!cat.length) return map.developCost ?? 40;
  return Math.min(...cat.map((c) => c.paperCost));
}

function canOpenCatalog() {
  if (!map) return false;
  const vacant = map.plots.some((p) => p.owner === "visitor" && !p.use);
  return vacant && map.visitor.cash >= cheapestDevelop();
}

function catalogLabel(id) {
  const cat = map && map.catalog ? map.catalog : [];
  const hit = cat.find((c) => c.id === id);
  return hit ? hit.label : id;
}

function refreshHud() {
  if (!map) return;
  cashEl.textContent = "Cash $" + money(map.visitor.cash);
  const inside = interior && interior.isInside();
  if (inside) {
    placeEl.textContent = interior.currentFloor() === "upstairs" ? "Upstairs" : "Downstairs";
    plotLineEl.textContent = "Inside · PAPER · SIMULATED";
    btnLease.disabled = true;
    btnDevelop.disabled = true;
    if (btnEnter) {
      btnEnter.disabled = true;
      btnEnter.hidden = true;
    }
    if (btnExit) {
      btnExit.disabled = false;
      btnExit.hidden = false;
    }
    return;
  }
  placeEl.textContent = specOf(islandId).name;
  if (btnExit) btnExit.hidden = true;
  if (btnEnter) btnEnter.hidden = false;
  btnDevelop.disabled = !canOpenCatalog();
  if (!selected) {
    plotLineEl.textContent = placingUse
      ? "Tap your leased land to place it (PAPER)"
      : "Tap land to inspect it";
    btnLease.disabled = true;
    if (btnEnter) btnEnter.disabled = true;
    return;
  }
  const p = map.plots.find((x) => x.id === selected);
  if (!p) return;
  const near = nearParcel(p);
  if (btnEnter) btnEnter.disabled = !(canEnter(p) && near);
  if (p.owner === "visitor") {
    plotLineEl.textContent = parcelLabel(p) + (p.use ? " · " + p.use : " · yours");
    btnLease.disabled = true;
  } else if (p.owner) {
    plotLineEl.textContent = parcelLabel(p) + " · taken";
    btnLease.disabled = true;
  } else {
    plotLineEl.textContent = parcelLabel(p) + " · $" + money(p.price);
    btnLease.disabled = !near || map.visitor.cash < p.price;
    if (map.visitor.cash < p.price) {
      plotLineEl.textContent = parcelLabel(p) + " · $" + money(p.price) + " · need cash";
    }
  }
}

function parcelTint(p, isSel) {
  if (isSel) return 0xf0d060;
  if (p.owner === "visitor") return 0xc47848;
  if (p.owner) return 0x7e9458;
  if (p.band === "shore") return 0xd4b483;
  if (p.band === "field") return 0x6a8f44;
  return 0xb7c47a;
}

function makeTerrain(spec) {
  const segsX = 96;
  const segsZ = 64;
  const geo = new THREE.PlaneGeometry(spec.rx * 2.15, spec.rz * 2.15, segsX, segsZ);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = [];
  const grass = spec.id === "north" ? new THREE.Color(0x4a7a3c) : new THREE.Color(0x3d8f4a);
  const sand = new THREE.Color(0xe8d5a3);
  const rock = new THREE.Color(0x6b5a4a);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + spec.cx;
    const z = pos.getZ(i) + spec.cz;
    const h = heightAt(spec, x, z);
    pos.setY(i, Math.max(h, -1.2));
    const dx = (x - spec.cx) / spec.rx;
    const dz = (z - spec.cz) / spec.rz;
    const t = Math.hypot(dx, dz);
    const c = paintShoreColor(h, t, grass, sand, rock);
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  mesh.position.set(spec.cx, 0, spec.cz);
  mesh.receiveShadow = true;
  mesh.userData.kind = "ground";
  scene.add(mesh);
  ground.push(mesh);
}

function box(w, h, d, color, x, y, z, shadow = true) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  scene.add(m);
  return m;
}

function worldAdd(obj) {
  if (harbourGroup) harbourGroup.add(obj);
  else scene.add(obj);
}

function makePort(spec) {
  const toward = spec.id === "north" ? 1 : -1;
  const { x, z } = spec.port;
  const y = heightAt(spec, x, z);
  const pierZ = z + toward * 38;
  const pier = box(11, 0.45, 86, 0x8a6238, x, y + 0.28, pierZ);
  pier.userData.kind = "port";
  for (let i = -5; i <= 5; i++) {
    const piling = box(0.45, 3.4, 0.45, 0x5a3a22, x - 4.6, y - 0.9, pierZ + i * 7.4, false);
    piling.userData.kind = "port";
    const pilingB = box(0.45, 3.4, 0.45, 0x5a3a22, x + 4.6, y - 0.9, pierZ + i * 7.4, false);
    pilingB.userData.kind = "port";
  }
  for (let i = -2; i <= 2; i++) {
    box(0.4, 1.05, 0.4, 0x3d2a1c, x + i * 1.8, y + 0.9, z + toward * 78, false);
  }
  const wx = x + 18;
  const wz = z - toward * 12;
  const shed = box(20, 5.8, 12, 0xd9cbb3, wx, y + 3.15, wz);
  shed.userData.kind = "port";
  const roofA = box(21.2, 0.18, 7.6, 0x6e2e22, wx, y + 6.85, wz - 2.4, false);
  roofA.rotation.x = 0.4;
  const roofB = box(21.2, 0.18, 7.6, 0x6e2e22, wx, y + 6.85, wz + 2.4, false);
  roofB.rotation.x = -0.4;
  box(21.4, 0.14, 0.3, 0x6e2e22, wx, y + 8.15, wz, false);
  const dock = box(8.5, 0.7, 6, 0x9a8a72, wx + toward * 0.2, y + 0.55, wz + toward * 8.2, false);
  dock.userData.kind = "port";
  box(4.2, 3.8, 0.18, 0x3d2a1c, wx, y + 2.2, wz + toward * 6.1, false);
  box(1.5, 1.15, 0.1, 0x8ec4d4, wx - 6.2, y + 4.4, wz + toward * 6.05, false);
  box(1.5, 1.15, 0.1, 0x8ec4d4, wx + 6.2, y + 4.4, wz + toward * 6.05, false);
  for (let i = 0; i < 5; i++) {
    box(1.5, 1.35, 1.5, 0x7a5230, x - 9 + i * 2.0, y + 0.95, z - toward * 4, false);
  }
  box(0.85, 34, 0.85, 0xf3efe4, x - 14, y + 17, z + toward * 4, false);
  box(1.4, 0.35, 1.4, 0xc45c3a, x - 14, y + 34.3, z + toward * 4, false);
}

function palmAt(x, z, y, lean = 0.12) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.z = lean;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.28, 5.4, 6),
    new THREE.MeshLambertMaterial({ color: 0x7a5230 }),
  );
  trunk.position.y = 2.7;
  trunk.castShadow = true;
  g.add(trunk);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f6b32 });
  for (let i = 0; i < 5; i++) {
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.8, 5), leafMat);
    frond.position.set(Math.cos((i / 5) * Math.PI * 2) * 0.35, 5.5, Math.sin((i / 5) * Math.PI * 2) * 0.35);
    frond.rotation.z = Math.cos((i / 5) * Math.PI * 2) * 0.85;
    frond.rotation.x = Math.sin((i / 5) * Math.PI * 2) * 0.85;
    g.add(frond);
  }
  scene.add(g);
}

function makePalms(spec) {
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 + (spec.id === "north" ? 0.2 : 1.1);
    const x = spec.cx + Math.cos(a) * spec.rx * 0.86;
    const z = spec.cz + Math.sin(a) * spec.rz * 0.86;
    const y = heightAt(spec, x, z);
    if (y < 0.35) continue;
    palmAt(x, z, y, (i % 2 ? 1 : -1) * 0.08);
  }
  for (let i = 0; i < 8; i++) {
    const t = 0.12 + i * 0.08;
    const side = i % 2 ? 1 : -1;
    const x = spec.port.x + side * (16 + (i % 3) * 3);
    const z = spec.port.z + (spec.id === "north" ? -1 : 1) * (40 + i * 28);
    const y = heightAt(spec, x, z);
    if (y < 0.4) continue;
    palmAt(x, z, y, side * 0.1);
  }
}

function insetRing(ring, t) {
  let cx = 0;
  let cz = 0;
  for (const p of ring) {
    cx += p[0];
    cz += p[1];
  }
  cx /= ring.length;
  cz /= ring.length;
  return ring.map(([x, z]) => [x + (cx - x) * t, z + (cz - z) * t]);
}

function parcelGeometry(ring, y) {
  const c = { x: 0, z: 0 };
  for (const p of ring) {
    c.x += p[0];
    c.z += p[1];
  }
  c.x /= ring.length;
  c.z /= ring.length;
  const pos = [];
  const idx = [];
  pos.push(c.x, y, c.z);
  for (let i = 0; i < ring.length; i++) {
    pos.push(ring[i][0], y, ring[i][1]);
    const a = i + 1;
    const b = i + 1 < ring.length ? i + 2 : 1;
    idx.push(0, a, b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function paintParcel(p) {
  const rec = plotMeshes.get(p.id);
  if (!rec) return;
  const sel = p.id === selected;
  rec.line.material.color.setHex(parcelTint(p, sel));
  rec.line.material.opacity = sel ? 0.95 : p.owner ? 0.5 : 0.16;
  if (sel) {
    if (!rec.fill) {
      const spec = specOf(p.island);
      const y = heightAt(spec, p.x, p.z) + 0.05;
      rec.fill = new THREE.Mesh(
        parcelGeometry(insetRing(p.ring, 0.16), y),
        new THREE.MeshLambertMaterial({
          color: 0xf0d060,
          transparent: true,
          opacity: 0.28,
          depthWrite: false,
        }),
      );
      rec.fill.userData.kind = "plot";
      rec.fill.userData.plotId = p.id;
      worldAdd(rec.fill);
    }
    rec.fill.visible = true;
    rec.fill.material.color.setHex(parcelTint(p, true));
  } else if (rec.fill) {
    rec.fill.visible = false;
  }
}

function useFor(p) {
  if (!p || !p.use || useMeshes.has(p.id)) return;
  const spec = specOf(p.island);
  const y = heightAt(spec, p.x, p.z);
  const yaw = spec.id === "north" ? 0.15 : 3.3;
  const built = meshForUse(p.use, { area: p.area });
  built.position.set(p.x, y, p.z);
  built.rotation.y = yaw;
  built.userData.kind = "building";
  built.userData.plotId = p.id;
  worldAdd(built);
  useMeshes.set(p.id, built);
}

function makeParcels() {
  for (const p of map.plots) {
    const spec = specOf(p.island);
    const y = heightAt(spec, p.x, p.z) + 0.1;
    const ring = insetRing(p.ring, 0.08);
    const pts = ring.map(([x, z]) => new THREE.Vector3(x, y, z));
    pts.push(pts[0].clone());
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({
        color: parcelTint(p, false),
        transparent: true,
        opacity: p.owner ? 0.45 : 0.06,
      }),
    );
    line.userData.kind = "plot-line";
    line.userData.plotId = p.id;
    scene.add(line);
    plotMeshes.set(p.id, { line, fill: null });
    if (p.use) useFor(p);
  }
}

const playCam = createPlayCamera({
  camera,
  canvas,
  getPlayer: () => player.position,
  getIslandId: () => islandId,
});

function snapCamera() {
  playCam.snap();
}

function spawnAt(id) {
  islandId = id;
  const spec = specOf(id);
  const x = spec.port.x;
  const z = spec.port.z + (id === "north" ? -8 : 8);
  player.position.set(x, heightAt(spec, x, z) + 1.15, z);
  walking = false;
  selected = null;
  if (taxi) taxi.hopOut();
  snapCamera();
  refreshHud();
}

function nearPort() {
  const spec = specOf(islandId);
  return Math.hypot(player.position.x - spec.port.x, player.position.z - spec.port.z) < 28;
}

function goTo(x, z) {
  const h = landHeight(x, z);
  // Keep in sync with game/src/walk.ts BEACH_THRESHOLD_M
  if (h <= 0.25) {
    setStatus("Stay on land.");
    return;
  }
  const midH = landHeight((player.position.x + x) * 0.5, (player.position.z + z) * 0.5);
  if (midH <= 0.25) {
    setStatus("Stay on land.");
    return;
  }
  walkTarget.set(x, h + 1.15, z);
  walking = true;
  islandId = nearestIsland(x, z);
  setStatus("Walking.");
}

function selectLand(p, walk) {
  selected = p.id;
  for (const q of map.plots) paintParcel(q);
  refreshHud();
  if (walk && !nearParcel(p)) {
    goTo(p.x, p.z);
    setStatus("Walking onto that land.");
  } else if (canEnter(p)) {
    setStatus("Yours. Tap the building or Enter (PAPER).");
  } else {
    setStatus(p.owner ? "This land is taken." : "This land. Lease it to develop.");
  }
}

function enterPlot(p) {
  if (!p || !interior || !canEnter(p)) return false;
  walking = false;
  if (taxi && taxi.hopOut) taxi.hopOut();
  const ok = interior.enter(p);
  if (ok) {
    selected = p.id;
    refreshHud();
  }
  return ok;
}

function leaveInterior() {
  if (!interior || !interior.isInside()) return;
  const left = interior.exit();
  if (left) {
    islandId = left.island;
    selected = left.id;
  }
  walking = false;
  snapCamera();
  refreshHud();
}

function onPointer(ev) {
  if (ev.button != null && ev.button !== 0) return;
  if (Date.now() - lastTap < 180) return;
  lastTap = Date.now();
  if (taxi && typeof taxi.mapOpen === "function" && taxi.mapOpen()) return;
  if (ev.target.closest && ev.target.closest("nav, a, button, #taxi-map, #ferry-ticket, #catalog-picker")) return;
  pointer.x = (ev.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(ev.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  if (interior && interior.isInside()) {
    interior.handleRay(raycaster);
    refreshHud();
    return;
  }
  const root = harbourGroup || scene;
  const hits = raycaster.intersectObjects(root.children, true);
  const buildingHit = hits.find((h) => objectWithKind(h.object, "building"));
  const plotHit = hits.find((h) => h.object.userData.kind === "plot");
  const portHit = hits.find((h) => h.object.userData.kind === "port");
  const groundHit = hits.find((h) => h.object.userData.kind === "ground");
  const tapPt = plotHit?.point || groundHit?.point || portHit?.point || buildingHit?.point;
  if (tapPt && taxi && taxi.handleTap(tapPt.x, tapPt.z, nearestIsland(tapPt.x, tapPt.z))) {
    return;
  }
  if (placingUse) {
    const tapped = plotHit
      ? map.plots.find((x) => x.id === plotHit.object.userData.plotId)
      : groundHit
        ? findParcelAt(groundHit.point.x, groundHit.point.z)
        : undefined;
    if (tapped && tapped.owner === "visitor" && !tapped.use) {
      developAt(tapped.id, placingUse);
      return;
    }
    if (tapped) {
      setStatus("Tap land you leased that has no building yet.");
    }
  }
  if (buildingHit) {
    const b = objectWithKind(buildingHit.object, "building");
    const p =
      (b && b.userData.plotId && map.plots.find((x) => x.id === b.userData.plotId)) ||
      findParcelAt(buildingHit.point.x, buildingHit.point.z);
    if (p && canEnter(p) && nearParcel(p)) {
      enterPlot(p);
      return;
    }
    if (p) selectLand(p, true);
    return;
  }
  if (plotHit) {
    const p = map.plots.find((x) => x.id === plotHit.object.userData.plotId);
    if (p) selectLand(p, true);
    return;
  }
  if (portHit && nearPort()) {
    ferry();
    return;
  }
  if (groundHit) {
    const p = findParcelAt(groundHit.point.x, groundHit.point.z);
    if (p) selectLand(p, true);
    else goTo(groundHit.point.x, groundHit.point.z);
  }
}

function applySnapshot(snapshot) {
  if (!snapshot || !snapshot.plots) return;
  map = snapshot;
  refreshHud();
}

async function lease() {
  if (!selected) return;
  const res = await fetch("/api/lease", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ plotId: selected }),
  });
  const body = await res.json();
  if (!body.ok) {
    applySnapshot(body.snapshot);
    setStatus("Could not lease: " + body.reason);
    return;
  }
  applySnapshot(body.snapshot);
  paintParcel(map.plots.find((x) => x.id === selected));
  setStatus("This land is yours for $" + money(body.paid) + " (PAPER). Develop it.");
}

async function developAt(plotId, use) {
  const res = await fetch("/api/develop", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ plotId, use }),
  });
  const body = await res.json();
  if (!body.ok) {
    applySnapshot(body.snapshot);
    setStatus("Could not develop: " + body.reason);
    return false;
  }
  applySnapshot(body.snapshot);
  selected = plotId;
  useFor(map.plots.find((x) => x.id === plotId));
  paintParcel(map.plots.find((x) => x.id === plotId));
  placingUse = null;
  if (catalogPicker) catalogPicker.close();
  setStatus("Developed this land as a " + catalogLabel(use) + " (PAPER).");
  return true;
}

function openCatalog() {
  if (!map) return;
  if (!catalogPicker) return;
  if (catalogPicker.isOpen()) {
    catalogPicker.close();
    placingUse = null;
    setStatus("Catalogue closed.");
    return;
  }
  if (!canOpenCatalog()) return;
  catalogPicker.open(map.catalog && map.catalog.length ? map.catalog : null, map.visitor.cash);
  setStatus("Choose a building (PAPER). Then tap your leased land.");
}

const ferryTicket = createFerryTicket({
  getIslandId: () => islandId,
  spawnAt,
  setStatus,
  applyMap(snapshot) {
    map = snapshot;
    refreshHud();
  },
});

function ferry() {
  if (!nearPort()) return;
  ferryTicket.open();
}

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (renderer) renderer.setSize(w, h);
}

function tick(dt) {
  if (!map) return;
  if (interior && interior.isInside()) {
    interior.tick(dt);
    interior.updateCamera(camera, dt);
    refreshHud();
    return;
  }
  if (taxi) taxi.tick(dt);
  if (traffic) traffic.tick(dt);
  if (walking) {
    const dx = walkTarget.x - player.position.x;
    const dz = walkTarget.z - player.position.z;
    const dist = Math.hypot(dx, dz);
    const step = 18 * dt;
    if (dist <= step) {
      player.position.copy(walkTarget);
      walking = false;
      setStatus("Tap a piece of land to inspect it.");
    } else {
      player.position.x += (dx / dist) * step;
      player.position.z += (dz / dist) * step;
      player.position.y = landHeight(player.position.x, player.position.z) + 1.15;
    }
  }
  if (ferryMesh) tickFerry(ferryMesh, dt);
  btnFerry.disabled = !nearPort();
  refreshHud();
  playCam.tick(dt);
  sun.position.set(player.position.x + 180, 260, player.position.z + 80);
  sun.target.position.copy(player.position);
  sun.target.updateMatrixWorld();
}

let loopStarted = false;
function startLoop() {
  if (!renderer || loopStarted) return;
  loopStarted = true;
  renderer.setAnimationLoop(() => {
    const dt = Math.min(0.05, clock.getDelta());
    tick(dt);
    renderer.render(scene, camera);
  });
}

async function boot() {
  const res = await fetch("/api/map");
  map = await res.json();
  refreshHud();
  if (!renderer) {
    setStatus("Map loaded. 3D harbour failed (WebGL).");
    return;
  }
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(80000, 80000),
    new THREE.MeshLambertMaterial({ color: 0x1d7a86 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0;
  scene.add(water);
  spawnAt("north");
  startLoop();
  makeTerrain(specOf("north"));
  makeTerrain(specOf("south"));
  makeShoreFoam(specOf("north"), heightAt, scene);
  makeShoreFoam(specOf("south"), heightAt, scene);
  makeRoads(map, { scene, specOf, heightAt });
  makePort(specOf("north"));
  makeQuay(specOf("north"), { scene, heightAt });
  makePort(specOf("south"));
  makeQuay(specOf("south"), { scene, heightAt });
  ferryMesh = makeFerry();
  scene.add(ferryMesh);
  makePalms(specOf("north"));
  makePalms(specOf("south"));
  makeParcels();
  taxi = createTaxi({
    scene,
    player,
    getMap: () => map,
    specOf,
    heightAt,
    getIslandId: () => islandId,
    setWalking: (v) => {
      walking = v;
    },
    setStatus,
    button: btnTaxi,
  });
  traffic = createTraffic({
    scene,
    getMap: () => map,
    specOf,
    heightAt,
    getPlayer: () => player,
    getIslandId: () => islandId,
  });
  harbourGroup = wrapHarbourWorld(scene, { keep: [player, sun.target] });
  interior = createInterior({
    scene,
    player,
    setStatus,
    heightAt,
    specOf,
  });
  interior.setHarbour(harbourGroup);
  setStatus("Tap a piece of land. Lease it, then develop it.");
}

catalogPicker = createCatalogPicker({
  onPick(id) {
    placingUse = id;
    setStatus("Tap your leased land to place a " + catalogLabel(id) + " (PAPER).");
  },
  onCancel() {
    placingUse = null;
    setStatus("Tap a piece of land. Lease it, then develop it.");
  },
});
canvas.addEventListener("pointerup", onPointer);
btnLease.addEventListener("click", lease);
btnDevelop.addEventListener("click", openCatalog);
if (btnEnter) {
  btnEnter.addEventListener("click", () => {
    if (!selected || !map) return;
    const p = map.plots.find((x) => x.id === selected);
    if (p) enterPlot(p);
  });
}
if (btnExit) btnExit.addEventListener("click", leaveInterior);
btnFerry.addEventListener("click", ferry);
window.addEventListener("resize", onResize);
scene.add(sun.target);

boot().catch(bootFail);
