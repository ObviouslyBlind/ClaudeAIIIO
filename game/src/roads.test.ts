import { describe, expect, it } from "vitest";
import { createLandBoard, heightAt, ISLANDS } from "./land.ts";
import {
  ASPHALT,
  DIRT_WIDTH_M,
  PAVED_WIDTH_M,
  makeRoads,
  spawnCameraOffset,
} from "../public/harbour/roads.js";

function lum(hex: number) {
  const r = ((hex >> 16) & 255) / 255;
  const g = ((hex >> 8) & 255) / 255;
  const b = (hex & 255) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

describe("paved street from spawn", () => {
  it("draws dark asphalt 6–8 m wide with a dashed centre line; dirt stays thin and brown", () => {
    const map = createLandBoard();
    const added: { userData: { roadKind?: string }; geometry: { parameters: { width: number } }; material: { color: { getHex: () => number } } }[] =
      [];
    const scene = { add(obj: (typeof added)[number]) { added.push(obj); } };
    makeRoads(map, { scene, specOf: (id: "north" | "south") => ISLANDS[id], heightAt });

    const paved = added.filter((m) => m.userData.roadKind === "paved");
    const dirt = added.filter((m) => m.userData.roadKind === "dirt");
    const lines = added.filter((m) => m.userData.roadKind === "centre-line");
    const verge = added.filter((m) => m.userData.roadKind === "verge");
    const curb = added.filter((m) => m.userData.roadKind === "curb");

    expect(paved.length).toBeGreaterThan(8);
    expect(lines.length).toBeGreaterThan(8);
    expect(verge.length).toBe(paved.length);
    expect(curb.length).toBe(paved.length * 2);
    expect(dirt.length).toBeGreaterThan(4);

    expect(PAVED_WIDTH_M).toBeGreaterThanOrEqual(6);
    expect(PAVED_WIDTH_M).toBeLessThanOrEqual(8);
    expect(paved[0].geometry.parameters.width).toBe(PAVED_WIDTH_M);
    expect(dirt[0].geometry.parameters.width).toBe(DIRT_WIDTH_M);
    expect(DIRT_WIDTH_M).toBeLessThan(4);

    expect(paved[0].material.color.getHex()).toBe(ASPHALT);
    expect(lum(ASPHALT)).toBeLessThan(0.22);
    expect(lum(dirt[0].material.color.getHex())).toBeGreaterThan(lum(ASPHALT));

    const dirtKinds = new Set(map.roads.filter((r) => r.kind === "dirt").map((r) => r.kind));
    expect(dirtKinds.has("dirt")).toBe(true);
    expect(added.some((m) => m.userData.roadKind === "dirt" && m.geometry.parameters.width >= 6)).toBe(
      false,
    );
  });

  it("places the spawn camera beside the player, toward the channel, not inland looking at water", () => {
    const n = spawnCameraOffset("north");
    const s = spawnCameraOffset("south");
    expect(Math.abs(n.x)).toBeGreaterThan(Math.abs(n.z));
    expect(Math.abs(s.x)).toBeGreaterThan(Math.abs(s.z));
    expect(n.z).toBeGreaterThan(0);
    expect(s.z).toBeLessThan(0);
    expect(n.y).toBeGreaterThan(18);
    expect(n.y).toBeLessThan(42);
    expect(n.x).toBeGreaterThan(40);
  });
});
