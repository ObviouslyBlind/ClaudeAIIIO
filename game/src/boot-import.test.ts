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
    expect(src).toMatch(/builtIslands\.add\("south"\)/);
    // Tapping the pier/shed/dock must reach the ferry (portHit).
    expect(src).toContain("for (const p of ports) objs.push(p);");
    expect(src).toContain("ports.push(pier);");
    // D040/D041: no burst dressing timer. Decoration trickles back one
    // module per step and pauses while the player is clicking.
    expect(src).not.toContain("loadDressing");
    expect(src).not.toContain("scheduleDressing");
    expect(src).not.toContain("DRESSING_AFTER_WALK_MS");
    expect(src).not.toContain("DRESSING_FALLBACK_MS");
    expect(src).toContain("TRICKLE_START_MS = 8000");
    expect(src).toContain("TRICKLE_STEP_MS = 2500");
    expect(src).toContain("TRICKLE_CLICK_QUIET_MS = 1500");
    expect(src).toContain("while (Date.now() - lastTap < TRICKLE_CLICK_QUIET_MS)");
    expect(src).toContain('import("./traffic.js")');
    expect(src).toContain('import("./ferry.js")');
    // /g/south101 froze during a 60 s idle while quay clutter and foam
    // built. They stay off live play until they load off the main thread.
    expect(src).not.toContain('import("./quay.js")');
    expect(src).not.toContain('import("./shore.js")');
    expect(src).not.toContain('import("./trees.js")');
    expect(src).not.toContain('import("./stalls.js")');
    expect(src).not.toContain('import("./pedestrians.js")');
    expect(src).not.toContain('import("./street-props.js")');
    expect(src).toContain("void loadSheetHuds();");
    expect(src).toContain("void loadTrickleDressing();");
    const trickle = src.slice(
      src.indexOf("async function loadTrickleDressing"),
      src.indexOf("async function boot"),
    );
    const steps = trickle.split("await quietStep();").length - 1;
    expect(steps).toBeGreaterThanOrEqual(4);
    expect(src).toContain("function showLandCard");
    expect(src).toContain("function buyPlot");
    expect(src).toContain("function askToBuy");
    expect(src).toContain("mountLotTags");
    expect(src).toContain("parcel-label");
    expect(src).toContain("pickLabel");
    expect(src).toContain("Never auto-open a lot card");
    expect(src).toContain("function dismissLooseLandUi");
    expect(src).not.toContain('const hint = document.getElementById("viewer-hint")');
    expect(src).toContain('viewer === "lots" && tapPt');
    expect(src).not.toContain('viewer === "world" || viewer === "lots"');
    expect(src).toContain("clickTargets()");
    expect(src).not.toContain("function inspectLandAt");
    expect(src).not.toContain("intersectObjects(root.children, true)");
  });
});
