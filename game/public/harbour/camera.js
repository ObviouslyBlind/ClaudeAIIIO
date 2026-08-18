import * as THREE from "three";
import { spawnCameraOffset, spawnLookAtOffset } from "./roads.js";

/** Radians per pixel. RMB drag, not OrbitControls. */
export const YAW_PER_PX = 0.005;
export const PITCH_PER_PX = 0.0035;
/** Keep the camera above the player; never flip over. */
export const PITCH_MIN = 0.12;
export const PITCH_MAX = 1.45;
/** Look at the capsule, slightly above its centre, after the user has orbited. */
export const LOOK_Y = 1.1;
export const RMB = 2;
export const LMB = 0;
/** Wheel zoom, metres from the player. High enough to read the whole town. */
export const ZOOM_MIN_M = 9;
export const ZOOM_MAX_M = 650;

/** Near plane grows with zoom so a 52 km far clip does not eat the water. */
export function cameraNearForRadius(radius) {
  const r = Number(radius) || ZOOM_MIN_M;
  return Math.max(0.4, Math.min(r * 0.012, r * 0.22));
}

/** Exponential wheel zoom, clamped. Positive deltaY zooms out. */
export function zoomRadius(radius, deltaY) {
  const next = radius * Math.exp((deltaY || 0) * 0.0011);
  return Math.max(ZOOM_MIN_M, Math.min(ZOOM_MAX_M, next));
}

/**
 * Offset from the player → yaw (around Y), pitch (from XZ), radius.
 * yaw = 0 puts the camera on +Z.
 */
export function cartesianToSpherical(offset) {
  const x = offset.x;
  const y = offset.y;
  const z = offset.z;
  const radius = Math.hypot(x, y, z) || 1;
  return {
    yaw: Math.atan2(x, z),
    pitch: Math.atan2(y, Math.hypot(x, z)),
    radius,
  };
}

export function sphericalToCartesian(sph) {
  const cp = Math.cos(sph.pitch);
  return {
    x: sph.radius * Math.sin(sph.yaw) * cp,
    y: sph.radius * Math.sin(sph.pitch),
    z: sph.radius * Math.cos(sph.yaw) * cp,
  };
}

export function createOrbitState(offset) {
  const sph = cartesianToSpherical(offset);
  return {
    yaw: sph.yaw,
    pitch: sph.pitch,
    radius: sph.radius,
    dragging: false,
    orbited: false,
    lastX: 0,
    lastY: 0,
  };
}

function clampPitch(p) {
  return Math.max(PITCH_MIN, Math.min(PITCH_MAX, p));
}

/**
 * Pure pointer reducer for tests and the live camera.
 *
 * Left click / single-finger tap never starts an orbit (walk-or-use keeps pointerup).
 * RMB hold + drag changes yaw/pitch. Release stops. pointerup alone does not orbit.
 * Touch with fewer than two pointers is ignored so phone tap-walk stays intact.
 */
export function handleOrbitPointer(state, ev) {
  const pointerType = ev.pointerType || "mouse";
  const pointerCount = ev.pointerCount ?? 1;

  if (pointerType === "touch" && pointerCount < 2) {
    return state;
  }

  if (ev.type === "down") {
    const rmb = ev.button === RMB;
    const twoFinger = pointerType === "touch" && pointerCount >= 2;
    if (!rmb && !twoFinger) return state;
    return {
      ...state,
      dragging: true,
      lastX: ev.clientX ?? 0,
      lastY: ev.clientY ?? 0,
    };
  }

  if (ev.type === "move") {
    if (!state.dragging) return state;
    const dx = ev.dx != null ? ev.dx : (ev.clientX ?? 0) - state.lastX;
    const dy = ev.dy != null ? ev.dy : (ev.clientY ?? 0) - state.lastY;
    return {
      ...state,
      yaw: state.yaw - dx * YAW_PER_PX,
      pitch: clampPitch(state.pitch + dy * PITCH_PER_PX),
      orbited: true,
      lastX: ev.clientX ?? state.lastX + dx,
      lastY: ev.clientY ?? state.lastY + dy,
    };
  }

  if (ev.type === "up") {
    if (ev.button === RMB || (pointerType === "touch" && pointerCount < 2)) {
      return { ...state, dragging: false };
    }
    return state;
  }

  return state;
}

