import { describe, expect, it } from "vitest";
import { createWorld, fastForward, hud } from "./sim.ts";
import {
  createStatuteCatalog,
  ferryTicketCost,
  nationalTariffRate,
  portFeeAmount,
  salesTaxRate,
  setStatuteEnabled,
  setStatuteSlider,
  statuteById,
} from "./statutes.ts";

const GROUPS = [
  "money",
  "trade",
  "land",
  "planning",
  "firms",
  "labour",
  "environment",
  "stocks",
  "elections",
  "offices",
] as const;

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

  it("ships about 80 rows with about 60 enabled across every PLAN §8 group", () => {
    const catalog = createStatuteCatalog();
    const enabled = catalog.filter((s) => s.enabled);
    const ids = catalog.map((s) => s.id);

    expect(catalog.length).toBeGreaterThanOrEqual(75);
    expect(catalog.length).toBeLessThanOrEqual(85);
    expect(enabled.length).toBeGreaterThanOrEqual(55);
    expect(enabled.length).toBeLessThanOrEqual(65);
    expect(new Set(ids).size).toBe(catalog.length);
    for (const group of GROUPS) {
      expect(catalog.some((s) => s.group === group)).toBe(true);
    }
  });

  it("keeps launch sales_tax and ferry_ticket rows the sim already reads", () => {
    const catalog = createStatuteCatalog();
    const tax = statuteById(catalog, "sales_tax");
    const ferry = statuteById(catalog, "ferry_ticket");

    expect(tax?.enabled).toBe(true);
    expect(tax?.sliders.rate).toBe(0);
    expect(tax?.writes).toContain("ledger.sink");
    expect(ferry?.enabled).toBe(true);
    expect(ferry?.sliders.cost).toBe(15);
    expect(ferryTicketCost(catalog)).toBe(15);
    expect(setStatuteEnabled(catalog, "ferry_ticket", false)).toBe(true);
    expect(ferryTicketCost(catalog)).toBe(15);
  });

  it("reads national tariff and port fee for the ferry wedge", () => {
    const catalog = createStatuteCatalog();
    expect(nationalTariffRate(catalog)).toBe(0);
    expect(portFeeAmount(catalog)).toBe(2);
    expect(setStatuteSlider(catalog, "national_tariff", "rate", 0.1)).toBe(true);
    expect(nationalTariffRate(catalog)).toBeCloseTo(0.1);
    expect(setStatuteEnabled(catalog, "national_tariff", false)).toBe(true);
    expect(nationalTariffRate(catalog)).toBe(0);
  });
});
