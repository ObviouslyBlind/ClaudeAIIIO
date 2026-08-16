import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { heightAt, ISLANDS } from "./land.ts";
import { makeSouthSign, SIGN_LINE } from "../public/harbour/south-sign.js";

const WOOD = 0x8a6238;

function collectPart(root: THREE.Object3D, name: string) {
  const out: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.userData?.part === name) {
      out.push(obj);
    }
  });
  return out;
}

describe("south port sign", () => {
  it("keeps a kraft wood post brace on the south sign, PAPER only", () => {
    const sign = makeSouthSign(ISLANDS.south, { heightAt });
    expect(sign).not.toBeNull();
    expect(sign!.name).toBe("south-sign");
    expect(sign!.userData.mode).toBe("PAPER");
    expect(sign!.userData.line).toBe(SIGN_LINE);
    expect(SIGN_LINE).toContain("PAPER");
    expect(SIGN_LINE).toBe("South port · PAPER");

    const braces = collectPart(sign!, "brace");
    expect(braces.length).toBeGreaterThanOrEqual(1);
    for (const b of braces) {
      expect(b.userData.part).toBe("brace");
      expect(b.userData.mode).toBe("PAPER");
      const mesh = b as THREE.Mesh;
      expect(mesh.geometry).toBeInstanceOf(THREE.BoxGeometry);
      const mat = mesh.material as THREE.MeshLambertMaterial;
      expect(mat.color.getHex()).toBe(WOOD);
    }

    expect(makeSouthSign(ISLANDS.north, { heightAt })).toBeNull();
  });

  it("puts a kraft PAPER cap on a south sign post, WOOD box only", () => {
    const sign = makeSouthSign(ISLANDS.south, { heightAt });
    expect(sign).not.toBeNull();
    expect(sign!.userData.mode).toBe("PAPER");

    const braces = collectPart(sign!, "brace");
    expect(braces.length).toBeGreaterThanOrEqual(1);

    const caps = collectPart(sign!, "cap");
    expect(caps.length).toBeGreaterThanOrEqual(1);
    for (const c of caps) {
      expect(c.userData.part).toBe("cap");
      expect(c.userData.mode).toBe("PAPER");
      const mesh = c as THREE.Mesh;
      expect(mesh.geometry).toBeInstanceOf(THREE.BoxGeometry);
      const mat = mesh.material as THREE.MeshLambertMaterial;
      expect(mat.color.getHex()).toBe(WOOD);
    }
  });
});
