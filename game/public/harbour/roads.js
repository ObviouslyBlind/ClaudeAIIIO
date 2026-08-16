import * as THREE from "three";

/** Metres. A black tarmac ribbon, not a kerbed highway kit. */
export const PAVED_WIDTH_M = 7.2;
/** Metres. Field tracks only — thinner than the street. */
export const DIRT_WIDTH_M = 2.6;
/** Black tarmac. */
export const ASPHALT = 0x141414;
/** Packed earth — same kraft family as crates, not grey pavement. */
export const DIRT = 0x8a6238;
/** Dusty lift so field tracks do not crush to paved black under Lambert. */
const DIRT_DUST = 0x9a6a40;

/**
 * Linear fog (metres). Ports are ~13.9 km apart after the island scale-up.
 */
export const FOG_NEAR_M = 6000;
export const FOG_FAR_M = 42000;
export const CAMERA_FAR_M = 52000;

/**
 * Spawn camera, metres from the player.
 *
 * Round 9 looked at the channel from 54 m, so the island read as a beach strip.
 * Round 10 is a third-person view from the quay looking INLAND along the tarmac
 * toward the hill, so the landmass fills the frame.
 */
export function spawnCameraOffset(islandId) {
  return islandId === "north" ? { x: 20, y: 24, z: 40 } : { x: 20, y: 24, z: -40 };
}

/** Metres from the player. Inland along the spine, not out to sea. */
export function spawnLookAtOffset(islandId) {
  return islandId === "north" ? { x: 0, y: 5, z: -120 } : { x: 0, y: 5, z: 120 };
}

/** Drop near-duplicates so the ribbon does not fold on itself. */
function ribbonStations(points) {
  const pts = [];
  for (const p of points) {
    if (pts.length && Math.hypot(p.x - pts[pts.length - 1].x, p.z - pts[pts.length - 1].z) < 0.4) continue;
    pts.push(p);
  }
  return pts;
}

/**
 * One prism along the polyline: mitered left/right edges, world-up
 * (no Frenet twist). Reads as a continuous ribbon, not paving slabs.
 */
function drawRibbon(scene, spec, road, heightAt, widthM, color, roadKind, matOpts = {}) {
  const pts = ribbonStations(road.points);
  if (pts.length < 2) return;

  const half = widthM / 2;
  const thick = 0.14;
  const n = pts.length;
  const positions = new Float32Array(n * 12);
  const indices = [];

  for (let i = 0; i < n; i++) {
    let dx;
    let dz;
    if (i === 0) {
      dx = pts[1].x - pts[0].x;
      dz = pts[1].z - pts[0].z;
    } else if (i === n - 1) {
      dx = pts[i].x - pts[i - 1].x;
      dz = pts[i].z - pts[i - 1].z;
    } else {
      dx = pts[i + 1].x - pts[i - 1].x;
      dz = pts[i + 1].z - pts[i - 1].z;
    }
    const tlen = Math.hypot(dx, dz) || 1;
    const tx = dx / tlen;
    const tz = dz / tlen;
    // World-up × tangent → right in XZ.
    let rx = tz;
    let rz = -tx;
    let scale = half;
    if (i > 0 && i < n - 1) {
      const sx = pts[i].x - pts[i - 1].x;
      const sz = pts[i].z - pts[i - 1].z;
      const sl = Math.hypot(sx, sz) || 1;
      const dot = rx * (sz / sl) + rz * (-sx / sl);
      if (dot > 0.25) scale = Math.min(half / dot, half * 3);
    }
    const y = heightAt(spec, pts[i].x, pts[i].z) + 0.1;
    const lx = pts[i].x - rx * scale;
    const lz = pts[i].z - rz * scale;
    const qx = pts[i].x + rx * scale;
    const qz = pts[i].z + rz * scale;
    const yT = y + thick / 2;
    const yB = y - thick / 2;
    const o = i * 12;
    positions[o] = lx;
    positions[o + 1] = yT;
    positions[o + 2] = lz;
    positions[o + 3] = qx;
    positions[o + 4] = yT;
    positions[o + 5] = qz;
    positions[o + 6] = lx;
    positions[o + 7] = yB;
    positions[o + 8] = lz;
    positions[o + 9] = qx;
    positions[o + 10] = yB;
    positions[o + 11] = qz;
  }

  for (let i = 0; i < n - 1; i++) {
    const a = i * 4;
    const b = a + 4;
    indices.push(a, b, b + 1, a, b + 1, a + 1);
    indices.push(a + 2, a + 3, b + 3, a + 2, b + 3, b + 2);
    indices.push(a, a + 2, b + 2, a, b + 2, b);
    indices.push(a + 1, b + 1, b + 3, a + 1, b + 3, a + 3);
  }
  indices.push(2, 3, 1, 2, 1, 0);
  const e = (n - 1) * 4;
  indices.push(e, e + 1, e + 3, e, e + 3, e + 2);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color, ...matOpts }));
  m.castShadow = false;
  m.receiveShadow = true;
  m.userData.kind = "ground";
  m.userData.roadKind = roadKind;
  m.userData.widthM = widthM;
  scene.add(m);
}

function drawPaved(scene, spec, road, heightAt) {
  drawRibbon(scene, spec, road, heightAt, PAVED_WIDTH_M, ASPHALT, "paved");
}

function drawDirt(scene, spec, road, heightAt) {
  drawRibbon(scene, spec, road, heightAt, DIRT_WIDTH_M, DIRT, "dirt", {
    emissive: DIRT_DUST,
    emissiveIntensity: 0.24,
  });
}

/**
 * Draw `/api/map` roads. Paved = asphalt street. Dirt = thin packed earth on fields only.
 */
export function makeRoads(map, helpers) {
  const { scene, specOf, heightAt } = helpers;
  for (const road of map.roads) {
    const spec = specOf(road.island);
    if (road.kind === "paved") drawPaved(scene, spec, road, heightAt);
    else drawDirt(scene, spec, road, heightAt);
  }
}
