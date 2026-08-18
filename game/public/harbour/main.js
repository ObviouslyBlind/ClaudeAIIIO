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
import { makeWater, tickHarbourWater } from "./water.js";
import { makeSky } from "./sky.js";
import { CAM, LOOK } from "./first-frame.js";
import { dressPlayer } from "./player.js";
import { makeStreetCart, makeCrate, makeVendor } from "./cart.js";
import { playPaperBuy } from "./paper-sfx.js";
import { createWalkPath } from "./walk-path.js";
import { mountChrome } from "./chrome.js";
import { siteClassForUse } from "./site-menu.js";
import { createOverlays } from "./overlays.js";
import { mountEconHud } from "./hud-econ.js";
import { mountPresenceHud } from "./presence-hud.js";
import { mountStaffHud } from "./staff-hud.js";
import { mountCalendarHud } from "./calendar-hud.js";
import { mountParcelMap, pointerToNdc } from "./parcel-map.js";
import { mountLotTags } from "./lot-tags.js";

function ensureDockButton(id, label) {
  let btn = document.getElementById(id);
  if (btn) return btn;
  btn = document.createElement("button");
  btn.type = "button";
  btn.id = id;
  btn.textContent = label;
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

if (statusEl) statusEl.textContent = "South port";
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
let lotTags = null;
let propsMod = null;
let chromeHud = null;
let walkPath = null;
let overlays = null;
let deliveries = null;
let lastInspectKey = "";
let landPinned = false;
const standMeshes = new Map();
const crateMeshes = new Map();
const takenCrates = new Set();
/** Must match game/src/firstLoop.ts PLACE_CORRIDOR_M. */
const PLACE_CORRIDOR_M = 22;
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

/** Keep in sync with game/src/land.ts heightAt and game/src/southGeom.ts */
const SOUTH_GRADE_Y = 1.28;
const SOUTH_GRADE_FLAT_M = 280;
const SOUTH_GRADE_BLEND_M = 560;
const SOUTH_WEST_FLAT_M = 360;
const SOUTH_WEST_BLEND_M = 740;
const SOUTH_WEST_APRON_X = 900;
const SOUTH_HIGHWAY_NODES = [
  { x: -2280, z: 7280 },
  { x: -2080, z: 7440 },
  { x: -1520, z: 7560 },
  { x: -980, z: 7680 },
  { x: -240, z: 7840 },
  { x: 480, z: 7960 },
  { x: 1320, z: 7860 },
  { x: 1920, z: 7780 },
  { x: 2480, z: 7980 },
  { x: 2920, z: 7860 },
];
const SOUTH_TOWN_PTS = [
  { x: -1960, z: 7620 },
  { x: -1080, z: 8720 },
  { x: -1860, z: 10020 },
  { x: 1480, z: 8080 },
  { x: 2520, z: 9120 },
];
const SOUTH_RAB_PTS = [
  { x: -2080, z: 7440 },
  { x: -980, z: 7680 },
  { x: 1320, z: 7860 },
  { x: 2480, z: 7980 },
];
const SOUTH_GRADE_LINES = [
  [SOUTH_HIGHWAY_NODES[0], SOUTH_RAB_PTS[0]],
  [SOUTH_RAB_PTS[0], SOUTH_TOWN_PTS[0]],
  [SOUTH_RAB_PTS[1], SOUTH_TOWN_PTS[1]],
  [SOUTH_RAB_PTS[0], SOUTH_TOWN_PTS[2]],
  [SOUTH_RAB_PTS[2], SOUTH_TOWN_PTS[3]],
  [SOUTH_RAB_PTS[3], SOUTH_TOWN_PTS[4]],
  [SOUTH_RAB_PTS[0], { x: -420, z: 7220 }],
  [SOUTH_RAB_PTS[0], { x: -1680, z: 8380 }],
];

function catmull1(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

function sampleSouthHwySpline(nodes, perSeg = 8) {
  const out = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const p0 = nodes[Math.max(0, i - 1)];
    const p1 = nodes[i];
    const p2 = nodes[i + 1];
    const p3 = nodes[Math.min(nodes.length - 1, i + 2)];
    const n = i === nodes.length - 2 ? perSeg : perSeg - 1;
    for (let s = 0; s <= n; s++) {
      const t = s / perSeg;
      out.push({ x: catmull1(p0.x, p1.x, p2.x, p3.x, t), z: catmull1(p0.z, p1.z, p2.z, p3.z, t) });
    }
  }
  return out;
}

const SOUTH_HWY_SPLINE = sampleSouthHwySpline(SOUTH_HIGHWAY_NODES, 8);

function distToSegXZ(x, z, a, b) {
  const vx = b.x - a.x;
  const vz = b.z - a.z;
  const len2 = vx * vx + vz * vz || 1;
  let t = ((x - a.x) * vx + (z - a.z) * vz) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (a.x + vx * t), z - (a.z + vz * t));
}

