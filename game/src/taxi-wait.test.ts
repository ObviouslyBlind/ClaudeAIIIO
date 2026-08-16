import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createLandBoard, heightAt, ISLANDS } from "./land.ts";
import {
  TAXI_WAIT_MS,
  createTaxi,
  makeTaxiMesh,
  pavedDestFromMapClick,
  projectOnPolyline,
  taxiWaitExpired,
  worldToMapPx,
  islandMapBounds,
} from "../public/harbour/taxi.js";

describe("taxi wait timeout", () => {
  it("leaves after 60s while coming or waiting, not while boarded", () => {
    expect(TAXI_WAIT_MS).toBe(60_000);
    expect(taxiWaitExpired("coming", 1_000, 60_999)).toBe(false);
    expect(taxiWaitExpired("coming", 1_000, 61_000)).toBe(true);
    expect(taxiWaitExpired("waiting", 0, 59_999)).toBe(false);
    expect(taxiWaitExpired("waiting", 0, 60_000)).toBe(true);
    expect(taxiWaitExpired("boarded", 0, 120_000)).toBe(false);
    expect(taxiWaitExpired("hauling", 0, 120_000)).toBe(false);
    expect(taxiWaitExpired("idle", 0, 60_000)).toBe(false);
    expect(taxiWaitExpired("coming", null, 60_000)).toBe(false);
  });
});

describe("taxi map dest", () => {
  it("projects a rough map tap onto paved and never onto dirt", () => {
    const board = createLandBoard();
    const spec = ISLANDS.north;
    const paved = board.roads.find((r) => r.kind === "paved" && r.island === "north")!;
    const dirt = board.roads.find((r) => r.kind === "dirt" && r.island === "north")!;
    const bounds = islandMapBounds(spec);
    const w = 400;
    const h = 220;
    const tap = worldToMapPx(bounds, dirt.points[0].x, dirt.points[0].z, w, h);
    const dest = pavedDestFromMapClick(board.roads, "north", spec, tap.sx, tap.sy, w, h);
    expect(dest).toBeTruthy();
    expect(projectOnPolyline(paved.points, dest!.proj.x, dest!.proj.z).dist).toBeLessThan(0.5);
    expect(projectOnPolyline(dirt.points, dest!.proj.x, dest!.proj.z).dist).toBeGreaterThan(5);
  });
});

