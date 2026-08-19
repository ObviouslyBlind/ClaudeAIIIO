import { describe, expect, it } from "vitest";
import {
  GOLD_WIDTH_END,
  GOLD_WIDTH_START,
  HEAT_CYCLE_MS,
  PACK_SECONDS,
  PULL_LOCK_MS,
  goldBandAt,
  goldHit,
  hintFor,
  modeFor,
} from "../public/harbour/pack.js";

describe("basket pull gold band", () => {
  it("starts wide, shrinks, and wanders", () => {
    const start = goldBandAt(0);
    expect(start.hi - start.lo).toBeCloseTo(GOLD_WIDTH_START, 5);
    const end = goldBandAt(PACK_SECONDS * 1000);
    expect(end.hi - end.lo).toBeCloseTo(GOLD_WIDTH_END, 5);
    expect(end.hi - end.lo).toBeGreaterThan(8);
    expect(end.hi - end.lo).toBeLessThan(GOLD_WIDTH_START);
    expect(GOLD_WIDTH_START).toBe(16);
    expect(GOLD_WIDTH_END).toBe(9);
    expect(HEAT_CYCLE_MS).toBe(3500);
    expect(PULL_LOCK_MS).toBe(480);
    const a = goldBandAt(400);
    const b = goldBandAt(1200);
    expect(a.lo).not.toBeCloseTo(b.lo, 2);
    expect(goldHit((start.lo + start.hi) / 2, start)).toBe(true);
    expect(goldHit(start.lo - 1, start)).toBe(false);
    expect(goldHit(start.hi + 1, start)).toBe(false);
    expect(HEAT_CYCLE_MS).toBeLessThan(4000);
    expect(HEAT_CYCLE_MS).toBeGreaterThan(3200);
    expect(PULL_LOCK_MS).toBeGreaterThanOrEqual(400);
    expect(PULL_LOCK_MS).toBeLessThan(700);
  });

  it("adds ripe-sort and seed-spit without changing fry games", () => {
    expect(modeFor("Fruit slice")).toBe("fall");
    expect(modeFor("Ripe sort")).toBe("sort");
    expect(modeFor("Melon slice")).toBe("fall");
    expect(modeFor("Seed spit")).toBe("seed");
    expect(modeFor("Fry run")).toBe("fall");
    expect(modeFor("Basket pull")).toBe("basket");
    expect(modeFor("Wrap ticket")).toBe("wrap");
    expect(hintFor("sort", [])).toMatch(/ripe/i);
    expect(hintFor("seed", [])).toMatch(/seeds/i);
    expect(hintFor("basket", [])).toMatch(/gold/i);
    expect(hintFor("wrap", [])).toMatch(/Paper/i);
  });
});
