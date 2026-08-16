import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { createLandBoard, heightAt, ISLANDS } from "./land.ts";
import {
  awningStyleFor,
  createStalls,
  FOOD_GOODS,
  makeStallMesh,
  stallGoodFor,
  STALL_KIND,
} from "../public/harbour/stalls.js";

const CLOTH = new Set([0xc45c3a, 0xf4ead8, 0x2a7a72]);

function isGrey(hex: number) {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  return Math.max(r, g, b) - Math.min(r, g, b) < 18;
}

function hexes(root: THREE.Object3D) {
  const colors: number[] = [];
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    const mat = mesh.material as THREE.MeshLambertMaterial | THREE.MeshLambertMaterial[] | undefined;
    if (!mat) return;
    const list = Array.isArray(mat) ? mat : [mat];
    for (const m of list) if (m.color) colors.push(m.color.getHex());
  });
  return colors;
}

function parts(root: THREE.Object3D) {
  const out: string[] = [];
  root.traverse((obj) => {
    if (obj.userData?.part) out.push(obj.userData.part);
  });
  return out;
}

function stripeHexes(root: THREE.Object3D) {
  const colors: number[] = [];
  root.traverse((obj) => {
    if (!obj.userData?.stripe) return;
    const mesh = obj as THREE.Mesh;
    const mat = mesh.material as THREE.MeshLambertMaterial | undefined;
    if (mat?.color) colors.push(mat.color.getHex());
  });
  return colors;
}

function meshCount(root: THREE.Object3D) {
  let n = 0;
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) n += 1;
  });
  return n;
}

function aimAt(x: number, y: number, z: number) {
  const cam = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  cam.position.set(x, y + 10, z + 0.2);
  cam.lookAt(x, y + 1.2, z);
  cam.updateMatrixWorld(true);
  const rc = new THREE.Raycaster();
  rc.setFromCamera(new THREE.Vector2(0, 0), cam);
  return rc;
}

function missRay() {
  const cam = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  cam.position.set(0, 40, 0);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld(true);
  const rc = new THREE.Raycaster();
  rc.setFromCamera(new THREE.Vector2(0, 0), cam);
  return rc;
}

