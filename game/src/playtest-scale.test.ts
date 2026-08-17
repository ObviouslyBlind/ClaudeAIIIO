import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { heightAt, ISLANDS } from "./land.ts";
import { makeQuay } from "../public/harbour/quay.js";
import { makeQuayLamps } from "../public/harbour/quay-lamps.js";
import { makePortSign } from "../public/harbour/port-sign.js";

/** Visitor figure is ~2 m. Live spawn meshes must not read as towers. */
const PERSON_M = 2;

describe("playtest human scale (D036)", () => {
  it("keeps quay lamp posts street-lamp tall", () => {
    const group = makeQuayLamps(ISLANDS.north, { heightAt });
    expect(group).not.toBeNull();
    const posts: THREE.Mesh[] = [];
    group!.traverse((obj) => {
      if (obj.userData?.part === "post") posts.push(obj as THREE.Mesh);
    });
    expect(posts.length).toBeGreaterThan(0);
    for (const post of posts) {
      const h = (post.geometry as THREE.BoxGeometry).parameters.height;
      expect(h).toBeGreaterThan(PERSON_M);
      expect(h).toBeLessThan(PERSON_M * 2.2);
    }
  });

  it("keeps the north port sign under 4 m", () => {
    const sign = makePortSign(ISLANDS.north, { heightAt });
    expect(sign).not.toBeNull();
    const posts: THREE.Mesh[] = [];
    sign!.traverse((obj) => {
      if (obj.userData?.part === "post") posts.push(obj as THREE.Mesh);
    });
    expect(posts.length).toBe(2);
    for (const post of posts) {
      expect((post.geometry as THREE.BoxGeometry).parameters.height).toBeLessThan(4);
    }
  });

  it("keeps dinghy hulls under 5 m long", () => {
    const added: THREE.Object3D[] = [];
    const scene = { add(obj: THREE.Object3D) { added.push(obj); } };
    const root = makeQuay(ISLANDS.north, { scene, heightAt });
    const boats = root.children.filter((c) => c.userData?.kind === "dinghy");
    expect(boats.length).toBe(2);
    for (const boat of boats) {
      let hull: THREE.Mesh | null = null;
      boat.traverse((obj) => {
        if (obj.userData?.part === "hull") hull = obj as THREE.Mesh;
      });
      expect(hull).not.toBeNull();
      const d = (hull as THREE.Mesh).geometry as THREE.BoxGeometry;
      expect(d.parameters.depth).toBeLessThan(5);
      expect(d.parameters.height).toBeLessThan(1);
    }
  });

  it("does not plant a 34 m mast, 20 m shed, or 86 m land slab pier", () => {
    const src = readFileSync(new URL("../public/harbour/main.js", import.meta.url), "utf8");
    expect(src).not.toMatch(/box\(0\.85, 34/);
    expect(src).not.toMatch(/box\(20, 5\.8, 12/);
    expect(src).not.toMatch(/box\(11, 0\.45, 86/);
    expect(src).toContain("box(8, 3.4, 6");
    expect(src).toContain("box(7, 0.4, pierLen");
  });
});
