import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { dressPlayer } from "../public/harbour/player.js";

const KRAFT = 0xc4b496;
const SHIRT = 0xf4ead8;

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

function makePlayer() {
  const player = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.55, 1.15, 4, 8),
    new THREE.MeshLambertMaterial({ color: 0xf2d2a8 }),
  );
  player.position.set(12, 3.4, -6950);
  dressPlayer(player);
  return player;
}

describe("player PAPER visor", () => {
  it("sticks a kraft PAPER visor box forward from the hat", () => {
    const player = makePlayer();
    expect(player.userData.mode).toBe("PAPER");
    const figure = player.getObjectByName("paper-figure")!;
    expect(figure).toBeTruthy();
    expect(figure.userData.mode).toBe("PAPER");

    const p = parts(figure);
    expect(p.filter((k) => k === "visor").length).toBe(1);
    expect(p.filter((k) => k === "hat").length).toBe(2);
    expect(p).toContain("satchel");
    expect(p).toContain("buckle");
    expect(p.filter((k) => k === "pocket").length).toBeGreaterThanOrEqual(1);
    expect(p.filter((k) => k === "cuff").length).toBeGreaterThanOrEqual(2);
    expect(p.filter((k) => k === "button").length).toBe(1);
    expect(p.filter((k) => k === "badge").length).toBe(1);
    expect(p.filter((k) => k === "lanyard").length).toBe(1);
    expect(p.filter((k) => k === "kerchief").length).toBe(1);
    expect(p.filter((k) => k === "ticket").length).toBe(1);

    const visor = figure.children.find((c) => c.userData.part === "visor") as THREE.Mesh;
    const hats = figure.children.filter((c) => c.userData.part === "hat") as THREE.Mesh[];
    expect(visor).toBeTruthy();
    expect(hats.length).toBe(2);
    expect(visor.geometry.type).toBe("BoxGeometry");
    expect(hats.every((h) => h.geometry.type === "BoxGeometry")).toBe(true);
    expect((visor.material as THREE.MeshLambertMaterial).color.getHex()).toBe(KRAFT);
    expect(hats.some((h) => (h.material as THREE.MeshLambertMaterial).color.getHex() === KRAFT)).toBe(
      true,
    );
    expect(hats.some((h) => (h.material as THREE.MeshLambertMaterial).color.getHex() === SHIRT)).toBe(
      true,
    );

    const pocket = figure.children.find((c) => c.userData.part === "pocket") as THREE.Mesh;
    expect(pocket).toBeTruthy();
    expect(pocket.geometry.type).toBe("BoxGeometry");
    expect((pocket.material as THREE.MeshLambertMaterial).color.getHex()).toBe(KRAFT);
    expect(pocket.position.y).toBeGreaterThan(1.05);
    expect(pocket.position.y).toBeLessThan(1.3);
    expect(pocket.position.z).toBeGreaterThan(0.12);
    const pocketBox = pocket.geometry as THREE.BoxGeometry;
    expect(pocketBox.parameters.depth).toBeLessThan(0.08);

    const button = figure.children.find((c) => c.userData.part === "button") as THREE.Mesh;
    expect(button).toBeTruthy();
    expect(button.geometry.type).toBe("BoxGeometry");
    expect((button.material as THREE.MeshLambertMaterial).color.getHex()).toBe(KRAFT);
    expect(button.position.y).toBeGreaterThan(1.2);
    expect(button.position.y).toBeLessThan(1.42);
    expect(button.position.z).toBeGreaterThan(0.12);
    expect(Math.abs(button.position.x)).toBeLessThan(0.2);
    const buttonBox = button.geometry as THREE.BoxGeometry;
    expect(buttonBox.parameters.width).toBeLessThan(0.08);
    expect(buttonBox.parameters.height).toBeLessThan(0.08);
    expect(buttonBox.parameters.depth).toBeLessThan(0.06);

    const badge = figure.children.find((c) => c.userData.part === "badge") as THREE.Mesh;
    expect(badge).toBeTruthy();
    expect(badge.geometry.type).toBe("BoxGeometry");
    expect((badge.material as THREE.MeshLambertMaterial).color.getHex()).toBe(KRAFT);
    expect(badge.position.y).toBeGreaterThan(1.15);
    expect(badge.position.y).toBeLessThan(1.42);
    expect(badge.position.z).toBeGreaterThan(0.12);
    expect(Math.abs(badge.position.x)).toBeLessThan(0.23);
    expect(badge.position.x).not.toBeCloseTo(button.position.x, 1);
    expect(badge.position.x).not.toBeCloseTo(pocket.position.x, 1);
    const badgeBox = badge.geometry as THREE.BoxGeometry;
    expect(badgeBox.parameters.width).toBeLessThan(0.12);
    expect(badgeBox.parameters.height).toBeLessThan(0.08);
    expect(badgeBox.parameters.depth).toBeLessThan(0.06);

    const lanyard = figure.children.find((c) => c.userData.part === "lanyard") as THREE.Mesh;
    expect(lanyard).toBeTruthy();
    expect(lanyard.geometry.type).toBe("BoxGeometry");
    expect((lanyard.material as THREE.MeshLambertMaterial).color.getHex()).toBe(KRAFT);
    expect(lanyard.position.y).toBeGreaterThan(1.15);
    expect(lanyard.position.y).toBeLessThan(1.45);
    expect(lanyard.position.z).toBeGreaterThan(0.12);
    expect(lanyard.position.x).not.toBeCloseTo(badge.position.x, 1);
    expect(lanyard.position.x).not.toBeCloseTo(button.position.x, 1);
    expect(lanyard.position.x).not.toBeCloseTo(pocket.position.x, 1);
    const lanyardBox = lanyard.geometry as THREE.BoxGeometry;
    expect(lanyardBox.parameters.width).toBeLessThan(0.08);
    expect(lanyardBox.parameters.height).toBeLessThan(0.2);
    expect(lanyardBox.parameters.depth).toBeLessThan(0.05);

    const cuffs = figure.children.filter((c) => c.userData.part === "cuff") as THREE.Mesh[];
    expect(cuffs.length).toBeGreaterThanOrEqual(2);
    for (const cuff of cuffs) {
      expect(cuff.geometry.type).toBe("BoxGeometry");
      expect((cuff.material as THREE.MeshLambertMaterial).color.getHex()).toBe(KRAFT);
      expect(cuff.position.y).toBeGreaterThan(0.7);
      expect(cuff.position.y).toBeLessThan(0.95);
      expect(Math.abs(cuff.position.x)).toBeCloseTo(0.32, 5);
      const cuffBox = cuff.geometry as THREE.BoxGeometry;
      expect(cuffBox.parameters.height).toBeLessThan(0.1);
    }

    const brim = hats.find((h) => (h.material as THREE.MeshLambertMaterial).color.getHex() === KRAFT)!;
    expect(visor.position.z).toBeGreaterThan(brim.position.z);
    expect(visor.position.z).toBeGreaterThan(0.2);
    const visorBox = visor.geometry as THREE.BoxGeometry;
    expect(visorBox.parameters.height).toBeLessThan(0.06);
    expect(visorBox.parameters.depth).toBeGreaterThan(0.1);
    expect(visorBox.parameters.depth).toBeLessThan(0.28);

    figure.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      expect(mesh.geometry.type).toBe("BoxGeometry");
    });

    const colors = hexes(figure);
    expect(colors).toContain(KRAFT);
    expect(colors).toContain(SHIRT);
    expect(colors.every((c) => !isGrey(c))).toBe(true);
  });
});

