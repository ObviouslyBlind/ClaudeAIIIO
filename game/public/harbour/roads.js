import * as THREE from "three";

/** Metres. A black tarmac ribbon, not a kerbed highway kit. */
export const PAVED_WIDTH_M = 7.2;
/** Metres. Field tracks only — thinner than the street. */
export const DIRT_WIDTH_M = 2.6;
/** Black tarmac. */
export const ASPHALT = 0x141414;
export const DIRT = 0x8a6238;

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

function drawPaved(scene, spec, road, heightAt) {
  for (let i = 0; i < road.points.length - 1; i++) {
    const a = road.points[i];
    const b = road.points[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (len < 0.4) continue;
    const mx = (a.x + b.x) / 2;
    const mz = (a.z + b.z) / 2;
    const y = heightAt(spec, mx, mz) + 0.1;
    const yaw = Math.atan2(b.x - a.x, b.z - a.z);
    addBox(scene, PAVED_WIDTH_M, 0.14, len + 0.35, ASPHALT, mx, y, mz, yaw, "paved");
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
