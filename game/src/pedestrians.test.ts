import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createLandBoard, distToPaved, heightAt, ISLANDS } from "./land.ts";
import { onPublicQuay } from "../public/harbour/trees.js";
import {
  LAND_MIN_M,
  MAX_PEOPLE,
  SPAWN_QUAY_ALONG,
  SPAWN_QUAY_SCALE,
  VERGE_OFFSET_M,
  WALK_SPEED_M_S,
  makePaperPerson,
  makePedestrians,
} from "../public/harbour/pedestrians.js";
import { spawnLookAtOffset } from "../public/harbour/roads.js";
import { HOME_Z } from "../public/harbour/ferry.js";

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

function partsOf(root: THREE.Object3D) {
  const parts = new Map<string, number>();
  root.traverse((obj) => {
    const name = obj.userData?.part as string | undefined;
    if (name) parts.set(name, (parts.get(name) ?? 0) + 1);
  });
  return parts;
}

function spawn(player?: THREE.Object3D) {
  const map = createLandBoard();
  const added: THREE.Object3D[] = [];
  const scene = { add(obj: THREE.Object3D) { added.push(obj); } };
  const body = player ?? new THREE.Object3D();
  if (!player) body.position.set(ISLANDS.north.port.x, 2.2, ISLANDS.north.port.z - 8);
  const before = body.position.clone();
  const result = makePedestrians(map, {
    scene,
    specOf: (id: "north" | "south") => ISLANDS[id],
    heightAt,
    getPlayer: () => body,
  });
  return { map, added, body, before, ...result };
}

