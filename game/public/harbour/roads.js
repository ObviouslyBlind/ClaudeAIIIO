import * as THREE from "three";

/** Metres. Dark carriageway the critic can read from spawn. */
export const PAVED_WIDTH_M = 7.2;
/** Metres. Field tracks only — thinner than the street. */
export const DIRT_WIDTH_M = 2.6;
/** Dark asphalt, not sand-brown or lot-green. */
export const ASPHALT = 0x2a2e34;
export const DIRT = 0x8a6238;
export const VERGE = 0x6a8f44;
export const CURB = 0xc8c2b0;
export const CENTRE_LINE = 0xe6dcc4;

const DASH_LEN = 2.5;
const DASH_GAP = 3.5;

/**
 * Linear fog (metres). Ports are ~8.6 km apart. Old 2800–16000 ate the far
 * silhouette; keep the other shore readable without looking like a neighbour beach.
 */
export const FOG_NEAR_M = 5200;
export const FOG_FAR_M = 28000;
/** Perspective far plane; past FOG_FAR so the horizon can fade. */
export const CAMERA_FAR_M = 36000;

/**
 * Spawn camera, metres from the player.
 *
 * Intended north offset: { x: 56, y: 54, z: -132 }
 * East of the paved spine, inland, raised. Looking at spawnLookAtOffset (channel)
 * puts (a) dashed asphalt in the lower frame and (b) the far island on the
 * horizon — LEFT of frame on north, RIGHT on south.
 *
 * Not the old side-on { x: 58, y: 30, z: 14 } (looked west along this shore;
 * south island at +Z was off-frame). Not inland-only with no X: that stares
 * at water and loses the street.
 */
export function spawnCameraOffset(islandId) {
  return islandId === "north" ? { x: 56, y: 54, z: -132 } : { x: 56, y: 54, z: 132 };
}

/** Metres from the player. Toward the channel so the far shore sits on the horizon. */
export function spawnLookAtOffset(islandId) {
  return islandId === "north" ? { x: 0, y: 2, z: 240 } : { x: 0, y: 2, z: -240 };
}

function addBox(scene, w, h, d, color, x, y, z, yaw, roadKind) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  m.position.set(x, y, z);
  m.rotation.y = yaw;
  m.castShadow = false;
  m.receiveShadow = true;
  m.userData.kind = "ground";
  m.userData.roadKind = roadKind;
  scene.add(m);
  return m;
}

function across(mx, mz, yaw, dist) {
  return { x: mx + Math.cos(yaw) * dist, z: mz - Math.sin(yaw) * dist };
}

function drawPaved(scene, spec, road, heightAt) {
  for (let i = 0; i < road.points.length - 1; i++) {
    const a = road.points[i];
    const b = road.points[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (len < 1) continue;
    const mx = (a.x + b.x) / 2;
    const mz = (a.z + b.z) / 2;
    const y = heightAt(spec, mx, mz) + 0.1;
    const yaw = Math.atan2(b.x - a.x, b.z - a.z);

    addBox(scene, 18, 0.08, len + 0.5, VERGE, mx, y - 0.05, mz, yaw, "verge");
    addBox(scene, PAVED_WIDTH_M, 0.14, len + 0.4, ASPHALT, mx, y, mz, yaw, "paved");

    const half = PAVED_WIDTH_M / 2 + 0.18;
    for (const side of [-1, 1]) {
      const p = across(mx, mz, yaw, side * half);
      addBox(scene, 0.38, 0.22, len + 0.35, CURB, p.x, y + 0.08, p.z, yaw, "curb");
    }

    const period = DASH_LEN + DASH_GAP;
    for (let d = DASH_LEN * 0.6; d < len - DASH_LEN * 0.5; d += period) {
      const t = d / len;
      const x = a.x + (b.x - a.x) * t;
      const z = a.z + (b.z - a.z) * t;
      const hy = heightAt(spec, x, z) + 0.18;
      addBox(scene, 0.22, 0.05, DASH_LEN, CENTRE_LINE, x, hy, z, yaw, "centre-line");
    }
  }
}

function drawDirt(scene, spec, road, heightAt) {
  for (let i = 0; i < road.points.length - 1; i++) {
    const a = road.points[i];
    const b = road.points[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (len < 1) continue;
    const mx = (a.x + b.x) / 2;
    const mz = (a.z + b.z) / 2;
    const y = heightAt(spec, mx, mz) + 0.07;
    const yaw = Math.atan2(b.x - a.x, b.z - a.z);
    addBox(scene, DIRT_WIDTH_M, 0.1, len + 0.3, DIRT, mx, y, mz, yaw, "dirt");
  }
}

/**
 * Draw `/api/map` roads. Paved = asphalt street. Dirt = thin brown on fields only.
 */
export function makeRoads(map, helpers) {
  const { scene, specOf, heightAt } = helpers;
  for (const road of map.roads) {
    const spec = specOf(road.island);
    if (road.kind === "paved") drawPaved(scene, spec, road, heightAt);
    else drawDirt(scene, spec, road, heightAt);
  }
}
