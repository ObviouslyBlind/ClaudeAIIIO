import * as THREE from "three";
import { createTaxi } from "./taxi.js";
import { makeFerry, tickFerry } from "./ferry.js";

const canvas = document.getElementById("c");
const statusEl = document.getElementById("status");
const placeEl = document.getElementById("place");
const cashEl = document.getElementById("cash");
const plotLineEl = document.getElementById("plot-line");
const btnLease = document.getElementById("btn-lease");
const btnDevelop = document.getElementById("btn-develop");
const btnFerry = document.getElementById("btn-ferry");
const btnTaxi = document.getElementById("btn-taxi");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7ec8d4);
scene.fog = new THREE.Fog(0x7ec8d4, 1600, 9000);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.4, 12000);

scene.add(new THREE.HemisphereLight(0xb8e4ff, 0xc4a574, 1.15));
const sun = new THREE.DirectionalLight(0xfff1d0, 2.1);
sun.position.set(180, 260, 80);
sun.castShadow = true;
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
  h += spec.peak * 0.7 * Math.max(0, 1 - hillD / 320) ** 2;
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
  return map.plots.find((p) => pointInRing(x, z, p.ring));
}

function setStatus(t) {
  statusEl.textContent = t;
}

function parcelLabel(p) {
  const kind = p.band === "field" ? "field" : p.band === "shore" ? "shore land" : "street land";
  return kind + " · " + money(p.area) + " m²";
}

function nearParcel(p) {
  return Math.hypot(player.position.x - p.x, player.position.z - p.z) < 22;
}

function refreshHud() {
  if (!map) return;
  cashEl.textContent = "Cash $" + money(map.visitor.cash);
  placeEl.textContent = specOf(islandId).name;
  if (!selected) {
    plotLineEl.textContent = "Tap land to inspect it";
    btnLease.disabled = true;
    btnDevelop.disabled = true;
    return;
  }
  const p = map.plots.find((x) => x.id === selected);
  if (!p) return;
  const near = nearParcel(p);
  if (p.owner === "visitor") {
    plotLineEl.textContent = parcelLabel(p) + (p.use ? " · " + p.use : " · yours");
    btnLease.disabled = true;
    btnDevelop.disabled = !near || !!p.use || map.visitor.cash < map.developCost;
  } else if (p.owner) {
    plotLineEl.textContent = parcelLabel(p) + " · taken";
    btnLease.disabled = true;
    btnDevelop.disabled = true;
  } else {
    plotLineEl.textContent = parcelLabel(p) + " · $" + money(p.price);
    btnLease.disabled = !near || map.visitor.cash < p.price;
    btnDevelop.disabled = true;
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
    const c = h < 0 ? new THREE.Color(0x1d7a86) : t > 0.78 ? sand : h > 38 ? rock : grass;
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

function part(w, h, d, color, shadow = true) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

function houseAt(x, z, y, yaw, kind) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = yaw;
  const shop = kind === "shop";
  const wall = shop ? 0xe8d7b8 : 0xf2e6d0;
  const roof = shop ? 0x8a3b2a : 0x6a5340;
  const W = shop ? 8.4 : 6.2;
  const D = shop ? 6.6 : 5.0;
  const H = shop ? 3.5 : 2.7;
  const walls = part(W, H, D, wall);
  walls.position.y = H / 2;
  g.add(walls);
  const slabW = W + 0.7;
  const slabD = D * 0.7;
  const left = part(slabW, 0.16, slabD, roof, false);
  left.rotation.x = 0.52;
  left.position.set(0, H + 0.85, -D * 0.2);
  const right = part(slabW, 0.16, slabD, roof, false);
  right.rotation.x = -0.52;
  right.position.set(0, H + 0.85, D * 0.2);
  g.add(left, right);
  const door = part(1.15, 2.05, 0.1, 0x4a3220, false);
  door.position.set(0, 1.02, D / 2 + 0.07);
  g.add(door);
  const win = part(1.05, 0.85, 0.08, 0x8ec4d4, false);
  win.position.set(-W * 0.28, 2.05, D / 2 + 0.07);
  const win2 = win.clone();
  win2.position.x = W * 0.28;
  g.add(win, win2);
  if (shop) {
    const awning = part(W * 0.92, 0.08, 1.7, 0xc45c3a, false);
    awning.position.set(0, 2.55, D / 2 + 0.95);
    awning.rotation.x = 0.28;
    g.add(awning);
  }
  scene.add(g);
  return g;
}

function farmAt(x, z, y, area) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const span = Math.min(15, Math.sqrt(area) * 0.48);
  for (let i = 0; i < 5; i++) {
    const row = part(span, 0.2, 0.65, i % 2 ? 0x6b8f3a : 0x8a6b38, false);
    row.position.set(0, 0.12, -span * 0.32 + i * 1.1);
    g.add(row);
  }
  scene.add(g);
  houseAt(x + span * 0.3, z + span * 0.18, y, 0.35, "shed");
  return g;
}