function distToPolyXZ(pts, x, z) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) best = Math.min(best, distToSegXZ(x, z, pts[i], pts[i + 1]));
  return best;
}

function distToSouthGrade(x, z) {
  let d = distToPolyXZ(SOUTH_HWY_SPLINE, x, z);
  for (const [a, b] of SOUTH_GRADE_LINES) d = Math.min(d, distToSegXZ(x, z, a, b));
  for (const t of SOUTH_TOWN_PTS) d = Math.min(d, Math.hypot(x - t.x, z - t.z));
  for (const r of SOUTH_RAB_PTS) d = Math.min(d, Math.hypot(x - r.x, z - r.z));
  return d;
}

function heightAt(spec, x, z) {
  const dx = (x - spec.cx) / spec.rx;
  const dz = (z - spec.cz) / spec.rz;
  const ang = Math.atan2(dz, dx);
  const edge = 1 + 0.06 * Math.sin(ang * 5) + 0.03 * Math.sin(ang * 9 + 1.1);
  const r = Math.hypot(dx, dz);
  const toward = spec.id === "north" ? 1 : -1;
  const along = (z - spec.port.z) * toward;
  const across = Math.abs(x - spec.port.x);
  if (spec.id === "south") {
    const east = x - spec.port.x;
    if (across < 48 && along > -24 && along < 28) return SOUTH_GRADE_Y;
    if (east > 18 && east < 420 && along > -28 && along < 14) return SOUTH_GRADE_Y;
  } else if (across < 22 && along > -16 && along < 14) {
    return 1.12;
  }
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
  if (spec.id === "south") {
    if (hillD < 72) h = 0.08;
    else {
      const cone = Math.max(0, 1 - hillD / 780);
      h += 210 * cone ** 1.55;
      if (hillD < 125) h = Math.max(h, 92 + (125 - hillD) * 0.45);
    }
    const g = distToSouthGrade(x, z);
    if (hillD >= 72) {
      const westBelt = x < SOUTH_WEST_APRON_X && z > 6900 && z < 10600;
      const flatM = westBelt ? SOUTH_WEST_FLAT_M : SOUTH_GRADE_FLAT_M;
      const blendM = westBelt ? SOUTH_WEST_BLEND_M : SOUTH_GRADE_BLEND_M;
      if (g < flatM || portD < 560) h = SOUTH_GRADE_Y;
      else if (g < blendM) {
        const u = (g - flatM) / (blendM - flatM);
        h = SOUTH_GRADE_Y * (1 - u) + h * u;
      }
    }
  } else {
    h += spec.peak * 0.7 * Math.max(0, 1 - hillD / 900) ** 2;
  }
  if (spec.id !== "south" && portD < 160) {
    const flatten = 1.15 + portD * 0.002;
    h = Math.min(Math.max(h, 1.05), flatten);
  }
  const beachStart = spec.id === "south" ? 0.68 : 0.8;
  const skipBeach = spec.id === "south" && (distToSouthGrade(x, z) < 280 || portD < 400);
  if (t > beachStart && !skipBeach) {
    const beach = (t - beachStart) / (1 - beachStart);
    h = h * (1 - beach) + 0.32 * beach;
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
  if (statusEl) statusEl.textContent = t;
}

function dismissLooseLandUi() {
  if (landPinned) return;
  lastInspectKey = "";
  if (chromeHud && chromeHud.hideBuyAsk) chromeHud.hideBuyAsk();
  if (chromeHud && chromeHud.paintLand) chromeHud.paintLand(null);
}

function leaseFailText(reason) {
  if (reason === "no_cash") return "Need more cash for this lot.";
  if (reason === "need_develop_cash") return "That price would leave too little cash to build.";
  if (reason === "zone_locked") return "High-density land is government-locked.";
  if (reason === "owned") return "This land is taken.";
  if (reason === "reserved") return "Reserved land.";
  return "Could not buy: " + reason;
}

function aimPointer(ev) {
  const ndc = pointerToNdc(ev, canvas);
  pointer.x = ndc.x;
  pointer.y = ndc.y;
}

const HUD_BLOCK =
  "nav, a, #taxi-map, #ferry-ticket, #catalog-picker, .float-panel, #land-card, #buy-ask, #crate-ask, #order-veil, #order-ask, #stand-veil, #stand-menu, #place-hint, #menu-stack, #pack-shift";

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

async function placeCartOn(plot, x, z) {
  const kitId = chromeHud && chromeHud.getPlaceKit ? chromeHud.getPlaceKit() : "";
  const res = await fetch("/api/inventory/place", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ plotId: (plot && plot.id) || "", x, z, kitId: kitId || undefined }),
  });
  const data = await res.json();
  if (!res.ok) {
    const reason = data.reason || "fail";
    if (reason === "already_placed" || reason === "no_cart") {
      if (chromeHud) chromeHud.clearPlacing();
      if (chromeHud && chromeHud.setOverlay) chromeHud.setOverlay("world");
      setStatus(
        reason === "already_placed"
          ? "Cart is already on that lot. Tap the cart to stock it."
          : "No cart in inventory.",
      );
      const play = chromeHud && chromeHud.getPlay && chromeHud.getPlay();
      const stands = (play && play.stands) || [];
      const stand = stands.find((s) => plot && s.plotId === plot.id) || stands[0];
      if (stand && reason === "already_placed") openStandMenu(stand.id);
      return;
    }
    setStatus("Could not place: " + reason + "");
    const line = document.getElementById("place-hint-text");
    if (line) {
      line.textContent =
        reason === "not_yours"
          ? "Tap the green YOURS lot, or the verge out to the road."
          : "Could not place: " + reason;
    }
    const hint = document.getElementById("place-hint");
    if (hint) hint.hidden = false;
    return;
  }
  if (chromeHud) chromeHud.clearPlacing();
  if (chromeHud && chromeHud.setOverlay) chromeHud.setOverlay("world");
  syncStandMesh(data.stand);
  if (chromeHud) chromeHud.refresh();
  setStatus("Cart placed. Tap it to stock.");
  if (data.stand) openStandMenu(data.stand.id);
}

