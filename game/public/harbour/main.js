import * as THREE from "three";
import { paintShoreColor } from "./shore.js";
import {
  CAMERA_FAR_M,
  FOG_FAR_M,
  FOG_NEAR_M,
  makeRoads,
  spawnCameraOffset,
  spawnLookAtOffset,
} from "./roads.js";
import { canEnter, objectWithKind, wrapHarbourWorld } from "./harbour-world.js";
import { createPlayCamera } from "./camera.js";
import { createFerryTicket } from "./ferry-ticket.js";
import { makeWater } from "./water.js";
import { makeSky } from "./sky.js";
import { CAM, LOOK } from "./first-frame.js";
import { dressPlayer } from "./player.js";
import { makeHotdogCart, makeCrate } from "./cart.js";
import { createWalkPath } from "./walk-path.js";
import { mountChrome } from "./chrome.js";
import { createOverlays } from "./overlays.js";
import { mountEconHud } from "./hud-econ.js";
import { mountPresenceHud } from "./presence-hud.js";
import { mountStaffHud } from "./staff-hud.js";
import { mountCalendarHud } from "./calendar-hud.js";
import { mountParcelMap } from "./parcel-map.js";

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
  if (globalThis.__harbourFirst && globalThis.__harbourFirst.renderer) {
    return globalThis.__harbourFirst.renderer;
  }
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

const first = globalThis.__harbourFirst;
let renderer = null;
try {
  renderer = makeRenderer();
  if (!first || !first.renderer) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = false;
  }
} catch (err) {
  bootFail(err);
}

const scene = (first && first.scene) || new THREE.Scene();
if (!scene.fog) scene.fog = new THREE.Fog(0x7ec8d4, FOG_NEAR_M, FOG_FAR_M);
scene.background = new THREE.Color(0x7ec8d4);
makeSky(scene);

const camera =
  (first && first.camera) ||
  new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.4, CAMERA_FAR_M);

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

if (statusEl) statusEl.textContent = "South port · PAPER";
if (renderer) {
  camera.position.set(CAM.x, CAM.y, CAM.z);
  camera.lookAt(LOOK.x, LOOK.y, LOOK.z);
  renderer.render(scene, camera);
}

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const walkTarget = new THREE.Vector3();
const tmp = new THREE.Vector3();

let map = null;
let islandId = "south";
let selected = null;
let walking = false;
let lastTap = 0;
let taxi = null;
let traffic = null;
let harbourGroup = null;
let interior = null;
let placingUse = null;
let catalogPicker = null;
let staffHud = null;
let parcelMap = null;
let propsMod = null;
let chromeHud = null;
let walkPath = null;
let overlays = null;
let deliveries = null;
let lastInspectKey = "";
let landPinned = false;
const standMeshes = new Map();
const crateMeshes = new Map();
const propsBuilt = new Set();
let rmbDown = null;

const player = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.55, 1.15, 4, 8),
  new THREE.MeshLambertMaterial({ color: 0xf2d2a8 }),
);
player.castShadow = true;
dressPlayer(player);
scene.add(player);
walkPath = createWalkPath(scene);

const plotMeshes = new Map();
const useMeshes = new Map();
const ground = [];
/** Pier / shed / dock boxes so tapping the port can open the ferry. */
const ports = [];
let ferryMesh = null;
let tickFerry = null;
let meshForUse = null;
const econHud = mountEconHud({
  el: document.getElementById("econ"),
});
mountCalendarHud({
  el: document.getElementById("calendar"),
});
mountPresenceHud({
  el: document.getElementById("nearby"),
  getPos: () => player.position,
});

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
  // Apron only. A 90 m seaward pad put the timber pier on sand.
  if (across < 22 && along > -16 && along < 14) return 1.12;
  // Harbour cove: pier slot widens seaward into the open sea (see land.ts).
  if (along >= 14) {
    const reach = along - 14;
    const mouth = 8 + reach * 0.55;
    if (across < mouth) return -2 - 6 * Math.min(1, reach / 90);
  }
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

function canLeasePlot(p) {
  const cash = map.visitor && Number.isFinite(map.visitor.cash) ? map.visitor.cash : 0;
  const need = map.developCost ?? 40;
  return p && !p.owner && p.price + need <= cash;
}

function parcelMapped(p) {
  return plotMeshes.has(p.id) || (parcelMap && parcelMap.has(p.id));
}

