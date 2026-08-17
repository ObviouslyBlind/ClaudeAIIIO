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
    expect(src).toContain('import("./taxi.js")');
    expect(src).not.toContain("await loadDressing(");
    expect(src).toContain("void loadDressing()");
    expect(src).toContain("SPAWN_PARCEL_M = 420");
    expect(src).toContain('p.band !== "street"');
    expect(src).toContain("STARTER_SNAP_M = 40");
    // Ferry landfall: south terrain/port/lots build on first spawnAt there.
    expect(src).toContain("function ensureIsland");
    expect(src).toMatch(/function spawnAt\(id\) \{\s*ensureIsland\(id\);/);
    expect(src).toMatch(/builtIslands\.add\("north"\)/);
    // Tapping the pier/shed/dock must reach the ferry (portHit).
    expect(src).toContain("for (const p of ports) objs.push(p);");
    expect(src).toContain("ports.push(pier);");
    expect(src).toContain("DRESSING_AFTER_WALK_MS = 45000");
    expect(src).toContain("DRESSING_FALLBACK_MS = 120000");
    expect(src).toContain("scheduleDressing(DRESSING_AFTER_WALK_MS)");
    expect(src).toContain("scheduleDressing(DRESSING_FALLBACK_MS)");
    expect(src).not.toContain("DRESSING_AFTER_CLICK_MS");
    expect(src).not.toMatch(/void loadDressing\(\);\s*\}, 400\)/);
    expect(src).toContain("clickTargets()");
    expect(src).not.toContain("intersectObjects(root.children, true)");
    const dressing = src.slice(src.indexOf("async function loadDressing"), src.indexOf("async function boot"));
    expect(dressing).not.toContain("ensureInterior");
    expect(dressing).not.toContain("ensureCatalog");
    expect(dressing).not.toContain("./trees.js");
    expect(dressing).not.toContain("./stalls.js");
    expect(dressing).not.toContain("./street-props.js");
    expect(dressing).not.toContain("./pedestrians.js");
    expect(dressing).not.toContain('makeTerrain(specOf("south")');
  });
});
