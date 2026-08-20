/**
 * Green place ghost on the dirt, above the lot fill, with a nose so yaw reads.
 * Hold R to rotate. Sim still owns the place. PAPER / SIMULATED.
 */

import * as THREE from "three";
import {
  BUILDING_FOOTPRINT_M,
  CART_FOOTPRINT_M,
  PLACE_GHOST_BAD,
  PLACE_GHOST_OK,
  PLACE_ROTATE_RAD_PER_S,
  ghostFitsPlot,
  isPlaceRotateKey,
} from "./place-pose.js";

/** Parcel fill sits at +0.35 m. The ghost must clear that square. */
export const PLACE_GHOST_LIFT_M = 0.62;
const RAIL_T = 0.08;
const RAIL_H = 0.12;

function skipRaycast(mesh) {
  mesh.raycast = () => {};
}

function paintMats(root, hex) {
  root.traverse((obj) => {
    if (obj.material && obj.material.color) obj.material.color.setHex(hex);
  });
}

function makeFootprint(w, d, hex) {
  const g = new THREE.Group();
  const fillMat = new THREE.MeshBasicMaterial({
    color: hex,
    transparent: true,
    opacity: 0.42,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const railMat = new THREE.MeshBasicMaterial({
    color: hex,
    depthTest: true,
    depthWrite: false,
  });
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(w, d), fillMat);
  fill.rotation.x = -Math.PI / 2;
  fill.position.y = PLACE_GHOST_LIFT_M;
  fill.renderOrder = 9;
  fill.name = "place-ghost-fill";
  skipRaycast(fill);
  g.add(fill);

  function rail(len, x, z, yaw) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, RAIL_H, RAIL_T), railMat.clone());
    m.position.set(x, PLACE_GHOST_LIFT_M + RAIL_H / 2, z);
    m.rotation.y = yaw;
    m.renderOrder = 10;
    skipRaycast(m);
    g.add(m);
  }
  rail(w + RAIL_T, 0, -d / 2, 0);
  rail(w + RAIL_T, 0, d / 2, 0);
  rail(d + RAIL_T, -w / 2, 0, Math.PI / 2);
  rail(d + RAIL_T, w / 2, 0, Math.PI / 2);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.46, 4), railMat.clone());
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, PLACE_GHOST_LIFT_M + 0.14, d / 2 + 0.28);
  nose.renderOrder = 11;
  nose.name = "place-ghost-nose";
  skipRaycast(nose);
  g.add(nose);
  return g;
}

export function createPlacePreview(scene) {
  const root = new THREE.Group();
  root.name = "place-ghost";
  root.userData.kind = "place-ghost";
  root.userData.mode = "PAPER";
  root.visible = false;
  root.frustumCulled = false;
  scene.add(root);

  let on = false;
  let kind = "cart";
  let yaw = 0;
  let rotateHeld = false;
  let last = { x: 0, z: 0, ok: false };
  let lastPlot = null;
  let body = null;

  function sizeOf() {
    return kind === "building" ? BUILDING_FOOTPRINT_M : CART_FOOTPRINT_M;
  }

  function rebuild() {
    if (body) {
      root.remove(body);
      body.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
    }
    const s = sizeOf();
    body = makeFootprint(s.w, s.d, last.ok ? PLACE_GHOST_OK : PLACE_GHOST_BAD);
    root.add(body);
  }

  function setKind(next) {
    const k = next === "building" ? "building" : "cart";
    if (k === kind && body) return;
    kind = k;
    rebuild();
  }

  function show(nextKind) {
    on = true;
    setKind(nextKind);
    yaw = 0;
    root.rotation.y = 0;
    root.visible = true;
  }

  function hide() {
    on = false;
    rotateHeld = false;
    lastPlot = null;
    root.visible = false;
  }

  function paint() {
    const s = sizeOf();
    last.ok = Boolean(ghostFitsPlot(last.x, last.z, yaw, s.w, s.d, lastPlot));
    root.rotation.y = yaw;
    if (body) paintMats(body, last.ok ? PLACE_GHOST_OK : PLACE_GHOST_BAD);
  }

  function pose() {
    return { x: last.x, z: last.z, yaw, ok: last.ok, kind };
  }

  function moveTo(x, y, z, plot) {
    if (!on) return pose();
    last.x = x;
    last.z = z;
    lastPlot = plot || null;
    root.position.set(x, y, z);
    if (!body) rebuild();
    paint();
    root.visible = true;
    return pose();
  }

  function tick(dt) {
    if (!on || !rotateHeld) return;
    yaw += PLACE_ROTATE_RAD_PER_S * (dt || 0);
    if (yaw > Math.PI * 2) yaw -= Math.PI * 2;
    paint();
  }

  function onKeyDown(ev) {
    if (!on) return false;
    if (ev.target && /INPUT|TEXTAREA|SELECT/.test(ev.target.tagName)) return false;
    if (!isPlaceRotateKey(ev)) return false;
    rotateHeld = true;
    ev.preventDefault();
    return true;
  }

  function onKeyUp(ev) {
    if (!isPlaceRotateKey(ev)) return false;
    rotateHeld = false;
    return true;
  }

  return {
    show,
    hide,
    moveTo,
    tick,
    pose,
    onKeyDown,
    onKeyUp,
    isOn: () => on,
    yaw: () => yaw,
  };
}
