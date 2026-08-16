import { describe, expect, it } from "vitest";
import { createWorld, fastForward, hud } from "./sim.ts";
import { salesTaxRate, setStatuteSlider, createStatuteCatalog } from "./statutes.ts";

describe("starter statute pack step B", () => {
  it("loads a catalog and keeps launch sales tax at 0 so step A cash is conserved", () => {
    const world = createWorld(42);
    expect(world.statutes.length).toBeGreaterThan(0);
    expect(salesTaxRate(world.statutes)).toBe(0);
    fastForward(world, 200);
    expect(hud(world).sink).toBe(0);
  });

  it("writes sales tax into ledger.sink on the next ticks after the slider moves", () => {
    const world = createWorld(7);
    fastForward(world, 40);
    const before = hud(world).sink;
    expect(setStatuteSlider(world.statutes, "sales_tax", "rate", 0.05)).toBe(true);
    expect(salesTaxRate(world.statutes)).toBeCloseTo(0.05);
    fastForward(world, 40);
    expect(hud(world).sink).toBeGreaterThan(before);
  });

  it("exposes a PAPER catalog factory for Hansard", () => {
    const catalog = createStatuteCatalog();
    expect(catalog.every((s) => s.provenance === "PAPER")).toBe(true);
  });
});
