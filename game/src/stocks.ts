/** PAPER 5-minute call auction. Six fictional Two Harbors firms. Not live tickers. */

/** 5 minutes at 1Hz. */
export const AUCTION_PERIOD_TICKS = 300;

export const LISTING_IDS = [
  "ferry_co",
  "north_mills",
  "south_farms",
  "island_bank",
  "harbour_quay",
  "channel_fuel",
] as const;

export type ListingId = (typeof LISTING_IDS)[number];

export type NewsKind = "ferry_tariff";

export type StockListing = {
  id: ListingId;
  name: string;
  lastPrice: number;
  provenance: "PAPER";
};

export type StockBook = {
  mode: "PAPER";
  provenance: "SIMULATED";
  note: string;
  auctionPeriodTicks: number;
  lastClearTick: number;
  listings: StockListing[];
  /** Signed bias consumed on the next clear. Tabled news while the auction is still on the floor. */
  pendingBias: Partial<Record<ListingId, number>>;
};

const NOTE =
  "PAPER 5-minute call auction. SIMULATED last prices. Not live. No shorting, no leverage.";

/** Fictional harbour firms. Opening marks are PAPER, not quotes. */
const OPENING: { id: ListingId; name: string; lastPrice: number }[] = [
  { id: "ferry_co", name: "Ferry Co", lastPrice: 12 },
  { id: "north_mills", name: "North Mills", lastPrice: 14 },
  { id: "south_farms", name: "South Farms", lastPrice: 8 },
  { id: "island_bank", name: "Island Bank", lastPrice: 20 },
  { id: "harbour_quay", name: "Harbour Quay", lastPrice: 11 },
  { id: "channel_fuel", name: "Channel Fuel", lastPrice: 15 },
];

function roundMoney(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clampPrice(n: number): number {
  if (!Number.isFinite(n)) return 0.01;
  return roundMoney(Math.max(0.01, n));
}

/** Tiny shared mark move so a clear never reprints the same lastPrice. */
function auctionWiggle(tick: number): number {
  const n = tick / AUCTION_PERIOD_TICKS;
  return n % 2 === 0 ? 0.02 : -0.02;
}

export function createStockBook(): StockBook {
  return {
    mode: "PAPER",
    provenance: "SIMULATED",
    note: NOTE,
    auctionPeriodTicks: AUCTION_PERIOD_TICKS,
    lastClearTick: 0,
    listings: OPENING.map((row) => ({ ...row, provenance: "PAPER" as const })),
    pendingBias: {},
  };
}

export function listingById(book: StockBook, id: ListingId): StockListing | undefined {
  return book.listings.find((row) => row.id === id);
}

export function isAuctionTick(tick: number): boolean {
  return tick > 0 && tick % AUCTION_PERIOD_TICKS === 0;
}

/**
 * Tabled tariff / news. Only `ferry_tariff` biases Ferry Co on the next clear.
 * Signed delta is PAPER marks, not a live quote.
 */
export function applyNews(book: StockBook, kind: string, signedDelta: number): void {
  if (kind !== "ferry_tariff") return;
  if (!Number.isFinite(signedDelta)) return;
  book.pendingBias.ferry_co = (book.pendingBias.ferry_co ?? 0) + signedDelta;
}

function clearAuction(book: StockBook, tick: number): void {
  const wiggle = auctionWiggle(tick);
  for (const listing of book.listings) {
    const bias = book.pendingBias[listing.id] ?? 0;
    listing.lastPrice = clampPrice(listing.lastPrice + wiggle + bias);
  }
  book.pendingBias = {};
  book.lastClearTick = tick;
}

/**
 * Every 300 ticks, clear a PAPER auction and move lastPrice.
 * Safe to call on every 1Hz tick. Idempotent on the same tick.
 */
export function tickAuction(book: StockBook, tick: number): void {
  if (!isAuctionTick(tick)) return;
  if (book.lastClearTick === tick) return;
  clearAuction(book, tick);
}
