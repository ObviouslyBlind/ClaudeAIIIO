import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FARE, SERIAL } from "../public/harbour/ferry-ticket.js";

const src = readFileSync(new URL("../public/harbour/ferry-ticket.js", import.meta.url), "utf8");

describe("ferry ticket PAPER serial", () => {
  it("keeps the $15 fare; SERIAL stays for audit, not the on-screen card", () => {
    expect(FARE).toBe(15);
    expect(SERIAL).toContain("PAPER");
    expect(SERIAL).toContain("15");
    expect(SERIAL).toMatch(/NO\.\s*15/i);
    expect(src).not.toContain("Kraft ticket");
    expect(src).not.toContain("PAPER / SIMULATED");
    expect(src).toContain("Board");
  });
});
