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
  });
});
