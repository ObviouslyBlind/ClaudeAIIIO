import { describe, expect, it } from "vitest";
import { createLandBoard, heightAt, ISLANDS } from "./land.ts";
import { SOUTH_PORT, SOUTH_RAB, SOUTH_TOWNS, SOUTH_VOLCANO, volcanoDist, distToPolyline } from "./southGeom.ts";
import { canWalk } from "./walk.ts";

describe("South land (no buildings)", () => {
  it("puts the South port on the west channel shore", () => {
    expect(ISLANDS.south.port).toEqual(SOUTH_PORT);
    expect(ISLANDS.south.port.x).toBeLessThan(-1500);
    expect(ISLANDS.north.port).toEqual({ x: 0, z: -6950 });
    expect(heightAt(ISLANDS.south, SOUTH_PORT.x, SOUTH_PORT.z)).toBeGreaterThan(0.5);
  });

  it("authors five empty town centres, three west of the volcano and two east", () => {
    const board = createLandBoard();
    const greens = board.plots.filter((p) => p.island === "south" && p.class === "reserved");
    expect(greens).toHaveLength(5);
    expect(greens.every((p) => !p.use && !p.owner)).toBe(true);
    const west = SOUTH_TOWNS.filter((t) => t.side === "west");
    const east = SOUTH_TOWNS.filter((t) => t.side === "east");
    expect(west).toHaveLength(3);
    expect(east).toHaveLength(2);
    expect(west.some((t) => t.access === "highway")).toBe(true);
    expect(west.some((t) => t.access === "inland")).toBe(true);
    expect(east.some((t) => t.access === "highway")).toBe(true);
    expect(east.some((t) => t.access === "inland")).toBe(true);
    for (const t of SOUTH_TOWNS) {
      expect(greens.some((g) => Math.hypot(g.x - t.x, g.z - t.z) < 80)).toBe(true);
      expect(t.x < SOUTH_VOLCANO.x === (t.side === "west")).toBe(true);
    }
  });

  it("runs a 4-lane highway from the west quay toward the east coast, around the volcano", () => {
    const board = createLandBoard();
    const hwy = board.roads.find((r) => r.island === "south" && r.lanes === 4);
    expect(hwy).toBeTruthy();
    expect(hwy!.name).toBe("Island Hwy");
    const xs = hwy!.points.map((p) => p.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(4000);
    expect(hwy!.points.every((p) => volcanoDist(p.x, p.z) > 400)).toBe(true);
    expect(board.roads.filter((r) => r.island === "south" && r.roundabout).length).toBe(4);
    expect(board.roads.some((r) => r.name === "Channel Sands")).toBe(true);
    expect(board.roads.some((r) => r.name === "Palm Arc")).toBe(true);
    expect(board.roads.some((r) => r.name === "South Strand")).toBe(true);
  });

  it("links towns with named dirt paths at moderate foot traffic, and seeds beach stall lots", () => {
    const board = createLandBoard();
    const dirt = board.roads.filter((r) => r.island === "south" && r.kind === "dirt" && r.name);
    expect(dirt.length).toBeGreaterThanOrEqual(12);
    const rows = board.roads.filter((r) => r.island === "south" && r.name?.includes(" Row "));
    expect(rows.length).toBeGreaterThan(6);
    const shore = board.plots.filter((p) => p.island === "south" && p.band === "shore");
    expect(shore.length).toBeGreaterThan(20);
    expect(shore.every((p) => p.zone === "commercial")).toBe(true);
    expect(board.plots.some((p) => p.island === "south" && p.use)).toBe(false);
  });

  it("keeps the volcano crater off-limits and leaves North's NPC town in place", () => {
    expect(canWalk(SOUTH_VOLCANO.x, SOUTH_VOLCANO.z, ISLANDS, heightAt)).toBe(false);
    const board = createLandBoard();
    const northNpc = board.plots.filter((p) => p.island === "north" && p.owner === "npc");
    expect(northNpc.length).toBeGreaterThan(8);
    expect(board.roads.some((r) => r.island === "north" && r.name === "Harbour Rd")).toBe(true);
  });

  it("holds a flat harbour grade on the west quay and along Island Hwy", () => {
    const s = ISLANDS.south;
    const yPort = heightAt(s, SOUTH_PORT.x, SOUTH_PORT.z);
    const yHwy = heightAt(s, SOUTH_PORT.x + 80, SOUTH_PORT.z + 8);
    const yRab = heightAt(s, -2080, 7440);
    expect(Math.abs(yPort - 1.28)).toBeLessThan(0.08);
    expect(Math.abs(yHwy - 1.28)).toBeLessThan(0.08);
    expect(Math.abs(yRab - 1.28)).toBeLessThan(0.08);
    expect(Math.abs(yHwy - yPort)).toBeLessThan(0.08);
  });

  it("puts street lots on both sides and seeds hamlets so long roads are not a void", () => {
    const board = createLandBoard();
    const south = board.plots.filter((p) => p.island === "south");
    expect(south.length).toBeGreaterThan(200);
    const cane = board.roads.find((r) => r.name === "Canebrake Rd")!;
    const midI = Math.floor(cane.points.length / 2);
    const sample = cane.points.slice(Math.max(1, midI - 2), midI + 3);
    let left = 0;
    let right = 0;
    for (let i = 0; i < sample.length - 1; i++) {
      const mid = sample[i]!;
      const a = sample[i + 1]!;
      const dx = a.x - mid.x;
      const dz = a.z - mid.z;
      const len = Math.hypot(dx, dz) || 1;
      const px = -dz / len;
      const pz = dx / len;
      left += south.filter((p) => Math.hypot(p.x - (mid.x + px * 18), p.z - (mid.z + pz * 18)) < 40).length;
      right += south.filter((p) => Math.hypot(p.x - (mid.x - px * 18), p.z - (mid.z - pz * 18)) < 40).length;
    }
    expect(left).toBeGreaterThan(0);
    expect(right).toBeGreaterThan(0);
    const fields = south.filter((p) => p.band === "field");
    expect(fields.length).toBeGreaterThan(20);
    expect(fields.some((p) => p.area > 2000)).toBe(true);
  });

  it("keeps a road hierarchy: dual highway, T-forks that meet the kerb, not stacked ribbons", () => {
    const board = createLandBoard();
    expect(board.roads.some((r) => r.name === "Haven Chord")).toBe(false);
    expect(board.roads.some((r) => r.name === "Quayward Loop")).toBe(true);
    expect(board.roads.some((r) => r.name?.startsWith("Ash Spoke"))).toBe(false);
    const mill = board.roads.find((r) => r.name === "Mill Fork")!;
    const cane = board.roads.find((r) => r.name === "Canebrake Rd")!;
    const town = SOUTH_TOWNS.find((t) => t.id === "canebrake")!;
    expect(mill).toBeTruthy();
    expect(Math.hypot(mill.points[0]!.x - town.x, mill.points[0]!.z - town.z)).toBeGreaterThan(20);
    expect(distToPolyline(cane.points, mill.points[0]!.x, mill.points[0]!.z)).toBeGreaterThan(5);
    const row = board.roads.find((r) => r.island === "south" && r.name?.includes("Cane Row"));
    expect(row).toBeTruthy();
    expect(distToPolyline(cane.points, row!.points[0]!.x, row!.points[0]!.z)).toBeGreaterThan(5);

    const harbour = SOUTH_RAB.harbour;
    const nearCircus = board.roads.filter(
      (r) =>
        r.island === "south" &&
        r.kind === "paved" &&
        !r.roundabout &&
        r.lanes !== 4 &&
        r.points.some((p) => Math.hypot(p.x - harbour.x, p.z - harbour.z) < 40),
    );
    const names = nearCircus.map((r) => r.name).sort();
    expect(names).toEqual(["Quayward Rd", "South Strand"]);
    const headings = nearCircus.map((r) => {
      const p = r.points.reduce(
        (best, q) => (Math.hypot(q.x - harbour.x, q.z - harbour.z) < best.d ? { d: Math.hypot(q.x - harbour.x, q.z - harbour.z), p: q } : best),
        { d: Infinity, p: r.points[0]! },
      ).p;
      return Math.atan2(p.z - harbour.z, p.x - harbour.x);
    });
    let gap = Math.abs(headings[0]! - headings[1]!);
    if (gap > Math.PI) gap = Math.PI * 2 - gap;
    expect(gap).toBeGreaterThan((35 * Math.PI) / 180);

    const channel = board.roads.find((r) => r.name === "Channel Sands")!;
    const palm = board.roads.find((r) => r.name === "Palm Arc")!;
    const hwy = board.roads.find((r) => r.name === "Island Hwy")!;
    const strand = board.roads.find((r) => r.name === "South Strand")!;
    expect(Math.hypot(channel.points[0]!.x - harbour.x, channel.points[0]!.z - harbour.z)).toBeGreaterThan(80);
    expect(Math.hypot(palm.points[0]!.x - harbour.x, palm.points[0]!.z - harbour.z)).toBeGreaterThan(80);
    expect(distToPolyline(hwy.points, channel.points[0]!.x, channel.points[0]!.z)).toBeLessThan(18);
    expect(distToPolyline(strand.points, palm.points[0]!.x, palm.points[0]!.z)).toBeLessThan(12);
  });
});
