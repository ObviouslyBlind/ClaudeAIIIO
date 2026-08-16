import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createLandBoard, distToPaved, heightAt, ISLANDS } from "./land.ts";
import { onPublicQuay } from "../public/harbour/trees.js";
import {
  LAND_MIN_M,
  MAX_PEOPLE,
  VERGE_OFFSET_M,
  WALK_SPEED_M_S,
  makePaperPerson,
  makePedestrians,
} from "../public/harbour/pedestrians.js";

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
    expect(boxes).toBe(10);
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
    expect(quay.length).toBeGreaterThanOrEqual(6);
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
});