describe("player PAPER kerchief", () => {
  it("sticks one tiny kraft PAPER kerchief; lanyard and badge remain", () => {
    const player = makePlayer();
    expect(player.position.x).toBe(12);
    expect(player.position.y).toBe(3.4);
    expect(player.position.z).toBe(-6950);

    const figure = player.getObjectByName("paper-figure")!;
    const p = parts(figure);
    expect(p.filter((k) => k === "kerchief").length).toBe(1);
    expect(p.filter((k) => k === "lanyard").length).toBe(1);
    expect(p.filter((k) => k === "badge").length).toBe(1);

    const kerchief = figure.children.find((c) => c.userData.part === "kerchief") as THREE.Mesh;
    const lanyard = figure.children.find((c) => c.userData.part === "lanyard") as THREE.Mesh;
    const badge = figure.children.find((c) => c.userData.part === "badge") as THREE.Mesh;
    const button = figure.children.find((c) => c.userData.part === "button") as THREE.Mesh;
    const pocket = figure.children.find((c) => c.userData.part === "pocket") as THREE.Mesh;
    const visor = figure.children.find((c) => c.userData.part === "visor") as THREE.Mesh;
    expect(kerchief).toBeTruthy();
    expect(lanyard).toBeTruthy();
    expect(badge).toBeTruthy();
    expect(kerchief.geometry.type).toBe("BoxGeometry");
    expect((kerchief.material as THREE.MeshLambertMaterial).color.getHex()).toBe(KRAFT);
    expect(kerchief.position.x).not.toBeCloseTo(lanyard.position.x, 1);
    expect(kerchief.position.x).not.toBeCloseTo(badge.position.x, 1);
    expect(kerchief.position.x).not.toBeCloseTo(button.position.x, 1);
    expect(kerchief.position.x).not.toBeCloseTo(pocket.position.x, 1);
    expect(kerchief.position.y).not.toBeCloseTo(visor.position.y, 1);
    const box = kerchief.geometry as THREE.BoxGeometry;
    expect(box.parameters.width).toBeLessThan(0.12);
    expect(box.parameters.height).toBeLessThan(0.08);
    expect(box.parameters.depth).toBeLessThan(0.06);
  });
});

