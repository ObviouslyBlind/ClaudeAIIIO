import { afterEach, describe, expect, it, vi } from "vitest";
import { formatEconLine, mountEconHud, POLL_MS } from "../public/harbour/hud-econ.js";

const SNAPSHOT = {
  mode: "PAPER",
  provenance: "SIMULATED",
  hud: {
    tick: 12,
    moneySupply: 50_000.4,
    goodsProducedWindow: 4321.7,
    priceIndex: 1.2531,
    tradeCount: 9,
    faucet: 0,
    sink: 0,
  },
  visitor: { cash: 7777, stock: { corn: 3 } },
};

function el() {
  return { textContent: "Index — · money — · output —" };
}

function okFetch(body: unknown, onUrl?: (url: string) => void) {
  return async (url: string) => {
    onUrl?.(url);
    return {
      ok: true,
      json: async () => body,
    };
  };
}

const mounted: Array<{ stop: () => void }> = [];

afterEach(() => {
  for (const hud of mounted) hud.stop();
  mounted.length = 0;
  vi.useRealTimers();
});

describe("harbour PAPER econ strip", () => {
  it("is one short line with index, NPC money, output, and PAPER / SIMULATED", () => {
    const line = formatEconLine(SNAPSHOT);
    expect(line).toBe("PAPER · SIMULATED · Index 1.25 · NPC $50,000 · out 4,322");
    expect(line.includes("\n")).toBe(false);
    expect(line.length).toBeLessThan(80);
  });

  it("never paints a wallet or visitor cash", () => {
    const line = formatEconLine(SNAPSHOT);
    expect(line.toLowerCase()).not.toContain("wallet");
    expect(line.toLowerCase()).not.toContain("cash");
    expect(line).not.toContain("7777");
    expect(line).not.toContain("visitor");
    expect(formatEconLine(null)).toBe("PAPER · SIMULATED · Index — · NPC — · out —");
  });

  it("polls GET /api/snapshot and paints the sheet line", async () => {
    const urls: string[] = [];
    const node = el();
    const hud = mountEconHud({ el: node, fetch: okFetch(SNAPSHOT, (u) => urls.push(u)) });
    mounted.push(hud);
    await Promise.resolve();
    await Promise.resolve();
    expect(urls).toEqual(["/api/snapshot"]);
    expect(node.textContent).toBe("PAPER · SIMULATED · Index 1.25 · NPC $50,000 · out 4,322");
    expect(node.textContent).not.toContain("7777");
  });

  it("polls about once a second from tick and the interval", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    let n = 0;
    const node = el();
    const hud = mountEconHud({
      el: node,
      fetch: async (url: string) => {
        n += 1;
        expect(url).toBe("/api/snapshot");
        return { ok: true, json: async () => SNAPSHOT };
      },
    });
    mounted.push(hud);
    await Promise.resolve();
    expect(n).toBe(1);

    hud.tick();
    await Promise.resolve();
    expect(n).toBe(1);

    vi.setSystemTime(1_000 + POLL_MS);
    hud.tick();
    await Promise.resolve();
    expect(n).toBe(2);

    vi.advanceTimersByTime(POLL_MS);
    await Promise.resolve();
    expect(n).toBe(3);
  });

  it("keeps the PAPER line if snapshot fetch fails", async () => {
    const node = el();
    const hud = mountEconHud({
      el: node,
      fetch: async () => {
        throw new Error("offline");
      },
    });
    mounted.push(hud);
    await Promise.resolve();
    await Promise.resolve();
    expect(node.textContent).toBe("PAPER · SIMULATED · Index — · NPC — · out —");
  });

  it("does not throw when #econ is missing", () => {
    expect(() => mountEconHud({ el: null })).not.toThrow();
    expect(() => mountEconHud({})).not.toThrow();
  });
});
