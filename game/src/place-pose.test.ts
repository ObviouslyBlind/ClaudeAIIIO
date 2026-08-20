import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  CART_FOOTPRINT_M,
  PLACE_GHOST_OK,
  SNAP_PAD_M,
  footprintInRing,
  ghostFitsPlot,
  isPlaceRotateKey,
  snapPlacePose,
} from "../public/harbour/place-pose.js";
import { STREET_CART_MESH_COUNT } from "../public/harbour/cart.js";
import { createPlacePreview } from "../public/harbour/place-preview.js";

const padRing = [
  [0, 0],
  [7.2, 0],
  [7.2, 2.6],
  [0, 2.6],
];

describe("place pose", () => {
  it("maps KeyR to the place-rotate action", () => {
    expect(isPlaceRotateKey({ code: "KeyR", key: "r" })).toBe(true);
    expect(isPlaceRotateKey({ code: "KeyR", key: "R" })).toBe(true);
    expect(isPlaceRotateKey({ code: "KeyW", key: "w" })).toBe(false);
  });

  it("fits a cart in the middle of a rectangular pad, not on a corner", () => {
    expect(footprintInRing(3.6, 1.3, 0, CART_FOOTPRINT_M.w, CART_FOOTPRINT_M.d, padRing)).toBe(true);
    expect(footprintInRing(0.1, 0.1, 0, CART_FOOTPRINT_M.w, CART_FOOTPRINT_M.d, padRing)).toBe(false);
    expect(
      ghostFitsPlot(3.6, 1.3, 0, CART_FOOTPRINT_M.w, CART_FOOTPRINT_M.d, {
        class: "cart_pad",
        ring: padRing,
        x: 3.6,
        z: 1.3,
      }),
    ).toBe(true);
    expect(
      ghostFitsPlot(40, 40, 0, CART_FOOTPRINT_M.w, CART_FOOTPRINT_M.d, {
        class: "cart_pad",
        ring: padRing,
        x: 3.6,
        z: 1.3,
      }),
    ).toBe(false);
    const snapped = snapPlacePose(5.2, 1.3, 0, CART_FOOTPRINT_M.w, CART_FOOTPRINT_M.d, {
      class: "cart_pad",
      ring: padRing,
      x: 3.6,
      z: 1.3,
    });
    expect(snapped.ok).toBe(true);
    expect(footprintInRing(snapped.x, snapped.z, 0, CART_FOOTPRINT_M.w, CART_FOOTPRINT_M.d, padRing)).toBe(true);
    const far = snapPlacePose(40, 40, 0, CART_FOOTPRINT_M.w, CART_FOOTPRINT_M.d, {
      class: "cart_pad",
      ring: padRing,
      x: 3.6,
      z: 1.3,
    });
    expect(far.ok).toBe(false);
    expect(SNAP_PAD_M).toBeGreaterThan(4);
  });

  it("lets a street lot stay green on the verge corridor", () => {
    expect(
      ghostFitsPlot(10, 0, 0, CART_FOOTPRINT_M.w, CART_FOOTPRINT_M.d, {
        class: "by_right",
        ring: padRing,
        x: 0,
        z: 0,
      }),
    ).toBe(true);
  });
});

describe("place ghost", () => {
  it("draws the green street-cart mesh above the pad and yaws while rotate is held", () => {
    const scene = new THREE.Scene();
    const ghost = createPlacePreview(scene);
    ghost.show("cart");
    ghost.moveTo(3.6, 1, 1.3, { class: "cart_pad", ring: padRing, x: 3.6, z: 1.3 });
    const root = scene.getObjectByName("place-ghost");
    expect(root).toBeTruthy();
    const cart = scene.getObjectByName("place-ghost-cart");
    expect(cart).toBeTruthy();
    expect(cart.position.y).toBeGreaterThan(0.4);
    expect(scene.getObjectByName("place-ghost-fill")).toBeFalsy();
    let meshes = 0;
    let edges = 0;
    cart.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) meshes += 1;
      if (obj.name === "place-ghost-edge") edges += 1;
    });
    expect(meshes).toBe(STREET_CART_MESH_COUNT);
    expect(edges).toBeGreaterThanOrEqual(STREET_CART_MESH_COUNT);
    const body = cart.children.find((c) => c.userData && c.userData.part === "body") as THREE.Mesh;
    expect(body).toBeTruthy();
    expect((body.material as THREE.MeshBasicMaterial).color.getHex()).toBe(PLACE_GHOST_OK);
    expect(ghost.pose().ok).toBe(true);
    ghost.onKeyDown({ code: "KeyR", key: "r", target: { tagName: "BODY" }, preventDefault() {} });
    ghost.tick(1);
    expect(ghost.yaw()).toBeGreaterThan(1);
    ghost.hide();
    expect(root.visible).toBe(false);
  });
});