describe("player PAPER ticket", () => {
  it("tucks one tiny kraft PAPER ticket on the satchel; badge and visor remain", () => {
    const player = makePlayer();
    expect(player.position.x).toBe(12);
    expect(player.position.y).toBe(3.4);
    expect(player.position.z).toBe(-6950);
    expect(player.userData.mode).toBe("PAPER");

    const figure = player.getObjectByName("paper-figure")!;
    const p = parts(figure);
    expect(p.filter((k) => k === "ticket").length).toBe(1);
    expect(p.filter((k) => k === "badge").length).toBe(1);
    expect(p.filter((k) => k === "button").length).toBe(1);
    expect(p.filter((k) => k === "lanyard").length).toBe(1);
    expect(p.filter((k) => k === "kerchief").length).toBe(1);
    expect(p.filter((k) => k === "visor").length).toBe(1);
    expect(p).toContain("satchel");

    const ticket = figure.children.find((c) => c.userData.part === "ticket") as THREE.Mesh;
    const satchel = figure.children.find((c) => c.userData.part === "satchel") as THREE.Mesh;
    expect(ticket).toBeTruthy();
    expect(satchel).toBeTruthy();
    expect(ticket.userData.mode).toBe("PAPER");
    expect(ticket.geometry.type).toBe("BoxGeometry");
    expect((ticket.material as THREE.MeshLambertMaterial).color.getHex()).toBe(KRAFT);
    expect(ticket.position.x).toBeCloseTo(satchel.position.x, 1);
    expect(ticket.position.y).toBeGreaterThan(0.6);
    expect(ticket.position.y).toBeLessThan(1.05);
    const box = ticket.geometry as THREE.BoxGeometry;
    expect(box.parameters.width).toBeLessThan(0.12);
    expect(box.parameters.height).toBeLessThan(0.08);
    expect(box.parameters.depth).toBeLessThan(0.06);
  });
});