describe("harbour PAPER pedestrians", () => {
  it("caps a handful of people and keeps the verge offset just off the tarmac", () => {
    expect(MAX_PEOPLE).toBeLessThanOrEqual(12);
    expect(MAX_PEOPLE).toBeGreaterThanOrEqual(8);
    expect(VERGE_OFFSET_M).toBeCloseTo(4, 5);
    expect(LAND_MIN_M).toBe(0.4);
    expect(WALK_SPEED_M_S).toBeGreaterThan(0.4);
    expect(WALK_SPEED_M_S).toBeLessThan(1.6);
  });

  it("builds a low-poly wood/cloth figure with the same parts as the player", () => {
    const figure = makePaperPerson(0);
    expect(figure.userData.mode).toBe("PAPER");
    expect(figure.userData.kind).toBe("pedestrian");
    const parts = partsOf(figure);
    expect(parts.get("shoe")).toBe(2);
    expect(parts.get("boot")).toBe(2);
    expect(parts.get("leg")).toBe(2);
    expect(parts.get("arm")).toBe(2);
    expect(parts.get("body")).toBe(1);
    expect(parts.get("belt")).toBe(1);
    expect(parts.get("head")).toBe(1);
    expect(parts.get("hair")).toBe(1);
    const colors = hexes(figure);
    expect(colors).toContain(0xf2d2a8);
    expect(colors).toContain(0xf4ead8);
    expect(colors).toContain(0x6e4a32);
    expect(colors).toContain(0x3d2a1c);
    expect(colors).toContain(0x4a3220);
    expect(colors).toContain(0x7a2e22);
    expect(colors.every(isGrey)).toBe(false);
    let boxes = 0;
    figure.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      boxes += 1;
      expect(mesh.geometry.type).toBe("BoxGeometry");
      expect((mesh.material as THREE.MeshLambertMaterial).type).toBe("MeshLambertMaterial");
    });
    expect(boxes).toBe(12);
  });

  it("gives walkers a few original-palette cloth colours, not one cream clone", () => {
    function partHex(root: THREE.Object3D, part: string) {
      let hex = -1;
      root.traverse((obj) => {
        if (obj.userData?.part !== part) return;
        const mat = (obj as THREE.Mesh).material as THREE.MeshLambertMaterial;
        if (mat?.color) hex = mat.color.getHex();
      });
      return hex;
    }
    const shirts = [0, 1, 2, 3, 4, 5].map((s) => partHex(makePaperPerson(s), "body"));
    expect(shirts[0]).toBe(0xf4ead8);
    expect(new Set(shirts).size).toBe(shirts.length);
    expect(shirts).toContain(0xc45c3a);
    expect(shirts).toContain(0x4a6e8a);
    expect(shirts).toContain(0x6a8f44);
    expect(shirts.every(isGrey)).toBe(false);

    const { people } = spawn();
    const liveShirts = new Set(people.map((p) => partHex(p.mesh, "body")));
    expect(liveShirts.size).toBeGreaterThanOrEqual(5);
    expect(liveShirts.has(0xf4ead8)).toBe(true);
  });

  it("plants people on the north quay and the paved verge, on land, off the tarmac, out of the water", () => {
    const { added, root, people, body, before } = spawn();
    expect(added).toEqual([root]);
    expect(people.length).toBeGreaterThanOrEqual(8);
    expect(people.length).toBeLessThanOrEqual(MAX_PEOPLE);
    expect(root.children.length).toBe(people.length);

    const quay = people.filter((p) => p.lane === "quay");
    const verge = people.filter((p) => p.lane === "verge");
    expect(quay.length).toBeGreaterThanOrEqual(4);
    expect(verge.length).toBeGreaterThanOrEqual(4);

    const port = ISLANDS.north.port;
    const spec = ISLANDS.north;
    expect(people.every((p) => p.island === "north")).toBe(true);

    const nearQuay = quay.filter((p) => {
      const { x, z } = p.mesh.position;
      return Math.hypot(x - port.x, z - port.z) < 80 && onPublicQuay(spec, x, z);
    });
    expect(nearQuay.length).toBeGreaterThanOrEqual(3);

    for (const p of people) {
      const { x, y, z } = p.mesh.position;
      expect(y).toBeGreaterThan(LAND_MIN_M);
      expect(heightAt(spec, x, z)).toBeGreaterThan(LAND_MIN_M);
      expect(heightAt(spec, x, z)).toBeCloseTo(y, 5);
      expect(body.children).not.toContain(p.mesh);
    }

    for (const p of quay) {
      const { x, z } = p.mesh.position;
      expect(onPublicQuay(spec, x, z)).toBe(true);
      expect(Math.abs(x - port.x)).toBeCloseTo(VERGE_OFFSET_M, 5);
    }

    for (const p of verge) {
      const { x, z } = p.mesh.position;
      expect(distToPaved(spec, x, z)).toBeCloseTo(VERGE_OFFSET_M, 1);
      expect(onPublicQuay(spec, x, z)).toBe(false);
    }

    expect(body.position.x).toBe(before.x);
    expect(body.position.y).toBe(before.y);
    expect(body.position.z).toBe(before.z);
  });

  it("tick walks them slowly and never writes the player", () => {
    const player = new THREE.Object3D();
    player.position.set(12, 3.4, -6958);
    const { people, tick, body, before } = spawn(player);
    const origin = people.map((p) => p.mesh.position.clone());

    tick(2);

    expect(body.position.x).toBe(before.x);
    expect(body.position.y).toBe(before.y);
    expect(body.position.z).toBe(before.z);
    expect(player.position.x).toBe(12);
    expect(player.position.y).toBe(3.4);
    expect(player.position.z).toBe(-6958);
    expect(player.children.length).toBe(0);

    const spec = ISLANDS.north;
    let moved = 0;
    for (let i = 0; i < people.length; i++) {
      const now = people[i]!.mesh.position;
      const dist = Math.hypot(now.x - origin[i]!.x, now.z - origin[i]!.z);
      if (dist > 0.6) moved += 1;
      expect(dist).toBeLessThan(WALK_SPEED_M_S * 2 * 1.5 + 0.2);
      expect(heightAt(spec, now.x, now.z)).toBeGreaterThan(LAND_MIN_M);
      if (people[i]!.lane === "verge") {
        expect(distToPaved(spec, now.x, now.z)).toBeCloseTo(VERGE_OFFSET_M, 1);
      }
      if (people[i]!.lane === "quay") {
        expect(onPublicQuay(spec, now.x, now.z)).toBe(true);
      }
    }
    expect(moved).toBe(people.length);
  });

  it("ties a kraft neckerchief on quay walkers, not verge strollers", () => {
    const figure = makePaperPerson(0);
    expect(partsOf(figure).get("kerchief")).toBeUndefined();

    const { people } = spawn();
    const quay = people.filter((p) => p.lane === "quay");
    const verge = people.filter((p) => p.lane === "verge");
    expect(quay.length).toBeGreaterThanOrEqual(4);

    for (const p of quay) {
      const parts = partsOf(p.mesh);
      expect(parts.get("kerchief")).toBeGreaterThanOrEqual(1);
      p.mesh.traverse((obj) => {
        if (obj.userData?.part !== "kerchief") return;
        const mesh = obj as THREE.Mesh;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        const hex = (mesh.material as THREE.MeshLambertMaterial).color.getHex();
        expect(isGrey(hex)).toBe(false);
        expect(hex).toBe(0xc4b496);
        expect(mesh.position.y).toBeGreaterThan(1.3);
        expect(mesh.position.y).toBeLessThan(1.55);
      });
    }

    for (const p of verge) {
      expect(partsOf(p.mesh).get("kerchief")).toBeUndefined();
    }
  });

  it("puts kraft work gloves on quay walkers' wrists, not verge strollers", () => {
    const figure = makePaperPerson(0);
    expect(partsOf(figure).get("glove")).toBeUndefined();

    const { people } = spawn();
    const quay = people.filter((p) => p.lane === "quay");
    const verge = people.filter((p) => p.lane === "verge");
    expect(quay.length).toBeGreaterThanOrEqual(4);

    for (const p of quay) {
      const parts = partsOf(p.mesh);
      expect(parts.get("glove")).toBe(2);
      p.mesh.traverse((obj) => {
        if (obj.userData?.part !== "glove") return;
        const mesh = obj as THREE.Mesh;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        const hex = (mesh.material as THREE.MeshLambertMaterial).color.getHex();
        expect(isGrey(hex)).toBe(false);
        expect(hex).toBe(0xc4b496);
        expect(mesh.position.y).toBeGreaterThan(0.65);
        expect(mesh.position.y).toBeLessThan(0.95);
        expect(Math.abs(mesh.position.x)).toBeCloseTo(0.32, 5);
      });
    }

    for (const p of verge) {
      expect(partsOf(p.mesh).get("glove")).toBeUndefined();
    }
  });

  it("hangs a kraft PAPER lunch tin on quay walkers, not verge strollers", () => {
    const kraftTin = new Set([0xc4b496, 0xc4a574, 0x4a3220]);
    const figure = makePaperPerson(0);
    expect(partsOf(figure).get("tin")).toBeUndefined();

    const { people } = spawn();
    const quay = people.filter((p) => p.lane === "quay");
    const verge = people.filter((p) => p.lane === "verge");
    expect(quay.length).toBeGreaterThanOrEqual(4);

    for (const p of quay) {
      const parts = partsOf(p.mesh);
      expect(parts.get("tin")).toBeGreaterThanOrEqual(1);
      expect(parts.get("shoe")).toBe(2);
      expect(parts.get("hat")).toBe(2);
      expect(parts.get("apron")).toBe(1);
      expect(parts.get("satchel")).toBe(1);
      expect(parts.get("glove")).toBe(2);
      expect(parts.get("boot")).toBe(2);
      p.mesh.traverse((obj) => {
        if (obj.userData?.part !== "tin") return;
        const mesh = obj as THREE.Mesh;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect((mesh.material as THREE.MeshLambertMaterial).type).toBe("MeshLambertMaterial");
        const hex = (mesh.material as THREE.MeshLambertMaterial).color.getHex();
        expect(isGrey(hex)).toBe(false);
        expect(kraftTin.has(hex)).toBe(true);
        const { width, height, depth } = (mesh.geometry as THREE.BoxGeometry).parameters;
        expect(width).toBeLessThan(0.22);
        expect(height).toBeLessThan(0.18);
        expect(depth).toBeLessThan(0.22);
        expect(mesh.position.y).toBeGreaterThan(0.55);
        expect(mesh.position.y).toBeLessThan(0.95);
        expect(Math.abs(mesh.position.x)).toBeGreaterThan(0.28);
      });
    }

    for (const p of verge) {
      expect(partsOf(p.mesh).get("tin")).toBeUndefined();
    }
  });

  it("pins a kraft PAPER hat pin on quay walkers, not verge strollers", () => {
    const kraftPin = new Set([0xc4b496, 0xc4a574, 0x4a3220]);
    const figure = makePaperPerson(0);
    expect(partsOf(figure).get("pin")).toBeUndefined();

    const { people } = spawn();
    const quay = people.filter((p) => p.lane === "quay");
    const verge = people.filter((p) => p.lane === "verge");
    expect(quay.length).toBeGreaterThanOrEqual(4);

    for (const p of quay) {
      const parts = partsOf(p.mesh);
      expect(parts.get("pin")).toBeGreaterThanOrEqual(1);
      expect(parts.get("tin")).toBeGreaterThanOrEqual(1);
      expect(parts.get("shoe")).toBe(2);
      expect(parts.get("hat")).toBe(2);
      expect(parts.get("apron")).toBe(1);
      expect(parts.get("satchel")).toBe(1);
      expect(parts.get("glove")).toBe(2);
      expect(parts.get("boot")).toBe(2);
      p.mesh.traverse((obj) => {
        if (obj.userData?.part !== "pin") return;
        const mesh = obj as THREE.Mesh;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect((mesh.material as THREE.MeshLambertMaterial).type).toBe("MeshLambertMaterial");
        const hex = (mesh.material as THREE.MeshLambertMaterial).color.getHex();
        expect(isGrey(hex)).toBe(false);
        expect(kraftPin.has(hex)).toBe(true);
        const { width, height, depth } = (mesh.geometry as THREE.BoxGeometry).parameters;
        expect(width).toBeLessThan(0.16);
        expect(height).toBeLessThan(0.12);
        expect(depth).toBeLessThan(0.16);
        expect(mesh.position.y).toBeGreaterThan(1.8);
        expect(mesh.position.y).toBeLessThan(2.05);
      });
    }

    for (const p of verge) {
      expect(partsOf(p.mesh).get("pin")).toBeUndefined();
    }
  });

  it("hangs a kraft PAPER basket on quay walkers; tin and pin stay", () => {
    const kraftBasket = new Set([0xc4b496, 0xc4a574, 0x4a3220]);
    const figure = makePaperPerson(0);
    expect(partsOf(figure).get("basket")).toBeUndefined();
    expect(partsOf(figure).get("tin")).toBeUndefined();
    expect(partsOf(figure).get("pin")).toBeUndefined();

    const { people } = spawn();
    const quay = people.filter((p) => p.lane === "quay");
    const verge = people.filter((p) => p.lane === "verge");
    expect(quay.length).toBeGreaterThanOrEqual(4);

    for (const p of quay) {
      const parts = partsOf(p.mesh);
      expect(parts.get("basket")).toBeGreaterThanOrEqual(1);
      expect(parts.get("tin")).toBeGreaterThanOrEqual(1);
      expect(parts.get("pin")).toBeGreaterThanOrEqual(1);
      expect(parts.get("shoe")).toBe(2);
      expect(parts.get("hat")).toBe(2);
      expect(parts.get("apron")).toBe(1);
      expect(parts.get("satchel")).toBe(1);
      expect(parts.get("glove")).toBe(2);
      expect(parts.get("boot")).toBe(2);
      p.mesh.traverse((obj) => {
        if (obj.userData?.part !== "basket") return;
        const mesh = obj as THREE.Mesh;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect((mesh.material as THREE.MeshLambertMaterial).type).toBe("MeshLambertMaterial");
        const hex = (mesh.material as THREE.MeshLambertMaterial).color.getHex();
        expect(isGrey(hex)).toBe(false);
        expect(kraftBasket.has(hex)).toBe(true);
        const { width, height, depth } = (mesh.geometry as THREE.BoxGeometry).parameters;
        expect(width).toBeLessThan(0.22);
        expect(height).toBeLessThan(0.18);
        expect(depth).toBeLessThan(0.22);
        expect(mesh.position.y).toBeGreaterThan(0.45);
        expect(mesh.position.y).toBeLessThan(0.75);
        expect(Math.abs(mesh.position.x)).toBeGreaterThan(0.24);
      });
    }

    for (const p of verge) {
      expect(partsOf(p.mesh).get("basket")).toBeUndefined();
    }
  });

  it("sits a tiny kraft PAPER loaf on quay walkers; basket and tin remain", () => {
    const kraftLoaf = new Set([0xc4b496, 0xc4a574, 0x4a3220]);
    const figure = makePaperPerson(0);
    expect(partsOf(figure).get("loaf")).toBeUndefined();
    expect(partsOf(figure).get("basket")).toBeUndefined();
    expect(partsOf(figure).get("tin")).toBeUndefined();

    const { people } = spawn();
    const quay = people.filter((p) => p.lane === "quay");
    const verge = people.filter((p) => p.lane === "verge");
    expect(quay.length).toBeGreaterThanOrEqual(4);

    for (const p of quay) {
      const parts = partsOf(p.mesh);
      expect(parts.get("loaf")).toBeGreaterThanOrEqual(1);
      expect(parts.get("basket")).toBeGreaterThanOrEqual(1);
      expect(parts.get("tin")).toBeGreaterThanOrEqual(1);
      p.mesh.traverse((obj) => {
        if (obj.userData?.part !== "loaf") return;
        const mesh = obj as THREE.Mesh;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect((mesh.material as THREE.MeshLambertMaterial).type).toBe("MeshLambertMaterial");
        const hex = (mesh.material as THREE.MeshLambertMaterial).color.getHex();
        expect(isGrey(hex)).toBe(false);
        expect(kraftLoaf.has(hex)).toBe(true);
        const { width, height, depth } = (mesh.geometry as THREE.BoxGeometry).parameters;
        expect(width).toBeLessThan(0.18);
        expect(height).toBeLessThan(0.14);
        expect(depth).toBeLessThan(0.18);
        expect(mesh.position.y).toBeGreaterThan(0.55);
        expect(mesh.position.y).toBeLessThan(0.8);
        expect(Math.abs(mesh.position.x)).toBeGreaterThan(0.24);
        expect(mesh.position.distanceTo(new THREE.Vector3(-0.32, 0.58, 0.2))).toBeGreaterThan(0.04);
        expect(mesh.position.distanceTo(new THREE.Vector3(-0.38, 0.72, 0.08))).toBeGreaterThan(0.08);
        expect(mesh.position.distanceTo(new THREE.Vector3(0.18, 1.9, 0.16))).toBeGreaterThan(0.8);
      });
    }

    for (const p of verge) {
      expect(partsOf(p.mesh).get("loaf")).toBeUndefined();
    }
  });

  it("carries a tiny kraft PAPER parcel on quay walkers; tin, pin, basket, loaf stay", () => {
    const kraftParcel = new Set([0xc4b496, 0xc4a574, 0x4a3220]);
    const figure = makePaperPerson(0);
    expect(partsOf(figure).get("parcel")).toBeUndefined();
    expect(partsOf(figure).get("tin")).toBeUndefined();
    expect(partsOf(figure).get("pin")).toBeUndefined();
    expect(partsOf(figure).get("basket")).toBeUndefined();
    expect(partsOf(figure).get("loaf")).toBeUndefined();

    const { people } = spawn();
    const quay = people.filter((p) => p.lane === "quay");
    const verge = people.filter((p) => p.lane === "verge");
    expect(quay.length).toBeGreaterThanOrEqual(4);

    for (const p of quay) {
      const parts = partsOf(p.mesh);
      expect(parts.get("parcel")).toBeGreaterThanOrEqual(1);
      expect(parts.get("tin")).toBeGreaterThanOrEqual(1);
      expect(parts.get("pin")).toBeGreaterThanOrEqual(1);
      expect(parts.get("basket")).toBeGreaterThanOrEqual(1);
      expect(parts.get("loaf")).toBeGreaterThanOrEqual(1);
      expect(parts.get("glove")).toBe(2);
      expect(parts.get("boot")).toBe(2);
      p.mesh.traverse((obj) => {
        if (obj.userData?.part !== "parcel") return;
        const mesh = obj as THREE.Mesh;
        expect(mesh.userData.mode).toBe("PAPER");
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect((mesh.material as THREE.MeshLambertMaterial).type).toBe("MeshLambertMaterial");
        const hex = (mesh.material as THREE.MeshLambertMaterial).color.getHex();
        expect(isGrey(hex)).toBe(false);
        expect(kraftParcel.has(hex)).toBe(true);
        const { width, height, depth } = (mesh.geometry as THREE.BoxGeometry).parameters;
        expect(width).toBeLessThan(0.18);
        expect(height).toBeLessThan(0.14);
        expect(depth).toBeLessThan(0.18);
        expect(mesh.position.y).toBeGreaterThan(0.45);
        expect(mesh.position.y).toBeLessThan(0.75);
        expect(Math.abs(mesh.position.x)).toBeGreaterThan(0.24);
        expect(mesh.position.distanceTo(new THREE.Vector3(-0.32, 0.58, 0.2))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(-0.32, 0.66, 0.22))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(-0.38, 0.72, 0.08))).toBeGreaterThan(0.4);
      });
    }

    for (const p of verge) {
      expect(partsOf(p.mesh).get("parcel")).toBeUndefined();
    }
  });

  it("carries a tiny kraft PAPER flask on quay walkers; tin, pin, basket, loaf, parcel stay", () => {
    const kraftFlask = new Set([0xc4b496, 0xc4a574, 0x4a3220]);
    const figure = makePaperPerson(0);
    expect(partsOf(figure).get("flask")).toBeUndefined();
    expect(partsOf(figure).get("tin")).toBeUndefined();
    expect(partsOf(figure).get("pin")).toBeUndefined();
    expect(partsOf(figure).get("basket")).toBeUndefined();
    expect(partsOf(figure).get("loaf")).toBeUndefined();
    expect(partsOf(figure).get("parcel")).toBeUndefined();

    const { people } = spawn();
    const quay = people.filter((p) => p.lane === "quay");
    const verge = people.filter((p) => p.lane === "verge");
    expect(quay.length).toBeGreaterThanOrEqual(4);

    for (const p of quay) {
      const parts = partsOf(p.mesh);
      expect(parts.get("flask")).toBeGreaterThanOrEqual(1);
      expect(parts.get("tin")).toBeGreaterThanOrEqual(1);
      expect(parts.get("pin")).toBeGreaterThanOrEqual(1);
      expect(parts.get("basket")).toBeGreaterThanOrEqual(1);
      expect(parts.get("loaf")).toBeGreaterThanOrEqual(1);
      expect(parts.get("parcel")).toBeGreaterThanOrEqual(1);
      expect(parts.get("glove")).toBe(2);
      expect(parts.get("boot")).toBe(2);
      p.mesh.traverse((obj) => {
        if (obj.userData?.part !== "flask") return;
        const mesh = obj as THREE.Mesh;
        expect(mesh.userData.mode).toBe("PAPER");
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect((mesh.material as THREE.MeshLambertMaterial).type).toBe("MeshLambertMaterial");
        const hex = (mesh.material as THREE.MeshLambertMaterial).color.getHex();
        expect(isGrey(hex)).toBe(false);
        expect(kraftFlask.has(hex)).toBe(true);
        const { width, height, depth } = (mesh.geometry as THREE.BoxGeometry).parameters;
        expect(width).toBeLessThan(0.18);
        expect(height).toBeLessThan(0.18);
        expect(depth).toBeLessThan(0.18);
        expect(mesh.position.y).toBeGreaterThan(0.7);
        expect(mesh.position.y).toBeLessThan(1.05);
        expect(Math.abs(mesh.position.x)).toBeGreaterThan(0.28);
        expect(mesh.position.distanceTo(new THREE.Vector3(-0.38, 0.72, 0.08))).toBeGreaterThan(0.08);
        expect(mesh.position.distanceTo(new THREE.Vector3(0.32, 0.58, 0.2))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(-0.32, 0.58, 0.2))).toBeGreaterThan(0.2);
      });
    }

    for (const p of verge) {
      expect(partsOf(p.mesh).get("flask")).toBeUndefined();
    }
  });

  it("carries a tiny kraft PAPER bundle on quay walkers; tin, pin, basket, loaf, parcel, flask stay", () => {
    const kraftBundle = new Set([0xc4b496, 0xc4a574, 0x4a3220]);
    const figure = makePaperPerson(0);
    expect(partsOf(figure).get("bundle")).toBeUndefined();
    expect(partsOf(figure).get("tin")).toBeUndefined();
    expect(partsOf(figure).get("pin")).toBeUndefined();
    expect(partsOf(figure).get("basket")).toBeUndefined();
    expect(partsOf(figure).get("loaf")).toBeUndefined();
    expect(partsOf(figure).get("parcel")).toBeUndefined();
    expect(partsOf(figure).get("flask")).toBeUndefined();

    const { people } = spawn();
    const quay = people.filter((p) => p.lane === "quay");
    const verge = people.filter((p) => p.lane === "verge");
    expect(quay.length).toBeGreaterThanOrEqual(4);

    for (const p of quay) {
      const parts = partsOf(p.mesh);
      expect(parts.get("bundle")).toBeGreaterThanOrEqual(1);
      expect(parts.get("tin")).toBeGreaterThanOrEqual(1);
      expect(parts.get("pin")).toBeGreaterThanOrEqual(1);
      expect(parts.get("basket")).toBeGreaterThanOrEqual(1);
      expect(parts.get("loaf")).toBeGreaterThanOrEqual(1);
      expect(parts.get("parcel")).toBeGreaterThanOrEqual(1);
      expect(parts.get("flask")).toBeGreaterThanOrEqual(1);
      expect(parts.get("glove")).toBe(2);
      expect(parts.get("boot")).toBe(2);
      p.mesh.traverse((obj) => {
        if (obj.userData?.part !== "bundle") return;
        const mesh = obj as THREE.Mesh;
        expect(mesh.userData.mode).toBe("PAPER");
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect((mesh.material as THREE.MeshLambertMaterial).type).toBe("MeshLambertMaterial");
        const hex = (mesh.material as THREE.MeshLambertMaterial).color.getHex();
        expect(isGrey(hex)).toBe(false);
        expect(kraftBundle.has(hex)).toBe(true);
        const { width, height, depth } = (mesh.geometry as THREE.BoxGeometry).parameters;
        expect(width).toBeLessThan(0.18);
        expect(height).toBeLessThan(0.18);
        expect(depth).toBeLessThan(0.18);
        expect(mesh.position.y).toBeGreaterThan(0.7);
        expect(mesh.position.y).toBeLessThan(1.05);
        expect(Math.abs(mesh.position.x)).toBeGreaterThan(0.28);
        expect(mesh.position.distanceTo(new THREE.Vector3(-0.38, 0.86, 0.16))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(0.32, 0.58, 0.2))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(-0.32, 0.66, 0.22))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(-0.32, 0.58, 0.2))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(-0.38, 0.72, 0.08))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(0.18, 1.9, 0.16))).toBeGreaterThan(0.8);
      });
    }

    for (const p of verge) {
      expect(partsOf(p.mesh).get("bundle")).toBeUndefined();
    }
  });

  it("carries a tiny kraft PAPER can on quay walkers; tin, pin, basket, loaf, parcel, flask, bundle stay", () => {
    const kraftCan = new Set([0xc4b496, 0xc4a574, 0x4a3220]);
    const figure = makePaperPerson(0);
    expect(partsOf(figure).get("can")).toBeUndefined();
    expect(partsOf(figure).get("tin")).toBeUndefined();
    expect(partsOf(figure).get("pin")).toBeUndefined();
    expect(partsOf(figure).get("basket")).toBeUndefined();
    expect(partsOf(figure).get("loaf")).toBeUndefined();
    expect(partsOf(figure).get("parcel")).toBeUndefined();
    expect(partsOf(figure).get("flask")).toBeUndefined();
    expect(partsOf(figure).get("bundle")).toBeUndefined();

    const { people } = spawn();
    const quay = people.filter((p) => p.lane === "quay");
    const verge = people.filter((p) => p.lane === "verge");
    expect(quay.length).toBeGreaterThanOrEqual(4);

    for (const p of quay) {
      const parts = partsOf(p.mesh);
      expect(parts.get("can")).toBeGreaterThanOrEqual(1);
      expect(parts.get("tin")).toBeGreaterThanOrEqual(1);
      expect(parts.get("pin")).toBeGreaterThanOrEqual(1);
      expect(parts.get("basket")).toBeGreaterThanOrEqual(1);
      expect(parts.get("loaf")).toBeGreaterThanOrEqual(1);
      expect(parts.get("parcel")).toBeGreaterThanOrEqual(1);
      expect(parts.get("flask")).toBeGreaterThanOrEqual(1);
      expect(parts.get("bundle")).toBeGreaterThanOrEqual(1);
      expect(parts.get("glove")).toBe(2);
      expect(parts.get("boot")).toBe(2);
      p.mesh.traverse((obj) => {
        if (obj.userData?.part !== "can") return;
        const mesh = obj as THREE.Mesh;
        expect(mesh.userData.mode).toBe("PAPER");
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect((mesh.material as THREE.MeshLambertMaterial).type).toBe("MeshLambertMaterial");
        const hex = (mesh.material as THREE.MeshLambertMaterial).color.getHex();
        expect(isGrey(hex)).toBe(false);
        expect(kraftCan.has(hex)).toBe(true);
        const { width, height, depth } = (mesh.geometry as THREE.BoxGeometry).parameters;
        expect(width).toBeLessThan(0.18);
        expect(height).toBeLessThan(0.18);
        expect(depth).toBeLessThan(0.18);
        expect(mesh.position.y).toBeGreaterThan(0.55);
        expect(mesh.position.y).toBeLessThan(0.95);
        expect(Math.abs(mesh.position.x)).toBeGreaterThan(0.28);
        expect(mesh.position.distanceTo(new THREE.Vector3(0.38, 0.86, -0.16))).toBeGreaterThan(0.12);
        expect(mesh.position.distanceTo(new THREE.Vector3(-0.38, 0.86, 0.16))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(0.32, 0.58, 0.2))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(-0.32, 0.66, 0.22))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(-0.32, 0.58, 0.2))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(-0.38, 0.72, 0.08))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(0.18, 1.9, 0.16))).toBeGreaterThan(0.8);
      });
    }

    for (const p of verge) {
      expect(partsOf(p.mesh).get("can")).toBeUndefined();
    }
  });

  it("carries a tiny kraft PAPER match on quay walkers; tin, pin, basket, loaf, parcel, flask, bundle, can stay", () => {
    const kraftMatch = new Set([0xc4b496, 0xc4a574, 0x4a3220]);
    const figure = makePaperPerson(0);
    expect(partsOf(figure).get("match")).toBeUndefined();
    expect(partsOf(figure).get("tin")).toBeUndefined();
    expect(partsOf(figure).get("pin")).toBeUndefined();
    expect(partsOf(figure).get("basket")).toBeUndefined();
    expect(partsOf(figure).get("loaf")).toBeUndefined();
    expect(partsOf(figure).get("parcel")).toBeUndefined();
    expect(partsOf(figure).get("flask")).toBeUndefined();
    expect(partsOf(figure).get("bundle")).toBeUndefined();
    expect(partsOf(figure).get("can")).toBeUndefined();

    const { people } = spawn();
    const quay = people.filter((p) => p.lane === "quay");
    const verge = people.filter((p) => p.lane === "verge");
    expect(quay.length).toBeGreaterThanOrEqual(4);

    for (const p of quay) {
      const parts = partsOf(p.mesh);
      expect(parts.get("match")).toBeGreaterThanOrEqual(1);
      expect(parts.get("tin")).toBeGreaterThanOrEqual(1);
      expect(parts.get("pin")).toBeGreaterThanOrEqual(1);
      expect(parts.get("basket")).toBeGreaterThanOrEqual(1);
      expect(parts.get("loaf")).toBeGreaterThanOrEqual(1);
      expect(parts.get("parcel")).toBeGreaterThanOrEqual(1);
      expect(parts.get("flask")).toBeGreaterThanOrEqual(1);
      expect(parts.get("bundle")).toBeGreaterThanOrEqual(1);
      expect(parts.get("can")).toBeGreaterThanOrEqual(1);
      expect(parts.get("glove")).toBe(2);
      expect(parts.get("boot")).toBe(2);
      p.mesh.traverse((obj) => {
        if (obj.userData?.part !== "match") return;
        const mesh = obj as THREE.Mesh;
        expect(mesh.userData.mode).toBe("PAPER");
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect((mesh.material as THREE.MeshLambertMaterial).type).toBe("MeshLambertMaterial");
        const hex = (mesh.material as THREE.MeshLambertMaterial).color.getHex();
        expect(isGrey(hex)).toBe(false);
        expect(kraftMatch.has(hex)).toBe(true);
        const { width, height, depth } = (mesh.geometry as THREE.BoxGeometry).parameters;
        expect(width).toBeLessThan(0.18);
        expect(height).toBeLessThan(0.18);
        expect(depth).toBeLessThan(0.18);
        expect(mesh.position.y).toBeGreaterThan(0.4);
        expect(mesh.position.y).toBeLessThan(0.8);
        expect(Math.abs(mesh.position.x)).toBeGreaterThan(0.28);
        expect(mesh.position.distanceTo(new THREE.Vector3(0.38, 0.70, -0.28))).toBeGreaterThan(0.12);
        expect(mesh.position.distanceTo(new THREE.Vector3(0.38, 0.86, -0.16))).toBeGreaterThan(0.12);
        expect(mesh.position.distanceTo(new THREE.Vector3(-0.38, 0.86, 0.16))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(0.32, 0.58, 0.2))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(-0.32, 0.66, 0.22))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(-0.32, 0.58, 0.2))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(-0.38, 0.72, 0.08))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(0.18, 1.9, 0.16))).toBeGreaterThan(0.8);
      });
    }

    for (const p of verge) {
      expect(partsOf(p.mesh).get("match")).toBeUndefined();
    }
  });

  it("carries a tiny kraft PAPER pipe on quay walkers; tin, pin, basket, loaf, parcel, flask, bundle, can, match stay", () => {
    const kraftPipe = new Set([0xc4b496, 0xc4a574, 0x4a3220]);
    const figure = makePaperPerson(0);
    expect(partsOf(figure).get("pipe")).toBeUndefined();
    expect(partsOf(figure).get("tin")).toBeUndefined();
    expect(partsOf(figure).get("pin")).toBeUndefined();
    expect(partsOf(figure).get("basket")).toBeUndefined();
    expect(partsOf(figure).get("loaf")).toBeUndefined();
    expect(partsOf(figure).get("parcel")).toBeUndefined();
    expect(partsOf(figure).get("flask")).toBeUndefined();
    expect(partsOf(figure).get("bundle")).toBeUndefined();
    expect(partsOf(figure).get("can")).toBeUndefined();
    expect(partsOf(figure).get("match")).toBeUndefined();

    const { people } = spawn();
    const quay = people.filter((p) => p.lane === "quay");
    const verge = people.filter((p) => p.lane === "verge");
    expect(quay.length).toBeGreaterThanOrEqual(4);

    for (const p of quay) {
      const parts = partsOf(p.mesh);
      expect(parts.get("pipe")).toBeGreaterThanOrEqual(1);
      expect(parts.get("tin")).toBeGreaterThanOrEqual(1);
      expect(parts.get("pin")).toBeGreaterThanOrEqual(1);
      expect(parts.get("basket")).toBeGreaterThanOrEqual(1);
      expect(parts.get("loaf")).toBeGreaterThanOrEqual(1);
      expect(parts.get("parcel")).toBeGreaterThanOrEqual(1);
      expect(parts.get("flask")).toBeGreaterThanOrEqual(1);
      expect(parts.get("bundle")).toBeGreaterThanOrEqual(1);
      expect(parts.get("can")).toBeGreaterThanOrEqual(1);
      expect(parts.get("match")).toBeGreaterThanOrEqual(1);
      expect(parts.get("glove")).toBe(2);
      expect(parts.get("boot")).toBe(2);
      p.mesh.traverse((obj) => {
        if (obj.userData?.part !== "pipe") return;
        const mesh = obj as THREE.Mesh;
        expect(mesh.userData.mode).toBe("PAPER");
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect((mesh.material as THREE.MeshLambertMaterial).type).toBe("MeshLambertMaterial");
        const hex = (mesh.material as THREE.MeshLambertMaterial).color.getHex();
        expect(isGrey(hex)).toBe(false);
        expect(kraftPipe.has(hex)).toBe(true);
        const { width, height, depth } = (mesh.geometry as THREE.BoxGeometry).parameters;
        expect(width).toBeLessThan(0.18);
        expect(height).toBeLessThan(0.18);
        expect(depth).toBeLessThan(0.18);
        expect(mesh.position.y).toBeGreaterThan(0.4);
        expect(mesh.position.y).toBeLessThan(0.8);
        expect(Math.abs(mesh.position.x)).toBeGreaterThan(0.28);
        expect(mesh.position.distanceTo(new THREE.Vector3(0.38, 0.54, -0.40))).toBeGreaterThan(0.12);
        expect(mesh.position.distanceTo(new THREE.Vector3(0.38, 0.70, -0.28))).toBeGreaterThan(0.12);
        expect(mesh.position.distanceTo(new THREE.Vector3(0.38, 0.86, -0.16))).toBeGreaterThan(0.12);
        expect(mesh.position.distanceTo(new THREE.Vector3(-0.38, 0.86, 0.16))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(0.32, 0.58, 0.2))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(-0.32, 0.66, 0.22))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(-0.32, 0.58, 0.2))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(-0.38, 0.72, 0.08))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(0.18, 1.9, 0.16))).toBeGreaterThan(0.8);
        expect(mesh.position.distanceTo(new THREE.Vector3(-0.32, 0.78, 0))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(0.32, 0.78, 0))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(0, 1.44, 0.18))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(0.38, 0.78, 0.08))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(0, 1.1, 0.16))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(0, 1.86, 0))).toBeGreaterThan(0.8);
      });
    }

    for (const p of verge) {
      expect(partsOf(p.mesh).get("pipe")).toBeUndefined();
    }
  });

  it("carries a tiny kraft PAPER cigar on quay walkers; tin, pin, basket, loaf, parcel, flask, bundle, can, match, pipe stay", () => {
    const kraftCigar = new Set([0xc4b496, 0xc4a574, 0x4a3220]);
    const figure = makePaperPerson(0);
    expect(partsOf(figure).get("cigar")).toBeUndefined();
    expect(partsOf(figure).get("tin")).toBeUndefined();
    expect(partsOf(figure).get("pin")).toBeUndefined();
    expect(partsOf(figure).get("basket")).toBeUndefined();
    expect(partsOf(figure).get("loaf")).toBeUndefined();
    expect(partsOf(figure).get("parcel")).toBeUndefined();
    expect(partsOf(figure).get("flask")).toBeUndefined();
    expect(partsOf(figure).get("bundle")).toBeUndefined();
    expect(partsOf(figure).get("can")).toBeUndefined();
    expect(partsOf(figure).get("match")).toBeUndefined();
    expect(partsOf(figure).get("pipe")).toBeUndefined();

    const { people } = spawn();
    const quay = people.filter((p) => p.lane === "quay");
    const verge = people.filter((p) => p.lane === "verge");
    expect(quay.length).toBeGreaterThanOrEqual(4);

    for (const p of quay) {
      const parts = partsOf(p.mesh);
      expect(parts.get("cigar")).toBeGreaterThanOrEqual(1);
      expect(parts.get("tin")).toBeGreaterThanOrEqual(1);
      expect(parts.get("pin")).toBeGreaterThanOrEqual(1);
      expect(parts.get("basket")).toBeGreaterThanOrEqual(1);
      expect(parts.get("loaf")).toBeGreaterThanOrEqual(1);
      expect(parts.get("parcel")).toBeGreaterThanOrEqual(1);
      expect(parts.get("flask")).toBeGreaterThanOrEqual(1);
      expect(parts.get("bundle")).toBeGreaterThanOrEqual(1);
      expect(parts.get("can")).toBeGreaterThanOrEqual(1);
      expect(parts.get("match")).toBeGreaterThanOrEqual(1);
      expect(parts.get("pipe")).toBeGreaterThanOrEqual(1);
      expect(parts.get("glove")).toBe(2);
      expect(parts.get("boot")).toBe(2);
      p.mesh.traverse((obj) => {
        if (obj.userData?.part !== "cigar") return;
        const mesh = obj as THREE.Mesh;
        expect(mesh.userData.mode).toBe("PAPER");
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect((mesh.material as THREE.MeshLambertMaterial).type).toBe("MeshLambertMaterial");
        const hex = (mesh.material as THREE.MeshLambertMaterial).color.getHex();
        expect(isGrey(hex)).toBe(false);
        expect(kraftCigar.has(hex)).toBe(true);
        const { width, height, depth } = (mesh.geometry as THREE.BoxGeometry).parameters;
        expect(width).toBeLessThan(0.18);
        expect(height).toBeLessThan(0.18);
        expect(depth).toBeLessThan(0.18);
        expect(mesh.position.y).toBeGreaterThan(0.95);
        expect(mesh.position.y).toBeLessThan(1.25);
        expect(Math.abs(mesh.position.x)).toBeGreaterThan(0.28);
        expect(mesh.position.distanceTo(new THREE.Vector3(-0.38, 0.54, -0.40))).toBeGreaterThan(0.12);
        expect(mesh.position.distanceTo(new THREE.Vector3(0.38, 0.54, -0.40))).toBeGreaterThan(0.12);
        expect(mesh.position.distanceTo(new THREE.Vector3(0.38, 0.70, -0.28))).toBeGreaterThan(0.12);
        expect(mesh.position.distanceTo(new THREE.Vector3(0.38, 0.86, -0.16))).toBeGreaterThan(0.12);
        expect(mesh.position.distanceTo(new THREE.Vector3(-0.38, 0.86, 0.16))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(0.32, 0.58, 0.2))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(-0.32, 0.66, 0.22))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(-0.32, 0.58, 0.2))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(-0.38, 0.72, 0.08))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(0.18, 1.9, 0.16))).toBeGreaterThan(0.8);
        expect(mesh.position.distanceTo(new THREE.Vector3(-0.32, 0.78, 0))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(0.32, 0.78, 0))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(0, 1.44, 0.18))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(0.38, 0.78, 0.08))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(0, 1.1, 0.16))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(0, 1.86, 0))).toBeGreaterThan(0.8);
      });
    }

    for (const p of verge) {
      expect(partsOf(p.mesh).get("cigar")).toBeUndefined();
    }
  });

  it("carries a tiny kraft PAPER gourd on quay walkers; tin, pin, basket, loaf, parcel, flask, bundle, can, match, pipe, cigar stay", () => {
    const kraftGourd = new Set([0xc4b496, 0xc4a574, 0x4a3220]);
    const figure = makePaperPerson(0);
    expect(partsOf(figure).get("gourd")).toBeUndefined();
    expect(partsOf(figure).get("tin")).toBeUndefined();
    expect(partsOf(figure).get("pin")).toBeUndefined();
    expect(partsOf(figure).get("basket")).toBeUndefined();
    expect(partsOf(figure).get("loaf")).toBeUndefined();
    expect(partsOf(figure).get("parcel")).toBeUndefined();
    expect(partsOf(figure).get("flask")).toBeUndefined();
    expect(partsOf(figure).get("bundle")).toBeUndefined();
    expect(partsOf(figure).get("can")).toBeUndefined();
    expect(partsOf(figure).get("match")).toBeUndefined();
    expect(partsOf(figure).get("pipe")).toBeUndefined();
    expect(partsOf(figure).get("cigar")).toBeUndefined();

    const { people } = spawn();
    const quay = people.filter((p) => p.lane === "quay");
    const verge = people.filter((p) => p.lane === "verge");
    expect(quay.length).toBeGreaterThanOrEqual(4);

    for (const p of quay) {
      const parts = partsOf(p.mesh);
      expect(parts.get("gourd")).toBeGreaterThanOrEqual(1);
      expect(parts.get("tin")).toBeGreaterThanOrEqual(1);
      expect(parts.get("pin")).toBeGreaterThanOrEqual(1);
      expect(parts.get("basket")).toBeGreaterThanOrEqual(1);
      expect(parts.get("loaf")).toBeGreaterThanOrEqual(1);
      expect(parts.get("parcel")).toBeGreaterThanOrEqual(1);
      expect(parts.get("flask")).toBeGreaterThanOrEqual(1);
      expect(parts.get("bundle")).toBeGreaterThanOrEqual(1);
      expect(parts.get("can")).toBeGreaterThanOrEqual(1);
      expect(parts.get("match")).toBeGreaterThanOrEqual(1);
      expect(parts.get("pipe")).toBeGreaterThanOrEqual(1);
      expect(parts.get("cigar")).toBeGreaterThanOrEqual(1);
      expect(parts.get("glove")).toBe(2);
      expect(parts.get("boot")).toBe(2);
      p.mesh.traverse((obj) => {
        if (obj.userData?.part !== "gourd") return;
        const mesh = obj as THREE.Mesh;
        expect(mesh.userData.mode).toBe("PAPER");
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect((mesh.material as THREE.MeshLambertMaterial).type).toBe("MeshLambertMaterial");
        const hex = (mesh.material as THREE.MeshLambertMaterial).color.getHex();
        expect(isGrey(hex)).toBe(false);
        expect(kraftGourd.has(hex)).toBe(true);
        const { width, height, depth } = (mesh.geometry as THREE.BoxGeometry).parameters;
        expect(width).toBeLessThan(0.18);
        expect(height).toBeLessThan(0.18);
        expect(depth).toBeLessThan(0.18);
        expect(mesh.position.y).toBeGreaterThan(0.95);
        expect(mesh.position.y).toBeLessThan(1.25);
        expect(Math.abs(mesh.position.x)).toBeGreaterThan(0.28);
        expect(mesh.position.distanceTo(new THREE.Vector3(0.45, 1.10, 0.32))).toBeGreaterThan(0.12);
        expect(mesh.position.distanceTo(new THREE.Vector3(-0.38, 0.54, -0.40))).toBeGreaterThan(0.12);
        expect(mesh.position.distanceTo(new THREE.Vector3(0.38, 0.54, -0.40))).toBeGreaterThan(0.12);
        expect(mesh.position.distanceTo(new THREE.Vector3(0.38, 0.70, -0.28))).toBeGreaterThan(0.12);
        expect(mesh.position.distanceTo(new THREE.Vector3(0.38, 0.86, -0.16))).toBeGreaterThan(0.12);
        expect(mesh.position.distanceTo(new THREE.Vector3(-0.38, 0.86, 0.16))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(0.32, 0.58, 0.2))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(-0.32, 0.66, 0.22))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(-0.32, 0.58, 0.2))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(-0.38, 0.72, 0.08))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(0.18, 1.9, 0.16))).toBeGreaterThan(0.8);
        expect(mesh.position.distanceTo(new THREE.Vector3(0, 1.1, 0.16))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(-0.32, 0.78, 0))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(0.32, 0.78, 0))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(0, 1.44, 0.18))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(0.38, 0.78, 0.08))).toBeGreaterThan(0.4);
        expect(mesh.position.distanceTo(new THREE.Vector3(0, 1.86, 0))).toBeGreaterThan(0.8);
      });
    }

    for (const p of verge) {
      expect(partsOf(p.mesh).get("gourd")).toBeUndefined();
    }
  });

  it("puts kraft work-boot shafts above each shoe", () => {
    const kraftShoe = new Set([0x4a3220, 0xc4b496]);
    const figure = makePaperPerson(0);
    expect(partsOf(figure).get("shoe")).toBe(2);
    expect(partsOf(figure).get("boot")).toBe(2);

    figure.traverse((obj) => {
      if (obj.userData?.part !== "boot") return;
      const mesh = obj as THREE.Mesh;
      expect(mesh.geometry.type).toBe("BoxGeometry");
      const hex = (mesh.material as THREE.MeshLambertMaterial).color.getHex();
      expect(isGrey(hex)).toBe(false);
      expect(kraftShoe.has(hex)).toBe(true);
      expect(mesh.position.y).toBeGreaterThan(0.08);
      expect(mesh.position.y).toBeLessThan(0.4);
      expect(Math.abs(mesh.position.x)).toBeCloseTo(0.11, 5);
    });

    const { people } = spawn();
    for (const p of people) {
      expect(partsOf(p.mesh).get("boot")).toBe(2);
      expect(partsOf(p.mesh).get("shoe")).toBe(2);
    }
  });

  it("plants quay walkers in the seaward spawn look, not on the visitor", () => {
    const spec = ISLANDS.north;
    const playerZ = spec.port.z - 8;
    const lookZ = playerZ + spawnLookAtOffset("north").z;
    expect(HOME_Z).toBe(-6835);
    expect(lookZ).toBeCloseTo(HOME_Z - 33, 0);
    expect(SPAWN_QUAY_SCALE).toBeGreaterThan(4);
    expect(SPAWN_QUAY_ALONG.every((along) => along >= 24 && along <= 80)).toBe(true);

    const { people } = spawn();
    const quay = people.filter((p) => p.lane === "quay");
    expect(quay.length).toBe(SPAWN_QUAY_ALONG.length);

    const bright = new Set([0xc45c3a, 0x4a6e8a, 0x6a8f44, 0x2a7a72]);
    let lit = 0;
    for (const p of quay) {
      const { x, z } = p.mesh.position;
      expect(Math.abs(p.mesh.position.z - playerZ)).toBeGreaterThan(20);
      expect(z).toBeGreaterThan(spec.port.z + 10);
      expect(z).toBeLessThan(HOME_Z);
      expect(Math.abs(x - spec.port.x)).toBeCloseTo(VERGE_OFFSET_M, 5);
      expect(p.mesh.scale.x).toBeCloseTo(SPAWN_QUAY_SCALE, 5);
      expect(p.mesh.frustumCulled).toBe(false);
      expect(p.mesh.rotation.y).toBeCloseTo(0, 5);
      p.mesh.traverse((obj) => {
        if (obj.userData?.part !== "body") return;
        const mat = (obj as THREE.Mesh).material as THREE.MeshLambertMaterial;
        expect(bright.has(mat.color.getHex())).toBe(true);
        expect(mat.emissiveIntensity).toBeGreaterThan(0.3);
        lit += 1;
      });
    }
    expect(lit).toBeGreaterThanOrEqual(4);
  });
});
