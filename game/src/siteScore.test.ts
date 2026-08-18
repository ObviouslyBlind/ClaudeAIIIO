import { describe, expect, it } from "vitest";
import { BASE_SELL_TICKS, SALE_WINDOW_TICKS, scoreSite, siteClassForUse } from "./siteScore.ts";

describe("site desirability", () => {
  it("is 10 when staffed, stocked, upgraded, on a quiet High street", () => {
    const s = scoreSite({
      hired: true,
      stocked: true,
      upgraded: true,
      traffic: "green",
      rivalsOnStreet: 0,
    });
    expect(s.raw).toBe(10);
    expect(s.score).toBe(10);
    expect(s.sellTicks).toBe(BASE_SELL_TICKS);
    expect(SALE_WINDOW_TICKS / s.sellTicks).toBe(10);
  });

  it("caps a fully upgraded site at 5 when the street is crowded", () => {
    const s = scoreSite({
      hired: true,
      stocked: true,
      upgraded: true,
      traffic: "green",
      rivalsOnStreet: 2,
    });
    expect(s.raw).toBe(10);
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
    expect(s.parts.find((p) => p.id === "fridge")?.points).toBe(3);
    expect(s.parts.find((p) => p.id === "sign")?.points).toBe(0.8);
    expect(s.parts.some((p) => p.id === "upgrade")).toBe(false);
    expect(s.raw).toBe(10.8);
    expect(s.score).toBe(10);
  });

  it("speeds the next sales when a mini-game lands hits", () => {
    const boosted = scoreSite({
      hired: true,
      stocked: true,
      upgraded: true,
      traffic: "green",
      rivalsOnStreet: 0,
      boostLeft: 3,
    });
    expect(boosted.sellTicks).toBe(Math.max(6, Math.round(BASE_SELL_TICKS * 0.6)));
  });
});
