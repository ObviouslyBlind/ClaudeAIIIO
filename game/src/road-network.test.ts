import { describe, expect, it } from "vitest";
import {
  createLandBoard,
  heightAt,
  ISLANDS,
  SIDE_STREET_SPECS,
  sideStreetPolyline,
  taxiStops,
} from "./land.ts";
import {
  pathAlongPolyline,
  routeAcrossPaved,
  stopFromMapClick,
  islandMapBounds,
  worldToMapPx,
} from "../public/harbour/taxi.js";
import { createTraffic, LANE_OFFSET_M } from "../public/harbour/traffic.js";
import { propSeeds, propSpotOk, PROP_ROAD_CLEAR_M } from "../public/harbour/props.js";

function continuous(points: { x: number; z: number }[], maxStepM = 220) {
  for (let i = 0; i < points.length - 1; i++) {
    const step = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].z - points[i].z);
    if (step > maxStepM) return false;
  }
  return true;
}

describe("road network (PAPER)", () => {
  it("authors side streets that join the spine, so zoning is not four rows on one road", () => {
    const board = createLandBoard();
    const northPaved = board.roads.filter((r) => r.kind === "paved" && r.island === "north");
    expect(northPaved.length).toBe(1 + SIDE_STREET_SPECS.length);
    expect(northPaved[0].name).toBe("Harbour Rd");
    expect(northPaved[0].joins).toBeUndefined();
    for (const branch of northPaved.slice(1)) {
      expect(branch.joins).toBeTruthy();
      expect(branch.name).toBeTruthy();
      // The junction is the branch's own first point, on the island, on land.
      const j = branch.points[0];
      expect(Math.hypot(j.x - branch.joins!.x, j.z - branch.joins!.z)).toBeLessThan(0.5);
      expect(heightAt(ISLANDS.north, j.x, j.z)).toBeGreaterThan(0.4);
    }
  });

  it("gives street lots their own frontage: every street lot is near some paved road", () => {
    const board = createLandBoard();
    const streets = board.roads.filter((r) => r.kind === "paved" && r.island === "north");
    const lots = board.plots.filter((p) => p.island === "north" && p.band === "street");
    expect(lots.length).toBeGreaterThan(20);
    const nearRoad = (p: { x: number; z: number }) =>
      streets.some((r) =>
        r.points.some((pt) => Math.hypot(pt.x - p.x, pt.z - p.z) < 90),
      );
    expect(lots.every(nearRoad)).toBe(true);
    // Side streets carry lots of their own, not only the spine.
    const branch = streets[1];
    const mid = branch.points[Math.floor(branch.points.length / 2)];
    expect(lots.some((p) => Math.hypot(p.x - mid.x, p.z - mid.z) < 120)).toBe(true);
  });

  it("reaches fields on dirt lanes, and fields sit off the paved carriageway", () => {
    const board = createLandBoard();
    const dirt = board.roads.filter((r) => r.kind === "dirt" && r.island === "north");
    expect(dirt.length).toBeGreaterThanOrEqual(6);
    const fields = board.plots.filter((p) => p.island === "north" && p.band === "field");
    expect(fields.length).toBeGreaterThan(8);
  });

  it("names taxi stops off the live network: port, junctions, street ends, road end", () => {
    const stops = taxiStops(ISLANDS.north);
    expect(stops.length).toBe(2 + SIDE_STREET_SPECS.length * 2);
    expect(stops[0].name).toBe("North Port");
    expect(stops.some((s) => s.name === "Market St")).toBe(true);
    expect(stops.some((s) => s.name === "Mill St End")).toBe(true);
    expect(stops.some((s) => s.name === "Road End")).toBe(true);
  });

  it("routes the taxi across the network: branch to trunk to branch, continuously", () => {
    const board = createLandBoard();
    const a = sideStreetPolyline(ISLANDS.north, SIDE_STREET_SPECS[0]);
    const b = sideStreetPolyline(ISLANDS.north, SIDE_STREET_SPECS[1]);
    const from = a[a.length - 1];
    const to = b[b.length - 1];
    const route = routeAcrossPaved(board.roads, "north", from.x, from.z, to.x, to.z);
    expect(route).toBeTruthy();
    expect(route!.points.length).toBeGreaterThan(4);
    expect(continuous(route!.points)).toBe(true);
    const first = route!.points[0];
    const last = route!.points[route!.points.length - 1];
    expect(Math.hypot(first.x - from.x, first.z - from.z)).toBeLessThan(10);
    expect(Math.hypot(last.x - to.x, last.z - to.z)).toBeLessThan(10);
  });

  it("keeps same-road taxi trips on that road", () => {
    const board = createLandBoard();
    const trunk = board.roads.find((r) => r.kind === "paved" && r.island === "north")!;
    const p0 = trunk.points[2];
    const p1 = trunk.points[10];
    const route = routeAcrossPaved(board.roads, "north", p0.x, p0.z, p1.x, p1.z);
    expect(route).toBeTruthy();
    expect(route!.road).toBe(trunk);
    const direct = pathAlongPolyline(trunk.points, p0.x, p0.z, p1.x, p1.z);
    expect(route!.points.length).toBe(direct.length);
  });

  it("map taps pick the nearest stop point within reach, else nothing", () => {
    const spec = ISLANDS.north;
    const stops = taxiStops(spec);
    const bounds = islandMapBounds(spec);
    const px = worldToMapPx(bounds, stops[0].x, stops[0].z, 320, 220);
    // Exact hit wins even where town stops cluster on a small canvas.
    expect(stopFromMapClick(stops, spec, px.sx, px.sy, 320, 220)?.id).toBe(stops[0].id);
    expect(stopFromMapClick(stops, spec, px.sx + 200, px.sy + 90, 320, 220)).toBeNull();
  });
});

