import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { createLandBoard, heightAt, ISLANDS } from "./land.ts";
import {
  awningStyleFor,
  createStalls,
  FOOD_GOODS,
  makeStallMesh,
  stallGoodFor,
  STALL_KIND,
} from "../public/harbour/stalls.js";

const CLOTH = new Set([0xc45c3a, 0xf4ead8, 0x2a7a72]);

function isGrey(hex: number) {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  return Math.max(r, g, b) - Math.min(r, g, b) < 18;
}

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

function parts(root: THREE.Object3D) {
  const out: string[] = [];
  root.traverse((obj) => {
    if (obj.userData?.part) out.push(obj.userData.part);
  });
  return out;
}

function stripeHexes(root: THREE.Object3D) {
  const colors: number[] = [];
  root.traverse((obj) => {
    if (!obj.userData?.stripe) return;
    const mesh = obj as THREE.Mesh;
    const mat = mesh.material as THREE.MeshLambertMaterial | undefined;
    if (mat?.color) colors.push(mat.color.getHex());
  });
  return colors;
}

function meshCount(root: THREE.Object3D) {
  let n = 0;
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) n += 1;
  });
  return n;
}

function aimAt(x: number, y: number, z: number) {
  const cam = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  cam.position.set(x, y + 10, z + 0.2);
  cam.lookAt(x, y + 1.2, z);
  cam.updateMatrixWorld(true);
  const rc = new THREE.Raycaster();
  rc.setFromCamera(new THREE.Vector2(0, 0), cam);
  return rc;
}

function missRay() {
  const cam = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  cam.position.set(0, 40, 0);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld(true);
  const rc = new THREE.Raycaster();
  rc.setFromCamera(new THREE.Vector2(0, 0), cam);
  return rc;
}

