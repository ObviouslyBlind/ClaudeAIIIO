import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync(new URL("../public/harbour/index.html", import.meta.url), "utf8");
const chrome = readFileSync(new URL("../public/harbour/chrome.js", import.meta.url), "utf8");

describe("harbour chrome HUD", () => {
  it("ships the corner chrome, not a handheld-cart sheet as the main UI", () => {
    expect(html).toContain('class="game-name"');
    expect(html).toContain("Two Harbors");
    expect(html).toContain('data-overlay="lots"');
    expect(html).toContain('data-overlay="foot"');
    expect(html).toContain('id="viewers"');
    expect(html).toContain('id="viewer-hint"');
    expect(html).toContain('id="foot-legend"');
    expect(html).toContain('data-panel="inventory"');
    expect(html).toContain('data-panel="market"');
    expect(html).toContain('data-panel="employees"');
    expect(html).toContain('id="chrome"');
    expect(html).toContain('id="buy-ask"');
    expect(html).toContain('id="lot-tags"');
    expect(html).toContain("Click again to hide");
    expect(html).not.toContain("first loop");
    expect(html).toContain('id="cart">PAPER<');
    expect(html).not.toContain('data-panel="tutorials"');
    expect(html).not.toContain("Tutorials");
    expect(html).not.toContain("script-coach");
  });

  it("lease card and buy-ask ask before a lot is bought", () => {
    expect(chrome).toContain("plotDisplayName");
    expect(chrome).toContain("buyAskModel");
    expect(chrome).toContain("toggleViewer");
    expect(chrome).toContain("paintBuyAsk");
    expect(chrome).toContain('id="buy-ask-yes"');
    expect(chrome).toContain('id="buy-ask-no"');
    expect(chrome).toContain('id="land-lease"');
    expect(chrome).toContain('id="land-close"');
    expect(chrome).toContain("onCloseLand");
    expect(chrome).toContain("PAPER");
  });

  it("walks the marketplace aisle → sku → deliver, and chirps on buy", () => {
    expect(chrome).toContain("data-aisle");
    expect(chrome).toContain("Deliver to");
    expect(chrome).toContain("playPaperBuy");
    expect(chrome).toContain("data-aisle");
    expect(chrome).toContain("marketplace");
    expect(chrome).not.toContain("first loop");
  });
});
