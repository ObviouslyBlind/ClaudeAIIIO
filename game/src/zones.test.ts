import { describe, expect, it } from "vitest";
import { createLandBoard } from "./land.ts";
import { skuFitsPlot, zoneForBand, zoneUnlocked, ZONE_ON } from "./zones.ts";

describe("plot zoning (PAPER)", () => {
  it("keeps commercial and residential on, high density government-locked", () => {
    expect(ZONE_ON.commercial).toBe(true);
    expect(ZONE_ON.residential).toBe(true);
    expect(ZONE_ON.high_commercial).toBe(false);
    expect(ZONE_ON.high_residential).toBe(false);
    expect(zoneUnlocked("commercial")).toBe(true);
    expect(zoneUnlocked("high_commercial")).toBe(false);
    expect(zoneForBand("street")).toBe("commercial");
    expect(zoneForBand("field")).toBe("residential");
  });

  it("stamps every lot with a zone and lets a cart sit on commercial only", () => {
    const board = createLandBoard();
    expect(board.plots.every((p) => p.zone === "commercial" || p.zone === "residential")).toBe(true);
    expect(board.plots.filter((p) => p.band === "street").every((p) => p.zone === "commercial")).toBe(true);
    expect(skuFitsPlot("commercial", "commercial").ok).toBe(true);
    expect(skuFitsPlot("commercial", "residential").reason).toBe("zone_mismatch");
    expect(skuFitsPlot("commercial", "high_commercial").reason).toBe("zone_locked");
  });
});