describe("player PAPER coin", () => {
  it("tucks one tiny kraft PAPER coin on the satchel; ticket and flap remain", () => {
    const player = makePlayer();
    expect(player.position.x).toBe(12);
    expect(player.position.y).toBe(3.4);
    expect(player.position.z).toBe(-6950);
    expect(player.userData.mode).toBe("PAPER");

    const figure = player.getObjectByName("paper-figure")!;
    const p = parts(figure);
    expect(p.filter((k) => k === "coin").length).toBe(1);
    expect(p.filter((k) => k === "ticket").length).toBe(1);
    expect(p.filter((k) => k === "flap").length).toBe(1);
    expect(p).toContain("satchel");

    const coin = figure.children.find((c) => c.userData.part === "coin") as THREE.Mesh;
    const ticket = figure.children.find((c) => c.userData.part === "ticket") as THREE.Mesh;
    const satchel = figure.children.find((c) => c.userData.part === "satchel") as THREE.Mesh;
    const flap = figure.children.find((c) => c.userData.part === "flap") as THREE.Mesh;
    expect(coin).toBeTruthy();
    expect(ticket).toBeTruthy();
    expect(satchel).toBeTruthy();
    expect(flap).toBeTruthy();
    expect(coin.userData.mode).toBe("PAPER");
    expect(coin.geometry.type).toBe("BoxGeometry");
    const coinHex = (coin.material as THREE.MeshLambertMaterial).color.getHex();
    expect(coinHex).toBe(KRAFT);
    expect(isGrey(coinHex)).toBe(false);
    expect(coin.position.x).not.toBeCloseTo(ticket.position.x, 1);
    expect(coin.position.y).not.toBeCloseTo(ticket.position.y, 1);
    expect(coin.position.x).toBeGreaterThan(satchel.position.x - 0.12);
    expect(coin.position.x).toBeLessThan(satchel.position.x + 0.12);
    expect(coin.position.y).toBeGreaterThan(0.6);
    expect(coin.position.y).toBeLessThan(1.05);
    const box = coin.geometry as THREE.BoxGeometry;
    expect(box.parameters.width).toBeLessThan(0.12);
    expect(box.parameters.height).toBeLessThan(0.08);
    expect(box.parameters.depth).toBeLessThan(0.06);
  });
});

describe("player PAPER key", () => {
  it("tucks one tiny kraft PAPER key on the satchel; coin and ticket remain", () => {
    const player = makePlayer();
    expect(player.position.x).toBe(12);
    expect(player.position.y).toBe(3.4);
    expect(player.position.z).toBe(-6950);
    expect(player.userData.mode).toBe("PAPER");

    const figure = player.getObjectByName("paper-figure")!;
    const p = parts(figure);
    expect(p.filter((k) => k === "key").length).toBe(1);
    expect(p.filter((k) => k === "coin").length).toBe(1);
    expect(p.filter((k) => k === "ticket").length).toBe(1);
    expect(p).toContain("satchel");

    const key = figure.children.find((c) => c.userData.part === "key") as THREE.Mesh;
    const coin = figure.children.find((c) => c.userData.part === "coin") as THREE.Mesh;
    const ticket = figure.children.find((c) => c.userData.part === "ticket") as THREE.Mesh;
    const satchel = figure.children.find((c) => c.userData.part === "satchel") as THREE.Mesh;
    expect(key).toBeTruthy();
    expect(coin).toBeTruthy();
    expect(ticket).toBeTruthy();
    expect(satchel).toBeTruthy();
    expect(key.userData.mode).toBe("PAPER");
    expect(key.geometry.type).toBe("BoxGeometry");
    const keyHex = (key.material as THREE.MeshLambertMaterial).color.getHex();
    expect(keyHex).toBe(KRAFT);
    expect(isGrey(keyHex)).toBe(false);
    expect(key.position.x).not.toBeCloseTo(coin.position.x, 1);
    expect(key.position.y).not.toBeCloseTo(coin.position.y, 1);
    expect(key.position.x).not.toBeCloseTo(ticket.position.x, 1);
    expect(key.position.y).not.toBeCloseTo(ticket.position.y, 1);
    expect(key.position.x).toBeGreaterThan(satchel.position.x - 0.12);
    expect(key.position.x).toBeLessThan(satchel.position.x + 0.12);
    expect(key.position.y).toBeGreaterThan(0.6);
    expect(key.position.y).toBeLessThan(1.05);
    const box = key.geometry as THREE.BoxGeometry;
    expect(box.parameters.width).toBeLessThan(0.12);
    expect(box.parameters.height).toBeLessThan(0.08);
    expect(box.parameters.depth).toBeLessThan(0.06);
  });
});