describe("taxi roof lamp", () => {
  it("sits a warm PAPER sign box on the cabin, not a sedan-only lid", () => {
    const mesh = makeTaxiMesh();
    expect(mesh.userData.kind).toBe("taxi");
    expect(mesh.userData.mode).toBe("PAPER");

    const lamps: THREE.Mesh[] = [];
    const aerials: THREE.Mesh[] = [];
    const colors: number[] = [];
    let mast = 0;
    mesh.traverse((obj) => {
      const m = obj as THREE.Mesh & { userData: { part?: string } };
      const mat = m.material as THREE.MeshLambertMaterial | undefined;
      if (mat?.color) colors.push(mat.color.getHex());
      if (m.userData?.part === "lamp") lamps.push(m);
      if (m.userData?.part === "aerial") aerials.push(m);
      const geo = m.geometry as THREE.BufferGeometry & {
        parameters?: { height?: number; radiusTop?: number };
      };
      const h = geo?.parameters?.height ?? 0;
      const r = geo?.parameters?.radiusTop ?? 1;
      if (h > 2.4 && r < 0.2 && mat?.color?.getHex() === 0xff0000) mast += 1;
    });

    expect(colors).toContain(0xf0c430);
    expect(colors).toContain(0xfff3a0);
    expect(lamps.length).toBeGreaterThanOrEqual(3);
    expect(aerials.length).toBeGreaterThanOrEqual(1);
    expect(mast).toBe(0);

    const glow = lamps.find((m) => {
      const mat = m.material as THREE.MeshLambertMaterial;
      return mat.color.getHex() === 0xfff3a0 && mat.emissive.getHex() === 0xfff3a0;
    });
    expect(glow).toBeTruthy();
    expect(glow!.position.y).toBeGreaterThan(2.2);
    expect(glow!.position.y).toBeLessThan(3.1);
    const size = new THREE.Vector3();
    new THREE.Box3().setFromObject(glow!).getSize(size);
    expect(size.y).toBeGreaterThan(0.35);
    expect(size.y).toBeLessThan(0.8);
    expect(size.z).toBeLessThan(0.7);
  });

  it("has a short kraft roof aerial behind the lamp, not a red debug mast", () => {
    const mesh = makeTaxiMesh();
    const aerials: THREE.Mesh[] = [];
    let mast = 0;
    mesh.traverse((obj) => {
      const m = obj as THREE.Mesh & { userData: { part?: string } };
      const mat = m.material as THREE.MeshLambertMaterial | undefined;
      if (m.userData?.part === "aerial") aerials.push(m);
      const geo = m.geometry as THREE.BufferGeometry & {
        parameters?: { height?: number; radiusTop?: number };
      };
      const h = geo?.parameters?.height ?? 0;
      const r = geo?.parameters?.radiusTop ?? 1;
      if (h > 2.4 && r < 0.2 && mat?.color?.getHex() === 0xff0000) mast += 1;
    });
    expect(aerials.length).toBeGreaterThanOrEqual(1);
    expect(mast).toBe(0);

    const aerial = aerials[0];
    const mat = aerial.material as THREE.MeshLambertMaterial;
    expect(mat.color.getHex()).toBe(0xc4a574);
    expect(aerial.position.z).toBeLessThan(-0.12);

    const size = new THREE.Vector3();
    new THREE.Box3().setFromObject(aerial).getSize(size);
    expect(size.y).toBeGreaterThan(0.12);
    expect(size.y).toBeLessThan(0.4);
    expect(size.x).toBeLessThan(0.12);
    expect(size.z).toBeLessThan(0.12);
  });

  it("has two tiny kraft door handles on the cab sides", () => {
    const mesh = makeTaxiMesh();
    const handles: THREE.Mesh[] = [];
    mesh.traverse((obj) => {
      const m = obj as THREE.Mesh & { userData: { part?: string } };
      if (m.userData?.part === "handle") handles.push(m);
    });
    expect(handles.length).toBeGreaterThanOrEqual(2);
  });

  it("has kraft cream PAPER hub boxes on the outer face of each wheel", () => {
    const mesh = makeTaxiMesh();
    const hubs: THREE.Mesh[] = [];
    const aerials: THREE.Mesh[] = [];
    const handles: THREE.Mesh[] = [];
    const bumpers: THREE.Mesh[] = [];
    const checks: THREE.Mesh[] = [];
    const plates: THREE.Mesh[] = [];
    mesh.traverse((obj) => {
      const m = obj as THREE.Mesh & { userData: { part?: string; mode?: string } };
      if (m.userData?.part === "hub") hubs.push(m);
      if (m.userData?.part === "aerial") aerials.push(m);
      if (m.userData?.part === "handle") handles.push(m);
      if (m.userData?.part === "bumper") bumpers.push(m);
      if (m.userData?.part === "check") checks.push(m);
      if (m.userData?.part === "plate") plates.push(m);
    });
    expect(hubs.length).toBe(4);
    expect(hubs.every((h) => h.geometry.type === "BoxGeometry")).toBe(true);
    expect(hubs.every((h) => h.userData.mode === "PAPER")).toBe(true);
    expect(
      hubs.every((h) => (h.material as THREE.MeshLambertMaterial).color.getHex() === 0xf4ead8),
    ).toBe(true);
    expect(hubs.every((h) => Math.abs(h.position.x) > 1.28)).toBe(true);
    expect(aerials.length).toBeGreaterThanOrEqual(1);
    expect(handles.length).toBeGreaterThanOrEqual(2);
    expect(bumpers.length).toBe(2);
    expect(checks.length).toBeGreaterThan(0);
    expect(plates.length).toBeGreaterThanOrEqual(1);
  });

  it("puts a kraft cream PAPER license plate on the taxi rear", () => {
    const mesh = makeTaxiMesh();
    const plates: THREE.Mesh[] = [];
    mesh.traverse((obj) => {
      const m = obj as THREE.Mesh & { userData: { part?: string; mode?: string } };
      if (m.userData?.part === "plate") plates.push(m);
    });
    expect(plates.length).toBeGreaterThanOrEqual(1);
    expect(plates.every((p) => p.geometry.type === "BoxGeometry")).toBe(true);
    expect(plates.every((p) => p.userData.mode === "PAPER")).toBe(true);
    expect(
      plates.every((p) => (p.material as THREE.MeshLambertMaterial).color.getHex() === 0xf4ead8),
    ).toBe(true);
    expect(plates.every((p) => p.position.z < -2.4)).toBe(true);
  });

  it("has two kraft PAPER side mirrors on the cabin A-pillars", () => {
    const mesh = makeTaxiMesh();
    const mirrors: THREE.Mesh[] = [];
    const aerials: THREE.Mesh[] = [];
    const spares: THREE.Mesh[] = [];
    const plates: THREE.Mesh[] = [];
    const hubs: THREE.Mesh[] = [];
    const handles: THREE.Mesh[] = [];
    const wipers: THREE.Mesh[] = [];
    const kraftMirror = new Set([0xc4a574, 0xf4ead8]);
    mesh.traverse((obj) => {
      const m = obj as THREE.Mesh & { userData: { part?: string; mode?: string } };
      if (m.userData?.part === "mirror") mirrors.push(m);
      if (m.userData?.part === "aerial") aerials.push(m);
      if (m.userData?.part === "spare") spares.push(m);
      if (m.userData?.part === "plate") plates.push(m);
      if (m.userData?.part === "hub") hubs.push(m);
      if (m.userData?.part === "handle") handles.push(m);
      if (m.userData?.part === "wiper") wipers.push(m);
    });
    expect(mirrors.length).toBeGreaterThanOrEqual(2);
    expect(mirrors.every((m) => m.geometry.type === "BoxGeometry")).toBe(true);
    expect(mirrors.every((m) => m.userData.mode === "PAPER")).toBe(true);
    expect(
      mirrors.every((m) => kraftMirror.has((m.material as THREE.MeshLambertMaterial).color.getHex())),
    ).toBe(true);
    expect(mirrors.every((m) => Math.abs(m.position.x) > 1.22)).toBe(true);
    expect(mirrors.every((m) => m.position.y > 1.3 && m.position.y < 1.7)).toBe(true);
    expect(aerials.length).toBeGreaterThanOrEqual(1);
    expect(spares.length).toBeGreaterThanOrEqual(1);
    expect(plates.length).toBeGreaterThanOrEqual(1);
    expect(hubs.length).toBe(4);
    expect(handles.length).toBeGreaterThanOrEqual(2);
    expect(wipers.length).toBeGreaterThanOrEqual(2);
  });

  it("puts a kraft PAPER spare tyre on the taxi boot", () => {
    const mesh = makeTaxiMesh();
    const spares: THREE.Mesh[] = [];
    const plates: THREE.Mesh[] = [];
    const hubs: THREE.Mesh[] = [];
    const aerials: THREE.Mesh[] = [];
    const handles: THREE.Mesh[] = [];
    const checks: THREE.Mesh[] = [];
    const wipers: THREE.Mesh[] = [];
    const rubberKraft = new Set([0x1a1a1e, 0xc4a574, 0xf4ead8]);
    mesh.traverse((obj) => {
      const m = obj as THREE.Mesh & { userData: { part?: string; mode?: string } };
      if (m.userData?.part === "spare") spares.push(m);
      if (m.userData?.part === "plate") plates.push(m);
      if (m.userData?.part === "hub") hubs.push(m);
      if (m.userData?.part === "aerial") aerials.push(m);
      if (m.userData?.part === "handle") handles.push(m);
      if (m.userData?.part === "check") checks.push(m);
      if (m.userData?.part === "wiper") wipers.push(m);
    });
    expect(spares.length).toBeGreaterThanOrEqual(1);
    expect(spares.every((s) => s.userData.mode === "PAPER")).toBe(true);
    expect(
      spares.every((s) => ["BoxGeometry", "CylinderGeometry"].includes(s.geometry.type)),
    ).toBe(true);
    expect(
      spares.every((s) => rubberKraft.has((s.material as THREE.MeshLambertMaterial).color.getHex())),
    ).toBe(true);
    expect(spares.every((s) => s.position.z < -2.2)).toBe(true);
    expect(plates.length).toBeGreaterThanOrEqual(1);
    expect(hubs.length).toBe(4);
    expect(aerials.length).toBeGreaterThanOrEqual(1);
    expect(handles.length).toBeGreaterThanOrEqual(2);
    expect(checks.length).toBeGreaterThan(0);
    expect(wipers.length).toBeGreaterThanOrEqual(2);
  });

  it("puts a tiny kraft cream PAPER cap on the taxi roof aerial", () => {
    const mesh = makeTaxiMesh();
    const caps: THREE.Mesh[] = [];
    const aerials: THREE.Mesh[] = [];
    const wipers: THREE.Mesh[] = [];
    const spares: THREE.Mesh[] = [];
    const mirrors: THREE.Mesh[] = [];
    const plates: THREE.Mesh[] = [];
    const hubs: THREE.Mesh[] = [];
    const handles: THREE.Mesh[] = [];
    mesh.traverse((obj) => {
      const m = obj as THREE.Mesh & { userData: { part?: string; mode?: string } };
      if (m.userData?.part === "aerial-cap" || m.userData?.part === "cap") caps.push(m);
      if (m.userData?.part === "aerial") aerials.push(m);
      if (m.userData?.part === "wiper") wipers.push(m);
      if (m.userData?.part === "spare") spares.push(m);
      if (m.userData?.part === "mirror") mirrors.push(m);
      if (m.userData?.part === "plate") plates.push(m);
      if (m.userData?.part === "hub") hubs.push(m);
      if (m.userData?.part === "handle") handles.push(m);
    });
    expect(caps.length).toBeGreaterThanOrEqual(1);
    expect(caps.every((c) => c.geometry.type === "BoxGeometry")).toBe(true);
    expect(caps.every((c) => c.userData.mode === "PAPER")).toBe(true);
    expect(
      caps.every((c) => (c.material as THREE.MeshLambertMaterial).color.getHex() === 0xf4ead8),
    ).toBe(true);
    expect(aerials.length).toBeGreaterThanOrEqual(1);
    const aerial = aerials[0];
    const aerialTop = aerial.position.y + ((aerial.geometry as THREE.BoxGeometry).parameters.height ?? 0) / 2;
    for (const cap of caps) {
      const geo = cap.geometry as THREE.BoxGeometry;
      expect(geo.parameters.width).toBeLessThan(0.16);
      expect(geo.parameters.height).toBeLessThan(0.16);
      expect(geo.parameters.depth).toBeLessThan(0.16);
      expect(cap.position.y).toBeGreaterThan(aerialTop - 0.02);
      expect(Math.abs(cap.position.x - aerial.position.x)).toBeLessThan(0.08);
      expect(Math.abs(cap.position.z - aerial.position.z)).toBeLessThan(0.08);
    }
    expect(wipers.length).toBeGreaterThanOrEqual(2);
    expect(spares.length).toBeGreaterThanOrEqual(1);
    expect(mirrors.length).toBeGreaterThanOrEqual(2);
    expect(plates.length).toBeGreaterThanOrEqual(1);
    expect(hubs.length).toBe(4);
    expect(handles.length).toBeGreaterThanOrEqual(2);
  });

  it("puts a kraft cream PAPER door number plate on each taxi door", () => {
    const mesh = makeTaxiMesh();
    const doorPlates: THREE.Mesh[] = [];
    const checks: THREE.Mesh[] = [];
    const caps: THREE.Mesh[] = [];
    const wipers: THREE.Mesh[] = [];
    const spares: THREE.Mesh[] = [];
    const mirrors: THREE.Mesh[] = [];
    const aerials: THREE.Mesh[] = [];
    mesh.traverse((obj) => {
      const m = obj as THREE.Mesh & { userData: { part?: string; mode?: string } };
      if (m.userData?.part === "door-plate") doorPlates.push(m);
      if (m.userData?.part === "check") checks.push(m);
      if (m.userData?.part === "aerial-cap" || m.userData?.part === "cap") caps.push(m);
      if (m.userData?.part === "wiper") wipers.push(m);
      if (m.userData?.part === "spare") spares.push(m);
      if (m.userData?.part === "mirror") mirrors.push(m);
      if (m.userData?.part === "aerial") aerials.push(m);
    });
    expect(checks.length).toBeGreaterThan(0);
    expect(doorPlates.length).toBeGreaterThanOrEqual(2);
    expect(doorPlates.every((p) => p.geometry.type === "BoxGeometry")).toBe(true);
    expect(doorPlates.every((p) => p.userData.mode === "PAPER")).toBe(true);
    expect(
      doorPlates.every((p) => (p.material as THREE.MeshLambertMaterial).color.getHex() === 0xf4ead8),
    ).toBe(true);
    expect(doorPlates.every((p) => Math.abs(p.position.x) > 1.22)).toBe(true);
    expect(doorPlates.every((p) => p.position.y > 0.6 && p.position.y < 1.2)).toBe(true);
    expect(caps.length).toBeGreaterThanOrEqual(1);
    expect(wipers.length).toBeGreaterThanOrEqual(2);
    expect(spares.length).toBeGreaterThanOrEqual(1);
    expect(mirrors.length).toBeGreaterThanOrEqual(2);
    expect(aerials.length).toBeGreaterThanOrEqual(1);
  });

  it("puts two thin kraft cream PAPER wipers on the taxi windscreen", () => {
    const mesh = makeTaxiMesh();
    const wipers: THREE.Mesh[] = [];
    const mirrors: THREE.Mesh[] = [];
    const aerials: THREE.Mesh[] = [];
    const spares: THREE.Mesh[] = [];
    mesh.traverse((obj) => {
      const m = obj as THREE.Mesh & { userData: { part?: string; mode?: string } };
      if (m.userData?.part === "wiper") wipers.push(m);
      if (m.userData?.part === "mirror") mirrors.push(m);
      if (m.userData?.part === "aerial") aerials.push(m);
      if (m.userData?.part === "spare") spares.push(m);
    });
    expect(wipers.length).toBeGreaterThanOrEqual(2);
    expect(wipers.every((w) => w.geometry.type === "BoxGeometry")).toBe(true);
    expect(wipers.every((w) => w.userData.mode === "PAPER")).toBe(true);
    expect(
      wipers.every((w) => (w.material as THREE.MeshLambertMaterial).color.getHex() === 0xf4ead8),
    ).toBe(true);
    for (const wiper of wipers) {
      const geo = wiper.geometry as THREE.BoxGeometry;
      expect(geo.parameters.height).toBeLessThan(0.12);
      expect(geo.parameters.depth).toBeLessThan(0.12);
      expect(wiper.position.z).toBeGreaterThan(0.8);
      expect(wiper.position.y).toBeGreaterThan(1.1);
      expect(wiper.position.y).toBeLessThan(1.7);
    }
    expect(mirrors.length).toBeGreaterThanOrEqual(2);
    expect(aerials.length).toBeGreaterThanOrEqual(1);
    expect(spares.length).toBeGreaterThanOrEqual(1);
  });

  it("puts tiny kraft PAPER mudflaps behind the taxi rear wheels", () => {
    const mesh = makeTaxiMesh();
    const flaps: THREE.Mesh[] = [];
    const doorPlates: THREE.Mesh[] = [];
    const caps: THREE.Mesh[] = [];
    const wipers: THREE.Mesh[] = [];
    const kraftFlap = new Set([0xf4ead8, 0xc4a574]);
    mesh.traverse((obj) => {
      const m = obj as THREE.Mesh & { userData: { part?: string; mode?: string } };
      if (m.userData?.part === "mudflap") flaps.push(m);
      if (m.userData?.part === "door-plate") doorPlates.push(m);
      if (m.userData?.part === "aerial-cap" || m.userData?.part === "cap") caps.push(m);
      if (m.userData?.part === "wiper") wipers.push(m);
    });
    expect(flaps.length).toBeGreaterThanOrEqual(2);
    expect(flaps.every((f) => f.geometry.type === "BoxGeometry")).toBe(true);
    expect(flaps.every((f) => f.userData.mode === "PAPER")).toBe(true);
    expect(
      flaps.every((f) => kraftFlap.has((f.material as THREE.MeshLambertMaterial).color.getHex())),
    ).toBe(true);
    for (const flap of flaps) {
      const geo = flap.geometry as THREE.BoxGeometry;
      expect(geo.parameters.width).toBeLessThan(0.5);
      expect(geo.parameters.height).toBeLessThan(0.5);
      expect(geo.parameters.depth).toBeLessThan(0.12);
      expect(flap.position.z).toBeLessThan(-1.55);
      expect(flap.position.y).toBeGreaterThan(0.1);
      expect(flap.position.y).toBeLessThan(0.8);
      expect(Math.abs(flap.position.x)).toBeGreaterThan(1.0);
    }
    expect(doorPlates.length).toBeGreaterThanOrEqual(2);
    expect(caps.length).toBeGreaterThanOrEqual(1);
    expect(wipers.length).toBeGreaterThanOrEqual(2);
  });

  it("puts a tiny kraft PAPER fare card on the taxi dash", () => {
    const mesh = makeTaxiMesh();
    const fares: THREE.Mesh[] = [];
    const plates: THREE.Mesh[] = [];
    const caps: THREE.Mesh[] = [];
    const kraftFare = new Set([0xc4a574, 0xf4ead8]);
    mesh.traverse((obj) => {
      const m = obj as THREE.Mesh & { userData: { part?: string; mode?: string } };
      if (m.userData?.part === "fare") fares.push(m);
      if (m.userData?.part === "plate") plates.push(m);
      if (m.userData?.part === "aerial-cap" || m.userData?.part === "cap") caps.push(m);
    });
    expect(fares.length).toBeGreaterThanOrEqual(1);
    expect(fares.every((f) => f.geometry.type === "BoxGeometry")).toBe(true);
    expect(fares.every((f) => f.userData.mode === "PAPER")).toBe(true);
    expect(
      fares.every((f) => kraftFare.has((f.material as THREE.MeshLambertMaterial).color.getHex())),
    ).toBe(true);
    expect(plates.length).toBeGreaterThanOrEqual(1);
    expect(caps.length).toBeGreaterThanOrEqual(1);
  });

  it("parks the cab on paved at spawn so the roof lamp is in the first frame", () => {
    const board = createLandBoard();
    const spec = ISLANDS.north;
    const player = {
      position: { x: spec.port.x, y: 2, z: spec.port.z - 8 },
      rotation: { y: 0 },
    };
    const taxi = createTaxi({
      scene: { add() {} },
      player,
      getMap: () => board,
      specOf: (id: "north" | "south") => ISLANDS[id],
      heightAt,
      getIslandId: () => "north" as const,
      setWalking: () => {},
      setStatus: () => {},
      button: { addEventListener() {} },
    });
    expect(taxi.mesh.visible).toBe(true);
    const paved = board.roads.find((r) => r.kind === "paved" && r.island === "north")!;
    expect(projectOnPolyline(paved.points, taxi.mesh.position.x, taxi.mesh.position.z).dist).toBeLessThan(
      0.6,
    );
    expect(Math.hypot(taxi.mesh.position.x - spec.port.x, taxi.mesh.position.z - spec.port.z)).toBeLessThan(
      80,
    );
  });
});
