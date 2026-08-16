import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { heightAt, ISLANDS } from "./land.ts";
import { FOAM_SAMPLES, makeShoreFoam, paintShoreColor } from "../public/harbour/shore.js";

const grass = new THREE.Color(0x4a7a3c);
const sand = new THREE.Color(0xe8d5a3);
const rock = new THREE.Color(0x6b5a4a);
const water = new THREE.Color(0x1d7a86);

function dist(c: THREE.Color, other: THREE.Color) {
  return Math.hypot(c.r - other.r, c.g - other.g, c.b - other.b);
}

describe("shoreline read", () => {
  it("paints the waterline as sand, not a hard green cliff", () => {
    const lip = paintShoreColor(0.4, 0.92, grass, sand, rock);
    expect(dist(lip, sand)).toBeLessThan(dist(lip, grass));

    const shelf = paintShoreColor(1.2, 0.78, grass, sand, rock);
    expect(dist(shelf, sand)).toBeLessThan(dist(shelf, grass));

    const wet = paintShoreColor(-0.2, 1.02, grass, sand, rock);
    expect(dist(wet, grass)).toBeGreaterThan(dist(wet, sand));
    expect(dist(wet, grass)).toBeGreaterThan(0.25);
  });

  it("keeps the interior grassy and the peak rocky", () => {
    const inland = paintShoreColor(18, 0.22, grass, sand, rock);
    expect(dist(inland, grass)).toBeLessThan(dist(inland, sand));

    const peak = paintShoreColor(52, 0.08, grass, sand, rock);
    expect(dist(peak, rock)).toBeLessThan(dist(peak, sand));
  });

  it("does not mutate the palette colours", () => {
    const g = grass.clone();
    const s = sand.clone();
    const r = rock.clone();
    paintShoreColor(0.35, 0.95, g, s, r);
    paintShoreColor(-8, 1.2, g, s, r);
    expect(g.equals(grass)).toBe(true);
    expect(s.equals(sand)).toBe(true);
    expect(r.equals(rock)).toBe(true);
  });

  it("drops a modest foam ring on the 0.3–0.8 m contour", () => {
    const added: THREE.Object3D[] = [];
    const scene = { add(obj: THREE.Object3D) { added.push(obj); } };
    const group = makeShoreFoam(ISLANDS.north, heightAt, scene);
    expect(added).toEqual([group]);
    expect(group.children.length).toBeGreaterThan(12);
    expect(group.children.length).toBeLessThanOrEqual(FOAM_SAMPLES);
    expect(FOAM_SAMPLES).toBeLessThanOrEqual(48);

    for (const child of group.children) {
      const h = heightAt(ISLANDS.north, child.position.x, child.position.z);
      expect(h).toBeGreaterThanOrEqual(0.3);
      expect(h).toBeLessThanOrEqual(0.8);
      const dn = Math.hypot(child.position.x - ISLANDS.north.cx, child.position.z - ISLANDS.north.cz);
      const ds = Math.hypot(child.position.x - ISLANDS.south.cx, child.position.z - ISLANDS.south.cz);
      expect(dn).toBeLessThan(ds);
    }
  });

  it("does not move island centres", () => {
    expect(ISLANDS.north.cx).toBe(0);
    expect(ISLANDS.north.cz).toBe(-4800);
    expect(ISLANDS.south.cz).toBe(4800);
    expect(ISLANDS.south.port.z - ISLANDS.north.port.z).toBeGreaterThan(8000);
  });
});
