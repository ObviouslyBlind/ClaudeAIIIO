import { describe, expect, it } from "vitest";
import { CART_UPGRADES } from "./economy.ts";
import { BASE_SELL_TICKS, SALE_WINDOW_TICKS, scoreSite, siteClassForUse } from "./siteScore.ts";

const ALL_KIT = CART_UPGRADES.map((u) => u.id);

describe("site desirability", () => {
  it("reads an empty fruit cart as 1/10 even on a busy street", () => {
    const s = scoreSite({
      hired: false,
      stocked: false,
      upgraded: false,
      traffic: "green",
      rivalsOnStreet: 0,
      baseGrade: 1,
    });
    expect(s.score).toBe(1);
    expect(s.parts.find((p) => p.id === "cart")?.points).toBe(1);
    expect(s.parts.find((p) => p.id === "traffic")?.points).toBe(0);
  });

  it("reads an empty fry cart as 2/10", () => {
    const s = scoreSite({
      hired: false,
      stocked: false,
      upgraded: false,
      traffic: "red",
      rivalsOnStreet: 0,
      baseGrade: 2,
    });
    expect(s.score).toBe(2);
  });

  it("climbs to 8 with hire, stock, fridge, sign, and awning", () => {
    const s = scoreSite({
      hired: true,
      stocked: true,
      upgraded: true,
      upgrades: ["fridge", "sign", "awning"],
      traffic: "green",
      rivalsOnStreet: 0,
      baseGrade: 1,
    });
    expect(s.score).toBeGreaterThanOrEqual(8);
    expect(s.score).toBeLessThan(10);
  });

  it("is 10 when staffed, stocked, fully kitted, on a quiet High street", () => {
    const s = scoreSite({
      hired: true,
      stocked: true,
      upgraded: true,
      upgrades: ALL_KIT,
      traffic: "green",
      rivalsOnStreet: 0,
    });
    expect(s.raw).toBeGreaterThanOrEqual(10);
    expect(s.score).toBe(10);
    expect(s.sellTicks).toBe(BASE_SELL_TICKS);
    expect(SALE_WINDOW_TICKS / s.sellTicks).toBe(10);
  });

  it("caps a fully upgraded site at 5 when the street is crowded", () => {
    const s = scoreSite({
      hired: true,
      stocked: true,
      upgraded: true,
      upgrades: ALL_KIT,
      traffic: "green",
      rivalsOnStreet: 2,
    });
    expect(s.raw).toBeGreaterThanOrEqual(10);
    expect(s.cap).toBe(5);
    expect(s.score).toBe(5);
    expect(s.sellTicks).toBe(BASE_SELL_TICKS * 2);
  });

  it("lists each owned upgrade's appeal instead of one Upgraded blob", () => {
    const s = scoreSite({
      hired: true,
      stocked: true,
      upgraded: true,
      upgrades: ["fridge", "sign"],
      traffic: "green",
      rivalsOnStreet: 0,
    });
    expect(s.parts.find((p) => p.id === "fridge")?.points).toBe(1.5);
    expect(s.parts.find((p) => p.id === "sign")?.points).toBe(1);
    expect(s.parts.some((p) => p.id === "upgrade")).toBe(false);
    expect(s.raw).toBe(7);
    expect(s.score).toBe(7);
  });

  it("speeds the next sales when a mini-game lands hits", () => {
    const boosted = scoreSite({
      hired: true,
      stocked: true,
      upgraded: true,
      upgrades: ALL_KIT,
      traffic: "green",
      rivalsOnStreet: 0,
      boostLeft: 3,
    });
    expect(boosted.sellTicks).toBe(Math.max(6, Math.round(BASE_SELL_TICKS * 0.6)));
  });

  it("classifies shop and mine uses", () => {
    expect(siteClassForUse("shop")).toBe("shop");
    expect(siteClassForUse("factory")).toBe("mine");
    expect(siteClassForUse("cart")).toBeNull();
  });
});
