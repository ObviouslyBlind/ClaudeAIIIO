import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("harbour boot import graph", () => {
  it("does not statically import the heavy interior/trees/stalls graph", () => {
    const src = readFileSync(new URL("../public/harbour/main.js", import.meta.url), "utf8");
    const banned = [
      "./interior.js",
      "./trees.js",
      "./stalls.js",
      "./taxi.js",
      "./pedestrians.js",
      "./street-props.js",
      "./quay.js",
      "./buildings.js",
      "./ferry.js",
      "./factory.js",
    ];
    for (const spec of banned) {
      expect(src).not.toMatch(new RegExp(`from ["']${spec.replace(".", "\\.")}["']`));
    }
    expect(src).toContain('from "./harbour-world.js"');
    expect(src).toContain('import("./interior.js")');
    expect(src).not.toContain("await loadDressing(");
    expect(src).toContain("void loadDressing()");
    expect(src).toContain("SPAWN_PARCEL_M = 420");
    const dressing = src.slice(src.indexOf("async function loadDressing"), src.indexOf("async function boot"));
    expect(dressing).not.toContain("ensureInterior");
    expect(dressing).not.toContain("ensureCatalog");
  });
});
