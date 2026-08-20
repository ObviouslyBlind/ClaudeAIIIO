import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  CART_FOOTPRINT_M,
  PLACE_GHOST_OK,
  footprintInRing,
  ghostFitsPlot,
  isPlaceRotateKey,
} from "../public/harbour/place-pose.js";
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
  it("draws a green outline and yaws while the rotate action is held", () => {
    const scene = new THREE.Scene();
    const ghost = createPlacePreview(scene);
    ghost.show("cart");
    ghost.moveTo(3.6, 1, 1.3, { class: "cart_pad", ring: padRing, x: 3.6, z: 1.3 });
    const line = scene.getObjectByName("place-ghost");
    expect(line).toBeTruthy();
    expect((line.material.color.getHex() as number)).toBe(PLACE_GHOST_OK);
    expect(ghost.pose().ok).toBe(true);
    ghost.onKeyDown({ code: "KeyR", key: "r", target: { tagName: "BODY" }, preventDefault() {} });
    ghost.tick(1);
    expect(ghost.yaw()).toBeGreaterThan(1);
    ghost.hide();
    expect(line.visible).toBe(false);
  });
});
