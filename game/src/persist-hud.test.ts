import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  IDLE_LINE,
  POLL_MS,
  RESTORE_LABEL,
  formatPersistLine,
  mountPersistHud,
} from "../public/harbour/persist-hud.js";

const DUMP = {
  mode: "PAPER",
  provenance: "SIMULATED",
  note: "PAPER in-memory shard snapshot. SIMULATED. Not Postgres.",
  tick: 12,
  visitor: { cash: 777, leases: [] as string[] },
  statutes: { sales_tax: { rate: 0 } },
};

const RESTORE_OK = {
  ok: true,
  mode: "PAPER",
  provenance: "SIMULATED",
  note: "PAPER restore of last in-memory shard blob. SIMULATED. Not Postgres. Does not restart play.",
};

function line() {
  return { textContent: IDLE_LINE, setAttribute() {} };
}

function btn() {
  const listeners: Record<string, () => void> = {};
  return {
    disabled: true,
    textContent: RESTORE_LABEL,
    title: "PAPER · SIMULATED",
    style: {} as Record<string, string>,
    setAttribute() {},
    addEventListener(type: string, fn: () => void) {
      listeners[type] = fn;
    },
    click() {
      listeners.click?.();
    },
  };
}

const mounted: Array<{ stop: () => void }> = [];

afterEach(() => {
  for (const hud of mounted) hud.stop();
  mounted.length = 0;
  vi.useRealTimers();
});

describe("harbour PAPER persist restore HUD", () => {
  it("is one short PAPER · SIMULATED line, never a wallet", () => {
    expect(formatPersistLine(null)).toBe(IDLE_LINE);
    expect(formatPersistLine(DUMP)).toBe("PAPER · SIMULATED · tick 12 · $777");
    expect(formatPersistLine(DUMP, "restored")).toBe(
      "PAPER · SIMULATED · restored · tick 12 · $777",
    );
    expect(formatPersistLine(null, "no_blob")).toBe("PAPER · SIMULATED · no dump");
    expect(formatPersistLine(DUMP).includes("\n")).toBe(false);
    expect(formatPersistLine(DUMP).length).toBeLessThan(80);
    expect(formatPersistLine(DUMP).toLowerCase()).not.toContain("wallet");
    expect(formatPersistLine(DUMP).toLowerCase()).not.toContain("postgres");
    expect(IDLE_LINE).toBe("PAPER · SIMULATED · no dump");
  });

  it("ships a no-dump first frame, not a clone of the PAPER badge", () => {
    const html = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../public/harbour/index.html"),
      "utf8",
    );
    expect(html).toMatch(/id="persist-line">PAPER · SIMULATED · no dump</);
    expect(html).not.toMatch(/id="persist-line">PAPER · SIMULATED</);
  });

  it("polls GET /api/persist and paints the dump", async () => {
    const urls: string[] = [];
    const node = line();
    const restoreBtn = btn();
    const hud = mountPersistHud({
      el: node,
      btnEl: restoreBtn,
      fetch: async (url: string) => {
        urls.push(String(url));
        return { ok: true, status: 200, json: async () => DUMP };
      },
    });
    mounted.push(hud);
    await Promise.resolve();
    await Promise.resolve();
    expect(urls).toEqual(["/api/persist"]);
    expect(node.textContent).toBe("PAPER · SIMULATED · tick 12 · $777");
    expect(restoreBtn.disabled).toBe(false);
  });

  it("treats 204 as no dump and keeps Restore disabled", async () => {
    const node = line();
    const restoreBtn = btn();
    const hud = mountPersistHud({
      el: node,
      btnEl: restoreBtn,
      fetch: async () => ({
        ok: true,
        status: 204,
        json: async () => {
          throw new Error("no body");
        },
      }),
    });
    mounted.push(hud);
    await Promise.resolve();
    await Promise.resolve();
    expect(node.textContent).toBe(IDLE_LINE);
    expect(restoreBtn.disabled).toBe(true);
  });

  it("POSTs /api/persist/restore and labels the result PAPER", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const node = line();
    const restoreBtn = btn();
    const cash = { textContent: "Cash $0" };
    const status = { textContent: "" };
    const hud = mountPersistHud({
      el: node,
      btnEl: restoreBtn,
      cashEl: cash,
      statusEl: status,
      fetch: async (url: string, init?: RequestInit) => {
        calls.push({ url: String(url), init });
        if (String(url) === "/api/persist/restore") {
          return { ok: true, status: 200, json: async () => RESTORE_OK };
        }
        return { ok: true, status: 200, json: async () => DUMP };
      },
    });
    mounted.push(hud);
    await Promise.resolve();
    await Promise.resolve();
    expect(restoreBtn.disabled).toBe(false);

    restoreBtn.click();
    await vi.waitFor(() =>
      expect(node.textContent).toBe("PAPER · SIMULATED · restored · tick 12 · $777"),
    );

    const post = calls.find((c) => c.url === "/api/persist/restore");
    expect(post?.init?.method).toBe("POST");
    expect(cash.textContent).toBe("Cash $777");
    expect(status.textContent).toMatch(/PAPER/);
    expect(status.textContent).toMatch(/Does not restart play/);
    expect(status.textContent.toLowerCase()).not.toContain("wallet");
  });

  it("keeps restored on the sheet after the next dump poll (`/g/persist109`)", async () => {
    vi.useFakeTimers();
    const node = line();
    const restoreBtn = btn();
    const hud = mountPersistHud({
      el: node,
      btnEl: restoreBtn,
      cashEl: { textContent: "Cash $0" },
      statusEl: { textContent: "" },
      fetch: async (url: string, init?: RequestInit) => {
        if (String(url) === "/api/persist/restore") {
          return { ok: true, status: 200, json: async () => RESTORE_OK };
        }
        return { ok: true, status: 200, json: async () => DUMP };
      },
    });
    mounted.push(hud);
    await Promise.resolve();
    await Promise.resolve();
    restoreBtn.click();
    await vi.waitFor(() =>
      expect(node.textContent).toBe("PAPER · SIMULATED · restored · tick 12 · $777"),
    );
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(node.textContent).toBe("PAPER · SIMULATED · restored · tick 12 · $777");
  });

  it("does not POST restore when GET /api/persist is empty", async () => {
    const urls: string[] = [];
    const restoreBtn = btn();
    const hud = mountPersistHud({
      el: line(),
      btnEl: restoreBtn,
      fetch: async (url: string) => {
        urls.push(String(url));
        return { ok: true, status: 204, json: async () => null };
      },
    });
    mounted.push(hud);
    await Promise.resolve();
    await Promise.resolve();
    restoreBtn.click();
    await Promise.resolve();
    expect(urls.every((u) => u === "/api/persist")).toBe(true);
    expect(restoreBtn.disabled).toBe(true);
  });

  it("polls about once a second", async () => {
    vi.useFakeTimers();
    let n = 0;
    const hud = mountPersistHud({
      el: line(),
      btnEl: btn(),
      fetch: async (url: string) => {
        n += 1;
        expect(url).toBe("/api/persist");
        return { ok: true, status: 200, json: async () => DUMP };
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

  it("does not throw when the sheet hook is missing", () => {
    expect(() => mountPersistHud({ el: null, btnEl: null })).not.toThrow();
    expect(() => mountPersistHud({})).not.toThrow();
  });
});
