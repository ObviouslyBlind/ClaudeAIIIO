import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createLandBoard, ISLANDS } from "./land.ts";
import { footTrafficSnapshot } from "./footTraffic.ts";
import { VIEWERS, createOverlays } from "../public/harbour/overlays.js";

describe("foot-traffic viewer (PAPER)", () => {
  it("exposes the four top-right viewers", () => {
    expect(Object.keys(VIEWERS)).toEqual(["world", "foot", "logistics", "minerals"]);
  });

  it("paints a named green/yellow/red ribbon on each paved road", () => {
    const scene = new THREE.Scene();
    const land = createLandBoard();
    const overlays = createOverlays({
      scene,
      heightAt: () => 1,
      specOf: (id) => ISLANDS[id],
      getMap: () => land,
    });
    overlays.setMode("foot", { traffic: footTrafficSnapshot(land) }, land);
    const ribbons = overlays.group.children.filter((c) => c.userData.kind === "foot-road");
    expect(ribbons.length).toBeGreaterThan(3);
    expect(ribbons.some((r) => r.userData.band === "green")).toBe(true);
    expect(ribbons.every((r) => r.userData.roadName && r.userData.label)).toBe(true);
  });
});