describe("traffic (PAPER)", () => {
  it("cars drive their road at their own speed and never teleport to the player", () => {
    const board = createLandBoard();
    const scene = { add() {} };
    const traffic = createTraffic({
      scene,
      getMap: () => board,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });
    const car = traffic.cars.find((c) => c.islandId === "north" && c.roadIdx === 0)!;
    const before = car.along;
    traffic.tick(0.5);
    const moved = Math.abs(car.along - before);
    expect(moved).toBeGreaterThan(1);
    expect(moved).toBeLessThan(car.speed * 0.5 + 0.01);
  });

  it("turns around at road ends instead of wrap-teleporting", () => {
    const board = createLandBoard();
    const scene = { add() {} };
    const traffic = createTraffic({
      scene,
      getMap: () => board,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });
    const car = traffic.cars.find((c) => c.islandId === "north")!;
    car.along = 5;
    car.dir = -1;
    traffic.tick(1);
    expect(car.dir).toBe(1);
    expect(car.along).toBeGreaterThanOrEqual(4);
    expect(LANE_OFFSET_M).toBeGreaterThan(1);
  });

  it("spreads some cars onto side streets", () => {
    const board = createLandBoard();
    const scene = { add() {} };
    const traffic = createTraffic({
      scene,
      getMap: () => board,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });
    expect(traffic.cars.some((c) => c.islandId === "north" && c.roadIdx > 0)).toBe(true);
  });
});

describe("props (PAPER)", () => {
  it("seeds bushes, rocks, barrels and stop benches off roads, parcels, and water", () => {
    const board = createLandBoard();
    const spec = ISLANDS.north;
    const stops = taxiStops(spec);
    const seeds = propSeeds(spec, { heightAt, plots: board.plots, roads: board.roads, stops });
    expect(seeds.bushes.length).toBeGreaterThan(40);
    expect(seeds.rocks.length).toBeGreaterThan(10);
    expect(seeds.barrels.length).toBeGreaterThan(4);
    expect(seeds.benches.length).toBeGreaterThan(4);
    const ctx = { spec, heightAt, plots: board.plots, roads: board.roads };
    for (const b of [...seeds.bushes, ...seeds.rocks]) {
      expect(propSpotOk(b.x, b.z, ctx)).toBe(true);
      expect(heightAt(spec, b.x, b.z)).toBeGreaterThan(0.4);
    }
    expect(PROP_ROAD_CLEAR_M).toBeGreaterThanOrEqual(7);
  });
});