function attachVendor(cart) {
  if (!cart || cart.getObjectByName("vendor")) return;
  const vendor = makeVendor();
  vendor.position.set(1.05, 0, 0.15);
  cart.add(vendor);
}

function syncStandMesh(stand) {
  if (!stand) return;
  let mesh = standMeshes.get(stand.id);
  const plot = map && map.plots.find((p) => p.id === stand.plotId);
  const island = (plot && plot.island) || stand.island || "south";
  const x = Number.isFinite(stand.x) ? stand.x : plot ? plot.x : 0;
  const z = Number.isFinite(stand.z) ? stand.z : plot ? plot.z : 0;
  if (!mesh) {
    mesh = makeStreetCart(stand.kind || "fruit");
    mesh.userData.standId = stand.id;
    mesh.userData.plotId = stand.plotId;
    mesh.userData.kind = "street-cart";
    mesh.userData.cartKind = stand.kind || "fruit";
    mesh.userData.label = stand.label || "street cart";
    mesh.userData.layer = "world";
    mesh.name = `street-cart:${stand.id}`;
    worldAdd(mesh);
    standMeshes.set(stand.id, mesh);
  }
  mesh.position.set(x, heightAt(specOf(island), x, z), z);
  if (stand.hired) attachVendor(mesh);
}

function syncCrateMesh(delivery) {
  if (!delivery || crateMeshes.has(delivery.id)) return;
  const drop = delivery.drop;
  const plot = map && map.plots ? map.plots.find((p) => p.id === delivery.plotId) : null;
  const x = drop && Number.isFinite(drop.x) ? drop.x : plot ? plot.x + 1.4 : NaN;
  const z = drop && Number.isFinite(drop.z) ? drop.z : plot ? plot.z + 1.1 : NaN;
  if (!Number.isFinite(x) || !Number.isFinite(z)) return;
  const island = (plot && plot.island) || delivery.island || "south";
  const mesh = makeCrate();
  mesh.position.set(x, heightAt(specOf(island), x, z), z);
  mesh.name = `crate:${delivery.id}`;
  mesh.userData.deliveryId = delivery.id;
  mesh.userData.plotId = plot ? plot.id : "";
  mesh.userData.kind = "crate";
  mesh.userData.label = "delivery crate";
  mesh.userData.layer = "logistics";
  mesh.userData.roadName = drop && drop.roadName;
  worldAdd(mesh);
  crateMeshes.set(delivery.id, mesh);
}

function dropCrate(deliveryId) {
  const mesh = crateMeshes.get(deliveryId);
  if (mesh) {
    mesh.parent && mesh.parent.remove(mesh);
    crateMeshes.delete(deliveryId);
  }
}

