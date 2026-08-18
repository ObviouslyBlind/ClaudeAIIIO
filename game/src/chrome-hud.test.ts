import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync(new URL("../public/harbour/index.html", import.meta.url), "utf8");
const chrome = readFileSync(new URL("../public/harbour/chrome.js", import.meta.url), "utf8");

describe("harbour chrome HUD", () => {
  it("ships one dusk-glass ledger, not a stack of floating panels", () => {
    expect(html).toContain('class="game-name"');
    expect(html).toContain("Two Harbors");
    expect(html).toContain('id="harbour-sheet"');
    expect(html).toContain('id="btn-harbour"');
    expect(html).toContain('data-chapter="market"');
    expect(html).toContain('data-chapter="warehouse"');
    expect(html).toContain('data-chapter="carts"');
    expect(html).toContain('data-chapter="map"');
    expect(html).toContain('data-overlay="lots"');
    expect(html).toContain('data-overlay="foot"');
    expect(html).toContain('id="viewers"');
    expect(html).toContain('id="place-hint"');
    expect(html).toContain('id="place-cancel"');
    expect(html).toContain('id="taxi-map-exit"');
    expect(html).toContain("Keep riding");
    expect(html).toContain('id="chrome"');
    expect(html).toContain('id="buy-ask"');
    expect(html).toContain('id="lot-tags"');
    expect(html).toContain('id="storage-fee"');
    expect(html).not.toContain("first loop");
    expect(html).not.toContain("float-panel");
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
    expect(chrome).not.toContain("data-pin");
    expect(chrome).not.toContain("Run it myself");
  });

  it("walks the marketplace aisle → sku → warehouse or van, and chirps on buy", () => {
    expect(chrome).toContain("data-aisle");
    expect(chrome).toContain("Deliver to");
    expect(chrome).toContain("playPaperBuy");
    expect(chrome).toContain("marketplace");
    expect(chrome).not.toContain("first loop");
  });
});
