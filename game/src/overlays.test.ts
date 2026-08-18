import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createLandBoard, ISLANDS } from "./land.ts";
import { footTrafficSnapshot } from "./footTraffic.ts";
import { VIEWERS, createOverlays, toggleViewer } from "../public/harbour/overlays.js";

describe("foot-traffic viewer (PAPER)", () => {
  it("exposes the four top-right viewers", () => {
    expect(Object.keys(VIEWERS)).toEqual(["world", "lots", "foot", "logistics", "minerals"]);
  });

  it("toggles Lots off back to World so outlines can hide", () => {
    expect(toggleViewer("world", "lots")).toBe("lots");
    expect(toggleViewer("lots", "lots")).toBe("world");
    expect(toggleViewer("lots", "foot")).toBe("foot");
    expect(toggleViewer("world", "world")).toBe("world");
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
    expect(ribbons[0].material.depthTest).toBe(false);
  });

  it("paints South lot outlines when the Lots viewer is on", () => {
    const scene = new THREE.Scene();
    const land = createLandBoard();
    const overlays = createOverlays({
      scene,
      heightAt: () => 1,
      specOf: (id) => ISLANDS[id],
      getMap: () => land,
    });
    overlays.setMode("lots", {}, land);
    const lines = overlays.group.children.filter((c) => c.userData.kind === "lot-outline");
    expect(lines.length).toBeGreaterThan(8);
    expect(lines.every((l) => l.userData.plotId && l.userData.zone)).toBe(true);
  });
});
