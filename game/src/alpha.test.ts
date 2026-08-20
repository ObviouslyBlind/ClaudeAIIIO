import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { ALPHA_PLAY_WIPE, ALPHA_WIPE_NOTE, alphaRestoreBlocked, alphaRestoreRefuse } from "./alpha.ts";

const claude = readFileSync(new URL("../../CLAUDE.md", import.meta.url), "utf8");
const foundation = readFileSync(new URL("../FOUNDATION.md", import.meta.url), "utf8");
const main = readFileSync(new URL("../public/harbour/main.js", import.meta.url), "utf8");
const server = readFileSync(new URL("./server.ts", import.meta.url), "utf8");

describe("alpha harbour spawn wipe", () => {
  it("keeps the wipe rule in play docs", () => {
    expect(ALPHA_PLAY_WIPE).toBe(true);
    expect(alphaRestoreBlocked()).toBe(true);
    expect(ALPHA_WIPE_NOTE).toMatch(/fresh visitor/);
    expect(ALPHA_WIPE_NOTE).toMatch(/PAPER/);
    expect(claude).toMatch(/Alpha wipe/);
    expect(claude).toMatch(/fresh visitor/);
    expect(foundation).toMatch(/Alpha wipe/);
    expect(foundation).toMatch(/restore/);
  });

  it("refuses PAPER restore during alpha", () => {
    const refused = alphaRestoreRefuse();
    expect(refused.ok).toBe(false);
    expect(refused.reason).toBe("alpha_wipe");
    expect(refused.mode).toBe("PAPER");
    expect(refused.provenance).toBe("SIMULATED");
    expect(server).toContain("alphaRestoreRefuse");
    expect(server).toContain("ALPHA_PLAY_WIPE");
  });

  it("wipes the visitor before the harbour map loads", () => {
    const resetAt = main.indexOf('"/api/play/reset"');
    const mapAt = main.indexOf('"/api/map"');
    expect(resetAt).toBeGreaterThan(0);
    expect(mapAt).toBeGreaterThan(resetAt);
  });
});
