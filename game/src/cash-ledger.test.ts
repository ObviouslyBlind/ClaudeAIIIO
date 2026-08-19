import { describe, expect, it } from "vitest";
import { cashLedgerModel, formatCashLedger, islandName, signedCash } from "../public/harbour/cash-ledger.js";

describe("cash hover ledger (PAPER)", () => {
  it("names islands and signs money", () => {
    expect(islandName("north")).toBe("North");
    expect(islandName("south")).toBe("South");
    expect(signedCash(8.2)).toBe("+$8.20");
    expect(signedCash(0)).toBe("+$0.00");
    expect(signedCash(-5)).toBe("−$5.00");
  });

  it("lists what you own, where, and running $/min", () => {
    const html = formatCashLedger({
      cash: 1000,
      incomePerMinute: 6.5,
      salesTax: 0.08,
      hireCost: 300,
      leases: [
        {
          id: "pad-1",
          name: "12 Island Hwy",
          island: "south",
          class: "cart_pad",
          band: "street",
        },
        {
          id: "lot-2",
          name: "4 Quay St",
          island: "south",
          class: "by_right",
          band: "street",
        },
      ],
      sites: [
        {
          id: "stand-1",
          plotId: "pad-1",
          label: "Fruit cart",
          siteClass: "cart",
          hired: true,
          staffName: "Vendor",
          hotdogs: 12,
          perMinute: 8.2,
          island: "south",
        },
      ],
      inventory: [{ kind: "melon_cart", qty: 1 }],
      catalog: [{ id: "melon_cart", role: "kit", aisle: "street_carts", label: "Watermelon cart" }],
      warehouse: { island: "south", items: [], occupied: false, feePerDay: 5 },
    });
    expect(html).toContain("$1,000.00");
    expect(html).toContain("+$6.50");
    expect(html).toContain("sold last minute");
    expect(html).not.toContain("if hired and stocked");
    expect(html).toContain("Fruit cart");
    expect(html).toContain("12 Island Hwy");
    expect(html).toContain("South · Cart pad");
    expect(html).toContain("+$8.20");
    expect(html).toContain("4 Quay St");
    expect(html).toContain("Empty");
    expect(html).toContain("Watermelon cart");
    expect(html).toContain("In pockets");
    expect(html).toContain("PAPER / SIMULATED");
    expect(html).toContain("8% tax");
    const model = cashLedgerModel({
      cash: 1000,
      incomePerMinute: 6.5,
      leases: [{ id: "pad-1", name: "12 Island Hwy", island: "south", class: "cart_pad" }],
      sites: [
        {
          id: "stand-1",
          plotId: "pad-1",
          label: "Fruit cart",
          hired: true,
          hotdogs: 12,
          perMinute: 8.2,
        },
      ],
    });
    expect(model.holdings).toHaveLength(1);
    expect(model.holdings[0].earning).toBe(true);
    expect(model.runningMin).toBeCloseTo(8.2);
    expect(model.lastMin).toBeCloseTo(6.5);
  });

  it("treats unhired and empty lots as idle, not running income", () => {
    const model = cashLedgerModel({
      cash: 250,
      incomePerMinute: 0,
      leases: [{ id: "pad-1", name: "12 Island Hwy", island: "south", class: "cart_pad" }],
      sites: [
        {
          id: "stand-1",
          plotId: "pad-1",
          label: "Fruit cart",
          hired: false,
          hotdogs: 20,
          perMinute: 8.2,
        },
      ],
    });
    expect(model.holdings[0].earning).toBe(false);
    expect(model.holdings[0].note).toBe("Play to sell");
    expect(model.runningMin).toBe(0);
    expect(formatCashLedger({ cash: 1000, leases: [], sites: [], inventory: [] })).toContain("No land");
  });
});
