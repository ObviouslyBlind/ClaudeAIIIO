import { describe, expect, it } from "vitest";
import { ISLANDS } from "../src/land.ts";
import {
  CELL_SIZE_M,
  DEFAULT_RADIUS_M,
  NORTH_QUAY_WALKERS,
  SOUTH_QUAY_WALKERS,
  cellIndex,
  cellKey,
  createPresence,
  nearby,
  presenceQuery,
  register,
  seedNorthQuayWalkers,
  toSnapshot,
  unregister,
} from "../src/presence.ts";

describe("PAPER outdoor presence cells", () => {
  it("uses a 250 m interest grid", () => {
    expect(CELL_SIZE_M).toBe(250);
    expect(DEFAULT_RADIUS_M).toBe(250);
    expect(cellIndex(0, CELL_SIZE_M)).toBe(0);
    expect(cellIndex(249, CELL_SIZE_M)).toBe(0);
    expect(cellIndex(250, CELL_SIZE_M)).toBe(1);
    expect(cellIndex(-1, CELL_SIZE_M)).toBe(-1);
    expect(cellKey(0, -6950)).toBe(`${cellIndex(0)}:${cellIndex(-6950)}`);
  });

  it("registers outdoor actors by id, name, x, z, island", () => {
    const grid = createPresence();
    const saved = register(grid, {
      id: "visitor",
      name: "Ada",
      x: 10,
      z: -20,
      island: "north",
    });
    expect(saved).toEqual({ id: "visitor", name: "Ada", x: 10, z: -20, island: "north" });
    expect(grid.actors.get("visitor")).toEqual(saved);
    expect(grid.cells.get(cellKey(10, -20))?.has("visitor")).toBe(true);
  });

  it("nearby returns others in the same cell and neighbour cells, not a far cell", () => {
    const grid = createPresence();
    register(grid, { id: "self", name: "Self", x: 10, z: 10, island: "north" });
    register(grid, { id: "same", name: "Same", x: 40, z: 20, island: "north" });
    register(grid, { id: "nbr", name: "Neighbour", x: 260, z: 10, island: "north" });
    register(grid, { id: "far", name: "Far", x: 800, z: 10, island: "north" });

    const ids = nearby(grid, 10, 10, 250, "self").map((a) => a.id).sort();
    expect(ids).toEqual(["nbr", "same"]);
    expect(ids).not.toContain("self");
    expect(ids).not.toContain("far");
  });

  it("re-register moves an actor into a new cell", () => {
    const grid = createPresence();
    register(grid, { id: "walker", name: "Walker", x: 10, z: 10, island: "north" });
    const oldKey = cellKey(10, 10);
    register(grid, { id: "walker", name: "Walker", x: 800, z: 10, island: "south" });
    expect(grid.cells.get(oldKey)?.has("walker")).toBeFalsy();
    expect(grid.cells.get(cellKey(800, 10))?.has("walker")).toBe(true);
    expect(grid.actors.get("walker")?.island).toBe("south");
    expect(unregister(grid, "walker")).toBe(true);
    expect(grid.actors.has("walker")).toBe(false);
  });

  it("seeds four named NPC walkers on the north quay", () => {
    const grid = createPresence();
    const seeded = seedNorthQuayWalkers(grid);
    expect(seeded).toHaveLength(4);
    expect(NORTH_QUAY_WALKERS.map((w) => w.name)).toEqual([
      "Nell Palmetto",
      "Tomas Crane",
      "Isla Bollard",
      "Reed Cart",
    ]);
    const port = ISLANDS.north.port;
    for (const walker of NORTH_QUAY_WALKERS) {
      expect(walker.island).toBe("north");
      expect(Math.hypot(walker.x - port.x, walker.z - port.z)).toBeLessThan(50);
    }
    const seen = nearby(grid, port.x, port.z, 250);
    expect(seen).toHaveLength(4);
    expect(seen.map((a) => a.id).sort()).toEqual(
      NORTH_QUAY_WALKERS.map((w) => w.id).sort(),
    );
  });

  it("toSnapshot is PAPER / SIMULATED and presenceQuery seeds on first poll", () => {
    const grid = createPresence();
    const port = ISLANDS.north.port;
    const snap = toSnapshot(grid, { x: port.x, z: port.z });
    expect(snap.mode).toBe("PAPER");
    expect(snap.provenance).toBe("SIMULATED");
    expect(snap.note).toMatch(/PAPER/);
    expect(snap.note).toMatch(/Not Colyseus/);
    expect(snap.note).toMatch(/Not Earth/);
    expect(snap.actors).toEqual([]);

    const first = presenceQuery(grid, {});
    expect(first.mode).toBe("PAPER");
    expect(first.provenance).toBe("SIMULATED");
    expect(first.cellSize).toBe(250);
    expect(first.query).toEqual({ x: port.x, z: port.z, radius: 250 });
    expect(first.actors).toHaveLength(4);

    const origin = presenceQuery(createPresence(), { x: "0", z: "0" });
    expect(origin.query).toEqual({ x: port.x, z: port.z, radius: 250 });
    expect(origin.actors).toHaveLength(4);

    const spawn = presenceQuery(createPresence(), { x: "0", z: "-6958" });
    expect(spawn.query).toEqual({ x: 0, z: -6958, radius: 250 });
    expect(spawn.actors).toHaveLength(4);
    expect(first.actors.every((a) => a.island === "north")).toBe(true);

    const south = presenceQuery(grid, {
      x: String(ISLANDS.south.port.x),
      z: String(ISLANDS.south.port.z),
    });
    expect(south.actors).toHaveLength(4);
    expect(south.actors.every((a) => a.island === "south")).toBe(true);
    expect(south.actors.map((a) => a.id).sort()).toEqual(SOUTH_QUAY_WALKERS.map((w) => w.id).sort());
  });
});
