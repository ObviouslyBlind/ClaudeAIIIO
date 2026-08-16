import { describe, expect, it } from "vitest";
import {
  BUILDING_CATALOG,
  DEVELOP_COST,
  paperCostFor,
  parseLandUse,
} from "./buildings.ts";
import { BUILDING_IDS, FALLBACK_CATALOG, meshForUse } from "../public/harbour/buildings.js";
import { createLandBoard, developPlot, leasePlot } from "./land.ts";
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

  it("keeps NPC farm and stall uses as placeable meshes", () => {
    const board = createLandBoard();
    const npc = board.plots.filter((p) => p.owner === "npc" && p.use);
    expect(npc.length).toBeGreaterThan(0);
    expect(npc.every((p) => p.use === "farm" || p.use === "stall")).toBe(true);
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
});

function catalogCost(id: "house" | "shop" | "farm") {
  return BUILDING_CATALOG.find((b) => b.id === id)!.paperCost;
}