describe("player PAPER whistle", () => {
  it("tucks one tiny kraft PAPER whistle on the satchel; key and coin remain", () => {
    const player = makePlayer();
    expect(player.position.x).toBe(12);
    expect(player.position.y).toBe(3.4);
    expect(player.position.z).toBe(-6950);
    expect(player.userData.mode).toBe("PAPER");

    const figure = player.getObjectByName("paper-figure")!;
    const p = parts(figure);
    expect(p.filter((k) => k === "whistle").length).toBe(1);
    expect(p.filter((k) => k === "key").length).toBe(1);
    expect(p.filter((k) => k === "coin").length).toBe(1);
    expect(p.filter((k) => k === "ticket").length).toBe(1);
    expect(p).toContain("satchel");

    const whistle = figure.children.find((c) => c.userData.part === "whistle") as THREE.Mesh;
    const key = figure.children.find((c) => c.userData.part === "key") as THREE.Mesh;
    const coin = figure.children.find((c) => c.userData.part === "coin") as THREE.Mesh;
    const ticket = figure.children.find((c) => c.userData.part === "ticket") as THREE.Mesh;
    const satchel = figure.children.find((c) => c.userData.part === "satchel") as THREE.Mesh;
    expect(whistle).toBeTruthy();
    expect(key).toBeTruthy();
    expect(coin).toBeTruthy();
    expect(ticket).toBeTruthy();
    expect(satchel).toBeTruthy();
    expect(whistle.userData.mode).toBe("PAPER");
    expect(whistle.geometry.type).toBe("BoxGeometry");
    const whistleHex = (whistle.material as THREE.MeshLambertMaterial).color.getHex();
    expect(whistleHex).toBe(KRAFT);
    expect(isGrey(whistleHex)).toBe(false);
    expect(whistle.position.x).not.toBeCloseTo(key.position.x, 1);
    expect(whistle.position.y).not.toBeCloseTo(key.position.y, 1);
    expect(whistle.position.x).not.toBeCloseTo(coin.position.x, 1);
    expect(whistle.position.y).not.toBeCloseTo(coin.position.y, 1);
    expect(whistle.position.y).not.toBeCloseTo(ticket.position.y, 1);
    expect(whistle.position.x).toBeGreaterThan(satchel.position.x - 0.12);
    expect(whistle.position.x).toBeLessThan(satchel.position.x + 0.12);
    expect(whistle.position.y).toBeGreaterThan(0.6);
    expect(whistle.position.y).toBeLessThan(1.05);
    const box = whistle.geometry as THREE.BoxGeometry;
    expect(box.parameters.width).toBeLessThan(0.12);
    expect(box.parameters.height).toBeLessThan(0.08);
    expect(box.parameters.depth).toBeLessThan(0.06);
  });
});

describe("player PAPER compass", () => {
  it("tucks one tiny kraft PAPER compass on the satchel; whistle and key remain", () => {
    const player = makePlayer();
    expect(player.position.x).toBe(12);
    expect(player.position.y).toBe(3.4);
    expect(player.position.z).toBe(-6950);
    expect(player.userData.mode).toBe("PAPER");

    const figure = player.getObjectByName("paper-figure")!;
    const p = parts(figure);
    expect(p.filter((k) => k === "compass").length).toBe(1);
    expect(p.filter((k) => k === "whistle").length).toBe(1);
    expect(p.filter((k) => k === "key").length).toBe(1);
    expect(p.filter((k) => k === "coin").length).toBe(1);
    expect(p.filter((k) => k === "ticket").length).toBe(1);
    expect(p).toContain("satchel");

    const compass = figure.children.find((c) => c.userData.part === "compass") as THREE.Mesh;
    const whistle = figure.children.find((c) => c.userData.part === "whistle") as THREE.Mesh;
    const key = figure.children.find((c) => c.userData.part === "key") as THREE.Mesh;
    const coin = figure.children.find((c) => c.userData.part === "coin") as THREE.Mesh;
    const ticket = figure.children.find((c) => c.userData.part === "ticket") as THREE.Mesh;
    const satchel = figure.children.find((c) => c.userData.part === "satchel") as THREE.Mesh;
    expect(compass).toBeTruthy();
    expect(whistle).toBeTruthy();
    expect(key).toBeTruthy();
    expect(coin).toBeTruthy();
    expect(ticket).toBeTruthy();
    expect(satchel).toBeTruthy();
    expect(compass.userData.mode).toBe("PAPER");
    expect(compass.geometry.type).toBe("BoxGeometry");
    const compassHex = (compass.material as THREE.MeshLambertMaterial).color.getHex();
    expect(compassHex).toBe(KRAFT);
    expect(isGrey(compassHex)).toBe(false);
    expect(compass.position.x).not.toBeCloseTo(whistle.position.x, 1);
    expect(compass.position.y).not.toBeCloseTo(whistle.position.y, 1);
    expect(compass.position.x).not.toBeCloseTo(key.position.x, 1);
    expect(compass.position.y).not.toBeCloseTo(key.position.y, 1);
    expect(compass.position.y).not.toBeCloseTo(coin.position.y, 1);
    expect(compass.position.y).not.toBeCloseTo(ticket.position.y, 1);
    expect(compass.position.x).toBeGreaterThan(satchel.position.x - 0.12);
    expect(compass.position.x).toBeLessThan(satchel.position.x + 0.12);
    expect(compass.position.y).toBeGreaterThan(0.6);
    expect(compass.position.y).toBeLessThan(1.05);
    const box = compass.geometry as THREE.BoxGeometry;
    expect(box.parameters.width).toBeLessThan(0.12);
    expect(box.parameters.height).toBeLessThan(0.08);
    expect(box.parameters.depth).toBeLessThan(0.06);
  });
});

