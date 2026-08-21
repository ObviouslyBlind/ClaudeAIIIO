import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { handleOrbitPointer, RMB, sphericalToCartesian } from "../public/harbour/camera.js";
import { mountUnitBlocks, ROOM_H } from "../public/harbour/unit-blocks.js";
import {
  createDollhouseOrbit,
  DOLLHOUSE_PITCH,
  DOLLHOUSE_RADIUS_M,
  dollhouseZoomRadius,
  DOLLHOUSE_ZOOM_MAX_M,
  DOLLHOUSE_ZOOM_MIN_M,
  floorTarget,
  tickDollhouse,
} from "../public/harbour/unit-dollhouse.js";
import { createVisitor } from "./sim.ts";
import { createLandBoard } from "./land.ts";
import { UNIT_SLICE_FAUCET } from "./economy.ts";
import { playSnapshot } from "./firstLoop.ts";
import { fitUnitKit, buyRoom as purchaseRoom } from "./units.ts";

function snapPlay() {
  const visitor = createVisitor(UNIT_SLICE_FAUCET);
  const land = createLandBoard();
  return playSnapshot(visitor, land);
}

function fakeCam() {
  return {
    position: {
      x: 0,
      y: 0,
      z: 0,
      set(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
      },
      copy(v) {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
      },
      lerp(v, t) {
        this.x += (v.x - this.x) * t;
        this.y += (v.y - this.y) * t;
        this.z += (v.z - this.z) * t;
      },
    },
    lookAt(x, y, z) {
      this.lx = x;
      this.ly = y;
      this.lz = z;
    },
    near: 12,
    updateProjectionMatrix() {
      this.updated = true;
    },
  };
}

describe("unit dollhouse camera", () => {
  it("orbits the floor box, not the player, and RMB drags 360 around it", () => {
    const building = { id: "mixed-house", x: 40, z: 80, yaw: 0.2 };
    const target = floorTarget(building, 0, () => 1.28);
    expect(target.x).toBe(40);
    expect(target.z).toBe(80);
    expect(target.y).toBeGreaterThan(1.28);
    expect(target.y).toBeLessThan(1.28 + ROOM_H);
    expect(target.y).not.toBe(0);

    const start = createDollhouseOrbit(building);
    expect(start.pitch).toBe(DOLLHOUSE_PITCH);
    expect(start.radius).toBe(DOLLHOUSE_RADIUS_M);
    expect(start.orbited).toBe(true);

    const held = handleOrbitPointer(start, { type: "down", button: RMB, clientX: 0, clientY: 0 });
    const dragged = handleOrbitPointer(held, { type: "move", dx: 80, dy: 0, clientX: 80, clientY: 0 });
    expect(dragged.yaw).not.toBe(start.yaw);
    expect(dragged.orbited).toBe(true);

    const cam = fakeCam();
    const tmp = new THREE.Vector3();
    const a = { ...start, dragging: true };
    tickDollhouse(cam, target, a, 1, tmp);
    const p0 = { x: cam.position.x, z: cam.position.z };
    expect(cam.lx).toBe(target.x);
    expect(cam.lz).toBe(target.z);
    expect(cam.ly).toBe(target.y);
    const o = sphericalToCartesian(a);
    expect(cam.position.x).toBeCloseTo(target.x + o.x, 5);
    expect(cam.position.z).toBeCloseTo(target.z + o.z, 5);

    const flipped = { ...a, yaw: a.yaw + Math.PI };
    tickDollhouse(cam, target, flipped, 1, tmp);
    expect(cam.position.x - target.x).toBeCloseTo(-(p0.x - target.x), 5);
    expect(cam.position.z - target.z).toBeCloseTo(-(p0.z - target.z), 5);
    expect(cam.lx).toBe(target.x);
    expect(cam.lz).toBe(target.z);
  });

  it("clamps dollhouse zoom around the floor, not harbour 650 m", () => {
    expect(dollhouseZoomRadius(DOLLHOUSE_RADIUS_M, -800)).toBe(DOLLHOUSE_ZOOM_MIN_M);
    expect(dollhouseZoomRadius(DOLLHOUSE_RADIUS_M, 8000)).toBe(DOLLHOUSE_ZOOM_MAX_M);
    expect(DOLLHOUSE_ZOOM_MAX_M).toBeLessThan(80);
  });

  it("looks at a higher floor when the floor picker moves", () => {
    const building = { id: "mixed-house", x: 10, z: 20 };
    const g = floorTarget(building, 0, () => 2);
    const up = floorTarget(building, 2, () => 2);
    expect(up.y).toBeGreaterThan(g.y + ROOM_H);
    expect(up.x).toBe(g.x);
    expect(up.z).toBe(g.z);
  });

  it("cutaway opens the viewed floor and hides floors above", () => {
    const play = snapPlay();
    const scene = new THREE.Scene();
    const blocks = mountUnitBlocks({ scene, heightAt: () => 1.28 });
    blocks.sync(play);
    const shop = scene.getObjectByName("unit-mixed-house-0-0");
    const flat = scene.getObjectByName("unit-mixed-house-1-0");
    const office = scene.getObjectByName("unit-mixed-house-2-0");
    const openShop = scene.getObjectByName("unit-cutaway-mixed-house-0-0");
    const quay = scene.getObjectByName("unit-quay-shops-0-0");
    expect(shop.visible).toBe(true);
    expect(openShop.visible).toBe(false);
    expect(office.visible).toBe(true);

    blocks.applyCutaway({ buildingId: "mixed-house", floor: 0 });
    expect(shop.visible).toBe(false);
    expect(openShop.visible).toBe(true);
    expect(flat.visible).toBe(false);
    expect(office.visible).toBe(false);
    expect(scene.getObjectByName("unit-cutaway-mixed-house-1-0").visible).toBe(false);
    expect(quay.visible).toBe(true);
    expect(scene.getObjectByName("unit-cutaway-quay-shops-0-0").visible).toBe(false);

    blocks.applyCutaway({ buildingId: "mixed-house", floor: 1 });
    expect(shop.visible).toBe(true);
    expect(openShop.visible).toBe(false);
    expect(flat.visible).toBe(false);
    expect(scene.getObjectByName("unit-cutaway-mixed-house-1-0").visible).toBe(true);
    expect(office.visible).toBe(false);

    blocks.applyCutaway(null);
    expect(shop.visible).toBe(true);
    expect(openShop.visible).toBe(false);
    expect(office.visible).toBe(true);
  });

  it("keeps kit visible on the open floor after a rebuild", () => {
    const visitor = createVisitor(UNIT_SLICE_FAUCET);
    const land = createLandBoard();
    expect(purchaseRoom(visitor, "strand-flats-0-0").ok).toBe(true);
    expect(fitUnitKit(visitor, "strand-flats-0-0", "bed").ok).toBe(true);
    const play = playSnapshot(visitor, land);
    const scene = new THREE.Scene();
    const blocks = mountUnitBlocks({ scene, heightAt: () => 1.28 });
    blocks.sync(play);
    blocks.applyCutaway({ buildingId: "strand-flats", floor: 0 });
    blocks.sync(play);
    const bed = scene.getObjectByName("unit-kit-strand-flats-0-0-bed");
    expect(bed.visible).toBe(true);
    expect(scene.getObjectByName("unit-strand-flats-1-0").visible).toBe(false);
    expect(scene.getObjectByName("unit-cutaway-strand-flats-0-0").visible).toBe(true);
  });
});
