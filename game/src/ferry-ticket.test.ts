import { describe, expect, it } from "vitest";
import { FARE, SERIAL } from "../public/harbour/ferry-ticket.js";

describe("ferry ticket PAPER serial", () => {
  it("keeps the $15 fare and stamps a SERIAL that includes PAPER", () => {
    expect(FARE).toBe(15);
    expect(SERIAL).toContain("PAPER");
    expect(SERIAL).toContain("15");
    expect(SERIAL).toMatch(/NO\.\s*15/i);
  });
});
