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
    expect(CART_MESH_COUNT).toBe(34);

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
