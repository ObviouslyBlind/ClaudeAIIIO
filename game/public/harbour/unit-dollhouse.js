import * as THREE from "three";
import {
  cameraNearForRadius,
  handleOrbitPointer,
  RMB,
  sphericalToCartesian,
} from "./camera.js";
import { GAP, ROOM_H, roomWorldPose } from "./unit-blocks.js";

/**
 * Unit dollhouse camera. Orbits the floor box — not the player, not interior.js.
 * Tilted 3D, RMB-hold 360, wheel zoom. No WASD. No left-click hop.
 */

export const DOLLHOUSE_PITCH = 0.72;
export const DOLLHOUSE_RADIUS_M = 16;
export const DOLLHOUSE_ZOOM_MIN_M = 8;
export const DOLLHOUSE_ZOOM_MAX_M = 36;

export function dollhouseZoomRadius(radius, deltaY) {
  const next = radius * Math.exp((deltaY || 0) * 0.0011);
  return Math.max(DOLLHOUSE_ZOOM_MIN_M, Math.min(DOLLHOUSE_ZOOM_MAX_M, next));
}

export const DOLLHOUSE_ROOM_RADIUS_M = 11;

export function floorTarget(building, floor, heightAt) {
  const x = Number(building && building.x) || 0;
  const z = Number(building && building.z) || 0;
  const f = Number(floor) || 0;
  let y0 = 0;
  if (typeof heightAt === "function") {
    const y = Number(heightAt(x, z));
    if (Number.isFinite(y)) y0 = y;
  }
  return {
    x,
    y: y0 + f * (ROOM_H + GAP) + ROOM_H * 0.42,
    z,
    buildingId: building && building.id,
    floor: f,
    unitId: "",
  };
}

export function roomTarget(building, room, heightAt) {
  if (!building || !room) return floorTarget(building, room && room.floor, heightAt);
  const pose = roomWorldPose(building, room, heightAt);
  return {
    x: pose.x,
    y: pose.y,
    z: pose.z,
    buildingId: pose.buildingId,
    floor: pose.floor,
    unitId: pose.unitId || room.id,
  };
}

export function createDollhouseOrbit(building) {
  return {
    yaw: (Number(building && building.yaw) || 0) + 0.95,
    pitch: DOLLHOUSE_PITCH,
    radius: DOLLHOUSE_RADIUS_M,
    dragging: false,
    orbited: true,
    lastX: 0,
    lastY: 0,
  };
}

function applyZoomNear(camera, radius) {
  const near = cameraNearForRadius(radius);
  if (!camera || Math.abs(camera.near - near) < 0.02) return;
  camera.near = near;
  camera.updateProjectionMatrix();
}

/** Orbit around a floor target. Not the player. */
export function tickDollhouse(camera, target, state, dt, tmp) {
  if (!camera || !target || !state || !tmp) return;
  const follow = 1 - Math.pow(0.001, dt || 0);
  applyZoomNear(camera, state.radius);
  const o = sphericalToCartesian(state);
  tmp.set(target.x + o.x, target.y + o.y, target.z + o.z);
  if (state.dragging || follow >= 1) camera.position.copy(tmp);
  else camera.position.lerp(tmp, follow);
  camera.lookAt(target.x, target.y, target.z);
}

/**
 * Custom RMB-hold orbit around the open floor. Paused harbour follow must
 * sit beside this — do not reuse createPlayCamera's player look-at.
 */
export function createDollhouseCamera({ camera, canvas }) {
  const tmp = new THREE.Vector3();
  let active = false;
  let locked = false;
  let target = null;
  let state = createDollhouseOrbit(null);

  function onDown(ev) {
    if (!active) return;
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
    if (!active || !state.dragging) return;
    if (ev.pointerType === "touch") return;
    state = handleOrbitPointer(state, {
      type: "move",
      pointerType: ev.pointerType,
      clientX: ev.clientX,
      clientY: ev.clientY,
    });
  }

  function onUp(ev) {
    if (!active) return;
    if (ev.button !== RMB) return;
    state = handleOrbitPointer(state, {
      type: "up",
      button: ev.button,
      pointerType: ev.pointerType,
    });
  }

  function onMenu(ev) {
    if (!active) return;
    ev.preventDefault();
  }

  function onWheel(ev) {
    if (!active) return;
    ev.preventDefault();
    state = { ...state, radius: dollhouseZoomRadius(state.radius, ev.deltaY), orbited: true };
  }

  if (canvas) {
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    canvas.addEventListener("contextmenu", onMenu);
    canvas.addEventListener("wheel", onWheel, { passive: false });
  }

  return {
    enter(building, floor, heightAt, room, lock) {
      const next = room ? roomTarget(building, room, heightAt) : floorTarget(building, floor, heightAt);
      const same =
        active &&
        target &&
        target.buildingId === next.buildingId &&
        (target.unitId || "") === (next.unitId || "");
      target = next;
      if (!same) {
        state = createDollhouseOrbit(building);
        if (room) state.radius = DOLLHOUSE_ROOM_RADIUS_M;
      }
      active = true;
      if (lock) locked = true;
      tickDollhouse(camera, target, { ...state, dragging: true }, 1, tmp);
    },
    exit(force) {
      if (locked && !force) return false;
      locked = false;
      active = false;
      target = null;
      if (state.dragging) state = { ...state, dragging: false };
      return true;
    },
    unlock() {
      locked = false;
    },
    isActive: () => active,
    isLocked: () => locked,
    getState: () => state,
    getTarget: () => target,
    tick(dt) {
      if (!active || !target) return;
      tickDollhouse(camera, target, state, dt, tmp);
    },
  };
}