function pulseCrateGlow() {
  const t = performance.now() / 1000;
  const wave = 0.5 + 0.5 * Math.sin(t * 3.2);
  for (const mesh of crateMeshes.values()) {
    const glows = mesh.userData && mesh.userData.glow;
    if (!Array.isArray(glows)) continue;
    for (const part of glows) {
      if (!part || !part.material) continue;
      part.material.opacity = 0.12 + wave * 0.22;
      const s = 1 + wave * 0.08;
      part.scale.set(s, 1, s);
    }
  }
}

function hideCrateCard() {
  lastInspectKey = "";
  if (chromeHud && chromeHud.hideCrateAsk) chromeHud.hideCrateAsk();
  if (chromeHud && chromeHud.paintLand) chromeHud.paintLand(null);
}

function pruneCrates(play) {
  const live = new Set();
  for (const d of (play && play.deliveries) || []) {
    if (!takenCrates.has(d.id)) live.add(d.id);
  }
  for (const id of [...crateMeshes.keys()]) {
    if (!live.has(id)) dropCrate(id);
  }
}

function showCrateCard(deliveryId) {
  if (!deliveryId || takenCrates.has(deliveryId)) return false;
  lastInspectKey = "crate:" + deliveryId;
  if (!chromeHud || !chromeHud.paintCrateAsk) return false;
  chromeHud.paintCrateAsk({
    crate: { id: deliveryId },
    onTake: () => takeCrate(deliveryId),
    onClose: () => {
      lastInspectKey = "";
    },
  });
  setStatus("Package on the kerb. Take all or close.");
  return true;
}

async function takeCrate(deliveryId) {
  if (!deliveryId) return;
  takenCrates.add(deliveryId);
  landPinned = false;
  hideCrateCard();
  dropCrate(deliveryId);
  if (deliveries && typeof deliveries.release === "function") deliveries.release(deliveryId);
  const res = await fetch("/api/delivery/take", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ deliveryId }),
  });
  const data = await res.json();
  if (!res.ok) {
    takenCrates.delete(deliveryId);
    setStatus("Take all failed: " + (data.reason || "fail"));
    return;
  }
  hideCrateCard();
  if (chromeHud) chromeHud.refresh();
  setStatus("In your inventory. Open Inv → Place in world.");
}

function objectWithStand(obj) {
  let o = obj;
  while (o) {
    if (o.userData && (o.userData.kind === "street-cart" || o.userData.kind === "hotdog-cart" || o.userData.standId)) return o;
    o = o.parent;
  }
  return null;
}

function openStandMenu(standId) {
  const play = chromeHud && chromeHud.getPlay && chromeHud.getPlay();
  const stand =
    play &&
    (((play.sites || []).find((s) => s.id === standId)) ||
      ((play.stands || []).find((s) => s.id === standId)) ||
      ((play.workSites || []).find((s) => s.id === standId)));
  if (!stand || !chromeHud) return;
  chromeHud.paintStandMenu(stand, null, () => {
    const mesh = standMeshes.get(standId);
    if (mesh) attachVendor(mesh);
  });
}


function vacantMine(p) {
  return Boolean(p && p.owner === "visitor" && !p.use);
}

function minePlot(p) {
  return Boolean(p && p.owner === "visitor");
}

function visitorSouthPlot() {
  return (map.plots || []).find((p) => p.island === "south" && p.owner === "visitor");
}