describe("player PAPER flint", () => {
  it("tucks one tiny kraft PAPER flint on the satchel; compass and whistle remain", () => {
    const player = makePlayer();
    expect(player.position.x).toBe(12);
    expect(player.position.y).toBe(3.4);
    expect(player.position.z).toBe(-6950);
    expect(player.userData.mode).toBe("PAPER");

    const figure = player.getObjectByName("paper-figure")!;
    const p = parts(figure);
    expect(p.filter((k) => k === "flint").length).toBe(1);
    expect(p.filter((k) => k === "compass").length).toBe(1);
    expect(p.filter((k) => k === "whistle").length).toBe(1);
    expect(p.filter((k) => k === "key").length).toBe(1);
    expect(p.filter((k) => k === "coin").length).toBe(1);
    expect(p.filter((k) => k === "ticket").length).toBe(1);
    expect(p).toContain("satchel");

    const flint = figure.children.find((c) => c.userData.part === "flint") as THREE.Mesh;
    const compass = figure.children.find((c) => c.userData.part === "compass") as THREE.Mesh;
    const whistle = figure.children.find((c) => c.userData.part === "whistle") as THREE.Mesh;
    const key = figure.children.find((c) => c.userData.part === "key") as THREE.Mesh;
    const coin = figure.children.find((c) => c.userData.part === "coin") as THREE.Mesh;
    const ticket = figure.children.find((c) => c.userData.part === "ticket") as THREE.Mesh;
    const satchel = figure.children.find((c) => c.userData.part === "satchel") as THREE.Mesh;
    expect(flint).toBeTruthy();
    expect(compass).toBeTruthy();
    expect(whistle).toBeTruthy();
    expect(key).toBeTruthy();
    expect(coin).toBeTruthy();
    expect(ticket).toBeTruthy();
    expect(satchel).toBeTruthy();
    expect(flint.userData.mode).toBe("PAPER");
    expect(flint.geometry.type).toBe("BoxGeometry");
    const flintHex = (flint.material as THREE.MeshLambertMaterial).color.getHex();
    expect(flintHex).toBe(KRAFT);
    expect(isGrey(flintHex)).toBe(false);
    expect(flint.position.x).not.toBeCloseTo(compass.position.x, 1);
    expect(flint.position.y).not.toBeCloseTo(compass.position.y, 1);
    expect(flint.position.x).not.toBeCloseTo(whistle.position.x, 1);
    expect(flint.position.y).not.toBeCloseTo(whistle.position.y, 1);
    expect(flint.position.y).not.toBeCloseTo(key.position.y, 1);
    expect(flint.position.y).not.toBeCloseTo(coin.position.y, 1);
    expect(flint.position.y).not.toBeCloseTo(ticket.position.y, 1);
    expect(flint.position.x).toBeGreaterThan(satchel.position.x - 0.12);
    expect(flint.position.x).toBeLessThan(satchel.position.x + 0.12);
    expect(flint.position.y).toBeGreaterThan(0.6);
    expect(flint.position.y).toBeLessThan(1.05);
    const box = flint.geometry as THREE.BoxGeometry;
    expect(box.parameters.width).toBeLessThan(0.12);
    expect(box.parameters.height).toBeLessThan(0.08);
    expect(box.parameters.depth).toBeLessThan(0.06);
  });
});

