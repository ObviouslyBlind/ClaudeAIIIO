import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createLandBoard, distToPaved, heightAt, ISLANDS } from "./land.ts";
import {
  DIRT_CLEAR_M,
  LEAVES_PER_TREE,
  MAX_UNIQUE_MESHES,
  NORTH_PORT_PALM_OFFSETS,
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

    const tarmacVerge = north.filter((p) => {
      const d = distToPaved(ISLANDS.north, p.x, p.z);
      return d >= PAVED_CLEAR_M && d < 18 && Math.hypot(p.x - port.x, p.z - port.z) < 400;
    });
    expect(tarmacVerge.length).toBeGreaterThanOrEqual(8);
    expect(tarmacVerge.length).toBeLessThan(36);

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
    expect(meshes).toBeLessThanOrEqual(24);
    expect(geos).toBeLessThanOrEqual(6);
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

  it("sits kraft PAPER coconut boxes at the base of north-port verge palms, off PAVED_CLEAR", () => {
    const map = createLandBoard();
    const scene = { add(_obj: THREE.Object3D) {} };
    const root = makeTrees(map, {
      scene,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });

    const placed = (root.userData.placed || []) as {
      island: "north" | "south";
      x: number;
      z: number;
      y: number;
      role: string;
      dress?: string;
    }[];
    const northPalms = placed.filter((p) => p.island === "north" && p.dress === "north-port-palm");
    expect(northPalms.length).toBeGreaterThan(0);
    expect(northPalms.length).toBeLessThanOrEqual(NORTH_PORT_PALM_OFFSETS.length);

    const nuts: THREE.Mesh[] = [];
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.userData.part === "coconut" || mesh.userData.dress === "coconut") nuts.push(mesh);
    });
    expect(nuts.length).toBeGreaterThanOrEqual(4);
    expect(nuts.length).toBeLessThanOrEqual(NORTH_PORT_PALM_OFFSETS.length + 1);

    const kraft = new Set([0x8a6238, 0x9a6a40]);
    const port = ISLANDS.north.port;
    for (const nut of nuts) {
      expect(nut.userData.part === "coconut" || nut.userData.dress === "coconut").toBe(true);
      expect(nut.userData.provenance).toBe("PAPER");
      expect(nut.geometry.type).toBe("BoxGeometry");
      const mat = nut.material as THREE.MeshLambertMaterial;
      expect(mat.type).toBe("MeshLambertMaterial");
      expect(kraft.has(mat.color.getHex())).toBe(true);
      const pos = new THREE.Vector3();
      nut.getWorldPosition(pos);
      expect(distToPaved(ISLANDS.north, pos.x, pos.z)).toBeGreaterThanOrEqual(PAVED_CLEAR_M);
      expect(onPublicQuay(ISLANDS.north, pos.x, pos.z)).toBe(false);
      expect(heightAt(ISLANDS.north, pos.x, pos.z)).toBeGreaterThanOrEqual(WATER_MIN_M);
      expect(Math.hypot(pos.x - port.x, pos.z - port.z)).toBeLessThan(400);
      const atBase = northPalms.some((p) => Math.hypot(p.x - pos.x, p.z - pos.z) < 1.2);
      expect(atBase).toBe(true);
    }
  });

  it("perches one kraft PAPER bird under a north-port verge palm, off PAVED_CLEAR", () => {
    const map = createLandBoard();
    const scene = { add(_obj: THREE.Object3D) {} };
    const root = makeTrees(map, {
      scene,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });

    const placed = (root.userData.placed || []) as {
      island: "north" | "south";
      x: number;
      z: number;
      y: number;
      role: string;
      dress?: string;
    }[];
    const northPalms = placed.filter((p) => p.island === "north" && p.dress === "north-port-palm");
    expect(northPalms.length).toBeGreaterThan(0);
    expect(northPalms.length).toBeLessThanOrEqual(NORTH_PORT_PALM_OFFSETS.length);

    const birds: THREE.Mesh[] = [];
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.userData.part === "bird" || mesh.userData.dress === "bird") birds.push(mesh);
    });
    expect(birds.length).toBeGreaterThanOrEqual(2);
    expect(birds.length).toBeLessThanOrEqual(3);

    const kraft = new Set([0x8a6238, 0x9a6a40, 0x3f7a38, 0x2f6b32]);
    const port = ISLANDS.north.port;
    for (const bird of birds) {
      expect(bird.userData.part === "bird" || bird.userData.dress === "bird").toBe(true);
      expect(bird.userData.provenance).toBe("PAPER");
      expect(bird.geometry.type).toBe("BoxGeometry");
      const mat = bird.material as THREE.MeshLambertMaterial;
      expect(mat.type).toBe("MeshLambertMaterial");
      expect(kraft.has(mat.color.getHex())).toBe(true);
      expect(isGrey(mat.color.getHex())).toBe(false);
      const pos = new THREE.Vector3();
      bird.getWorldPosition(pos);
      expect(distToPaved(ISLANDS.north, pos.x, pos.z)).toBeGreaterThanOrEqual(PAVED_CLEAR_M);
      expect(onPublicQuay(ISLANDS.north, pos.x, pos.z)).toBe(false);
      expect(heightAt(ISLANDS.north, pos.x, pos.z)).toBeGreaterThanOrEqual(WATER_MIN_M);
      expect(Math.hypot(pos.x - port.x, pos.z - port.z)).toBeLessThan(400);
      const atPalm = northPalms.some((p) => Math.hypot(p.x - pos.x, p.z - pos.z) < 1.2);
      expect(atPalm).toBe(true);
    }
  });

  it("sits one kraft PAPER nest under a north-port verge palm, beside the bird", () => {
    const map = createLandBoard();
    const scene = { add(_obj: THREE.Object3D) {} };
    const root = makeTrees(map, {
      scene,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });

    const placed = (root.userData.placed || []) as {
      island: "north" | "south";
      x: number;
      z: number;
      y: number;
      role: string;
      dress?: string;
    }[];
    const northPalms = placed.filter((p) => p.island === "north" && p.dress === "north-port-palm");
    expect(northPalms.length).toBeGreaterThan(0);
    expect(northPalms.length).toBeLessThanOrEqual(NORTH_PORT_PALM_OFFSETS.length);

    const nests: THREE.Object3D[] = [];
    root.traverse((obj) => {
      if (obj.userData.kind === "nest" || obj.userData.part === "nest") nests.push(obj);
    });
    expect(nests.length).toBeGreaterThan(0);

    const nestBoxes: THREE.Mesh[] = [];
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.userData.part === "nest" || mesh.userData.dress === "nest") nestBoxes.push(mesh);
    });
    expect(nestBoxes.length).toBeGreaterThanOrEqual(1);
    expect(nestBoxes.length).toBeLessThanOrEqual(2);

    const birds: THREE.Object3D[] = [];
    root.traverse((obj) => {
      if (obj.userData.kind === "bird" || obj.userData.part === "bird") birds.push(obj);
    });
    expect(birds.length).toBeGreaterThan(0);

    const kraft = new Set([0x8a6238, 0x9a6a40]);
    const port = ISLANDS.north.port;
    for (const nest of nestBoxes) {
      expect(nest.userData.part === "nest" || nest.userData.dress === "nest").toBe(true);
      expect(nest.userData.provenance).toBe("PAPER");
      expect(nest.geometry.type).toBe("BoxGeometry");
      const mat = nest.material as THREE.MeshLambertMaterial;
      expect(mat.type).toBe("MeshLambertMaterial");
      expect(kraft.has(mat.color.getHex())).toBe(true);
      expect(isGrey(mat.color.getHex())).toBe(false);
      const pos = new THREE.Vector3();
      nest.getWorldPosition(pos);
      expect(distToPaved(ISLANDS.north, pos.x, pos.z)).toBeGreaterThanOrEqual(PAVED_CLEAR_M);
      expect(onPublicQuay(ISLANDS.north, pos.x, pos.z)).toBe(false);
      expect(heightAt(ISLANDS.north, pos.x, pos.z)).toBeGreaterThanOrEqual(WATER_MIN_M);
      expect(Math.hypot(pos.x - port.x, pos.z - port.z)).toBeLessThan(400);
      const atPalm = northPalms.some((p) => Math.hypot(p.x - pos.x, p.z - pos.z) < 1.2);
      expect(atPalm).toBe(true);
    }
  });

  it("sits one kraft PAPER egg in the north-port palm nest", () => {
    const map = createLandBoard();
    const scene = { add(_obj: THREE.Object3D) {} };
    const root = makeTrees(map, {
      scene,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });

    const placed = (root.userData.placed || []) as {
      island: "north" | "south";
      x: number;
      z: number;
      y: number;
      role: string;
      dress?: string;
    }[];
    const northPalms = placed.filter((p) => p.island === "north" && p.dress === "north-port-palm");
    expect(northPalms.length).toBeGreaterThan(0);
    expect(northPalms.length).toBeLessThanOrEqual(NORTH_PORT_PALM_OFFSETS.length);

    const eggs: THREE.Object3D[] = [];
    root.traverse((obj) => {
      if (obj.userData.kind === "egg" || obj.userData.part === "egg") eggs.push(obj);
    });
    expect(eggs.length).toBeGreaterThan(0);

    const eggBoxes: THREE.Mesh[] = [];
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.userData.part === "egg" || mesh.userData.dress === "egg") eggBoxes.push(mesh);
    });
    expect(eggBoxes.length).toBe(1);

    const nests: THREE.Object3D[] = [];
    root.traverse((obj) => {
      if (obj.userData.kind === "nest") nests.push(obj);
    });
    expect(nests.length).toBe(1);

    const birds: THREE.Object3D[] = [];
    root.traverse((obj) => {
      if (obj.userData.kind === "bird") birds.push(obj);
    });
    expect(birds.length).toBe(1);

    const kraft = new Set([0x8a6238, 0x9a6a40]);
    const port = ISLANDS.north.port;
    const nestPos = new THREE.Vector3();
    nests[0].getWorldPosition(nestPos);
    for (const egg of eggBoxes) {
      expect(egg.userData.part === "egg" || egg.userData.dress === "egg").toBe(true);
      expect(egg.userData.provenance).toBe("PAPER");
      expect(egg.geometry.type).toBe("BoxGeometry");
      const mat = egg.material as THREE.MeshLambertMaterial;
      expect(mat.type).toBe("MeshLambertMaterial");
      expect(kraft.has(mat.color.getHex())).toBe(true);
      expect(isGrey(mat.color.getHex())).toBe(false);
      const pos = new THREE.Vector3();
      egg.getWorldPosition(pos);
      expect(distToPaved(ISLANDS.north, pos.x, pos.z)).toBeGreaterThanOrEqual(PAVED_CLEAR_M);
      expect(onPublicQuay(ISLANDS.north, pos.x, pos.z)).toBe(false);
      expect(heightAt(ISLANDS.north, pos.x, pos.z)).toBeGreaterThanOrEqual(WATER_MIN_M);
      expect(Math.hypot(pos.x - port.x, pos.z - port.z)).toBeLessThan(400);
      const atPalm = northPalms.some((p) => Math.hypot(p.x - pos.x, p.z - pos.z) < 1.2);
      expect(atPalm).toBe(true);
      expect(Math.hypot(pos.x - nestPos.x, pos.z - nestPos.z)).toBeLessThan(0.3);
      expect(Math.abs(pos.y - nestPos.y)).toBeLessThan(0.2);
    }
  });

  it("sits one small kraft PAPER leaf on the north-port palm nest twig", () => {
    const map = createLandBoard();
    const scene = { add(_obj: THREE.Object3D) {} };
    const root = makeTrees(map, {
      scene,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });

    const placed = (root.userData.placed || []) as {
      island: "north" | "south";
      x: number;
      z: number;
      y: number;
      role: string;
      dress?: string;
    }[];
    const northPalms = placed.filter((p) => p.island === "north" && p.dress === "north-port-palm");
    expect(northPalms.length).toBeGreaterThan(0);
    expect(northPalms.length).toBeLessThanOrEqual(NORTH_PORT_PALM_OFFSETS.length);

    const leafBoxes: THREE.Mesh[] = [];
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.userData.part === "leaf" || mesh.userData.dress === "leaf") leafBoxes.push(mesh);
    });
    expect(leafBoxes.length).toBe(1);

    const nuts: THREE.Mesh[] = [];
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.userData.part === "coconut" || mesh.userData.dress === "coconut") nuts.push(mesh);
    });
    expect(nuts.length).toBeGreaterThanOrEqual(4);

    const birds: THREE.Object3D[] = [];
    root.traverse((obj) => {
      if (obj.userData.kind === "bird") birds.push(obj);
    });
    expect(birds.length).toBe(1);

    const nests: THREE.Object3D[] = [];
    root.traverse((obj) => {
      if (obj.userData.kind === "nest") nests.push(obj);
    });
    expect(nests.length).toBe(1);

    const eggs: THREE.Object3D[] = [];
    root.traverse((obj) => {
      if (obj.userData.kind === "egg") eggs.push(obj);
    });
    expect(eggs.length).toBe(1);

    const kraft = new Set([0x8a6238, 0x9a6a40]);
    const port = ISLANDS.north.port;
    const nestPos = new THREE.Vector3();
    nests[0].getWorldPosition(nestPos);
    for (const leaf of leafBoxes) {
      expect(leaf.userData.part === "leaf" || leaf.userData.dress === "leaf").toBe(true);
      expect(leaf.userData.provenance).toBe("PAPER");
      expect(leaf.geometry.type).toBe("BoxGeometry");
      const mat = leaf.material as THREE.MeshLambertMaterial;
      expect(mat.type).toBe("MeshLambertMaterial");
      expect(kraft.has(mat.color.getHex())).toBe(true);
      expect(isGrey(mat.color.getHex())).toBe(false);
      const pos = new THREE.Vector3();
      leaf.getWorldPosition(pos);
      expect(distToPaved(ISLANDS.north, pos.x, pos.z)).toBeGreaterThanOrEqual(PAVED_CLEAR_M);
      expect(onPublicQuay(ISLANDS.north, pos.x, pos.z)).toBe(false);
      expect(heightAt(ISLANDS.north, pos.x, pos.z)).toBeGreaterThanOrEqual(WATER_MIN_M);
      expect(Math.hypot(pos.x - port.x, pos.z - port.z)).toBeLessThan(400);
      const atPalm = northPalms.some((p) => Math.hypot(p.x - pos.x, p.z - pos.z) < 1.2);
      expect(atPalm).toBe(true);
      expect(Math.hypot(pos.x - nestPos.x, pos.z - nestPos.z)).toBeLessThan(0.3);
      expect(Math.abs(pos.y - nestPos.y)).toBeLessThan(0.2);
      leaf.geometry.computeBoundingBox();
      const size = new THREE.Vector3();
      leaf.geometry.boundingBox!.getSize(size);
      size.multiply(leaf.scale);
      expect(size.x).toBeLessThan(0.2);
      expect(size.y).toBeLessThan(0.08);
      expect(size.z).toBeLessThan(0.15);
    }
  });

  it("sits one tiny kraft PAPER frond tip on the north-port palm", () => {
    const map = createLandBoard();
    const scene = { add(_obj: THREE.Object3D) {} };
    const root = makeTrees(map, {
      scene,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });

    const placed = (root.userData.placed || []) as {
      island: "north" | "south";
      x: number;
      z: number;
      y: number;
      role: string;
      dress?: string;
    }[];
    const northPalms = placed.filter((p) => p.island === "north" && p.dress === "north-port-palm");
    expect(northPalms.length).toBeGreaterThan(0);
    expect(northPalms.length).toBeLessThanOrEqual(NORTH_PORT_PALM_OFFSETS.length);

    const frondBoxes: THREE.Mesh[] = [];
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.userData.part === "frond" || mesh.userData.dress === "frond") frondBoxes.push(mesh);
    });
    expect(frondBoxes.length).toBe(1);

    const leafBoxes: THREE.Mesh[] = [];
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.userData.part === "leaf" || mesh.userData.dress === "leaf") leafBoxes.push(mesh);
    });
    expect(leafBoxes.length).toBe(1);

    const nuts: THREE.Mesh[] = [];
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.userData.part === "coconut" || mesh.userData.dress === "coconut") nuts.push(mesh);
    });
    expect(nuts.length).toBeGreaterThanOrEqual(4);

    const birds: THREE.Object3D[] = [];
    root.traverse((obj) => {
      if (obj.userData.kind === "bird") birds.push(obj);
    });
    expect(birds.length).toBe(1);

    const nests: THREE.Object3D[] = [];
    root.traverse((obj) => {
      if (obj.userData.kind === "nest") nests.push(obj);
    });
    expect(nests.length).toBe(1);

    const eggs: THREE.Object3D[] = [];
    root.traverse((obj) => {
      if (obj.userData.kind === "egg") eggs.push(obj);
    });
    expect(eggs.length).toBe(1);

    const kraft = new Set([0x8a6238, 0x9a6a40, 0x3f7a38, 0x2f6b32]);
    const port = ISLANDS.north.port;
    const nestPos = new THREE.Vector3();
    nests[0].getWorldPosition(nestPos);
    for (const frond of frondBoxes) {
      expect(frond.userData.part === "frond" || frond.userData.dress === "frond").toBe(true);
      expect(frond.userData.provenance).toBe("PAPER");
      expect(frond.geometry.type).toBe("BoxGeometry");
      const mat = frond.material as THREE.MeshLambertMaterial;
      expect(mat.type).toBe("MeshLambertMaterial");
      expect(kraft.has(mat.color.getHex())).toBe(true);
      expect(isGrey(mat.color.getHex())).toBe(false);
      const pos = new THREE.Vector3();
      frond.getWorldPosition(pos);
      expect(distToPaved(ISLANDS.north, pos.x, pos.z)).toBeGreaterThanOrEqual(PAVED_CLEAR_M);
      expect(onPublicQuay(ISLANDS.north, pos.x, pos.z)).toBe(false);
      expect(heightAt(ISLANDS.north, pos.x, pos.z)).toBeGreaterThanOrEqual(WATER_MIN_M);
      expect(Math.hypot(pos.x - port.x, pos.z - port.z)).toBeLessThan(400);
      const atPalm = northPalms.some((p) => Math.hypot(p.x - pos.x, p.z - pos.z) < 1.2);
      expect(atPalm).toBe(true);
      expect(Math.hypot(pos.x - nestPos.x, pos.z - nestPos.z)).toBeLessThan(0.3);
      expect(Math.abs(pos.y - nestPos.y)).toBeLessThan(0.2);
      frond.geometry.computeBoundingBox();
      const size = new THREE.Vector3();
      frond.geometry.boundingBox!.getSize(size);
      size.multiply(frond.scale);
      expect(size.x).toBeLessThan(0.2);
      expect(size.y).toBeLessThan(0.08);
      expect(size.z).toBeLessThan(0.15);
    }
  });

  it("sits one tiny kraft PAPER husk on the north-port palm, frond and leaf remain", () => {
    const map = createLandBoard();
    const scene = { add(_obj: THREE.Object3D) {} };
    const root = makeTrees(map, {
      scene,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });

    const huskBoxes: THREE.Mesh[] = [];
    const frondBoxes: THREE.Mesh[] = [];
    const leafBoxes: THREE.Mesh[] = [];
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.userData.part === "husk") huskBoxes.push(mesh);
      if (mesh.userData.part === "frond") frondBoxes.push(mesh);
      if (mesh.userData.part === "leaf") leafBoxes.push(mesh);
    });
    expect(huskBoxes.length).toBe(1);
    expect(frondBoxes.length).toBe(1);
    expect(leafBoxes.length).toBe(1);

    const kraft = new Set([0x8a6238, 0x9a6a40]);
    const husk = huskBoxes[0];
    expect(husk.userData.part).toBe("husk");
    expect(husk.userData.provenance).toBe("PAPER");
    expect(husk.geometry.type).toBe("BoxGeometry");
    const mat = husk.material as THREE.MeshLambertMaterial;
    expect(mat.type).toBe("MeshLambertMaterial");
    expect(kraft.has(mat.color.getHex())).toBe(true);
    expect(isGrey(mat.color.getHex())).toBe(false);

    const huskPos = new THREE.Vector3();
    husk.getWorldPosition(huskPos);
    const others: THREE.Vector3[] = [];
    root.traverse((obj) => {
      const part = obj.userData.part;
      if (part === "frond" || part === "leaf" || part === "coconut" || part === "bird" || part === "nest" || part === "egg") {
        const p = new THREE.Vector3();
        obj.getWorldPosition(p);
        others.push(p);
      }
    });
    expect(others.length).toBeGreaterThan(0);
    for (const p of others) {
      expect(Math.hypot(huskPos.x - p.x, huskPos.y - p.y, huskPos.z - p.z)).toBeGreaterThan(0.01);
    }
  });

  it("sits one tiny kraft PAPER vine on the north-port palm, husk and frond remain", () => {
    const map = createLandBoard();
    const scene = { add(_obj: THREE.Object3D) {} };
    const root = makeTrees(map, {
      scene,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });

    const vineBoxes: THREE.Mesh[] = [];
    const huskBoxes: THREE.Mesh[] = [];
    const frondBoxes: THREE.Mesh[] = [];
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.userData.part === "vine") vineBoxes.push(mesh);
      if (mesh.userData.part === "husk") huskBoxes.push(mesh);
      if (mesh.userData.part === "frond") frondBoxes.push(mesh);
    });
    expect(vineBoxes.length).toBe(1);
    expect(huskBoxes.length).toBe(1);
    expect(frondBoxes.length).toBe(1);

    const kraft = new Set([0x8a6238, 0x9a6a40]);
    const vine = vineBoxes[0];
    expect(vine.userData.part).toBe("vine");
    expect(vine.userData.provenance).toBe("PAPER");
    expect(vine.geometry.type).toBe("BoxGeometry");
    const mat = vine.material as THREE.MeshLambertMaterial;
    expect(mat.type).toBe("MeshLambertMaterial");
    expect(kraft.has(mat.color.getHex())).toBe(true);
    expect(isGrey(mat.color.getHex())).toBe(false);

    const vinePos = new THREE.Vector3();
    vine.getWorldPosition(vinePos);
    const others: THREE.Vector3[] = [];
    root.traverse((obj) => {
      const part = obj.userData.part;
      if (part === "husk" || part === "frond" || part === "leaf" || part === "coconut" || part === "nest") {
        const p = new THREE.Vector3();
        obj.getWorldPosition(p);
        others.push(p);
      }
    });
    expect(others.length).toBeGreaterThan(0);
    for (const p of others) {
      expect(Math.hypot(vinePos.x - p.x, vinePos.y - p.y, vinePos.z - p.z)).toBeGreaterThan(0.01);
    }
  });

  it("sits one tiny kraft PAPER twig on the north-port palm nest, vine and husk remain", () => {
    const map = createLandBoard();
    const scene = { add(_obj: THREE.Object3D) {} };
    const root = makeTrees(map, {
      scene,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });

    const twigBoxes: THREE.Mesh[] = [];
    const vineBoxes: THREE.Mesh[] = [];
    const huskBoxes: THREE.Mesh[] = [];
    const frondBoxes: THREE.Mesh[] = [];
    const leafBoxes: THREE.Mesh[] = [];
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.userData.part === "twig") twigBoxes.push(mesh);
      if (mesh.userData.part === "vine") vineBoxes.push(mesh);
      if (mesh.userData.part === "husk") huskBoxes.push(mesh);
      if (mesh.userData.part === "frond") frondBoxes.push(mesh);
      if (mesh.userData.part === "leaf") leafBoxes.push(mesh);
    });
    expect(twigBoxes.length).toBe(1);
    expect(vineBoxes.length).toBe(1);
    expect(huskBoxes.length).toBe(1);
    expect(frondBoxes.length).toBe(1);
    expect(leafBoxes.length).toBe(1);

    const nuts: THREE.Mesh[] = [];
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.userData.part === "coconut") nuts.push(mesh);
    });
    expect(nuts.length).toBeGreaterThanOrEqual(4);

    const birds: THREE.Object3D[] = [];
    const nests: THREE.Object3D[] = [];
    const eggs: THREE.Object3D[] = [];
    root.traverse((obj) => {
      if (obj.userData.kind === "bird") birds.push(obj);
      if (obj.userData.kind === "nest") nests.push(obj);
      if (obj.userData.kind === "egg") eggs.push(obj);
    });
    expect(birds.length).toBe(1);
    expect(nests.length).toBe(1);
    expect(eggs.length).toBe(1);

    const kraft = new Set([0x8a6238, 0x9a6a40]);
    const twig = twigBoxes[0];
    expect(twig.userData.part).toBe("twig");
    expect(twig.userData.mode).toBe("PAPER");
    expect(twig.userData.provenance).toBe("PAPER");
    expect(twig.geometry.type).toBe("BoxGeometry");
    const mat = twig.material as THREE.MeshLambertMaterial;
    expect(mat.type).toBe("MeshLambertMaterial");
    expect(kraft.has(mat.color.getHex())).toBe(true);
    expect(isGrey(mat.color.getHex())).toBe(false);

    twig.geometry.computeBoundingBox();
    const size = new THREE.Vector3();
    twig.geometry.boundingBox!.getSize(size);
    size.multiply(twig.scale);
    expect(size.x).toBeLessThan(0.2);
    expect(size.y).toBeLessThan(0.08);
    expect(size.z).toBeLessThan(0.15);

    const twigPos = new THREE.Vector3();
    twig.getWorldPosition(twigPos);
    const others: THREE.Vector3[] = [];
    root.traverse((obj) => {
      const part = obj.userData.part;
      if (
        part === "vine" ||
        part === "husk" ||
        part === "frond" ||
        part === "leaf" ||
        part === "coconut" ||
        part === "bird" ||
        part === "nest" ||
        part === "egg"
      ) {
        const p = new THREE.Vector3();
        obj.getWorldPosition(p);
        others.push(p);
      }
    });
    expect(others.length).toBeGreaterThan(0);
    for (const p of others) {
      expect(Math.hypot(twigPos.x - p.x, twigPos.y - p.y, twigPos.z - p.z)).toBeGreaterThan(0.01);
    }
  });

  it("sits one tiny kraft PAPER bark flake on the north-port palm trunk, twig and vine remain", () => {
    const map = createLandBoard();
    const scene = { add(_obj: THREE.Object3D) {} };
    const root = makeTrees(map, {
      scene,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });

    const placed = (root.userData.placed || []) as {
      island: "north" | "south";
      x: number;
      z: number;
      y: number;
      role: string;
      dress?: string;
    }[];
    const northPalms = placed.filter((p) => p.island === "north" && p.dress === "north-port-palm");
    expect(northPalms.length).toBeGreaterThan(0);
    expect(northPalms.length).toBeLessThanOrEqual(NORTH_PORT_PALM_OFFSETS.length);

    const barkBoxes: THREE.Mesh[] = [];
    const twigBoxes: THREE.Mesh[] = [];
    const vineBoxes: THREE.Mesh[] = [];
    const huskBoxes: THREE.Mesh[] = [];
    const frondBoxes: THREE.Mesh[] = [];
    const leafBoxes: THREE.Mesh[] = [];
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.userData.part === "bark") barkBoxes.push(mesh);
      if (mesh.userData.part === "twig") twigBoxes.push(mesh);
      if (mesh.userData.part === "vine") vineBoxes.push(mesh);
      if (mesh.userData.part === "husk") huskBoxes.push(mesh);
      if (mesh.userData.part === "frond") frondBoxes.push(mesh);
      if (mesh.userData.part === "leaf") leafBoxes.push(mesh);
    });
    expect(barkBoxes.length).toBe(1);
    expect(twigBoxes.length).toBe(1);
    expect(vineBoxes.length).toBe(1);
    expect(huskBoxes.length).toBe(1);
    expect(frondBoxes.length).toBe(1);
    expect(leafBoxes.length).toBe(1);

    const nuts: THREE.Mesh[] = [];
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.userData.part === "coconut") nuts.push(mesh);
    });
    expect(nuts.length).toBeGreaterThanOrEqual(4);

    const birds: THREE.Object3D[] = [];
    const nests: THREE.Object3D[] = [];
    const eggs: THREE.Object3D[] = [];
    root.traverse((obj) => {
      if (obj.userData.kind === "bird") birds.push(obj);
      if (obj.userData.kind === "nest") nests.push(obj);
      if (obj.userData.kind === "egg") eggs.push(obj);
    });
    expect(birds.length).toBe(1);
    expect(nests.length).toBe(1);
    expect(eggs.length).toBe(1);

    const kraft = new Set([0x8a6238, 0x9a6a40]);
    const bark = barkBoxes[0];
    expect(bark.userData.part).toBe("bark");
    expect(bark.userData.mode).toBe("PAPER");
    expect(bark.userData.provenance).toBe("PAPER");
    expect(bark.geometry.type).toBe("BoxGeometry");
    const mat = bark.material as THREE.MeshLambertMaterial;
    expect(mat.type).toBe("MeshLambertMaterial");
    expect(kraft.has(mat.color.getHex())).toBe(true);
    expect(isGrey(mat.color.getHex())).toBe(false);

    bark.geometry.computeBoundingBox();
    const size = new THREE.Vector3();
    bark.geometry.boundingBox!.getSize(size);
    size.multiply(bark.scale);
    expect(size.x).toBeLessThan(0.2);
    expect(size.y).toBeLessThan(0.08);
    expect(size.z).toBeLessThan(0.15);

    const barkPos = new THREE.Vector3();
    bark.getWorldPosition(barkPos);
    const port = ISLANDS.north.port;
    expect(distToPaved(ISLANDS.north, barkPos.x, barkPos.z)).toBeGreaterThanOrEqual(PAVED_CLEAR_M);
    expect(onPublicQuay(ISLANDS.north, barkPos.x, barkPos.z)).toBe(false);
    expect(heightAt(ISLANDS.north, barkPos.x, barkPos.z)).toBeGreaterThanOrEqual(WATER_MIN_M);
    expect(Math.hypot(barkPos.x - port.x, barkPos.z - port.z)).toBeLessThan(400);
    const atTrunk = northPalms.some((p) => Math.hypot(p.x - barkPos.x, p.z - barkPos.z) < 0.5);
    expect(atTrunk).toBe(true);
    const nestPos = new THREE.Vector3();
    nests[0].getWorldPosition(nestPos);
    expect(barkPos.y).toBeGreaterThan(nestPos.y + 0.3);

    const others: THREE.Vector3[] = [];
    root.traverse((obj) => {
      const part = obj.userData.part;
      if (
        part === "twig" ||
        part === "vine" ||
        part === "husk" ||
        part === "frond" ||
        part === "leaf" ||
        part === "coconut" ||
        part === "bird" ||
        part === "nest" ||
        part === "egg"
      ) {
        const p = new THREE.Vector3();
        obj.getWorldPosition(p);
        others.push(p);
      }
    });
    expect(others.length).toBeGreaterThan(0);
    for (const p of others) {
      expect(Math.hypot(barkPos.x - p.x, barkPos.y - p.y, barkPos.z - p.z)).toBeGreaterThan(0.01);
    }
  });

  it("sits one tiny kraft PAPER knot on the north-port palm trunk, bark and twig and vine remain", () => {
    const map = createLandBoard();
    const scene = { add(_obj: THREE.Object3D) {} };
    const root = makeTrees(map, {
      scene,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });

    const placed = (root.userData.placed || []) as {
      island: "north" | "south";
      x: number;
      z: number;
      y: number;
      role: string;
      dress?: string;
    }[];
    const northPalms = placed.filter((p) => p.island === "north" && p.dress === "north-port-palm");
    expect(northPalms.length).toBeGreaterThan(0);
    expect(northPalms.length).toBeLessThanOrEqual(NORTH_PORT_PALM_OFFSETS.length);

    const knotBoxes: THREE.Mesh[] = [];
    const barkBoxes: THREE.Mesh[] = [];
    const twigBoxes: THREE.Mesh[] = [];
    const vineBoxes: THREE.Mesh[] = [];
    const huskBoxes: THREE.Mesh[] = [];
    const frondBoxes: THREE.Mesh[] = [];
    const leafBoxes: THREE.Mesh[] = [];
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.userData.part === "knot") knotBoxes.push(mesh);
      if (mesh.userData.part === "bark") barkBoxes.push(mesh);
      if (mesh.userData.part === "twig") twigBoxes.push(mesh);
      if (mesh.userData.part === "vine") vineBoxes.push(mesh);
      if (mesh.userData.part === "husk") huskBoxes.push(mesh);
      if (mesh.userData.part === "frond") frondBoxes.push(mesh);
      if (mesh.userData.part === "leaf") leafBoxes.push(mesh);
    });
    expect(knotBoxes.length).toBe(1);
    expect(barkBoxes.length).toBe(1);
    expect(twigBoxes.length).toBe(1);
    expect(vineBoxes.length).toBe(1);
    expect(huskBoxes.length).toBe(1);
    expect(frondBoxes.length).toBe(1);
    expect(leafBoxes.length).toBe(1);

    const nuts: THREE.Mesh[] = [];
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.userData.part === "coconut") nuts.push(mesh);
    });
    expect(nuts.length).toBeGreaterThanOrEqual(4);

    const birds: THREE.Object3D[] = [];
    const nests: THREE.Object3D[] = [];
    const eggs: THREE.Object3D[] = [];
    root.traverse((obj) => {
      if (obj.userData.kind === "bird") birds.push(obj);
      if (obj.userData.kind === "nest") nests.push(obj);
      if (obj.userData.kind === "egg") eggs.push(obj);
    });
    expect(birds.length).toBe(1);
    expect(nests.length).toBe(1);
    expect(eggs.length).toBe(1);

    const kraft = new Set([0x8a6238, 0x9a6a40]);
    const knot = knotBoxes[0];
    expect(knot.userData.part).toBe("knot");
    expect(knot.userData.mode).toBe("PAPER");
    expect(knot.userData.provenance).toBe("PAPER");
    expect(knot.geometry.type).toBe("BoxGeometry");
    const mat = knot.material as THREE.MeshLambertMaterial;
    expect(mat.type).toBe("MeshLambertMaterial");
    expect(kraft.has(mat.color.getHex())).toBe(true);
    expect(isGrey(mat.color.getHex())).toBe(false);

    knot.geometry.computeBoundingBox();
    const size = new THREE.Vector3();
    knot.geometry.boundingBox!.getSize(size);
    size.multiply(knot.scale);
    expect(size.x).toBeLessThan(0.2);
    expect(size.y).toBeLessThan(0.08);
    expect(size.z).toBeLessThan(0.15);

    const knotPos = new THREE.Vector3();
    knot.getWorldPosition(knotPos);
    const port = ISLANDS.north.port;
    expect(distToPaved(ISLANDS.north, knotPos.x, knotPos.z)).toBeGreaterThanOrEqual(PAVED_CLEAR_M);
    expect(onPublicQuay(ISLANDS.north, knotPos.x, knotPos.z)).toBe(false);
    expect(heightAt(ISLANDS.north, knotPos.x, knotPos.z)).toBeGreaterThanOrEqual(WATER_MIN_M);
    expect(Math.hypot(knotPos.x - port.x, knotPos.z - port.z)).toBeLessThan(400);
    const atTrunk = northPalms.some((p) => Math.hypot(p.x - knotPos.x, p.z - knotPos.z) < 0.5);
    expect(atTrunk).toBe(true);
    const nestPos = new THREE.Vector3();
    nests[0].getWorldPosition(nestPos);
    expect(knotPos.y).toBeGreaterThan(nestPos.y + 0.3);

    const others: THREE.Vector3[] = [];
    root.traverse((obj) => {
      const part = obj.userData.part;
      if (
        part === "bark" ||
        part === "twig" ||
        part === "vine" ||
        part === "husk" ||
        part === "frond" ||
        part === "leaf" ||
        part === "coconut" ||
        part === "bird" ||
        part === "nest" ||
        part === "egg"
      ) {
        const p = new THREE.Vector3();
        obj.getWorldPosition(p);
        others.push(p);
      }
    });
    expect(others.length).toBeGreaterThan(0);
    for (const p of others) {
      expect(Math.hypot(knotPos.x - p.x, knotPos.y - p.y, knotPos.z - p.z)).toBeGreaterThan(0.01);
    }
  });

  it("sits one tiny kraft PAPER moss patch on the north-port palm trunk, knot and bark remain", () => {
    const map = createLandBoard();
    const scene = { add(_obj: THREE.Object3D) {} };
    const root = makeTrees(map, {
      scene,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });

    const placed = (root.userData.placed || []) as {
      island: "north" | "south";
      x: number;
      z: number;
      y: number;
      role: string;
      dress?: string;
    }[];
    const northPalms = placed.filter((p) => p.island === "north" && p.dress === "north-port-palm");
    expect(northPalms.length).toBeGreaterThan(0);
    expect(northPalms.length).toBeLessThanOrEqual(NORTH_PORT_PALM_OFFSETS.length);

    const mossBoxes: THREE.Mesh[] = [];
    const knotBoxes: THREE.Mesh[] = [];
    const barkBoxes: THREE.Mesh[] = [];
    const twigBoxes: THREE.Mesh[] = [];
    const vineBoxes: THREE.Mesh[] = [];
    const huskBoxes: THREE.Mesh[] = [];
    const frondBoxes: THREE.Mesh[] = [];
    const leafBoxes: THREE.Mesh[] = [];
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.userData.part === "moss") mossBoxes.push(mesh);
      if (mesh.userData.part === "knot") knotBoxes.push(mesh);
      if (mesh.userData.part === "bark") barkBoxes.push(mesh);
      if (mesh.userData.part === "twig") twigBoxes.push(mesh);
      if (mesh.userData.part === "vine") vineBoxes.push(mesh);
      if (mesh.userData.part === "husk") huskBoxes.push(mesh);
      if (mesh.userData.part === "frond") frondBoxes.push(mesh);
      if (mesh.userData.part === "leaf") leafBoxes.push(mesh);
    });
    expect(mossBoxes.length).toBe(1);
    expect(knotBoxes.length).toBe(1);
    expect(barkBoxes.length).toBe(1);
    expect(twigBoxes.length).toBe(1);
    expect(vineBoxes.length).toBe(1);
    expect(huskBoxes.length).toBe(1);
    expect(frondBoxes.length).toBe(1);
    expect(leafBoxes.length).toBe(1);

    const nuts: THREE.Mesh[] = [];
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.userData.part === "coconut") nuts.push(mesh);
    });
    expect(nuts.length).toBeGreaterThanOrEqual(4);

    const birds: THREE.Object3D[] = [];
    const nests: THREE.Object3D[] = [];
    const eggs: THREE.Object3D[] = [];
    root.traverse((obj) => {
      if (obj.userData.kind === "bird") birds.push(obj);
      if (obj.userData.kind === "nest") nests.push(obj);
      if (obj.userData.kind === "egg") eggs.push(obj);
    });
    expect(birds.length).toBe(1);
    expect(nests.length).toBe(1);
    expect(eggs.length).toBe(1);

    const kraft = new Set([0x8a6238, 0x9a6a40, 0x3f7a38, 0x2f6b32]);
    const moss = mossBoxes[0];
    expect(moss.userData.part).toBe("moss");
    expect(moss.userData.dress).toBe("moss");
    expect(moss.userData.mode).toBe("PAPER");
    expect(moss.userData.provenance).toBe("PAPER");
    expect(moss.geometry.type).toBe("BoxGeometry");
    const mat = moss.material as THREE.MeshLambertMaterial;
    expect(mat.type).toBe("MeshLambertMaterial");
    expect(kraft.has(mat.color.getHex())).toBe(true);
    expect(isGrey(mat.color.getHex())).toBe(false);

    moss.geometry.computeBoundingBox();
    const size = new THREE.Vector3();
    moss.geometry.boundingBox!.getSize(size);
    size.multiply(moss.scale);
    expect(size.x).toBeLessThan(0.2);
    expect(size.y).toBeLessThan(0.08);
    expect(size.z).toBeLessThan(0.15);

    const mossPos = new THREE.Vector3();
    moss.getWorldPosition(mossPos);
    const port = ISLANDS.north.port;
    expect(distToPaved(ISLANDS.north, mossPos.x, mossPos.z)).toBeGreaterThanOrEqual(PAVED_CLEAR_M);
    expect(onPublicQuay(ISLANDS.north, mossPos.x, mossPos.z)).toBe(false);
    expect(heightAt(ISLANDS.north, mossPos.x, mossPos.z)).toBeGreaterThanOrEqual(WATER_MIN_M);
    expect(Math.hypot(mossPos.x - port.x, mossPos.z - port.z)).toBeLessThan(400);
    const atTrunk = northPalms.some((p) => Math.hypot(p.x - mossPos.x, p.z - mossPos.z) < 0.5);
    expect(atTrunk).toBe(true);
    const nestPos = new THREE.Vector3();
    nests[0].getWorldPosition(nestPos);
    expect(mossPos.y).toBeGreaterThan(nestPos.y + 0.3);

    const others: THREE.Vector3[] = [];
    root.traverse((obj) => {
      const part = obj.userData.part;
      if (
        part === "knot" ||
        part === "bark" ||
        part === "twig" ||
        part === "vine" ||
        part === "husk" ||
        part === "frond" ||
        part === "leaf" ||
        part === "coconut" ||
        part === "bird" ||
        part === "nest" ||
        part === "egg"
      ) {
        const p = new THREE.Vector3();
        obj.getWorldPosition(p);
        others.push(p);
      }
    });
    expect(others.length).toBeGreaterThan(0);
    for (const p of others) {
      expect(Math.hypot(mossPos.x - p.x, mossPos.y - p.y, mossPos.z - p.z)).toBeGreaterThan(0.01);
    }
  });

  it("sits one tiny kraft PAPER lichen patch on the north-port palm trunk, moss and knot remain", () => {
    const map = createLandBoard();
    const scene = { add(_obj: THREE.Object3D) {} };
    const root = makeTrees(map, {
      scene,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });

    const placed = (root.userData.placed || []) as {
      island: "north" | "south";
      x: number;
      z: number;
      y: number;
      role: string;
      dress?: string;
    }[];
    const northPalms = placed.filter((p) => p.island === "north" && p.dress === "north-port-palm");
    expect(northPalms.length).toBeGreaterThan(0);
    expect(northPalms.length).toBeLessThanOrEqual(NORTH_PORT_PALM_OFFSETS.length);

    const lichenBoxes: THREE.Mesh[] = [];
    const mossBoxes: THREE.Mesh[] = [];
    const knotBoxes: THREE.Mesh[] = [];
    const barkBoxes: THREE.Mesh[] = [];
    const twigBoxes: THREE.Mesh[] = [];
    const vineBoxes: THREE.Mesh[] = [];
    const huskBoxes: THREE.Mesh[] = [];
    const frondBoxes: THREE.Mesh[] = [];
    const leafBoxes: THREE.Mesh[] = [];
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.userData.part === "lichen") lichenBoxes.push(mesh);
      if (mesh.userData.part === "moss") mossBoxes.push(mesh);
      if (mesh.userData.part === "knot") knotBoxes.push(mesh);
      if (mesh.userData.part === "bark") barkBoxes.push(mesh);
      if (mesh.userData.part === "twig") twigBoxes.push(mesh);
      if (mesh.userData.part === "vine") vineBoxes.push(mesh);
      if (mesh.userData.part === "husk") huskBoxes.push(mesh);
      if (mesh.userData.part === "frond") frondBoxes.push(mesh);
      if (mesh.userData.part === "leaf") leafBoxes.push(mesh);
    });
    expect(lichenBoxes.length).toBe(1);
    expect(mossBoxes.length).toBe(1);
    expect(knotBoxes.length).toBe(1);
    expect(barkBoxes.length).toBe(1);
    expect(twigBoxes.length).toBe(1);
    expect(vineBoxes.length).toBe(1);
    expect(huskBoxes.length).toBe(1);
    expect(frondBoxes.length).toBe(1);
    expect(leafBoxes.length).toBe(1);

    const nuts: THREE.Mesh[] = [];
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.userData.part === "coconut") nuts.push(mesh);
    });
    expect(nuts.length).toBeGreaterThanOrEqual(4);

    const birds: THREE.Object3D[] = [];
    const nests: THREE.Object3D[] = [];
    const eggs: THREE.Object3D[] = [];
    root.traverse((obj) => {
      if (obj.userData.kind === "bird") birds.push(obj);
      if (obj.userData.kind === "nest") nests.push(obj);
      if (obj.userData.kind === "egg") eggs.push(obj);
    });
    expect(birds.length).toBe(1);
    expect(nests.length).toBe(1);
    expect(eggs.length).toBe(1);

    const kraft = new Set([0x8a6238, 0x9a6a40, 0x3f7a38, 0x2f6b32]);
    const lichen = lichenBoxes[0];
    expect(lichen.userData.part).toBe("lichen");
    expect(lichen.userData.dress).toBe("lichen");
    expect(lichen.userData.mode).toBe("PAPER");
    expect(lichen.userData.provenance).toBe("PAPER");
    expect(lichen.geometry.type).toBe("BoxGeometry");
    const mat = lichen.material as THREE.MeshLambertMaterial;
    expect(mat.type).toBe("MeshLambertMaterial");
    expect(kraft.has(mat.color.getHex())).toBe(true);
    expect(isGrey(mat.color.getHex())).toBe(false);

    lichen.geometry.computeBoundingBox();
    const size = new THREE.Vector3();
    lichen.geometry.boundingBox!.getSize(size);
    size.multiply(lichen.scale);
    expect(size.x).toBeLessThan(0.2);
    expect(size.y).toBeLessThan(0.08);
    expect(size.z).toBeLessThan(0.15);

    const lichenPos = new THREE.Vector3();
    lichen.getWorldPosition(lichenPos);
    const port = ISLANDS.north.port;
    expect(distToPaved(ISLANDS.north, lichenPos.x, lichenPos.z)).toBeGreaterThanOrEqual(PAVED_CLEAR_M);
    expect(onPublicQuay(ISLANDS.north, lichenPos.x, lichenPos.z)).toBe(false);
    expect(heightAt(ISLANDS.north, lichenPos.x, lichenPos.z)).toBeGreaterThanOrEqual(WATER_MIN_M);
    expect(Math.hypot(lichenPos.x - port.x, lichenPos.z - port.z)).toBeLessThan(400);
    const atTrunk = northPalms.some((p) => Math.hypot(p.x - lichenPos.x, p.z - lichenPos.z) < 0.5);
    expect(atTrunk).toBe(true);
    const nestPos = new THREE.Vector3();
    nests[0].getWorldPosition(nestPos);
    expect(lichenPos.y).toBeGreaterThan(nestPos.y + 0.3);

    const others: THREE.Vector3[] = [];
    root.traverse((obj) => {
      const part = obj.userData.part;
      if (
        part === "moss" ||
        part === "knot" ||
        part === "bark" ||
        part === "twig" ||
        part === "vine" ||
        part === "husk" ||
        part === "frond" ||
        part === "leaf" ||
        part === "coconut" ||
        part === "bird" ||
        part === "nest" ||
        part === "egg"
      ) {
        const p = new THREE.Vector3();
        obj.getWorldPosition(p);
        others.push(p);
      }
    });
    expect(others.length).toBeGreaterThan(0);
    for (const p of others) {
      expect(Math.hypot(lichenPos.x - p.x, lichenPos.y - p.y, lichenPos.z - p.z)).toBeGreaterThan(0.01);
    }
  });

  it("sits one tiny kraft PAPER needle tuft on the north-port palm trunk, lichen and moss remain", () => {
    const map = createLandBoard();
    const scene = { add(_obj: THREE.Object3D) {} };
    const root = makeTrees(map, {
      scene,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });

    const placed = (root.userData.placed || []) as {
      island: "north" | "south";
      x: number;
      z: number;
      y: number;
      role: string;
      dress?: string;
    }[];
    const northPalms = placed.filter((p) => p.island === "north" && p.dress === "north-port-palm");
    expect(northPalms.length).toBeGreaterThan(0);
    expect(northPalms.length).toBeLessThanOrEqual(NORTH_PORT_PALM_OFFSETS.length);

    const needleBoxes: THREE.Mesh[] = [];
    const lichenBoxes: THREE.Mesh[] = [];
    const mossBoxes: THREE.Mesh[] = [];
    const knotBoxes: THREE.Mesh[] = [];
    const barkBoxes: THREE.Mesh[] = [];
    const twigBoxes: THREE.Mesh[] = [];
    const vineBoxes: THREE.Mesh[] = [];
    const huskBoxes: THREE.Mesh[] = [];
    const frondBoxes: THREE.Mesh[] = [];
    const leafBoxes: THREE.Mesh[] = [];
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.userData.part === "needle") needleBoxes.push(mesh);
      if (mesh.userData.part === "lichen") lichenBoxes.push(mesh);
      if (mesh.userData.part === "moss") mossBoxes.push(mesh);
      if (mesh.userData.part === "knot") knotBoxes.push(mesh);
      if (mesh.userData.part === "bark") barkBoxes.push(mesh);
      if (mesh.userData.part === "twig") twigBoxes.push(mesh);
      if (mesh.userData.part === "vine") vineBoxes.push(mesh);
      if (mesh.userData.part === "husk") huskBoxes.push(mesh);
      if (mesh.userData.part === "frond") frondBoxes.push(mesh);
      if (mesh.userData.part === "leaf") leafBoxes.push(mesh);
    });
    expect(needleBoxes.length).toBe(1);
    expect(lichenBoxes.length).toBe(1);
    expect(mossBoxes.length).toBe(1);
    expect(knotBoxes.length).toBe(1);
    expect(barkBoxes.length).toBe(1);
    expect(twigBoxes.length).toBe(1);
    expect(vineBoxes.length).toBe(1);
    expect(huskBoxes.length).toBe(1);
    expect(frondBoxes.length).toBe(1);
    expect(leafBoxes.length).toBe(1);

    const nuts: THREE.Mesh[] = [];
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.userData.part === "coconut") nuts.push(mesh);
    });
    expect(nuts.length).toBeGreaterThanOrEqual(4);

    const birds: THREE.Object3D[] = [];
    const nests: THREE.Object3D[] = [];
    const eggs: THREE.Object3D[] = [];
    root.traverse((obj) => {
      if (obj.userData.kind === "bird") birds.push(obj);
      if (obj.userData.kind === "nest") nests.push(obj);
      if (obj.userData.kind === "egg") eggs.push(obj);
    });
    expect(birds.length).toBe(1);
    expect(nests.length).toBe(1);
    expect(eggs.length).toBe(1);

    const kraft = new Set([0x8a6238, 0x9a6a40, 0x3f7a38, 0x2f6b32]);
    const needle = needleBoxes[0];
    expect(needle.userData.part).toBe("needle");
    expect(needle.userData.dress).toBe("needle");
    expect(needle.userData.mode).toBe("PAPER");
    expect(needle.userData.provenance).toBe("PAPER");
    expect(needle.geometry.type).toBe("BoxGeometry");
    const mat = needle.material as THREE.MeshLambertMaterial;
    expect(mat.type).toBe("MeshLambertMaterial");
    expect(kraft.has(mat.color.getHex())).toBe(true);
    expect(isGrey(mat.color.getHex())).toBe(false);

    needle.geometry.computeBoundingBox();
    const size = new THREE.Vector3();
    needle.geometry.boundingBox!.getSize(size);
    size.multiply(needle.scale);
    expect(size.x).toBeLessThan(0.2);
    expect(size.y).toBeLessThan(0.08);
    expect(size.z).toBeLessThan(0.15);

    const needlePos = new THREE.Vector3();
    needle.getWorldPosition(needlePos);
    const port = ISLANDS.north.port;
    expect(distToPaved(ISLANDS.north, needlePos.x, needlePos.z)).toBeGreaterThanOrEqual(PAVED_CLEAR_M);
    expect(onPublicQuay(ISLANDS.north, needlePos.x, needlePos.z)).toBe(false);
    expect(heightAt(ISLANDS.north, needlePos.x, needlePos.z)).toBeGreaterThanOrEqual(WATER_MIN_M);
    expect(Math.hypot(needlePos.x - port.x, needlePos.z - port.z)).toBeLessThan(400);
    const atTrunk = northPalms.some((p) => Math.hypot(p.x - needlePos.x, p.z - needlePos.z) < 0.5);
    expect(atTrunk).toBe(true);
    const nestPos = new THREE.Vector3();
    nests[0].getWorldPosition(nestPos);
    expect(needlePos.y).toBeGreaterThan(nestPos.y + 0.3);

    const others: THREE.Vector3[] = [];
    root.traverse((obj) => {
      const part = obj.userData.part;
      if (
        part === "lichen" ||
        part === "moss" ||
        part === "knot" ||
        part === "bark" ||
        part === "twig" ||
        part === "vine" ||
        part === "husk" ||
        part === "frond" ||
        part === "leaf" ||
        part === "coconut" ||
        part === "bird" ||
        part === "nest" ||
        part === "egg"
      ) {
        const p = new THREE.Vector3();
        obj.getWorldPosition(p);
        others.push(p);
      }
    });
    expect(others.length).toBeGreaterThan(0);
    for (const p of others) {
      expect(Math.hypot(needlePos.x - p.x, needlePos.y - p.y, needlePos.z - p.z)).toBeGreaterThan(0.01);
    }
  });

  it("sits one tiny kraft PAPER acorn on the north-port palm trunk, needle and lichen remain", () => {
    const map = createLandBoard();
    const scene = { add(_obj: THREE.Object3D) {} };
    const root = makeTrees(map, {
      scene,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });

    const placed = (root.userData.placed || []) as {
      island: "north" | "south";
      x: number;
      z: number;
      y: number;
      role: string;
      dress?: string;
    }[];
    const northPalms = placed.filter((p) => p.island === "north" && p.dress === "north-port-palm");
    expect(northPalms.length).toBeGreaterThan(0);
    expect(northPalms.length).toBeLessThanOrEqual(NORTH_PORT_PALM_OFFSETS.length);

    const acornBoxes: THREE.Mesh[] = [];
    const needleBoxes: THREE.Mesh[] = [];
    const lichenBoxes: THREE.Mesh[] = [];
    const mossBoxes: THREE.Mesh[] = [];
    const knotBoxes: THREE.Mesh[] = [];
    const barkBoxes: THREE.Mesh[] = [];
    const twigBoxes: THREE.Mesh[] = [];
    const vineBoxes: THREE.Mesh[] = [];
    const huskBoxes: THREE.Mesh[] = [];
    const frondBoxes: THREE.Mesh[] = [];
    const leafBoxes: THREE.Mesh[] = [];
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.userData.part === "acorn") acornBoxes.push(mesh);
      if (mesh.userData.part === "needle") needleBoxes.push(mesh);
      if (mesh.userData.part === "lichen") lichenBoxes.push(mesh);
      if (mesh.userData.part === "moss") mossBoxes.push(mesh);
      if (mesh.userData.part === "knot") knotBoxes.push(mesh);
      if (mesh.userData.part === "bark") barkBoxes.push(mesh);
      if (mesh.userData.part === "twig") twigBoxes.push(mesh);
      if (mesh.userData.part === "vine") vineBoxes.push(mesh);
      if (mesh.userData.part === "husk") huskBoxes.push(mesh);
      if (mesh.userData.part === "frond") frondBoxes.push(mesh);
      if (mesh.userData.part === "leaf") leafBoxes.push(mesh);
    });
    expect(acornBoxes.length).toBe(1);
    expect(needleBoxes.length).toBe(1);
    expect(lichenBoxes.length).toBe(1);
    expect(mossBoxes.length).toBe(1);
    expect(knotBoxes.length).toBe(1);
    expect(barkBoxes.length).toBe(1);
    expect(twigBoxes.length).toBe(1);
    expect(vineBoxes.length).toBe(1);
    expect(huskBoxes.length).toBe(1);
    expect(frondBoxes.length).toBe(1);
    expect(leafBoxes.length).toBe(1);

    const nuts: THREE.Mesh[] = [];
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.userData.part === "coconut") nuts.push(mesh);
    });
    expect(nuts.length).toBeGreaterThanOrEqual(4);

    const birds: THREE.Object3D[] = [];
    const nests: THREE.Object3D[] = [];
    const eggs: THREE.Object3D[] = [];
    root.traverse((obj) => {
      if (obj.userData.kind === "bird") birds.push(obj);
      if (obj.userData.kind === "nest") nests.push(obj);
      if (obj.userData.kind === "egg") eggs.push(obj);
    });
    expect(birds.length).toBe(1);
    expect(nests.length).toBe(1);
    expect(eggs.length).toBe(1);

    const kraft = new Set([0x8a6238, 0x9a6a40, 0x3f7a38, 0x2f6b32]);
    const acorn = acornBoxes[0];
    expect(acorn.userData.part).toBe("acorn");
    expect(acorn.userData.dress).toBe("acorn");
    expect(acorn.userData.mode).toBe("PAPER");
    expect(acorn.userData.provenance).toBe("PAPER");
    expect(acorn.geometry.type).toBe("BoxGeometry");
    const mat = acorn.material as THREE.MeshLambertMaterial;
    expect(mat.type).toBe("MeshLambertMaterial");
    expect(kraft.has(mat.color.getHex())).toBe(true);
    expect(isGrey(mat.color.getHex())).toBe(false);

    acorn.geometry.computeBoundingBox();
    const size = new THREE.Vector3();
    acorn.geometry.boundingBox!.getSize(size);
    size.multiply(acorn.scale);
    expect(size.x).toBeLessThan(0.2);
    expect(size.y).toBeLessThan(0.08);
    expect(size.z).toBeLessThan(0.15);

    const acornPos = new THREE.Vector3();
    acorn.getWorldPosition(acornPos);
    const port = ISLANDS.north.port;
    expect(distToPaved(ISLANDS.north, acornPos.x, acornPos.z)).toBeGreaterThanOrEqual(PAVED_CLEAR_M);
    expect(onPublicQuay(ISLANDS.north, acornPos.x, acornPos.z)).toBe(false);
    expect(heightAt(ISLANDS.north, acornPos.x, acornPos.z)).toBeGreaterThanOrEqual(WATER_MIN_M);
    expect(Math.hypot(acornPos.x - port.x, acornPos.z - port.z)).toBeLessThan(400);
    const atTrunk = northPalms.some((p) => Math.hypot(p.x - acornPos.x, p.z - acornPos.z) < 0.5);
    expect(atTrunk).toBe(true);
    const nestPos = new THREE.Vector3();
    nests[0].getWorldPosition(nestPos);
    expect(acornPos.y).toBeGreaterThan(nestPos.y + 0.3);

    const others: THREE.Vector3[] = [];
    root.traverse((obj) => {
      const part = obj.userData.part;
      if (
        part === "needle" ||
        part === "lichen" ||
        part === "moss" ||
        part === "knot" ||
        part === "bark" ||
        part === "twig" ||
        part === "vine" ||
        part === "husk" ||
        part === "frond" ||
        part === "leaf" ||
        part === "coconut" ||
        part === "bird" ||
        part === "nest" ||
        part === "egg"
      ) {
        const p = new THREE.Vector3();
        obj.getWorldPosition(p);
        others.push(p);
      }
    });
    expect(others.length).toBeGreaterThan(0);
    for (const p of others) {
      expect(Math.hypot(acornPos.x - p.x, acornPos.y - p.y, acornPos.z - p.z)).toBeGreaterThan(0.01);
    }
  });
});