function plotToPlace(hitPlotId, x, z) {
  const hit = hitPlotId ? map.plots.find((p) => p.id === hitPlotId) : undefined;
  if (minePlot(hit)) return hit;
  if (x != null && z != null) {
    for (const p of map.plots || []) {
      if (minePlot(p) && p.ring && pointInRing(x, z, p.ring)) return p;
    }
    let best = null;
    let bestD = PLACE_CORRIDOR_M;
    for (const p of map.plots || []) {
      if (!minePlot(p) || p.island !== "south") continue;
      const d = Math.hypot(x - p.x, z - p.z);
      if (d <= bestD) {
        best = p;
        bestD = d;
      }
    }
    if (best) return best;
  }
  const sel = selected ? map.plots.find((p) => p.id === selected) : undefined;
  if (minePlot(sel)) return sel;
  return visitorSouthPlot() || null;
}

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
  const riding = taxi && typeof taxi.riding === "function" && taxi.riding();
  if (inside) {
    placeEl.textContent = interior.currentFloor() === "upstairs" ? "Upstairs" : "Downstairs";
    plotLineEl.textContent = "Inside";
    btnLease.disabled = true;
    btnDevelop.disabled = true;
    if (btnEnter) {
      btnEnter.disabled = true;
      btnEnter.hidden = true;
    }
    if (btnExit) {
      btnExit.disabled = false;
      btnExit.hidden = false;
      btnExit.textContent = "Exit";
    }
    return;
  }
  placeEl.textContent = specOf(islandId).name;
  if (btnExit) {
    btnExit.hidden = !riding;
    btnExit.disabled = !riding;
    btnExit.textContent = "Exit taxi";
  }
  const pSel = selected ? map.plots.find((x) => x.id === selected) : null;
  if (btnEnter) {
    const show = Boolean(pSel && canEnter(pSel));
    btnEnter.hidden = !show;
    btnEnter.disabled = !show || !nearParcel(pSel);
  }
  btnDevelop.disabled = !canOpenCatalog();
  if (!selected || !pSel) {
    plotLineEl.textContent = placingUse
      ? "Tap your leased land to place it"
      : "Tap land to inspect it";
    btnLease.disabled = true;
    return;
  }
  const p = pSel;
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
    btnLease.disabled = map.visitor.cash < p.price || headroom < need;
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
  const segsX = spec.id === "south" ? 320 : 224;
  const segsZ = spec.id === "south" ? 210 : 144;
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
    let grade = 0;
    if (spec.id === "south") {
      const g = distToSouthGrade(x, z);
      if (g < 160) grade = Math.max(0, 1 - g / 160);
    } else {
      const portD = Math.hypot(x - spec.port.x, z - spec.port.z);
      if (portD < 140) grade = Math.max(0, 1 - portD / 140) * 0.55;
    }
    const verge = (Math.abs(Math.sin(x * 0.031 + z * 0.027)) > 0.62) || (Math.abs(Math.cos(x * 0.019 - z * 0.041)) > 0.78);
    const c = paintShoreColor(h, t, grass, sand, rock, { grade, verge });
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

const QUAY_STONE = 0x9a8a72;
const QUAY_DARK = 0x7a6e5a;
const QUAY_CAP = 0xb0a48c;

/** Stone seawall from the water up past grade. Visible from spawn looking inland. */
function makeSouthQuay(spec) {
  const { x, z } = spec.port;
  const deckY = SOUTH_GRADE_Y;
  const waterY = -0.2;
  const wallH = 3.6;
  const wallCy = waterY + wallH / 2;
  const toward = -1;
  const BLOCK = 8;
  const faceZ = z + toward * 7.8;

  function cap(w, d, bx, by, bz, markPort) {
    const m = box(w, 0.28, d, QUAY_CAP, bx, by, bz, false);
    m.userData.kind = "port";
    if (markPort) ports.push(m);
    return m;
  }

  // Channel face: tall parapet, not a pancake on the grass.
  for (let i = 0; i < 9; i++) {
    const bx = x - 24 + i * BLOCK;
    const face = box(BLOCK * 0.96, wallH, 1.7, QUAY_DARK, bx, wallCy, faceZ, false);
    face.userData.kind = "port";
    cap(BLOCK * 0.96, 2.2, bx, deckY + 0.85, faceZ + toward * 0.15, i === 4 || i === 5);
  }
  // West return — in the spawn camera's left frame (camera sits west, looks east).
  for (let i = 0; i < 5; i++) {
    const pz = z + toward * (10 + i * BLOCK);
    const face = box(1.7, wallH, BLOCK * 0.96, QUAY_DARK, x - 28, wallCy, pz, false);
    face.userData.kind = "port";
    cap(2.2, BLOCK * 0.96, x - 28, deckY + 0.85, pz, i === 1);
  }
  // East wrap into sand: stepped wall, still has height.
  for (let i = 0; i < 7; i++) {
    const bx = x + 48 + i * BLOCK;
    const drop = i * 0.22;
    const h = Math.max(1.1, wallH - drop * 1.4);
    const cy = waterY + h / 2;
    const face = box(BLOCK * 0.94, h, 1.35, i < 3 ? QUAY_DARK : QUAY_STONE, bx, cy, z + toward * 4.4 + i * 2.2, false);
    face.userData.kind = "port";
    cap(BLOCK * 0.94, 1.7, bx, deckY + 0.7 - drop * 0.35, z + toward * 4 + i * 2.2, i < 2);
  }
  const finger = box(6.4, 0.32, 20, QUAY_CAP, x - 6, deckY + 0.22, z + toward * 22);
  finger.userData.kind = "port";
  ports.push(finger);
  for (let i = 0; i < 6; i++) {
    const pz = z + toward * (12 + i * 3.6);
    box(0.48, 3.2, 0.48, QUAY_DARK, x - 8.4, waterY + 1.2, pz, false);
    box(0.48, 3.2, 0.48, QUAY_DARK, x - 3.6, waterY + 1.2, pz, false);
  }
  for (let i = 0; i < 10; i++) {
    const bx = x - 22 + i * 7.2;
    const bollard = box(0.46, 1.05, 0.46, QUAY_DARK, bx, deckY + 0.95, z + toward * 6.4, false);
    bollard.userData.kind = "port";
    box(0.6, 0.14, 0.6, 0x3d2a1c, bx, deckY + 1.5, z + toward * 6.4, false);
  }
}

