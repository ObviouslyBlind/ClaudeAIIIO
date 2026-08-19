import { describe, expect, it } from "vitest";
import { createLandBoard, heightAt, ISLANDS } from "./land.ts";
import { SOUTH_PORT, SOUTH_RAB, SOUTH_TOWNS, SOUTH_VOLCANO, volcanoDist, distToPolyline } from "./southGeom.ts";
import { canWalk } from "./walk.ts";
import { carriagewayWidthM } from "./roadGraph.ts";

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
    const hwy = board.roads.filter((r) => r.island === "south" && r.lanes === 4);
    expect(hwy.length).toBeGreaterThanOrEqual(4);
    expect(hwy.every((r) => r.name === "Island Hwy")).toBe(true);
    const xs = hwy.flatMap((r) => r.points.map((p) => p.x));
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(4000);
    expect(hwy.every((r) => r.points.every((p) => volcanoDist(p.x, p.z) > 400))).toBe(true);
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
    const quay = SOUTH_TOWNS[0]!;
    const yTown = heightAt(s, quay.x, quay.z);
    const yLot = heightAt(s, quay.x + 120, quay.z - 80);
    expect(Math.abs(yTown - 1.28)).toBeLessThan(0.08);
    expect(Math.abs(yLot - 1.28)).toBeLessThan(0.08);
    expect(heightAt(s, SOUTH_VOLCANO.x + 200, SOUTH_VOLCANO.z)).toBeGreaterThan(20);
  });

  it("seeds one vacant street lot next to the south pad so spawn can lease", () => {
    const board = createLandBoard();
    const near = board.plots.filter(
      (p) =>
        p.island === "south" &&
        p.band === "street" &&
        p.class === "by_right" &&
        !p.owner &&
        Math.hypot(p.x - SOUTH_PORT.x, p.z - SOUTH_PORT.z) < 80,
    );
    expect(near.length).toBeGreaterThan(0);
    expect(near[0]!.zone).toBe("commercial");
    expect(near[0]!.price).toBeGreaterThanOrEqual(2400);
    expect(near[0]!.street).toBe("Island Hwy");
  });

  it("seeds tiny $750 cart pads on both sides of Island Hwy", () => {
    const board = createLandBoard();
    const pads = board.plots.filter((p) => p.class === "cart_pad");
    expect(pads.length).toBeGreaterThan(8);
    expect(pads.every((p) => p.price === 750)).toBe(true);
    expect(pads.every((p) => p.street === "Island Hwy")).toBe(true);
    expect(pads.every((p) => p.zone === "commercial")).toBe(true);
    expect(pads.every((p) => p.area < 90)).toBe(true);
    expect(pads.every((p) => p.island === "south")).toBe(true);
    const near = pads.filter((p) => Math.hypot(p.x - SOUTH_PORT.x, p.z - SOUTH_PORT.z) < 220);
    expect(near.length).toBeGreaterThan(0);
    const hwys = board.roads.filter((r) => r.name === "Island Hwy" && !r.roundabout);
    function sideOf(p: { x: number; z: number }): number {
      let best = Infinity;
      let s = 0;
      for (const r of hwys) {
        for (let i = 0; i < r.points.length - 1; i++) {
          const a = r.points[i]!;
          const b = r.points[i + 1]!;
          const mx = (a.x + b.x) / 2;
          const mz = (a.z + b.z) / 2;
          const d = Math.hypot(p.x - mx, p.z - mz);
          if (d < best) {
            best = d;
            s = (p.x - a.x) * -(b.z - a.z) + (p.z - a.z) * (b.x - a.x);
          }
        }
      }
      return s;
    }
    expect(pads.some((p) => sideOf(p) > 0)).toBe(true);
    expect(pads.some((p) => sideOf(p) < 0)).toBe(true);
    const half = carriagewayWidthM("highway") / 2;
    for (const p of pads) {
      const d = Math.min(...hwys.map((h) => distToPolyline(h.points, p.x, p.z)));
      expect(d).toBeGreaterThan(half + 0.2);
      expect(d).toBeLessThan(half + 6);
    }
    let packed = false;
    for (let i = 0; i < pads.length && !packed; i++) {
      for (let j = i + 1; j < pads.length; j++) {
        if (Math.hypot(pads[i]!.x - pads[j]!.x, pads[i]!.z - pads[j]!.z) < 10) {
          packed = true;
          break;
        }
      }
    }
    expect(packed).toBe(true);
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
    const town = SOUTH_TOWNS.find((t) => t.id === "canebrake")!;
    expect(mill).toBeTruthy();
    // A town green is not a crossroads: side roads meet the approach, not the square.
    expect(Math.hypot(mill.points[0]!.x - town.x, mill.points[0]!.z - town.z)).toBeGreaterThan(20);

    // A side road must *touch* its parent at a shared node. The old model kept
    // stubs standing off the parent, which is exactly what read as loose blots.
    const row = board.graph.edges.find((e) => e.name?.includes("Cane Row"))!;
    expect(row).toBeTruthy();
    const joint = board.graph.nodes.find((n) => n.id === row.a)!;
    expect(joint.kind).toBe("junction");
    const parents = board.graph.edges.filter((e) => e.id !== row.id && (e.a === joint.id || e.b === joint.id));
    expect(parents.some((e) => e.name === "Canebrake Rd")).toBe(true);
    expect(Math.hypot(row.points[0]!.x - joint.x, row.points[0]!.z - joint.z)).toBeLessThan(0.01);
    for (const parent of parents) {
      const ends = [parent.points[0]!, parent.points[parent.points.length - 1]!];
      expect(Math.min(...ends.map((p) => Math.hypot(p.x - joint.x, p.z - joint.z)))).toBeLessThan(0.01);
    }

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
    expect(names).toEqual(["Quayward Rd"]);

    const hwys = board.roads.filter((r) => r.name === "Island Hwy");
    const channel = board.roads.find((r) => r.name === "Channel Sands")!;
    const palm = board.roads.find((r) => r.name === "Palm Arc")!;
    const strand = board.roads.find((r) => r.name === "South Strand")!;
    expect(Math.hypot(channel.points[0]!.x - harbour.x, channel.points[0]!.z - harbour.z)).toBeGreaterThan(80);
    expect(Math.hypot(palm.points[0]!.x - harbour.x, palm.points[0]!.z - harbour.z)).toBeGreaterThan(80);
    expect(Math.hypot(strand.points[0]!.x - harbour.x, strand.points[0]!.z - harbour.z)).toBeGreaterThan(40);
    expect(Math.min(...hwys.map((h) => distToPolyline(h.points, channel.points[0]!.x, channel.points[0]!.z)))).toBeLessThan(22);
    const loop = board.roads.filter((r) => r.name === "Quayward Loop");
    expect(Math.min(...loop.map((r) => distToPolyline(r.points, strand.points[0]!.x, strand.points[0]!.z)))).toBeLessThan(1);
    expect(distToPolyline(strand.points, palm.points[0]!.x, palm.points[0]!.z)).toBeLessThan(12);
    expect(board.roads.filter((r) => r.island === "south" && r.kind === "dirt" && /Path$/.test(r.name || "")).length).toBe(0);
  });

  it("keeps dirt as field stubs: tracks do not cut across paved tarmac", () => {
    const board = createLandBoard();
    const paved = board.roads.filter((r) => r.island === "south" && r.kind === "paved");
    const dirt = board.roads.filter((r) => r.island === "south" && r.kind === "dirt");
    expect(dirt.length).toBeGreaterThan(0);
    for (const d of dirt) {
      let acc = 0;
      for (let i = 0; i < d.points.length - 1; i++) {
        const a = d.points[i]!;
        const b = d.points[i + 1]!;
        const seg = Math.hypot(b.x - a.x, b.z - a.z);
        const along = acc + seg * 0.5;
        acc += seg;
        if (along < 18) continue;
        const mx = (a.x + b.x) / 2;
        const mz = (a.z + b.z) / 2;
        const nearPaved = Math.min(...paved.map((p) => distToPolyline(p.points, mx, mz)));
        expect(nearPaved).toBeGreaterThan(4);
      }
    }
  });
});