function boot(map = createLandBoard()) {
  const added: THREE.Object3D[] = [];
  const scene = {
    add(obj: THREE.Object3D) {
      added.push(obj);
    },
  };
  const statuses: string[] = [];
  const snaps: unknown[] = [];
  const stalls = createStalls({
    scene,
    getMap: () => map,
    specOf: (id: "north" | "south") => ISLANDS[id],
    heightAt,
    setStatus: (t: string) => statuses.push(t),
    applySnapshot: (s: unknown) => {
      snaps.push(s);
    },
    getPlayer: () => ({ position: { x: 0, y: 1, z: -6950 } }),
  });
  return { map, added, scene, statuses, snaps, stalls };
}

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("NPC harbour stalls", () => {
  it("builds a PAPER stand with awning, counter, crates — not a grey cube", () => {
    const mesh = makeStallMesh({ id: "n-test", use: "farm", island: "north", band: "field" });
    expect(mesh.userData.kind).toBe(STALL_KIND);
    expect(mesh.userData.mode).toBe("PAPER");
    expect(mesh.userData.paper).toBe(true);
    expect(mesh.userData.good).toBe("corn");
    expect(meshCount(mesh)).toBeGreaterThan(10);
    const kinds = parts(mesh);
    expect(kinds).toContain("awning");
    expect(kinds).toContain("counter");
    expect(kinds).toContain("crate");
    expect(kinds).toContain("produce");
    expect(kinds).toContain("lantern");
    expect(kinds).toContain("slate");
    expect(kinds).toContain("melon");
    expect(kinds).toContain("cone");
    expect(kinds).toContain("fish");
    expect(kinds).toContain("ground-crate");
    expect(kinds).toContain("stool");
    expect(kinds).toContain("cup");
    expect(kinds).toContain("knife");
    expect(kinds).toContain("napkin");
    expect(kinds).toContain("plate");
    expect(kinds).toContain("lemon");
    const colors = hexes(mesh);
    expect(colors.length).toBeGreaterThan(4);
    expect(colors.every(isGrey)).toBe(false);
    expect(colors).toContain(0x8a6238);
    const stripes = stripeHexes(mesh);
    expect(stripes.length).toBeGreaterThan(6);
    expect(stripes.every((c) => CLOTH.has(c))).toBe(true);
  });

  it("puts one small kraft goods crate on each NPC stall counter", () => {
    const mesh = makeStallMesh({ id: "n-test", use: "farm", island: "north", band: "field" });
    const counter = mesh.children.find((c) => c.userData.part === "counter") as THREE.Mesh;
    const goods = mesh.children.filter((c) => c.userData.part === "goods-crate");
    expect(goods.length).toBe(1);
    const crate = goods[0]!;
    expect(crate.userData.mode).toBe("PAPER");
    expect(crate.userData.paper).toBe(true);
    const box = counter.geometry as THREE.BoxGeometry;
    const counterTop = counter.position.y + box.parameters.height / 2;
    expect(crate.position.y).toBeCloseTo(counterTop, 5);
    expect(crate.position.z).toBeCloseTo(counter.position.z, 5);
    expect(Math.abs(crate.position.x)).toBeLessThan(1.7);

    const kraft = new Set([0x8a6238, 0x7a5230, 0x5a3a22, 0xf4ead8]);
    const colors = hexes(crate);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => kraft.has(c))).toBe(true);
    expect(colors).toContain(0x8a6238);
    expect(colors).toContain(0xf4ead8);
    crate.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (!m.isMesh || m.geometry.type !== "BoxGeometry") return;
      const g = m.geometry as THREE.BoxGeometry;
      expect(g.parameters.width).toBeLessThan(0.55);
      expect(g.parameters.height).toBeLessThan(0.4);
      expect(g.parameters.depth).toBeLessThan(0.5);
    });

    const { stalls } = boot();
    expect(stalls.group.children.length).toBeGreaterThan(0);
    for (const child of stalls.group.children) {
      expect(child.children.filter((c) => c.userData.part === "goods-crate").length).toBe(1);
    }
  });

  it("puts one small kraft melon on each NPC stall counter", () => {
    const mesh = makeStallMesh({ id: "n-test", use: "farm", island: "north", band: "field" });
    const counter = mesh.children.find((c) => c.userData.part === "counter") as THREE.Mesh;
    const melons = mesh.children.filter((c) => c.userData.part === "melon");
    expect(melons.length).toBe(1);
    const melon = melons[0]!;
    expect(melon.userData.mode).toBe("PAPER");
    expect(melon.userData.paper).toBe(true);
    const box = counter.geometry as THREE.BoxGeometry;
    const counterTop = counter.position.y + box.parameters.height / 2;
    expect(melon.position.y).toBeCloseTo(counterTop, 5);
    expect(melon.position.z).toBeCloseTo(counter.position.z, 5);
    expect(Math.abs(melon.position.x)).toBeLessThan(1.7);

    const produce = new Set([0x6a8f44, 0xc45c3a]);
    const colors = hexes(melon);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => produce.has(c))).toBe(true);
    expect(colors).toContain(0x6a8f44);
    melon.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (!m.isMesh || m.geometry.type !== "BoxGeometry") return;
      const g = m.geometry as THREE.BoxGeometry;
      expect(g.parameters.width).toBeLessThan(0.4);
      expect(g.parameters.height).toBeLessThan(0.3);
      expect(g.parameters.depth).toBeLessThan(0.4);
    });

    const { stalls } = boot();
    expect(stalls.group.children.length).toBeGreaterThan(0);
    for (const child of stalls.group.children) {
      expect(child.children.filter((c) => c.userData.part === "melon").length).toBe(1);
    }
  });

  it("puts one small kraft produce cone on each NPC stall counter", () => {
    const mesh = makeStallMesh({ id: "n-test", use: "farm", island: "north", band: "field" });
    const counter = mesh.children.find((c) => c.userData.part === "counter") as THREE.Mesh;
    const cones = mesh.children.filter((c) => c.userData.part === "cone");
    expect(cones.length).toBe(1);
    const cone = cones[0]!;
    expect(cone.userData.mode).toBe("PAPER");
    expect(cone.userData.paper).toBe(true);
    const box = counter.geometry as THREE.BoxGeometry;
    const counterTop = counter.position.y + box.parameters.height / 2;
    expect(cone.position.y).toBeCloseTo(counterTop, 5);
    expect(cone.position.z).toBeCloseTo(counter.position.z, 5);
    expect(Math.abs(cone.position.x)).toBeLessThan(1.7);

    const melon = mesh.children.find((c) => c.userData.part === "melon")!;
    expect(Math.abs(cone.position.x - melon.position.x)).toBeGreaterThan(0.25);

    const wrap = new Set([0xf4ead8, 0x5f8a32]);
    const colors = hexes(cone);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => wrap.has(c))).toBe(true);
    expect(colors).toContain(0xf4ead8);
    expect(colors).toContain(0x5f8a32);
    cone.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (!m.isMesh || m.geometry.type !== "BoxGeometry") return;
      const g = m.geometry as THREE.BoxGeometry;
      expect(g.parameters.width).toBeLessThan(0.4);
      expect(g.parameters.height).toBeLessThan(0.3);
      expect(g.parameters.depth).toBeLessThan(0.4);
    });

    const { stalls } = boot();
    expect(stalls.group.children.length).toBeGreaterThan(0);
    for (const child of stalls.group.children) {
      expect(child.children.filter((c) => c.userData.part === "cone").length).toBe(1);
    }
  });

  it("hangs one small warm kraft oil lantern under each stall awning", () => {
    const mesh = makeStallMesh({ id: "n-test", use: "farm", island: "north", band: "field" });
    const awnings = mesh.children.filter((c) => c.userData.part === "awning");
    const lamps = mesh.children.filter((c) => c.userData.part === "lantern");
    expect(lamps.length).toBe(1);
    const lantern = lamps[0]!;
    expect(lantern.userData.mode).toBe("PAPER");
    expect(lantern.userData.paper).toBe(true);

    const awningY = Math.min(...awnings.map((a) => a.position.y));
    expect(lantern.position.y).toBeLessThan(awningY);
    expect(lantern.position.y).toBeGreaterThan(1.2);
    expect(Math.abs(lantern.position.x)).toBeLessThan(1.4);
    expect(Math.abs(lantern.position.z)).toBeLessThan(1.2);

    const warm = new Set([0x5a3a22, 0x3d2a1c, 0x6a4a2a, 0x8a6238, 0xf4ead8, 0xffd090, 0xd4b83a, 0xc4a574]);
    const colors = hexes(lantern);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => warm.has(c))).toBe(true);
    expect(colors).toContain(0x5a3a22);
    expect(colors.some((c) => c === 0xffd090 || c === 0xf4ead8)).toBe(true);
    lantern.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (!m.isMesh) return;
      expect(m.geometry.type).toBe("BoxGeometry");
      const g = m.geometry as THREE.BoxGeometry;
      expect(g.parameters.width).toBeLessThan(0.35);
      expect(g.parameters.height).toBeLessThan(0.35);
      expect(g.parameters.depth).toBeLessThan(0.35);
    });

    const { stalls } = boot();
    expect(stalls.group.children.length).toBeGreaterThan(0);
    for (const child of stalls.group.children) {
      expect(child.children.filter((c) => c.userData.part === "lantern").length).toBe(1);
    }
  });

  it("hangs one small kraft fish under each stall awning, offset from the lantern", () => {
    const mesh = makeStallMesh({ id: "n-test", use: "farm", island: "north", band: "field" });
    const awnings = mesh.children.filter((c) => c.userData.part === "awning");
    const fishes = mesh.children.filter((c) => c.userData.part === "fish");
    expect(fishes.length).toBe(1);
    const fish = fishes[0]!;
    expect(fish.userData.mode).toBe("PAPER");
    expect(fish.userData.paper).toBe(true);

    const awningY = Math.min(...awnings.map((a) => a.position.y));
    expect(fish.position.y).toBeLessThan(awningY);
    expect(fish.position.y).toBeGreaterThan(1.2);
    expect(Math.abs(fish.position.x)).toBeLessThan(1.4);
    expect(Math.abs(fish.position.z)).toBeLessThan(1.2);

    const lantern = mesh.children.find((c) => c.userData.part === "lantern")!;
    expect(
      Math.hypot(fish.position.x - lantern.position.x, fish.position.z - lantern.position.z),
    ).toBeGreaterThan(0.25);

    const melon = mesh.children.find((c) => c.userData.part === "melon")!;
    const cone = mesh.children.find((c) => c.userData.part === "cone")!;
    const scale = mesh.children.find((c) => c.userData.part === "hanging-scale")!;
    const basket = mesh.children.find((c) => c.userData.part === "produce-basket")!;
    expect(melon.position.x).toBeCloseTo(-0.88, 5);
    expect(melon.position.y).toBeCloseTo(0.9, 5);
    expect(melon.position.z).toBeCloseTo(1.05, 5);
    expect(cone.position.x).toBeCloseTo(-0.42, 5);
    expect(cone.position.y).toBeCloseTo(0.9, 5);
    expect(cone.position.z).toBeCloseTo(1.05, 5);
    expect(lantern.position.x).toBeCloseTo(0, 5);
    expect(lantern.position.y).toBeCloseTo(1.9, 5);
    expect(lantern.position.z).toBeCloseTo(0.42, 5);
    expect(scale.position.x).toBeCloseTo(-1.12, 5);
    expect(scale.position.y).toBeCloseTo(1.78, 5);
    expect(scale.position.z).toBeCloseTo(0.86, 5);
    expect(basket.position.x).toBeCloseTo(1.18, 5);
    expect(basket.position.y).toBeCloseTo(1.76, 5);
    expect(basket.position.z).toBeCloseTo(0.88, 5);

    const teal = new Set([0x2a7a72, 0x5f8a32, 0xf4ead8, 0x3d2a1c, 0x5a3a22]);
    const colors = hexes(fish);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => teal.has(c))).toBe(true);
    expect(colors).toContain(0x2a7a72);
    let boxes = 0;
    fish.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (!m.isMesh) return;
      boxes += 1;
      expect(m.geometry.type).toBe("BoxGeometry");
      const g = m.geometry as THREE.BoxGeometry;
      expect(g.parameters.width).toBeLessThan(0.35);
      expect(g.parameters.height).toBeLessThan(0.35);
      expect(g.parameters.depth).toBeLessThan(0.35);
    });
    expect(boxes).toBeGreaterThanOrEqual(2);

    const { stalls } = boot();
    expect(stalls.group.children.length).toBeGreaterThan(0);
    for (const child of stalls.group.children) {
      expect(child.children.filter((c) => c.userData.part === "fish").length).toBe(1);
    }
  });

  it("hangs one small kraft price slate on each NPC stall front", () => {
    const mesh = makeStallMesh({ id: "n-test", use: "farm", island: "north", band: "field" });
    const slates = mesh.children.filter((c) => c.userData.part === "slate");
    expect(slates.length).toBe(1);
    const slate = slates[0]!;
    expect(slate.userData.mode).toBe("PAPER");
    expect(slate.userData.paper).toBe(true);

    const counter = mesh.children.find((c) => c.userData.part === "counter") as THREE.Mesh;
    const awnings = mesh.children.filter((c) => c.userData.part === "awning");
    const awningY = Math.min(...awnings.map((a) => a.position.y));
    expect(slate.position.y).toBeLessThan(awningY);
    expect(slate.position.y).toBeGreaterThan(counter.position.y);
    expect(slate.position.z).toBeGreaterThan(counter.position.z);
    expect(Math.abs(slate.position.x)).toBeLessThan(1.7);

    const melon = mesh.children.find((c) => c.userData.part === "melon")!;
    const cone = mesh.children.find((c) => c.userData.part === "cone")!;
    const lantern = mesh.children.find((c) => c.userData.part === "lantern")!;
    const fish = mesh.children.find((c) => c.userData.part === "fish")!;
    const ground = mesh.children.find((c) => c.userData.part === "ground-crate")!;
    expect(melon.position.x).toBeCloseTo(-0.88, 5);
    expect(cone.position.x).toBeCloseTo(-0.42, 5);
    expect(lantern.position.x).toBeCloseTo(0, 5);
    expect(lantern.position.y).toBeCloseTo(1.9, 5);
    expect(lantern.position.z).toBeCloseTo(0.42, 5);
    expect(fish.userData.part).toBe("fish");
    expect(ground.userData.part).toBe("ground-crate");

    const cream = new Set([0x5a3a22, 0xe8d7b8]);
    const colors = hexes(slate);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => cream.has(c))).toBe(true);
    expect(colors).toContain(0x5a3a22);
    expect(colors).toContain(0xe8d7b8);
    expect(colors.every((c) => !isGrey(c))).toBe(true);
    slate.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (!m.isMesh) return;
      expect(m.geometry.type).toBe("BoxGeometry");
      const g = m.geometry as THREE.BoxGeometry;
      expect(g.parameters.width).toBeLessThan(0.45);
      expect(g.parameters.height).toBeLessThan(0.5);
      expect(g.parameters.depth).toBeLessThan(0.2);
    });

    const { stalls } = boot();
    expect(stalls.group.children.length).toBeGreaterThan(0);
    for (const child of stalls.group.children) {
      expect(child.children.filter((c) => c.userData.part === "slate").length).toBe(1);
      expect(child.children.filter((c) => c.userData.part === "lantern").length).toBe(1);
    }
  });

  it("puts one small kraft crate on the ground beside each NPC stall", () => {
    const mesh = makeStallMesh({ id: "n-test", use: "farm", island: "north", band: "field" });
    const counter = mesh.children.find((c) => c.userData.part === "counter") as THREE.Mesh;
    const crates = mesh.children.filter((c) => c.userData.part === "ground-crate");
    expect(crates.length).toBe(1);
    const crate = crates[0]!;
    expect(crate.userData.mode).toBe("PAPER");
    expect(crate.userData.paper).toBe(true);

    const box = counter.geometry as THREE.BoxGeometry;
    const counterTop = counter.position.y + box.parameters.height / 2;
    expect(crate.position.y).toBeLessThan(counter.position.y);
    expect(crate.position.y).toBeLessThan(0.2);
    expect(crate.position.y).toBeGreaterThanOrEqual(0);
    expect(crate.position.y).not.toBeCloseTo(counterTop, 5);
    expect(Math.abs(crate.position.x)).toBeGreaterThan(2.0);
    expect(Math.abs(crate.position.z)).toBeLessThan(1.5);

    const melon = mesh.children.find((c) => c.userData.part === "melon")!;
    const cone = mesh.children.find((c) => c.userData.part === "cone")!;
    const lantern = mesh.children.find((c) => c.userData.part === "lantern")!;
    const fish = mesh.children.find((c) => c.userData.part === "fish")!;
    expect(melon.position.x).toBeCloseTo(-0.88, 5);
    expect(cone.position.x).toBeCloseTo(-0.42, 5);
    expect(lantern.position.y).toBeCloseTo(1.9, 5);
    expect(fish.userData.part).toBe("fish");

    const kraft = new Set([0x8a6238, 0x7a5230, 0x5a3a22]);
    const colors = hexes(crate);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => kraft.has(c))).toBe(true);
    expect(colors).toContain(0x8a6238);
    expect(colors).toContain(0x5a3a22);
    expect(colors.every((c) => !isGrey(c))).toBe(true);
    crate.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (!m.isMesh) return;
      expect(m.geometry.type).toBe("BoxGeometry");
      const g = m.geometry as THREE.BoxGeometry;
      expect(g.parameters.width).toBeLessThan(0.55);
      expect(g.parameters.height).toBeLessThan(0.4);
      expect(g.parameters.depth).toBeLessThan(0.5);
    });

    const { stalls } = boot();
    expect(stalls.group.children.length).toBeGreaterThan(0);
    for (const child of stalls.group.children) {
      expect(child.children.filter((c) => c.userData.part === "ground-crate").length).toBe(1);
    }
  });

  it("puts one small kraft stool on the ground beside each NPC stall", () => {
    const mesh = makeStallMesh({ id: "n-test", use: "farm", island: "north", band: "field" });
    const counter = mesh.children.find((c) => c.userData.part === "counter") as THREE.Mesh;
    const stools = mesh.children.filter((c) => c.userData.part === "stool");
    expect(stools.length).toBe(1);
    const stool = stools[0]!;
    expect(stool.userData.mode).toBe("PAPER");
    expect(stool.userData.paper).toBe(true);

    const box = counter.geometry as THREE.BoxGeometry;
    const counterTop = counter.position.y + box.parameters.height / 2;
    expect(stool.position.y).toBeLessThan(counter.position.y);
    expect(stool.position.y).toBeLessThan(0.2);
    expect(stool.position.y).toBeGreaterThanOrEqual(0);
    expect(stool.position.y).not.toBeCloseTo(counterTop, 5);
    expect(Math.abs(stool.position.x)).toBeGreaterThan(2.0);
    expect(Math.abs(stool.position.z)).toBeLessThan(1.5);

    const melon = mesh.children.find((c) => c.userData.part === "melon")!;
    const cone = mesh.children.find((c) => c.userData.part === "cone")!;
    const lantern = mesh.children.find((c) => c.userData.part === "lantern")!;
    const fish = mesh.children.find((c) => c.userData.part === "fish")!;
    const ground = mesh.children.find((c) => c.userData.part === "ground-crate")!;
    const slate = mesh.children.find((c) => c.userData.part === "slate")!;
    expect(melon.position.x).toBeCloseTo(-0.88, 5);
    expect(cone.position.x).toBeCloseTo(-0.42, 5);
    expect(lantern.position.y).toBeCloseTo(1.9, 5);
    expect(fish.userData.part).toBe("fish");
    expect(ground.userData.part).toBe("ground-crate");
    expect(slate.userData.part).toBe("slate");
    expect(Math.abs(stool.position.x - ground.position.x)).toBeGreaterThan(1.5);

    const wood = new Set([0x5a3a22]);
    const colors = hexes(stool);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => wood.has(c))).toBe(true);
    expect(colors).toContain(0x5a3a22);
    expect(colors.every((c) => !isGrey(c))).toBe(true);
    let boxes = 0;
    stool.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (!m.isMesh) return;
      boxes += 1;
      expect(m.geometry.type).toBe("BoxGeometry");
      const g = m.geometry as THREE.BoxGeometry;
      expect(g.parameters.width).toBeLessThan(0.45);
      expect(g.parameters.height).toBeLessThan(0.4);
      expect(g.parameters.depth).toBeLessThan(0.45);
    });
    expect(boxes).toBeGreaterThanOrEqual(3);

    const { stalls } = boot();
    expect(stalls.group.children.length).toBeGreaterThan(0);
    for (const child of stalls.group.children) {
      expect(child.children.filter((c) => c.userData.part === "stool").length).toBe(1);
    }
  });

  it("puts one tiny kraft PAPER cup on each NPC stall counter", () => {
    const mesh = makeStallMesh({ id: "n-test", use: "farm", island: "north", band: "field" });
    const counter = mesh.children.find((c) => c.userData.part === "counter") as THREE.Mesh;
    const cups = mesh.children.filter((c) => c.userData.part === "cup");
    expect(cups.length).toBe(1);
    const cup = cups[0]!;
    expect(cup.userData.mode).toBe("PAPER");
    expect(cup.userData.paper).toBe(true);
    const box = counter.geometry as THREE.BoxGeometry;
    const counterTop = counter.position.y + box.parameters.height / 2;
    expect(cup.position.y).toBeCloseTo(counterTop, 5);
    expect(cup.position.z).toBeCloseTo(counter.position.z, 5);
    expect(Math.abs(cup.position.x)).toBeLessThan(1.7);

    const melon = mesh.children.find((c) => c.userData.part === "melon")!;
    const cone = mesh.children.find((c) => c.userData.part === "cone")!;
    const lantern = mesh.children.find((c) => c.userData.part === "lantern")!;
    const fish = mesh.children.find((c) => c.userData.part === "fish")!;
    const slate = mesh.children.find((c) => c.userData.part === "slate")!;
    const stool = mesh.children.find((c) => c.userData.part === "stool")!;
    const scale = mesh.children.find((c) => c.userData.part === "hanging-scale")!;
    expect(melon.position.x).toBeCloseTo(-0.88, 5);
    expect(melon.position.y).toBeCloseTo(0.9, 5);
    expect(cone.position.x).toBeCloseTo(-0.42, 5);
    expect(cone.position.y).toBeCloseTo(0.9, 5);
    expect(slate.userData.part).toBe("slate");
    expect(stool.userData.part).toBe("stool");
    expect(Math.abs(cup.position.x - melon.position.x)).toBeGreaterThan(0.25);
    expect(Math.abs(cup.position.x - cone.position.x)).toBeGreaterThan(0.25);
    expect(
      Math.hypot(cup.position.x - lantern.position.x, cup.position.z - lantern.position.z),
    ).toBeGreaterThan(0.25);
    expect(
      Math.hypot(cup.position.x - fish.position.x, cup.position.z - fish.position.z),
    ).toBeGreaterThan(0.25);
    expect(
      Math.hypot(cup.position.x - slate.position.x, cup.position.z - slate.position.z),
    ).toBeGreaterThan(0.2);
    expect(Math.abs(cup.position.x - stool.position.x)).toBeGreaterThan(1.5);
    expect(
      Math.hypot(cup.position.x - scale.position.x, cup.position.z - scale.position.z),
    ).toBeGreaterThan(0.25);

    const kraft = new Set([0xf4ead8, 0x5a3a22]);
    const colors = hexes(cup);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => kraft.has(c))).toBe(true);
    expect(colors).toContain(0xf4ead8);
    expect(colors).toContain(0x5a3a22);
    expect(colors.every((c) => !isGrey(c))).toBe(true);
    let boxes = 0;
    cup.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (!m.isMesh) return;
      boxes += 1;
      expect(m.geometry.type).toBe("BoxGeometry");
      const g = m.geometry as THREE.BoxGeometry;
      expect(g.parameters.width).toBeLessThan(0.2);
      expect(g.parameters.height).toBeLessThan(0.2);
      expect(g.parameters.depth).toBeLessThan(0.2);
    });
    expect(boxes).toBeGreaterThanOrEqual(2);

    const { stalls } = boot();
    expect(stalls.group.children.length).toBeGreaterThan(0);
    for (const child of stalls.group.children) {
      expect(child.children.filter((c) => c.userData.part === "cup").length).toBe(1);
      expect(child.children.filter((c) => c.userData.part === "stool").length).toBe(1);
      expect(child.children.filter((c) => c.userData.part === "slate").length).toBe(1);
      expect(child.children.filter((c) => c.userData.part === "melon").length).toBe(1);
      expect(child.children.filter((c) => c.userData.part === "cone").length).toBe(1);
    }
  });


  it("puts one tiny kraft PAPER knife on each NPC stall counter", () => {
    const mesh = makeStallMesh({ id: "n-test", use: "farm", island: "north", band: "field" });
    const counter = mesh.children.find((c) => c.userData.part === "counter") as THREE.Mesh;
    const knives = mesh.children.filter((c) => c.userData.part === "knife");
    expect(knives.length).toBe(1);
    const knife = knives[0]!;
    expect(knife.userData.mode).toBe("PAPER");
    expect(knife.userData.paper).toBe(true);
    const box = counter.geometry as THREE.BoxGeometry;
    const counterTop = counter.position.y + box.parameters.height / 2;
    expect(knife.position.y).toBeCloseTo(counterTop, 5);
    expect(knife.position.z).toBeCloseTo(counter.position.z, 5);
    expect(Math.abs(knife.position.x)).toBeLessThan(1.7);

    const cup = mesh.children.find((c) => c.userData.part === "cup")!;
    const stool = mesh.children.find((c) => c.userData.part === "stool")!;
    const melon = mesh.children.find((c) => c.userData.part === "melon")!;
    expect(cup.userData.part).toBe("cup");
    expect(stool.userData.part).toBe("stool");
    expect(melon.userData.part).toBe("melon");
    expect(cup.position.x).toBeCloseTo(0.38, 5);
    expect(cup.position.y).toBeCloseTo(0.9, 5);
    expect(stool.position.x).toBeCloseTo(-2.42, 5);
    expect(melon.position.x).toBeCloseTo(-0.88, 5);
    expect(melon.position.y).toBeCloseTo(0.9, 5);

    const kraft = new Set([0xf4ead8, 0x5a3a22]);
    const colors = hexes(knife);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => kraft.has(c))).toBe(true);
    expect(colors).toContain(0xf4ead8);
    expect(colors).toContain(0x5a3a22);
    expect(colors.every((c) => !isGrey(c))).toBe(true);
    let boxes = 0;
    knife.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (!m.isMesh) return;
      boxes += 1;
      expect(m.geometry.type).toBe("BoxGeometry");
      const g = m.geometry as THREE.BoxGeometry;
      expect(g.parameters.width).toBeLessThan(0.25);
      expect(g.parameters.height).toBeLessThan(0.1);
      expect(g.parameters.depth).toBeLessThan(0.1);
    });
    expect(boxes).toBeGreaterThanOrEqual(2);

    const { stalls } = boot();
    expect(stalls.group.children.length).toBeGreaterThan(0);
    for (const child of stalls.group.children) {
      expect(child.children.filter((c) => c.userData.part === "knife").length).toBe(1);
      expect(child.children.filter((c) => c.userData.part === "cup").length).toBe(1);
      expect(child.children.filter((c) => c.userData.part === "stool").length).toBe(1);
      expect(child.children.filter((c) => c.userData.part === "melon").length).toBe(1);
    }
  });

  it("puts one tiny kraft PAPER napkin on each NPC stall counter", () => {
    const mesh = makeStallMesh({ id: "n-test", use: "farm", island: "north", band: "field" });
    const counter = mesh.children.find((c) => c.userData.part === "counter") as THREE.Mesh;
    const napkins = mesh.children.filter((c) => c.userData.part === "napkin");
    expect(napkins.length).toBe(1);
    const napkin = napkins[0]!;
    expect(napkin.userData.mode).toBe("PAPER");
    expect(napkin.userData.paper).toBe(true);
    const box = counter.geometry as THREE.BoxGeometry;
    const counterTop = counter.position.y + box.parameters.height / 2;
    expect(napkin.position.y).toBeCloseTo(counterTop, 5);
    expect(napkin.position.z).toBeCloseTo(counter.position.z, 5);
    expect(Math.abs(napkin.position.x)).toBeLessThan(1.7);

    const knife = mesh.children.find((c) => c.userData.part === "knife")!;
    const cup = mesh.children.find((c) => c.userData.part === "cup")!;
    const stool = mesh.children.find((c) => c.userData.part === "stool")!;
    const melon = mesh.children.find((c) => c.userData.part === "melon")!;
    const cone = mesh.children.find((c) => c.userData.part === "cone")!;
    expect(knife.userData.part).toBe("knife");
    expect(cup.userData.part).toBe("cup");
    expect(stool.userData.part).toBe("stool");
    expect(melon.userData.part).toBe("melon");
    expect(cone.userData.part).toBe("cone");
    expect(knife.position.x).toBeCloseTo(-0.72, 5);
    expect(knife.position.y).toBeCloseTo(0.9, 5);
    expect(cup.position.x).toBeCloseTo(0.38, 5);
    expect(cup.position.y).toBeCloseTo(0.9, 5);
    expect(stool.position.x).toBeCloseTo(-2.42, 5);
    expect(melon.position.x).toBeCloseTo(-0.88, 5);
    expect(cone.position.x).toBeCloseTo(-0.42, 5);
    expect(Math.abs(napkin.position.x - knife.position.x)).toBeGreaterThan(0.25);
    expect(Math.abs(napkin.position.x - cup.position.x)).toBeGreaterThan(0.2);
    expect(Math.abs(napkin.position.x - stool.position.x)).toBeGreaterThan(1.5);
    expect(Math.abs(napkin.position.x - melon.position.x)).toBeGreaterThan(0.25);
    expect(Math.abs(napkin.position.x - cone.position.x)).toBeGreaterThan(0.25);

    const kraft = new Set([0xf4ead8, 0xe8d7b8]);
    const colors = hexes(napkin);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => kraft.has(c))).toBe(true);
    expect(colors).toContain(0xf4ead8);
    expect(colors).toContain(0xe8d7b8);
    expect(colors.every((c) => !isGrey(c))).toBe(true);
    let boxes = 0;
    napkin.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (!m.isMesh) return;
      boxes += 1;
      expect(m.geometry.type).toBe("BoxGeometry");
      const g = m.geometry as THREE.BoxGeometry;
      expect(g.parameters.width).toBeLessThan(0.2);
      expect(g.parameters.height).toBeLessThan(0.05);
      expect(g.parameters.depth).toBeLessThan(0.2);
    });
    expect(boxes).toBeGreaterThanOrEqual(2);

    const { stalls } = boot();
    expect(stalls.group.children.length).toBeGreaterThan(0);
    for (const child of stalls.group.children) {
      expect(child.children.filter((c) => c.userData.part === "napkin").length).toBe(1);
      expect(child.children.filter((c) => c.userData.part === "knife").length).toBe(1);
      expect(child.children.filter((c) => c.userData.part === "cup").length).toBe(1);
    }
  });

  it("puts one tiny kraft PAPER plate on each NPC stall counter; napkin and knife remain", () => {
    const mesh = makeStallMesh({ id: "n-test", use: "farm", island: "north", band: "field" });
    const counter = mesh.children.find((c) => c.userData.part === "counter") as THREE.Mesh;
    const plates = mesh.children.filter((c) => c.userData.part === "plate");
    expect(plates.length).toBe(1);
    const plate = plates[0]!;
    expect(plate.userData.mode).toBe("PAPER");
    expect(plate.userData.paper).toBe(true);
    const box = counter.geometry as THREE.BoxGeometry;
    const counterTop = counter.position.y + box.parameters.height / 2;
    expect(plate.position.y).toBeCloseTo(counterTop, 5);
    expect(plate.position.z).toBeCloseTo(counter.position.z, 5);
    expect(Math.abs(plate.position.x)).toBeLessThan(1.7);

    const napkin = mesh.children.find((c) => c.userData.part === "napkin")!;
    const knife = mesh.children.find((c) => c.userData.part === "knife")!;
    const cup = mesh.children.find((c) => c.userData.part === "cup")!;
    const stool = mesh.children.find((c) => c.userData.part === "stool")!;
    expect(napkin.userData.part).toBe("napkin");
    expect(knife.userData.part).toBe("knife");
    expect(cup.userData.part).toBe("cup");
    expect(stool.userData.part).toBe("stool");
    expect(napkin.position.x).toBeCloseTo(0.64, 5);
    expect(napkin.position.y).toBeCloseTo(0.9, 5);
    expect(knife.position.x).toBeCloseTo(-0.72, 5);
    expect(knife.position.y).toBeCloseTo(0.9, 5);
    expect(cup.position.x).toBeCloseTo(0.38, 5);
    expect(stool.position.x).toBeCloseTo(-2.42, 5);
    expect(Math.abs(plate.position.x - napkin.position.x)).toBeGreaterThan(0.25);
    expect(Math.abs(plate.position.x - knife.position.x)).toBeGreaterThan(0.25);
    expect(Math.abs(plate.position.x - cup.position.x)).toBeGreaterThan(0.2);
    expect(Math.abs(plate.position.x - stool.position.x)).toBeGreaterThan(1.5);

    const kraft = new Set([0xf4ead8, 0xe8d7b8]);
    const colors = hexes(plate);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => kraft.has(c))).toBe(true);
    expect(colors).toContain(0xf4ead8);
    expect(colors).toContain(0xe8d7b8);
    expect(colors.every((c) => !isGrey(c))).toBe(true);
    let boxes = 0;
    plate.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (!m.isMesh) return;
      boxes += 1;
      expect(m.geometry.type).toBe("BoxGeometry");
      const g = m.geometry as THREE.BoxGeometry;
      expect(g.parameters.width).toBeLessThan(0.2);
      expect(g.parameters.height).toBeLessThan(0.05);
      expect(g.parameters.depth).toBeLessThan(0.2);
    });
    expect(boxes).toBeGreaterThanOrEqual(2);

    const { stalls } = boot();
    expect(stalls.group.children.length).toBeGreaterThan(0);
    for (const child of stalls.group.children) {
      expect(child.children.filter((c) => c.userData.part === "plate").length).toBe(1);
      expect(child.children.filter((c) => c.userData.part === "napkin").length).toBe(1);
      expect(child.children.filter((c) => c.userData.part === "knife").length).toBe(1);
    }
  });

  it("puts one tiny kraft PAPER lemon on each NPC stall counter; plate, napkin, knife, cup, stool remain", () => {
    const mesh = makeStallMesh({ id: "n-test", use: "farm", island: "north", band: "field" });
    const counter = mesh.children.find((c) => c.userData.part === "counter") as THREE.Mesh;
    const lemons = mesh.children.filter((c) => c.userData.part === "lemon");
    expect(lemons.length).toBe(1);
    const lemon = lemons[0]!;
    expect(lemon.userData.mode).toBe("PAPER");
    expect(lemon.userData.paper).toBe(true);
    const box = counter.geometry as THREE.BoxGeometry;
    const counterTop = counter.position.y + box.parameters.height / 2;
    expect(lemon.position.y).toBeCloseTo(counterTop, 5);
    expect(lemon.position.z).toBeCloseTo(counter.position.z, 5);
    expect(Math.abs(lemon.position.x)).toBeLessThan(1.7);

    const plate = mesh.children.find((c) => c.userData.part === "plate")!;
    const napkin = mesh.children.find((c) => c.userData.part === "napkin")!;
    const knife = mesh.children.find((c) => c.userData.part === "knife")!;
    const cup = mesh.children.find((c) => c.userData.part === "cup")!;
    const stool = mesh.children.find((c) => c.userData.part === "stool")!;
    expect(plate.userData.part).toBe("plate");
    expect(napkin.userData.part).toBe("napkin");
    expect(knife.userData.part).toBe("knife");
    expect(cup.userData.part).toBe("cup");
    expect(stool.userData.part).toBe("stool");
    expect(plate.position.x).toBeCloseTo(1.36, 5);
    expect(plate.position.y).toBeCloseTo(0.9, 5);
    expect(napkin.position.x).toBeCloseTo(0.64, 5);
    expect(napkin.position.y).toBeCloseTo(0.9, 5);
    expect(knife.position.x).toBeCloseTo(-0.72, 5);
    expect(knife.position.y).toBeCloseTo(0.9, 5);
    expect(cup.position.x).toBeCloseTo(0.38, 5);
    expect(stool.position.x).toBeCloseTo(-2.42, 5);
    expect(Math.abs(lemon.position.x - plate.position.x)).toBeGreaterThan(0.25);
    expect(Math.abs(lemon.position.x - napkin.position.x)).toBeGreaterThan(0.25);
    expect(Math.abs(lemon.position.x - knife.position.x)).toBeGreaterThan(0.25);
    expect(Math.abs(lemon.position.x - cup.position.x)).toBeGreaterThan(0.2);
    expect(Math.abs(lemon.position.x - stool.position.x)).toBeGreaterThan(1.5);

    const kraft = new Set([0xd4b83a, 0x5f8a32]);
    const colors = hexes(lemon);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => kraft.has(c))).toBe(true);
    expect(colors).toContain(0xd4b83a);
    expect(colors).toContain(0x5f8a32);
    expect(colors.every((c) => !isGrey(c))).toBe(true);
    let boxes = 0;
    lemon.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (!m.isMesh) return;
      boxes += 1;
      expect(m.geometry.type).toBe("BoxGeometry");
      const g = m.geometry as THREE.BoxGeometry;
      expect(g.parameters.width).toBeLessThan(0.2);
      expect(g.parameters.height).toBeLessThan(0.15);
      expect(g.parameters.depth).toBeLessThan(0.2);
    });
    expect(boxes).toBeGreaterThanOrEqual(2);

    const { stalls } = boot();
    expect(stalls.group.children.length).toBeGreaterThan(0);
    for (const child of stalls.group.children) {
      expect(child.children.filter((c) => c.userData.part === "lemon").length).toBe(1);
      expect(child.children.filter((c) => c.userData.part === "plate").length).toBe(1);
      expect(child.children.filter((c) => c.userData.part === "napkin").length).toBe(1);
      expect(child.children.filter((c) => c.userData.part === "knife").length).toBe(1);
      expect(child.children.filter((c) => c.userData.part === "cup").length).toBe(1);
      expect(child.children.filter((c) => c.userData.part === "stool").length).toBe(1);
    }
  });

  it("varies kraft / terracotta / teal canvas stripes across stalls", () => {
    const a = makeStallMesh({ id: "north-street-0", use: "stall", island: "north" });
    const b = makeStallMesh({ id: "south-street-3", use: "stall", island: "south" });
    const c = makeStallMesh({ id: "n-field-1", use: "farm", island: "north", band: "field" });
    const seqA = stripeHexes(a);
    const seqB = stripeHexes(b);
    const seqC = stripeHexes(c);
    expect(seqA).not.toEqual(seqB);
    expect(awningStyleFor({ id: "north-street-0" })).not.toEqual(awningStyleFor({ id: "south-street-3" }));
    const seen = new Set([...seqA, ...seqB, ...seqC]);
    expect(seen.has(0xc45c3a)).toBe(true);
    expect(seen.has(0xf4ead8)).toBe(true);
    expect(seen.has(0x2a7a72)).toBe(true);
    expect([...seen].every((hex) => CLOTH.has(hex))).toBe(true);
  });

  it("farms sell corn; other NPC stalls sell a food good", () => {
    expect(stallGoodFor({ use: "farm", band: "field", id: "a" })).toBe("corn");
    expect(FOOD_GOODS).toContain(stallGoodFor({ use: "stall", band: "street", id: "north-street-0" }));
    expect(stallGoodFor(undefined)).toBe("corn");
    expect(FOOD_GOODS).toContain("corn");
  });

  it("places one PAPER stall on each NPC plot and none on vacant lots", () => {
    const { map, added, stalls } = boot();
    const npc = map.plots.filter((p) => p.owner === "npc");
    expect(npc.length).toBeGreaterThan(0);
    expect(added).toEqual([stalls.group]);
    expect(stalls.group.children.length).toBe(npc.length);
    expect(stalls.group.userData.mode).toBe("PAPER");

    const ids = stalls.group.children.map((c) => c.userData.plotId).sort();
    expect(ids).toEqual(npc.map((p) => p.id).sort());
    for (const child of stalls.group.children) {
      expect(child.userData.kind).toBe(STALL_KIND);
      expect(child.userData.mode).toBe("PAPER");
      expect(FOOD_GOODS).toContain(child.userData.good);
      expect(child.position.y).toBeGreaterThan(0.3);
      const plot = npc.find((p) => p.id === child.userData.plotId)!;
      expect(Math.hypot(child.position.x - plot.x, child.position.z - plot.z)).toBeLessThan(8);
    }

    const vacant = map.plots.filter((p) => !p.owner);
    expect(vacant.length).toBeGreaterThan(0);
    const stallIds = new Set(ids);
    expect(vacant.some((p) => stallIds.has(p.id))).toBe(false);
  });

  it("handleRay returns false when the ray misses, true when it hits a stall", () => {
    const { stalls } = boot();
    expect(stalls.handleRay(missRay())).toBe(false);
    expect(stalls.handleRay(undefined)).toBe(false);

    const stall = stalls.group.children[0]!;
    stall.updateMatrixWorld(true);
    expect(stalls.handleRay(aimAt(stall.position.x, stall.position.y, stall.position.z))).toBe(true);
  });

  it("posts /api/buy for 1 of the stall's good at lastPrice, same body as /market/", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init || {} });
      return {
        json: async () => ({
          ok: true,
          paid: 0.25,
          snapshot: { visitor: { cash: 999.75, stock: { corn: 1 } } },
        }),
      };
    }) as typeof fetch;

    const { map, stalls, statuses, snaps } = boot();
    const land = map as typeof map & { visitor: { cash: number; leases: string[] } };
    land.visitor = { cash: 1000, leases: [] };
    const farm = stalls.group.children.find((c) => c.userData.use === "farm") || stalls.group.children[0]!;
    farm.updateMatrixWorld(true);
    expect(stalls.handleRay(aimAt(farm.position.x, farm.position.y, farm.position.z))).toBe(true);

    await vi.waitFor(() => expect(calls.length).toBe(1));
    expect(calls[0]!.url).toBe("/api/buy");
    expect(calls[0]!.init.method).toBe("POST");
    expect(calls[0]!.init.headers).toEqual({ "content-type": "application/json" });
    const body = JSON.parse(String(calls[0]!.init.body));
    expect(body.qty).toBe(1);
    expect(body.good).toBe(farm.userData.good);
    expect(FOOD_GOODS).toContain(body.good);
    expect(calls.some((c) => c.url.includes("lease") || c.url.includes("develop") || c.url.includes("wallet"))).toBe(
      false,
    );
    await vi.waitFor(() => expect(statuses.some((s) => s.includes("Bought 1"))).toBe(true));
    expect(statuses[statuses.length - 1]).toContain("PAPER");
    expect(land.visitor.cash).toBe(999.75);
    expect(snaps.length).toBeGreaterThan(0);
  });

  it("on a failed fill, still returns true and reports the reason — no lease/develop", async () => {
    const calls: { url: string }[] = [];
    globalThis.fetch = (async (url: string | URL | Request) => {
      calls.push({ url: String(url) });
      return {
        json: async () => ({
          ok: false,
          reason: "no_cash",
          snapshot: { visitor: { cash: 0 } },
        }),
      };
    }) as typeof fetch;

    const { stalls, statuses } = boot();
    const stall = stalls.group.children[0]!;
    stall.updateMatrixWorld(true);
    expect(stalls.handleRay(aimAt(stall.position.x, stall.position.y, stall.position.z))).toBe(true);
    await vi.waitFor(() => expect(calls.length).toBe(1));
    expect(calls[0]!.url).toBe("/api/buy");
    await vi.waitFor(() => expect(statuses.join(" ")).toContain("no_cash"));
  });
});
