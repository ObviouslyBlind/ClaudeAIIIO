import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  canEnter,
  createInterior,
  makeInteriorScene,
  wrapHarbourWorld,
  DOWNSTAIRS_Y,
  UPSTAIRS_Y,
} from "../public/harbour/interior.js";

function plot(partial: Record<string, unknown> = {}) {
  return {
    id: "n-street-0",
    island: "north",
    x: 40,
    z: -7000,
    owner: "visitor",
    use: "stall",
    ...partial,
  };
}

describe("owned building interiors", () => {
  it("canEnter is true only if owner is visitor and use is set", () => {
    expect(canEnter(plot({ owner: "visitor", use: "stall" }))).toBe(true);
    expect(canEnter(plot({ owner: "visitor", use: "farm" }))).toBe(true);
    expect(canEnter(plot({ owner: "visitor", use: null }))).toBe(false);
    expect(canEnter(plot({ owner: "visitor", use: "" }))).toBe(false);
    expect(canEnter({ owner: "visitor", use: undefined })).toBe(false);
    expect(canEnter(plot({ owner: "npc", use: "stall" }))).toBe(false);
    expect(canEnter(plot({ owner: null, use: "stall" }))).toBe(false);
    expect(canEnter(plot({ owner: "alice", use: "farm" }))).toBe(false);
    expect(canEnter(undefined)).toBe(false);
    expect(canEnter(null)).toBe(false);
  });

  it("builds downstairs, stairs, and upstairs placeholder boxes labelled PAPER", () => {
    const g = makeInteriorScene();
    const names = g.children.map((c) => c.name);
    expect(names).toContain("downstairs");
    expect(names).toContain("stairs");
    expect(names).toContain("upstairs");
    expect(g.userData.mode).toBe("PAPER");
    const paper = [];
    g.traverse((o) => {
      if (o.userData?.kind === "interior-paper" || o.userData?.mode === "PAPER") paper.push(o);
    });
    expect(paper.length).toBeGreaterThan(1);
    let boxes = 0;
    g.traverse((o) => {
      if (o.isMesh) boxes += 1;
    });
    expect(boxes).toBeGreaterThan(12);
  });

  it("dresses PAPER rooms as a Caribbean house: windows, table, chairs, lamp, bed", () => {
    const g = makeInteriorScene();
    const down = g.getObjectByName("downstairs");
    const up = g.getObjectByName("upstairs");
    expect(down).toBeTruthy();
    expect(up).toBeTruthy();

    const kindsIn = (root: THREE.Object3D) => {
      const kinds: string[] = [];
      root.traverse((o) => {
        if (o.userData?.kind) kinds.push(o.userData.kind);
      });
      return kinds;
    };

    const downKinds = kindsIn(down!);
    expect(downKinds).toContain("interior-table");
    expect(downKinds.filter((k) => k === "interior-chair").length).toBeGreaterThanOrEqual(2);
    expect(downKinds).toContain("interior-lamp");
    expect(downKinds).toContain("interior-window");
    expect(downKinds).toContain("exit");
    expect(downKinds).toContain("interior-floor");
    expect(downKinds).toContain("interior-paper");

    const upKinds = kindsIn(up!);
    expect(upKinds).toContain("interior-bed");
    expect(upKinds).toContain("interior-lamp");
    expect(upKinds).toContain("interior-window");
    expect(upKinds).toContain("interior-floor");
    expect(upKinds).toContain("interior-paper");

    let exitDoors = 0;
    g.traverse((o) => {
      if (o.userData?.kind === "exit" && (o as THREE.Mesh).isMesh) exitDoors += 1;
    });
    expect(exitDoors).toBeGreaterThanOrEqual(1);
  });

  it("hides the harbour group without removing it, then exit restores the plot", () => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x7ec8d4);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    scene.add(hemi);
    const worldBox = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
    worldBox.name = "island";
    scene.add(worldBox);
    const player = new THREE.Object3D();
    player.position.set(12, 2, -30);
    scene.add(player);

    const harbour = wrapHarbourWorld(scene, { keep: [player] });
    expect(harbour.parent).toBe(scene);
    expect(worldBox.parent).toBe(harbour);
    expect(scene.children).toContain(harbour);
    expect(scene.children).toContain(hemi);

    const statuses: string[] = [];
    const interior = createInterior({
      scene,
      player,
      setStatus: (t: string) => statuses.push(t),
      heightAt: () => 1.12,
      specOf: () => ({ id: "north" }),
    });
    interior.setHarbour(harbour);

    expect(interior.enter(plot({ owner: "npc", use: "stall" }))).toBe(false);
    expect(harbour.visible).toBe(true);
    expect(interior.isInside()).toBe(false);

    const p = plot({ owner: "visitor", use: "farm", x: 88, z: -6910 });
    expect(interior.enter(p)).toBe(true);
    expect(interior.isInside()).toBe(true);
    expect(interior.currentFloor()).toBe("downstairs");
    expect(player.position.y).toBeCloseTo(DOWNSTAIRS_Y, 5);
    expect(harbour.visible).toBe(false);
    expect(scene.children).toContain(harbour);
    expect(harbour.parent).toBe(scene);
    expect(statuses.some((s) => s.includes("PAPER"))).toBe(true);

    interior.goStairs();
    expect(interior.currentFloor()).toBe("upstairs");
    expect(player.position.y).toBeCloseTo(UPSTAIRS_Y, 5);

    const left = interior.exit();
    expect(left).toBe(p);
    expect(interior.isInside()).toBe(false);
    expect(harbour.visible).toBe(true);
    expect(scene.children).toContain(harbour);
    expect(player.position.x).toBeCloseTo(88);
    expect(player.position.z).toBeCloseTo(-6910);
    expect(player.position.y).toBeCloseTo(1.12 + 1.15);
  });
});
