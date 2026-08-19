import { describe, expect, it } from "vitest";
import { GOOD_IDS, GOODS } from "./goods.ts";
import { BOOK_ISLANDS, createDualBooks } from "./books.ts";
import { buyFromStall, createVisitor, createWorld, fastForward, hud } from "./sim.ts";
import { salesTaxRate, setStatuteSlider } from "./statutes.ts";

describe("headless sim step A", () => {
  it("runs an empty hour without NaN prices or a dead market", () => {
    const world = createWorld(42);
    fastForward(world, 3600);
    const h = hud(world);

    expect(world.tick).toBe(3600);
    expect(Number.isFinite(h.moneySupply)).toBe(true);
    expect(h.moneySupply).toBeGreaterThan(49_990);
    expect(h.moneySupply).toBeLessThan(50_010);
    expect(h.faucet).toBe(0);
    expect(h.sink).toBe(0);
    expect(Number.isFinite(h.priceIndex)).toBe(true);
    expect(h.priceIndex).toBeGreaterThan(0.2);
    expect(h.priceIndex).toBeLessThan(5);
    expect(h.goodsProducedWindow).toBeGreaterThan(0);
    expect(h.tradeCount).toBeGreaterThan(100);
    expect(world.ledger.consumed).toBeGreaterThan(1000);
    expect(GOOD_IDS.some((id) => world.lastPrice[id] !== GOODS[id].fair0)).toBe(true);
  });

  it("is reproducible from a seed", () => {
    const a = createWorld(9);
    const b = createWorld(9);
    fastForward(a, 250);
    fastForward(b, 250);
    expect(hud(a)).toEqual(hud(b));
    expect(a.lastPrice).toEqual(b.lastPrice);
    expect(a.lastPriceSouth).toEqual(b.lastPriceSouth);
    expect(a.arbSpread).toEqual(b.arbSpread);
  });

  it("lets a paper visitor buy from the stall at lastPrice", () => {
    const world = createWorld(3);
    fastForward(world, 30);
    const visitor = createVisitor(1_000);
    const beforeNpc = world.npcCash;
    const beforeStock = world.npcStock.corn;
    const result = buyFromStall(world, visitor, "corn", 4);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(visitor.stock.corn).toBe(4);
    expect(visitor.cash).toBeCloseTo(1_000 - result.paid, 4);
    expect(world.npcCash).toBeCloseTo(beforeNpc + result.paid, 4);
    expect(world.npcStock.corn).toBeCloseTo(beforeStock - 4, 4);
  });
});

describe("step D dual island books", () => {
  it("keeps North and South books as distinct objects", () => {
    const fresh = createDualBooks();
    expect(fresh.north).not.toBe(fresh.south);
    for (const id of GOOD_IDS) {
      expect(fresh.north[id]).not.toBe(fresh.south[id]);
    }

    const world = createWorld(1);
    expect(world.books.north).not.toBe(world.books.south);
    for (const id of GOOD_IDS) {
      expect(world.books.north[id]).not.toBe(world.books.south[id]);
    }

    fastForward(world, 8);
    expect(world.books.north).not.toBe(world.books.south);
    for (const id of GOOD_IDS) {
      expect(world.books.north[id]).not.toBe(world.books.south[id]);
    }
    expect(BOOK_ISLANDS).toEqual(["north", "south"]);
  });

  it("stores arb as the North–South last-price gap and keeps snapshot lastPrice on North", () => {
    const world = createWorld(11);
    expect(Object.keys(world.arbSpread).sort()).toEqual([...GOOD_IDS].sort());
    expect(GOOD_IDS.every((id) => world.arbSpread[id] === 0)).toBe(true);

    fastForward(world, 120);
    expect(GOOD_IDS.some((id) => world.lastPrice[id] !== world.lastPriceSouth[id])).toBe(true);
    expect(GOOD_IDS.some((id) => world.arbSpread[id] > 0)).toBe(true);
    for (const id of GOOD_IDS) {
      expect(world.arbSpread[id]).toBeCloseTo(Math.abs(world.lastPrice[id] - world.lastPriceSouth[id]), 8);
    }
  });

  it("still sinks sales tax on fills when the statute rate is raised", () => {
    const world = createWorld(7);
    expect(salesTaxRate(world.statutes)).toBe(0);
    fastForward(world, 20);
    expect(hud(world).sink).toBe(0);
    expect(setStatuteSlider(world.statutes, "sales_tax", "rate", 0.05)).toBe(true);
    fastForward(world, 20);
    expect(hud(world).sink).toBeGreaterThan(0);
  });

  it("prints South food cheaper than North, and North tools cheaper than South", () => {
    const world = createWorld(21);
    fastForward(world, 80);
    expect(world.lastPriceSouth.corn).toBeLessThan(world.lastPrice.corn);
    expect(world.lastPriceSouth.potato).toBeLessThan(world.lastPrice.potato);
    expect(world.lastPriceSouth.ore).toBeLessThan(world.lastPrice.ore);
    expect(world.lastPrice.tools).toBeLessThan(world.lastPriceSouth.tools);
    expect(world.lastPrice.concrete).toBeLessThan(world.lastPriceSouth.concrete);
    expect(hud(world).priceIndexNorth).toBeGreaterThan(0.2);
    expect(hud(world).priceIndexSouth).toBeGreaterThan(0.2);
    expect(hud(world).ferrySpread).toBeGreaterThan(0.02);
  });

  it("widens ferry spread when the national tariff slider moves", () => {
    const loose = createWorld(21);
    const tight = createWorld(21);
    expect(setStatuteSlider(tight.statutes, "national_tariff", "rate", 0.25)).toBe(true);
    fastForward(loose, 80);
    fastForward(tight, 80);
    expect(hud(tight).ferrySpread).toBeGreaterThan(hud(loose).ferrySpread);
  });

  it("counts visitor PAPER cash in money supply", () => {
    const world = createWorld(3);
    const visitor = createVisitor(1_000);
    fastForward(world, 8, visitor);
    expect(hud(world, visitor).moneySupply).toBeCloseTo(world.npcCash + visitor.cash, 4);
    expect(hud(world, visitor).moneySupply).toBeGreaterThan(world.npcCash);
  });
});
