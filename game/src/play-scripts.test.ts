import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("laptop play scripts", () => {
  it("exposes npm run play:laptop and a repo-root play.sh", () => {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    expect(pkg.scripts.play).toBe("tsx src/server.ts");
    expect(pkg.scripts["play:laptop"]).toContain("scripts/play.sh --public");
    const sh = readFileSync(new URL("../scripts/play.sh", import.meta.url), "utf8");
    expect(sh).toContain("trycloudflare");
    expect(sh).toContain("PORT:-8787");
    const root = readFileSync(new URL("../../play.sh", import.meta.url), "utf8");
    expect(root).toContain("game/scripts/play.sh");
  });
});
