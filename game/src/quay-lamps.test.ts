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

describe("quay paper lamps", () => {
  it("plants a few wooden kraft-glass posts on both timber piers", () => {
    expect(QUAY_LAMP_SPOTS.length).toBeGreaterThanOrEqual(4);
    expect(QUAY_LAMP_SPOTS.length).toBeLessThanOrEqual(8);

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
        expect(lamp.position.y).toBeCloseTo(y + 0.5, 5);
      }

      const colors = hexes(group!);
      expect(colors).toContain(WOOD);
      expect(colors).toContain(WOOD_DARK);
      expect(colors).toContain(KRAFT);
      expect(colors).not.toContain(IRON);

      const glass = collectKind(group!, "quay-lamp-glass");
      expect(glass.length).toBe(QUAY_LAMP_SPOTS.length);
      for (const pane of glass) {
        const mat = (pane as THREE.Mesh).material as THREE.MeshLambertMaterial;
        expect(mat.emissive.getHex()).toBe(GLOW);
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
