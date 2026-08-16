import * as THREE from "three";

const canvas = document.getElementById("c");
const statusEl = document.getElementById("status");
const placeEl = document.getElementById("place");
const cashEl = document.getElementById("cash");
const plotLineEl = document.getElementById("plot-line");
const btnLease = document.getElementById("btn-lease");
const btnFerry = document.getElementById("btn-ferry");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7ec8d4);
scene.fog = new THREE.Fog(0x7ec8d4, 420, 2200);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.4, 4000);

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
const camOffset = new THREE.Vector3(14, 32, 42);
const tmp = new THREE.Vector3();

let map = null;
let islandId = "north";
let selected = null;
let walking = false;
let lastTap = 0;

const player = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.55, 1.15, 4, 8),
  new THREE.MeshLambertMaterial({ color: 0xf2d2a8 }),
);
player.castShadow = true;
scene.add(player);

const plotMeshes = new Map();
const stallMeshes = new Map();
const ground = [];

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

function setStatus(t) {
  statusEl.textContent = t;
}

function refreshHud() {
  cashEl.textContent = "Cash $" + money(map.visitor.cash);
  const here = specOf(islandId);
  placeEl.textContent = here.name + " port";
  if (!selected) {
    plotLineEl.textContent = "No plot selected";
    btnLease.disabled = true;
    return;
  }
  const p = map.plots.find((x) => x.id === selected);
  if (!p) return;
  if (p.class === "reserved") {
    plotLineEl.textContent = p.id + " · public quay";
    btnLease.disabled = true;
  } else if (p.owner) {
    plotLineEl.textContent = p.id + " · " + (p.owner === "visitor" ? "yours" : "taken");
    btnLease.disabled = true;
  } else {
    plotLineEl.textContent = p.id + " · " + p.band + " · $" + money(p.price);
    const near = Math.hypot(player.position.x - p.x, player.position.z - p.z) < 18;
    btnLease.disabled = !near || map.visitor.cash < p.price;
  }
}

function plotColor(p, isSel) {
  if (isSel) return 0xf0d060;
  if (p.class === "reserved") return 0x7a5230;
  if (p.owner === "visitor") return 0xb24a32;
  if (p.owner) return 0x6d7380;
  if (p.island === "north") return p.band === "quay" ? 0xd4b483 : 0xc4a574;
  return p.band === "quay" ? 0x9bb56a : 0x7a9a4a;
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
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshLambertMaterial({ vertexColors: true }),
  );
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

function makePort(spec) {
  const toward = spec.id === "north" ? 1 : -1;
  const { x, z } = spec.port;
  const y = heightAt(spec, x, z);
  const pier = box(10, 0.7, 78, 0x8a6238, x, y + 0.2, z + toward * 34);
  pier.userData.kind = "port";
  const shed = box(16, 7, 10, 0x7b818c, x + 16, y + 3.6, z - toward * 8);
  shed.userData.kind = "port";
  box(16.4, 1.2, 10.4, 0xb24a32, x + 16, y + 7.4, z - toward * 8, false);
  for (let i = -2; i <= 2; i++) {
    box(0.35, 1.6, 0.35, 0x5a3a22, x + i * 2.2, y + 1.1, z + toward * 70, false);
  }
  for (let i = 0; i < 4; i++) {
    box(1.6, 1.4, 1.6, 0x7a5230, x - 8 + i * 2.1, y + 1.0, z - toward * 2, false);
  }
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

function stallFor(plot) {
  const spec = specOf(plot.island);
  const y = heightAt(spec, plot.x, plot.z);
  const color = plot.owner === "visitor" ? 0xb24a32 : 0x6d7380;
  const body = box(8, 3.2, 8, color, plot.x, y + 1.7, plot.z);
  body.userData.kind = "stall";
  stallMeshes.set(plot.id, body);
}

function makePlots() {
  for (const p of map.plots) {
    const spec = specOf(p.island);
    const y = heightAt(spec, p.x, p.z) + 0.08;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(p.w - 0.6, 0.16, p.d - 0.6),
      new THREE.MeshLambertMaterial({ color: plotColor(p, false) }),
    );
    mesh.position.set(p.x, y, p.z);
    mesh.userData.kind = "plot";
    mesh.userData.plotId = p.id;
    scene.add(mesh);
    plotMeshes.set(p.id, mesh);
    if (p.owner) stallFor(p);
  }
}

function paintPlots() {
  for (const p of map.plots) {
    const mesh = plotMeshes.get(p.id);
    if (mesh) mesh.material.color.setHex(plotColor(p, p.id === selected));
  }
}

function spawnAt(id) {
  islandId = id;
  const spec = specOf(id);
  const x = spec.port.x;
  const z = spec.port.z + (id === "north" ? -8 : 8);
  player.position.set(x, heightAt(spec, x, z) + 1.15, z);
  walking = false;
  selected = null;
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
  if (plotHit) {
    selected = plotHit.object.userData.plotId;
    paintPlots();
    refreshHud();
    const p = map.plots.find((x) => x.id === selected);
    if (p && Math.hypot(player.position.x - p.x, player.position.z - p.z) > 18) {
      goTo(p.x, p.z);
      setStatus("Walking to " + p.id + ".");
    } else {
      setStatus(p.class === "reserved" ? "Public quay. Cannot lease." : "Plot selected.");
    }
    return;
  }
  if (portHit && nearPort()) {
    ferry();
    return;
  }
  if (groundHit) goTo(groundHit.point.x, groundHit.point.z);
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
  if (!stallMeshes.has(selected)) {
    const p = map.plots.find((x) => x.id === selected);
    if (p) stallFor(p);
  }
  paintPlots();
  refreshHud();
  setStatus("Leased " + selected + " for $" + money(body.paid) + " (PAPER).");
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
  if (walking) {
    const dx = walkTarget.x - player.position.x;
    const dz = walkTarget.z - player.position.z;
    const dist = Math.hypot(dx, dz);
    const step = 18 * dt;
    if (dist <= step) {
      player.position.copy(walkTarget);
      walking = false;
      setStatus("Tap a plot to select it, or tap the port to ferry.");
    } else {
      player.position.x += (dx / dist) * step;
      player.position.z += (dz / dist) * step;
      player.position.y = landHeight(player.position.x, player.position.z) + 1.15;
    }
  }
  btnFerry.disabled = !nearPort();
  refreshHud();
  tmp.copy(player.position).add(camOffset);
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
    new THREE.PlaneGeometry(5200, 5200),
    new THREE.MeshLambertMaterial({ color: 0x1d7a86 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0;
  scene.add(water);
  makeTerrain(specOf("north"));
  makeTerrain(specOf("south"));
  makePort(specOf("north"));
  makePort(specOf("south"));
  makePalms(specOf("north"));
  makePalms(specOf("south"));
  makePlots();
  spawnAt("north");
  setStatus("Tap the ground to walk. Tap a plot, then Lease.");
}

canvas.addEventListener("pointerup", onPointer);
btnLease.addEventListener("click", lease);
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
