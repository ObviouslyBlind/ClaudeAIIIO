import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { heightAt, ISLANDS } from "./land.ts";
import { makeSouthSign, SIGN_LINE } from "../public/harbour/south-sign.js";

const WOOD = 0x8a6238;
const WOOD_DARK = 0x6a4a2a;

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

  it("puts a tiny kraft PAPER nail on the south sign board, caps and braces remain", () => {
    const sign = makeSouthSign(ISLANDS.south, { heightAt });
    expect(sign).not.toBeNull();
    expect(sign!.userData.mode).toBe("PAPER");

    const braces = collectPart(sign!, "brace");
    expect(braces.length).toBeGreaterThanOrEqual(1);
    const caps = collectPart(sign!, "cap");
    expect(caps.length).toBeGreaterThanOrEqual(1);

    const nails = collectPart(sign!, "nail");
    expect(nails.length).toBeGreaterThanOrEqual(1);
    for (const n of nails) {
      expect(n.userData.part).toBe("nail");
      expect(n.userData.mode).toBe("PAPER");
      const mesh = n as THREE.Mesh;
      expect(mesh.geometry).toBeInstanceOf(THREE.BoxGeometry);
      const mat = mesh.material as THREE.MeshLambertMaterial;
      expect(mat.color.getHex()).toBe(WOOD_DARK);
      const { width, height, depth } = (mesh.geometry as THREE.BoxGeometry).parameters;
      expect(width).toBeLessThan(0.12);
      expect(height).toBeLessThan(0.12);
      expect(depth).toBeLessThan(0.12);
    }
  });

  it("puts a tiny kraft PAPER screw on the south sign board, nail caps and braces remain", () => {
    const sign = makeSouthSign(ISLANDS.south, { heightAt });
    expect(sign).not.toBeNull();
    expect(sign!.userData.mode).toBe("PAPER");

    const braces = collectPart(sign!, "brace");
    expect(braces.length).toBeGreaterThanOrEqual(1);
    const caps = collectPart(sign!, "cap");
    expect(caps.length).toBeGreaterThanOrEqual(1);
    const nails = collectPart(sign!, "nail");
    expect(nails.length).toBeGreaterThanOrEqual(1);

    const screws = collectPart(sign!, "screw");
    expect(screws.length).toBeGreaterThanOrEqual(1);
    for (const s of screws) {
      expect(s.userData.part).toBe("screw");
      expect(s.userData.mode).toBe("PAPER");
      const mesh = s as THREE.Mesh;
      expect(mesh.geometry).toBeInstanceOf(THREE.BoxGeometry);
      const mat = mesh.material as THREE.MeshLambertMaterial;
      expect(mat.color.getHex()).toBe(WOOD);
      const { width, height, depth } = (mesh.geometry as THREE.BoxGeometry).parameters;
      expect(width).toBeLessThan(0.12);
      expect(height).toBeLessThan(0.12);
      expect(depth).toBeLessThan(0.12);
    }

    const nail = nails[0] as THREE.Mesh;
    const screw = screws[0] as THREE.Mesh;
    expect(screw.position.distanceTo(nail.position)).toBeGreaterThan(0.05);
  });

  it("puts a tiny kraft PAPER washer on the south sign board, screw and nail remain", () => {
    const sign = makeSouthSign(ISLANDS.south, { heightAt });
    expect(sign).not.toBeNull();
    expect(sign!.userData.mode).toBe("PAPER");

    const nails = collectPart(sign!, "nail");
    expect(nails.length).toBeGreaterThanOrEqual(1);
    const screws = collectPart(sign!, "screw");
    expect(screws.length).toBeGreaterThanOrEqual(1);

    const washers = collectPart(sign!, "washer");
    expect(washers.length).toBeGreaterThanOrEqual(1);
    for (const w of washers) {
      expect(w.userData.part).toBe("washer");
      expect(w.userData.mode).toBe("PAPER");
      const mesh = w as THREE.Mesh;
      expect(mesh.geometry).toBeInstanceOf(THREE.BoxGeometry);
      const mat = mesh.material as THREE.MeshLambertMaterial;
      expect(mat.color.getHex()).toBe(WOOD);
      const { width, height, depth } = (mesh.geometry as THREE.BoxGeometry).parameters;
      expect(width).toBeLessThan(0.12);
      expect(height).toBeLessThan(0.12);
      expect(depth).toBeLessThan(0.12);
    }

    const washer = washers[0] as THREE.Mesh;
    const screw = screws[0] as THREE.Mesh;
    const nail = nails[0] as THREE.Mesh;
    expect(washer.position.distanceTo(screw.position)).toBeGreaterThan(0.05);
    expect(washer.position.distanceTo(nail.position)).toBeGreaterThan(0.05);

    const caps = collectPart(sign!, "cap");
    const braces = collectPart(sign!, "brace");
    for (const c of caps) {
      expect(washer.position.distanceTo(c.position)).toBeGreaterThan(0.05);
    }
    for (const b of braces) {
      expect(washer.position.distanceTo(b.position)).toBeGreaterThan(0.05);
    }
  });

  it("puts a tiny kraft PAPER pin on the south sign board, washer screw and nail remain", () => {
    const sign = makeSouthSign(ISLANDS.south, { heightAt });
    expect(sign).not.toBeNull();
    expect(sign!.userData.mode).toBe("PAPER");

    const nails = collectPart(sign!, "nail");
    expect(nails.length).toBeGreaterThanOrEqual(1);
    const screws = collectPart(sign!, "screw");
    expect(screws.length).toBeGreaterThanOrEqual(1);
    const washers = collectPart(sign!, "washer");
    expect(washers.length).toBeGreaterThanOrEqual(1);
    const braces = collectPart(sign!, "brace");
    expect(braces.length).toBeGreaterThanOrEqual(1);
    const caps = collectPart(sign!, "cap");
    expect(caps.length).toBeGreaterThanOrEqual(1);

    const pins = collectPart(sign!, "pin");
    expect(pins.length).toBeGreaterThanOrEqual(1);
    for (const p of pins) {
      expect(p.userData.part).toBe("pin");
      expect(p.userData.mode).toBe("PAPER");
      const mesh = p as THREE.Mesh;
      expect(mesh.geometry).toBeInstanceOf(THREE.BoxGeometry);
      const mat = mesh.material as THREE.MeshLambertMaterial;
      expect(mat.color.getHex()).toBe(WOOD_DARK);
      const { width, height, depth } = (mesh.geometry as THREE.BoxGeometry).parameters;
      expect(width).toBeLessThan(0.12);
      expect(height).toBeLessThan(0.12);
      expect(depth).toBeLessThan(0.12);
    }

    const pin = pins[0] as THREE.Mesh;
    const washer = washers[0] as THREE.Mesh;
    const screw = screws[0] as THREE.Mesh;
    const nail = nails[0] as THREE.Mesh;
    expect(pin.position.distanceTo(washer.position)).toBeGreaterThan(0.05);
    expect(pin.position.distanceTo(screw.position)).toBeGreaterThan(0.05);
    expect(pin.position.distanceTo(nail.position)).toBeGreaterThan(0.05);
    for (const c of caps) {
      expect(pin.position.distanceTo(c.position)).toBeGreaterThan(0.05);
    }
    for (const b of braces) {
      expect(pin.position.distanceTo(b.position)).toBeGreaterThan(0.05);
    }
  });
});
