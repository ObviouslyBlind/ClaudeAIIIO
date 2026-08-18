import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createLandBoard, ISLANDS } from "./land.ts";
import { BAND_LEVEL, footTrafficSnapshot } from "./footTraffic.ts";
import { VIEWERS, createOverlays, footLevel, toggleViewer } from "../public/harbour/overlays.js";

describe("foot-traffic viewer (PAPER)", () => {
  it("exposes the four top-right viewers", () => {
    expect(Object.keys(VIEWERS)).toEqual(["world", "lots", "foot", "logistics", "minerals"]);
  });

  it("names red Low, yellow Moderate, green High — not danger", () => {
    expect(BAND_LEVEL.red).toBe("Low");
    expect(BAND_LEVEL.yellow).toBe("Moderate");
    expect(BAND_LEVEL.green).toBe("High");
    expect(footLevel("red")).toBe("Low");
    expect(footLevel("yellow")).toBe("Moderate");
    expect(footLevel("green")).toBe("High");
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
    expect(ribbons.some((r) => r.userData.level === "High")).toBe(true);
    expect(ribbons.every((r) => r.userData.roadName && r.userData.label)).toBe(true);
    expect(ribbons.every((r) => /High|Moderate|Low/.test(r.userData.label))).toBe(true);
    expect(ribbons.every((r) => !/\bGREEN\b|\bYELLOW\b|\bRED\b/.test(r.userData.label))).toBe(true);
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
    expect(lines.length).toBe(1);
    expect(lines[0].userData.plotCount).toBeGreaterThan(8);
    expect(lines[0].geometry.getAttribute("position").count).toBeGreaterThan(64);
    overlays.setMode("world", {}, land);
    expect(overlays.group.children.filter((c) => c.userData.kind === "lot-outline").length).toBe(0);
  });
});