/**
 * Follow the player. Until the user orbits, keep the spawn framing.
 * After orbit, keep the chosen spherical offset (Roblox-style).
 */
function applyZoomNear(camera, radius) {
  const near = cameraNearForRadius(radius);
  if (!camera || Math.abs(camera.near - near) < 0.02) return;
  camera.near = near;
  camera.updateProjectionMatrix();
}

export function tickCamera(camera, player, state, islandId, dt, tmp) {
  const follow = 1 - Math.pow(0.001, dt);
  if (!state.orbited) {
    const o = spawnCameraOffset(islandId);
    applyZoomNear(camera, Math.hypot(o.x, o.y, o.z));
    tmp.set(player.x + o.x, player.y + o.y, player.z + o.z);
    camera.position.lerp(tmp, follow);
    const l = spawnLookAtOffset(islandId);
    camera.lookAt(player.x + l.x, player.y + l.y, player.z + l.z);
    return;
  }
  applyZoomNear(camera, state.radius);
  const o = sphericalToCartesian(state);
  tmp.set(player.x + o.x, player.y + o.y, player.z + o.z);
  if (state.dragging) camera.position.copy(tmp);
  else camera.position.lerp(tmp, follow);
  if (camera.position.y < player.y + 1.6) camera.position.y = player.y + 1.6;
  camera.lookAt(player.x, player.y + LOOK_Y, player.z);
}

/**
 * RMB-hold orbit around the player. Does not listen for left-button pointerup
 * (that stays walk-or-use on the canvas). Phone: no orbit.
 */
export function createPlayCamera({ camera, canvas, getPlayer, getIslandId }) {
  const tmp = new THREE.Vector3();
  let state = createOrbitState(spawnCameraOffset(getIslandId()));

  function onDown(ev) {
    if (ev.pointerType === "touch") return;
    if (ev.button !== RMB) return;
    ev.preventDefault();
    state = handleOrbitPointer(state, {
      type: "down",
      button: ev.button,
      pointerType: ev.pointerType,
      clientX: ev.clientX,
      clientY: ev.clientY,
    });
  }

  function onMove(ev) {
    if (!state.dragging) return;
    if (ev.pointerType === "touch") return;
    state = handleOrbitPointer(state, {
      type: "move",
      pointerType: ev.pointerType,
      clientX: ev.clientX,
      clientY: ev.clientY,
    });
  }

  function onUp(ev) {
    if (ev.button !== RMB) return;
    state = handleOrbitPointer(state, {
      type: "up",
      button: ev.button,
      pointerType: ev.pointerType,
    });
  }

  function onMenu(ev) {
    ev.preventDefault();
  }

  function onWheel(ev) {
    ev.preventDefault();
    state = { ...state, radius: zoomRadius(state.radius, ev.deltaY), orbited: true };
  }

  canvas.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  // End the hold on window, never steal canvas pointerup from walk-or-use.
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  canvas.addEventListener("contextmenu", onMenu);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  function snap() {
    state = createOrbitState(spawnCameraOffset(getIslandId()));
    const p = getPlayer();
    const o = spawnCameraOffset(getIslandId());
    camera.position.set(p.x + o.x, p.y + o.y, p.z + o.z);
    const l = spawnLookAtOffset(getIslandId());
    camera.lookAt(p.x + l.x, p.y + l.y, p.z + l.z);
  }

  function tick(dt) {
    tickCamera(camera, getPlayer(), state, getIslandId(), dt, tmp);
  }

  return {
    tick,
    snap,
    getState: () => state,
  };
}
