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
    expect(html).toContain('id="place-hint"');
    expect(html).toContain('id="place-cancel"');
    expect(html).toContain('id="taxi-map-exit"');
    expect(html).toContain("Keep riding");
    expect(html).toContain('data-panel="inventory"');
    expect(html).toContain('data-panel="warehouse"');
    expect(html).toContain('data-panel="market"');
    expect(html).toContain('data-panel="employees"');
    expect(html).toContain('id="chrome"');
    expect(html).toContain('id="buy-ask"');
    expect(html).toContain('id="lot-tags"');
    expect(html).toContain('id="storage-fee"');
    expect(html).toContain("Click again to hide");
    expect(html).not.toContain("first loop");
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
    expect(chrome).toContain("landCard.hidden = true");
    expect(chrome).toContain("extras.onTake()");
    expect(chrome).toContain("data-place");
    expect(chrome).toContain("data-stock");
    expect(chrome).toContain("data-hire-person");
    expect(chrome).toContain("place-cancel");
    expect(chrome).toContain("today-price");
    expect(chrome).toContain("Store in warehouse");
    expect(chrome).toContain("data-pin");
    expect(chrome).not.toContain("Run it myself");
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