function makePort(spec) {
  if (spec.id === "south") {
    makeSouthQuay(spec);
    return;
  }
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
    let x;
    let z;
    if (spec.id === "south") {
      x = spec.port.x + 40 + i * 22;
      z = spec.port.z + 18 + side * 8;
    } else {
      x = spec.port.x + side * (16 + (i % 3) * 3);
      z = spec.port.z + (spec.id === "north" ? -1 : 1) * (40 + i * 28);
    }
    const y = heightAt(spec, x, z);
    if (y < 0.4) continue;
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
  const x = spec.port.x + (id === "south" ? 10 : 0);
  const z = spec.port.z + (id === "north" ? -8 : 0);
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
  dismissLooseLandUi();
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
    setStatus("Yours. Tap the building or Enter.");
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
  if (!p.owner) setStatus((p.name || "This lot") + " · do you want to buy it?.");
  else if (p.owner === "visitor") setStatus("Yours..");
  else setStatus("This land is taken..");
  return true;
}

function askToBuy(p) {
  if (!p || !map) return;
  const prev = selected ? map.plots.find((row) => row.id === selected) : null;
  selected = p.id;
  landPinned = true;
  lastInspectKey = p.id + ":ask";
  if (prev && prev.id !== p.id) paintParcel(prev);
  paintParcel(p);
  if (parcelMap) parcelMap.setSelected(p.id);
  if (p.owner) {
    showLandCard(p);
    return;
  }
  if (chromeHud && chromeHud.paintBuyAsk) {
    chromeHud.paintBuyAsk(p, { band: bandForPlot(p) });
    setStatus("Do you want to buy " + (p.name || "this lot") + "?.");
    return;
  }
  showLandCard(p);
}

function buyPlot(p) {
  askToBuy(p);
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
  // Never auto-open a lot card. Standing on 76 Shore Rd was pinning Buy lot
  // over the walk, and Close could not stick because this ran every frame.
  if (landPinned) return;
  if (chromeHud && chromeHud.isPlacing && chromeHud.isPlacing()) return;
  if (!map || !chromeHud || !chromeHud.paintLand) return;
  let crate = null;
  for (const [id, mesh] of crateMeshes) {
    if (takenCrates.has(id)) continue;
    if (Math.hypot(mesh.position.x - player.position.x, mesh.position.z - player.position.z) < 10) {
      crate = { id };
      break;
    }
  }
  const key = crate ? "crate:" + crate.id : "";
  if (!crate) {
    if (String(lastInspectKey).indexOf("crate:") === 0) {
      lastInspectKey = "";
      chromeHud.paintLand(null);
    }
    return;
  }
  if (key === lastInspectKey) return;
  lastInspectKey = key;
  chromeHud.paintLand(
    { id: "roadside", owner: "visitor", price: 0 },
    { crate, roadside: true, onTake: () => takeCrate(crate.id) },
  );
}

