import { describe, expect, it } from "vitest";
import {
  PACK_BONUS_PER_HIT,
  PACK_COOLDOWN_MS,
  PACK_MAX_HITS,
  PACK_NOTE,
  completePackShift,
} from "./shiftBonus.ts";

describe("PAPER cart pack shift bonus", () => {
  it("pays a capped PAPER bonus and never trusts extra hits", () => {
    const visitor = { cash: 100 };
    const paid = completePackShift(visitor, { hits: 3, nowMs: 1_000 });
    expect(paid.ok).toBe(true);
    if (!paid.ok) return;
    expect(paid.bonus).toBeCloseTo(3 * PACK_BONUS_PER_HIT, 8);
    expect(paid.cash).toBeCloseTo(100 + 3 * PACK_BONUS_PER_HIT, 8);
    expect(paid.mode).toBe("PAPER");
    expect(paid.note).toBe(PACK_NOTE);
    expect(visitor.cash).toBe(paid.cash);

    const clamped = completePackShift({ cash: 0 }, { hits: 99, nowMs: 1_000 });
    expect(clamped.ok).toBe(true);
    if (clamped.ok) expect(clamped.hits).toBe(PACK_MAX_HITS);
  });

  it("rate-limits so a thrown minigame cannot farm cash", () => {
    const visitor = { cash: 10 };
    expect(completePackShift(visitor, { hits: 2, nowMs: 5_000 }).ok).toBe(true);
    const again = completePackShift(visitor, { hits: 8, nowMs: 5_000 + PACK_COOLDOWN_MS - 1 });
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.reason).toBe("cooldown");
    expect(visitor.cash).toBeCloseTo(10 + 2 * PACK_BONUS_PER_HIT, 8);
    expect(completePackShift(visitor, { hits: 1, nowMs: 5_000 + PACK_COOLDOWN_MS }).ok).toBe(true);
  });

  it("rejects junk hits without touching cash", () => {
    const visitor = { cash: 40 };
    expect(completePackShift(visitor, { hits: "nope" }).ok).toBe(false);
    expect(visitor.cash).toBe(40);
  });
});
