import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("playtest human scale (D036)", () => {
  it("does not plant a 34 m mast, 20 m shed, or 86 m land slab pier", () => {
    const src = readFileSync(new URL("../public/harbour/main.js", import.meta.url), "utf8");
    expect(src).not.toMatch(/box\(0\.85, 34/);
    expect(src).not.toMatch(/box\(20, 5\.8, 12/);
    expect(src).not.toMatch(/box\(11, 0\.45, 86/);
    expect(src).toContain("box(8, 3.4, 6");
    expect(src).toContain("box(7, 0.4, pierLen");
  });
});
