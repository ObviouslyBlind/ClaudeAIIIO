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

describe("player PAPER figure", () => {
  it("wears one kraft belt buckle on the visitor mesh", () => {
    const player = makePlayer();
    const figure = player.getObjectByName("paper-figure")!;
    const p = parts(figure);
    expect(p.filter((k) => k === "buckle").length).toBe(1);
    expect(p).toContain("belt");
    expect(p).toContain("hat");
    expect(p).toContain("satchel");
    const buckle = figure.children.find((c) => c.userData.part === "buckle") as THREE.Mesh;
    expect(buckle.geometry.type).toBe("BoxGeometry");
    expect((buckle.material as THREE.MeshLambertMaterial).color.getHex()).toBe(0xc4b496);
  });
});

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
    expect(CART_MESH_COUNT).toBe(26);

    const p = parts(cart);
    expect(p).toContain("bed");
    expect(p.filter((k) => k === "wheel").length).toBe(2);
    expect(p.filter((k) => k === "hub").length).toBe(2);
    expect(p.filter((k) => k === "handle").length).toBe(2);
    expect(p).toContain("grip");
    expect(p.filter((k) => k === "pin").length).toBe(1);
    expect(p.filter((k) => k === "crate").length).toBe(2);
    expect(p.filter((k) => k === "strap").length).toBe(1);
    expect(p.filter((k) => k === "roll").length).toBe(1);
    expect(p.filter((k) => k === "coil").length).toBe(2);
    expect(p.filter((k) => k === "lantern").length).toBe(2);
    expect(p.filter((k) => k === "jug").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "apple").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "side").length).toBe(2);
    expect(p.filter((k) => k === "end").length).toBe(2);

    const wheels = cart.children.filter((c) => c.userData.part === "wheel") as THREE.Mesh[];
    expect(wheels.every((w) => w.geometry.type === "CylinderGeometry")).toBe(true);
    const hubs = cart.children.filter((c) => c.userData.part === "hub") as THREE.Mesh[];
    expect(hubs.every((h) => h.geometry.type === "BoxGeometry")).toBe(true);
    expect(hubs.every((h) => (h.material as THREE.MeshLambertMaterial).color.getHex() === 0xc4b496)).toBe(true);
    const pin = cart.children.find((c) => c.userData.part === "pin") as THREE.Mesh;
    expect(pin.geometry.type).toBe("BoxGeometry");
    const pinHex = (pin.material as THREE.MeshLambertMaterial).color.getHex();
    expect([0x8a6238, 0x6a4a2a, 0x5a3a22, 0x3d2a1c, 0xc4b496]).toContain(pinHex);
    const roll = cart.children.find((c) => c.userData.part === "roll") as THREE.Mesh;
    expect(roll.geometry.type).toBe("CylinderGeometry");
    const lanterns = cart.children.filter((c) => c.userData.part === "lantern") as THREE.Mesh[];
    expect(lanterns.every((l) => l.geometry.type === "BoxGeometry")).toBe(true);
    expect(lanterns.map((l) => (l.material as THREE.MeshLambertMaterial).color.getHex()).sort()).toEqual(
      [0x8a6238, 0xf4ead8].sort(),
    );

    const colors = hexes(cart);
    expect(colors).toContain(0x8a6238);
    expect(colors).toContain(0x7a5230);
    expect(colors).toContain(0x9a6a40);
    expect(colors).toContain(0xc4b496);
    expect(colors).toContain(0xf4ead8);
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
    expect(lanterns.every((l) => l.position.y > bed.position.y)).toBe(true);
    const jugs = cart.children.filter((c) => c.userData.part === "jug") as THREE.Mesh[];
    expect(jugs.length).toBeGreaterThanOrEqual(1);
    expect(jugs.every((j) => j.geometry.type === "BoxGeometry" || j.geometry.type === "CylinderGeometry")).toBe(true);
    expect(jugs.every((j) => j.position.y > bed.position.y)).toBe(true);
    const occupied = cart.children.filter((c) =>
      ["crate", "roll", "coil", "lantern"].includes(c.userData.part as string),
    );
    expect(
      jugs.every((j) =>
        occupied.every((o) => Math.hypot(j.position.x - o.position.x, j.position.z - o.position.z) > 0.12),
      ),
    ).toBe(true);
    const apples = cart.children.filter((c) => c.userData.part === "apple") as THREE.Mesh[];
    expect(apples.length).toBeGreaterThanOrEqual(1);
    expect(apples.every((a) => a.geometry.type === "BoxGeometry")).toBe(true);
    expect(apples.every((a) => a.position.y > bed.position.y)).toBe(true);
    const appleHexes = apples.map((a) => (a.material as THREE.MeshLambertMaterial).color.getHex());
    expect(appleHexes.every((h) => h === 0x9a6a40 || h === 0xc4b496)).toBe(true);
    const appleOccupied = cart.children.filter((c) =>
      ["crate", "roll", "coil", "lantern", "jug"].includes(c.userData.part as string),
    );
    expect(
      apples.every((a) =>
        appleOccupied.every((o) => Math.hypot(a.position.x - o.position.x, a.position.z - o.position.z) > 0.12),
      ),
    ).toBe(true);
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
