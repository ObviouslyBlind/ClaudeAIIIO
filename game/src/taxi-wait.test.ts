import { describe, expect, it } from "vitest";
import { createLandBoard, ISLANDS } from "./land.ts";
import {
  TAXI_WAIT_MS,
  pavedDestFromMapClick,
  projectOnPolyline,
  taxiWaitExpired,
  worldToMapPx,
  islandMapBounds,
} from "../public/harbour/taxi.js";

describe("taxi wait timeout", () => {
  it("leaves after 60s while coming or waiting, not while boarded", () => {
    expect(TAXI_WAIT_MS).toBe(60_000);
    expect(taxiWaitExpired("coming", 1_000, 60_999)).toBe(false);
    expect(taxiWaitExpired("coming", 1_000, 61_000)).toBe(true);
    expect(taxiWaitExpired("waiting", 0, 59_999)).toBe(false);
    expect(taxiWaitExpired("waiting", 0, 60_000)).toBe(true);
    expect(taxiWaitExpired("boarded", 0, 120_000)).toBe(false);
    expect(taxiWaitExpired("hauling", 0, 120_000)).toBe(false);
    expect(taxiWaitExpired("idle", 0, 60_000)).toBe(false);
    expect(taxiWaitExpired("coming", null, 60_000)).toBe(false);
  });
});

describe("taxi map dest", () => {
  it("projects a rough map tap onto paved and never onto dirt", () => {
    const board = createLandBoard();
    const spec = ISLANDS.north;
    const paved = board.roads.find((r) => r.kind === "paved" && r.island === "north")!;
    const dirt = board.roads.find((r) => r.kind === "dirt" && r.island === "north")!;
    const bounds = islandMapBounds(spec);
    const w = 400;
    const h = 220;
    const tap = worldToMapPx(bounds, dirt.points[0].x, dirt.points[0].z, w, h);
    const dest = pavedDestFromMapClick(board.roads, "north", spec, tap.sx, tap.sy, w, h);
    expect(dest).toBeTruthy();
    expect(projectOnPolyline(paved.points, dest!.proj.x, dest!.proj.z).dist).toBeLessThan(0.5);
    expect(projectOnPolyline(dirt.points, dest!.proj.x, dest!.proj.z).dist).toBeGreaterThan(5);
  });
});
