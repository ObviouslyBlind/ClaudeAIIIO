import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FALLBACK_FARE,
  formatTaxiHint,
  fareOf,
  isTaxiHintActive,
  mountTaxiHud,
  POLL_MS,
} from "../public/harbour/taxi-hud.js";

const MAP = {
  mode: "PAPER",
  provenance: "SIMULATED",
  taxiCost: 5,
  visitor: { cash: 7777 },
  roads: [{ kind: "paved" }, { kind: "dirt" }],
};

function el() {
  return { textContent: "", setAttribute() {} };
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

describe("harbour PAPER taxi fare hint", () => {
  it("is one short Taxi · PAPER line with fare and dirt forbidden", () => {
    const line = formatTaxiHint(MAP, true);
    expect(line).toBe("Taxi · PAPER · $5 · dirt forbidden");
    expect(line.includes("\n")).toBe(false);
    expect(line.toLowerCase()).toContain("paper");
    expect(line.toLowerCase()).toContain("dirt forbidden");
    expect(fareOf(null)).toBe(FALLBACK_FARE);
  });

  it("never paints a wallet or visitor cash", () => {
    const line = formatTaxiHint(MAP, true);
    expect(line.toLowerCase()).not.toContain("wallet");
    expect(line).not.toContain("7777");
    expect(line).not.toContain("visitor");
    expect(formatTaxiHint(null, true)).toBe("Taxi · PAPER · $5 · dirt forbidden");
    expect(formatTaxiHint(MAP, false)).toBe("");
  });

  it("is active only when the taxi map overlay is up, not because Taxi exists", () => {
    expect(isTaxiHintActive({ disabled: false }, { hidden: true })).toBe(false);
    expect(isTaxiHintActive({ disabled: true }, { hidden: false })).toBe(true);
    expect(isTaxiHintActive({ disabled: true }, { hidden: true })).toBe(false);
  });

  it("polls GET /api/map and paints the sheet line", async () => {
    const urls: string[] = [];
    const node = el();
    const hud = mountTaxiHud({
      el: node,
      fetch: okFetch(MAP, (u) => urls.push(u)),
      isActive: () => true,
    });
    mounted.push(hud);
    await Promise.resolve();
    await Promise.resolve();
    expect(urls).toEqual(["/api/map"]);
    expect(node.textContent).toBe("Taxi · PAPER · $5 · dirt forbidden");
    expect(node.textContent).not.toContain("7777");
  });

  it("polls about once a second", async () => {
    vi.useFakeTimers();
    let n = 0;
    const node = el();
    const hud = mountTaxiHud({
      el: node,
      isActive: () => true,
      fetch: async (url: string) => {
        n += 1;
        expect(url).toBe("/api/map");
        return { ok: true, json: async () => MAP };
      },
    });
    mounted.push(hud);
    await Promise.resolve();
    expect(n).toBe(1);
    expect(hud.tick).toBeTypeOf("function");
    hud.tick();
    await Promise.resolve();
    expect(n).toBe(1);

    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(n).toBe(2);
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(n).toBe(3);
  });

  it("keeps the PAPER line if map fetch fails", async () => {
    const node = el();
    const hud = mountTaxiHud({
      el: node,
      isActive: () => true,
      fetch: async () => {
        throw new Error("offline");
      },
    });
    mounted.push(hud);
    await Promise.resolve();
    await Promise.resolve();
    expect(node.textContent).toBe("Taxi · PAPER · $5 · dirt forbidden");
  });

  it("does not throw when #taxi-hint is missing", () => {
    expect(() => mountTaxiHud({ el: null })).not.toThrow();
    expect(() => mountTaxiHud({})).not.toThrow();
  });
});
