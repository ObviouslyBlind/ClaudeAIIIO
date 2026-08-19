import { describe, expect, it } from "vitest";
import { compactCash, fullCash } from "../public/harbour/cash-chip.js";

describe("compact PAPER cash chip", () => {
  it("drops cents under 100k and uses thousands separators", () => {
    expect(compactCash(1000)).toBe("$1,000");
    expect(compactCash(1000.49)).toBe("$1,000");
    expect(compactCash(99999)).toBe("$99,999");
    expect(compactCash(0)).toBe("$0");
    expect(compactCash(-40)).toBe("-$40");
  });

  it("abbreviates 100k+ and spells million", () => {
    expect(compactCash(100_000)).toBe("$100k");
    expect(compactCash(250_400)).toBe("$250k");
    expect(compactCash(999_499)).toBe("$999k");
    expect(compactCash(1_000_000)).toBe("$1 million");
    expect(compactCash(1_200_000)).toBe("$1.2 million");
    expect(compactCash(12_000_000)).toBe("$12 million");
    expect(compactCash(1_000_000_000)).toBe("$1 billion");
  });

  it("keeps exact cents for the hover stack", () => {
    expect(fullCash(1000)).toBe("$1,000.00");
    expect(fullCash(1234.5)).toBe("$1,234.50");
  });
});
