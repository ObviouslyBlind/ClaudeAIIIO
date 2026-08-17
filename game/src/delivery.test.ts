import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createDeliveries } from "../public/harbour/delivery.js";

describe("delivery van (PAPER)", () => {
  it("waits at the kerb until the crate is taken", () => {
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
    expect(scene.children.length).toBe(1);
    vans.release("del-1");
    for (let i = 0; i < 80; i++) vans.tick(1);
    expect(scene.children.length).toBe(0);
  });
});
