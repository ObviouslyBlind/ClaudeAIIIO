import { describe, expect, it } from "vitest";
import {
  AUCTION_PERIOD_TICKS,
  LISTING_IDS,
  applyNews,
  createStockBook,
  isAuctionTick,
  listingById,
  tickAuction,
} from "./stocks.ts";

const NAMES = [
  "Ferry Co",
  "North Mills",
  "South Farms",
  "Island Bank",
  "Harbour Quay",
  "Channel Fuel",
] as const;

function snapshot(book: ReturnType<typeof createStockBook>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of book.listings) out[row.id] = row.lastPrice;
  return out;
}

function runUntil(book: ReturnType<typeof createStockBook>, throughTick: number): void {
  for (let t = 1; t <= throughTick; t++) tickAuction(book, t);
}

describe("PAPER stock auction step K", () => {
  it("lists six fictional Two Harbors firms with PAPER / SIMULATED provenance", () => {
    const book = createStockBook();
    expect(book.mode).toBe("PAPER");
    expect(book.provenance).toBe("SIMULATED");
    expect(book.note).toMatch(/PAPER/);
    expect(book.note).toMatch(/SIMULATED/);
    expect(book.listings).toHaveLength(6);
    expect(LISTING_IDS).toHaveLength(6);
    expect(book.listings.map((row) => row.name)).toEqual([...NAMES]);
    expect(book.listings.map((row) => row.id)).toEqual([...LISTING_IDS]);
    expect(book.listings.every((row) => row.provenance === "PAPER")).toBe(true);
    expect(new Set(book.listings.map((row) => row.id)).size).toBe(6);
  });

  it("clears a PAPER auction every 300 ticks at 1Hz", () => {
    expect(AUCTION_PERIOD_TICKS).toBe(300);
    expect(createStockBook().auctionPeriodTicks).toBe(300);
    expect(isAuctionTick(0)).toBe(false);
    expect(isAuctionTick(299)).toBe(false);
    expect(isAuctionTick(300)).toBe(true);
    expect(isAuctionTick(600)).toBe(true);

    const book = createStockBook();
    const open = snapshot(book);
    tickAuction(book, 1);
    tickAuction(book, 299);
    expect(snapshot(book)).toEqual(open);
    expect(book.lastClearTick).toBe(0);

    tickAuction(book, 300);
    expect(book.lastClearTick).toBe(300);
    expect(listingById(book, "ferry_co")?.lastPrice).not.toBe(open.ferry_co);
    expect(listingById(book, "ferry_co")?.prevPrice).toBe(open.ferry_co);

    const afterFirst = snapshot(book);
    tickAuction(book, 300);
    expect(snapshot(book)).toEqual(afterFirst);

    tickAuction(book, 600);
    expect(book.lastClearTick).toBe(600);
    expect(snapshot(book)).not.toEqual(afterFirst);
  });

  it("moves Ferry Co vs others on the next auction after applyNews ferry_tariff", () => {
    const up = createStockBook();
    const beforeUp = snapshot(up);
    applyNews(up, "ferry_tariff", 1.5);
    expect(snapshot(up)).toEqual(beforeUp);

    runUntil(up, 299);
    expect(snapshot(up)).toEqual(beforeUp);

    tickAuction(up, 300);
    const ferryUp = listingById(up, "ferry_co")!.lastPrice - beforeUp.ferry_co!;
    const otherUp = LISTING_IDS.filter((id) => id !== "ferry_co").map(
      (id) => listingById(up, id)!.lastPrice - beforeUp[id]!,
    );
    expect(ferryUp).toBeGreaterThan(Math.max(...otherUp));
    expect(ferryUp).toBeGreaterThan(1);
    expect(up.pendingBias.ferry_co).toBeUndefined();

    const down = createStockBook();
    const beforeDown = snapshot(down);
    applyNews(down, "ferry_tariff", -1.5);
    tickAuction(down, 300);
    const ferryDown = listingById(down, "ferry_co")!.lastPrice - beforeDown.ferry_co!;
    const otherDown = LISTING_IDS.filter((id) => id !== "ferry_co").map(
      (id) => listingById(down, id)!.lastPrice - beforeDown[id]!,
    );
    expect(ferryDown).toBeLessThan(Math.min(...otherDown));
    expect(ferryDown).toBeLessThan(-1);
  });

  it("keeps lastPrice finite across many PAPER clears", () => {
    const book = createStockBook();
    applyNews(book, "ferry_tariff", 2);
    runUntil(book, AUCTION_PERIOD_TICKS * 12);
    expect(book.lastClearTick).toBe(AUCTION_PERIOD_TICKS * 12);
    for (const row of book.listings) {
      expect(Number.isFinite(row.lastPrice)).toBe(true);
      expect(row.lastPrice).toBeGreaterThan(0);
    }
  });
});
