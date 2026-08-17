import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync(new URL("../public/harbour/index.html", import.meta.url), "utf8");

describe("harbour chrome HUD", () => {
  it("ships the corner chrome, not a handheld-cart sheet as the main UI", () => {
    expect(html).toContain('class="game-name"');
    expect(html).toContain("Two Harbors");
    expect(html).toContain('data-overlay="foot"');
    expect(html).toContain('id="viewers"');
    expect(html).toContain('id="viewer-hint"');
    expect(html).toContain('data-panel="inventory"');
    expect(html).toContain('data-panel="market"');
    expect(html).toContain('data-panel="employees"');
    expect(html).toContain('id="chrome"');
    expect(html).toContain("South port");
    expect(html).toContain('id="cart">PAPER<');
    expect(html).not.toContain('data-panel="tutorials"');
    expect(html).not.toContain("Tutorials");
    expect(html).not.toContain("script-coach");
  });
});
