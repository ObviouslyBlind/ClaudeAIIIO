import { describe, expect, it } from "vitest";
import { buildDistricts, districtAt } from "./districts.ts";
import { heightAt, ISLANDS, pointInRing } from "./land.ts";

function ringArea(ring: [number, number][]): number {
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, z1] = ring[i];
    const [x2, z2] = ring[(i + 1) % ring.length];
    a += x1 * z2 - x2 * z1;
  }
  return Math.abs(a) / 2;
}

const EARTH_NAMES = /kingston|havana|nassau|bridgetown|san juan|jamaica|cuba|haiti|barbados|bahamas|osm|openstreetmap|mapbox|cesium/i;

describe("House constituencies", () => {
  it("authors 10 irregular rings per island (20 total) in local metres", () => {
    const districts = buildDistricts();
    expect(districts).toHaveLength(20);
    expect(districts.filter((d) => d.island === "north")).toHaveLength(10);
    expect(districts.filter((d) => d.island === "south")).toHaveLength(10);
    expect(new Set(districts.map((d) => d.id)).size).toBe(20);
    expect(ISLANDS.north.cz).toBe(-9000);
    expect(ISLANDS.south.cz).toBe(9000);
    expect(ISLANDS.north.port).toEqual({ x: 0, z: -6950 });
    expect(ISLANDS.south.port.x).toBeLessThan(-1500);
    expect(ISLANDS.south.port.z).toBeGreaterThan(7000);
    for (const d of districts) {
      expect(d.ring.length).toBeGreaterThanOrEqual(6);
      expect(d.ring.every((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]))).toBe(true);
      expect(ringArea(d.ring)).toBeGreaterThan(40_000);
      const xs = d.ring.map((p) => p[0]);
      const zs = d.ring.map((p) => p[1]);
      const axisRect =
        xs.every((x) => x === xs[0] || x === xs[xs.length - 1]) &&
        zs.every((z) => z === zs[0] || z === zs[zs.length - 1]);
      expect(axisRect).toBe(false);
      expect(EARTH_NAMES.test(d.id + " " + d.name)).toBe(false);
    }
    const blob = districts.map((d) => `${d.id} ${d.name}`).join(" ").toLowerCase();
    expect(blob).toMatch(/harbour/);
    expect(blob).toMatch(/mill town/);
    expect(blob).toMatch(/farm belt/);
    expect(blob).toMatch(/mine belt/);
  });

  it("puts every land sample near a port in that island's harbour district", () => {
    for (const spec of Object.values(ISLANDS)) {
      const harbourId = `${spec.id}-harbour`;
      const atPort = districtAt(spec.port.x, spec.port.z);
      expect(atPort?.id).toBe(harbourId);
      let landHits = 0;
      for (let dx = -220; dx <= 220; dx += 40) {
        for (let dz = -220; dz <= 220; dz += 40) {
          const x = spec.port.x + dx;
          const z = spec.port.z + dz;
          if (Math.hypot(dx, dz) > 220) continue;
          if (heightAt(spec, x, z) < 0.4) continue;
          landHits += 1;
          expect(districtAt(x, z)?.id).toBe(harbourId);
        }
      }
      expect(landHits).toBeGreaterThan(8);
    }
  });

  it("returns the smallest containing ring where districts overlap", () => {
    const districts = buildDistricts();
    let found = false;
    for (const spec of Object.values(ISLANDS)) {
      for (let x = spec.cx - spec.rx; x <= spec.cx + spec.rx; x += 180) {
        for (let z = spec.cz - spec.rz; z <= spec.cz + spec.rz; z += 120) {
          const hits = districts.filter((d) => pointInRing(x, z, d.ring));
          if (hits.length < 2) continue;
          found = true;
          const smallest = hits.reduce((a, b) => (ringArea(a.ring) <= ringArea(b.ring) ? a : b));
          expect(districtAt(x, z)?.id).toBe(smallest.id);
        }
      }
    }
    expect(found).toBe(true);
  });

  it("covers authored island land and leaves the channel empty", () => {
    expect(districtAt(0, 0)).toBeUndefined();
    for (const spec of Object.values(ISLANDS)) {
      let land = 0;
      let covered = 0;
      for (let x = spec.cx - spec.rx; x <= spec.cx + spec.rx; x += 250) {
        for (let z = spec.cz - spec.rz; z <= spec.cz + spec.rz; z += 160) {
          if (heightAt(spec, x, z) < 0.4) continue;
          land += 1;
          if (districtAt(x, z)?.island === spec.id) covered += 1;
        }
      }
      expect(land).toBeGreaterThan(40);
      expect(covered).toBe(land);
    }
  });
});