function makePort(spec) {
  const toward = spec.id === "north" ? 1 : -1;
  const { x, z } = spec.port;
  const y = heightAt(spec, x, z);
  const pier = box(10, 0.7, 78, 0x8a6238, x, y + 0.2, z + toward * 34);
  pier.userData.kind = "port";
  const wx = x + 16;
  const wz = z - toward * 10;
  const shed = box(18, 6.2, 11, 0xd9cbb3, wx, y + 3.2, wz);
  shed.userData.kind = "port";
  const roofA = box(19, 0.2, 7.2, 0x7a3a2c, wx, y + 7.1, wz - 2.2, false);
  roofA.rotation.x = 0.42;
  const roofB = box(19, 0.2, 7.2, 0x7a3a2c, wx, y + 7.1, wz + 2.2, false);
  roofB.rotation.x = -0.42;
  box(3.2, 3.6, 0.2, 0x3d2a1c, wx, y + 1.9, wz + toward * 5.6, false);
  box(1.4, 1.1, 0.12, 0x8ec4d4, wx - 5, y + 4.2, wz + toward * 5.55, false);
  box(1.4, 1.1, 0.12, 0x8ec4d4, wx + 5, y + 4.2, wz + toward * 5.55, false);
  for (let i = -2; i <= 2; i++) {
    box(0.35, 1.6, 0.35, 0x5a3a22, x + i * 2.2, y + 1.1, z + toward * 70, false);
  }
  for (let i = 0; i < 4; i++) {
    box(1.6, 1.4, 1.6, 0x7a5230, x - 8 + i * 2.1, y + 1.0, z - toward * 2, false);
  }
  box(0.9, 36, 0.9, 0xf3efe4, x - 12, y + 18, z + toward * 6, false);
}

function makePalms(spec) {
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f6b32 });
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 4.2, 5);
  const leafGeo = new THREE.ConeGeometry(1.6, 2.2, 5);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + (spec.id === "north" ? 0.2 : 1.1);
    const x = spec.cx + Math.cos(a) * spec.rx * 0.84;
    const z = spec.cz + Math.sin(a) * spec.rz * 0.84;
    const y = heightAt(spec, x, z);
    if (y < 0.3) continue;
    const t = new THREE.Mesh(trunkGeo, trunkMat);
    t.position.set(x, y + 2.1, z);
    const l = new THREE.Mesh(leafGeo, leafMat);
    l.position.set(x, y + 4.6, z);
    scene.add(t, l);
  }
}

function makeRoads() {
  for (const road of map.roads) {
    const spec = specOf(road.island);
    const width = road.kind === "paved" ? 6.2 : 2.8;
    const color = road.kind === "paved" ? 0x4a4f57 : 0x8a6238;
    for (let i = 0; i < road.points.length - 1; i++) {
      const a = road.points[i];
      const b = road.points[i + 1];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      if (len < 1) continue;
      const mx = (a.x + b.x) / 2;
      const mz = (a.z + b.z) / 2;
      const y = heightAt(spec, mx, mz) + 0.07;
      const seg = box(width, 0.12, len + 0.4, color, mx, y, mz, false);
      seg.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
      seg.userData.kind = "ground";
    }
  }
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
  const mesh = plotMeshes.get(p.id);
  if (!mesh) return;
  const sel = p.id === selected;
  mesh.material.color.setHex(parcelTint(p, sel));
  mesh.material.opacity = sel ? 0.55 : p.owner ? 0.32 : 0.16;
}

function useFor(p) {
  if (!p.use || useMeshes.has(p.id)) return;
  const spec = specOf(p.island);
  const y = heightAt(spec, p.x, p.z);
  const yaw = spec.id === "north" ? 0.15 : 3.3;
  const built =
    p.use === "farm" ? farmAt(p.x, p.z, y, p.area) : houseAt(p.x, p.z, y, yaw, "shop");
  useMeshes.set(p.id, built);
}