function boot(map = createLandBoard()) {
  const added: THREE.Object3D[] = [];
  const scene = {
    add(obj: THREE.Object3D) {
      added.push(obj);
    },
  };
  const statuses: string[] = [];
  const snaps: unknown[] = [];
  const stalls = createStalls({
    scene,
    getMap: () => map,
    specOf: (id: "north" | "south") => ISLANDS[id],
    heightAt,
    setStatus: (t: string) => statuses.push(t),
    applySnapshot: (s: unknown) => {
      snaps.push(s);
    },
    getPlayer: () => ({ position: { x: 0, y: 1, z: -6950 } }),
  });
  return { map, added, scene, statuses, snaps, stalls };
}

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("NPC harbour stalls", () => {
  it("builds a PAPER stand with awning, counter, crates — not a grey cube", () => {
    const mesh = makeStallMesh({ id: "n-test", use: "farm", island: "north", band: "field" });
    expect(mesh.userData.kind).toBe(STALL_KIND);
    expect(mesh.userData.mode).toBe("PAPER");
    expect(mesh.userData.paper).toBe(true);
    expect(mesh.userData.good).toBe("corn");
    expect(meshCount(mesh)).toBeGreaterThan(10);
    const kinds = parts(mesh);
    expect(kinds).toContain("awning");
    expect(kinds).toContain("counter");
    expect(kinds).toContain("crate");
    expect(kinds).toContain("produce");
    const colors = hexes(mesh);
    expect(colors.length).toBeGreaterThan(4);
    expect(colors.every(isGrey)).toBe(false);
    expect(colors).toContain(0x8a6238);
    const stripes = stripeHexes(mesh);
    expect(stripes.length).toBeGreaterThan(6);
    expect(stripes.every((c) => CLOTH.has(c))).toBe(true);
  });

  it("varies kraft / terracotta / teal canvas stripes across stalls", () => {
    const a = makeStallMesh({ id: "north-street-0", use: "stall", island: "north" });
    const b = makeStallMesh({ id: "south-street-3", use: "stall", island: "south" });
    const c = makeStallMesh({ id: "n-field-1", use: "farm", island: "north", band: "field" });
    const seqA = stripeHexes(a);
    const seqB = stripeHexes(b);
    const seqC = stripeHexes(c);
    expect(seqA).not.toEqual(seqB);
    expect(awningStyleFor({ id: "north-street-0" })).not.toEqual(awningStyleFor({ id: "south-street-3" }));
    const seen = new Set([...seqA, ...seqB, ...seqC]);
    expect(seen.has(0xc45c3a)).toBe(true);
    expect(seen.has(0xf4ead8)).toBe(true);
    expect(seen.has(0x2a7a72)).toBe(true);
    expect([...seen].every((hex) => CLOTH.has(hex))).toBe(true);
  });

  it("farms sell corn; other NPC stalls sell a food good", () => {
    expect(stallGoodFor({ use: "farm", band: "field", id: "a" })).toBe("corn");
    expect(FOOD_GOODS).toContain(stallGoodFor({ use: "stall", band: "street", id: "north-street-0" }));
    expect(stallGoodFor(undefined)).toBe("corn");
    expect(FOOD_GOODS).toContain("corn");
  });

  it("places one PAPER stall on each NPC plot and none on vacant lots", () => {
    const { map, added, stalls } = boot();
    const npc = map.plots.filter((p) => p.owner === "npc");
    expect(npc.length).toBeGreaterThan(0);
    expect(added).toEqual([stalls.group]);
    expect(stalls.group.children.length).toBe(npc.length);
    expect(stalls.group.userData.mode).toBe("PAPER");

    const ids = stalls.group.children.map((c) => c.userData.plotId).sort();
    expect(ids).toEqual(npc.map((p) => p.id).sort());
    for (const child of stalls.group.children) {
      expect(child.userData.kind).toBe(STALL_KIND);
      expect(child.userData.mode).toBe("PAPER");
      expect(FOOD_GOODS).toContain(child.userData.good);
      expect(child.position.y).toBeGreaterThan(0.3);
      const plot = npc.find((p) => p.id === child.userData.plotId)!;
      expect(Math.hypot(child.position.x - plot.x, child.position.z - plot.z)).toBeLessThan(8);
    }

    const vacant = map.plots.filter((p) => !p.owner);
    expect(vacant.length).toBeGreaterThan(0);
    const stallIds = new Set(ids);
    expect(vacant.some((p) => stallIds.has(p.id))).toBe(false);
  });

  it("handleRay returns false when the ray misses, true when it hits a stall", () => {
    const { stalls } = boot();
    expect(stalls.handleRay(missRay())).toBe(false);
    expect(stalls.handleRay(undefined)).toBe(false);

    const stall = stalls.group.children[0]!;
    stall.updateMatrixWorld(true);
    expect(stalls.handleRay(aimAt(stall.position.x, stall.position.y, stall.position.z))).toBe(true);
  });

  it("posts /api/buy for 1 of the stall's good at lastPrice, same body as /market/", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init || {} });
      return {
        json: async () => ({
          ok: true,
          paid: 0.25,
          snapshot: { visitor: { cash: 999.75, stock: { corn: 1 } } },
        }),
      };
    }) as typeof fetch;

    const { map, stalls, statuses, snaps } = boot();
    const land = map as typeof map & { visitor: { cash: number; leases: string[] } };
    land.visitor = { cash: 1000, leases: [] };
    const farm = stalls.group.children.find((c) => c.userData.use === "farm") || stalls.group.children[0]!;
    farm.updateMatrixWorld(true);
    expect(stalls.handleRay(aimAt(farm.position.x, farm.position.y, farm.position.z))).toBe(true);

    await vi.waitFor(() => expect(calls.length).toBe(1));
    expect(calls[0]!.url).toBe("/api/buy");
    expect(calls[0]!.init.method).toBe("POST");
    expect(calls[0]!.init.headers).toEqual({ "content-type": "application/json" });
    const body = JSON.parse(String(calls[0]!.init.body));
    expect(body.qty).toBe(1);
    expect(body.good).toBe(farm.userData.good);
    expect(FOOD_GOODS).toContain(body.good);
    expect(calls.some((c) => c.url.includes("lease") || c.url.includes("develop") || c.url.includes("wallet"))).toBe(
      false,
    );
    await vi.waitFor(() => expect(statuses.some((s) => s.includes("Bought 1"))).toBe(true));
    expect(statuses[statuses.length - 1]).toContain("PAPER");
    expect(land.visitor.cash).toBe(999.75);
    expect(snaps.length).toBeGreaterThan(0);
  });

  it("on a failed fill, still returns true and reports the reason — no lease/develop", async () => {
    const calls: { url: string }[] = [];
    globalThis.fetch = (async (url: string | URL | Request) => {
      calls.push({ url: String(url) });
      return {
        json: async () => ({
          ok: false,
          reason: "no_cash",
          snapshot: { visitor: { cash: 0 } },
        }),
      };
    }) as typeof fetch;

    const { stalls, statuses } = boot();
    const stall = stalls.group.children[0]!;
    stall.updateMatrixWorld(true);
    expect(stalls.handleRay(aimAt(stall.position.x, stall.position.y, stall.position.z))).toBe(true);
    await vi.waitFor(() => expect(calls.length).toBe(1));
    expect(calls[0]!.url).toBe("/api/buy");
    await vi.waitFor(() => expect(statuses.join(" ")).toContain("no_cash"));
  });
});