function findParcelAt(x, z) {
  const hits = [];
  for (const p of map.plots) {
    if (!parcelMapped(p)) continue;
    const reach = Math.max(80, Math.sqrt(p.area || 0) * 2);
    if (Math.hypot(x - p.x, z - p.z) > reach) continue;
    if (pointInRing(x, z, p.ring)) hits.push(p);
  }
  if (hits.length) {
    // Any parcel is inspectable — the HUD says taken / need cash on its own.
    return hits.reduce((a, b) => (a.area <= b.area ? a : b));
  }
  let best = null;
  let bestD = 70;
  for (const p of map.plots) {
    if (!parcelMapped(p)) continue;
    if (!(p.owner === "visitor" || canLeasePlot(p))) continue;
    const d = pointInRing(x, z, p.ring) ? 0 : Math.hypot(x - p.x, z - p.z);
    if (d < bestD) {
      best = p;
      bestD = d;
    }
  }
  return best || undefined;
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

function bandForPlot(p) {
  const play = chromeHud && chromeHud.getPlay && chromeHud.getPlay();
  const hit = play && play.leases && play.leases.find((l) => l.id === p.id);
  if (hit) return hit.band;
  const roads = play && play.traffic && play.traffic.roads;
  if (!roads || !p) return "";
  let best = null;
  for (const road of roads) {
    if (road.island !== p.island) continue;
    for (const pt of road.points || []) {
      const d = Math.hypot(pt.x - p.x, pt.z - p.z);
      if (!best || d < best.d) best = { d, band: road.band };
    }
  }
  return best && best.d < 80 ? best.band : "red";
}

function crateOn(plotId) {
  const play = chromeHud && chromeHud.getPlay && chromeHud.getPlay();
  if (!play) return null;
  return (play.deliveries || []).find((d) => d.plotId === plotId) || null;
}

function standOn(plotId) {
  const play = chromeHud && chromeHud.getPlay && chromeHud.getPlay();
  if (!play) return null;
  return (play.stands || []).find((s) => s.plotId === plotId) || null;
}

async function placeCartOn(plot) {
  if (!plot || plot.owner !== "visitor") {
    setStatus("Lease that South plot first.");
    return;
  }
  const res = await fetch("/api/inventory/place", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ plotId: plot.id }),
  });
  const data = await res.json();
  if (!res.ok) {
    setStatus("Could not place: " + (data.reason || "fail") + " · PAPER");
    return;
  }
  if (chromeHud) chromeHud.clearPlacing();
  syncStandMesh(data.stand);
  if (chromeHud) chromeHud.refresh();
  setStatus("Cart placed. Right-click it to stock hotdogs. PAPER.");
}

function syncStandMesh(stand) {
  if (!stand || standMeshes.has(stand.id)) return;
  const plot = map.plots.find((p) => p.id === stand.plotId);
  if (!plot) return;
  const mesh = makeHotdogCart();
  mesh.position.set(plot.x, heightAt(specOf(plot.island), plot.x, plot.z), plot.z);
  mesh.userData.standId = stand.id;
  mesh.userData.plotId = plot.id;
  mesh.userData.kind = "hotdog-cart";
  mesh.userData.label = "hotdog cart";
  mesh.userData.layer = "world";
  mesh.name = `hotdog-cart:${stand.id}`;
  worldAdd(mesh);
  standMeshes.set(stand.id, mesh);
}

function syncCrateMesh(delivery) {
  if (!delivery || crateMeshes.has(delivery.id)) return;
  const plot = map.plots.find((p) => p.id === delivery.plotId);
  if (!plot) return;
  const mesh = makeCrate();
  const x = delivery.drop && Number.isFinite(delivery.drop.x) ? delivery.drop.x : plot.x + 1.4;
  const z = delivery.drop && Number.isFinite(delivery.drop.z) ? delivery.drop.z : plot.z + 1.1;
  mesh.position.set(x, heightAt(specOf(plot.island), x, z), z);
  mesh.name = `crate:${delivery.id}`;
  mesh.userData.deliveryId = delivery.id;
  mesh.userData.plotId = plot.id;
  mesh.userData.kind = "crate";
  mesh.userData.label = "delivery crate";
  mesh.userData.layer = "logistics";
  mesh.userData.roadName = delivery.drop && delivery.drop.roadName;
  worldAdd(mesh);
  crateMeshes.set(delivery.id, mesh);
}

function dropCrate(deliveryId) {
  const mesh = crateMeshes.get(deliveryId);
  if (mesh) {
    mesh.parent && mesh.parent.remove(mesh);
    crateMeshes.delete(deliveryId);
  }
  lastInspectKey = "";
}

async function takeCrate(deliveryId) {
  const res = await fetch("/api/delivery/take", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ deliveryId }),
  });
  const data = await res.json();
  if (!res.ok) {
    setStatus("Take all failed: " + (data.reason || "fail"));
    return;
  }
  dropCrate(deliveryId);
  if (chromeHud) chromeHud.refresh();
  setStatus("In your inventory. Place the cart, then stock it. PAPER.");
}

function objectWithStand(obj) {
  let o = obj;
  while (o) {
    if (o.userData && (o.userData.kind === "hotdog-cart" || o.userData.standId)) return o;
    o = o.parent;
  }
  return null;
}

