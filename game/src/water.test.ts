import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { makeWater, tickHarbourWater, WATER_COLOR } from "../public/harbour/water.js";

describe("harbour water", () => {
  it("keeps the lagoon tint and animates only the quay pockets", () => {
    expect(WATER_COLOR).toBe(0x1d7a86);
    const scene = new THREE.Scene();
    makeWater(scene);
    const live = scene.userData.harbourWater;
    expect(Array.isArray(live)).toBe(true);
    expect(live.length).toBe(5);
    const basin = live[1];
    const z0 = basin.geometry.attributes.position.getZ(0);
    tickHarbourWater(live, 1.7);
    const z1 = basin.geometry.attributes.position.getZ(0);
    expect(z1).not.toBe(z0);
    const ocean = scene.userData.oceanWater;
    expect(ocean.position.y).toBeLessThan(0);
    expect(ocean.geometry.parameters.widthSegments).toBeGreaterThan(8);
    const southSea = live[3];
    expect(southSea.position.z).toBeLessThan(7280 - 400);
    expect(Math.abs(southSea.position.x + 2280)).toBeLessThan(1);
  });
});
