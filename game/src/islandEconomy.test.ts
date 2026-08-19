import { describe, expect, it } from "vitest";
import { GOOD_IDS, GOODS } from "./goods.ts";
import { createStatuteCatalog, setStatuteSlider } from "./statutes.ts";
import {
  ferryFriction,
  isNative,
  islandAskMul,
  islandDemandMul,
  islandFairMul,
  islandSupplyMul,
} from "./islandEconomy.ts";

describe("island economy (PLAN §3.2–3.3)", () => {
  it("marks South as native in food and ore, North as native in industry", () => {
    expect(isNative("south", "corn")).toBe(true);
    expect(isNative("south", "ore")).toBe(true);
    expect(isNative("south", "tools")).toBe(false);
    expect(isNative("north", "tools")).toBe(true);
    expect(isNative("north", "concrete")).toBe(true);
    expect(isNative("north", "corn")).toBe(false);
    for (const id of GOOD_IDS) {
      expect(isNative("north", id)).toBe(GOODS[id].chain === "industry");
    }
  });

  it("quotes natives cheaper and thicker than imports", () => {
    expect(islandFairMul("south", "corn")).toBeLessThan(islandFairMul("north", "corn"));
    expect(islandFairMul("north", "tools")).toBeLessThan(islandFairMul("south", "tools"));
    expect(islandSupplyMul("south", "ore")).toBeGreaterThan(islandSupplyMul("north", "ore"));
    expect(islandDemandMul("north", "corn")).toBeGreaterThan(islandDemandMul("south", "corn"));
  });

  it("adds ferry ticket, port fee, and tariff onto import asks only", () => {
    const catalog = createStatuteCatalog();
    const launch = ferryFriction(catalog);
    expect(launch).toBeGreaterThan(0);
    expect(launch).toBeCloseTo(15 / 500 + 2 / 50, 8);
    expect(islandAskMul("south", "corn", catalog)).toBe(islandFairMul("south", "corn"));
    expect(islandAskMul("north", "corn", catalog)).toBeCloseTo(
      islandFairMul("north", "corn") * (1 + launch),
      8,
    );

    setStatuteSlider(catalog, "national_tariff", "rate", 0.2);
    setStatuteSlider(catalog, "ferry_ticket", "cost", 80);
    const tight = ferryFriction(catalog);
    expect(tight).toBeGreaterThan(launch);
    expect(islandAskMul("south", "tools", catalog)).toBeCloseTo(
      islandFairMul("south", "tools") * (1 + tight),
      8,
    );
  });
});
