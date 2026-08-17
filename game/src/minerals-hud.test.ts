import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  IDLE_LINE,
  formatMineralsBody,
  formatMineralsLine,
  mountMineralsHud,
} from "../public/harbour/minerals-hud.js";
import { crumbs, createMenuStack, popMenu, pushMenu } from "../public/harbour/menu-stack.js";

const CATALOG = {
  mode: "PAPER",
  provenance: "SIMULATED",
  catalog: [
    {
      id: "ore",
      label: "Ore",
      goodId: "ore",
      fair0: 8,
      note: "South inland fields carry most deposits.",
    },
  ],
  deposits: [{ plotId: "south-field-1", island: "south", mineral: "ore", x: 0, z: 8000 }],
  held: { ore: 2 },
};

const mounted: Array<{ stop: () => void }> = [];

afterEach(() => {
  for (const hud of mounted) hud.stop();
  mounted.length = 0;
});

describe("harbour PAPER minerals HUD", () => {
  it("lists ore as the in-game mineral, labelled PAPER", () => {
    expect(formatMineralsLine(null)).toBe(IDLE_LINE);
    expect(formatMineralsLine(CATALOG)).toBe("PAPER · SIMULATED · Ore · 1 deposits · held 2");
    expect(formatMineralsBody(CATALOG)).toMatch(/Ore/);
    expect(formatMineralsBody(CATALOG)).toMatch(/1 deposits/);
    expect(formatMineralsLine(CATALOG).toLowerCase()).not.toContain("wallet");
  });

  it("ships a Minerals first-frame line and dock button", () => {
    const html = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../public/harbour/index.html"),
      "utf8",
    );
    expect(html).toMatch(/id="minerals">PAPER · SIMULATED · Minerals —</);
    expect(html).toMatch(/id="btn-minerals"/);
    expect(html).toMatch(/id="menu-stack"/);
  });

  it("polls GET /api/minerals and can open a stacked minerals frame", async () => {
    const node = { textContent: IDLE_LINE, setAttribute() {} };
    const opened: unknown[] = [];
    const hud = mountMineralsHud({
      el: node,
      btnEl: null,
      openMenu: (frame: unknown, html: string) => {
        opened.push({ frame, html });
      },
      fetch: async () => ({ ok: true, json: async () => CATALOG }),
    });
    mounted.push(hud);
    await Promise.resolve();
    await Promise.resolve();
    expect(node.textContent).toBe("PAPER · SIMULATED · Ore · 1 deposits · held 2");
    hud.open();
    expect(opened).toHaveLength(1);
  });
});

describe("harbour menu stack", () => {
  it("nests minerals under inspect and pops back to harbour", () => {
    const stack = createMenuStack();
    pushMenu(stack, { id: "inspect", title: "Plot", plotId: "north-street-0" });
    pushMenu(stack, { id: "minerals", title: "Minerals" });
    expect(crumbs(stack)).toEqual(["Harbour", "Plot", "Minerals"]);
    expect(popMenu(stack).id).toBe("inspect");
    expect(popMenu(stack).id).toBe("root");
  });
});
