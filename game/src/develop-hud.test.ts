import { describe, expect, it } from "vitest";
import {
  formatDevelopHint,
  isLeasedVacantInspect,
} from "../public/harbour/develop-hud.js";

const SNAPSHOT = {
  mode: "PAPER",
  provenance: "SIMULATED",
  visitor: { cash: 1000 },
  catalog: [{ id: "house", label: "House", paperCost: 40 }],
};

const BOOT_STATUS = "Tap a piece of land. Lease it, then develop it.";
const BOOT_PLOT = "Tap land to inspect it";
const LEASED_STATUS = "This land is yours for $209 (PAPER). Develop it.";
const LEASED_PLOT = "street land · 120 m² · yours";

describe("harbour PAPER develop afford hint", () => {
  it("stays blank on the boot copy that contains 'develop it'", () => {
    expect(isLeasedVacantInspect(BOOT_STATUS, BOOT_PLOT)).toBe(false);
    expect(formatDevelopHint(SNAPSHOT, { status: BOOT_STATUS, plot: BOOT_PLOT })).toBe("");
  });

  it("paints House afford after a real lease", () => {
    expect(isLeasedVacantInspect(LEASED_STATUS, LEASED_PLOT)).toBe(true);
    expect(formatDevelopHint(SNAPSHOT, { status: LEASED_STATUS, plot: LEASED_PLOT })).toBe(
      "PAPER · SIMULATED · cash $1,000 vs House $40 · remain $960 · can afford",
    );
  });
});
