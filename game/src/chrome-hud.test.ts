import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { formatCartsBody } from "../public/harbour/carts-hud.js";

const html = readFileSync(new URL("../public/harbour/index.html", import.meta.url), "utf8");
const chrome = readFileSync(new URL("../public/harbour/chrome.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../public/harbour/chrome.css", import.meta.url), "utf8");
const pageCss = readFileSync(new URL("../public/harbour/style.css", import.meta.url), "utf8");
const fonts = readFileSync(new URL("../public/harbour/chrome-fonts.css", import.meta.url), "utf8");
const pack = readFileSync(new URL("../public/harbour/pack.js", import.meta.url), "utf8");
const carts = readFileSync(new URL("../public/harbour/carts-hud.js", import.meta.url), "utf8");

describe("harbour chrome HUD", () => {
  it("keeps launchers on the left rail, not a Menu on the travel dock", () => {
    expect(html).toContain('class="game-name"');
    expect(html).toContain("Two Harbors");
    expect(html).toContain('class="chrome-tl"');
    expect(html).toContain('class="chrome-tr"');
    expect(html).toContain('class="chrome-left"');
    expect(html).toContain('id="viewers"');
    expect(html).toContain('data-overlay="lots"');
    expect(html).toContain('data-overlay="foot"');
    expect(html).not.toContain('data-panel="view"');
    expect(html).not.toContain('id="panel-view"');
    expect(html).toContain('data-panel="account"');
    expect(html).toContain("You");
    const chips = html.slice(html.indexOf('id="viewers"'), html.indexOf('id="panel-account"'));
    expect(chips).toContain('data-overlay="lots"');
    expect(chips).toContain('data-overlay="foot"');
    expect(chips).not.toContain("Leaderboard");
    const tr = html.slice(html.indexOf('class="chrome-tr"'), html.indexOf('class="chrome-left"'));
    expect(tr).toContain('id="panel-account"');
    expect(tr).toContain('id="foot-legend"');
    expect(html).toContain('data-panel="inventory"');
    expect(html).toContain('data-panel="warehouse"');
    expect(html).toContain('data-panel="market"');
    expect(html).toContain('data-panel="employees"');
    expect(html).toContain('aria-label="Carts"');
    expect(html).toContain('id="panel-inventory"');
    expect(html).toContain('id="place-hint"');
    expect(html).toContain('id="place-cancel"');
    expect(html).toContain('id="taxi-map-exit"');
    expect(html).toContain("Keep riding");
    expect(html).toContain('id="chrome"');
    expect(html).toContain('id="stand-veil"');
    expect(html).toContain('id="stand-menu"');
    expect(chrome).toContain('data-stock="inventory"');
    expect(html).toContain('id="buy-ask"');
    expect(html).toContain('id="lot-tags"');
    expect(html).toContain('id="storage-fee"');
    expect(html).toContain('id="pack-shift"');
    expect(html).not.toContain('id="btn-menu"');
    expect(html).not.toContain('id="btn-pack"');
    expect(html).not.toContain('id="cart-line"');
    expect(html).not.toContain("harbour-sheet");
    expect(html).not.toContain("btn-harbour");
    expect(html).not.toContain("first loop");
    expect(html).not.toContain("Tutorials");
    expect(css).toContain(".chrome-tl");
    expect(css).toContain(".chrome-tr");
    expect(css).toContain(".chrome-left");
    expect(css).toContain("pos-inv");
    expect(css).toContain(".cart-need");
    expect(css).toMatch(/max-height:\s*min\(62vh/);
    expect(css).toContain("overflow: hidden");
    expect(css).toContain("flex-wrap: nowrap");
    expect(pageCss).toContain("100dvh");
    expect(pageCss).toContain("overscroll-behavior: none");
    expect(pageCss).toContain("position: fixed");
    expect(css).toContain("Big Shoulders Display");
    expect(css).toContain("Red Hat Text");
    expect(css).toContain('font-weight: 700');
    expect(css).toContain("translate(-50%, -50%)");
    expect(css).not.toContain("Fraunces");
    expect(css).not.toContain("Figtree");
    expect(html).toContain("chrome-fonts.css");
    expect(fonts).toContain("data:font/woff2");
    expect(html).toContain("cash-plate");
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
    expect(chrome).toContain('data-stock="warehouse"');
    expect(chrome).toContain("data-hire-person");
    expect(chrome).toContain("place-cancel");
    expect(chrome).toContain("today-price");
    expect(chrome).toContain("stock-ticks");
    expect(chrome).toContain('type="range"');
    expect(chrome).toContain("Warehouse");
    expect(chrome).not.toContain("data-pin");
    expect(chrome).not.toContain("Run it myself");
  });

  it("opens the carts submenu from the left rail with hire, stock, sticker, fridge, pack", () => {
    expect(chrome).toContain("formatCartsBody");
    expect(chrome).toContain("Stock cart");
    expect(chrome).toContain("Twelve goods");
    expect(chrome).toContain("/api/buy");
    expect(chrome).toContain("/api/shift/pack");
    expect(chrome).toContain("dest: marketDest === \"cart\" ? \"cart\" : \"warehouse\"");
    expect(chrome).not.toContain("openPlayMenu");
    expect(chrome).not.toContain("← Marketplace");
    expect(chrome).not.toContain("data-aisle");
    expect(chrome).not.toContain("first loop");
    expect(carts).toContain("Carts do not sell without staff");
    expect(carts).toContain("today's price");
    expect(carts).toContain("Fridge · $200");
    expect(carts).toContain("data-pack-start");
    expect(carts).toContain('type="number"');
    expect(pack).toContain("PACK_SECONDS");
    expect(pack).toContain("pack-good");
    const body = formatCartsBody({
      todayPrice: 5,
      cartNeeds: [{ id: "hire", label: "Hire a vendor. Carts do not sell without staff." }],
      inventory: [{ kind: "hotdog_cart", qty: 1 }],
      cart: [],
      stands: [],
      warehouse: { items: [] },
      hireRoster: [{ id: "pat", name: "Pat K.", suggest: "A $200 fridge would hold more stock through the weekend." }],
    });
    expect(body).toMatch(/Hire a vendor/);
    expect(body).toMatch(/\$5\.00 is today's price/);
    expect(body).toMatch(/data-place/);
  });
});
