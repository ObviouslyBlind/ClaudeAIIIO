import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { formatCartsBody } from "../public/harbour/carts-hud.js";
import { formatSiteMenu, stickerTrackSegs } from "../public/harbour/site-menu.js";
import { formatAccountSheet } from "../public/harbour/account-sheet.js";

const html = readFileSync(new URL("../public/harbour/index.html", import.meta.url), "utf8");
const chrome = readFileSync(new URL("../public/harbour/chrome.js", import.meta.url), "utf8");
const main = readFileSync(new URL("../public/harbour/main.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../public/harbour/chrome.css", import.meta.url), "utf8");
const pageCss = readFileSync(new URL("../public/harbour/style.css", import.meta.url), "utf8");
const fonts = readFileSync(new URL("../public/harbour/chrome-fonts.css", import.meta.url), "utf8");
const pack = readFileSync(new URL("../public/harbour/pack.js", import.meta.url), "utf8");
const carts = readFileSync(new URL("../public/harbour/carts-hud.js", import.meta.url), "utf8");
const siteMenu = readFileSync(new URL("../public/harbour/site-menu.js", import.meta.url), "utf8");

describe("harbour chrome HUD", () => {
  it("keeps launchers on the left rail, not a Menu on the travel dock", () => {
    expect(html).toContain('class="game-name"');
    expect(html).toContain("2Isles");
    expect(html).not.toContain("Two Harbors");
    expect(html).toContain('class="chrome-tl"');
    expect(html).toContain('class="chrome-tr"');
    expect(html).toContain('class="chrome-left"');
    expect(html).toContain('id="viewers"');
    expect(html).not.toContain("near-lease");
    expect(html).not.toContain("is-buy-lot");
    expect(html).not.toContain("Buy lot");
    expect(html).not.toContain('id="btn-lease"');
    expect(html).not.toContain(">Lease</button>");
    expect(html).toContain('data-overlay="lots"');
    expect(html).toContain('data-overlay="foot"');
    expect(html).toContain('aria-label="Foot traffic"');
    expect(html).not.toContain('data-panel="view"');
    expect(html).not.toContain('id="panel-view"');
    expect(html).toContain('data-panel="account"');
    expect(html).toContain('aria-label="Account"');
    expect(html).not.toContain(">You</button>");
    expect(html).toContain('data-panel="minerals"');
    expect(html).toContain('id="panel-minerals"');
    expect(html).toContain("Not in yet");
    const tl = html.slice(html.indexOf('class="chrome-tl"'), html.indexOf('class="chrome-tr"'));
    expect(tl).not.toContain("cash-plate");
    const tr = html.slice(html.indexOf('class="chrome-tr"'), html.indexOf('class="chrome-left"'));
    expect(tr).toContain("cash-plate");
    expect(tr).toContain("chrome-acct");
    expect(tr).toContain('class="cash-short"');
    expect(tr).toContain('id="cash-dock"');
    expect(tr).toContain('id="cash-ledger"');
    expect(tr).toContain('id="balance-full"');
    expect(tr).toContain('data-panel="account"');
    expect(tr).toContain('id="panel-account"');
    expect(tr).toContain('id="panel-minerals"');
    expect(tr).toContain('id="foot-legend"');
    expect(tr.indexOf('data-panel="account"')).toBeLessThan(tr.indexOf("cash-plate"));
    expect(tr.indexOf("cash-plate")).toBeLessThan(tr.indexOf('id="viewers"'));
    expect(tr.indexOf('id="viewers"')).toBeLessThan(tr.indexOf('data-overlay="lots"'));
    const chips = html.slice(html.indexOf('id="viewers"'), html.indexOf('id="panel-account"'));
    expect(chips).toContain('data-overlay="lots"');
    expect(chips).toContain('data-overlay="foot"');
    expect(chips).toContain('aria-label="Lots to buy"');
    expect(chips).toContain('data-tip="Lots to buy"');
    expect(chips).toContain('aria-label="Foot traffic"');
    expect(chips).toContain('aria-label="Minerals"');
    expect(chips).not.toContain("Leaderboard");
    expect(chips).not.toContain('data-panel="account"');
    expect(html).toContain('data-panel="inventory"');
    expect(html).toContain('data-panel="warehouse"');
    expect(html).toContain('data-panel="market"');
    expect(html).toContain('data-panel="employees"');
    expect(html).toContain('aria-label="Carts"');
    expect(html).toContain('data-tip="Carts"');
    expect(html).toContain('data-tip="Warehouse"');
    expect(html).toContain('data-tip="Marketplace"');
    expect(html).toContain('aria-label="Marketplace"');
    expect(html).toContain('aria-label="Hire"');
    expect(html).toContain('data-tip="Hire"');
    expect(html).toContain('data-tip="Go to Port to use Ferry"');
    expect(html).toContain('aria-label="Travel"');
    expect(main).toContain("syncFerryTip");
    expect(main).toContain("Go to Port to use Ferry");
    expect(chrome).toContain('root.querySelectorAll("[data-panel]")');
    expect(html).toContain('id="panel-inventory"');
    expect(html).toContain('id="panel-market"');
    expect(html).toContain("sheet-center");
    expect(html).toContain('id="sheet-veil"');
    expect(html).toContain('id="market-body"');
    expect(html).toContain('id="place-hint"');
    expect(html).toContain('id="play-toast"');
    expect(html).toContain('id="place-cancel"');
    expect(html).toContain('id="taxi-map-exit"');
    expect(html).toContain("Keep riding");
    expect(html).toContain('id="chrome"');
    expect(css).toContain("#stand-menu");
    expect(css).toContain("rgba(6, 16, 20, 0.12)");
    expect(css).toContain("height: 14px");
    expect(siteMenu).toContain('data-stock="inventory"');
    expect(html).toContain('id="buy-ask"');
    expect(html).toContain('id="crate-ask"');
    expect(html).toContain('id="pack-hint"');
    expect(html).toContain('id="order-ask"');
    expect(html).toContain('id="order-veil"');
    expect(html).toContain('id="lot-tags"');
    expect(html).not.toContain('id="walk-status"');
    expect(css).not.toContain(".walk-status");
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
    expect(css).toContain("translateY(-50%)");
    expect(css).toContain(".icon-chip");
    expect(css).toContain("[data-tip]");
    expect(css).toContain("pos-inv");
    expect(css).toContain(".sku-buy");
    expect(css).toContain(".sheet-center");
    expect(css).toContain(".mp-search");
    expect(css).toContain(".mp-fold");
    expect(css).toContain(".mp-cart-btn");
    expect(css).toContain(".mp-add");
    expect(css).toContain(".mp-aisles");
    expect(css).toContain("flex-wrap: wrap");
    expect(css).toContain("overscroll-behavior: contain");
    expect(css).toContain(".isle-shut[data-tip]::after");
    expect(css).toContain("#sheet-veil");
    expect(css).toContain("#crate-ask");
    expect(css).toContain(".buy-loc");
    expect(css).toMatch(/max-height:\s*min\(62vh/);
    expect(css).toContain("overflow-x: hidden");
    expect(css).toContain("flex-wrap: wrap");
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
    expect(css).toContain(".chrome-acct");
    expect(css).toContain(".cash-dock:hover .cash-ledger");
    expect(css).toContain(".cash-dock.is-open .cash-ledger");
    expect(chrome).toContain("formatCashLedger");
    expect(chrome).toContain("bindCashDock");
    expect(chrome).toContain("compactCash");
    expect(html).toContain('id="balance"');
    expect(html).toMatch(/id="balance"[^>]*>\$1,000</);
    expect(html).toContain('id="balance-full"');
    expect(html).toContain('id="cash-ledger"');
    expect(main).toContain("#cash-dock");
  });

  it("lease card and buy-ask ask before a lot is bought", () => {
    expect(chrome).toContain("plotDisplayName");
    expect(chrome).toContain("buyAskModel");
    expect(chrome).toContain("toggleViewer");
    expect(chrome).toContain("isLotsViewer");
    expect(chrome).toContain("is-yours");
    expect(chrome).toContain('setOverlay("lots")');
    expect(css).toContain(".chip.is-on.is-yours");
    expect(html).toContain("Lots to buy. Vacant $ bars");
    expect(main).toContain("function siteAtTap");
    expect(main).toContain("STAND_TAP_M");
    expect(main).toContain("function paintHoldingGlow");
    expect(main).toContain('p.name === "vendor"');
    expect(main).toContain("isLotsViewer(viewer) && tapPt");
    expect(chrome).toContain("paintBuyAsk");
    expect(chrome).not.toContain("near-lease");
    expect(css).not.toContain(".chip.is-buy-lot");
    expect(css).not.toContain("#near-lease");
    expect(chrome).toContain('id="buy-ask-yes"');
    expect(chrome).toContain('id="buy-ask-no"');
    expect(chrome).toContain('id="land-lease"');
    expect(chrome).toContain('id="land-close"');
    expect(chrome).toContain("onCloseLand");
    expect(chrome).toContain("onCloseStand");
    expect(chrome).toContain("dismissStandMenu");
    expect(main).toContain("function leaveStallCam");
    expect(main).toContain("leaveStallCam();");
    expect(chrome).toContain("opts.onPlay(play)");
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
    expect(siteMenu).toContain("sticker-seg");
    expect(siteMenu).toContain("sticker-band");
    expect(siteMenu).toContain("sticker-knob");
    expect(siteMenu).toContain("data-sticker-knob");
    expect(siteMenu).toContain("stickerTrackSegs");
    expect(siteMenu).not.toContain("sticker-zone");
    expect(chrome).toContain('slide.setAttribute("data-tone"');
    expect(chrome).toContain("data-sticker-knob");
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
    expect(chrome).toContain("formatMarketplace");
    expect(chrome).toContain("marketplaceScrollHtml");
    expect(chrome).toContain("paintMarketList");
    expect(chrome).toContain('openPanel === "market"');
    expect(chrome).toContain("formatHireSheet");
    expect(chrome).toContain("/api/buy");
    expect(chrome).toContain("/api/shift/pack");
    expect(chrome).toContain('let marketDest = "warehouse"');
    expect(chrome).toContain("Yellow van from the port.");
    expect(chrome).toContain("if (buyAsk && !buyAsk.hidden)");
    expect(chrome).toContain("ownedId");
    expect(chrome).not.toContain("opts.onNearLease(id)");
    expect(chrome).not.toContain("opts.lease(id)");
    expect(chrome).toContain("applyPlay");
    expect(chrome).toContain("stampPlay");
    expect(chrome).toContain("playGen");
    expect(chrome).toContain("if (gen !== playGen) return");
    expect(chrome).toContain("plotIsYours");
    expect(chrome).toContain('id="land-lease"');
    expect(chrome).toContain("order-label");
    expect(chrome).toContain("dest: marketDest === \"road\" ? \"road\" : \"warehouse\"");
    expect(chrome).toContain("data-order-dest");
    expect(chrome).toContain("getPose");
    expect(chrome).toContain("hideOrderAsk");
    expect(chrome).toContain("data-open-stand");
    expect(chrome).toContain("onOpenStand");
    expect(siteMenu).toContain("Fruit slice");
    expect(siteMenu).toContain("Fridge");
    expect(siteMenu).toContain("data-upgrade");
    expect(siteMenu).toContain('id="sticker-price" type="range"');
    expect(siteMenu).toContain("id=\"hire-site\"");
    expect(chrome).not.toContain("openPlayMenu");
    expect(chrome).not.toContain("← Marketplace");
    expect(chrome).toContain("data-aisle");
    expect(chrome).toContain("data-sheet-hire");
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
    expect(pack).toContain("basket");
    expect(pack).toContain("wrap");
    expect(pack).toContain("gold");
    expect(pack).toContain("goldBandAt");
    expect(pack).toContain("GOLD_WIDTH_START");
    expect(pack).toContain("GOLD_WIDTH_END");
    expect(pack).toContain("HEAT_CYCLE_MS");
    expect(pack).toContain("PULL_LOCK_MS");
    expect(pack).toContain("Tap when the fry is gold");
    expect(pack).toContain("Paper, then fish, then chips");
    expect(pack).toContain('return "sort"');
    expect(pack).toContain('return "seed"');
    expect(pack).toContain("Tap ripe fruit");
    expect(pack).toContain("Tap seeds");
    expect(chrome).toContain("No stock — load it from the warehouse first");
    expect(chrome).toContain("No sales — load stock from the warehouse");
    expect(chrome).toContain('data-place="${r.kind}"');
    expect(chrome).toContain("Bring to me");
    expect(css).toContain(".google-ph");
    expect(css).toContain("button.danger");
    expect(css).toContain(".look-swatch");
    expect(css).toContain(".acct-wipe");
    expect(css).toContain(".pack-good.is-mush");
    expect(css).toContain("#play-toast");
    expect(css).toContain(".pack-result");
    expect(siteMenu).toContain("lastShiftLine");
    expect(chrome).toContain("play.lastShiftLine");
    expect(siteMenu).toContain("const max = 16");
    expect(siteMenu).toContain("data-fuel");
    expect(siteMenu).toContain("Propane");
    expect(css).toContain("pack-heat");
    expect(css).toContain("pack-wrap");
    expect(chrome).toContain("/api/stand/fuel");
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
    expect(run).toContain("Hire $300.00");
    expect(run).toContain("id=\"hire-site\"");
    expect(run).toContain("data-pack-start");
    const soldRun = formatSiteMenu(
      {
        id: "stand-1",
        label: "Fruit cart",
        siteClass: "cart",
        hired: false,
        games: ["Fruit slice"],
      },
      { todayPrice: 6, lastShiftLine: "Sold 8 · $44.16", inventory: [], warehouse: { items: [] } },
      "run",
    );
    expect(soldRun).toContain("pack-result");
    expect(soldRun).toContain("Sold 8");
    const fryRun = formatSiteMenu(
      {
        id: "stand-fry",
        label: "Fish and chips",
        siteClass: "cart",
        hired: false,
        hotdogs: 0,
        storageCap: 20,
        stickerPrice: 11,
        todayPrice: 11,
        propaneLeft: 0,
        games: ["Fry run", "Basket pull", "Wrap ticket"],
        kind: "fish_chips",
      },
      { todayPrice: 6, inventory: [{ kind: "propane", qty: 1 }], warehouse: { items: [] } },
      "run",
    );
    expect(fryRun).toContain("Fry run");
    expect(fryRun).toContain("Basket pull");
    expect(fryRun).toContain("Wrap ticket");
    const fryStock = formatSiteMenu(
      {
        id: "stand-fry",
        label: "Fish and chips",
        siteClass: "cart",
        hired: false,
        hotdogs: 8,
        storageCap: 20,
        stickerPrice: 11,
        todayPrice: 11,
        propaneLeft: 0,
        kind: "fish_chips",
      },
      { todayPrice: 6, inventory: [{ kind: "propane", qty: 1 }], warehouse: { items: [] } },
      "stock",
    );
    expect(fryStock).toContain("Propane");
    expect(fryStock).toContain("data-fuel=\"inventory\"");
    expect(fryStock).toContain("is-today");
    expect(fryStock).toContain('max="16"');
    expect(fryStock).toContain("flex:56.6667");
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
      { todayPrice: 6, hireCost: 300, inventory: [], warehouse: { items: [] } },
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
    expect(stock).toContain("sticker-seg is-red");
    expect(stock).toContain("sticker-seg is-yellow");
    expect(stock).toContain("sticker-seg is-green");
    expect(stock).toContain('data-tone="today"');
    expect(stock).toContain("sticker-band");
    expect(stock).toContain("sticker-knob");
    expect(stock).toContain("flex:23.3333");
    expect(stock).not.toContain("sticker-zone");
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
    expect(css).toContain(".sticker-seg.is-red");
    expect(css).toContain(".sticker-seg.is-yellow");
    expect(css).toContain(".sticker-seg.is-green");
    expect(css).toContain(".sticker-read.is-near");
    expect(css).toContain(".sticker-read.is-far");
    expect(css).toContain("#c45a3a");
    expect(css).not.toContain(".sticker-zone");
    expect(css).not.toMatch(/#5fe3a0 50%/);
    expect(css).not.toMatch(/#e25b6a 16%/);
    expect(css).not.toContain("linear-gradient(\n    90deg,\n    #c42b3a");
    expect(css).toContain(".sticker-knob");
    expect(css).toContain("gap: 3px");
    expect(css).toContain("::-webkit-slider-runnable-track");
    expect(css).toContain("::-moz-range-progress");
    expect(css).toContain(".upg-tick");
    const fruitSegs = stickerTrackSegs(6);
    const fruitGreen = fruitSegs.find((s) => s.tone === "green");
    expect(fruitGreen).toBeTruthy();
    expect(fruitGreen.left + fruitGreen.width / 2).toBeLessThan(50);
    const frySegs = stickerTrackSegs(11);
    const fryGreen = frySegs.find((s) => s.tone === "green");
    expect(fryGreen).toBeTruthy();
    expect(fryGreen.left + fryGreen.width / 2).toBeGreaterThan(50);
    expect(fruitSegs.map((s) => s.tone).join("-")).toBe("red-yellow-green-yellow-red");
    expect(frySegs.map((s) => s.tone).join("-")).toBe("red-yellow-green-yellow-red");
    const yellowW = fruitSegs.filter((s) => s.tone === "yellow").reduce((a, s) => a + s.width, 0);
    expect(yellowW).toBeCloseTo((2 / 15) * 100, 5);
    const edgeLow = stickerTrackSegs(1);
    expect(edgeLow[0].tone).toBe("green");
    const edgeHigh = stickerTrackSegs(16);
    expect(edgeHigh[edgeHigh.length - 1].tone).toBe("green");
  });

  it("paints Account as Google placeholder, #0002, look swatches, and red wipes", () => {
    const htmlSheet = formatAccountSheet({
      cash: 1_000,
      incomePerMinute: 0,
      salesTax: 0.08,
      accountTag: "#0002",
      look: { hair: "short", skin: "sand", shirt: "sea", jacket: "brass", pants: "moss" },
    });
    expect(htmlSheet).toContain("Google · signed in");
    expect(htmlSheet).toContain("placeholder");
    expect(htmlSheet).toContain("#0002");
    expect(htmlSheet).toContain("#0001 is the owner");
    expect(htmlSheet).toContain("data-wipe=\"reset-1\"");
    expect(htmlSheet).toContain("Reset data");
    expect(htmlSheet).toContain("data-wipe=\"delete-1\"");
    expect(htmlSheet).toContain("Delete game account");
    expect(htmlSheet).toContain('data-look="hair"');
    expect(htmlSheet).toContain('data-look="skin"');
    expect(htmlSheet).toContain('data-look="shirt"');
    expect(htmlSheet).toContain('data-look="jacket"');
    expect(htmlSheet).toContain('data-look="pants"');
    expect(htmlSheet).toContain("class=\"danger\"");
    const sure = formatAccountSheet({ cash: 1_000, accountTag: "#0002" }, { wipe: "delete-1" });
    expect(sure).toContain("Are you sure?");
    expect(sure).toContain("I am sure");
    const sureSure = formatAccountSheet({ cash: 1_000, accountTag: "#0002" }, { wipe: "delete-2" });
    expect(sureSure).toContain("Are you sure sure?");
    const last = formatAccountSheet({ cash: 1_000, accountTag: "#0002" }, { wipe: "delete-3" });
    expect(last).toContain("Last chance");
    expect(last).toContain("Delete account");
    expect(chrome).toContain("/api/look");
    expect(chrome).toContain("/api/play/reset");
    expect(chrome).toContain("/api/play/delete");
    expect(chrome).toContain("accountWipe === \"delete-3\"");
    expect(main).toContain("onLook");
    expect(main).toContain("restylePeople");
  });
});
