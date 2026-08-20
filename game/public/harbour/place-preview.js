/**
 * Green cart ghost: the real stall mesh, unlit green, hovering above the pad.
 * Hold R to rotate. Sim still owns the place. PAPER / SIMULATED.
 */

import * as THREE from "three";
import { makeStreetCart } from "./cart.js";
import {
  BUILDING_FOOTPRINT_M,
  CART_FOOTPRINT_M,
  PLACE_GHOST_BAD,
  PLACE_GHOST_OK,
  PLACE_ROTATE_RAD_PER_S,
  ghostFitsPlot,
  isPlaceRotateKey,
} from "./place-pose.js";

/** Parcel fill sits at +0.35 m. Ghost cart floats clear of that square. */
export const PLACE_GHOST_LIFT_M = 0.88;

function skipRaycast(mesh) {
  mesh.raycast = () => {};
}

function paintMats(root, hex) {
  root.traverse((obj) => {
    if (obj.material && obj.material.color) obj.material.color.setHex(hex);
  });
}

function disposeTree(obj) {
  const seenGeo = new Set();
  const seenMat = new Set();
  obj.traverse((child) => {
    if (child.geometry && !seenGeo.has(child.geometry)) {
      seenGeo.add(child.geometry);
      child.geometry.dispose();
    }
    const mats = child.material ? [].concat(child.material) : [];
    for (const m of mats) {
      if (m && m.dispose && !seenMat.has(m)) {
        seenMat.add(m);
        m.dispose();
      }
    }
  });
}

function ghostMat(hex, opacity) {
  return new THREE.MeshBasicMaterial({
    color: hex,
    transparent: true,
    opacity,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

function edgeMat(hex) {
  return new THREE.LineBasicMaterial({
    color: hex,
    transparent: true,
    opacity: 1,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

function lightUpCart(cart, hex) {
  cart.name = "place-ghost-cart";
  cart.position.y = PLACE_GHOST_LIFT_M;
  cart.scale.setScalar(1.12);
  cart.frustumCulled = false;
  cart.traverse((obj) => {
    if (!obj.isMesh || !obj.geometry) return;
    skipRaycast(obj);
    obj.castShadow = false;
    obj.receiveShadow = false;
    obj.frustumCulled = false;
    obj.renderOrder = 20;
    const canopy = obj.userData && obj.userData.part === "umbrella";
    obj.material = ghostMat(hex, canopy ? 0.14 : 0.72);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(obj.geometry, 1), edgeMat(hex));
    edges.name = "place-ghost-edge";
    edges.renderOrder = 21;
    edges.frustumCulled = false;
    skipRaycast(edges);
    obj.add(edges);
  });
  return cart;
}

function cartKindFrom(next) {
  if (next === "melon_cart" || next === "watermelon") return "watermelon";
  if (next === "fish_cart" || next === "fish_chips") return "fish_chips";
  return "fruit";
}

function makeFootprint(w, d, hex) {
  const g = new THREE.Group();
  g.name = "place-ghost-building";
  const fillMat = ghostMat(hex, 0.42);
  const railMat = ghostMat(hex, 0.95);
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(w, d), fillMat);
  fill.rotation.x = -Math.PI / 2;
  fill.position.y = PLACE_GHOST_LIFT_M;
  fill.renderOrder = 19;
  fill.name = "place-ghost-fill";
  skipRaycast(fill);
  g.add(fill);
  function rail(len, x, z, yaw) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, 0.08), railMat.clone());
    m.position.set(x, PLACE_GHOST_LIFT_M + 0.06, z);
    m.rotation.y = yaw;
    m.renderOrder = 20;
    skipRaycast(m);
    g.add(m);
  }
  rail(w + 0.08, 0, -d / 2, 0);
  rail(w + 0.08, 0, d / 2, 0);
  rail(d + 0.08, -w / 2, 0, Math.PI / 2);
  rail(d + 0.08, w / 2, 0, Math.PI / 2);
  return g;
}

export function createPlacePreview(scene) {
  const root = new THREE.Group();
  root.name = "place-ghost";
  root.userData.kind = "place-ghost";
  root.userData.mode = "PAPER";
  root.visible = false;
  root.frustumCulled = false;
  root.renderOrder = 20;
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
      disposeTree(body);
    }
    const hex = last.ok ? PLACE_GHOST_OK : PLACE_GHOST_BAD;
    if (kind === "building") {
      const s = BUILDING_FOOTPRINT_M;
      body = makeFootprint(s.w, s.d, hex);
    } else {
      body = lightUpCart(makeStreetCart(cartKindFrom(kind)), hex);
    }
    root.add(body);
  }

  function setKind(next) {
    const k = next === "building" ? "building" : next || "cart";
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