describe("player PAPER map", () => {
  it("tucks one tiny kraft PAPER map on the satchel; flint and compass remain", () => {
    const player = makePlayer();
    expect(player.position.x).toBe(12);
    expect(player.position.y).toBe(3.4);
    expect(player.position.z).toBe(-6950);
    expect(player.userData.mode).toBe("PAPER");

    const figure = player.getObjectByName("paper-figure")!;
    const p = parts(figure);
    expect(p.filter((k) => k === "map").length).toBe(1);
    expect(p.filter((k) => k === "flint").length).toBe(1);
    expect(p.filter((k) => k === "compass").length).toBe(1);
    expect(p.filter((k) => k === "whistle").length).toBe(1);
    expect(p.filter((k) => k === "key").length).toBe(1);
    expect(p.filter((k) => k === "coin").length).toBe(1);
    expect(p.filter((k) => k === "ticket").length).toBe(1);
    expect(p).toContain("satchel");

    const map = figure.children.find((c) => c.userData.part === "map") as THREE.Mesh;
    const flint = figure.children.find((c) => c.userData.part === "flint") as THREE.Mesh;
    const compass = figure.children.find((c) => c.userData.part === "compass") as THREE.Mesh;
    const whistle = figure.children.find((c) => c.userData.part === "whistle") as THREE.Mesh;
    const key = figure.children.find((c) => c.userData.part === "key") as THREE.Mesh;
    const coin = figure.children.find((c) => c.userData.part === "coin") as THREE.Mesh;
    const ticket = figure.children.find((c) => c.userData.part === "ticket") as THREE.Mesh;
    const satchel = figure.children.find((c) => c.userData.part === "satchel") as THREE.Mesh;
    expect(map).toBeTruthy();
    expect(flint).toBeTruthy();
    expect(compass).toBeTruthy();
    expect(whistle).toBeTruthy();
    expect(key).toBeTruthy();
    expect(coin).toBeTruthy();
    expect(ticket).toBeTruthy();
    expect(satchel).toBeTruthy();
    expect(map.userData.mode).toBe("PAPER");
    expect(map.geometry.type).toBe("BoxGeometry");
    const mapHex = (map.material as THREE.MeshLambertMaterial).color.getHex();
    expect(mapHex).toBe(KRAFT);
    expect(isGrey(mapHex)).toBe(false);
    expect(map.position.x).not.toBeCloseTo(flint.position.x, 1);
    expect(map.position.y).not.toBeCloseTo(flint.position.y, 1);
    expect(map.position.x).not.toBeCloseTo(compass.position.x, 1);
    expect(map.position.y).not.toBeCloseTo(compass.position.y, 1);
    expect(map.position.y).not.toBeCloseTo(whistle.position.y, 1);
    expect(map.position.y).not.toBeCloseTo(key.position.y, 1);
    expect(map.position.y).not.toBeCloseTo(coin.position.y, 1);
    expect(map.position.y).not.toBeCloseTo(ticket.position.y, 1);
    expect(map.position.x).toBeGreaterThan(satchel.position.x - 0.12);
    expect(map.position.x).toBeLessThan(satchel.position.x + 0.12);
    expect(map.position.y).toBeGreaterThan(0.6);
    expect(map.position.y).toBeLessThan(1.05);
    const box = map.geometry as THREE.BoxGeometry;
    expect(box.parameters.width).toBeLessThan(0.12);
    expect(box.parameters.height).toBeLessThan(0.08);
    expect(box.parameters.depth).toBeLessThan(0.06);
  });
});
