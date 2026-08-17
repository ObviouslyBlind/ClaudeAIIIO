import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatPresenceLine,
  mountPresenceHud,
  POLL_MS,
  presenceUrl,
  xzOf,
} from "../public/harbour/presence-hud.js";

const SNAPSHOT = {
  mode: "PAPER",
  provenance: "SIMULATED",
  cellSize: 250,
  actors: [
    { id: "npc:nell", name: "Nell Palmetto" },
    { id: "npc:tomas", name: "Tomas Crane" },
    { id: "npc:isla", name: "Isla Bollard" },
    { id: "npc:reed", name: "Reed Cart" },
  ],
};

function el(text = "PAPER · SIMULATED · 250 m PAPER cell · — nearby") {
  return { textContent: text, setAttribute() {} };
}

const mounted: Array<{ stop: () => void }> = [];

afterEach(() => {
  for (const hud of mounted) hud.stop();
  mounted.length = 0;
  vi.useRealTimers();
});

describe("harbour PAPER nearby strip", () => {
  it("keeps PAPER · SIMULATED · cell · N nearby on one line", () => {
    const line = formatPresenceLine(SNAPSHOT);
    expect(line).toBe("PAPER · SIMULATED · 250 m PAPER cell · 4 nearby");
    expect(line.includes("\n")).toBe(false);
    expect(formatPresenceLine(null)).toBe("PAPER · SIMULATED · 250 m PAPER cell · — nearby");
    expect(formatPresenceLine({ mode: "PAPER", provenance: "SIMULATED", actors: [] })).toBe(
      "PAPER · SIMULATED · 250 m PAPER cell · 0 nearby",
    );
  });

  it("omits origin 0,0 so the server defaults to the north quay", () => {
    expect(xzOf(() => ({ x: 0, y: 1.15, z: 0 }))).toBeNull();
    expect(xzOf(() => ({ x: 0, y: 1.15, z: -6958 }))).toEqual({ x: 0, z: -6958 });
    expect(presenceUrl(null)).toBe("/api/presence");
    expect(presenceUrl({ x: 0, z: -6958 })).toBe("/api/presence?x=0&z=-6958");
  });

  it("does not clobber the first-frame PAPER line before presence returns", async () => {
    const node = el();
    let url = "";
    const hud = mountPresenceHud({
      el: node,
      getPos: () => ({ x: 0, y: 0, z: 0 }),
      fetch: async (href: string) => {
        url = href;
        return { ok: true, json: async () => SNAPSHOT };
      },
    });
    mounted.push(hud);
    expect(node.textContent).toBe("PAPER · SIMULATED · 250 m PAPER cell · — nearby");
    await Promise.resolve();
    await Promise.resolve();
    expect(url).toBe("/api/presence");
    expect(node.textContent).toBe("PAPER · SIMULATED · 250 m PAPER cell · 4 nearby");
  });

  it("polls about once a second with spawn xz after spawnAt", async () => {
    vi.useFakeTimers();
    const urls: string[] = [];
    const pos = { x: 0, y: 2.27, z: 0 };
    const node = el();
    const hud = mountPresenceHud({
      el: node,
      getPos: () => pos,
      fetch: async (href: string) => {
        urls.push(href);
        return { ok: true, json: async () => SNAPSHOT };
      },
    });
    mounted.push(hud);
    await Promise.resolve();
    expect(urls).toEqual(["/api/presence"]);
    pos.z = -6958;
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(urls[1]).toBe("/api/presence?x=0&z=-6958");
  });
});

describe("first-frame nearby placeholder", () => {
  it("ships a PAPER nearby line and classic /api/presence fetch, not Nearby —", () => {
    const html = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../public/harbour/index.html"),
      "utf8",
    );
    expect(html).toMatch(
      /id="nearby">PAPER · SIMULATED · 250 m PAPER cell · — nearby</,
    );
    expect(html).not.toMatch(/id="nearby">Nearby/);
    expect(html).toContain('fetch("/api/presence")');
  });
});