function openStandMenu(standId) {
  const play = chromeHud && chromeHud.getPlay && chromeHud.getPlay();
  const stand = play && (play.stands || []).find((s) => s.id === standId);
  if (!stand || !chromeHud) return;
  chromeHud.paintStandMenu(
    stand,
    async () => {
      await fetch("/api/stand/stock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ standId }),
      });
      chromeHud.refresh();
      chromeHud.hideStandMenu();
      setStatus("Hotdogs in the cart. PAPER · SIMULATED.");
    },
    async () => {
      await fetch("/api/stand/hire", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ standId }),
      });
      chromeHud.refresh();
      chromeHud.hideStandMenu();
      setStatus("Hired. The cart sells on its own. PAPER.");
    },
    async () => {
      await fetch("/api/stand/attend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ standId }),
      });
      chromeHud.refresh();
      setStatus("You're running the cart. Stay nearby. PAPER.");
    },
  );
}


/** Selected leased lot, or the parcel under the tap. Placement must not require a second hunt. */
function plotToDevelop(hitPlotId, x, z) {
  const hit = hitPlotId ? map.plots.find((p) => p.id === hitPlotId) : undefined;
  if (vacantMine(hit)) return hit;
  if (x != null && z != null) {
    const at = findParcelAt(x, z);
    if (vacantMine(at)) return at;
  }
  const sel = selected ? map.plots.find((p) => p.id === selected) : undefined;
  return vacantMine(sel) ? sel : undefined;
}

function catalogLabel(id) {
  const cat = map && map.catalog ? map.catalog : [];
  const hit = cat.find((c) => c.id === id);
  return hit ? hit.label : id;
}

