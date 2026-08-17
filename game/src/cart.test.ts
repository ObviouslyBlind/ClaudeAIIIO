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
    expect(CART_MESH_COUNT).toBe(45);

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
    expect(p.filter((k) => k === "carrot").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "potato").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "onion").length).toBeGreaterThanOrEqual(1);
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
    const carrots = cart.children.filter((c) => c.userData.part === "carrot") as THREE.Mesh[];
    expect(carrots.length).toBeGreaterThanOrEqual(1);
    expect(carrots.every((c) => c.geometry.type === "BoxGeometry")).toBe(true);
    expect(carrots.every((c) => c.position.y > bed.position.y)).toBe(true);
    const carrotHexes = carrots.map((c) => (c.material as THREE.MeshLambertMaterial).color.getHex());
    expect(carrotHexes.every((h) => h === 0x8a6238 || h === 0x9a6a40 || h === 0xc4b496)).toBe(true);
    for (const c of carrots) {
      const { width, height, depth } = (c.geometry as THREE.BoxGeometry).parameters;
      expect(width).toBeLessThan(0.12);
      expect(height).toBeLessThan(0.12);
      expect(depth).toBeLessThan(0.16);
    }
    const carrotOccupied = cart.children.filter((c) =>
      ["crate", "apple", "lantern", "jug"].includes(c.userData.part as string),
    );
    expect(
      carrots.every((c) =>
        carrotOccupied.every((o) => Math.hypot(c.position.x - o.position.x, c.position.z - o.position.z) > 0.12),
      ),
    ).toBe(true);
    const potatoes = cart.children.filter((c) => c.userData.part === "potato") as THREE.Mesh[];
    expect(potatoes.length).toBeGreaterThanOrEqual(1);
    expect(potatoes.every((t) => t.geometry.type === "BoxGeometry")).toBe(true);
    expect(potatoes.every((t) => t.position.y > bed.position.y)).toBe(true);
    const potatoHexes = potatoes.map((t) => (t.material as THREE.MeshLambertMaterial).color.getHex());
    expect(potatoHexes.every((h) => h === 0x8a6238 || h === 0x7a5230 || h === 0x9a6a40 || h === 0xc4b496)).toBe(true);
    for (const t of potatoes) {
      const { width, height, depth } = (t.geometry as THREE.BoxGeometry).parameters;
      expect(width).toBeLessThan(0.12);
      expect(height).toBeLessThan(0.12);
      expect(depth).toBeLessThan(0.12);
    }
    const potatoOccupied = cart.children.filter((c) =>
      ["carrot", "apple", "crate", "roll", "coil", "lantern", "jug"].includes(c.userData.part as string),
    );
    expect(
      potatoes.every((t) =>
        potatoOccupied.every((o) => Math.hypot(t.position.x - o.position.x, t.position.z - o.position.z) > 0.12),
      ),
    ).toBe(true);
    expect(p.filter((k) => k === "carrot").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "apple").length).toBeGreaterThanOrEqual(1);
    const onions = cart.children.filter((c) => c.userData.part === "onion") as THREE.Mesh[];
    expect(onions.length).toBeGreaterThanOrEqual(1);
    expect(onions.every((o) => o.geometry.type === "BoxGeometry")).toBe(true);
    expect(onions.every((o) => o.position.y > bed.position.y)).toBe(true);
    const onionHexes = onions.map((o) => (o.material as THREE.MeshLambertMaterial).color.getHex());
    expect(onionHexes.every((h) => h === 0x8a6238 || h === 0x7a5230 || h === 0x9a6a40 || h === 0xc4b496)).toBe(true);
    for (const o of onions) {
      const { width, height, depth } = (o.geometry as THREE.BoxGeometry).parameters;
      expect(width).toBeLessThan(0.12);
      expect(height).toBeLessThan(0.12);
      expect(depth).toBeLessThan(0.12);
    }
    const onionOccupied = cart.children.filter((c) =>
      ["potato", "carrot", "apple", "jug", "lantern"].includes(c.userData.part as string),
    );
    expect(
      onions.every((o) =>
        onionOccupied.every((x) => Math.hypot(o.position.x - x.position.x, o.position.z - x.position.z) > 0.12),
      ),
    ).toBe(true);
    expect(p.filter((k) => k === "potato").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "carrot").length).toBeGreaterThanOrEqual(1);
  });

  it("puts one tiny kraft PAPER garlic on the cart bed; onion and potato remain", () => {
    const player = makePlayer();
    dressCart(player);
    const cart = player.getObjectByName("paper-cart")!;
    const p = parts(cart);
    expect(p.filter((k) => k === "garlic").length).toBe(1);
    expect(p.filter((k) => k === "onion").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "potato").length).toBeGreaterThanOrEqual(1);

    const garlic = cart.children.find((c) => c.userData.part === "garlic") as THREE.Mesh;
    const onion = cart.children.find((c) => c.userData.part === "onion") as THREE.Mesh;
    const potato = cart.children.find((c) => c.userData.part === "potato") as THREE.Mesh;
    const carrot = cart.children.find((c) => c.userData.part === "carrot") as THREE.Mesh;
    const apple = cart.children.find((c) => c.userData.part === "apple") as THREE.Mesh;
    const bed = cart.children.find((c) => c.userData.part === "bed")!;
    expect(garlic.geometry.type).toBe("BoxGeometry");
    expect(garlic.position.y).toBeGreaterThan(bed.position.y);
    expect(Math.hypot(garlic.position.x - onion.position.x, garlic.position.z - onion.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(garlic.position.x - potato.position.x, garlic.position.z - potato.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(garlic.position.x - carrot.position.x, garlic.position.z - carrot.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(garlic.position.x - apple.position.x, garlic.position.z - apple.position.z)).toBeGreaterThan(0.12);
    const hex = (garlic.material as THREE.MeshLambertMaterial).color.getHex();
    expect([0x8a6238, 0x7a5230, 0x9a6a40, 0xc4b496, 0xf4ead8]).toContain(hex);
    expect(isGrey(hex)).toBe(false);
    const { width, height, depth } = (garlic.geometry as THREE.BoxGeometry).parameters;
    expect(width).toBeLessThan(0.12);
    expect(height).toBeLessThan(0.12);
    expect(depth).toBeLessThan(0.12);
  });

  it("puts one tiny kraft PAPER cabbage on the cart bed; garlic, onion, potato, carrot, apple remain", () => {
    const player = makePlayer();
    dressCart(player);
    const cart = player.getObjectByName("paper-cart")!;
    const p = parts(cart);
    expect(p.filter((k) => k === "cabbage").length).toBe(1);
    expect(p.filter((k) => k === "garlic").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "onion").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "potato").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "carrot").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "apple").length).toBeGreaterThanOrEqual(1);

    const cabbage = cart.children.find((c) => c.userData.part === "cabbage") as THREE.Mesh;
    const garlic = cart.children.find((c) => c.userData.part === "garlic") as THREE.Mesh;
    const onion = cart.children.find((c) => c.userData.part === "onion") as THREE.Mesh;
    const potato = cart.children.find((c) => c.userData.part === "potato") as THREE.Mesh;
    const carrot = cart.children.find((c) => c.userData.part === "carrot") as THREE.Mesh;
    const apple = cart.children.find((c) => c.userData.part === "apple") as THREE.Mesh;
    const bed = cart.children.find((c) => c.userData.part === "bed")!;
    expect(cabbage.userData.mode).toBe("PAPER");
    expect(cabbage.geometry.type).toBe("BoxGeometry");
    expect(cabbage.position.y).toBeGreaterThan(bed.position.y);
    expect(Math.hypot(cabbage.position.x - garlic.position.x, cabbage.position.z - garlic.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(cabbage.position.x - onion.position.x, cabbage.position.z - onion.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(cabbage.position.x - potato.position.x, cabbage.position.z - potato.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(cabbage.position.x - carrot.position.x, cabbage.position.z - carrot.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(cabbage.position.x - apple.position.x, cabbage.position.z - apple.position.z)).toBeGreaterThan(0.12);
    const hex = (cabbage.material as THREE.MeshLambertMaterial).color.getHex();
    expect([0x8a6238, 0x7a5230, 0x9a6a40, 0xc4b496, 0xf4ead8]).toContain(hex);
    expect(isGrey(hex)).toBe(false);
    const { width, height, depth } = (cabbage.geometry as THREE.BoxGeometry).parameters;
    expect(width).toBeLessThan(0.12);
    expect(height).toBeLessThan(0.12);
    expect(depth).toBeLessThan(0.12);
  });

  it("puts one tiny kraft PAPER leek on the cart bed; cabbage, garlic, onion, potato, carrot, apple remain", () => {
    const player = makePlayer();
    dressCart(player);
    const cart = player.getObjectByName("paper-cart")!;
    const p = parts(cart);
    expect(p.filter((k) => k === "leek").length).toBe(1);
    expect(p.filter((k) => k === "cabbage").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "garlic").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "onion").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "potato").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "carrot").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "apple").length).toBeGreaterThanOrEqual(1);

    const leek = cart.children.find((c) => c.userData.part === "leek") as THREE.Mesh;
    const cabbage = cart.children.find((c) => c.userData.part === "cabbage") as THREE.Mesh;
    const garlic = cart.children.find((c) => c.userData.part === "garlic") as THREE.Mesh;
    const onion = cart.children.find((c) => c.userData.part === "onion") as THREE.Mesh;
    const potato = cart.children.find((c) => c.userData.part === "potato") as THREE.Mesh;
    const carrot = cart.children.find((c) => c.userData.part === "carrot") as THREE.Mesh;
    const apple = cart.children.find((c) => c.userData.part === "apple") as THREE.Mesh;
    const bed = cart.children.find((c) => c.userData.part === "bed")!;
    expect(leek.userData.mode).toBe("PAPER");
    expect(leek.geometry.type).toBe("BoxGeometry");
    expect(leek.position.y).toBeGreaterThan(bed.position.y);
    expect(Math.hypot(leek.position.x - cabbage.position.x, leek.position.z - cabbage.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(leek.position.x - garlic.position.x, leek.position.z - garlic.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(leek.position.x - onion.position.x, leek.position.z - onion.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(leek.position.x - potato.position.x, leek.position.z - potato.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(leek.position.x - carrot.position.x, leek.position.z - carrot.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(leek.position.x - apple.position.x, leek.position.z - apple.position.z)).toBeGreaterThan(0.12);
    const hex = (leek.material as THREE.MeshLambertMaterial).color.getHex();
    expect([0x8a6238, 0x7a5230, 0x9a6a40, 0xc4b496, 0xf4ead8]).toContain(hex);
    expect(isGrey(hex)).toBe(false);
    const { width, height, depth } = (leek.geometry as THREE.BoxGeometry).parameters;
    expect(width).toBeLessThan(0.12);
    expect(height).toBeLessThan(0.12);
    expect(depth).toBeLessThan(0.12);
  });

  it("puts one tiny kraft PAPER turnip on the cart bed; leek, cabbage, garlic, onion, potato, carrot, apple remain", () => {
    const player = makePlayer();
    dressCart(player);
    const cart = player.getObjectByName("paper-cart")!;
    const p = parts(cart);
    expect(p.filter((k) => k === "turnip").length).toBe(1);
    expect(p.filter((k) => k === "leek").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "cabbage").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "garlic").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "onion").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "potato").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "carrot").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "apple").length).toBeGreaterThanOrEqual(1);

    const turnip = cart.children.find((c) => c.userData.part === "turnip") as THREE.Mesh;
    const leek = cart.children.find((c) => c.userData.part === "leek") as THREE.Mesh;
    const cabbage = cart.children.find((c) => c.userData.part === "cabbage") as THREE.Mesh;
    const garlic = cart.children.find((c) => c.userData.part === "garlic") as THREE.Mesh;
    const onion = cart.children.find((c) => c.userData.part === "onion") as THREE.Mesh;
    const potato = cart.children.find((c) => c.userData.part === "potato") as THREE.Mesh;
    const carrot = cart.children.find((c) => c.userData.part === "carrot") as THREE.Mesh;
    const apple = cart.children.find((c) => c.userData.part === "apple") as THREE.Mesh;
    const bed = cart.children.find((c) => c.userData.part === "bed")!;
    expect(turnip.userData.mode).toBe("PAPER");
    expect(turnip.geometry.type).toBe("BoxGeometry");
    expect(turnip.position.y).toBeGreaterThan(bed.position.y);
    expect(Math.hypot(turnip.position.x - leek.position.x, turnip.position.z - leek.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(turnip.position.x - cabbage.position.x, turnip.position.z - cabbage.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(turnip.position.x - garlic.position.x, turnip.position.z - garlic.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(turnip.position.x - onion.position.x, turnip.position.z - onion.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(turnip.position.x - potato.position.x, turnip.position.z - potato.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(turnip.position.x - carrot.position.x, turnip.position.z - carrot.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(turnip.position.x - apple.position.x, turnip.position.z - apple.position.z)).toBeGreaterThan(0.12);
    const hex = (turnip.material as THREE.MeshLambertMaterial).color.getHex();
    expect([0x8a6238, 0x7a5230, 0x9a6a40, 0xc4b496, 0xf4ead8]).toContain(hex);
    expect(isGrey(hex)).toBe(false);
    const { width, height, depth } = (turnip.geometry as THREE.BoxGeometry).parameters;
    expect(width).toBeLessThan(0.12);
    expect(height).toBeLessThan(0.12);
    expect(depth).toBeLessThan(0.12);
  });

  it("puts one tiny kraft PAPER beet on the cart bed; turnip, leek, cabbage, garlic, onion, potato, carrot, apple remain", () => {
    const player = makePlayer();
    dressCart(player);
    const cart = player.getObjectByName("paper-cart")!;
    const p = parts(cart);
    expect(p.filter((k) => k === "beet").length).toBe(1);
    expect(p.filter((k) => k === "turnip").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "leek").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "cabbage").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "garlic").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "onion").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "potato").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "carrot").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "apple").length).toBeGreaterThanOrEqual(1);

    const beet = cart.children.find((c) => c.userData.part === "beet") as THREE.Mesh;
    const turnip = cart.children.find((c) => c.userData.part === "turnip") as THREE.Mesh;
    const leek = cart.children.find((c) => c.userData.part === "leek") as THREE.Mesh;
    const cabbage = cart.children.find((c) => c.userData.part === "cabbage") as THREE.Mesh;
    const garlic = cart.children.find((c) => c.userData.part === "garlic") as THREE.Mesh;
    const onion = cart.children.find((c) => c.userData.part === "onion") as THREE.Mesh;
    const potato = cart.children.find((c) => c.userData.part === "potato") as THREE.Mesh;
    const carrot = cart.children.find((c) => c.userData.part === "carrot") as THREE.Mesh;
    const apple = cart.children.find((c) => c.userData.part === "apple") as THREE.Mesh;
    const bed = cart.children.find((c) => c.userData.part === "bed")!;
    expect(beet.userData.mode).toBe("PAPER");
    expect(beet.geometry.type).toBe("BoxGeometry");
    expect(beet.position.y).toBeGreaterThan(bed.position.y);
    expect(Math.hypot(beet.position.x - turnip.position.x, beet.position.z - turnip.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(beet.position.x - leek.position.x, beet.position.z - leek.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(beet.position.x - cabbage.position.x, beet.position.z - cabbage.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(beet.position.x - garlic.position.x, beet.position.z - garlic.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(beet.position.x - onion.position.x, beet.position.z - onion.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(beet.position.x - potato.position.x, beet.position.z - potato.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(beet.position.x - carrot.position.x, beet.position.z - carrot.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(beet.position.x - apple.position.x, beet.position.z - apple.position.z)).toBeGreaterThan(0.12);
    const hex = (beet.material as THREE.MeshLambertMaterial).color.getHex();
    expect([0x8a6238, 0x7a5230, 0x9a6a40, 0xc4b496, 0xf4ead8]).toContain(hex);
    expect(isGrey(hex)).toBe(false);
    const { width, height, depth } = (beet.geometry as THREE.BoxGeometry).parameters;
    expect(width).toBeLessThan(0.12);
    expect(height).toBeLessThan(0.12);
    expect(depth).toBeLessThan(0.12);
  });

  it("puts one tiny kraft PAPER radish on the cart bed; beet, turnip, leek, cabbage, garlic, onion, potato, carrot, apple remain", () => {
    const player = makePlayer();
    dressCart(player);
    const cart = player.getObjectByName("paper-cart")!;
    const p = parts(cart);
    expect(p.filter((k) => k === "radish").length).toBe(1);
    expect(p.filter((k) => k === "beet").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "turnip").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "leek").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "cabbage").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "garlic").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "onion").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "potato").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "carrot").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "apple").length).toBeGreaterThanOrEqual(1);

    const radish = cart.children.find((c) => c.userData.part === "radish") as THREE.Mesh;
    const beet = cart.children.find((c) => c.userData.part === "beet") as THREE.Mesh;
    const turnip = cart.children.find((c) => c.userData.part === "turnip") as THREE.Mesh;
    const leek = cart.children.find((c) => c.userData.part === "leek") as THREE.Mesh;
    const cabbage = cart.children.find((c) => c.userData.part === "cabbage") as THREE.Mesh;
    const garlic = cart.children.find((c) => c.userData.part === "garlic") as THREE.Mesh;
    const onion = cart.children.find((c) => c.userData.part === "onion") as THREE.Mesh;
    const potato = cart.children.find((c) => c.userData.part === "potato") as THREE.Mesh;
    const carrot = cart.children.find((c) => c.userData.part === "carrot") as THREE.Mesh;
    const apple = cart.children.find((c) => c.userData.part === "apple") as THREE.Mesh;
    const bed = cart.children.find((c) => c.userData.part === "bed")!;
    expect(radish.userData.mode).toBe("PAPER");
    expect(radish.geometry.type).toBe("BoxGeometry");
    expect(radish.position.y).toBeGreaterThan(bed.position.y);
    expect(Math.hypot(radish.position.x - beet.position.x, radish.position.z - beet.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(radish.position.x - turnip.position.x, radish.position.z - turnip.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(radish.position.x - leek.position.x, radish.position.z - leek.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(radish.position.x - cabbage.position.x, radish.position.z - cabbage.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(radish.position.x - garlic.position.x, radish.position.z - garlic.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(radish.position.x - onion.position.x, radish.position.z - onion.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(radish.position.x - potato.position.x, radish.position.z - potato.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(radish.position.x - carrot.position.x, radish.position.z - carrot.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(radish.position.x - apple.position.x, radish.position.z - apple.position.z)).toBeGreaterThan(0.12);
    const hex = (radish.material as THREE.MeshLambertMaterial).color.getHex();
    expect([0x8a6238, 0x7a5230, 0x9a6a40, 0xc4b496, 0xf4ead8]).toContain(hex);
    expect(isGrey(hex)).toBe(false);
    const { width, height, depth } = (radish.geometry as THREE.BoxGeometry).parameters;
    expect(width).toBeLessThan(0.12);
    expect(height).toBeLessThan(0.12);
    expect(depth).toBeLessThan(0.12);
  });

  it("puts one tiny kraft PAPER squash on the cart bed; radish, beet, turnip, leek, cabbage, garlic, onion, potato, carrot, apple remain", () => {
    const player = makePlayer();
    dressCart(player);
    const cart = player.getObjectByName("paper-cart")!;
    const p = parts(cart);
    expect(p.filter((k) => k === "squash").length).toBe(1);
    expect(p.filter((k) => k === "radish").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "beet").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "turnip").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "leek").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "cabbage").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "garlic").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "onion").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "potato").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "carrot").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "apple").length).toBeGreaterThanOrEqual(1);

    const squash = cart.children.find((c) => c.userData.part === "squash") as THREE.Mesh;
    const radish = cart.children.find((c) => c.userData.part === "radish") as THREE.Mesh;
    const beet = cart.children.find((c) => c.userData.part === "beet") as THREE.Mesh;
    const turnip = cart.children.find((c) => c.userData.part === "turnip") as THREE.Mesh;
    const leek = cart.children.find((c) => c.userData.part === "leek") as THREE.Mesh;
    const cabbage = cart.children.find((c) => c.userData.part === "cabbage") as THREE.Mesh;
    const garlic = cart.children.find((c) => c.userData.part === "garlic") as THREE.Mesh;
    const onion = cart.children.find((c) => c.userData.part === "onion") as THREE.Mesh;
    const potato = cart.children.find((c) => c.userData.part === "potato") as THREE.Mesh;
    const carrot = cart.children.find((c) => c.userData.part === "carrot") as THREE.Mesh;
    const apple = cart.children.find((c) => c.userData.part === "apple") as THREE.Mesh;
    const bed = cart.children.find((c) => c.userData.part === "bed")!;
    expect(squash.userData.mode).toBe("PAPER");
    expect(squash.geometry.type).toBe("BoxGeometry");
    expect(squash.position.y).toBeGreaterThan(bed.position.y);
    expect(Math.hypot(squash.position.x - radish.position.x, squash.position.z - radish.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(squash.position.x - beet.position.x, squash.position.z - beet.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(squash.position.x - turnip.position.x, squash.position.z - turnip.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(squash.position.x - leek.position.x, squash.position.z - leek.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(squash.position.x - cabbage.position.x, squash.position.z - cabbage.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(squash.position.x - garlic.position.x, squash.position.z - garlic.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(squash.position.x - onion.position.x, squash.position.z - onion.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(squash.position.x - potato.position.x, squash.position.z - potato.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(squash.position.x - carrot.position.x, squash.position.z - carrot.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(squash.position.x - apple.position.x, squash.position.z - apple.position.z)).toBeGreaterThan(0.12);
    const hex = (squash.material as THREE.MeshLambertMaterial).color.getHex();
    expect([0x8a6238, 0x7a5230, 0x9a6a40, 0xc4b496, 0xf4ead8]).toContain(hex);
    expect(isGrey(hex)).toBe(false);
    const { width, height, depth } = (squash.geometry as THREE.BoxGeometry).parameters;
    expect(width).toBeLessThan(0.12);
    expect(height).toBeLessThan(0.12);
    expect(depth).toBeLessThan(0.12);
  });

  it("puts one tiny kraft PAPER parsnip on the cart bed; squash, radish, beet, turnip, leek, cabbage, garlic, onion, potato, carrot, apple remain", () => {
    const player = makePlayer();
    dressCart(player);
    const cart = player.getObjectByName("paper-cart")!;
    const p = parts(cart);
    expect(p.filter((k) => k === "parsnip").length).toBe(1);
    expect(p.filter((k) => k === "squash").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "radish").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "beet").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "turnip").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "leek").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "cabbage").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "garlic").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "onion").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "potato").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "carrot").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "apple").length).toBeGreaterThanOrEqual(1);

    const parsnip = cart.children.find((c) => c.userData.part === "parsnip") as THREE.Mesh;
    const squash = cart.children.find((c) => c.userData.part === "squash") as THREE.Mesh;
    const radish = cart.children.find((c) => c.userData.part === "radish") as THREE.Mesh;
    const beet = cart.children.find((c) => c.userData.part === "beet") as THREE.Mesh;
    const turnip = cart.children.find((c) => c.userData.part === "turnip") as THREE.Mesh;
    const leek = cart.children.find((c) => c.userData.part === "leek") as THREE.Mesh;
    const cabbage = cart.children.find((c) => c.userData.part === "cabbage") as THREE.Mesh;
    const garlic = cart.children.find((c) => c.userData.part === "garlic") as THREE.Mesh;
    const onion = cart.children.find((c) => c.userData.part === "onion") as THREE.Mesh;
    const potato = cart.children.find((c) => c.userData.part === "potato") as THREE.Mesh;
    const carrot = cart.children.find((c) => c.userData.part === "carrot") as THREE.Mesh;
    const apple = cart.children.find((c) => c.userData.part === "apple") as THREE.Mesh;
    const bed = cart.children.find((c) => c.userData.part === "bed")!;
    expect(parsnip.userData.mode).toBe("PAPER");
    expect(parsnip.geometry.type).toBe("BoxGeometry");
    expect(parsnip.position.y).toBeGreaterThan(bed.position.y);
    expect(Math.hypot(parsnip.position.x - squash.position.x, parsnip.position.z - squash.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(parsnip.position.x - radish.position.x, parsnip.position.z - radish.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(parsnip.position.x - beet.position.x, parsnip.position.z - beet.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(parsnip.position.x - turnip.position.x, parsnip.position.z - turnip.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(parsnip.position.x - leek.position.x, parsnip.position.z - leek.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(parsnip.position.x - cabbage.position.x, parsnip.position.z - cabbage.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(parsnip.position.x - garlic.position.x, parsnip.position.z - garlic.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(parsnip.position.x - onion.position.x, parsnip.position.z - onion.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(parsnip.position.x - potato.position.x, parsnip.position.z - potato.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(parsnip.position.x - carrot.position.x, parsnip.position.z - carrot.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(parsnip.position.x - apple.position.x, parsnip.position.z - apple.position.z)).toBeGreaterThan(0.12);
    const hex = (parsnip.material as THREE.MeshLambertMaterial).color.getHex();
    expect([0x8a6238, 0x7a5230, 0x9a6a40, 0xc4b496, 0xf4ead8]).toContain(hex);
    expect(isGrey(hex)).toBe(false);
    const { width, height, depth } = (parsnip.geometry as THREE.BoxGeometry).parameters;
    expect(width).toBeLessThan(0.12);
    expect(height).toBeLessThan(0.12);
    expect(depth).toBeLessThan(0.12);
  });

  it("puts one tiny kraft PAPER yam on the cart bed; parsnip, squash, radish, beet, turnip, leek, cabbage, garlic, onion, potato, carrot, apple remain", () => {
    const player = makePlayer();
    dressCart(player);
    const cart = player.getObjectByName("paper-cart")!;
    const p = parts(cart);
    expect(p.filter((k) => k === "yam").length).toBe(1);
    expect(p.filter((k) => k === "parsnip").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "squash").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "radish").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "beet").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "turnip").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "leek").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "cabbage").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "garlic").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "onion").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "potato").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "carrot").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "apple").length).toBeGreaterThanOrEqual(1);

    const yam = cart.children.find((c) => c.userData.part === "yam") as THREE.Mesh;
    const parsnip = cart.children.find((c) => c.userData.part === "parsnip") as THREE.Mesh;
    const squash = cart.children.find((c) => c.userData.part === "squash") as THREE.Mesh;
    const radish = cart.children.find((c) => c.userData.part === "radish") as THREE.Mesh;
    const beet = cart.children.find((c) => c.userData.part === "beet") as THREE.Mesh;
    const turnip = cart.children.find((c) => c.userData.part === "turnip") as THREE.Mesh;
    const leek = cart.children.find((c) => c.userData.part === "leek") as THREE.Mesh;
    const cabbage = cart.children.find((c) => c.userData.part === "cabbage") as THREE.Mesh;
    const garlic = cart.children.find((c) => c.userData.part === "garlic") as THREE.Mesh;
    const onion = cart.children.find((c) => c.userData.part === "onion") as THREE.Mesh;
    const potato = cart.children.find((c) => c.userData.part === "potato") as THREE.Mesh;
    const carrot = cart.children.find((c) => c.userData.part === "carrot") as THREE.Mesh;
    const apple = cart.children.find((c) => c.userData.part === "apple") as THREE.Mesh;
    const bed = cart.children.find((c) => c.userData.part === "bed")!;
    expect(yam.userData.mode).toBe("PAPER");
    expect(yam.geometry.type).toBe("BoxGeometry");
    expect(yam.position.y).toBeGreaterThan(bed.position.y);
    expect(Math.hypot(yam.position.x - parsnip.position.x, yam.position.z - parsnip.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(yam.position.x - squash.position.x, yam.position.z - squash.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(yam.position.x - radish.position.x, yam.position.z - radish.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(yam.position.x - beet.position.x, yam.position.z - beet.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(yam.position.x - turnip.position.x, yam.position.z - turnip.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(yam.position.x - leek.position.x, yam.position.z - leek.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(yam.position.x - cabbage.position.x, yam.position.z - cabbage.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(yam.position.x - garlic.position.x, yam.position.z - garlic.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(yam.position.x - onion.position.x, yam.position.z - onion.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(yam.position.x - potato.position.x, yam.position.z - potato.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(yam.position.x - carrot.position.x, yam.position.z - carrot.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(yam.position.x - apple.position.x, yam.position.z - apple.position.z)).toBeGreaterThan(0.12);
    const hex = (yam.material as THREE.MeshLambertMaterial).color.getHex();
    expect([0x8a6238, 0x9a6a40]).toContain(hex);
    expect(isGrey(hex)).toBe(false);
    const { width, height, depth } = (yam.geometry as THREE.BoxGeometry).parameters;
    expect(width).toBeLessThan(0.12);
    expect(height).toBeLessThan(0.12);
    expect(depth).toBeLessThan(0.12);
  });

  it("puts one tiny kraft PAPER plum on the cart bed; yam, parsnip, squash, radish, beet, turnip, leek, cabbage, garlic, onion, potato, carrot, apple remain", () => {
    const player = makePlayer();
    dressCart(player);
    const cart = player.getObjectByName("paper-cart")!;
    const p = parts(cart);
    expect(p.filter((k) => k === "plum").length).toBe(1);
    expect(p.filter((k) => k === "yam").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "parsnip").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "squash").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "radish").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "beet").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "turnip").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "leek").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "cabbage").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "garlic").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "onion").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "potato").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "carrot").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "apple").length).toBeGreaterThanOrEqual(1);

    const plum = cart.children.find((c) => c.userData.part === "plum") as THREE.Mesh;
    const yam = cart.children.find((c) => c.userData.part === "yam") as THREE.Mesh;
    const parsnip = cart.children.find((c) => c.userData.part === "parsnip") as THREE.Mesh;
    const squash = cart.children.find((c) => c.userData.part === "squash") as THREE.Mesh;
    const radish = cart.children.find((c) => c.userData.part === "radish") as THREE.Mesh;
    const beet = cart.children.find((c) => c.userData.part === "beet") as THREE.Mesh;
    const turnip = cart.children.find((c) => c.userData.part === "turnip") as THREE.Mesh;
    const leek = cart.children.find((c) => c.userData.part === "leek") as THREE.Mesh;
    const cabbage = cart.children.find((c) => c.userData.part === "cabbage") as THREE.Mesh;
    const garlic = cart.children.find((c) => c.userData.part === "garlic") as THREE.Mesh;
    const onion = cart.children.find((c) => c.userData.part === "onion") as THREE.Mesh;
    const potato = cart.children.find((c) => c.userData.part === "potato") as THREE.Mesh;
    const carrot = cart.children.find((c) => c.userData.part === "carrot") as THREE.Mesh;
    const apple = cart.children.find((c) => c.userData.part === "apple") as THREE.Mesh;
    const bed = cart.children.find((c) => c.userData.part === "bed")!;
    expect(plum.userData.mode).toBe("PAPER");
    expect(plum.geometry.type).toBe("BoxGeometry");
    expect(plum.position.y).toBeGreaterThan(bed.position.y);
    expect(Math.hypot(plum.position.x - yam.position.x, plum.position.z - yam.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(plum.position.x - parsnip.position.x, plum.position.z - parsnip.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(plum.position.x - squash.position.x, plum.position.z - squash.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(plum.position.x - radish.position.x, plum.position.z - radish.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(plum.position.x - beet.position.x, plum.position.z - beet.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(plum.position.x - turnip.position.x, plum.position.z - turnip.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(plum.position.x - leek.position.x, plum.position.z - leek.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(plum.position.x - cabbage.position.x, plum.position.z - cabbage.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(plum.position.x - garlic.position.x, plum.position.z - garlic.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(plum.position.x - onion.position.x, plum.position.z - onion.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(plum.position.x - potato.position.x, plum.position.z - potato.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(plum.position.x - carrot.position.x, plum.position.z - carrot.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(plum.position.x - apple.position.x, plum.position.z - apple.position.z)).toBeGreaterThan(0.12);
    const hex = (plum.material as THREE.MeshLambertMaterial).color.getHex();
    expect([0x8a6238, 0x9a6a40]).toContain(hex);
    expect(isGrey(hex)).toBe(false);
    const { width, height, depth } = (plum.geometry as THREE.BoxGeometry).parameters;
    expect(width).toBeLessThan(0.12);
    expect(height).toBeLessThan(0.12);
    expect(depth).toBeLessThan(0.12);
  });

  it("puts one tiny kraft PAPER fig on the cart bed; plum, yam, parsnip, squash, radish, beet, turnip, leek, cabbage, garlic, onion, potato, carrot, apple remain", () => {
    const player = makePlayer();
    dressCart(player);
    const cart = player.getObjectByName("paper-cart")!;
    const p = parts(cart);
    expect(p.filter((k) => k === "fig").length).toBe(1);
    expect(p.filter((k) => k === "plum").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "yam").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "parsnip").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "squash").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "radish").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "beet").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "turnip").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "leek").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "cabbage").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "garlic").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "onion").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "potato").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "carrot").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "apple").length).toBeGreaterThanOrEqual(1);

    const fig = cart.children.find((c) => c.userData.part === "fig") as THREE.Mesh;
    const plum = cart.children.find((c) => c.userData.part === "plum") as THREE.Mesh;
    const yam = cart.children.find((c) => c.userData.part === "yam") as THREE.Mesh;
    const parsnip = cart.children.find((c) => c.userData.part === "parsnip") as THREE.Mesh;
    const squash = cart.children.find((c) => c.userData.part === "squash") as THREE.Mesh;
    const radish = cart.children.find((c) => c.userData.part === "radish") as THREE.Mesh;
    const beet = cart.children.find((c) => c.userData.part === "beet") as THREE.Mesh;
    const turnip = cart.children.find((c) => c.userData.part === "turnip") as THREE.Mesh;
    const leek = cart.children.find((c) => c.userData.part === "leek") as THREE.Mesh;
    const cabbage = cart.children.find((c) => c.userData.part === "cabbage") as THREE.Mesh;
    const garlic = cart.children.find((c) => c.userData.part === "garlic") as THREE.Mesh;
    const onion = cart.children.find((c) => c.userData.part === "onion") as THREE.Mesh;
    const potato = cart.children.find((c) => c.userData.part === "potato") as THREE.Mesh;
    const carrot = cart.children.find((c) => c.userData.part === "carrot") as THREE.Mesh;
    const apple = cart.children.find((c) => c.userData.part === "apple") as THREE.Mesh;
    const bed = cart.children.find((c) => c.userData.part === "bed")!;
    expect(fig.userData.mode).toBe("PAPER");
    expect(fig.geometry.type).toBe("BoxGeometry");
    expect(fig.position.y).toBeGreaterThan(bed.position.y);
    expect(Math.hypot(fig.position.x - plum.position.x, fig.position.z - plum.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(fig.position.x - yam.position.x, fig.position.z - yam.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(fig.position.x - parsnip.position.x, fig.position.z - parsnip.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(fig.position.x - squash.position.x, fig.position.z - squash.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(fig.position.x - radish.position.x, fig.position.z - radish.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(fig.position.x - beet.position.x, fig.position.z - beet.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(fig.position.x - turnip.position.x, fig.position.z - turnip.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(fig.position.x - leek.position.x, fig.position.z - leek.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(fig.position.x - cabbage.position.x, fig.position.z - cabbage.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(fig.position.x - garlic.position.x, fig.position.z - garlic.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(fig.position.x - onion.position.x, fig.position.z - onion.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(fig.position.x - potato.position.x, fig.position.z - potato.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(fig.position.x - carrot.position.x, fig.position.z - carrot.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(fig.position.x - apple.position.x, fig.position.z - apple.position.z)).toBeGreaterThan(0.12);
    const hex = (fig.material as THREE.MeshLambertMaterial).color.getHex();
    expect([0x8a6238, 0x9a6a40]).toContain(hex);
    expect(isGrey(hex)).toBe(false);
    const { width, height, depth } = (fig.geometry as THREE.BoxGeometry).parameters;
    expect(width).toBeLessThan(0.12);
    expect(height).toBeLessThan(0.12);
    expect(depth).toBeLessThan(0.12);
  });

  it("puts one tiny kraft PAPER apricot on the cart bed; fig, plum, yam, parsnip, squash, radish, beet, turnip, leek, cabbage, garlic, onion, potato, carrot, apple remain", () => {
    const player = makePlayer();
    dressCart(player);
    const cart = player.getObjectByName("paper-cart")!;
    const p = parts(cart);
    expect(p.filter((k) => k === "apricot").length).toBe(1);
    expect(p.filter((k) => k === "fig").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "plum").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "yam").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "parsnip").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "squash").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "radish").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "beet").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "turnip").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "leek").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "cabbage").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "garlic").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "onion").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "potato").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "carrot").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "apple").length).toBeGreaterThanOrEqual(1);

    const apricot = cart.children.find((c) => c.userData.part === "apricot") as THREE.Mesh;
    const fig = cart.children.find((c) => c.userData.part === "fig") as THREE.Mesh;
    const plum = cart.children.find((c) => c.userData.part === "plum") as THREE.Mesh;
    const yam = cart.children.find((c) => c.userData.part === "yam") as THREE.Mesh;
    const parsnip = cart.children.find((c) => c.userData.part === "parsnip") as THREE.Mesh;
    const squash = cart.children.find((c) => c.userData.part === "squash") as THREE.Mesh;
    const radish = cart.children.find((c) => c.userData.part === "radish") as THREE.Mesh;
    const beet = cart.children.find((c) => c.userData.part === "beet") as THREE.Mesh;
    const turnip = cart.children.find((c) => c.userData.part === "turnip") as THREE.Mesh;
    const leek = cart.children.find((c) => c.userData.part === "leek") as THREE.Mesh;
    const cabbage = cart.children.find((c) => c.userData.part === "cabbage") as THREE.Mesh;
    const garlic = cart.children.find((c) => c.userData.part === "garlic") as THREE.Mesh;
    const onion = cart.children.find((c) => c.userData.part === "onion") as THREE.Mesh;
    const potato = cart.children.find((c) => c.userData.part === "potato") as THREE.Mesh;
    const carrot = cart.children.find((c) => c.userData.part === "carrot") as THREE.Mesh;
    const apple = cart.children.find((c) => c.userData.part === "apple") as THREE.Mesh;
    const bed = cart.children.find((c) => c.userData.part === "bed")!;
    expect(apricot.userData.mode).toBe("PAPER");
    expect(apricot.geometry.type).toBe("BoxGeometry");
    expect(apricot.position.y).toBeGreaterThan(bed.position.y);
    expect(Math.hypot(apricot.position.x - fig.position.x, apricot.position.z - fig.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(apricot.position.x - plum.position.x, apricot.position.z - plum.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(apricot.position.x - yam.position.x, apricot.position.z - yam.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(apricot.position.x - parsnip.position.x, apricot.position.z - parsnip.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(apricot.position.x - squash.position.x, apricot.position.z - squash.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(apricot.position.x - radish.position.x, apricot.position.z - radish.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(apricot.position.x - beet.position.x, apricot.position.z - beet.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(apricot.position.x - turnip.position.x, apricot.position.z - turnip.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(apricot.position.x - leek.position.x, apricot.position.z - leek.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(apricot.position.x - cabbage.position.x, apricot.position.z - cabbage.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(apricot.position.x - garlic.position.x, apricot.position.z - garlic.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(apricot.position.x - onion.position.x, apricot.position.z - onion.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(apricot.position.x - potato.position.x, apricot.position.z - potato.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(apricot.position.x - carrot.position.x, apricot.position.z - carrot.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(apricot.position.x - apple.position.x, apricot.position.z - apple.position.z)).toBeGreaterThan(0.12);
    const hex = (apricot.material as THREE.MeshLambertMaterial).color.getHex();
    expect([0x8a6238, 0x9a6a40]).toContain(hex);
    expect(isGrey(hex)).toBe(false);
    const { width, height, depth } = (apricot.geometry as THREE.BoxGeometry).parameters;
    expect(width).toBeLessThan(0.12);
    expect(height).toBeLessThan(0.12);
    expect(depth).toBeLessThan(0.12);
  });

  it("puts one tiny kraft PAPER date on the cart bed; apricot, fig, plum, yam, parsnip, squash, radish, beet, turnip, leek, cabbage, garlic, onion, potato, carrot, apple remain", () => {
    const player = makePlayer();
    dressCart(player);
    const cart = player.getObjectByName("paper-cart")!;
    const p = parts(cart);
    expect(p.filter((k) => k === "date").length).toBe(1);
    expect(p.filter((k) => k === "apricot").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "fig").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "plum").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "yam").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "parsnip").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "squash").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "radish").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "beet").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "turnip").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "leek").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "cabbage").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "garlic").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "onion").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "potato").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "carrot").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "apple").length).toBeGreaterThanOrEqual(1);

    const date = cart.children.find((c) => c.userData.part === "date") as THREE.Mesh;
    const apricot = cart.children.find((c) => c.userData.part === "apricot") as THREE.Mesh;
    const fig = cart.children.find((c) => c.userData.part === "fig") as THREE.Mesh;
    const plum = cart.children.find((c) => c.userData.part === "plum") as THREE.Mesh;
    const yam = cart.children.find((c) => c.userData.part === "yam") as THREE.Mesh;
    const parsnip = cart.children.find((c) => c.userData.part === "parsnip") as THREE.Mesh;
    const squash = cart.children.find((c) => c.userData.part === "squash") as THREE.Mesh;
    const radish = cart.children.find((c) => c.userData.part === "radish") as THREE.Mesh;
    const beet = cart.children.find((c) => c.userData.part === "beet") as THREE.Mesh;
    const turnip = cart.children.find((c) => c.userData.part === "turnip") as THREE.Mesh;
    const leek = cart.children.find((c) => c.userData.part === "leek") as THREE.Mesh;
    const cabbage = cart.children.find((c) => c.userData.part === "cabbage") as THREE.Mesh;
    const garlic = cart.children.find((c) => c.userData.part === "garlic") as THREE.Mesh;
    const onion = cart.children.find((c) => c.userData.part === "onion") as THREE.Mesh;
    const potato = cart.children.find((c) => c.userData.part === "potato") as THREE.Mesh;
    const carrot = cart.children.find((c) => c.userData.part === "carrot") as THREE.Mesh;
    const apple = cart.children.find((c) => c.userData.part === "apple") as THREE.Mesh;
    const bed = cart.children.find((c) => c.userData.part === "bed")!;
    expect(date.userData.mode).toBe("PAPER");
    expect(date.geometry.type).toBe("BoxGeometry");
    expect(date.position.y).toBeGreaterThan(bed.position.y);
    expect(Math.hypot(date.position.x - apricot.position.x, date.position.z - apricot.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(date.position.x - fig.position.x, date.position.z - fig.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(date.position.x - plum.position.x, date.position.z - plum.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(date.position.x - yam.position.x, date.position.z - yam.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(date.position.x - parsnip.position.x, date.position.z - parsnip.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(date.position.x - squash.position.x, date.position.z - squash.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(date.position.x - radish.position.x, date.position.z - radish.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(date.position.x - beet.position.x, date.position.z - beet.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(date.position.x - turnip.position.x, date.position.z - turnip.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(date.position.x - leek.position.x, date.position.z - leek.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(date.position.x - cabbage.position.x, date.position.z - cabbage.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(date.position.x - garlic.position.x, date.position.z - garlic.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(date.position.x - onion.position.x, date.position.z - onion.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(date.position.x - potato.position.x, date.position.z - potato.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(date.position.x - carrot.position.x, date.position.z - carrot.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(date.position.x - apple.position.x, date.position.z - apple.position.z)).toBeGreaterThan(0.12);
    const hex = (date.material as THREE.MeshLambertMaterial).color.getHex();
    expect([0x8a6238, 0x9a6a40]).toContain(hex);
    expect(isGrey(hex)).toBe(false);
    const { width, height, depth } = (date.geometry as THREE.BoxGeometry).parameters;
    expect(width).toBeLessThan(0.12);
    expect(height).toBeLessThan(0.12);
    expect(depth).toBeLessThan(0.12);
  });

  it("puts one tiny kraft PAPER olive on the cart bed; date, apricot, fig, plum, yam, parsnip, squash, radish, beet, turnip, leek, cabbage, garlic, onion, potato, carrot, apple remain", () => {
    const player = makePlayer();
    dressCart(player);
    const cart = player.getObjectByName("paper-cart")!;
    const p = parts(cart);
    expect(p.filter((k) => k === "olive").length).toBe(1);
    expect(p.filter((k) => k === "date").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "apricot").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "fig").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "plum").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "yam").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "parsnip").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "squash").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "radish").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "beet").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "turnip").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "leek").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "cabbage").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "garlic").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "onion").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "potato").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "carrot").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "apple").length).toBeGreaterThanOrEqual(1);

    const olive = cart.children.find((c) => c.userData.part === "olive") as THREE.Mesh;
    const date = cart.children.find((c) => c.userData.part === "date") as THREE.Mesh;
    const apricot = cart.children.find((c) => c.userData.part === "apricot") as THREE.Mesh;
    const fig = cart.children.find((c) => c.userData.part === "fig") as THREE.Mesh;
    const plum = cart.children.find((c) => c.userData.part === "plum") as THREE.Mesh;
    const yam = cart.children.find((c) => c.userData.part === "yam") as THREE.Mesh;
    const parsnip = cart.children.find((c) => c.userData.part === "parsnip") as THREE.Mesh;
    const squash = cart.children.find((c) => c.userData.part === "squash") as THREE.Mesh;
    const radish = cart.children.find((c) => c.userData.part === "radish") as THREE.Mesh;
    const beet = cart.children.find((c) => c.userData.part === "beet") as THREE.Mesh;
    const turnip = cart.children.find((c) => c.userData.part === "turnip") as THREE.Mesh;
    const leek = cart.children.find((c) => c.userData.part === "leek") as THREE.Mesh;
    const cabbage = cart.children.find((c) => c.userData.part === "cabbage") as THREE.Mesh;
    const garlic = cart.children.find((c) => c.userData.part === "garlic") as THREE.Mesh;
    const onion = cart.children.find((c) => c.userData.part === "onion") as THREE.Mesh;
    const potato = cart.children.find((c) => c.userData.part === "potato") as THREE.Mesh;
    const carrot = cart.children.find((c) => c.userData.part === "carrot") as THREE.Mesh;
    const apple = cart.children.find((c) => c.userData.part === "apple") as THREE.Mesh;
    const bed = cart.children.find((c) => c.userData.part === "bed")!;
    expect(olive.userData.mode).toBe("PAPER");
    expect(olive.geometry.type).toBe("BoxGeometry");
    expect(olive.position.y).toBeGreaterThan(bed.position.y);
    expect(Math.hypot(olive.position.x - date.position.x, olive.position.z - date.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(olive.position.x - apricot.position.x, olive.position.z - apricot.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(olive.position.x - fig.position.x, olive.position.z - fig.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(olive.position.x - plum.position.x, olive.position.z - plum.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(olive.position.x - yam.position.x, olive.position.z - yam.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(olive.position.x - parsnip.position.x, olive.position.z - parsnip.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(olive.position.x - squash.position.x, olive.position.z - squash.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(olive.position.x - radish.position.x, olive.position.z - radish.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(olive.position.x - beet.position.x, olive.position.z - beet.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(olive.position.x - turnip.position.x, olive.position.z - turnip.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(olive.position.x - leek.position.x, olive.position.z - leek.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(olive.position.x - cabbage.position.x, olive.position.z - cabbage.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(olive.position.x - garlic.position.x, olive.position.z - garlic.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(olive.position.x - onion.position.x, olive.position.z - onion.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(olive.position.x - potato.position.x, olive.position.z - potato.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(olive.position.x - carrot.position.x, olive.position.z - carrot.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(olive.position.x - apple.position.x, olive.position.z - apple.position.z)).toBeGreaterThan(0.12);
    const hex = (olive.material as THREE.MeshLambertMaterial).color.getHex();
    expect([0x8a6238, 0x9a6a40]).toContain(hex);
    expect(isGrey(hex)).toBe(false);
    const { width, height, depth } = (olive.geometry as THREE.BoxGeometry).parameters;
    expect(width).toBeLessThan(0.12);
    expect(height).toBeLessThan(0.12);
    expect(depth).toBeLessThan(0.12);
  });

  it("puts one tiny kraft PAPER walnut on the cart bed; olive, date, apricot, fig, plum, yam, parsnip, squash, radish, beet, turnip, leek, cabbage, garlic, onion, potato, carrot, apple remain", () => {
    const player = makePlayer();
    dressCart(player);
    const cart = player.getObjectByName("paper-cart")!;
    const p = parts(cart);
    expect(p.filter((k) => k === "walnut").length).toBe(1);
    expect(p.filter((k) => k === "olive").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "date").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "apricot").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "fig").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "plum").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "yam").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "parsnip").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "squash").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "radish").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "beet").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "turnip").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "leek").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "cabbage").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "garlic").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "onion").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "potato").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "carrot").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "apple").length).toBeGreaterThanOrEqual(1);

    const walnut = cart.children.find((c) => c.userData.part === "walnut") as THREE.Mesh;
    const olive = cart.children.find((c) => c.userData.part === "olive") as THREE.Mesh;
    const date = cart.children.find((c) => c.userData.part === "date") as THREE.Mesh;
    const apricot = cart.children.find((c) => c.userData.part === "apricot") as THREE.Mesh;
    const fig = cart.children.find((c) => c.userData.part === "fig") as THREE.Mesh;
    const plum = cart.children.find((c) => c.userData.part === "plum") as THREE.Mesh;
    const yam = cart.children.find((c) => c.userData.part === "yam") as THREE.Mesh;
    const parsnip = cart.children.find((c) => c.userData.part === "parsnip") as THREE.Mesh;
    const squash = cart.children.find((c) => c.userData.part === "squash") as THREE.Mesh;
    const radish = cart.children.find((c) => c.userData.part === "radish") as THREE.Mesh;
    const beet = cart.children.find((c) => c.userData.part === "beet") as THREE.Mesh;
    const turnip = cart.children.find((c) => c.userData.part === "turnip") as THREE.Mesh;
    const leek = cart.children.find((c) => c.userData.part === "leek") as THREE.Mesh;
    const cabbage = cart.children.find((c) => c.userData.part === "cabbage") as THREE.Mesh;
    const garlic = cart.children.find((c) => c.userData.part === "garlic") as THREE.Mesh;
    const onion = cart.children.find((c) => c.userData.part === "onion") as THREE.Mesh;
    const potato = cart.children.find((c) => c.userData.part === "potato") as THREE.Mesh;
    const carrot = cart.children.find((c) => c.userData.part === "carrot") as THREE.Mesh;
    const apple = cart.children.find((c) => c.userData.part === "apple") as THREE.Mesh;
    const bed = cart.children.find((c) => c.userData.part === "bed")!;
    expect(walnut.userData.mode).toBe("PAPER");
    expect(walnut.geometry.type).toBe("BoxGeometry");
    expect(walnut.position.y).toBeGreaterThan(bed.position.y);
    expect(Math.hypot(walnut.position.x - olive.position.x, walnut.position.z - olive.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(walnut.position.x - date.position.x, walnut.position.z - date.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(walnut.position.x - apricot.position.x, walnut.position.z - apricot.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(walnut.position.x - fig.position.x, walnut.position.z - fig.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(walnut.position.x - plum.position.x, walnut.position.z - plum.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(walnut.position.x - yam.position.x, walnut.position.z - yam.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(walnut.position.x - parsnip.position.x, walnut.position.z - parsnip.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(walnut.position.x - squash.position.x, walnut.position.z - squash.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(walnut.position.x - radish.position.x, walnut.position.z - radish.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(walnut.position.x - beet.position.x, walnut.position.z - beet.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(walnut.position.x - turnip.position.x, walnut.position.z - turnip.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(walnut.position.x - leek.position.x, walnut.position.z - leek.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(walnut.position.x - cabbage.position.x, walnut.position.z - cabbage.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(walnut.position.x - garlic.position.x, walnut.position.z - garlic.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(walnut.position.x - onion.position.x, walnut.position.z - onion.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(walnut.position.x - potato.position.x, walnut.position.z - potato.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(walnut.position.x - carrot.position.x, walnut.position.z - carrot.position.z)).toBeGreaterThan(0.12);
    expect(Math.hypot(walnut.position.x - apple.position.x, walnut.position.z - apple.position.z)).toBeGreaterThan(0.12);
    const hex = (walnut.material as THREE.MeshLambertMaterial).color.getHex();
    expect([0x8a6238, 0x9a6a40]).toContain(hex);
    expect(isGrey(hex)).toBe(false);
    const { width, height, depth } = (walnut.geometry as THREE.BoxGeometry).parameters;
    expect(width).toBeLessThan(0.12);
    expect(height).toBeLessThan(0.12);
    expect(depth).toBeLessThan(0.12);
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
