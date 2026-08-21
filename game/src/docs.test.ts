import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function md(rel: string) {
  return readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
}

describe("documentation library", () => {
  it("keeps a mid-alpha handbook at docs/README.md", () => {
    const index = md("docs/README.md");
    expect(index).toContain("# 2Isles documentation");
    expect(index).toContain("Mid-alpha");
    expect(index).toContain("[HANDOVER.md](HANDOVER.md)");
    expect(index).toContain("[PLAY.md](PLAY.md)");
    expect(index).toContain("[../PLAN.md](../PLAN.md)");
    expect(index).toContain("[../ECONOMY.md](../ECONOMY.md)");
    expect(index).toContain("[../FOUNDATION.md](../FOUNDATION.md)");
    expect(index).toContain("[../BACKEND.md](../BACKEND.md)");
    expect(index).toContain("[UNITS.md](UNITS.md)");
    expect(index).toContain("[VERSION.md](VERSION.md)");
  });

  it("versions the shard from alpha 0.5 and always hands over", () => {
    const version = md("docs/VERSION.md");
    expect(version).toContain("# 2Isles version");
    expect(version).toContain("buildings push");
    expect(version).not.toMatch(/0\.5\.2/);
    expect(version).toContain("Beta");
    expect(version).toContain("1.0");
    expect(version).toContain("HANDOVER.md");
    const units = md("docs/UNITS.md");
    expect(units).toContain("Accepted spec");
    expect(units).toContain("Blender");
    expect(units).toContain("dollhouse");
    expect(units).toContain("RMB-hold orbit");
    expect(units).not.toMatch(/Not a dollhouse orbit/);
    expect(units).not.toMatch(/Do not implement until this file is accepted/);
  });

  it("handover names the live loop and does not unfreeze politics", () => {
    const handover = md("docs/HANDOVER.md");
    expect(handover).toContain("2Isles");
    expect(handover).toContain("Mid-alpha");
    expect(handover).toContain("PAPER / SIMULATED");
    expect(handover).toContain("trycloudflare.com");
    expect(handover).toContain("Politics frozen");
    expect(handover).toContain("inventory only");
    expect(handover).toContain("VERSION.md");
    expect(handover).toContain("buildings push");
    expect(handover).toContain("Blender");
    expect(handover).not.toMatch(/House \/ Senate .* this slice/i);
  });

  it("play loop carries current starter prices", () => {
    const play = md("docs/PLAY.md");
    expect(play).toContain("$10,000");
    expect(play).toContain("$750");
    expect(play).toContain("$90");
    expect(play).toContain("8%");
    expect(play).toContain("$180");
    expect(play).not.toContain("20%");
  });

  it("old paths redirect into docs/", () => {
    expect(md("CARTS.md")).toContain("docs/PLAY.md");
    expect(md("ROADMAP.md")).toContain("docs/HANDOVER.md");
    expect(md("reports/FIRST_LOOP.md")).toContain("../docs/PLAY.md");
    expect(md("reports/HANDOVER.md")).toContain("../docs/HANDOVER.md");
  });
});
