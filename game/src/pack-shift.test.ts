import { describe, expect, it } from "vitest";
import {
  GOLD_WIDTH_END,
  GOLD_WIDTH_START,
  PACK_SECONDS,
  goldBandAt,
  goldHit,
} from "../public/harbour/pack.js";

describe("basket pull gold band", () => {
  it("starts wide, shrinks, and wanders", () => {
    const start = goldBandAt(0);
    expect(start.hi - start.lo).toBeCloseTo(GOLD_WIDTH_START, 5);
    const end = goldBandAt(PACK_SECONDS * 1000);
    expect(end.hi - end.lo).toBeCloseTo(GOLD_WIDTH_END, 5);
    expect(end.hi - end.lo).toBeGreaterThan(9);
    expect(end.hi - end.lo).toBeLessThan(GOLD_WIDTH_START);
    const a = goldBandAt(400);
    const b = goldBandAt(1200);
    expect(a.lo).not.toBeCloseTo(b.lo, 2);
    expect(goldHit((start.lo + start.hi) / 2, start)).toBe(true);
    expect(goldHit(start.lo - 1, start)).toBe(false);
    expect(goldHit(start.hi + 1, start)).toBe(false);
  });
});
