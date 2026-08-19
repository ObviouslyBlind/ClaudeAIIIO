import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  HOTDOG_CART_MESH_COUNT,
  detachVendor,
  dressCart,
  makeCrate,
  makeHotdogCart,
  makeVendor,
} from "../public/harbour/cart.js";
import { dressPlayer } from "../public/harbour/player.js";

function meshCount(root: THREE.Object3D) {
  let n = 0;
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) n += 1;
  });
  return n;
}

describe("street cart (kerb stall, not a handheld wagon)", () => {
  it("builds a counter-height stall with an umbrella under ~2.2 m", () => {
    const cart = makeHotdogCart();
    expect(cart.userData.kind).toBe("street-cart");
    expect(cart.userData.cartKind).toBe("fruit");
    expect(meshCount(cart)).toBe(HOTDOG_CART_MESH_COUNT);
    let maxY = 0;
    cart.traverse((obj) => {
      if (!(obj as THREE.Mesh).isMesh) return;
      obj.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(obj);
      if (box.max.y > maxY) maxY = box.max.y;
    });
    expect(maxY).toBeGreaterThan(2);
    expect(maxY).toBeLessThan(2.4);
  });

  it("does not parent a wagon on the player", () => {
    const player = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.55, 1.15, 4, 8),
      new THREE.MeshLambertMaterial({ color: 0xf2d2a8 }),
    );
    dressPlayer(player);
    const before = player.children.length;
    dressCart(player);
    expect(player.children.length).toBe(before);
    expect(player.getObjectByName("paper-cart")).toBeUndefined();
  });

  it("builds a delivery crate", () => {
    const crate = makeCrate();
    expect(crate.userData.kind).toBe("crate");
    expect(meshCount(crate)).toBeGreaterThan(1);
  });

  it("detaches a hired vendor from the cart", () => {
    const cart = makeHotdogCart();
    const vendor = makeVendor();
    vendor.position.set(1.05, 0, 0.15);
    cart.add(vendor);
    expect(cart.getObjectByName("vendor")).toBeTruthy();
    expect(detachVendor(cart)).toBe(true);
    expect(cart.getObjectByName("vendor")).toBeUndefined();
    expect(detachVendor(cart)).toBe(false);
  });

  it("builds a hired vendor under door height", () => {
    const vendor = makeVendor();
    expect(vendor.userData.kind).toBe("vendor");
    const shirt = vendor.children.find((c) => c.userData && c.userData.part === "shirt") as THREE.Mesh;
    expect((shirt.material as THREE.MeshLambertMaterial).color.getHex()).toBe(0x2f7a8a);
    let maxY = 0;
    vendor.traverse((obj) => {
      if (!(obj as THREE.Mesh).isMesh) return;
      obj.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(obj);
      if (box.max.y > maxY) maxY = box.max.y;
    });
    expect(maxY).toBeGreaterThan(1.5);
    expect(maxY).toBeLessThan(2.2);
  });
});
