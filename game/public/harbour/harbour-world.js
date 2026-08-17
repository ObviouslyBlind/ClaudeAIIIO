/**
 * Tiny harbour helpers with no interior/factory import graph.
 * `/` must stay interactive; createInterior stays a later dynamic import.
 */
import * as THREE from "three";

/**
 * Owned + developed only. NPC land, vacant lots, and unset use are SKIP.
 * @param {{ owner?: string | null, use?: string | null } | null | undefined} plot
 */
export function canEnter(plot) {
  if (!plot) return false;
  return plot.owner === "visitor" && Boolean(plot.use);
}

/**
 * Reparent harbour meshes into a group so enter/exit can hide them
 * without deleting the world. Lights and `keep` stay on the scene.
 */
export function wrapHarbourWorld(scene, { keep = [] } = {}) {
  const harbour = new THREE.Group();
  harbour.name = "harbour";
  harbour.userData.kind = "harbour";
  const keepSet = new Set(keep);
  const moving = [];
  for (const child of scene.children) {
    if (keepSet.has(child)) continue;
    if (child.isLight) continue;
    if (child.userData?.kind === "interior") continue;
    moving.push(child);
  }
  for (const child of moving) harbour.add(child);
  scene.add(harbour);
  return harbour;
}

export function objectWithKind(obj, kind) {
  let o = obj;
  while (o) {
    if (o.userData?.kind === kind) return o;
    o = o.parent;
  }
  return null;
}
