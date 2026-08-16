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
