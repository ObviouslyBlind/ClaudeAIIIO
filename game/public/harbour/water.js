import * as THREE from "three";

/** Lagoon water. Builder fills this module — keep the tint 0x1d7a86. */
export const WATER_COLOR = 0x1d7a86;

/** Deeper water down the ferry channel. Same hue, darker than the lagoon. */
const CHANNEL_COLOR = 0x10525c;

function addWaterMesh(geo, material, y) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.userData.kind = "water";
  return mesh;
}

/** Static ripples. Local +Z becomes world Y after the plane rotation. */
function ripple(geo, amp, px, pz) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + px;
    const y = pos.getY(i) - pz;
    const h =
      amp *
      (0.52 +
        0.28 * Math.sin(x * 0.11 + y * 0.07) +
        0.14 * Math.sin(x * 0.19 - y * 0.13) +
        0.08 * Math.sin(x * 0.31 + y * 0.23));
    pos.setZ(i, h);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

/**
 * Vertex colour that, multiplied by WATER_COLOR, lands on CHANNEL_COLOR.
 * Keeps the lagoon hue; Lambert only.
 */
function channelVertex() {
  const water = new THREE.Color(WATER_COLOR);
  const channel = new THREE.Color(CHANNEL_COLOR);
  return new THREE.Color(channel.r / water.r, channel.g / water.g, channel.b / water.b);
}

/**
 * Working harbour off each quay. Deepest in the ferry lane under the north
 * berth (HOME_Z -6835), fading to lagoon at the lip.
 */
function harbourBasin(z) {
  const w = 360;
  const d = 260;
  const geo = new THREE.PlaneGeometry(w, d, 28, 20);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const shallow = new THREE.Color(0xffffff);
  const deep = channelVertex();
  const c = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i);
    const ly = pos.getY(i);
    const worldZ = z - ly;
    const seaward = Math.min(1, Math.max(0, 0.3 + (6950 - Math.abs(worldZ)) / 90));
    const lane = Math.min(1, Math.max(0, 1 - (lx * lx) / (170 * 170)));
    c.copy(shallow).lerp(deep, seaward * lane);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  ripple(geo, 0.16, 0, z);

  const mesh = addWaterMesh(
    geo,
    new THREE.MeshLambertMaterial({ color: WATER_COLOR, vertexColors: true }),
    0.06,
  );
  mesh.position.z = z;
  return mesh;
}

function channelStrip() {
  const geo = new THREE.PlaneGeometry(440, 12800, 6, 32);
  ripple(geo, 0.1, 0, 0);
  const mesh = addWaterMesh(
    geo,
    new THREE.MeshLambertMaterial({ color: CHANNEL_COLOR }),
    0.03,
  );
  return mesh;
}

function harbourSea(cx, cz) {
  const geo = new THREE.PlaneGeometry(2800, 2800, 40, 40);
  ripple(geo, 0.22, cx, cz);
  const mesh = addWaterMesh(
    geo,
    new THREE.MeshLambertMaterial({ color: WATER_COLOR }),
    0.04,
  );
  mesh.position.x = cx;
  mesh.position.z = cz;
  return mesh;
}

function stashRest(mesh) {
  const arr = mesh.geometry.attributes.position.array;
  mesh.userData.waterRest = new Float32Array(arr);
}

/**
 * Cheap harbour chop. Far ocean stays a 4-vert quad. Near each port a 2.8 km
 * patch (plus the quay basin) moves. Local +Z is world height after rotation.
 */
export function tickHarbourWater(meshes, t) {
  if (!meshes || !meshes.length) return;
  const time = Number(t) || 0;
  for (const mesh of meshes) {
    const rest = mesh.userData && mesh.userData.waterRest;
    const pos = mesh.geometry && mesh.geometry.attributes && mesh.geometry.attributes.position;
    if (!rest || !pos) continue;
    const arr = pos.array;
    for (let i = 0; i < pos.count; i++) {
      const x = rest[i * 3];
      const y = rest[i * 3 + 1];
      const z0 = rest[i * 3 + 2];
      arr[i * 3 + 2] =
        z0 +
        0.45 * Math.sin(x * 0.11 + time * 1.35) +
        0.28 * Math.sin(y * 0.09 - time * 1.05);
    }
    pos.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  }
}

export function makeWater(scene) {
  const water = addWaterMesh(
    new THREE.PlaneGeometry(80000, 80000),
    new THREE.MeshLambertMaterial({ color: WATER_COLOR }),
    0,
  );
  scene.add(water);
  const live = [];
  function addLive(mesh) {
    stashRest(mesh);
    live.push(mesh);
    scene.add(mesh);
    return mesh;
  }
  addLive(channelStrip());
  addLive(harbourBasin(-6835));
  addLive(harbourBasin(6835));
  addLive(harbourSea(-2280, 7280));
  addLive(harbourSea(0, -6950));
  scene.userData.harbourWater = live;
  return water;
}
