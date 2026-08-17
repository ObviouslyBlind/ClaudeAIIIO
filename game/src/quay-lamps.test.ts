import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { heightAt, ISLANDS } from "./land.ts";
import { makeQuay } from "../public/harbour/quay.js";
import { makeQuayLamps, QUAY_LAMP_SPOTS } from "../public/harbour/quay-lamps.js";

const WOOD = 0x8a6238;
const WOOD_DARK = 0x6a4a2a;
const KRAFT = 0xefe4c8;
const GLOW = 0xe8a45a;
const IRON = 0x3a322c;

function hexes(root: THREE.Object3D) {
  const colors: number[] = [];
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    const mat = mesh.material as THREE.MeshLambertMaterial | THREE.MeshLambertMaterial[] | undefined;
    if (!mat) return;
    if (Array.isArray(mat)) {
      for (const m of mat) if (m.color) colors.push(m.color.getHex());
    } else if (mat.color) colors.push(mat.color.getHex());
  });
  return colors;
}

function collectKind(root: THREE.Object3D, kind: string) {
  const out: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.userData?.kind === kind) out.push(obj);
  });
  return out;
}

function collectBrace(root: THREE.Object3D) {
  const out: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.userData?.part === "brace") out.push(obj);
  });
  return out;
}

function collectRing(root: THREE.Object3D) {
  const out: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.userData?.part === "ring") out.push(obj);
  });
  return out;
}

function collectBase(root: THREE.Object3D) {
  const out: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.userData?.part === "base") out.push(obj);
  });
  return out;
}

function collectDrip(root: THREE.Object3D) {
  const out: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.userData?.part === "drip") out.push(obj);
  });
  return out;
}

function collectCap(root: THREE.Object3D) {
  const out: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.userData?.part === "cap") out.push(obj);
  });
  return out;
}

function collectPost(root: THREE.Object3D) {
  const out: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.userData?.part === "post") out.push(obj);
  });
  return out;
}

