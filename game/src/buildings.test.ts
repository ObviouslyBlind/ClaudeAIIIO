import { describe, expect, it } from "vitest";
import {
  BUILDING_CATALOG,
  DEVELOP_COST,
  isLandUse,
  paperCostFor,
  parseLandUse,
} from "./buildings.ts";
import { BUILDING_IDS, FALLBACK_CATALOG, meshForUse } from "../public/harbour/buildings.js";
import { createLandBoard, developPlot, landSnapshot, leasePlot } from "./land.ts";
import { createVisitor } from "./sim.ts";

function lum(hex: number) {
  const r = ((hex >> 16) & 255) / 255;
  const g = ((hex >> 8) & 255) / 255;
  const b = (hex & 255) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function isGrey(hex: number) {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  return Math.max(r, g, b) - Math.min(r, g, b) < 18;
}

function collectColors(root: { traverse: (fn: (o: unknown) => void) => void }) {
  const colors: number[] = [];
  root.traverse((obj: unknown) => {
    const mesh = obj as {
      material?: { color?: { getHex: () => number } } | { color?: { getHex: () => number } }[];
    };
    const mat = mesh.material;
    if (!mat) return;
    if (Array.isArray(mat)) {
      for (const m of mat) {
        if (m.color) colors.push(m.color.getHex());
      }
    } else if (mat.color) {
      colors.push(mat.color.getHex());
    }
  });
  return colors;
}

function countPitched(root: { traverse: (fn: (o: unknown) => void) => void }) {
  let n = 0;
  root.traverse((obj: unknown) => {
    const m = obj as { userData?: { roof?: boolean }; rotation?: { x: number } };
    if (m.userData?.roof) n += 1;
    else if (m.rotation && Math.abs(m.rotation.x) > 0.2) n += 1;
  });
  return n;
}

describe("paper building catalogue", () => {
  it("has at least six types with ids and paper costs", () => {
    expect(BUILDING_CATALOG.length).toBeGreaterThanOrEqual(6);
    const ids = BUILDING_CATALOG.map((b) => b.id);
    for (const need of ["house", "shop", "house_shop", "farm", "warehouse", "factory"]) {
      expect(ids).toContain(need);
    }
    for (const spec of BUILDING_CATALOG) {
      expect(spec.id).toMatch(/^[a-z_]+$/);
      expect(spec.label.length).toBeGreaterThan(2);
      expect(spec.paperCost).toBeGreaterThan(0);
      expect(Number.isFinite(spec.paperCost)).toBe(true);
      expect(spec.provenance).toBe("PAPER");
    }
    expect(DEVELOP_COST).toBe(Math.min(...BUILDING_CATALOG.map((b) => b.paperCost)));
    expect(parseLandUse("factory")).toBe("factory");
    expect(parseLandUse("stall")).toBe("stall");
    expect(parseLandUse("castle")).toBeNull();
    expect(paperCostFor("farm")).toBe(catalogCost("farm"));
    expect(paperCostFor("stall")).toBe(catalogCost("shop"));
  });

  it("keeps the harbour mesh catalogue on the same ids and paper costs", () => {
    expect(BUILDING_IDS.length).toBeGreaterThanOrEqual(6);
    expect([...BUILDING_IDS].sort()).toEqual([...BUILDING_CATALOG.map((b) => b.id)].sort());
    expect(FALLBACK_CATALOG.map((b) => b.id).sort()).toEqual(
      BUILDING_CATALOG.map((b) => b.id).sort(),
    );
    for (const spec of FALLBACK_CATALOG) {
      const server = BUILDING_CATALOG.find((b) => b.id === spec.id)!;
      expect(spec.paperCost).toBe(server.paperCost);
    }
  });

  it("puts the catalogue on the land snapshot the harbour fetches", () => {
    const snap = landSnapshot(createLandBoard(), createVisitor(1_000));
    expect(snap.catalog.length).toBeGreaterThanOrEqual(6);
    expect(snap.visitor.cash).toBe(1_000);
    expect(snap.catalog.map((b) => b.id).sort()).toEqual(
      BUILDING_CATALOG.map((b) => b.id).sort(),
    );
  });

  it("still leases then develops, and accepts catalogue ids at paper cost", () => {
    const board = createLandBoard();
    const visitor = createVisitor(1_000);
    const vacant = board.plots
      .filter((p) => !p.owner && p.class === "by_right" && p.price <= 200)
      .sort((a, b) => a.price - b.price)[0]!;
    const leased = leasePlot(board, visitor, vacant.id);
    expect(leased.ok).toBe(true);
    const before = visitor.cash;
    const built = developPlot(board, visitor, vacant.id, "house");
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(vacant.use).toBe("house");
    expect(built.paid).toBe(catalogCost("house"));
    expect(visitor.cash).toBeCloseTo(before - catalogCost("house"), 4);
    expect(developPlot(board, visitor, vacant.id, "shop").ok).toBe(false);
  });

  it("seeds an NPC town whose every use is a placeable mesh", () => {
    const board = createLandBoard();
    const npc = board.plots.filter((p) => p.owner === "npc" && p.use);
    expect(npc.length).toBeGreaterThan(0);
    expect(npc.every((p) => isLandUse(p.use))).toBe(true);
    // The evergreen world starts as a town, not two lonely farms.
    const towny = new Set(npc.map((p) => p.use));
    expect(towny.has("house")).toBe(true);
    expect(towny.has("shop")).toBe(true);
    expect(towny.has("farm")).toBe(true);
    for (const p of npc) {
      const mesh = meshForUse(p.use, { area: p.area });
      expect(mesh.children.length).toBeGreaterThan(3);
    }
  });

  it("builds pitched-roof PAPER shells, not grey cubes", () => {
    for (const spec of BUILDING_CATALOG) {
      const mesh = meshForUse(spec.id, { area: 400 });
      expect(mesh.children.length).toBeGreaterThan(3);
      expect(countPitched(mesh)).toBeGreaterThan(0);
      const colors = collectColors(mesh);
      expect(colors.length).toBeGreaterThan(2);
      expect(colors.every(isGrey)).toBe(false);
      expect(colors.some((c) => !isGrey(c) && lum(c) > 0.12)).toBe(true);
    }
  });

  it("puts a brick/kraft chimney on the House so plots read as buildings", () => {
    const house = meshForUse("house", { area: 400 });
    const chimneyHexes: number[] = [];
    const parts: string[] = [];
    house.traverse((obj: unknown) => {
      const mesh = obj as {
        userData?: { part?: string };
        material?: { color?: { getHex: () => number } };
      };
      const part = mesh.userData?.part;
      if (part !== "chimney" && part !== "stack") return;
      parts.push(part);
      if (mesh.material?.color) chimneyHexes.push(mesh.material.color.getHex());
    });
    expect(parts).toContain("chimney");
    expect(parts).toContain("stack");
    expect(chimneyHexes).toContain(0x8a6a55);
    expect(chimneyHexes).toContain(0xf4ead8);
    expect(chimneyHexes.every((c) => c === 0x8a6a55 || c === 0xf4ead8)).toBe(true);
  });

  it("puts a tiny kraft PAPER stoop at the House door", () => {
    const house = meshForUse("house", { area: 400 });
    const stoops: Array<{
      userData?: { part?: string; mode?: string };
      material?: { color?: { getHex: () => number } };
      geometry?: { type?: string; parameters?: { width: number; height: number; depth: number } };
    }> = [];
    const parts = new Set<string>();
    house.traverse((obj: unknown) => {
      const mesh = obj as {
        userData?: { part?: string; mode?: string };
        material?: { color?: { getHex: () => number } };
        geometry?: { type?: string; parameters?: { width: number; height: number; depth: number } };
      };
      const part = mesh.userData?.part;
      if (part) parts.add(part);
      if (part === "stoop" || part === "mat") stoops.push(mesh);
    });
    expect(stoops.length).toBeGreaterThanOrEqual(1);
    expect(parts.has("chimney")).toBe(true);
    expect(parts.has("shutter")).toBe(true);
    expect(parts.has("knocker")).toBe(true);
    for (const mesh of stoops) {
      expect(mesh.userData?.mode).toBe("PAPER");
      expect(mesh.geometry?.type).toBe("BoxGeometry");
      if (mesh.material?.color) expect(mesh.material.color.getHex()).toBe(0xf4ead8);
      const box = mesh.geometry?.parameters;
      if (box) {
        expect(box.width).toBeLessThan(1.2);
        expect(box.height).toBeLessThan(0.16);
        expect(box.depth).toBeLessThan(0.5);
      }
    }

    const shop = meshForUse("shop", { area: 400 });
    let shopStoops = 0;
    shop.traverse((obj: unknown) => {
      const mesh = obj as { userData?: { part?: string } };
      if (mesh.userData?.part === "stoop" || mesh.userData?.part === "mat") shopStoops += 1;
    });
    expect(shopStoops).toBe(0);
  });

  it("puts a small kraft PAPER doormat at the House door", () => {
    const house = meshForUse("house", { area: 400 });
    const mats: Array<{
      userData?: { part?: string; mode?: string };
      material?: { color?: { getHex: () => number } };
      geometry?: { type?: string };
    }> = [];
    const parts = new Set<string>();
    const hexes: number[] = [];
    house.traverse((obj: unknown) => {
      const mesh = obj as {
        userData?: { part?: string; mode?: string };
        material?: { color?: { getHex: () => number } };
        geometry?: { type?: string };
      };
      const part = mesh.userData?.part;
      if (part) parts.add(part);
      if (part !== "doormat") return;
      mats.push(mesh);
      if (mesh.material?.color) hexes.push(mesh.material.color.getHex());
    });
    expect(mats.length).toBeGreaterThanOrEqual(1);
    expect(parts.has("chimney")).toBe(true);
    expect(parts.has("knocker")).toBe(true);
    for (const mesh of mats) {
      expect(mesh.userData?.mode).toBe("PAPER");
      expect(mesh.geometry?.type).toBe("BoxGeometry");
    }
    expect(hexes.length).toBeGreaterThan(0);
    expect(hexes.every((c) => c === 0xf4ead8)).toBe(true);
    expect(hexes.every((c) => !isGrey(c))).toBe(true);

    const shop = meshForUse("shop", { area: 400 });
    let shopMats = 0;
    shop.traverse((obj: unknown) => {
      const mesh = obj as { userData?: { part?: string } };
      if (mesh.userData?.part === "doormat") shopMats += 1;
    });
    expect(shopMats).toBe(0);
  });

  it("puts one tiny kraft PAPER mailbox on the House, doormat and knocker remain", () => {
    const house = meshForUse("house", { area: 400 });
    const boxes: Array<{
      userData?: { part?: string; mode?: string };
      material?: { color?: { getHex: () => number } };
      geometry?: { type?: string };
    }> = [];
    const parts = new Set<string>();
    const hexes: number[] = [];
    house.traverse((obj: unknown) => {
      const mesh = obj as {
        userData?: { part?: string; mode?: string };
        material?: { color?: { getHex: () => number } };
        geometry?: { type?: string };
      };
      const part = mesh.userData?.part;
      if (part) parts.add(part);
      if (part !== "mailbox") return;
      boxes.push(mesh);
      if (mesh.material?.color) hexes.push(mesh.material.color.getHex());
    });
    expect(boxes.length).toBeGreaterThanOrEqual(1);
    expect(parts.has("doormat")).toBe(true);
    expect(parts.has("knocker")).toBe(true);
    for (const mesh of boxes) {
      expect(mesh.userData?.mode).toBe("PAPER");
      if (mesh.geometry) expect(mesh.geometry.type).toBe("BoxGeometry");
    }
    expect(hexes.length).toBeGreaterThan(0);
    expect(hexes.every((c) => c === 0x5a3a22 || c === 0xf4ead8)).toBe(true);
    expect(hexes.every((c) => !isGrey(c))).toBe(true);

    for (const id of ["shop", "farm"] as const) {
      const mesh = meshForUse(id, { area: 400 });
      let n = 0;
      mesh.traverse((obj: unknown) => {
        const m = obj as { userData?: { part?: string } };
        if (m.userData?.part === "mailbox") n += 1;
      });
      expect(n).toBe(0);
    }
  });

  it("puts a kraft PAPER porch slab on the House so plots read as entered from the street", () => {
    const house = meshForUse("house", { area: 400 });
    const parts: string[] = [];
    const hexes: number[] = [];
    const zs: number[] = [];
    house.traverse((obj: unknown) => {
      const mesh = obj as {
        userData?: { part?: string; mode?: string };
        material?: { color?: { getHex: () => number } };
        position?: { z: number };
      };
      const part = mesh.userData?.part;
      if (part !== "porch" && part !== "doorstep") return;
      parts.push(part);
      expect(mesh.userData?.mode).toBe("PAPER");
      if (mesh.material?.color) hexes.push(mesh.material.color.getHex());
      if (mesh.position) zs.push(mesh.position.z);
    });
    expect(parts).toContain("porch");
    expect(parts).toContain("doorstep");
    expect(hexes.length).toBeGreaterThan(0);
    expect(hexes.every((c) => c === 0xf4ead8)).toBe(true);
    expect(zs.every((z) => z > 2.6)).toBe(true);
  });

  it("puts one tiny kraft PAPER hinge on the House door", () => {
    const house = meshForUse("house", { area: 400 });
    const hinges: Array<{
      userData?: { part?: string; mode?: string };
      material?: { color?: { getHex: () => number } };
      geometry?: { type?: string; parameters?: { width: number; height: number; depth: number } };
    }> = [];
    const parts = new Set<string>();
    const hexes: number[] = [];
    house.traverse((obj: unknown) => {
      const mesh = obj as {
        userData?: { part?: string; mode?: string };
        material?: { color?: { getHex: () => number } };
        geometry?: { type?: string; parameters?: { width: number; height: number; depth: number } };
      };
      const part = mesh.userData?.part;
      if (part) parts.add(part);
      if (part !== "hinge") return;
      hinges.push(mesh);
      if (mesh.material?.color) hexes.push(mesh.material.color.getHex());
    });
    expect(hinges.length).toBeGreaterThanOrEqual(1);
    expect(parts.has("chimney")).toBe(true);
    expect(parts.has("mailbox")).toBe(true);
    expect(parts.has("shutter")).toBe(true);
    expect(parts.has("knocker")).toBe(true);
    expect(parts.has("stoop")).toBe(true);
    expect(parts.has("doormat")).toBe(true);
    for (const mesh of hinges) {
      expect(mesh.userData?.mode).toBe("PAPER");
      expect(mesh.geometry?.type).toBe("BoxGeometry");
      const box = mesh.geometry?.parameters;
      if (box) {
        expect(box.width).toBeLessThan(0.2);
        expect(box.height).toBeLessThan(0.28);
        expect(box.depth).toBeLessThan(0.12);
      }
    }
    expect(hexes.length).toBeGreaterThan(0);
    expect(hexes.every((c) => c === 0xf4ead8)).toBe(true);
    expect(hexes.every((c) => !isGrey(c))).toBe(true);

    const shop = meshForUse("shop", { area: 400 });
    const shopParts = new Set<string>();
    shop.traverse((obj: unknown) => {
      const mesh = obj as { userData?: { part?: string } };
      const part = mesh.userData?.part;
      if (part) shopParts.add(part);
    });
    expect(shopParts.has("hinge")).toBe(false);
    expect(shopParts.has("latch")).toBe(true);
    expect(shopParts.has("sign")).toBe(true);
  });

  it("puts one tiny kraft PAPER lintel above the House door", () => {
    const house = meshForUse("house", { area: 400 });
    const lintels: Array<{
      userData?: { part?: string; mode?: string };
      material?: { color?: { getHex: () => number } };
      geometry?: { type?: string; parameters?: { width: number; height: number; depth: number } };
    }> = [];
    const parts = new Set<string>();
    const hexes: number[] = [];
    house.traverse((obj: unknown) => {
      const mesh = obj as {
        userData?: { part?: string; mode?: string };
        material?: { color?: { getHex: () => number } };
        geometry?: { type?: string; parameters?: { width: number; height: number; depth: number } };
      };
      const part = mesh.userData?.part;
      if (part) parts.add(part);
      if (part !== "lintel") return;
      lintels.push(mesh);
      if (mesh.material?.color) hexes.push(mesh.material.color.getHex());
    });
    expect(lintels.length).toBeGreaterThanOrEqual(1);
    expect(parts.has("chimney")).toBe(true);
    expect(parts.has("mailbox")).toBe(true);
    expect(parts.has("shutter")).toBe(true);
    expect(parts.has("knocker")).toBe(true);
    expect(parts.has("stoop")).toBe(true);
    expect(parts.has("doormat")).toBe(true);
    expect(parts.has("hinge")).toBe(true);
    expect(parts.has("rail")).toBe(true);
    for (const mesh of lintels) {
      expect(mesh.userData?.mode).toBe("PAPER");
      expect(mesh.geometry?.type).toBe("BoxGeometry");
      const box = mesh.geometry?.parameters;
      if (box) {
        expect(box.width).toBeLessThan(1.2);
        expect(box.height).toBeLessThan(0.16);
        expect(box.depth).toBeLessThan(0.16);
      }
    }
    expect(hexes.length).toBeGreaterThan(0);
    expect(hexes.every((c) => c === 0xf4ead8)).toBe(true);
    expect(hexes.every((c) => !isGrey(c))).toBe(true);

    const shop = meshForUse("shop", { area: 400 });
    const shopParts = new Set<string>();
    shop.traverse((obj: unknown) => {
      const mesh = obj as { userData?: { part?: string } };
      const part = mesh.userData?.part;
      if (part) shopParts.add(part);
    });
    expect(shopParts.has("lintel")).toBe(false);
    expect(shopParts.has("latch")).toBe(true);
    expect(shopParts.has("sign")).toBe(true);
  });

  it("puts one tiny kraft PAPER knob on the House door", () => {
    const house = meshForUse("house", { area: 400 });
    const knobs: Array<{
      userData?: { part?: string; mode?: string };
      material?: { color?: { getHex: () => number } };
      geometry?: { type?: string; parameters?: { width: number; height: number; depth: number } };
    }> = [];
    const parts = new Set<string>();
    const hexes: number[] = [];
    house.traverse((obj: unknown) => {
      const mesh = obj as {
        userData?: { part?: string; mode?: string };
        material?: { color?: { getHex: () => number } };
        geometry?: { type?: string; parameters?: { width: number; height: number; depth: number } };
      };
      const part = mesh.userData?.part;
      if (part) parts.add(part);
      if (part !== "knob") return;
      knobs.push(mesh);
      if (mesh.material?.color) hexes.push(mesh.material.color.getHex());
    });
    expect(knobs.length).toBeGreaterThanOrEqual(1);
    expect(parts.has("knocker")).toBe(true);
    expect(parts.has("hinge")).toBe(true);
    expect(parts.has("lintel")).toBe(true);
    for (const mesh of knobs) {
      expect(mesh.userData?.mode).toBe("PAPER");
      expect(mesh.geometry?.type).toBe("BoxGeometry");
    }
    expect(hexes.length).toBeGreaterThan(0);
    expect(hexes.every((c) => c === 0x5a3a22 || c === 0xf4ead8)).toBe(true);
    expect(hexes.every((c) => !isGrey(c))).toBe(true);

    const shop = meshForUse("shop", { area: 400 });
    const shopParts = new Set<string>();
    shop.traverse((obj: unknown) => {
      const mesh = obj as { userData?: { part?: string } };
      const part = mesh.userData?.part;
      if (part) shopParts.add(part);
    });
    expect(shopParts.has("knob")).toBe(false);
    expect(shopParts.has("latch")).toBe(true);
  });

  it("puts one tiny kraft PAPER sill under the House door", () => {
    const house = meshForUse("house", { area: 400 });
    const sills: Array<{
      userData?: { part?: string; mode?: string };
      material?: { color?: { getHex: () => number } };
      geometry?: { type?: string; parameters?: { width: number; height: number; depth: number } };
    }> = [];
    const parts = new Set<string>();
    const hexes: number[] = [];
    house.traverse((obj: unknown) => {
      const mesh = obj as {
        userData?: { part?: string; mode?: string };
        material?: { color?: { getHex: () => number } };
        geometry?: { type?: string; parameters?: { width: number; height: number; depth: number } };
      };
      const part = mesh.userData?.part;
      if (part) parts.add(part);
      if (part !== "sill") return;
      sills.push(mesh);
      if (mesh.material?.color) hexes.push(mesh.material.color.getHex());
    });
    expect(sills.length).toBeGreaterThanOrEqual(1);
    expect(parts.has("knocker")).toBe(true);
    expect(parts.has("hinge")).toBe(true);
    expect(parts.has("lintel")).toBe(true);
    expect(parts.has("knob")).toBe(true);
    expect(parts.has("doormat")).toBe(true);
    expect(parts.has("stoop")).toBe(true);
    for (const mesh of sills) {
      expect(mesh.userData?.mode).toBe("PAPER");
      expect(mesh.geometry?.type).toBe("BoxGeometry");
    }
    expect(hexes.length).toBeGreaterThan(0);
    expect(hexes.every((c) => c === 0x5a3a22 || c === 0xf4ead8)).toBe(true);
    expect(hexes.every((c) => !isGrey(c))).toBe(true);

    const shop = meshForUse("shop", { area: 400 });
    const shopParts = new Set<string>();
    shop.traverse((obj: unknown) => {
      const mesh = obj as { userData?: { part?: string } };
      const part = mesh.userData?.part;
      if (part) shopParts.add(part);
    });
    expect(shopParts.has("sill")).toBe(false);
    expect(shopParts.has("latch")).toBe(true);
  });

  it("puts one tiny kraft PAPER sconce on the House wall", () => {
    const house = meshForUse("house", { area: 400 });
    const sconces: Array<{
      userData?: { part?: string; mode?: string };
      material?: { color?: { getHex: () => number } };
      geometry?: { type?: string; parameters?: { width: number; height: number; depth: number } };
    }> = [];
    const parts = new Set<string>();
    const hexes: number[] = [];
    house.traverse((obj: unknown) => {
      const mesh = obj as {
        userData?: { part?: string; mode?: string };
        material?: { color?: { getHex: () => number } };
        geometry?: { type?: string; parameters?: { width: number; height: number; depth: number } };
      };
      const part = mesh.userData?.part;
      if (part) parts.add(part);
      if (part !== "sconce") return;
      sconces.push(mesh);
      if (mesh.material?.color) hexes.push(mesh.material.color.getHex());
    });
    expect(sconces.length).toBeGreaterThanOrEqual(1);
    expect(parts.has("sill")).toBe(true);
    expect(parts.has("knob")).toBe(true);
    expect(parts.has("knocker")).toBe(true);
    expect(parts.has("hinge")).toBe(true);
    expect(parts.has("lintel")).toBe(true);
    expect(parts.has("mailbox")).toBe(true);
    expect(parts.has("shutter")).toBe(true);
    for (const mesh of sconces) {
      expect(mesh.userData?.mode).toBe("PAPER");
      expect(mesh.geometry?.type).toBe("BoxGeometry");
    }
    expect(hexes.length).toBeGreaterThan(0);
    expect(hexes.every((c) => c === 0x5a3a22 || c === 0xf4ead8)).toBe(true);
    expect(hexes.every((c) => !isGrey(c))).toBe(true);

    const shop = meshForUse("shop", { area: 400 });
    const shopParts = new Set<string>();
    shop.traverse((obj: unknown) => {
      const mesh = obj as { userData?: { part?: string } };
      const part = mesh.userData?.part;
      if (part) shopParts.add(part);
    });
    expect(shopParts.has("sconce")).toBe(false);
    expect(shopParts.has("latch")).toBe(true);
  });

  it("puts one tiny kraft PAPER transom above the House door", () => {
    const house = meshForUse("house", { area: 400 });
    const transoms: Array<{
      userData?: { part?: string; mode?: string };
      material?: { color?: { getHex: () => number } };
      geometry?: { type?: string; parameters?: { width: number; height: number; depth: number } };
    }> = [];
    const parts = new Set<string>();
    const hexes: number[] = [];
    house.traverse((obj: unknown) => {
      const mesh = obj as {
        userData?: { part?: string; mode?: string };
        material?: { color?: { getHex: () => number } };
        geometry?: { type?: string; parameters?: { width: number; height: number; depth: number } };
      };
      const part = mesh.userData?.part;
      if (part) parts.add(part);
      if (part !== "transom") return;
      transoms.push(mesh);
      if (mesh.material?.color) hexes.push(mesh.material.color.getHex());
    });
    expect(transoms.length).toBeGreaterThanOrEqual(1);
    expect(parts.has("lintel")).toBe(true);
    expect(parts.has("hinge")).toBe(true);
    expect(parts.has("knob")).toBe(true);
    expect(parts.has("sill")).toBe(true);
    expect(parts.has("sconce")).toBe(true);
    expect(parts.has("knocker")).toBe(true);
    expect(parts.has("mailbox")).toBe(true);
    expect(parts.has("shutter")).toBe(true);
    for (const mesh of transoms) {
      expect(mesh.userData?.mode).toBe("PAPER");
      expect(mesh.geometry?.type).toBe("BoxGeometry");
    }
    expect(hexes.length).toBeGreaterThan(0);
    expect(hexes.every((c) => c === 0xc4b496)).toBe(true);
    expect(hexes.every((c) => !isGrey(c))).toBe(true);

    const shop = meshForUse("shop", { area: 400 });
    const shopParts = new Set<string>();
    shop.traverse((obj: unknown) => {
      const mesh = obj as { userData?: { part?: string } };
      const part = mesh.userData?.part;
      if (part) shopParts.add(part);
    });
    expect(shopParts.has("transom")).toBe(false);
    expect(shopParts.has("latch")).toBe(true);
  });

  it("puts one tiny kraft PAPER jamb at the House door", () => {
    const house = meshForUse("house", { area: 400 });
    const jambs: Array<{
      userData?: { part?: string; mode?: string };
      material?: { color?: { getHex: () => number } };
      geometry?: { type?: string; parameters?: { width: number; height: number; depth: number } };
    }> = [];
    const parts = new Set<string>();
    const hexes: number[] = [];
    house.traverse((obj: unknown) => {
      const mesh = obj as {
        userData?: { part?: string; mode?: string };
        material?: { color?: { getHex: () => number } };
        geometry?: { type?: string; parameters?: { width: number; height: number; depth: number } };
      };
      const part = mesh.userData?.part;
      if (part) parts.add(part);
      if (part !== "jamb") return;
      jambs.push(mesh);
      if (mesh.material?.color) hexes.push(mesh.material.color.getHex());
    });
    expect(jambs.length).toBeGreaterThanOrEqual(1);
    expect(parts.has("stoop")).toBe(true);
    expect(parts.has("knocker")).toBe(true);
    expect(parts.has("hinge")).toBe(true);
    expect(parts.has("lintel")).toBe(true);
    expect(parts.has("knob")).toBe(true);
    expect(parts.has("sill")).toBe(true);
    expect(parts.has("sconce")).toBe(true);
    expect(parts.has("transom")).toBe(true);
    expect(parts.has("doormat")).toBe(true);
    expect(parts.has("mailbox")).toBe(true);
    for (const mesh of jambs) {
      expect(mesh.userData?.mode).toBe("PAPER");
      expect(mesh.geometry?.type).toBe("BoxGeometry");
      const box = mesh.geometry?.parameters;
      if (box) {
        expect(box.width).toBeLessThan(0.16);
        expect(box.height).toBeLessThan(0.5);
        expect(box.depth).toBeLessThan(0.12);
      }
    }
    expect(hexes.length).toBeGreaterThan(0);
    expect(hexes.every((c) => c === 0xf4ead8)).toBe(true);
    expect(hexes.every((c) => !isGrey(c))).toBe(true);

    const shop = meshForUse("shop", { area: 400 });
    const shopParts = new Set<string>();
    shop.traverse((obj: unknown) => {
      const mesh = obj as { userData?: { part?: string } };
      const part = mesh.userData?.part;
      if (part) shopParts.add(part);
    });
    expect(shopParts.has("jamb")).toBe(false);
    expect(shopParts.has("latch")).toBe(true);
  });

  it("puts a small kraft PAPER knocker on the House door", () => {
    const house = meshForUse("house", { area: 400 });
    const parts: string[] = [];
    const hexes: number[] = [];
    house.traverse((obj: unknown) => {
      const mesh = obj as {
        userData?: { part?: string; mode?: string };
        material?: { color?: { getHex: () => number } };
      };
      if (mesh.userData?.part !== "knocker") return;
      parts.push("knocker");
      expect(mesh.userData?.mode).toBe("PAPER");
      if (mesh.material?.color) hexes.push(mesh.material.color.getHex());
    });
    expect(parts.length).toBeGreaterThanOrEqual(1);
    expect(hexes.length).toBeGreaterThan(0);
    expect(hexes).toContain(0xf4ead8);
    expect(hexes.every((c) => c === 0x5a3a22 || c === 0xf4ead8)).toBe(true);

    const shop = meshForUse("shop", { area: 400 });
    let shopKnockers = 0;
    shop.traverse((obj: unknown) => {
      const mesh = obj as { userData?: { part?: string } };
      if (mesh.userData?.part === "knocker") shopKnockers += 1;
    });
    expect(shopKnockers).toBe(0);
  });

  it("puts a kraft PAPER latch on the Shop door", () => {
    const shop = meshForUse("shop", { area: 400 });
    const parts: string[] = [];
    const hexes: number[] = [];
    shop.traverse((obj: unknown) => {
      const mesh = obj as {
        userData?: { part?: string; mode?: string };
        material?: { color?: { getHex: () => number } };
      };
      if (mesh.userData?.part !== "latch") return;
      parts.push("latch");
      expect(mesh.userData?.mode).toBe("PAPER");
      if (mesh.material?.color) hexes.push(mesh.material.color.getHex());
    });
    expect(parts.length).toBeGreaterThanOrEqual(1);
    expect(hexes.length).toBeGreaterThan(0);
    expect(hexes).toContain(0xf4ead8);
    expect(hexes.every((c) => c === 0x5a3a22 || c === 0xf4ead8 || c === 0x4a3220)).toBe(true);

    const house = meshForUse("house", { area: 400 });
    let houseLatches = 0;
    let houseKnockers = 0;
    house.traverse((obj: unknown) => {
      const mesh = obj as { userData?: { part?: string } };
      if (mesh.userData?.part === "latch") houseLatches += 1;
      if (mesh.userData?.part === "knocker") houseKnockers += 1;
    });
    expect(houseLatches).toBe(0);
    expect(houseKnockers).toBeGreaterThanOrEqual(1);

    for (const id of ["farm", "factory"] as const) {
      const mesh = meshForUse(id, { area: 400 });
      let latches = 0;
      mesh.traverse((obj: unknown) => {
        const m = obj as { userData?: { part?: string } };
        if (m.userData?.part === "latch") latches += 1;
      });
      expect(latches).toBe(0);
    }
  });

  it("puts paired kraft PAPER shutter boxes beside House windows", () => {
    const house = meshForUse("house", { area: 400 });
    const parts: string[] = [];
    const hexes: number[] = [];
    house.traverse((obj: unknown) => {
      const mesh = obj as {
        userData?: { part?: string; mode?: string };
        material?: { color?: { getHex: () => number } };
      };
      if (mesh.userData?.part !== "shutter") return;
      parts.push("shutter");
      expect(mesh.userData?.mode).toBe("PAPER");
      if (mesh.material?.color) hexes.push(mesh.material.color.getHex());
    });
    expect(parts.length).toBeGreaterThanOrEqual(2);
    expect(hexes.length).toBeGreaterThan(0);
    expect(hexes).toContain(0xf4ead8);
    expect(hexes.every((c) => c === 0x5a3a22 || c === 0xf4ead8 || c === 0x3d2a1c)).toBe(true);
  });

  it("keeps a brick/kraft chimney and tiny stack on the warehouse shell", () => {
    const warehouse = meshForUse("warehouse", { area: 400 });
    const parts: string[] = [];
    const hexes: number[] = [];
    warehouse.traverse((obj: unknown) => {
      const mesh = obj as {
        userData?: { part?: string };
        material?: { color?: { getHex: () => number } };
      };
      const part = mesh.userData?.part;
      if (part !== "chimney" && part !== "stack") return;
      parts.push(part);
      if (mesh.material?.color) hexes.push(mesh.material.color.getHex());
    });
    expect(parts).toContain("chimney");
    expect(parts).toContain("stack");
    expect(hexes).toContain(0x8a6a55);
    expect(hexes).toContain(0xf4ead8);
  });
});

function catalogCost(id: "house" | "shop" | "farm") {
  return BUILDING_CATALOG.find((b) => b.id === id)!.paperCost;
}