function refreshHud() {
  if (!map) return;
  cashEl.textContent = "Cash $" + money(map.visitor.cash);
  if (staffHud) staffHud.sync();
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
  const pSel = selected ? map.plots.find((x) => x.id === selected) : null;
  if (btnEnter) {
    const show = Boolean(pSel && canEnter(pSel));
    btnEnter.hidden = !show;
    btnEnter.disabled = !show || !nearParcel(pSel);
  }
  btnDevelop.disabled = !canOpenCatalog();
  if (!selected || !pSel) {
    plotLineEl.textContent = placingUse
      ? "Tap your leased land to place it (PAPER)"
      : "Tap land to inspect it";
    btnLease.disabled = true;
    return;
  }
  const p = pSel;
  const near = nearParcel(p);
  if (p.owner === "visitor") {
    plotLineEl.textContent = parcelLabel(p) + (p.use ? " · " + p.use : " · yours");
    btnLease.disabled = true;
  } else if (p.owner) {
    plotLineEl.textContent = parcelLabel(p) + " · taken";
    btnLease.disabled = true;
  } else {
    plotLineEl.textContent = parcelLabel(p) + " · $" + money(p.price);
    const headroom = map.visitor.cash - p.price;
    const need = map.developCost ?? 40;
    btnLease.disabled = !near || map.visitor.cash < p.price || headroom < need;
    if (map.visitor.cash < p.price) {
      plotLineEl.textContent = parcelLabel(p) + " · $" + money(p.price) + " · need cash";
    } else if (headroom < need) {
      plotLineEl.textContent = parcelLabel(p) + " · $" + money(p.price) + " · leaves no develop cash";
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
  // Dense enough to carry the cove and the port apron. 96x64 cells were 90 m
  // wide: the carved pier slot dragged whole cells underwater and the harbour
  // rendered as an inland lake.
  const segsX = 224;
  const segsZ = 144;
  const geo = new THREE.PlaneGeometry(spec.rx * 2.15, spec.rz * 2.15, segsX, segsZ);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = [];
  // Printed-map greens: light, low-contrast, so the parcel plat reads on top.
  const grass = spec.id === "north" ? new THREE.Color(0x7fb257) : new THREE.Color(0x87bb60);
  const sand = new THREE.Color(0xe8d5a3);
  const rock = new THREE.Color(0x7d926a);
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
  worldAdd(mesh);
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
  worldAdd(m);
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
  const pierLen = 32;
  const pierZ = z + toward * 28;
  const pier = box(7, 0.4, pierLen, 0x8a6238, x, y + 0.35, pierZ);
  pier.userData.kind = "port";
  ports.push(pier);
  for (let i = 0; i < 6; i++) {
    const pz = pierZ + toward * (-14 + i * 5.6);
    const piling = box(0.35, 2.8, 0.35, 0x5a3a22, x - 3.15, y - 0.85, pz, false);
    piling.userData.kind = "port";
    const pilingB = box(0.35, 2.8, 0.35, 0x5a3a22, x + 3.15, y - 0.85, pz, false);
    pilingB.userData.kind = "port";
  }
  for (let i = -2; i <= 2; i++) {
    box(0.35, 0.85, 0.35, 0x3d2a1c, x + i * 1.2, y + 0.95, z + toward * 42, false);
  }
  const wx = x + 18;
  const wz = z - toward * 12;
  const shed = box(8, 3.4, 6, 0xd9cbb3, wx, y + 1.85, wz);
  shed.userData.kind = "port";
  ports.push(shed);
  const roofA = box(8.6, 0.14, 3.4, 0x6e2e22, wx, y + 3.75, wz - 1.2, false);
  roofA.rotation.x = 0.4;
  const roofB = box(8.6, 0.14, 3.4, 0x6e2e22, wx, y + 3.75, wz + 1.2, false);
  roofB.rotation.x = -0.4;
  box(8.8, 0.12, 0.22, 0x6e2e22, wx, y + 4.45, wz, false);
  const dock = box(4.2, 0.5, 3.2, 0x9a8a72, wx + toward * 0.2, y + 0.45, wz + toward * 4.2, false);
  dock.userData.kind = "port";
  ports.push(dock);
  box(2.4, 2.4, 0.12, 0x3d2a1c, wx, y + 1.45, wz + toward * 3.1, false);
  box(0.9, 0.7, 0.08, 0x8ec4d4, wx - 2.8, y + 2.55, wz + toward * 3.08, false);
  box(0.9, 0.7, 0.08, 0x8ec4d4, wx + 2.8, y + 2.55, wz + toward * 3.08, false);
  for (let i = 0; i < 5; i++) {
    box(0.7, 0.65, 0.7, 0x7a5230, x - 4.2 + i * 1.1, y + 0.55, z - toward * 4, false);
  }
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
  worldAdd(g);
}

function makePalms(spec) {
  for (let i = 0; i < 8; i++) {
    const t = 0.12 + i * 0.08;
    const side = i % 2 ? 1 : -1;
    const x = spec.port.x + side * (16 + (i % 3) * 3);
    const z = spec.port.z + (spec.id === "north" ? -1 : 1) * (40 + i * 28);
    const y = heightAt(spec, x, z);
    if (y < 0.4) continue;
    // Verge trees only. A palm through a leased house reads as a glitch.
    if (map && map.plots.some((p) => pointInRing(x, z, p.ring))) continue;
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
  rec.line.material.opacity = sel ? 0.95 : p.owner ? 0.5 : 0.28;
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
  if (!p || !p.use || useMeshes.has(p.id) || !meshForUse) return;
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

function addParcel(p) {
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
      opacity: p.owner ? 0.45 : 0.28,
    }),
  );
  line.userData.kind = "plot-line";
  line.userData.plotId = p.id;
  worldAdd(line);
  plotMeshes.set(p.id, { line, fill: null });
  if (p.use) useFor(p);
}

/** Metres from the north port. Keep in sync with game/src/land.ts SPAWN_PARCEL_M */
export const SPAWN_PARCEL_M = 420;
/** Keep in sync with game/src/land.ts STARTER_SNAP_M */
const STARTER_SNAP_M = 40;
const STARTER_CASH = 1000;

function starterLotOn(p, islandId) {
  const spec = specOf(islandId);
  const cash = Math.max(
    STARTER_CASH,
    map.visitor && Number.isFinite(map.visitor.cash) ? map.visitor.cash : STARTER_CASH,
  );
  const need = map.developCost ?? 40;
  if (p.island !== islandId) return false;
  if (Math.hypot(p.x - spec.port.x, p.z - spec.port.z) >= SPAWN_PARCEL_M) return false;
  if (p.owner === "visitor") return true;
  if (p.owner) return false;
  if (p.band !== "street") return false;
  return p.price + need <= cash;
}

function nearSouthSpawn(p) {
  return starterLotOn(p, "south");
}

async function makeParcels(filter) {
  const plots = filter ? map.plots.filter(filter) : map.plots;
  for (let i = 0; i < plots.length; i++) {
    const p = plots[i];
    if (plotMeshes.has(p.id)) continue;
    addParcel(p);
    if (i % 20 === 19) await idle(32);
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

/** Islands whose terrain / port / starter lots are meshed. Boot marks south. */
const builtIslands = new Set();

/** Ferry landfall was a void: south never got terrain, a port, or lots.
 *  Spread across idle slices so landfall cannot hold the main thread. */
async function ensureIsland(id) {
  if (builtIslands.has(id) || !map) return;
  builtIslands.add(id);
  const spec = specOf(id);
  makeTerrain(spec);
  await idle(48);
  makePort(spec);
  makePalms(spec);
  await idle(48);
  await makeParcels((p) => starterLotOn(p, id));
  await idle(48);
  if (parcelMap) ground.push(...parcelMap.buildIsland(id));
  await idle(48);
  buildProps(id);
}

function spawnAt(id) {
  void ensureIsland(id);
  islandId = id;
  const spec = specOf(id);
  const x = spec.port.x;
  const z = spec.port.z + (id === "north" ? -8 : 8);
  player.position.set(x, heightAt(spec, x, z) + 1.15, z);
  walking = false;
  if (walkPath) walkPath.hide();
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
  if (walkPath) {
    walkPath.show(
      player.position,
      walkTarget,
      player.position.y - 1.15,
      h,
    );
  }
  setStatus("Walking.");
}

function selectLand(p, walk) {
  const prev = selected ? map.plots.find((x) => x.id === selected) : null;
  selected = p.id;
  if (prev) paintParcel(prev);
  paintParcel(p);
  if (parcelMap) parcelMap.setSelected(p.id);
  refreshHud();
  if (walk && !nearParcel(p)) {
    goTo(p.x, p.z);
    setStatus("Walking onto that land.");
  } else if (canEnter(p)) {
    setStatus("Yours. Tap the building or Enter (PAPER).");
  } else {
    setStatus(p.owner ? "This land is taken." : "This land. Lease it to develop.");
  }
  if (chromeHud && chromeHud.paintLand) {
    const crate = crateOn(p.id);
    chromeHud.paintLand(p, {
      band: bandForPlot(p),
      crate,
      onTake: crate ? () => takeCrate(crate.id) : null,
    });
  }
}

function enterPlot(p) {
  if (!p || !canEnter(p)) return false;
  walking = false;
  if (taxi && taxi.hopOut) taxi.hopOut();
  void ensureInterior().then((ctl) => {
    if (!ctl) return;
    const ok = ctl.enter(p);
    if (ok) {
      selected = p.id;
      refreshHud();
    }
  });
  return true;
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

function clickTargets() {
  const objs = ground.filter(Boolean);
  for (const p of ports) objs.push(p);
  for (const rec of plotMeshes.values()) {
    objs.push(rec.line);
    if (rec.fill) objs.push(rec.fill);
  }
  for (const mesh of useMeshes.values()) objs.push(mesh);
  for (const mesh of standMeshes.values()) objs.push(mesh);
  for (const mesh of crateMeshes.values()) objs.push(mesh);
  if (deliveries && typeof deliveries.clickables === "function") {
    objs.push(...deliveries.clickables());
  }
  if (overlays && overlays.group) objs.push(overlays.group);
  if (parcelMap && typeof parcelMap.clickables === "function") {
    objs.push(...parcelMap.clickables());
  }
  return objs.filter(Boolean);
}

function viewerMode() {
  return overlays && overlays.mode ? overlays.mode : "world";
}

function walkPoint(hits) {
  const hit = hits.find((h) => {
    const k = h.object.userData && h.object.userData.kind;
    return k === "ground" || k === "parcel-fill" || k === "road" || k === "plot" || k === "plot-line";
  });
  return hit || hits[0] || null;
}

function showLandCard(p) {
  if (!p || !map || !chromeHud || !chromeHud.paintLand) return false;
  landPinned = true;
  const prev = selected ? map.plots.find((row) => row.id === selected) : null;
  selected = p.id;
  if (prev) paintParcel(prev);
  paintParcel(p);
  if (parcelMap) parcelMap.setSelected(p.id);
  const crate = crateOn(p.id);
  lastInspectKey = p.id + ":" + (crate ? crate.id : "") + ":" + bandForPlot(p);
  chromeHud.paintLand(p, {
    band: bandForPlot(p),
    crate,
    onTake: crate ? () => takeCrate(crate.id) : null,
  });
  if (!p.owner) setStatus((p.name || "This lot") + " · lease or close. PAPER · SIMULATED.");
  else if (p.owner === "visitor") setStatus("Yours. PAPER.");
  else setStatus("This land is taken. PAPER.");
  return true;
}

function closeLandCard() {
  landPinned = false;
  lastInspectKey = "";
  if (chromeHud && chromeHud.paintLand) chromeHud.paintLand(null);
  if (selected && map) {
    const prev = map.plots.find((x) => x.id === selected);
    selected = null;
    if (prev) paintParcel(prev);
    if (parcelMap) parcelMap.setSelected(null);
  }
}

function inspectNearbyLand() {
  if (landPinned) return;
  if (!map || !chromeHud || !chromeHud.paintLand) return;
  const p = findParcelAt(player.position.x, player.position.z);
  let crate = p ? crateOn(p.id) : null;
  if (!crate) {
    for (const [id, mesh] of crateMeshes) {
      if (Math.hypot(mesh.position.x - player.position.x, mesh.position.z - player.position.z) < 10) {
        crate = { id };
        break;
      }
    }
  }
  const band = p ? bandForPlot(p) : "";
  const key = (p ? p.id : "") + ":" + (crate ? crate.id : "") + ":" + band;
  if (key === lastInspectKey) return;
  lastInspectKey = key;
  if (!p) {
    if (selected) {
      const prev = map.plots.find((x) => x.id === selected);
      selected = null;
      if (prev) paintParcel(prev);
      if (parcelMap) parcelMap.setSelected(null);
    }
    if (crate) {
      chromeHud.paintLand(
        { id: "roadside", owner: "visitor", price: 0 },
        { crate, roadside: true, onTake: () => takeCrate(crate.id) },
      );
    } else {
      chromeHud.paintLand(null);
    }
    return;
  }
  if (selected !== p.id) {
    const prev = selected ? map.plots.find((x) => x.id === selected) : null;
    selected = p.id;
    if (prev) paintParcel(prev);
    paintParcel(p);
    if (parcelMap) parcelMap.setSelected(p.id);
  }
  chromeHud.paintLand(p, {
    band: bandForPlot(p),
    crate,
    onTake: crate ? () => takeCrate(crate.id) : null,
  });
}

function onPointer(ev) {
  if (ev.button != null && ev.button !== 0) return;
  if (Date.now() - lastTap < 180) return;
  lastTap = Date.now();
  if (taxi && typeof taxi.mapOpen === "function" && taxi.mapOpen()) return;
  if (ev.target.closest && ev.target.closest("nav, a, button, #taxi-map, #ferry-ticket, #catalog-picker, #chrome, .float-panel, #land-card, #stand-menu")) return;
  pointer.x = (ev.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(ev.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  if (interior && interior.isInside()) {
    interior.handleRay(raycaster);
    refreshHud();
    return;
  }
  const viewer = viewerMode();
  const hits = raycaster.intersectObjects(clickTargets(), true);
  const labelHit = hits.find((h) => objectWithKind(h.object, "parcel-label"));
  const standHit = hits.find((h) => objectWithStand(h.object));
  const crateHit = hits.find((h) => objectWithKind(h.object, "crate"));
  const vanHit = hits.find((h) => objectWithKind(h.object, "van"));
  const padHit = hits.find((h) => objectWithKind(h.object, "logistics-pad"));
  const buildingHit = hits.find((h) => objectWithKind(h.object, "building"));
  const plotHit = hits.find(
    (h) => h.object.userData.kind === "plot" || h.object.userData.kind === "plot-line",
  );
  const portHit = hits.find((h) => h.object.userData.kind === "port");
  const tap = walkPoint(hits);
  const tapPt = tap && tap.point;
  if (chromeHud && chromeHud.isPlacing && chromeHud.isPlacing()) {
    const tapped = plotToDevelop(plotHit?.object.userData.plotId, tapPt?.x, tapPt?.z);
    if (tapped) {
      void placeCartOn(tapped);
      return;
    }
    setStatus("Tap land you leased to place the hotdog cart.");
    return;
  }
  if (labelHit && viewer === "world") {
    const spr = objectWithKind(labelHit.object, "parcel-label");
    const id = spr && (spr.userData.plotId || (spr.userData.plot && spr.userData.plot.id));
    const p = id && map && map.plots.find((x) => x.id === id);
    if (p) showLandCard(p);
    return;
  }
  if (
    !placingUse &&
    tapPt &&
    taxi &&
    taxi.handleTap(tapPt.x, tapPt.z, nearestIsland(tapPt.x, tapPt.z))
  ) {
    return;
  }
  if (placingUse) {
    const tapped = plotToDevelop(plotHit?.object.userData.plotId, tapPt?.x, tapPt?.z);
    if (tapped) {
      developAt(tapped.id, placingUse);
      return;
    }
    setStatus("Tap land you leased that has no building yet.");
    return;
  }
  if (crateHit && (viewer === "logistics" || viewer === "world")) {
    const crate = objectWithKind(crateHit.object, "crate");
    const id = crate && crate.userData.deliveryId;
    if (id) {
      void takeCrate(id);
      return;
    }
  }
  if (padHit && viewer === "logistics") {
    const pad = objectWithKind(padHit.object, "logistics-pad");
    const id = pad && pad.userData.deliveryId;
    if (id) {
      void takeCrate(id);
      return;
    }
  }
  if (vanHit && viewer === "logistics") {
    setStatus("Van on the paved road. Crate drops on the kerb. PAPER.");
    return;
  }
  if (standHit && viewer === "world") {
    const standObj = objectWithStand(standHit.object);
    if (standObj) openStandMenu(standObj.userData.standId);
    return;
  }
  if (buildingHit && viewer === "world") {
    const b = objectWithKind(buildingHit.object, "building");
    const p =
      (b && b.userData.plotId && map.plots.find((x) => x.id === b.userData.plotId)) ||
      findParcelAt(buildingHit.point.x, buildingHit.point.z);
    if (p && canEnter(p) && nearParcel(p)) {
      enterPlot(p);
      return;
    }
    if (p) goTo(p.x, p.z);
    return;
  }
  if (portHit && nearPort() && viewer === "world") {
    ferry();
    return;
  }
  if (tapPt) goTo(tapPt.x, tapPt.z);
}

function applySnapshot(snapshot) {
  if (!snapshot || !snapshot.plots) return;
  map = snapshot;
  // Restore can hand back leases/buildings on lots that were never meshed.
  for (const p of map.plots) {
    if (p.owner !== "visitor" && !p.use) continue;
    if (!plotMeshes.has(p.id)) addParcel(p);
    else if (p.use) useFor(p);
  }
  if (parcelMap) parcelMap.sync();
  refreshHud();
}

staffHud = mountStaffHud({
  getSelected: () => selected,
  getMap: () => map,
  applySnapshot,
  setStatus,
});

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
  if (chromeHud) chromeHud.refresh();
  landPinned = true;
  lastInspectKey = "";
  const p = map.plots.find((x) => x.id === selected);
  if (p && chromeHud && chromeHud.paintLand) {
    chromeHud.paintLand(p, { band: bandForPlot(p) });
  }
  setStatus("This land is yours for $" + money(body.paid) + " (PAPER). Order from Market.");
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

async function openCatalog() {
  if (!map) return;
  await ensureCatalog();
  if (!catalogPicker) return;
  if (placingUse) {
    const p = plotToDevelop(selected, player.position.x, player.position.z);
    if (p) {
      developAt(p.id, placingUse);
      return;
    }
    placingUse = null;
    catalogPicker.close();
    setStatus("Placement cancelled.");
    return;
  }
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
  if (deliveries) deliveries.tick(dt);
  if (econHud) econHud.tick(dt);
  if (walking) {
    const dx = walkTarget.x - player.position.x;
    const dz = walkTarget.z - player.position.z;
    const dist = Math.hypot(dx, dz);
    const step = 22 * dt;
    if (dist <= step) {
      player.position.copy(walkTarget);
      walking = false;
      if (walkPath) walkPath.hide();
      setStatus("Walking.");
    } else {
      player.position.x += (dx / dist) * step;
      player.position.z += (dz / dist) * step;
      player.position.y = landHeight(player.position.x, player.position.z) + 1.15;
      if (walkPath) {
        walkPath.show(
          player.position,
          walkTarget,
          player.position.y - 1.15,
          walkTarget.y - 1.15,
        );
      }
    }
  }
  if (ferryMesh && tickFerry) tickFerry(ferryMesh, dt);
  if (parcelMap) parcelMap.tick(player.position, dt);
  inspectNearbyLand();
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

/** Sheet HUD modules used to load as 12 blocking <script type="module"> tags before main.js. */
const SHEET_HUD = [
  "./lease-hud.js",
  "./develop-hud.js",
  "./unpaid-hud.js",
  "./spread-hud.js",
  "./tax-hud.js",
  "./ferry-hud.js",
  "./taxi-hud.js",
  "./goods-hud.js",
  "./flow-hud.js",
  "./stall-hud.js",
  "./persist-hud.js",
];

function loadSheetHuds() {
  return (async () => {
    for (const p of SHEET_HUD) {
      await idle(80);
      await import(p);
    }
  })();
}

/** Yield so Edge can paint and take clicks. rAF + 0ms still froze the tab. */
function idle(ms = 48) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Let Chrome paint so boot cannot sit on "Loading…" until every mesh exists. */
function afterPaint() {
  return idle(48);
}

function worldScene() {
  return harbourGroup || scene;
}

async function ensureCatalog() {
  if (catalogPicker && meshForUse) return;
  const mod = await import("./buildings.js");
  meshForUse = mod.meshForUse;
  if (!catalogPicker) {
    catalogPicker = mod.createCatalogPicker({
      onPick(id) {
        placingUse = id;
        const p = plotToDevelop(selected, player.position.x, player.position.z);
        if (p) {
          developAt(p.id, id);
          return;
        }
        setStatus("Tap your leased land to place a " + catalogLabel(id) + " (PAPER).");
      },
      onCancel() {
        placingUse = null;
        setStatus("Tap a piece of land. Lease it, then develop it.");
      },
    });
  }
  if (map) {
    for (const p of map.plots) {
      if (plotMeshes.has(p.id)) useFor(p);
    }
  }
}

async function ensureTaxi() {
  if (taxi) return taxi;
  const taxiMod = await import("./taxi.js");
  taxi = taxiMod.createTaxi({
    scene: worldScene(),
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
  return taxi;
}

async function ensureDeliveries() {
  if (deliveries) return deliveries;
  const mod = await import("./delivery.js");
  deliveries = mod.createDeliveries({
    scene: worldScene(),
    getMap: () => map,
    specOf,
    heightAt,
    onDrop(delivery, drop) {
      fetch("/api/delivery/arrive", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deliveryId: delivery.id }),
      }).then(() => {
        syncCrateMesh({ ...delivery, status: "arrived", drop: drop || delivery.drop });
        if (chromeHud) chromeHud.refresh();
        if (overlays) overlays.refresh(chromeHud && chromeHud.getPlay(), map);
        setStatus("Crate on the roadside. Logistics viewer to take it. PAPER.");
      });
    },
  });
  return deliveries;
}

async function ensureInterior() {
  if (interior) return interior;
  if (!harbourGroup) {
    harbourGroup = wrapHarbourWorld(scene, { keep: [player, sun.target] });
  }
  const mod = await import("./interior.js");
  interior = mod.createInterior({
    scene,
    player,
    setStatus,
    heightAt,
    specOf,
  });
  interior.setHarbour(harbourGroup);
  return interior;
}

/**
 * Trickle dressing (D041/D043). Each module compiles as its own step with
 * long gaps, and the trickle waits whenever the player clicked recently.
 * Only cars and the moving ferry load live — `/g/south101` froze during a
 * 60 s idle while the quay-clutter and shore-foam steps built, so those
 * stay off until they can load off the main thread. Trees / stalls / peds
 * stay off too (D036).
 */
const TRICKLE_START_MS = 8000;
const TRICKLE_STEP_MS = 2500;
const TRICKLE_CLICK_QUIET_MS = 1500;

async function quietStep() {
  await idle(TRICKLE_STEP_MS);
  while (Date.now() - lastTap < TRICKLE_CLICK_QUIET_MS) await idle(500);
}

async function loadTrickleDressing() {
  await idle(TRICKLE_START_MS);
  const target = worldScene();

  await quietStep();
  const trafficMod = await import("./traffic.js");
  await quietStep();
  traffic = trafficMod.createTraffic({
    scene: target,
    getMap: () => map,
    specOf,
    heightAt,
    getPlayer: () => player,
    getIslandId: () => islandId,
  });

  await quietStep();
  const ferryMod = await import("./ferry.js");
  await quietStep();
  tickFerry = ferryMod.tickFerry;
  ferryMesh = ferryMod.makeFerry();
  target.add(ferryMesh);

  // NPC town: the world starts built (evergreen), so developed lots grow
  // real meshes without waiting for the player to open the catalogue.
  await quietStep();
  await ensureCatalog();
  for (const p of map.plots) {
    if (!p.use || useMeshes.has(p.id)) continue;
    if (!parcelMapped(p)) continue;
    useFor(p);
  }

  // Small props: instanced bushes/rocks/barrels/benches, four draw calls.
  await quietStep();
  propsMod = await import("./props.js");
  for (const id of builtIslands) buildProps(id);
}

function buildProps(id) {
  if (!propsMod || !map || propsBuilt.has(id)) return;
  propsBuilt.add(id);
  propsMod.mountProps({
    worldAdd,
    spec: specOf(id),
    heightAt,
    plots: map.plots,
    roads: map.roads,
    stops: map.stops || [],
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
  makeWater(scene);
  builtIslands.add("south");
  spawnAt("south");
  startLoop();
  setStatus("South port · PAPER");
  await idle(48);
  makeTerrain(specOf("south"));
  await idle(48);
  makeRoads(map, { scene, specOf, heightAt });
  makePort(specOf("south"));
  makePalms(specOf("south"));
  harbourGroup = wrapHarbourWorld(scene, { keep: [player, sun.target] });
  await makeParcels(nearSouthSpawn);
  await idle(48);
  parcelMap = mountParcelMap({
    worldAdd,
    specOf,
    heightAt,
    getPlots: () => (map ? map.plots : []),
  });
  ground.push(...parcelMap.buildIsland("south"));
  overlays = createOverlays({
    scene: harbourGroup || scene,
    heightAt,
    specOf,
    getMap: () => map,
  });
  chromeHud = mountChrome({
    setStatus,
    lease,
    onCloseLand: closeLandCard,
    onLeased(snapshot) {
      landPinned = false;
      lastInspectKey = "";
      applySnapshot(snapshot);
      const ids = snapshot.visitor && snapshot.visitor.leases;
      if (ids && ids.length) {
        selected = ids[ids.length - 1];
        const p = map.plots.find((x) => x.id === selected);
        if (p) paintParcel(p);
        if (parcelMap) parcelMap.setSelected(selected);
      }
      if (chromeHud) chromeHud.refresh();
    },
    onOverlay(id) {
      if (overlays) overlays.setMode(id, chromeHud.getPlay(), map);
    },
    onPlay(play) {
      if (overlays) overlays.refresh(play, map);
      for (const d of play.deliveries || []) {
        if (d.status === "en_route" && deliveries) {
          const plot = map.plots.find((p) => p.id === d.plotId);
          if (plot) deliveries.start(d, plot);
        }
        if (d.status === "arrived") syncCrateMesh(d);
      }
      for (const s of play.stands || []) syncStandMesh(s);
    },
    onOrder(delivery) {
      void ensureDeliveries().then(() => {
        const plot = map.plots.find((p) => p.id === delivery.plotId);
        if (plot) deliveries.start(delivery, plot);
      });
    },
    onPlaceMode() {},
  });
  setStatus("World viewer. Left-click walks. Click a $ tag to lease. PAPER.");
  await idle(80);
  await ensureTaxi();
  await ensureDeliveries();
  void loadSheetHuds();
  void loadTrickleDressing();
}

canvas.addEventListener("pointerup", onPointer);
canvas.addEventListener("contextmenu", (ev) => ev.preventDefault());
canvas.addEventListener("pointerdown", (ev) => {
  if (ev.button === 2) rmbDown = { t: Date.now(), x: ev.clientX, y: ev.clientY };
});
canvas.addEventListener("pointerup", (ev) => {
  if (ev.button !== 2 || !rmbDown) return;
  const dt = Date.now() - rmbDown.t;
  const dist = Math.hypot(ev.clientX - rmbDown.x, ev.clientY - rmbDown.y);
  rmbDown = null;
  if (dt > 280 || dist > 10) return;
  if (ev.target.closest && ev.target.closest("nav, a, button, #taxi-map, #ferry-ticket, #catalog-picker, #chrome, .float-panel, #land-card, #stand-menu")) return;
  pointer.x = (ev.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(ev.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(clickTargets(), true);
  const standHit = hits.find((h) => objectWithStand(h.object));
  if (standHit) {
    const obj = objectWithStand(standHit.object);
    if (obj) openStandMenu(obj.userData.standId);
    return;
  }
});
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