describe("quay paper lamps", () => {
  it("plants a few wooden kraft-glass posts on both timber piers", () => {
    expect(QUAY_LAMP_SPOTS.length).toBeGreaterThanOrEqual(4);
    expect(QUAY_LAMP_SPOTS.length).toBeLessThanOrEqual(8);
    const alongs = QUAY_LAMP_SPOTS.map((s) => s.along);
    expect(alongs.filter((a) => a < 0).length).toBeGreaterThan(0);
    expect(alongs.filter((a) => a > 35).length).toBeGreaterThan(0);
    for (const along of alongs) {
      expect(Math.abs(along)).toBeLessThan(43);
    }

    for (const id of ["north", "south"] as const) {
      const spec = ISLANDS[id];
      const toward = id === "north" ? 1 : -1;
      const pierZ = spec.port.z + toward * 38;
      const y = heightAt(spec, spec.port.x, spec.port.z);
      const group = makeQuayLamps(spec, { heightAt });
      expect(group).not.toBeNull();
      expect(group!.userData.mode).toBe("PAPER");

      const lamps = collectKind(group!, "quay-lamp");
      expect(lamps.length).toBe(QUAY_LAMP_SPOTS.length);

      for (const lamp of lamps) {
        expect(Math.abs(lamp.position.x - spec.port.x)).toBeLessThan(5.5);
        expect(Math.abs(lamp.position.z - pierZ)).toBeLessThan(43);
        expect(Math.abs(lamp.position.z - pierZ)).toBeGreaterThan(6);
        expect(lamp.position.y).toBeCloseTo(y + 0.5, 5);
        const basesOnLamp = collectBase(lamp);
        expect(basesOnLamp.length).toBe(1);
      }

      const colors = hexes(group!);
      expect(colors).toContain(WOOD);
      expect(colors).toContain(WOOD_DARK);
      expect(colors).toContain(KRAFT);
      expect(colors).toContain(GLOW);
      expect(colors).not.toContain(IRON);

      const posts = collectPost(group!);
      expect(posts.length).toBe(QUAY_LAMP_SPOTS.length);
      for (const p of posts) {
        const mesh = p as THREE.Mesh;
        expect(mesh.geometry).toBeInstanceOf(THREE.BoxGeometry);
        const geo = mesh.geometry as THREE.BoxGeometry;
        expect(geo.parameters.height).toBeGreaterThan(2.8);
        expect(geo.parameters.height).toBeLessThan(4.5);
        const mat = mesh.material as THREE.MeshLambertMaterial;
        expect(mat.color.getHex()).toBe(WOOD_DARK);
      }

      const glass = collectKind(group!, "quay-lamp-glass");
      expect(glass.length).toBe(QUAY_LAMP_SPOTS.length);
      for (const pane of glass) {
        const mesh = pane as THREE.Mesh;
        const mat = mesh.material as THREE.MeshLambertMaterial;
        expect(mat.emissive.getHex()).toBe(GLOW);
        expect(mat.color.getHex()).toBe(GLOW);
        const geo = mesh.geometry as THREE.BoxGeometry;
        const max = Math.max(geo.parameters.width, geo.parameters.height, geo.parameters.depth);
        expect(max).toBeGreaterThan(0.2);
        expect(max).toBeLessThan(0.55);
      }

      const bases = collectBase(group!);
      expect(bases.length).toBe(QUAY_LAMP_SPOTS.length);
      for (const b of bases) {
        expect(b.userData.part).toBe("base");
        expect(b.userData.mode).toBe("PAPER");
        expect(b.position.y).toBeGreaterThanOrEqual(0.04);
        expect(b.position.y).toBeLessThanOrEqual(0.25);
        const mesh = b as THREE.Mesh;
        expect(mesh.geometry).toBeInstanceOf(THREE.BoxGeometry);
        const mat = mesh.material as THREE.MeshLambertMaterial;
        expect([WOOD, WOOD_DARK]).toContain(mat.color.getHex());
      }

      const braces = collectBrace(group!);
      expect(braces.length).toBe(QUAY_LAMP_SPOTS.length);
      for (const b of braces) {
        expect(b.userData.part).toBe("brace");
        expect(b.userData.mode).toBe("PAPER");
        const mesh = b as THREE.Mesh;
        expect(mesh.geometry).toBeInstanceOf(THREE.BoxGeometry);
        const mat = mesh.material as THREE.MeshLambertMaterial;
        expect(mat.color.getHex()).toBe(WOOD);
      }

      const rings = collectRing(group!);
      expect(rings.length).toBe(QUAY_LAMP_SPOTS.length);
      for (const r of rings) {
        expect(r.userData.part).toBe("ring");
        expect(r.userData.mode).toBe("PAPER");
        expect(r.position.y).toBeLessThan(3.8);
        expect(r.position.y).toBeGreaterThan(2.8);
        const boxes: THREE.Mesh[] = [];
        r.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (mesh.isMesh) boxes.push(mesh);
        });
        expect(boxes.length).toBeGreaterThanOrEqual(4);
        for (const mesh of boxes) {
          expect(mesh.geometry).toBeInstanceOf(THREE.BoxGeometry);
          expect(mesh.userData.mode).toBe("PAPER");
          const mat = mesh.material as THREE.MeshLambertMaterial;
          expect(mat.color.getHex()).toBe(KRAFT);
        }
      }

      const drips = collectDrip(group!);
      expect(drips.length).toBe(QUAY_LAMP_SPOTS.length);
      const caps = collectCap(group!);
      expect(caps.length).toBe(QUAY_LAMP_SPOTS.length);
      for (const lamp of lamps) {
        expect(collectBase(lamp).length).toBe(1);
        expect(collectKind(lamp, "quay-lamp-glass").length).toBe(1);
        expect(collectCap(lamp).length).toBe(1);
        expect(collectRing(lamp).length).toBe(1);
        const cups = collectDrip(lamp);
        expect(cups.length).toBe(1);
        const cup = cups[0] as THREE.Mesh;
        expect(cup.userData.part).toBe("drip");
        expect(cup.userData.mode).toBe("PAPER");
        expect(cup.geometry).toBeInstanceOf(THREE.BoxGeometry);
        const geo = cup.geometry as THREE.BoxGeometry;
        expect(geo.parameters.width).toBeGreaterThan(0.2);
        expect(geo.parameters.height).toBeLessThan(0.12);
        expect(geo.parameters.depth).toBeGreaterThan(0.2);
        expect(cup.position.y).toBeGreaterThan(3);
        expect(cup.position.y).toBeLessThan(3.6);
        const mat = cup.material as THREE.MeshLambertMaterial;
        expect(mat.color.getHex()).toBe(KRAFT);
      }
    }
  });

  it("hooks from makeQuay on north and south, not as a street-prop kit", () => {
    for (const id of ["north", "south"] as const) {
      const added: THREE.Object3D[] = [];
      const scene = { add(obj: THREE.Object3D) { added.push(obj); } };
      const root = makeQuay(ISLANDS[id], { scene, heightAt });
      expect(added).toEqual([root]);
      expect(collectKind(root, "quay-lamp").length).toBe(QUAY_LAMP_SPOTS.length);
      expect(collectKind(root, "street-prop").length).toBe(0);
    }
  });
});
