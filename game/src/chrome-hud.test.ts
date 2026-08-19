import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { formatCartsBody } from "../public/harbour/carts-hud.js";
import { formatSiteMenu } from "../public/harbour/site-menu.js";

const html = readFileSync(new URL("../public/harbour/index.html", import.meta.url), "utf8");
const chrome = readFileSync(new URL("../public/harbour/chrome.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../public/harbour/chrome.css", import.meta.url), "utf8");
const pageCss = readFileSync(new URL("../public/harbour/style.css", import.meta.url), "utf8");
const fonts = readFileSync(new URL("../public/harbour/chrome-fonts.css", import.meta.url), "utf8");
const pack = readFileSync(new URL("../public/harbour/pack.js", import.meta.url), "utf8");
const carts = readFileSync(new URL("../public/harbour/carts-hud.js", import.meta.url), "utf8");
const siteMenu = readFileSync(new URL("../public/harbour/site-menu.js", import.meta.url), "utf8");

describe("harbour chrome HUD", () => {
  it("keeps launchers on the left rail, not a Menu on the travel dock", () => {
    expect(html).toContain('class="game-name"');
    expect(html).toContain("Two Harbors");
    expect(html).toContain('class="chrome-tl"');
    expect(html).toContain('class="chrome-tr"');
    expect(html).toContain('class="chrome-left"');
    expect(html).toContain('id="viewers"');
    expect(html).toContain('id="near-lease">Buy lot');
    expect(html).toContain("is-buy-lot");
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
    expect(siteMenu).toContain('data-stock="inventory"');
    expect(html).toContain('id="buy-ask"');
    expect(html).toContain('id="crate-ask"');
    expect(html).toContain('id="pack-hint"');
    expect(html).toContain('id="order-ask"');
    expect(html).toContain('id="order-veil"');
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
    expect(css).toContain(".sku-buy");
    expect(css).toContain("#crate-ask");
    expect(css).toContain(".buy-loc");
    expect(css).toMatch(/max-height:\s*min\(62vh/);
    expect(css).toContain("overflow-x: hidden");
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
    expect(chrome).toContain("onNearLease");
    expect(chrome).toContain('getElementById("near-lease")');
    expect(css).toContain(".chip.is-buy-lot");
    expect(chrome).toContain('id="buy-ask-yes"');
    expect(chrome).toContain('id="buy-ask-no"');
    expect(chrome).toContain('id="land-lease"');
    expect(chrome).toContain('id="land-close"');
    expect(chrome).toContain("onCloseLand");
    expect(chrome).toContain("landCard.hidden = true");
    expect(chrome).toContain("extras.onTake()");
    expect(chrome).toContain("data-place");
    expect(chrome).toContain("data-stock");
    expect(siteMenu).toContain('data-stock="warehouse"');
    expect(siteMenu).toContain("data-hire-site");
    expect(siteMenu).toContain("data-site-tab=");
    expect(siteMenu).toContain('id: "stock"');
    expect(siteMenu).toContain('id: "run"');
    expect(siteMenu).toContain('id: "upgrades"');
    expect(siteMenu).toContain('id: "stats"');
    expect(chrome).not.toContain("data-hire-person");
    expect(chrome).toContain("place-cancel");
    expect(siteMenu).toContain("sticker-mark");
    expect(siteMenu).toContain("sticker-zone");
    expect(siteMenu).toContain("sticker-band");
    expect(siteMenu).toContain("stock-num");
    expect(siteMenu).toContain('type="range"');
    expect(chrome).toContain("Warehouse");
    expect(chrome).toContain("paintCrateAsk");
    expect(chrome).toContain("buy-loc");
    expect(siteMenu).toContain("On you");
    expect(siteMenu).not.toContain("Pockets");
    expect(chrome).not.toContain("Stock cart");
    expect(chrome).not.toContain("data-pin");
    expect(chrome).not.toContain("Run it myself");
  });

  it("keeps Carts as a directory; hire, train, stock, sticker, fridge live on that cart", () => {
    expect(chrome).toContain("formatCartsBody");
    expect(carts).toContain("On you");
    expect(carts).not.toContain("Pockets");
    expect(chrome).toContain("Twelve goods");
    expect(chrome).toContain("/api/buy");
    expect(chrome).toContain("/api/shift/pack");
    expect(chrome).toContain('let marketDest = "road"');
    expect(chrome).toContain("Yellow van from the port.");
    expect(chrome).toContain("order-label");
    expect(chrome).toContain("dest: marketDest === \"road\" ? \"road\" : \"warehouse\"");
    expect(chrome).toContain("data-order-dest");
    expect(chrome).toContain("getPose");
    expect(chrome).toContain("hideOrderAsk");
    expect(chrome).toContain("data-open-stand");
    expect(siteMenu).toContain("Fruit slice");
    expect(siteMenu).toContain("Fridge");
    expect(siteMenu).toContain("data-upgrade");
    expect(siteMenu).toContain('id="sticker-price" type="range"');
    expect(siteMenu).toContain("id=\"hire-site\"");
    expect(chrome).not.toContain("openPlayMenu");
    expect(chrome).not.toContain("← Marketplace");
    expect(chrome).not.toContain("data-aisle");
    expect(chrome).not.toContain("first loop");
    expect(chrome).not.toContain("Stock cart");
    expect(carts).toContain("Each placed cart has its own menu");
    expect(carts).toContain("data-open-stand");
    expect(carts).not.toContain("data-pack-start");
    expect(carts).not.toContain("data-stock");
    expect(pack).toContain("PACK_SECONDS = 24");
    expect(pack).toContain("performance.now()");
    expect(pack).toContain("pack-good");
    expect(pack).toContain("mango");
    const body = formatCartsBody({
      todayPrice: 6,
      cartNeeds: [{ id: "place", label: "Place the cart on your YOURS lot or the verge by the road." }],
      catalog: [{ id: "hotdog_cart", aisle: "street_carts", role: "kit", label: "Fruit cart" }],
      inventory: [{ kind: "hotdog_cart", qty: 1 }],
      cart: [],
      stands: [],
      warehouse: { items: [] },
      hireRoster: [{ id: "ai", name: "Vendor", suggest: "Hire. They stock from the warehouse and keep this site running." }],
    });
    expect(body).toMatch(/Place the cart/);
    expect(body).toMatch(/data-place="hotdog_cart"/);
    expect(body).not.toMatch(/data-stock/);
    const placed = formatCartsBody({
      todayPrice: 6,
      catalog: [{ id: "hotdog_cart", aisle: "street_carts", role: "kit", label: "Fruit cart" }],
      inventory: [],
      stands: [{ id: "stand-1", plotId: "p1", label: "Fruit cart", needs: [{ id: "hire", label: "Hire a vendor. Carts do not sell without staff." }] }],
      leases: [{ id: "p1", name: "Quay lot" }],
      warehouse: { items: [] },
    });
    expect(placed).toMatch(/Fruit cart/);
    expect(placed).toMatch(/data-open-stand="stand-1"/);
    expect(placed).not.toMatch(/data-hire-person/);
    const menu = formatSiteMenu(
      {
        id: "stand-1",
        label: "Fruit cart",
        siteClass: "cart",
        hired: false,
        hotdogs: 0,
        storageCap: 20,
        stickerPrice: 6,
        games: ["Fruit slice"],
        kind: "fruit",
        parts: [{ id: "staff", label: "Staffed", points: 0 }],
        desirability: 0,
        searching: 4,
      },
      { todayPrice: 6, inventory: [], warehouse: { items: [] } },
      "stock",
    );
    expect(menu).not.toContain("id=\"hire-site\"");
    expect(menu).toContain("On you");
    expect(menu).not.toContain("Pat K.");
    expect(menu).toContain('data-site-tab="run"');
    expect(menu).toContain('data-site-tab="upgrades"');
    const run = formatSiteMenu(
      {
        id: "stand-1",
        label: "Fruit cart",
        siteClass: "cart",
        hired: false,
        hotdogs: 0,
        storageCap: 20,
        stickerPrice: 6,
        games: ["Fruit slice"],
        kind: "fruit",
      },
      { todayPrice: 6, inventory: [], warehouse: { items: [] } },
      "run",
    );
    expect(run).toContain("Hire $30.00");
    expect(run).toContain("id=\"hire-site\"");
    expect(run).toContain("data-pack-start");
    const hiredRun = formatSiteMenu(
      {
        id: "stand-1",
        label: "Fruit cart",
        siteClass: "cart",
        hired: true,
        staffName: "Vendor",
        hotdogs: 12,
        storageCap: 20,
        stickerPrice: 6,
        games: ["Fruit slice"],
        kind: "fruit",
      },
      { todayPrice: 6, hireCost: 30, inventory: [], warehouse: { items: [] } },
      "run",
    );
    expect(hiredRun).toContain("data-fire-site");
    expect(hiredRun).toContain("Vendor");
    expect(hiredRun).not.toContain("data-pack-start");
    expect(hiredRun).not.toContain("id=\"hire-site\"");
    const upgrades = formatSiteMenu(
      {
        id: "stand-1",
        label: "Fruit cart",
        siteClass: "cart",
        hired: false,
        upgraded: false,
        hotdogs: 0,
        storageCap: 20,
        stickerPrice: 6,
      },
      { todayPrice: 6, inventory: [], warehouse: { items: [] } },
      "upgrades",
    );
    expect(upgrades).toContain("Fridge");
    expect(upgrades).toContain("Sign");
    expect(upgrades).toContain("Awning");
    expect(upgrades).toContain("Lights");
    expect(upgrades).toContain("Stools");
    expect(upgrades).toContain("data-upgrade");
    expect(upgrades).toContain('data-upgrade-id="fridge"');
    expect(upgrades).not.toContain('data-upgrade-id="sign"');
    expect(upgrades).not.toContain("id=\"hire-site\"");
    const fridgeOn = formatSiteMenu(
      {
        id: "stand-1",
        label: "Fruit cart",
        siteClass: "cart",
        hired: false,
        upgraded: true,
        upgrades: ["fridge"],
        hotdogs: 0,
        storageCap: 40,
        stickerPrice: 6,
      },
      { todayPrice: 6, inventory: [], warehouse: { items: [] } },
      "upgrades",
    );
    expect(fridgeOn).toContain("upg-tick");
    expect(fridgeOn).toContain("Sign");
    expect(fridgeOn).toContain('data-upgrade-id="sign"');
    expect(fridgeOn).toContain("Awning");
    expect(fridgeOn).not.toContain('data-upgrade-id="awning"');
    const stats = formatSiteMenu(
      {
        id: "site-1",
        label: "14 Harbour Rd shop",
        siteClass: "shop",
        hired: true,
        staffName: "Vendor",
        stock: 4,
        hotdogs: 4,
        storageCap: 20,
        stickerPrice: 6,
        desirability: 5,
        cap: 5,
        searching: 3,
        rivalsOnStreet: 2,
        sellTicks: 36,
        perMinute: 8,
        parts: [
          { id: "fridge", label: "Fridge", points: 3 },
          { id: "sign", label: "Sign", points: 0.8 },
        ],
        stickerBand: "green",
        stickerMul: 1,
        trafficBand: "green",
        boostLeft: 0,
        games: ["Till run"],
      },
      { todayPrice: 6, inventory: [], warehouse: { items: [] } },
      "stats",
    );
    expect(stats).toContain("14 Harbour Rd shop");
    expect(stats).toContain("Street");
    expect(stats).toContain("Fridge");
    expect(stats).toContain("Sign");
    expect(stats).toContain("Area");
    expect(stats).toContain("Sticker");
    expect(stats).toContain("Shift");
    expect(stats).toContain("$ / min");
    expect(stats).not.toContain("PAPER / min");
    expect(stats).not.toContain("Searching this street");
    expect(stats).not.toContain("id=\"hire-site\"");
    const stock = formatSiteMenu(
      {
        id: "stand-1",
        label: "Fruit cart",
        siteClass: "cart",
        hired: false,
        hotdogs: 4,
        storageCap: 20,
        stickerPrice: 6,
      },
      { todayPrice: 6, inventory: [], warehouse: { items: [] } },
      "stock",
    );
    expect(stock).toContain("stock-num is-low");
    expect(stock).toContain("4");
    expect(stock).toContain("Price");
    expect(stock).toContain("is-today");
    expect(stock).toContain("sticker-zone");
    expect(stock).toContain("sticker-band");
    expect(stock).not.toContain("id=\"hire-site\"");
    const near = formatSiteMenu(
      {
        id: "stand-1",
        label: "Fruit cart",
        siteClass: "cart",
        hired: false,
        hotdogs: 20,
        storageCap: 20,
        stickerPrice: 7,
      },
      { todayPrice: 6, inventory: [], warehouse: { items: [] } },
      "stock",
    );
    expect(near).toContain("is-near");
    expect(near).not.toContain("is-far");
    const far = formatSiteMenu(
      {
        id: "stand-1",
        label: "Fruit cart",
        siteClass: "cart",
        hired: false,
        hotdogs: 20,
        storageCap: 20,
        stickerPrice: 11,
      },
      { todayPrice: 6, inventory: [], warehouse: { items: [] } },
      "stock",
    );
    expect(far).toContain("is-far");
    expect(css).toContain(".stock-num.is-low");
    expect(css).toContain(".sticker-mark");
    expect(css).toContain(".sticker-band");
    expect(css).toContain(".sticker-read.is-near");
    expect(css).toContain(".sticker-read.is-far");
    expect(css).toContain(".upg-tick");
  });
});
