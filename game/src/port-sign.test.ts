import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { heightAt, ISLANDS } from "./land.ts";
import { makePortSign, SIGN_LINE } from "../public/harbour/port-sign.js";

const WOOD = 0x8a6238;
const WOOD_DARK = 0x6a4a2a;

function collectBrace(root: THREE.Object3D) {
  const out: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.userData?.part === "brace" || obj.userData?.kind === "port-sign-brace") {
      out.push(obj);
    }
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

function collectNail(root: THREE.Object3D) {
  const out: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.userData?.part === "nail") out.push(obj);
  });
  return out;
}

function collectScrew(root: THREE.Object3D) {
  const out: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.userData?.part === "screw") out.push(obj);
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

  it("puts a kraft PAPER wood cap on the north sign post", () => {
    const sign = makePortSign(ISLANDS.north, { heightAt });
    expect(sign).not.toBeNull();
    expect(sign!.userData.mode).toBe("PAPER");
    expect(SIGN_LINE).toBe("North port · PAPER");

    const caps = collectCap(sign!);
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

  it("puts a tiny kraft PAPER nail on the north sign board, caps and braces remain", () => {
    const sign = makePortSign(ISLANDS.north, { heightAt });
    expect(sign).not.toBeNull();
    expect(sign!.userData.mode).toBe("PAPER");

    const braces = collectBrace(sign!);
    expect(braces.length).toBeGreaterThanOrEqual(1);
    const caps = collectCap(sign!);
    expect(caps.length).toBeGreaterThanOrEqual(1);

    const nails = collectNail(sign!);
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

  it("puts a tiny kraft PAPER screw on the north sign board, nail and braces remain", () => {
    const sign = makePortSign(ISLANDS.north, { heightAt });
    expect(sign).not.toBeNull();
    expect(sign!.userData.mode).toBe("PAPER");

    const braces = collectBrace(sign!);
    expect(braces.length).toBeGreaterThanOrEqual(1);
    const nails = collectNail(sign!);
    expect(nails.length).toBeGreaterThanOrEqual(1);

    const screws = collectScrew(sign!);
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

  it("faces inland with a spawn-readable two-post kraft board", () => {
    const sign = makePortSign(ISLANDS.north, { heightAt });
    expect(sign).not.toBeNull();
    expect(sign!.rotation.y).toBe(0);

    let board: THREE.Mesh | null = null;
    let face: THREE.Mesh | null = null;
    const posts: THREE.Mesh[] = [];
    sign!.traverse((obj) => {
      if (obj.userData?.part === "board") board = obj as THREE.Mesh;
      if (obj.userData?.kind === "port-sign-face") face = obj as THREE.Mesh;
      if (obj.userData?.part === "post") posts.push(obj as THREE.Mesh);
    });
    expect(board).not.toBeNull();
    expect(face).not.toBeNull();
    expect(posts.length).toBe(2);

    const boardGeom = (board as THREE.Mesh).geometry as THREE.BoxGeometry;
    expect(boardGeom.parameters.width).toBeGreaterThanOrEqual(10);
    expect(boardGeom.parameters.height).toBeGreaterThanOrEqual(5);

    const postGeom = posts[0].geometry as THREE.BoxGeometry;
    expect(postGeom.parameters.height).toBeGreaterThanOrEqual(12);
    expect(postGeom.parameters.width).toBeGreaterThanOrEqual(1);

    expect(face!.position.z).toBeLessThan(0);
    expect(Math.abs(face!.rotation.y)).toBeGreaterThan(3);
  });
});
