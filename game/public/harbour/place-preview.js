/**
 * Green place ghost. Follows the pointer. Hold R to yaw before tap.
 * Sim still owns the place. PAPER / SIMULATED.
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

function rectLoop(w, d) {
  const hw = w / 2;
  const hd = d / 2;
  const pts = [
    new THREE.Vector3(-hw, 0.08, -hd),
    new THREE.Vector3(hw, 0.08, -hd),
    new THREE.Vector3(hw, 0.08, hd),
    new THREE.Vector3(-hw, 0.08, hd),
    new THREE.Vector3(-hw, 0.08, -hd),
  ];
  return new THREE.BufferGeometry().setFromPoints(pts);
}

export function createPlacePreview(scene) {
  const mat = new THREE.LineBasicMaterial({
    color: PLACE_GHOST_OK,
    transparent: true,
    opacity: 0.95,
    depthTest: false,
  });
  const line = new THREE.Line(rectLoop(CART_FOOTPRINT_M.w, CART_FOOTPRINT_M.d), mat);
  line.name = "place-ghost";
  line.userData.kind = "place-ghost";
  line.userData.mode = "PAPER";
  line.visible = false;
  line.renderOrder = 8;
  scene.add(line);

  let on = false;
  let kind = "cart";
  let yaw = 0;
  let rotateHeld = false;
  let last = { x: 0, z: 0, ok: false };
  let lastPlot = null;

  function sizeOf() {
    return kind === "building" ? BUILDING_FOOTPRINT_M : CART_FOOTPRINT_M;
  }

  function rebuild() {
    const s = sizeOf();
    line.geometry.dispose();
    line.geometry = rectLoop(s.w, s.d);
  }

  function setKind(next) {
    const k = next === "building" ? "building" : "cart";
    if (k === kind) return;
    kind = k;
    rebuild();
  }

  function show(nextKind) {
    on = true;
    setKind(nextKind);
    yaw = 0;
    line.visible = true;
  }

  function hide() {
    on = false;
    rotateHeld = false;
    lastPlot = null;
    line.visible = false;
  }

  function paint() {
    const s = sizeOf();
    last.ok = Boolean(ghostFitsPlot(last.x, last.z, yaw, s.w, s.d, lastPlot));
    line.rotation.y = yaw;
    mat.color.setHex(last.ok ? PLACE_GHOST_OK : PLACE_GHOST_BAD);
  }

  function pose() {
    return { x: last.x, z: last.z, yaw, ok: last.ok, kind };
  }

  function moveTo(x, y, z, plot) {
    if (!on) return pose();
    last.x = x;
    last.z = z;
    lastPlot = plot || null;
    line.position.set(x, y, z);
    paint();
    line.visible = true;
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