function onPointer(ev) {
  if (ev.button != null && ev.button !== 0) return;
  if (Date.now() - lastTap < 180) return;
  lastTap = Date.now();
  if (taxi && typeof taxi.mapOpen === "function" && taxi.mapOpen()) return;
  const placing = Boolean(chromeHud && chromeHud.isPlacing && chromeHud.isPlacing());
  if (ev.target.closest && ev.target.closest(HUD_BLOCK) && !placing) return;
  if (placing && ev.target.closest && ev.target.closest(".lot-tag, [data-panel], [data-overlay], nav, #taxi-map, .float-panel, #buy-ask, #stand-veil, #stand-menu, #place-hint, #menu-stack, #pack-shift")) {
    return;
  }
  aimPointer(ev);
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
    const tapped = plotToPlace(plotHit?.object.userData.plotId, tapPt?.x, tapPt?.z);
    void placeCartOn(tapped, tapPt?.x, tapPt?.z);
    return;
  }
  if (standHit) {
    const standObj = objectWithStand(standHit.object);
    if (standObj) {
      openStandMenu(standObj.userData.standId);
      return;
    }
  }
  if (crateHit) {
    const crate = objectWithKind(crateHit.object, "crate");
    const id = crate && crate.userData.deliveryId;
    if (id && showCrateCard(id)) return;
  }
  const tagPick =
    viewer === "lots" &&
    parcelMap &&
    typeof parcelMap.pickLabel === "function"
      ? parcelMap.pickLabel(camera, ev.clientX, ev.clientY, window.innerWidth, window.innerHeight, canvas)
      : null;
  if (tagPick && tagPick.plotId && map) {
    const tagged = map.plots.find((x) => x.id === tagPick.plotId);
    if (tagged) {
      buyPlot(tagged);
      return;
    }
  }
  if (labelHit && viewer === "lots") {
    const spr = objectWithKind(labelHit.object, "parcel-label");
    const id = spr && (spr.userData.plotId || (spr.userData.plot && spr.userData.plot.id));
    const p = id && map && map.plots.find((x) => x.id === id);
    if (p) buyPlot(p);
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
  if (viewer === "lots" && tapPt) {
    const p = findParcelAt(tapPt.x, tapPt.z);
    if (p && !p.owner && pointInRing(tapPt.x, tapPt.z, p.ring)) {
      askToBuy(p);
      return;
    }
    if (p && p.owner && pointInRing(tapPt.x, tapPt.z, p.ring)) {
      showLandCard(p);
      return;
    }
  }
  if (padHit && viewer === "logistics") {
    const pad = objectWithKind(padHit.object, "logistics-pad");
    const id = pad && pad.userData.deliveryId;
    if (id && showCrateCard(id)) return;
  }
  if (vanHit && viewer === "logistics") {
    setStatus("Van on the paved road. Crate drops on the kerb..");
    return;
  }
  if (buildingHit && viewer === "world") {
    const b = objectWithKind(buildingHit.object, "building");
    const p =
      (b && b.userData.plotId && map.plots.find((x) => x.id === b.userData.plotId)) ||
      findParcelAt(buildingHit.point.x, buildingHit.point.z);
    if (p && p.owner === "visitor" && siteClassForUse(p.use)) {
      openStandMenu("site-" + p.id);
      return;
    }
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
    const note = leaseFailText(body.reason);
    setStatus(note);
    const fail = map && selected ? map.plots.find((x) => x.id === selected) : null;
    if (fail && !fail.owner && chromeHud && chromeHud.paintBuyAsk) {
      chromeHud.paintBuyAsk(fail, { band: bandForPlot(fail), note });
    } else if (fail && chromeHud && chromeHud.paintLand) {
      chromeHud.paintLand(fail, { band: bandForPlot(fail), note });
    }
    return;
  }
  applySnapshot(body.snapshot);
  paintParcel(map.plots.find((x) => x.id === selected));
  if (chromeHud) chromeHud.refresh();
  landPinned = true;
  lastInspectKey = "";
  const p = map.plots.find((x) => x.id === selected);
  if (chromeHud && chromeHud.hideBuyAsk) chromeHud.hideBuyAsk();
  if (p && chromeHud && chromeHud.paintLand) {
    chromeHud.paintLand(p, { band: bandForPlot(p), note: "Yours for $" + money(body.paid) + "." });
  }
  playPaperBuy();
  setStatus("This land is yours for $" + money(body.paid) + ". Order from Market.");
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
  setStatus("Developed this land as a " + catalogLabel(use) + ".");
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
  setStatus("Choose a building. Then tap your leased land.");
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
  pulseCrateGlow();
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
  if (scene.userData.harbourWater) tickHarbourWater(scene.userData.harbourWater, clock.elapsedTime);
  if (parcelMap) parcelMap.tick(player.position, dt, viewerMode());
  if (lotTags) {
    lotTags.tick(
      player.position,
      dt,
      viewerMode(),
      Boolean(chromeHud && chromeHud.isPlacing && chromeHud.isPlacing()),
    );
  }
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
        setStatus("Tap your leased land to place a " + catalogLabel(id) + ".");
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
  const taxiHudMod = await import("./taxi-hud.js");
  const etaChip = taxiHudMod.mountTaxiEtaChip();
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
    onEta: (label) => etaChip.set(label),
    onRide() {
      refreshHud();
    },
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
        setStatus("Van waiting. Take the crate — it will not leave first..");
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
  setStatus("South port");
  await idle(48);
  makeTerrain(specOf("south"));
  await idle(48);
  makeRoads(map, { scene, specOf, heightAt });
  makePort(specOf("south"));
  makePalms(specOf("south"));
  harbourGroup = wrapHarbourWorld(scene, { keep: [player, sun.target] });
  parcelMap = mountParcelMap({
    worldAdd,
    specOf,
    heightAt,
    getPlots: () => (map ? map.plots : []),
  });
  lotTags = mountLotTags({
    canvas,
    camera,
    heightAt,
    specOf,
    getPlots: () => (map ? map.plots : []),
    onBuy: askToBuy,
    onInspect: showLandCard,
    onPlace(plot) {
      void placeCartOn(plot, plot.x, plot.z);
    },
  });
  ground.push(...parcelMap.buildIsland("south"));
  await idle(48);
  await makeParcels(nearSouthSpawn);
  overlays = createOverlays({
    scene: harbourGroup || scene,
    heightAt,
    specOf,
    getMap: () => map,
  });
  chromeHud = mountChrome({
    setStatus,
    getPose: () => ({ x: player.position.x, z: player.position.z }),
    getPlotId: () => selected || "",
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
    onHired(standId) {
      const playNow = chromeHud && chromeHud.getPlay && chromeHud.getPlay();
      const hired = playNow && (playNow.stands || []).find((s) => s.id === standId);
      if (hired) syncStandMesh({ ...hired, hired: true });
      setStatus("Hired. They stand by the cart..");
    },
    onStocked() {},
    onOverlay(id) {
      const play = chromeHud && typeof chromeHud.getPlay === "function" ? chromeHud.getPlay() : null;
      if (overlays) overlays.setMode(id, play, map);
    },
    onPlaceMode(on) {
      if (!on) return;
      landPinned = false;
      hideCrateCard();
      if (chromeHud && chromeHud.hideBuyAsk) chromeHud.hideBuyAsk();
    },
    onPlay(play) {
      if (overlays) overlays.refresh(play, map);
      pruneCrates(play);
      for (const d of play.deliveries || []) {
        if (takenCrates.has(d.id)) continue;
        if (d.status === "en_route" && deliveries) {
          const plot = map.plots.find((p) => p.id === d.plotId);
          if (plot) deliveries.start(d, plot);
        }
        if (d.status === "arrived") syncCrateMesh(d);
      }
      for (const s of play.stands || []) syncStandMesh(s);
    },
    onOrder(delivery) {
      if (!delivery) return;
      if (chromeHud && chromeHud.closePanels) chromeHud.closePanels();
      if (delivery.status === "arrived") {
        syncCrateMesh(delivery);
        setStatus("Green package on the kerb. Tap it — Take all or Close.");
        return;
      }
      void ensureDeliveries().then(() => {
        const plot = map.plots.find((p) => p.id === delivery.plotId);
        if (plot) deliveries.start(delivery, plot);
      });
    },
  });
  setStatus("World viewer. Left-click walks. Lots chip shows outlines..");
  onResize();
  await idle(80);
  await ensureTaxi();
  await ensureDeliveries();
  void loadSheetHuds();
  void loadTrickleDressing();
}

