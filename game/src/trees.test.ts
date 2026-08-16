import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createLandBoard, distToPaved, heightAt, ISLANDS } from "./land.ts";
import {
  DIRT_CLEAR_M,
  LEAVES_PER_TREE,
  MAX_UNIQUE_MESHES,
  PAVED_CLEAR_M,
  WATER_MIN_M,
  makeTrees,
  onPublicQuay,
} from "../public/harbour/trees.js";

function distToPolyline(
  points: { x: number; z: number }[],
  x: number,
  z: number,
) {
  let best = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const vx = b.x - a.x;
    const vz = b.z - a.z;
    const len2 = vx * vx + vz * vz || 1;
    let t = ((x - a.x) * vx + (z - a.z) * vz) / len2;
    t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(x - (a.x + vx * t), z - (a.z + vz * t));
    if (d < best) best = d;
  }
  return best;
}

function distToDirt(map: ReturnType<typeof createLandBoard>, island: string, x: number, z: number) {
  let best = Infinity;
  for (const r of map.roads) {
    if (r.kind !== "dirt" || r.island !== island || !r.points) continue;
    best = Math.min(best, distToPolyline(r.points, x, z));
  }
  return best;
}

function pointInRing(x: number, z: number, ring: [number, number][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const zi = ring[i][1];
    const xj = ring[j][0];
    const zj = ring[j][1];
    const hit = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-9) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

function isGrey(hex: number) {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  return Math.max(r, g, b) - Math.min(r, g, b) < 18;
}

function countMeshes(root: THREE.Object3D) {
  let n = 0;
  const geos = new Set<THREE.BufferGeometry>();
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    n += 1;
    if (mesh.geometry) geos.add(mesh.geometry);
  });
  return { meshes: n, geos: geos.size };
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

describe("hill and verge trees", () => {
  it("keeps the paved and water cuts explicit", () => {
    expect(PAVED_CLEAR_M).toBe(12);
    expect(DIRT_CLEAR_M).toBeGreaterThanOrEqual(3);
    expect(WATER_MIN_M).toBe(0.4);
    expect(MAX_UNIQUE_MESHES).toBeLessThanOrEqual(80);
    expect(LEAVES_PER_TREE).toBeGreaterThanOrEqual(2);
  });

  it("plants PAPER trees on hills, slopes, and behind street lots — not water, quay, tarmac, or dirt", () => {
    const map = createLandBoard();
    const added: THREE.Object3D[] = [];
    const scene = { add(obj: THREE.Object3D) { added.push(obj); } };
    const root = makeTrees(map, {
      scene,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });
    expect(added).toEqual([root]);
    expect(root.userData.provenance).toBe("PAPER");

    const placed = (root.userData.placed || []) as {
      island: "north" | "south";
      x: number;
      z: number;
      y: number;
      role: string;
    }[];
    expect(placed.length).toBeGreaterThan(60);

    const north = placed.filter((p) => p.island === "north");
    const south = placed.filter((p) => p.island === "south");
    expect(north.length).toBeGreaterThan(25);
    expect(south.length).toBeGreaterThan(20);
    expect(root.userData.counts.north).toBe(north.length);
    expect(root.userData.counts.south).toBe(south.length);

    const port = ISLANDS.north.port;
    expect(port.x).toBe(0);
    expect(port.z).toBe(-6950);
    const nearNorthPort = north.filter((p) => Math.hypot(p.x - port.x, p.z - port.z) < 400);
    expect(nearNorthPort.length).toBeGreaterThanOrEqual(20);

    expect(placed.some((p) => p.role === "hill")).toBe(true);
    expect(placed.some((p) => p.role === "slope")).toBe(true);
    expect(placed.some((p) => p.role === "lot-back" || p.role === "spawn")).toBe(true);

    const northHill = north.filter(
      (p) => Math.hypot(p.x - ISLANDS.north.hill.x, p.z - ISLANDS.north.hill.z) < 800,
    );
    expect(northHill.length).toBeGreaterThan(8);

    const behindLot = placed.filter((p) => {
      return map.plots.some((plot) => {
        if (plot.band !== "street" || plot.island !== p.island) return false;
        const d = Math.hypot(plot.x - p.x, plot.z - p.z);
        return d > 8 && d < 36;
      });
    });
    expect(behindLot.length).toBeGreaterThan(6);

    for (const p of placed) {
      const spec = ISLANDS[p.island];
      expect(heightAt(spec, p.x, p.z)).toBeGreaterThanOrEqual(WATER_MIN_M);
      expect(onPublicQuay(spec, p.x, p.z)).toBe(false);
      expect(distToPaved(spec, p.x, p.z)).toBeGreaterThanOrEqual(PAVED_CLEAR_M);
      expect(distToDirt(map, p.island, p.x, p.z)).toBeGreaterThanOrEqual(DIRT_CLEAR_M);
      const onPlot = map.plots.some(
        (plot) => plot.island === p.island && plot.ring && pointInRing(p.x, p.z, plot.ring),
      );
      expect(onPlot).toBe(false);
    }

    const { meshes, geos } = countMeshes(root);
    expect(meshes).toBeLessThan(MAX_UNIQUE_MESHES);
    expect(meshes).toBeLessThanOrEqual(8);
    expect(geos).toBeLessThanOrEqual(4);
    expect(placed.length).toBeGreaterThan(meshes);

    const instanced = root.children.filter((c) => (c as THREE.InstancedMesh).isInstancedMesh);
    expect(instanced.length).toBeGreaterThanOrEqual(2);
    const trunk = instanced.find((c) => c.name === "tree-trunks") as THREE.InstancedMesh;
    const leaf = instanced.find((c) => c.name === "tree-leaves") as THREE.InstancedMesh;
    expect(trunk.count).toBe(placed.length);
    expect(leaf.count).toBe(placed.length * LEAVES_PER_TREE);

    const colors = hexes(root);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every(isGrey)).toBe(false);
    expect(colors).toContain(0x8a6238);
    expect(colors).toContain(0x3f7a38);
  });
});
