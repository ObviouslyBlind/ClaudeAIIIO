import { describe, expect, it } from "vitest";
import { FIRST_GENERAL_DAY, nextGeneralDay, simDay, TICKS_PER_SIM_DAY } from "./calendar.ts";

describe("PAPER sim calendar", () => {
  it("maps ticks onto sim days and keeps the first general on day 14", () => {
    expect(simDay(0)).toBe(0);
    expect(simDay(TICKS_PER_SIM_DAY - 1)).toBe(0);
    expect(simDay(TICKS_PER_SIM_DAY)).toBe(1);
    expect(nextGeneralDay(0)).toBe(FIRST_GENERAL_DAY);
    expect(nextGeneralDay(FIRST_GENERAL_DAY * TICKS_PER_SIM_DAY)).toBe(
      FIRST_GENERAL_DAY + 28,
    );
  });
});
