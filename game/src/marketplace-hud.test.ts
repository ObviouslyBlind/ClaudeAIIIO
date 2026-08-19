import { describe, expect, it } from "vitest";
import {
  formatMarketplace,
  MARKET_SHEET_AISLES,
  addBasketLine,
  removeBasketLine,
  basketCount,
  basketTotal,
} from "../public/harbour/marketplace.js";
import { formatHireSheet, businessType, listBusinesses } from "../public/harbour/hire-sheet.js";

const play = {
  cash: 1000,
  catalog: [
    {
      id: "hotdog_cart",
      aisle: "street_carts",
      role: "kit",
      label: "Fruit cart",
      paperPrice: 120,
      note: "Fruit stall. Place on a pad.",
    },
    {
      id: "hotdogs",
      aisle: "stock",
      role: "stock",
      label: "Fruit pack (×8)",
      paperPrice: 18,
      note: "Stock for the fruit cart.",
    },
  ],
  goods: ["corn", "ore"],
  lastPricesSouth: { corn: 2.4, ore: 9 },
  hireCost: 300,
  stands: [
    {
      id: "stand-1",
      label: "Fruit cart",
      siteClass: "cart",
      plotId: "p1",
      hired: false,
    },
  ],
  leases: [{ id: "p1", name: "Quay lot" }],
  workSites: [],
};

describe("2Isles Marketplace sheet", () => {
  it("lists Street kit in fold menus with Buy and Add", () => {
    const html = formatMarketplace(play, { aisle: "street", island: "south", query: "", cash: 1000, basket: [] });
    expect(html).toContain("2Isles Marketplace");
    expect(html).toContain("$1,000.00");
    expect(html).toContain("data-market-cart");
    expect(html).toContain("Fruit cart");
    expect(html).toContain("data-order=\"hotdog_cart\"");
    expect(html).toContain('data-add-cart="hotdog_cart"');
    expect(html).toContain("Fruit stall");
    expect(html).toContain("Fruit pack");
    expect(html).toContain("<summary>Carts</summary>");
    expect(html).toContain("<summary>Stock</summary>");
    expect(html).toContain("South island goods");
    expect(html).toContain("corn");
    expect(html).toContain("South island");
    expect(html).toContain("North island");
    expect(html).toContain('data-aisle="shopfit"');
    expect(html).toContain('data-aisle="farming"');
    expect(html).toContain('data-aisle="hospitality"');
    expect(html).toContain('data-aisle="machinery"');
    expect(html).not.toContain('data-aisle="plant"');
    expect(html).toContain('id="market-search"');
    expect(html).not.toContain('data-island="north"');
    expect(html).not.toMatch(/PAPER/i);
    expect(html).not.toMatch(/outfitter/i);
    expect(html).not.toMatch(/\bbooks?\b/i);
    expect(MARKET_SHEET_AISLES.map((a) => a.id)).toEqual([
      "street",
      "shopfit",
      "farming",
      "hospitality",
      "machinery",
    ]);
  });

  it("does not invent quarry SKUs in Machinery", () => {
    const html = formatMarketplace(play, { aisle: "machinery", island: "south", query: "" });
    expect(html).toContain("Machinery is not for sale yet");
    expect(html).toContain("quarry");
    expect(html).not.toContain("data-order=");
  });

  it("filters Street by search and opens matching folds", () => {
    const html = formatMarketplace(play, { aisle: "street", island: "south", query: "hotdog_cart" });
    expect(html).toContain("Fruit cart");
    expect(html).not.toContain("Fruit pack");
    expect(html).not.toContain("corn");
    expect(html).toContain('data-fold="carts" open');
  });

  it("blocks North buys", () => {
    const html = formatMarketplace(play, { aisle: "street", island: "north", query: "" });
    expect(html).toContain("island you stand on");
    expect(html).not.toContain("data-order=");
  });

  it("basket view lists added kit and total", () => {
    const lines = addBasketLine([], "hotdog_cart", "order");
    expect(basketCount(lines)).toBe(1);
    expect(basketTotal(play, lines)).toBe(120);
    const twice = addBasketLine(lines, "hotdog_cart", "order");
    expect(basketCount(twice)).toBe(2);
    const html = formatMarketplace(play, { view: "basket", basket: twice, cash: 87.5 });
    expect(html).toContain("Fruit cart × 2");
    expect(html).toContain("$87.50");
    expect(html).toContain("data-basket-pay");
    expect(html).toContain("Buy cart");
    expect(removeBasketLine(twice, "hotdog_cart", "order")).toEqual([]);
  });
});

describe("Hire sheet", () => {
  it("lists businesses then opens a site with people, fleet, and plant", () => {
    expect(listBusinesses(play)).toHaveLength(1);
    expect(businessType(play.stands[0])).toBe("Street cart");
    const list = formatHireSheet(play, {});
    expect(list).toContain(">Hire<");
    expect(list).toContain("Fruit cart");
    expect(list).toContain("Needs hire");
    expect(list).toContain('data-hire-pick="stand-1"');
    const detail = formatHireSheet(play, { selectedId: "stand-1" });
    expect(detail).toContain("Quay lot");
    expect(detail).toContain("No trucks yet");
    expect(detail).toContain("No plant yet");
    expect(detail).toContain("Hire $300.00");
    expect(detail).toContain('data-sheet-hire="stand-1"');
    expect(detail).toContain('data-open-stand="stand-1"');
    expect(detail).not.toMatch(/PAPER/i);
  });

  it("empty state when nothing is placed", () => {
    const html = formatHireSheet({ stands: [], workSites: [] }, {});
    expect(html).toContain("No business on the ground yet");
  });
});
