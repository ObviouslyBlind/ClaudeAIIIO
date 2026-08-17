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
    expect(src).toContain("SPAWN_PARCEL_M = 420");
    expect(src).toContain('p.band !== "street"');
    expect(src).toContain("STARTER_SNAP_M = 40");
    // Ferry landfall: south terrain/port/lots build on first spawnAt there.
    expect(src).toContain("async function ensureIsland");
    expect(src).toMatch(/function spawnAt\(id\) \{\s*void ensureIsland\(id\);/);
    expect(src).toMatch(/builtIslands\.add\("north"\)/);
    // Tapping the pier/shed/dock must reach the ferry (portHit).
    expect(src).toContain("for (const p of ports) objs.push(p);");
    expect(src).toContain("ports.push(pier);");
    // D040: no delayed dressing. The 45 s / 120 s timer compiled quay/ferry/
    // traffic mid-session and froze the tab (/g/south99, operator playtest).
    expect(src).not.toContain("loadDressing");
    expect(src).not.toContain("scheduleDressing");
    expect(src).not.toContain("DRESSING_AFTER_WALK_MS");
    expect(src).not.toContain("DRESSING_FALLBACK_MS");
    expect(src).not.toContain('import("./quay.js")');
    expect(src).not.toContain('import("./ferry.js")');
    expect(src).not.toContain('import("./traffic.js")');
    expect(src).not.toContain('import("./trees.js")');
    expect(src).toContain("void loadSheetHuds();");
    expect(src).toContain("clickTargets()");
    expect(src).not.toContain("intersectObjects(root.children, true)");
  });
});
