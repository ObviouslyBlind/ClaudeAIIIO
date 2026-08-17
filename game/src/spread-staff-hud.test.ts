import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { formatSpreadLine, mountSpreadHud } from "../public/harbour/spread-hud.js";
import { formatStaffLine } from "../public/harbour/staff-hud.js";

const SNAPSHOT = {
  mode: "PAPER",
  provenance: "SIMULATED",
  hud: { priceIndex: 1, faucet: 0, sink: 0 },
  lastPrices: { corn: 2 },
  lastPricesSouth: { corn: 2.2 },
};

function el(text: string) {
  return { textContent: text, setAttribute() {} };
}

const mounted: Array<{ stop: () => void }> = [];

afterEach(() => {
  for (const hud of mounted) hud.stop();
  mounted.length = 0;
});

describe("harbour PAPER ferry-spread strip", () => {
  it("keeps PAPER · SIMULATED · Ferry spread · N · S with numbers, not dashes", () => {
    const line = formatSpreadLine(SNAPSHOT);
    expect(line).toBe("PAPER · SIMULATED · Ferry spread · N 1.00 · S 1.10");
    expect(formatSpreadLine(null)).toBe("PAPER · SIMULATED · Ferry spread · N 0.00 · S 0.00");
    expect(formatSpreadLine(null).includes("—")).toBe(false);
  });

  it("does not clobber the first-frame spread line before snapshot returns", async () => {
    const node = el("PAPER · SIMULATED · Ferry spread · N 0.00 · S 0.00");
    const hud = mountSpreadHud({
      el: node,
      fetch: async () => ({ ok: true, json: async () => SNAPSHOT }),
    });
    mounted.push(hud);
    expect(node.textContent).toBe("PAPER · SIMULATED · Ferry spread · N 0.00 · S 0.00");
    await Promise.resolve();
    await Promise.resolve();
    expect(node.textContent).toBe("PAPER · SIMULATED · Ferry spread · N 1.00 · S 1.10");
  });
});

describe("harbour PAPER staff strip at spawn", () => {
  it("is PAPER · SIMULATED · Staff — when no plot is selected", () => {
    expect(formatStaffLine(null, null)).toBe("PAPER · SIMULATED · Staff —");
  });
});

describe("first-frame staff / spread placeholders", () => {
  it("ships PAPER · SIMULATED lines, not Staff — · PAPER / Ferry spread · PAPER", () => {
    const html = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../public/harbour/index.html"),
      "utf8",
    );
    expect(html).toMatch(/id="staff-line">PAPER · SIMULATED · Staff —</);
    expect(html).toMatch(/id="spread">PAPER · SIMULATED · Ferry spread · N 0.00 · S 0.00</);
    expect(html).not.toMatch(/id="staff-line">Staff —/);
    expect(html).not.toMatch(/id="spread">Ferry spread · PAPER</);
  });
});
