import { describe, expect, it } from "vitest";
import { ISLANDS } from "./land.ts";
import {
  NORTH_QUAY_WALKERS,
  createPresence,
  nearby,
  register,
  seedNorthQuayWalkers,
} from "./presence.ts";
import {
  MODE,
  PROVENANCE,
  QUAY_ALONG_MAX_M,
  QUAY_ALONG_MIN_M,
  QUAY_X_PAD_M,
  STEP_M,
  WALK_NOTE,
  clampToNorthQuay,
  quayBounds,
  walkSeededPresence,
} from "./presenceWalk.ts";

describe("PAPER seeded north-quay presence walk", () => {
  it("is PAPER / SIMULATED and steps a few metres", () => {
    expect(MODE).toBe("PAPER");
    expect(PROVENANCE).toBe("SIMULATED");
    expect(WALK_NOTE).toMatch(/PAPER/);
    expect(WALK_NOTE).toMatch(/SIMULATED/);
    expect(STEP_M).toBeGreaterThanOrEqual(1);
    expect(STEP_M).toBeLessThanOrEqual(5);
  });

  it("clamps to land-ish coords around the seeded north port, not south 6950", () => {
    const port = ISLANDS.north.port;
    expect(port).toEqual({ x: 0, z: -6950 });
    const b = quayBounds();
    expect(b.xMin).toBe(port.x - QUAY_X_PAD_M);
    expect(b.xMax).toBe(port.x + QUAY_X_PAD_M);
    expect(b.zMin).toBe(port.z + QUAY_ALONG_MIN_M);
    expect(b.zMax).toBe(port.z + QUAY_ALONG_MAX_M);
    const far = clampToNorthQuay(400, 6950);
    expect(far.x).toBeGreaterThanOrEqual(b.xMin);
    expect(far.x).toBeLessThanOrEqual(b.xMax);
    expect(far.z).toBeGreaterThanOrEqual(b.zMin);
    expect(far.z).toBeLessThanOrEqual(b.zMax);
    expect(far.z).not.toBe(6950);
  });

  it("moves the four seeded walkers so nearby() coords are not statues", () => {
    const grid = createPresence();
    seedNorthQuayWalkers(grid);
    const port = ISLANDS.north.port;
    const before = nearby(grid, port.x, port.z).map((a) => ({ id: a.id, x: a.x, z: a.z }));
    const moved = walkSeededPresence(grid);
    expect(moved).toHaveLength(4);
    expect(moved.every((a) => a.island === "north")).toBe(true);
    const after = nearby(grid, port.x, port.z);
    expect(after).toHaveLength(4);
    expect(after.map((a) => a.name).sort()).toEqual(
      NORTH_QUAY_WALKERS.map((w) => w.name).sort(),
    );
    for (const actor of after) {
      const prev = before.find((b) => b.id === actor.id);
      expect(prev).toBeTruthy();
      const dz = Math.abs(actor.z - prev!.z);
      const dx = Math.abs(actor.x - prev!.x);
      expect(dz + dx).toBeGreaterThanOrEqual(STEP_M);
      expect(Math.hypot(actor.x - port.x, actor.z - port.z)).toBeLessThan(80);
    }
  });

  it("seeds on first tick if the grid is empty", () => {
    const grid = createPresence();
    const moved = walkSeededPresence(grid);
    expect(moved).toHaveLength(4);
    expect(moved.map((a) => a.id).sort()).toEqual(
      NORTH_QUAY_WALKERS.map((w) => w.id).sort(),
    );
  });

  it("does not move a visitor or other registered actor", () => {
    const grid = createPresence();
    const port = ISLANDS.north.port;
    register(grid, {
      id: "visitor",
      name: "Ada",
      x: port.x + 4,
      z: port.z + 2,
      island: "north",
    });
    walkSeededPresence(grid);
    const visitor = grid.actors.get("visitor");
    expect(visitor).toEqual({
      id: "visitor",
      name: "Ada",
      x: port.x + 4,
      z: port.z + 2,
      island: "north",
    });
  });

  it("stays on the quay apron after many ticks", () => {
    const grid = createPresence();
    const port = ISLANDS.north.port;
    const b = quayBounds();
    for (let i = 0; i < 80; i++) walkSeededPresence(grid);
    const seen = nearby(grid, port.x, port.z);
    expect(seen).toHaveLength(4);
    for (const actor of seen) {
      expect(actor.x).toBeGreaterThanOrEqual(b.xMin);
      expect(actor.x).toBeLessThanOrEqual(b.xMax);
      expect(actor.z).toBeGreaterThanOrEqual(b.zMin);
      expect(actor.z).toBeLessThanOrEqual(b.zMax);
    }
  });
});
