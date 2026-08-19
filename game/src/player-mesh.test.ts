import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { dressPlayer, stepPlayerWalk } from "../public/harbour/player.js";

const SHIRT = 0x2f7a8a;
const BODY = 0xc45c12;
const SKIN = 0xf2d2a8;

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

describe("player PAPER walker", () => {
  it("is a simple body, shirt, and head — not a dressed satchel figure", () => {
    const player = makePlayer();
    expect(player.userData.mode).toBe("PAPER");
    expect(player.position.x).toBe(12);
    expect(player.position.y).toBe(3.4);
    expect(player.position.z).toBe(-6950);

    const figure = player.getObjectByName("paper-figure")!;
    expect(figure).toBeTruthy();
    expect(figure.userData.mode).toBe("PAPER");

    const p = parts(figure);
    expect(p).toContain("body");
    expect(p).toContain("shirt");
    expect(p).toContain("head");
    expect(p).toContain("leg");
    expect(p).toContain("arm");
    expect(p).toContain("hair");
    expect(p).not.toContain("satchel");
    expect(p).not.toContain("visor");
    expect(p).not.toContain("lanyard");
    expect(p).not.toContain("kerchief");

    const colors = hexes(figure);
    expect(colors).toContain(SHIRT);
    expect(colors).toContain(BODY);
    expect(colors).toContain(SKIN);
    expect(colors.every((c) => !isGrey(c))).toBe(true);
  });

  it("swings named legs and arms from gait phase, and shoes ride the legs", () => {
    const player = makePlayer();
    const figure = player.getObjectByName("paper-figure")!;
    const leftLeg = figure.getObjectByName("left-leg")!;
    const rightLeg = figure.getObjectByName("right-leg")!;
    expect(leftLeg).toBeTruthy();
    expect(rightLeg).toBeTruthy();
    expect(leftLeg.children.some((c) => c.userData?.part === "shoe")).toBe(true);
    expect(rightLeg.children.some((c) => c.userData?.part === "shoe")).toBe(true);
    stepPlayerWalk(player, Math.PI / 2, true);
    expect(leftLeg.rotation.x).toBeGreaterThan(0.4);
    expect(rightLeg.rotation.x).toBeCloseTo(-leftLeg.rotation.x, 5);
    stepPlayerWalk(player, 0, false);
    expect(leftLeg.rotation.x).toBeCloseTo(0, 8);
    expect(rightLeg.rotation.x).toBeCloseTo(0, 8);
  });
});
