import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { formatFlowLine, mountFlowHud, POLL_MS as FLOW_POLL } from "../public/harbour/flow-hud.js";
import { formatTaxLine, mountTaxHud } from "../public/harbour/tax-hud.js";
import { formatGoodsLine, mountGoodsHud } from "../public/harbour/goods-hud.js";

const SNAPSHOT = {
  mode: "PAPER",
  provenance: "SIMULATED",
  hud: { faucet: 1.5, sink: 0.25, tick: 12 },
  visitor: { stock: {}, goods: {} },
};

const STATUTES = {
  mode: "PAPER",
  provenance: "SIMULATED",
  statutes: [{ id: "sales_tax", sliders: { rate: 0 } }],
};

function el(text: string) {
  return { textContent: text, setAttribute() {} };
}

const mounted: Array<{ stop: () => void }> = [];

afterEach(() => {
  for (const hud of mounted) hud.stop();
  mounted.length = 0;
  vi.useRealTimers();
});

describe("harbour PAPER flow strip", () => {
  it("keeps PAPER · SIMULATED · Faucet · sink on one line with numbers, not dashes", () => {
    expect(formatFlowLine(SNAPSHOT)).toBe("PAPER · SIMULATED · Faucet 1.5 · sink 0.25");
    expect(formatFlowLine(null)).toBe("PAPER · SIMULATED · Faucet 0 · sink 0");
    expect(formatFlowLine(null).includes("—")).toBe(false);
  });

  it("does not clobber the first-frame Faucet 0 line before snapshot returns", async () => {
    const node = el("PAPER · SIMULATED · Faucet 0 · sink 0");
    const hud = mountFlowHud({
      el: node,
      fetch: async () => ({ ok: true, json: async () => SNAPSHOT }),
    });
    mounted.push(hud);
    expect(node.textContent).toBe("PAPER · SIMULATED · Faucet 0 · sink 0");
    await Promise.resolve();
    await Promise.resolve();
    expect(node.textContent).toBe("PAPER · SIMULATED · Faucet 1.5 · sink 0.25");
  });
});

describe("harbour PAPER tax strip", () => {
  it("keeps PAPER · SIMULATED · Sales tax on one line", () => {
    expect(formatTaxLine(STATUTES)).toBe("PAPER · SIMULATED · Sales tax 0%");
    expect(formatTaxLine(null)).toBe("PAPER · SIMULATED · Sales tax 0%");
  });

  it("does not clobber the first-frame tax line before statutes return", async () => {
    const node = el("PAPER · SIMULATED · Sales tax 0%");
    const hud = mountTaxHud({
      el: node,
      fetch: async (url: string) => {
        if (String(url).includes("statutes")) return { ok: true, json: async () => STATUTES };
        return { ok: true, json: async () => SNAPSHOT };
      },
    });
    mounted.push(hud);
    expect(node.textContent).toBe("PAPER · SIMULATED · Sales tax 0%");
    await Promise.resolve();
    await Promise.resolve();
    expect(node.textContent).toBe("PAPER · SIMULATED · Sales tax 0%");
  });
});

describe("harbour PAPER goods strip", () => {
  it("stays blank when the bag is empty so it does not clone persist / the badge", () => {
    expect(formatGoodsLine(SNAPSHOT)).toBe("");
    expect(formatGoodsLine(null)).toBe("");
    expect(
      formatGoodsLine({
        mode: "PAPER",
        provenance: "SIMULATED",
        visitor: { stock: { corn: 2 } },
      }),
    ).toBe("corn 2 · PAPER · SIMULATED");
  });
});

describe("first-frame flow / tax / goods placeholders", () => {
  it("ships PAPER lines, not Faucet — / Sales tax without SIMULATED", () => {
    const html = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../public/harbour/index.html"),
      "utf8",
    );
    expect(html).toMatch(/id="flow">PAPER · SIMULATED · Faucet 0 · sink 0</);
    expect(html).toMatch(/id="tax">PAPER · SIMULATED · Sales tax 0%</);
    expect(html).toMatch(/id="goods"><\/p>/);
    expect(html).toMatch(/id="persist-line">PAPER · SIMULATED · no dump</);
    expect(html).not.toMatch(/id="goods">PAPER · SIMULATED</);
    expect(html).not.toMatch(/id="flow">Faucet —/);
    expect(html).toContain('fetch("/api/statutes")');
    expect(html).toContain('fetch("/api/snapshot")');
  });
});

describe("flow poll", () => {
  it("polls about once a second", async () => {
    vi.useFakeTimers();
    let n = 0;
    const hud = mountFlowHud({
      el: el("PAPER · SIMULATED · Faucet 0 · sink 0"),
      fetch: async () => {
        n += 1;
        return { ok: true, json: async () => SNAPSHOT };
      },
    });
    mounted.push(hud);
    await Promise.resolve();
    expect(n).toBe(1);
    await vi.advanceTimersByTimeAsync(FLOW_POLL);
    expect(n).toBe(2);
  });
});
