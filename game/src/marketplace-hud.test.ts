import { describe, expect, it } from "vitest";
import { formatMarketplace, MARKET_SHEET_AISLES } from "../public/harbour/marketplace.js";
import { formatHireSheet, businessType, listBusinesses } from "../public/harbour/hire-sheet.js";

const play = {
  catalog: [
    { id: "hotdog_cart", aisle: "street_carts", role: "kit", label: "Fruit cart", paperPrice: 120 },
    { id: "hotdogs", aisle: "stock", role: "stock", label: "Fruit pack (×8)", paperPrice: 18 },
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
  it("lists Street kit live and keeps other aisles honestly empty", () => {
    const html = formatMarketplace(play, { aisle: "street", island: "south", query: "" });
    expect(html).toContain("2Isles Marketplace");
    expect(html).toContain("Fruit cart");
    expect(html).toContain("data-order=\"hotdog_cart\"");
    expect(html).toContain("Fruit pack");
    expect(html).toContain("South island goods");
    expect(html).toContain("corn");
    expect(html).toContain('data-aisle="shopfit"');
    expect(html).toContain('data-aisle="plant"');
    expect(html).toContain('data-aisle="farming"');
    expect(html).toContain('id="market-search"');
    expect(html).toContain("South · here");
    expect(html).toContain("North closed");
    expect(html).toContain("isle-shut");
    expect(html).not.toContain('data-island="north"');
    expect(html).toContain("Ferry first");
    expect(html).not.toMatch(/PAPER/i);
    expect(html).not.toMatch(/outfitter/i);
    expect(html).not.toMatch(/\bbooks?\b/i);
    expect(MARKET_SHEET_AISLES.map((a) => a.id)).toEqual([
      "street",
      "shopfit",
      "hospitality",
      "plant",
      "farming",
    ]);
  });

  it("does not invent quarry SKUs in Plant", () => {
    const html = formatMarketplace(play, { aisle: "plant", island: "south", query: "" });
    expect(html).toContain("Plant is not for sale yet");
    expect(html).toContain("quarry");
    expect(html).not.toContain("data-order=");
  });

  it("filters Street by search", () => {
    const html = formatMarketplace(play, { aisle: "street", island: "south", query: "fruit cart" });
    expect(html).toContain("Fruit cart");
    expect(html).not.toContain("Fruit pack");
    expect(html).not.toContain("corn");
  });

  it("blocks North buys", () => {
    const html = formatMarketplace(play, { aisle: "street", island: "north", query: "" });
    expect(html).toContain("island you stand on");
    expect(html).not.toContain("data-order=");
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
