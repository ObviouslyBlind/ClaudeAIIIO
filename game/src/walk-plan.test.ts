import { describe, expect, it } from "vitest";
import { heightAt, ISLANDS } from "./land.ts";
import { BEACH_THRESHOLD_M, canWalk } from "./walk.ts";
import { SOUTH_PORT } from "./southGeom.ts";
import {
  advanceAlong,
  clampWalkRange,
  faceYaw,
  gaitPhase,
  planWalk,
  PLAYER_SOLE_M,
  samplesAlong,
  snapToLand,
  STRIDE_M,
  WALK_BEACH_M,
  WALK_RANGE_M,
  WALK_SPEED_MPS,
  walkableAlong,
} from "../public/harbour/walk-plan.js";
import { readFileSync } from "node:fs";

const can = (x: number, z: number) => canWalk(x, z, ISLANDS, heightAt);

describe("tap-to-walk planner (PAPER)", () => {
  it("keeps beach threshold in sync with walk.ts", () => {
    expect(WALK_BEACH_M).toBe(BEACH_THRESHOLD_M);
    expect(PLAYER_SOLE_M).toBeCloseTo(1.15);
  });

  it("walks at a person speed, not 22 m/s", () => {
    expect(WALK_SPEED_MPS).toBeGreaterThan(2.4);
    expect(WALK_SPEED_MPS).toBeLessThan(6);
    const main = readFileSync(new URL("../public/harbour/main.js", import.meta.url), "utf8");
    expect(main).not.toContain("22 * dt");
    expect(main).toContain("WALK_SPEED_MPS");
    expect(main).toContain("planWalk");
    expect(main).toContain("advanceAlong");
    expect(main).toContain("followWalk");
    expect(main).toContain("followRide");
    expect(main).toContain("paintWalkHud");
    expect(main).toContain("groundFromRay");
    expect(main).toContain("pointerdown");
    expect(main).toContain("Exit taxi is on the dock");
    expect(main).toContain("walk-status");
    const pathSrc = readFileSync(new URL("../public/harbour/walk-path.js", import.meta.url), "utf8");
    expect(pathSrc).toContain("WALK_MARK");
    expect(pathSrc).toContain("0xd8ff2a");
    expect(pathSrc).not.toMatch(/const GREEN = 0x3dcc6a/);
  });

  it("dest disc sits above tarmac and hides when the walker stops", () => {
    const main = readFileSync(new URL("../public/harbour/main.js", import.meta.url), "utf8");
    expect(main).toContain("arriveWalk");
    expect(main).not.toContain("WALK_HOLD_MS");
    expect(main).not.toContain("Date.now() + 2200");
    expect(main).not.toContain("Date.now() + 5000");
    const pathSrc = readFileSync(new URL("../public/harbour/walk-path.js", import.meta.url), "utf8");
    const lift = Number((pathSrc.match(/export const DEST_LIFT_M = ([0-9.]+)/) || [])[1]);
    expect(lift).toBeGreaterThan(0.4);
    expect(pathSrc).not.toContain("walk-pin");
    expect(pathSrc).not.toContain("CylinderGeometry");
  });

  it("lets you walk inland from the south port on land", () => {
    const from = SOUTH_PORT;
    const to = { x: from.x + 18, z: from.z + 36 };
    expect(can(from.x, from.z)).toBe(true);
    expect(can(to.x, to.z)).toBe(true);
    const path = planWalk(from.x, from.z, to.x, to.z, can);
    expect(path).toBeTruthy();
    expect(path!.length).toBeGreaterThanOrEqual(2);
    const last = path![path!.length - 1]!;
    expect(hypot(last.x - to.x, last.z - to.z)).toBeLessThan(2);
    expect(walkableAlong(from.x, from.z, last.x, last.z, can)).toBe(true);
  });

  it("never routes through the channel", () => {
    const path = planWalk(SOUTH_PORT.x, SOUTH_PORT.z, 0, 0, can);
    if (path) {
      for (const p of path) expect(can(p.x, p.z)).toBe(true);
      const last = path[path.length - 1]!;
      expect(Math.hypot(last.x, last.z)).toBeGreaterThan(1000);
    }
    expect(can(0, 0)).toBe(false);
  });

  it("caps one tap at WALK_RANGE_M", () => {
    const c = clampWalkRange(0, 0, 400, 0);
    expect(c.x).toBeCloseTo(WALK_RANGE_M);
    expect(c.z).toBeCloseTo(0);
  });

  it("snaps a near-shore wet tap onto land", () => {
    let wet = { x: SOUTH_PORT.x, z: SOUTH_PORT.z - 8 };
    for (let dz = 4; dz < 400; dz += 4) {
      const z = SOUTH_PORT.z - dz;
      if (!can(SOUTH_PORT.x, z)) {
        wet = { x: SOUTH_PORT.x, z };
        break;
      }
    }
    expect(can(wet.x, wet.z)).toBe(false);
    const snapped = snapToLand(wet.x, wet.z, can);
    if (snapped) expect(can(snapped.x, snapped.z)).toBe(true);
  });

  it("advances about walking speed in one second", () => {
    const path = [
      { x: 10, z: 0 },
      { x: 40, z: 0 },
    ];
    const next = advanceAlong(10, 0, path.slice(1), 1, WALK_SPEED_MPS);
    expect(next.done).toBe(false);
    expect(next.moved).toBeCloseTo(WALK_SPEED_MPS, 5);
    expect(next.x).toBeCloseTo(10 + WALK_SPEED_MPS, 5);
    expect(next.z).toBeCloseTo(0, 5);
  });

  it("arrives and reports done", () => {
    const next = advanceAlong(0, 0, [{ x: 2, z: 0 }], 1, WALK_SPEED_MPS);
    expect(next.done).toBe(true);
    expect(next.x).toBe(2);
    expect(next.path).toEqual([]);
  });

  it("samples include both ends", () => {
    const pts = samplesAlong(0, 0, 12, 0, 4);
    expect(pts[0]).toEqual({ x: 0, z: 0 });
    expect(pts[pts.length - 1]).toEqual({ x: 12, z: 0 });
    expect(pts.length).toBe(4);
  });

  it("gait phase is distance / stride, not wall-clock", () => {
    expect(gaitPhase(STRIDE_M)).toBeCloseTo(Math.PI, 5);
    expect(gaitPhase(0)).toBe(0);
  });

  it("faces the walk direction (+Z is yaw 0)", () => {
    expect(faceYaw(0, 1)).toBeCloseTo(0, 5);
    expect(faceYaw(1, 0)).toBeCloseTo(Math.PI / 2, 5);
  });
});

function hypot(dx: number, dz: number) {
  return Math.hypot(dx, dz);
}
