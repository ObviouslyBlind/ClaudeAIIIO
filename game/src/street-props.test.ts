import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createLandBoard, distToPaved, heightAt, ISLANDS, ROAD_CLEAR } from "./land.ts";
import {
  LAMP_GLASS,
  LAMP_GLOW,
  makeStreetProps,
  NORTH_PORT_STRETCH_M,
  offsetFromCentreline,
  ROAD_CLEAR_M,
  STREET_SETBACK_MAX_M,
  STREET_SETBACK_MIN_M,
  streetSetbackM,
} from "../public/harbour/street-props.js";

describe("street prop setback", () => {
  it("keeps furniture 12–16 m off the paved centreline, outside ROAD_CLEAR", () => {
    expect(ROAD_CLEAR_M).toBe(ROAD_CLEAR);
    expect(STREET_SETBACK_MIN_M).toBeGreaterThan(ROAD_CLEAR);
    expect(STREET_SETBACK_MIN_M).toBe(12);
    expect(STREET_SETBACK_MAX_M).toBe(16);

    for (let i = 0; i < 9; i++) {
      const s = streetSetbackM(i);
      expect(s).toBeGreaterThanOrEqual(STREET_SETBACK_MIN_M);
      expect(s).toBeLessThanOrEqual(STREET_SETBACK_MAX_M);
      expect(s).toBeGreaterThanOrEqual(ROAD_CLEAR);
    }

    const o = offsetFromCentreline(0, 0, 0, 10, 1, 14);
    expect(Math.hypot(o.x, o.z)).toBeCloseTo(14, 5);
    expect(Math.abs(o.x)).toBeCloseTo(14, 5);
  });

  it("plants lamps, benches, and signs on the north port verge, not on tarmac or fields", () => {
    const map = createLandBoard();
    const added: THREE.Object3D[] = [];
    const scene = { add(obj: THREE.Object3D) { added.push(obj); } };
    const root = makeStreetProps(map, {
      scene,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });
    expect(added).toEqual([root]);

    const placed = (root.userData.placed || []) as {
      kind: string;
      island: string;
      x: number;
      z: number;
      setback: number;
      along: number;
    }[];
    expect(placed.length).toBeGreaterThan(20);
    expect(placed.some((p) => p.kind === "lamp")).toBe(true);
    expect(placed.some((p) => p.kind === "bench")).toBe(true);
    expect(placed.some((p) => p.kind === "sign")).toBe(true);

    const northPort = placed.filter(
      (p) => p.island === "north" && p.along <= NORTH_PORT_STRETCH_M,
    );
    expect(northPort.length).toBeGreaterThanOrEqual(16);

    const port = ISLANDS.north.port;
    const nearSpawn = northPort.filter((p) => Math.hypot(p.x - port.x, p.z - port.z) < 220);
    expect(nearSpawn.length).toBeGreaterThanOrEqual(8);

    for (const p of placed) {
      const spec = ISLANDS[p.island as "north" | "south"];
      expect(p.setback).toBeGreaterThanOrEqual(STREET_SETBACK_MIN_M);
      expect(p.setback).toBeLessThanOrEqual(STREET_SETBACK_MAX_M);
      expect(distToPaved(spec, p.x, p.z)).toBeGreaterThanOrEqual(ROAD_CLEAR);
      expect(heightAt(spec, p.x, p.z)).toBeGreaterThanOrEqual(0.4);
      const field = map.plots.find(
        (plot) => plot.band === "field" && plot.island === p.island && Math.hypot(plot.x - p.x, plot.z - p.z) < 8,
      );
      expect(field).toBeUndefined();
    }
  });

  it("builds paper lamps with warm glass and wood/iron posts, not cylinders", () => {
    const map = createLandBoard();
    const scene = { add(_obj: THREE.Object3D) {} };
    const root = makeStreetProps(map, {
      scene,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });

    const lamps: THREE.Object3D[] = [];
    root.traverse((obj) => {
      if (obj.userData?.prop === "lamp") lamps.push(obj);
    });
    expect(lamps.length).toBeGreaterThan(4);
    expect(LAMP_GLASS).toBe(0xf3d6a0);
    expect(LAMP_GLOW).toBe(0xe8a45a);
    const glassR = (LAMP_GLASS >> 16) & 255;
    const glassB = LAMP_GLASS & 255;
    expect(glassR).toBeGreaterThan(glassB);

    for (const lamp of lamps) {
      expect(lamp.userData.mode).toBe("PAPER");
      let boxes = 0;
      let glass = 0;
      let wood = 0;
      let iron = 0;
      lamp.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        const mat = mesh.material as THREE.MeshLambertMaterial;
        expect(mat.type).toBe("MeshLambertMaterial");
        const hex = mat.color.getHex();
        if (mesh.userData.part === "glass") {
          glass += 1;
          expect(hex).toBe(LAMP_GLASS);
          expect(mat.emissive.getHex()).toBe(LAMP_GLOW);
        }
        if (hex === 0x8a6238) wood += 1;
        if (hex === 0x3a322c || hex === 0x2a2420) iron += 1;
      });
      expect(boxes).toBeGreaterThan(8);
      expect(glass).toBe(4);
      expect(wood).toBeGreaterThan(0);
      expect(iron).toBeGreaterThan(0);
    }
  });

  it("puts a kraft PAPER finial or cap on each verge lamp post", () => {
    const map = createLandBoard();
    const scene = { add(_obj: THREE.Object3D) {} };
    const root = makeStreetProps(map, {
      scene,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });

    const lamps: THREE.Object3D[] = [];
    root.traverse((obj) => {
      if (obj.userData?.prop === "lamp") lamps.push(obj);
    });
    expect(lamps.length).toBeGreaterThan(4);

    const kraft = new Set([0x8a6238, 0x9a6a40, 0x6a4a2a, 0xf3d6a0]);
    for (const lamp of lamps) {
      expect(lamp.userData.mode).toBe("PAPER");
      const tops: THREE.Object3D[] = [];
      lamp.traverse((obj) => {
        if (obj.userData?.part === "finial" || obj.userData?.part === "cap") tops.push(obj);
      });
      expect(tops.length).toBeGreaterThanOrEqual(1);
      for (const t of tops) {
        expect(t.userData.part === "finial" || t.userData.part === "cap").toBe(true);
        expect(t.userData.mode).toBe("PAPER");
        const mesh = t as THREE.Mesh;
        expect(mesh.isMesh).toBe(true);
        expect(mesh.geometry.type).toBe("BoxGeometry");
        const mat = mesh.material as THREE.MeshLambertMaterial;
        expect(mat.type).toBe("MeshLambertMaterial");
        expect(kraft.has(mat.color.getHex())).toBe(true);
      }
    }
  });

  it("sits kraft PAPER crate seats on the north spawn verge, off ROAD_CLEAR", () => {
    const map = createLandBoard();
    const scene = { add(_obj: THREE.Object3D) {} };
    const root = makeStreetProps(map, {
      scene,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });

    const placed = (root.userData.placed || []) as {
      kind: string;
      island: string;
      x: number;
      z: number;
      setback: number;
      along: number;
    }[];
    const port = ISLANDS.north.port;
    const nearSpawn = placed.filter(
      (p) =>
        p.kind === "bench" &&
        p.island === "north" &&
        p.along <= NORTH_PORT_STRETCH_M &&
        Math.hypot(p.x - port.x, p.z - port.z) < 220,
    );
    expect(nearSpawn.length).toBeGreaterThanOrEqual(3);

    const benches: THREE.Object3D[] = [];
    root.traverse((obj) => {
      if (obj.userData?.prop === "bench") benches.push(obj);
    });
    expect(benches.length).toBeGreaterThanOrEqual(nearSpawn.length);

    const wood = new Set([0x8a6238, 0x9a6a40, 0x6a4a2a]);
    for (const bench of benches) {
      expect(bench.userData.mode).toBe("PAPER");
      expect(bench.userData.part).toBe("crate-seat");
      let boxes = 0;
      let crate = 0;
      let seat = 0;
      bench.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        const mat = mesh.material as THREE.MeshLambertMaterial;
        expect(mat.type).toBe("MeshLambertMaterial");
        const hex = mat.color.getHex();
        expect(wood.has(hex)).toBe(true);
        if (mesh.userData.part === "crate") crate += 1;
        if (mesh.userData.part === "seat") seat += 1;
      });
      expect(boxes).toBeGreaterThanOrEqual(6);
      expect(crate).toBe(2);
      expect(seat).toBe(2);
    }

    for (const p of nearSpawn) {
      expect(p.setback).toBeGreaterThanOrEqual(STREET_SETBACK_MIN_M);
      expect(distToPaved(ISLANDS.north, p.x, p.z)).toBeGreaterThanOrEqual(ROAD_CLEAR);
    }
  });

  it("sits a kraft PAPER fishing-net rack on the north spawn verge, off ROAD_CLEAR", () => {
    const map = createLandBoard();
    const scene = { add(_obj: THREE.Object3D) {} };
    const root = makeStreetProps(map, {
      scene,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });

    const placed = (root.userData.placed || []) as {
      kind: string;
      island: string;
      x: number;
      z: number;
      setback: number;
      along: number;
    }[];
    const port = ISLANDS.north.port;
    const racks = placed.filter(
      (p) =>
        p.kind === "net-rack" &&
        p.island === "north" &&
        p.along <= NORTH_PORT_STRETCH_M &&
        Math.hypot(p.x - port.x, p.z - port.z) < 220,
    );
    expect(racks.length).toBeGreaterThanOrEqual(1);

    const groups: THREE.Object3D[] = [];
    root.traverse((obj) => {
      if (obj.userData?.prop === "net-rack") groups.push(obj);
    });
    expect(groups.length).toBeGreaterThanOrEqual(1);

    const woodIron = new Set([0x8a6238, 0x9a6a40, 0x6a4a2a, 0x3a322c, 0x2a2420]);
    for (const rack of groups) {
      expect(rack.userData.mode).toBe("PAPER");
      expect(rack.userData.part === "net-rack" || rack.userData.dress === "net-rack").toBe(true);
      let boxes = 0;
      let posts = 0;
      let net = 0;
      rack.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        const mat = mesh.material as THREE.MeshLambertMaterial;
        expect(mat.type).toBe("MeshLambertMaterial");
        const hex = mat.color.getHex();
        expect(woodIron.has(hex)).toBe(true);
        if (mesh.userData.part === "post") posts += 1;
        if (mesh.userData.part === "net") net += 1;
      });
      expect(boxes).toBeGreaterThanOrEqual(8);
      expect(posts).toBe(2);
      expect(net).toBeGreaterThanOrEqual(6);
    }

    for (const p of racks) {
      expect(p.setback).toBeGreaterThanOrEqual(STREET_SETBACK_MIN_M);
      expect(distToPaved(ISLANDS.north, p.x, p.z)).toBeGreaterThanOrEqual(ROAD_CLEAR);
    }
  });

  it("sits a kraft PAPER open fish crate on the north spawn verge, off ROAD_CLEAR", () => {
    const map = createLandBoard();
    const scene = { add(_obj: THREE.Object3D) {} };
    const root = makeStreetProps(map, {
      scene,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });

    const placed = (root.userData.placed || []) as {
      kind: string;
      island: string;
      x: number;
      z: number;
      setback: number;
      along: number;
    }[];
    const port = ISLANDS.north.port;
    const crates = placed.filter(
      (p) =>
        p.kind === "fish-crate" &&
        p.island === "north" &&
        p.along <= NORTH_PORT_STRETCH_M &&
        Math.hypot(p.x - port.x, p.z - port.z) < 220,
    );
    expect(crates.length).toBeGreaterThanOrEqual(1);

    const groups: THREE.Object3D[] = [];
    root.traverse((obj) => {
      if (obj.userData?.prop === "fish-crate") groups.push(obj);
    });
    expect(groups.length).toBeGreaterThanOrEqual(1);

    const woodTeal = new Set([0x8a6238, 0x9a6a40, 0x6a4a2a, 0x8ec4d4, 0x2a7a72]);
    for (const crate of groups) {
      expect(crate.userData.mode).toBe("PAPER");
      expect(crate.userData.part === "fish-crate" || crate.userData.dress === "fish-crate").toBe(
        true,
      );
      let boxes = 0;
      let fish = 0;
      let crateParts = 0;
      crate.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        const mat = mesh.material as THREE.MeshLambertMaterial;
        expect(mat.type).toBe("MeshLambertMaterial");
        const hex = mat.color.getHex();
        expect(woodTeal.has(hex)).toBe(true);
        if (mesh.userData.part === "fish") fish += 1;
        if (mesh.userData.part === "crate") crateParts += 1;
      });
      expect(boxes).toBeGreaterThanOrEqual(7);
      expect(crateParts).toBeGreaterThanOrEqual(1);
      expect(fish).toBeGreaterThanOrEqual(2);
    }

    for (const p of crates) {
      expect(p.setback).toBeGreaterThanOrEqual(STREET_SETBACK_MIN_M);
      expect(distToPaved(ISLANDS.north, p.x, p.z)).toBeGreaterThanOrEqual(ROAD_CLEAR);
    }
  });

  it("props a kraft PAPER lid on the open fish crate, off ROAD_CLEAR", () => {
    const map = createLandBoard();
    const scene = { add(_obj: THREE.Object3D) {} };
    const root = makeStreetProps(map, {
      scene,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });

    const placed = (root.userData.placed || []) as {
      kind: string;
      island: string;
      x: number;
      z: number;
      setback: number;
      along: number;
    }[];
    const port = ISLANDS.north.port;
    const crates = placed.filter(
      (p) =>
        p.kind === "fish-crate" &&
        p.island === "north" &&
        p.along <= NORTH_PORT_STRETCH_M &&
        Math.hypot(p.x - port.x, p.z - port.z) < 220,
    );
    expect(crates.length).toBeGreaterThanOrEqual(1);

    const groups: THREE.Object3D[] = [];
    root.traverse((obj) => {
      if (obj.userData?.prop === "fish-crate") groups.push(obj);
    });
    expect(groups.length).toBeGreaterThanOrEqual(1);

    const wood = new Set([0x8a6238, 0x9a6a40, 0x6a4a2a]);
    for (const crate of groups) {
      expect(crate.userData.mode).toBe("PAPER");
      const lids: THREE.Object3D[] = [];
      crate.traverse((obj) => {
        if (obj.userData?.part === "lid") lids.push(obj);
      });
      expect(lids.length).toBeGreaterThanOrEqual(1);
      for (const lid of lids) {
        expect(lid.userData.part).toBe("lid");
        expect(lid.userData.mode === "PAPER" || crate.userData.mode === "PAPER").toBe(true);
        const mesh = lid as THREE.Mesh;
        expect(mesh.isMesh).toBe(true);
        expect(mesh.geometry.type).toBe("BoxGeometry");
        const mat = mesh.material as THREE.MeshLambertMaterial;
        expect(mat.type).toBe("MeshLambertMaterial");
        expect(wood.has(mat.color.getHex())).toBe(true);
        expect(Math.abs(mesh.rotation.x) + Math.abs(mesh.rotation.z)).toBeGreaterThan(0.3);
        expect(mesh.position.y).toBeGreaterThan(0.28);
        expect(mesh.position.y).toBeLessThan(0.7);
        expect(Math.hypot(mesh.position.x, mesh.position.z)).toBeLessThan(0.5);
      }
    }

    for (const p of crates) {
      expect(p.setback).toBeGreaterThanOrEqual(STREET_SETBACK_MIN_M);
      expect(distToPaved(ISLANDS.north, p.x, p.z)).toBeGreaterThanOrEqual(ROAD_CLEAR);
    }
  });

  it("sits a kraft PAPER dipper in the village pump trough, off ROAD_CLEAR", () => {
    const map = createLandBoard();
    const scene = { add(_obj: THREE.Object3D) {} };
    const root = makeStreetProps(map, {
      scene,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });

    const placed = (root.userData.placed || []) as {
      kind: string;
      island: string;
      x: number;
      z: number;
      setback: number;
      along: number;
    }[];
    const port = ISLANDS.north.port;
    const pumps = placed.filter(
      (p) =>
        p.kind === "pump" &&
        p.island === "north" &&
        p.along <= NORTH_PORT_STRETCH_M &&
        Math.hypot(p.x - port.x, p.z - port.z) < 220,
    );
    expect(pumps.length).toBeGreaterThanOrEqual(1);

    const pumpGroups: THREE.Object3D[] = [];
    const dippers: THREE.Object3D[] = [];
    root.traverse((obj) => {
      if (obj.userData?.prop === "pump") pumpGroups.push(obj);
      if (obj.userData?.part === "dipper" || obj.userData?.dress === "dipper") {
        if (obj.userData?.prop === "dipper" || obj.name === "dipper") dippers.push(obj);
      }
    });
    expect(pumpGroups.length).toBeGreaterThanOrEqual(1);
    expect(dippers.length).toBeGreaterThanOrEqual(1);

    const woodKraft = new Set([0x8a6238, 0x9a6a40, 0x6a4a2a, 0xf3d6a0]);
    for (const dipper of dippers) {
      expect(dipper.userData.mode === "PAPER" || dipper.userData.part === "dipper").toBe(true);
      expect(dipper.userData.part === "dipper" || dipper.userData.dress === "dipper").toBe(true);
      let boxes = 0;
      dipper.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        const mat = mesh.material as THREE.MeshLambertMaterial;
        expect(mat.type).toBe("MeshLambertMaterial");
        const hex = mat.color.getHex();
        expect(woodKraft.has(hex)).toBe(true);
      });
      expect(boxes).toBeGreaterThanOrEqual(2);
      expect(dipper.position.y).toBeGreaterThan(0.15);
      expect(dipper.position.y).toBeLessThan(0.5);
      expect(Math.hypot(dipper.position.x, dipper.position.z - 0.46)).toBeLessThan(0.5);
    }

    for (const pump of pumpGroups) {
      let found = false;
      pump.traverse((obj) => {
        if (obj.userData?.part === "dipper" || obj.userData?.dress === "dipper") found = true;
      });
      expect(found).toBe(true);
      expect(pump.userData.mode).toBe("PAPER");
    }

    for (const p of pumps) {
      expect(p.setback).toBeGreaterThanOrEqual(STREET_SETBACK_MIN_M);
      expect(distToPaved(ISLANDS.north, p.x, p.z)).toBeGreaterThanOrEqual(ROAD_CLEAR);
    }
  });

  it("sits a kraft PAPER crank on the village pump head, off ROAD_CLEAR", () => {
    const map = createLandBoard();
    const scene = { add(_obj: THREE.Object3D) {} };
    const root = makeStreetProps(map, {
      scene,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });

    const placed = (root.userData.placed || []) as {
      kind: string;
      island: string;
      x: number;
      z: number;
      setback: number;
      along: number;
    }[];
    const port = ISLANDS.north.port;
    const pumps = placed.filter(
      (p) =>
        p.kind === "pump" &&
        p.island === "north" &&
        p.along <= NORTH_PORT_STRETCH_M &&
        Math.hypot(p.x - port.x, p.z - port.z) < 220,
    );
    expect(pumps.length).toBeGreaterThanOrEqual(1);

    const pumpGroups: THREE.Object3D[] = [];
    const cranks: THREE.Object3D[] = [];
    root.traverse((obj) => {
      if (obj.userData?.prop === "pump") pumpGroups.push(obj);
      if (obj.userData?.part === "crank" || obj.userData?.dress === "crank") {
        if (obj.userData?.prop === "crank" || obj.name === "crank") cranks.push(obj);
      }
    });
    expect(pumpGroups.length).toBeGreaterThanOrEqual(1);
    expect(cranks.length).toBeGreaterThanOrEqual(1);

    const wood = new Set([0x8a6238, 0x9a6a40, 0x6a4a2a]);
    for (const crank of cranks) {
      expect(crank.userData.mode === "PAPER" || crank.userData.part === "crank").toBe(true);
      expect(crank.userData.part === "crank" || crank.userData.dress === "crank").toBe(true);
      let boxes = 0;
      crank.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        const mat = mesh.material as THREE.MeshLambertMaterial;
        expect(mat.type).toBe("MeshLambertMaterial");
        const hex = mat.color.getHex();
        expect(wood.has(hex)).toBe(true);
      });
      expect(boxes).toBeGreaterThanOrEqual(2);
      expect(crank.position.y).toBeGreaterThan(1.1);
      expect(crank.position.y).toBeLessThan(1.5);
      expect(Math.hypot(crank.position.x, crank.position.z)).toBeLessThan(0.3);
    }

    for (const pump of pumpGroups) {
      let found = false;
      pump.traverse((obj) => {
        if (obj.userData?.part === "crank" || obj.userData?.dress === "crank") found = true;
      });
      expect(found).toBe(true);
      expect(pump.userData.mode).toBe("PAPER");
    }

    for (const p of pumps) {
      expect(p.setback).toBeGreaterThanOrEqual(STREET_SETBACK_MIN_M);
      expect(distToPaved(ISLANDS.north, p.x, p.z)).toBeGreaterThanOrEqual(ROAD_CLEAR);
    }
  });

  it("sits a tiny kraft PAPER bolt on the village pump, crank dipper lid remain", () => {
    const map = createLandBoard();
    const scene = { add(_obj: THREE.Object3D) {} };
    const root = makeStreetProps(map, {
      scene,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });

    const pumpGroups: THREE.Object3D[] = [];
    const cranks: THREE.Object3D[] = [];
    const dippers: THREE.Object3D[] = [];
    const lids: THREE.Object3D[] = [];
    root.traverse((obj) => {
      if (obj.userData?.prop === "pump") pumpGroups.push(obj);
      if (obj.userData?.part === "crank" || obj.userData?.dress === "crank") {
        if (obj.userData?.prop === "crank" || obj.name === "crank") cranks.push(obj);
      }
      if (obj.userData?.part === "dipper" || obj.userData?.dress === "dipper") {
        if (obj.userData?.prop === "dipper" || obj.name === "dipper") dippers.push(obj);
      }
      if (obj.userData?.part === "lid") lids.push(obj);
    });
    expect(pumpGroups.length).toBeGreaterThanOrEqual(1);
    expect(cranks.length).toBeGreaterThanOrEqual(1);
    expect(dippers.length).toBeGreaterThanOrEqual(1);
    expect(lids.length).toBeGreaterThanOrEqual(1);

    const wood = new Set([0x8a6238, 0x6a4a2a]);
    for (const pump of pumpGroups) {
      expect(pump.userData.mode).toBe("PAPER");
      const bolts: THREE.Object3D[] = [];
      pump.traverse((obj) => {
        if (obj.userData?.part === "bolt") bolts.push(obj);
      });
      expect(bolts.length).toBeGreaterThanOrEqual(1);
      for (const b of bolts) {
        expect(b.userData.part).toBe("bolt");
        expect(b.userData.mode === "PAPER" || pump.userData.mode === "PAPER").toBe(true);
        const mesh = b as THREE.Mesh;
        expect(mesh.isMesh).toBe(true);
        expect(mesh.geometry.type).toBe("BoxGeometry");
        const mat = mesh.material as THREE.MeshLambertMaterial;
        expect(mat.type).toBe("MeshLambertMaterial");
        expect(wood.has(mat.color.getHex())).toBe(true);
        const { width, height, depth } = (mesh.geometry as THREE.BoxGeometry).parameters;
        expect(width).toBeLessThan(0.12);
        expect(height).toBeLessThan(0.12);
        expect(depth).toBeLessThan(0.12);
        expect(mesh.position.y).toBeGreaterThan(0.5);
        expect(mesh.position.y).toBeLessThan(1.45);
        expect(Math.hypot(mesh.position.x, mesh.position.z)).toBeLessThan(0.25);
      }
    }
  });

  it("sits a tiny kraft PAPER washer on the village pump, bolt crank dipper remain", () => {
    const map = createLandBoard();
    const scene = { add(_obj: THREE.Object3D) {} };
    const root = makeStreetProps(map, {
      scene,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });

    const pumpGroups: THREE.Object3D[] = [];
    const bolts: THREE.Object3D[] = [];
    const cranks: THREE.Object3D[] = [];
    const dippers: THREE.Object3D[] = [];
    root.traverse((obj) => {
      if (obj.userData?.prop === "pump") pumpGroups.push(obj);
      if (obj.userData?.part === "bolt") bolts.push(obj);
      if (obj.userData?.part === "crank" || obj.userData?.dress === "crank") {
        if (obj.userData?.prop === "crank" || obj.name === "crank") cranks.push(obj);
      }
      if (obj.userData?.part === "dipper" || obj.userData?.dress === "dipper") {
        if (obj.userData?.prop === "dipper" || obj.name === "dipper") dippers.push(obj);
      }
    });
    expect(pumpGroups.length).toBeGreaterThanOrEqual(1);
    expect(bolts.length).toBeGreaterThanOrEqual(1);
    expect(cranks.length).toBeGreaterThanOrEqual(1);
    expect(dippers.length).toBeGreaterThanOrEqual(1);

    const wood = new Set([0x8a6238, 0x6a4a2a]);
    for (const pump of pumpGroups) {
      expect(pump.userData.mode).toBe("PAPER");
      const washers: THREE.Object3D[] = [];
      pump.traverse((obj) => {
        if (obj.userData?.part === "washer") washers.push(obj);
      });
      expect(washers.length).toBeGreaterThanOrEqual(1);
      for (const w of washers) {
        expect(w.userData.part).toBe("washer");
        expect(w.userData.mode === "PAPER" || pump.userData.mode === "PAPER").toBe(true);
        const mesh = w as THREE.Mesh;
        expect(mesh.isMesh).toBe(true);
        expect(mesh.geometry.type).toBe("BoxGeometry");
        const mat = mesh.material as THREE.MeshLambertMaterial;
        expect(mat.type).toBe("MeshLambertMaterial");
        expect(wood.has(mat.color.getHex())).toBe(true);
        const { width, height, depth } = (mesh.geometry as THREE.BoxGeometry).parameters;
        expect(width).toBeLessThan(0.12);
        expect(height).toBeLessThan(0.12);
        expect(depth).toBeLessThan(0.12);
        expect(mesh.position.y).toBeGreaterThan(0.5);
        expect(mesh.position.y).toBeLessThan(1.45);
        expect(Math.hypot(mesh.position.x, mesh.position.z)).toBeLessThan(0.25);
      }
    }
  });

  it("sits a tiny kraft PAPER peg on the village pump, bolt and washer remain", () => {
    const map = createLandBoard();
    const scene = { add(_obj: THREE.Object3D) {} };
    const root = makeStreetProps(map, {
      scene,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });

    const pumpGroups: THREE.Object3D[] = [];
    const bolts: THREE.Object3D[] = [];
    const washers: THREE.Object3D[] = [];
    root.traverse((obj) => {
      if (obj.userData?.prop === "pump") pumpGroups.push(obj);
      if (obj.userData?.part === "bolt") bolts.push(obj);
      if (obj.userData?.part === "washer") washers.push(obj);
    });
    expect(pumpGroups.length).toBeGreaterThanOrEqual(1);
    expect(bolts.length).toBeGreaterThanOrEqual(1);
    expect(washers.length).toBeGreaterThanOrEqual(1);

    const wood = new Set([0x8a6238, 0x6a4a2a]);
    for (const pump of pumpGroups) {
      expect(pump.userData.mode).toBe("PAPER");
      const pegs: THREE.Object3D[] = [];
      pump.traverse((obj) => {
        if (obj.userData?.part === "peg") pegs.push(obj);
      });
      expect(pegs.length).toBeGreaterThanOrEqual(1);
      for (const p of pegs) {
        expect(p.userData.part).toBe("peg");
        expect(p.userData.mode === "PAPER" || pump.userData.mode === "PAPER").toBe(true);
        const mesh = p as THREE.Mesh;
        expect(mesh.isMesh).toBe(true);
        expect(mesh.geometry.type).toBe("BoxGeometry");
        const mat = mesh.material as THREE.MeshLambertMaterial;
        expect(mat.type).toBe("MeshLambertMaterial");
        expect(wood.has(mat.color.getHex())).toBe(true);
        const { width, height, depth } = (mesh.geometry as THREE.BoxGeometry).parameters;
        expect(width).toBeLessThan(0.12);
        expect(height).toBeLessThan(0.12);
        expect(depth).toBeLessThan(0.12);
        expect(mesh.position.y).toBeGreaterThan(0.5);
        expect(mesh.position.y).toBeLessThan(1.45);
        expect(Math.hypot(mesh.position.x, mesh.position.z)).toBeLessThan(0.25);
      }
    }
  });

  it("sits a tiny kraft PAPER hook on the village pump, peg and bolt remain", () => {
    const map = createLandBoard();
    const scene = { add(_obj: THREE.Object3D) {} };
    const root = makeStreetProps(map, {
      scene,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
    });

    const pumpGroups: THREE.Object3D[] = [];
    const pegs: THREE.Object3D[] = [];
    const bolts: THREE.Object3D[] = [];
    root.traverse((obj) => {
      if (obj.userData?.prop === "pump") pumpGroups.push(obj);
      if (obj.userData?.part === "peg") pegs.push(obj);
      if (obj.userData?.part === "bolt") bolts.push(obj);
    });
    expect(pumpGroups.length).toBeGreaterThanOrEqual(1);
    expect(pegs.length).toBeGreaterThanOrEqual(1);
    expect(bolts.length).toBeGreaterThanOrEqual(1);

    const wood = new Set([0x8a6238, 0x6a4a2a]);
    for (const pump of pumpGroups) {
      expect(pump.userData.mode).toBe("PAPER");
      const hooks: THREE.Object3D[] = [];
      pump.traverse((obj) => {
        if (obj.userData?.part === "hook") hooks.push(obj);
      });
      expect(hooks.length).toBeGreaterThanOrEqual(1);
      for (const h of hooks) {
        expect(h.userData.part).toBe("hook");
        expect(h.userData.mode === "PAPER" || pump.userData.mode === "PAPER").toBe(true);
        const mesh = h as THREE.Mesh;
        expect(mesh.isMesh).toBe(true);
        expect(mesh.geometry.type).toBe("BoxGeometry");
        const mat = mesh.material as THREE.MeshLambertMaterial;
        expect(mat.type).toBe("MeshLambertMaterial");
        expect(wood.has(mat.color.getHex())).toBe(true);
        const { width, height, depth } = (mesh.geometry as THREE.BoxGeometry).parameters;
        expect(width).toBeLessThan(0.12);
        expect(height).toBeLessThan(0.12);
        expect(depth).toBeLessThan(0.12);
        expect(mesh.position.y).toBeGreaterThan(0.5);
        expect(mesh.position.y).toBeLessThan(1.45);
        expect(Math.hypot(mesh.position.x, mesh.position.z)).toBeLessThan(0.25);
      }
    }
  });
});
