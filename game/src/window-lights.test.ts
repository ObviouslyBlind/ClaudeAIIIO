import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { meshForUse } from "../public/harbour/buildings.js";

const LEAF = 0x5f8a32;
const CORAL = 0xc45c3a;

describe("house window-sill blooms", () => {
  it("puts a kraft PAPER bloom box on each House sill planter", () => {
    const house = meshForUse("house", { area: 400 });
    const blooms: THREE.Mesh[] = [];
    house.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.userData?.part === "sill-bloom") blooms.push(mesh);
    });
    expect(blooms.length).toBeGreaterThanOrEqual(1);
    for (const bloom of blooms) {
      expect(bloom.userData.mode).toBe("PAPER");
      expect(bloom.geometry).toBeInstanceOf(THREE.BoxGeometry);
      const mat = bloom.material as THREE.MeshLambertMaterial;
      const hex = mat.color.getHex();
      expect(hex === LEAF || hex === CORAL).toBe(true);
    }
  });
});
