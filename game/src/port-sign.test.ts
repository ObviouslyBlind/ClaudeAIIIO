import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { heightAt, ISLANDS } from "./land.ts";
import { makePortSign, SIGN_LINE } from "../public/harbour/port-sign.js";

const WOOD = 0x8a6238;

function collectBrace(root: THREE.Object3D) {
  const out: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.userData?.part === "brace" || obj.userData?.kind === "port-sign-brace") {
      out.push(obj);
    }
  });
  return out;
}

describe("north port sign", () => {
  it("keeps a kraft wood post brace on the north sign, PAPER only", () => {
    const sign = makePortSign(ISLANDS.north, { heightAt });
    expect(sign).not.toBeNull();
    expect(sign!.name).toBe("port-sign");
    expect(sign!.userData.mode).toBe("PAPER");
    expect(sign!.userData.line).toBe(SIGN_LINE);
    expect(SIGN_LINE).toBe("North port · PAPER");

    const braces = collectBrace(sign!);
    expect(braces.length).toBeGreaterThanOrEqual(1);
    for (const b of braces) {
      expect(b.userData.mode).toBe("PAPER");
      const mesh = b as THREE.Mesh;
      expect(mesh.geometry).toBeInstanceOf(THREE.BoxGeometry);
      const mat = mesh.material as THREE.MeshLambertMaterial;
      expect(mat.color.getHex()).toBe(WOOD);
    }

    expect(makePortSign(ISLANDS.south, { heightAt })).toBeNull();
  });
});
