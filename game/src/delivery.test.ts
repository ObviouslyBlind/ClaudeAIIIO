import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createDeliveries, makeVan } from "../public/harbour/delivery.js";

describe("delivery van (PAPER)", () => {
  it("drops the crate then drives away", () => {
    const scene = new THREE.Scene();
    let dropped = 0;
    const vans = createDeliveries({
      scene,
      getMap: () => ({ roads: [] }),
      specOf: () => ({ port: { x: 0, z: 0 } }),
      heightAt: () => 0,
      onDrop: () => {
        dropped += 1;
      },
    });
    vans.start(
      {
        id: "del-1",
        island: "south",
        drop: { curbX: 2, curbZ: 0, x: 3, z: 0, awayX: 40, awayZ: 0 },
      },
      { x: 2, z: 0 },
    );
    for (let i = 0; i < 80; i++) vans.tick(1);
    expect(dropped).toBe(1);
    expect(scene.children.length).toBe(0);
  });

  it("builds a box van with a cab, lamps, and wheels", () => {
    const van = makeVan();
    const parts = new Set<string>();
    van.traverse((obj) => {
      if (obj.userData?.part) parts.add(String(obj.userData.part));
    });
    expect(parts.has("body")).toBe(true);
    expect(parts.has("cabin")).toBe(true);
    expect(parts.has("wheel")).toBe(true);
    expect(parts.has("lamp")).toBe(true);
    const box = new THREE.Box3().setFromObject(van);
    expect(box.max.y - box.min.y).toBeGreaterThan(2.4);
    expect(box.max.z - box.min.z).toBeGreaterThan(6);
  });
});