canvas.addEventListener("pointerup", onPointer);
window.addEventListener(
  "pointerup",
  (ev) => {
    if (!(chromeHud && chromeHud.isPlacing && chromeHud.isPlacing())) return;
    if (ev.target === canvas || (canvas && canvas.contains && canvas.contains(ev.target))) return;
    onPointer(ev);
  },
  true,
);
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
  if (ev.target.closest && ev.target.closest(HUD_BLOCK)) return;
  aimPointer(ev);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(clickTargets(), true);
  const standHit = hits.find((h) => objectWithStand(h.object));
  if (standHit) {
    const obj = objectWithStand(standHit.object);
    if (obj) openStandMenu(obj.userData.standId);
    return;
  }
});
btnLease.addEventListener("click", () => {
  const ask = document.getElementById("buy-ask");
  if (ask && !ask.hidden) {
    void lease();
    return;
  }
  const p = selected && map ? map.plots.find((x) => x.id === selected) : null;
  if (p) askToBuy(p);
});
btnDevelop.addEventListener("click", openCatalog);
if (btnTaxi) {
  btnTaxi.addEventListener("click", async () => {
    const t = await ensureTaxi();
    if (t && typeof t.call === "function") t.call();
  });
}
if (btnEnter) {
  btnEnter.addEventListener("click", () => {
    if (!selected || !map) return;
    const p = map.plots.find((x) => x.id === selected);
    if (p) enterPlot(p);
  });
}
if (btnExit) {
  btnExit.addEventListener("click", () => {
    if (interior && interior.isInside()) {
      leaveInterior();
      return;
    }
    if (taxi && typeof taxi.hopOut === "function" && taxi.riding && taxi.riding()) {
      taxi.hopOut();
      setStatus("Out of the taxi..");
    }
  });
}
btnFerry.addEventListener("click", ferry);
window.addEventListener("resize", onResize);
scene.add(sun.target);

boot().catch(bootFail);
