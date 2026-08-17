import { describe, expect, it } from "vitest";
import {
  MAX_OWNERS,
  canFoundWithoutPlanning,
  foundFirm,
} from "./firms.ts";

describe("PAPER firms step E", () => {
  it("solo stall ok: Owner=CEO stack counts as one", () => {
    const result = foundFirm({ owners: ["ada"], ceo: "ada", siteClass: "small" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.firm.owners).toEqual(["ada"]);
    expect(result.firm.ceo).toBe("ada");
    expect(result.firm.sizeClass).toBe("small");
    expect(result.firm.mode).toBe("PAPER");
    expect(result.firm.provenance).toBe("SIMULATED");
  });

  it("solo factory fails", () => {
    const result = foundFirm({ owners: ["ada"], ceo: "ada", siteClass: "large" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("need_second");
  });

  it("factory with owner+ceo ok", () => {
    const result = foundFirm({ owners: ["ada"], ceo: "bev", siteClass: "large" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.firm.owners).toEqual(["ada"]);
    expect(result.firm.ceo).toBe("bev");
    expect(result.firm.sizeClass).toBe("large");
    expect(result.firm.mode).toBe("PAPER");
    expect(result.firm.provenance).toBe("SIMULATED");
  });

  it("factory with two owners ok", () => {
    const result = foundFirm({ owners: ["ada", "bev"], ceo: "ada", siteClass: "large" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.firm.owners).toEqual(["ada", "bev"]);
    expect(result.firm.ceo).toBe("ada");
    expect(result.firm.sizeClass).toBe("large");
  });

  it("canFoundWithoutPlanning is true for small only", () => {
    expect(canFoundWithoutPlanning("small")).toBe(true);
    expect(canFoundWithoutPlanning("large")).toBe(false);
  });

  it("caps owners on a form at 4 by default", () => {
    expect(MAX_OWNERS).toBe(4);
    const four = foundFirm({
      owners: ["a", "b", "c", "d"],
      ceo: "a",
      siteClass: "large",
    });
    expect(four.ok).toBe(true);
    const five = foundFirm({
      owners: ["a", "b", "c", "d", "e"],
      ceo: "a",
      siteClass: "large",
    });
    expect(five.ok).toBe(false);
    if (five.ok) return;
    expect(five.reason).toBe("max_owners");
  });
});
