import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { heightAt, ISLANDS } from "./land.ts";
import {
  FOAM_SAMPLES,
  PIER_FOAM_Y,
  PORT_FOAM_SAMPLES,
  makeShoreFoam,
  paintShoreColor,
} from "../public/harbour/shore.js";
import { CAMERA_FAR_M, spawnCameraOffset, spawnLookAtOffset } from "../public/harbour/roads.js";

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

  it("widens the beach apron inland of the old 0.5–0.8 cut", () => {
    const apron = paintShoreColor(3.2, 0.6, grass, sand, rock);
    expect(dist(apron, sand)).toBeLessThan(dist(apron, grass));

    const mid = paintShoreColor(7.4, 0.655, grass, sand, rock);
    expect(dist(mid, sand)).toBeLessThan(dist(mid, grass));
  });

  it("paints harbour grade as grass underfoot, not a sand sheet", () => {
    const apron = paintShoreColor(1.28, 0.58, grass, sand, rock, { grade: 1 });
    expect(dist(apron, grass)).toBeLessThan(dist(apron, sand));

    const verge = paintShoreColor(1.28, 0.58, grass, sand, rock, { grade: 1, verge: true });
    expect(dist(verge, grass)).toBeLessThan(dist(verge, sand));
    expect(dist(verge, apron)).toBeGreaterThan(0.02);
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

  it("tints drowned verts toward the lagoon, not grass", () => {
    const drowned = paintShoreColor(-4, 1.15, grass, sand, rock);
    expect(dist(drowned, water)).toBeLessThan(dist(drowned, grass));
    expect(dist(drowned, water)).toBeLessThan(dist(drowned, sand));
  });

  it("puts denser foam near the port, not only a far ring of dots", () => {
    const added: THREE.Object3D[] = [];
    const scene = { add(obj: THREE.Object3D) { added.push(obj); } };
    const group = makeShoreFoam(ISLANDS.north, heightAt, scene);
    expect(added).toEqual([group]);
    expect(group.children.length).toBeGreaterThan(12);
    expect(group.children.length).toBeLessThanOrEqual(FOAM_SAMPLES + PORT_FOAM_SAMPLES);
    expect(FOAM_SAMPLES + PORT_FOAM_SAMPLES).toBeLessThanOrEqual(72);

    const port = ISLANDS.north.port;
    const nearPort = group.children.filter(
      (child) => Math.hypot(child.position.x - port.x, child.position.z - port.z) < 320,
    );
    expect(nearPort.length).toBeGreaterThanOrEqual(12);

    const geos = new Set(group.children.map((child) => (child as THREE.Mesh).geometry));
    expect(geos.size).toBeLessThanOrEqual(2);

    for (const child of group.children) {
      const dn = Math.hypot(child.position.x - ISLANDS.north.cx, child.position.z - ISLANDS.north.cz);
      const ds = Math.hypot(child.position.x - ISLANDS.south.cx, child.position.z - ISLANDS.south.cz);
      expect(dn).toBeLessThan(ds);
      if (child.position.y < 0.85) continue;
      const h = heightAt(ISLANDS.north, child.position.x, child.position.z);
      expect(h).toBeGreaterThanOrEqual(0.3);
      expect(h).toBeLessThanOrEqual(0.8);
    }
  });

  it("lays pale kraft foam dashes in the water beside the public pier", () => {
    const scene = { add(_obj: THREE.Object3D) {} };
    for (const id of ["north", "south"] as const) {
      const spec = ISLANDS[id];
      const group = makeShoreFoam(spec, heightAt, scene);
      const toward = id === "north" ? 1 : -1;
      const dashes = group.children.filter((child) => {
        const across = Math.abs(child.position.x - spec.port.x);
        const along = (child.position.z - spec.port.z) * toward;
        return across > 5.5 && across < 14 && along > 8 && along < 120 && child.position.y < 0.9;
      });
      expect(dashes.length).toBeGreaterThanOrEqual(10);
      for (const child of dashes) {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.MeshLambertMaterial;
        expect(mat.color.getHex()).toBe(0xefe6c9);
        expect(child.position.y).toBeCloseTo(PIER_FOAM_Y, 5);
      }
    }
  });

  it("puts kraft foam bars in the basin past the north pier lip", () => {
    const spec = ISLANDS.north;
    const scene = { add(_obj: THREE.Object3D) {} };
    const group = makeShoreFoam(spec, heightAt, scene);
    const toward = 1;
    const basin = group.children.filter((child) => {
      const across = Math.abs(child.position.x - spec.port.x);
      const along = (child.position.z - spec.port.z) * toward;
      return across < 10 && along > 82 && along < 112 && child.userData?.kind === "foam";
    });
    expect(basin.length).toBeGreaterThanOrEqual(8);
  });

  it("does not require basin foam in the inland playtest spawn frame", () => {
    const spec = ISLANDS.north;
    const o = spawnCameraOffset("north");
    const l = spawnLookAtOffset("north");
    expect(o.z).toBeGreaterThan(0);
    expect(l.z).toBeLessThan(0);
    const px = spec.port.x;
    const pz = spec.port.z - 8;
    const py = heightAt(spec, px, pz) + 1.15;
    const cam = new THREE.PerspectiveCamera(48, 16 / 9, 0.4, CAMERA_FAR_M);
    cam.position.set(px + o.x, py + o.y, pz + o.z);
    cam.lookAt(px + l.x, py + l.y, pz + l.z);
    cam.updateMatrixWorld();
    const berth = new THREE.Vector3(0, 1.2, -6835).project(cam);
    expect(berth.z).toBeGreaterThanOrEqual(1);
  });

  it("does not move island centres", () => {
    expect(ISLANDS.north.cx).toBe(0);
    expect(ISLANDS.north.cz).toBe(-9000);
    expect(ISLANDS.south.cz).toBe(9000);
    expect(ISLANDS.south.port.z - ISLANDS.north.port.z).toBeGreaterThan(12000);
  });
});
