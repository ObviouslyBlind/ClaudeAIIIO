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
  });
});
