import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { CART_MESH_COUNT, dressCart } from "../public/harbour/cart.js";
import { dressPlayer } from "../public/harbour/player.js";

function hexes(root: THREE.Object3D) {
  const colors: number[] = [];
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    const mat = mesh.material as THREE.MeshLambertMaterial | THREE.MeshLambertMaterial[] | undefined;
    if (!mat) return;
    const list = Array.isArray(mat) ? mat : [mat];
    for (const m of list) if (m.color) colors.push(m.color.getHex());
  });
  return colors;
}

function isGrey(hex: number) {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  return Math.max(r, g, b) - Math.min(r, g, b) < 18;
}

function parts(root: THREE.Object3D) {
  const out: string[] = [];
  root.traverse((obj) => {
    if (obj.userData?.part) out.push(obj.userData.part);
  });
  return out;
}

function meshCount(root: THREE.Object3D) {
  let n = 0;
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) n += 1;
  });
  return n;
}

function makePlayer() {
  const player = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.55, 1.15, 4, 8),
    new THREE.MeshLambertMaterial({ color: 0xf2d2a8 }),
  );
  player.position.set(12, 3.4, -6950);
  dressPlayer(player);
  return player;
}

describe("player PAPER handcart", () => {
  it("parents a cart on the player mesh without moving position or replacing the person", () => {
    const player = makePlayer();
    const before = player.position.clone();
    const figure = player.getObjectByName("paper-figure");
    expect(figure).toBeTruthy();
    expect(player.children.length).toBe(1);

    dressCart(player);

    expect(player.position.x).toBe(before.x);
    expect(player.position.y).toBe(before.y);
    expect(player.position.z).toBe(before.z);
    expect(player.getObjectByName("paper-figure")).toBe(figure);
    const cart = player.getObjectByName("paper-cart");
    expect(cart).toBeTruthy();
    expect(cart!.parent).toBe(player);
    expect(cart!.userData.mode).toBe("PAPER");
    expect(cart!.userData.kind).toBe("cart");
    expect(player.userData.cart).toBe(true);
    expect(player.children.length).toBe(2);
  });

  it("builds a crate bed, two wheels, and handles in harbour crate wood", () => {
    const player = makePlayer();
    dressCart(player);
    const cart = player.getObjectByName("paper-cart")!;
    expect(cart.children.length).toBe(CART_MESH_COUNT);
    expect(meshCount(cart)).toBe(CART_MESH_COUNT);
    expect(CART_MESH_COUNT).toBe(12);

    const p = parts(cart);
    expect(p).toContain("bed");
    expect(p.filter((k) => k === "wheel").length).toBe(2);
    expect(p.filter((k) => k === "handle").length).toBe(2);
    expect(p).toContain("grip");
    expect(p.filter((k) => k === "crate").length).toBe(1);
    expect(p.filter((k) => k === "roll").length).toBe(1);
    expect(p.filter((k) => k === "side").length).toBe(2);
    expect(p.filter((k) => k === "end").length).toBe(2);

    const wheels = cart.children.filter((c) => c.userData.part === "wheel") as THREE.Mesh[];
    expect(wheels.every((w) => w.geometry.type === "CylinderGeometry")).toBe(true);
    const roll = cart.children.find((c) => c.userData.part === "roll") as THREE.Mesh;
    expect(roll.geometry.type).toBe("CylinderGeometry");

    const colors = hexes(cart);
    expect(colors).toContain(0x8a6238);
    expect(colors).toContain(0x7a5230);
    expect(colors).toContain(0x9a6a40);
    expect(colors).toContain(0xc4b496);
    expect(colors.every(isGrey)).toBe(false);

    expect(cart.position.y).toBeCloseTo(-1.15, 5);
    expect(cart.position.z).toBe(0);
    const bed = cart.children.find((c) => c.userData.part === "bed")!;
    expect(bed.position.z).toBeLessThan(-0.5);
    const grip = cart.children.find((c) => c.userData.part === "grip")!;
    expect(grip.position.z).toBeGreaterThan(bed.position.z);
    expect(grip.position.z).toBeLessThan(0);
    const crate = cart.children.find((c) => c.userData.part === "crate")!;
    expect(crate.position.y).toBeGreaterThan(bed.position.y);
    expect(roll.position.y).toBeGreaterThan(bed.position.y);
    expect(crate.position.z).toBeLessThan(bed.position.z + 0.5);
    expect(crate.position.z).toBeGreaterThan(bed.position.z - 0.5);
  });

  it("is idempotent and never writes player.position", () => {
    const player = makePlayer();
    player.position.set(1, 2, 3);
    dressCart(player);
    dressCart(player);
    expect(player.position.x).toBe(1);
    expect(player.position.y).toBe(2);
    expect(player.position.z).toBe(3);
    expect(player.children.filter((c) => c.name === "paper-cart").length).toBe(1);
    expect(meshCount(player.getObjectByName("paper-cart")!)).toBe(CART_MESH_COUNT);
  });
});
