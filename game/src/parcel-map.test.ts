import { describe, expect, it } from "vitest";
import {
  FILL_NPC,
  FILL_SELECTED,
  FILL_VACANT,
  FILL_VISITOR,
  LABEL_POOL,
  LABEL_RADIUS_M,
  fillColorFor,
  labelTextFor,
  plotDisplayName,
  mountParcelMap,
} from "../public/harbour/parcel-map.js";

type FakePlot = {
  id: string;
  island: "north" | "south";
  ring: [number, number][];
  x: number;
  z: number;
  area: number;
  band: "street" | "field" | "shore";
  price: number;
  owner: string | null;
  use: string | null;
};

function plot(id: string, owner: string | null, price = 242): FakePlot {
  return {
    id,
    island: "north",
    ring: [
      [0, 0],
      [20, 0],
      [21, 18],
      [-1, 18],
    ],
    x: 10,
    z: 9,
    area: 360,
    band: "street",
    price,
    owner,
    use: null,
  };
}

const spec = { id: "north", cx: 0, cz: 0, rx: 4000, rz: 2200 };

function mount(plots: FakePlot[], added: unknown[]) {
  return mountParcelMap({
    worldAdd: (o: unknown) => added.push(o),
    specOf: () => spec,
    heightAt: () => 1,
    getPlots: () => plots,
  });
}

describe("parcel map (PAPER)", () => {
  it("prices vacant land, marks yours YOURS, keeps npc land quiet", () => {
    expect(labelTextFor(plot("a", null, 1121))).toBe("$1,121");
    expect(labelTextFor(plot("b", "visitor"))).toBe("YOURS");
    expect(labelTextFor(plot("c", "npc"))).toBeNull();
  });

  it("tints by band and ownership, selection wins", () => {
    const vacant = plot("a", null);
    expect(fillColorFor(vacant, null)).toBe(FILL_VACANT.street);
    expect(fillColorFor({ ...vacant, band: "field" }, null)).toBe(FILL_VACANT.field);
    expect(fillColorFor({ ...vacant, band: "shore" }, null)).toBe(FILL_VACANT.shore);
    expect(fillColorFor(plot("m", "visitor"), null)).toBe(FILL_VISITOR);
    expect(fillColorFor(plot("n", "npc"), null)).toBe(FILL_NPC);
    expect(fillColorFor(plot("s", "npc"), "s")).toBe(FILL_SELECTED);
  });

  it("builds one merged tappable fill plus boundary lines per island", () => {
    const plots = [plot("north-street-0", null), plot("north-street-1", "npc")];
    plots[1].ring = plots[1].ring.map(([x, z]) => [x + 40, z]) as [number, number][];
    const added: any[] = [];
    const pm = mount(plots, added);
    const fills = pm.buildIsland("north");
    expect(fills.length).toBe(1);
    expect(fills[0].userData.kind).toBe("parcel-fill");
    expect(fills[0].userData.part).toBe("parcel-fill");
    expect(fills[0].userData.mode).toBe("PAPER");
    expect(added.length).toBe(2);
    const lines = added.find((o) => o.userData.kind === "parcel-lines");
    expect(lines).toBeTruthy();
    expect(pm.has("north-street-0")).toBe(true);
    expect(pm.has("nowhere")).toBe(false);
    // Second build of the same island is a no-op, not a duplicate mesh.
    expect(pm.buildIsland("north").length).toBe(0);
  });

  it("repaints a lease without rebuilding: sync flips the fill colour", () => {
    const p = plot("north-street-0", null);
    const added: any[] = [];
    const pm = mount([p], added);
    pm.buildIsland("north");
    const fill = added.find((o) => o.userData.part === "parcel-fill");
    const before = fill.geometry.getAttribute("color").getX(0);
    p.owner = "visitor";
    pm.sync();
    const after = fill.geometry.getAttribute("color").getX(0);
    expect(after).not.toBe(before);
  });

  it("keeps the label pool bounded", () => {
    expect(LABEL_POOL).toBeLessThanOrEqual(128);
    expect(LABEL_RADIUS_M).toBeLessThanOrEqual(600);
  });

  it("names a lot for the lease card", () => {
    expect(plotDisplayName({ name: "14 Harbour Rd" })).toBe("14 Harbour Rd");
    expect(plotDisplayName({ id: "south-street-0", band: "street" })).toMatch(/^\d+ Harbour Rd$/);
  });

  it("exposes a clickables list for price tags", () => {
    const plots = [plot("north-street-0", null)];
    const added: any[] = [];
    const pm = mount(plots, added);
    pm.buildIsland("north");
    expect(typeof pm.clickables).toBe("function");
    expect(pm.clickables()).toEqual([]);
  });
});