function makeParcels() {
  for (const p of map.plots) {
    const spec = specOf(p.island);
    const y = heightAt(spec, p.x, p.z) + 0.06;
    const mesh = new THREE.Mesh(
      parcelGeometry(p.ring, y),
      new THREE.MeshLambertMaterial({
        color: parcelTint(p, false),
        transparent: true,
        opacity: p.owner ? 0.32 : 0.16,
        depthWrite: false,
      }),
    );
    mesh.userData.kind = "plot";
    mesh.userData.plotId = p.id;
    scene.add(mesh);
    plotMeshes.set(p.id, mesh);
    if (p.use) useFor(p);
  }
}

function cameraOffset() {
  return islandId === "north" ? new THREE.Vector3(22, 36, -58) : new THREE.Vector3(22, 36, 58);
}

function snapCamera() {
  camera.position.copy(player.position).add(cameraOffset());
  camera.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
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
  if (h < 0.2) {
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
  } else {
    setStatus(p.owner ? "This land is taken." : "This land. Lease it to develop.");
  }
}

function onPointer(ev) {
  if (Date.now() - lastTap < 180) return;
  lastTap = Date.now();
  if (ev.target.closest && ev.target.closest("nav, a, button")) return;
  pointer.x = (ev.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(ev.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(scene.children, false);
  const plotHit = hits.find((h) => h.object.userData.kind === "plot");
  const portHit = hits.find((h) => h.object.userData.kind === "port");
  const groundHit = hits.find((h) => h.object.userData.kind === "ground");
  const tapPt = plotHit?.point || groundHit?.point || portHit?.point;
  if (tapPt && taxi && taxi.handleTap(tapPt.x, tapPt.z, nearestIsland(tapPt.x, tapPt.z))) {
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

async function lease() {
  if (!selected) return;
  const res = await fetch("/api/lease", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ plotId: selected }),
  });
  const body = await res.json();
  if (!body.ok) {
    setStatus("Could not lease: " + body.reason);
    return;
  }
  map = body.snapshot;
  paintParcel(map.plots.find((x) => x.id === selected));
  refreshHud();
  setStatus("This land is yours for $" + money(body.paid) + " (PAPER). Develop it.");
}

async function develop() {
  if (!selected) return;
  const p = map.plots.find((x) => x.id === selected);
  const use = p && p.band === "field" ? "farm" : "stall";
  const res = await fetch("/api/develop", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ plotId: selected, use }),
  });
  const body = await res.json();
  if (!body.ok) {
    setStatus("Could not develop: " + body.reason);
    return;
  }
  map = body.snapshot;
  useFor(map.plots.find((x) => x.id === selected));
  paintParcel(map.plots.find((x) => x.id === selected));
  refreshHud();
  setStatus("Developed this land as a " + use + " (PAPER).");
}

function ferry() {
  if (!nearPort()) return;
  spawnAt(islandId === "north" ? "south" : "north");
  setStatus("Ferry across. PAPER, no ticket yet.");
}

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

function tick(dt) {
  if (taxi) taxi.tick(dt);
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
  tmp.copy(player.position).add(cameraOffset());
  camera.position.lerp(tmp, 1 - Math.pow(0.001, dt));
  camera.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
  sun.position.set(player.position.x + 180, 260, player.position.z + 80);
  sun.target.position.copy(player.position);
  sun.target.updateMatrixWorld();
}

async function boot() {
  const res = await fetch("/api/map");
  map = await res.json();
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(18000, 18000),
    new THREE.MeshLambertMaterial({ color: 0x1d7a86 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0;
  scene.add(water);
  makeTerrain(specOf("north"));
  makeTerrain(specOf("south"));
  makeRoads();
  makePort(specOf("north"));
  makePort(specOf("south"));
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
  spawnAt("north");
  setStatus("Tap a piece of land. Lease it, then develop it.");
}

canvas.addEventListener("pointerup", onPointer);
btnLease.addEventListener("click", lease);
btnDevelop.addEventListener("click", develop);
btnFerry.addEventListener("click", ferry);
window.addEventListener("resize", onResize);
scene.add(sun.target);

boot().then(() => {
  renderer.setAnimationLoop(() => {
    const dt = Math.min(0.05, clock.getDelta());
    tick(dt);
    renderer.render(scene, camera);
  });
});
