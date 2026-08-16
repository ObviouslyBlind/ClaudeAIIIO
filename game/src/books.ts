import { GOODS, GOOD_IDS, type GoodId } from "./goods.ts";

/** Two island books. Ferry is the only arb path (ticket / travel time come later). */
export const BOOK_ISLANDS = ["north", "south"] as const;
export type BookIsland = (typeof BOOK_ISLANDS)[number];

export type Side = "bid" | "ask";

export type Order = {
  id: number;
  good: GoodId;
  side: Side;
  price: number;
  qty: number;
};

export type Book = { bids: Order[]; asks: Order[] };

export type IslandBooks = Record<GoodId, Book>;

/** North and South each hold a full 12-good book. Always distinct objects. */
export type DualBooks = Record<BookIsland, IslandBooks>;

export function emptyBook(): Book {
  return { bids: [], asks: [] };
}

export function emptyIslandBooks(): IslandBooks {
  const books = {} as IslandBooks;
  for (const id of GOOD_IDS) books[id] = emptyBook();
  return books;
}

export function createDualBooks(): DualBooks {
  return {
    north: emptyIslandBooks(),
    south: emptyIslandBooks(),
  };
}

export function emptyLastPrices(): Record<GoodId, number> {
  const last = {} as Record<GoodId, number>;
  for (const id of GOOD_IDS) last[id] = GOODS[id].fair0;
  return last;
}

/** |North − South| last price per good. Arb exists here; the ferry later prices the path. */
export function arbSpreads(
  north: Record<GoodId, number>,
  south: Record<GoodId, number>,
): Record<GoodId, number> {
  const out = {} as Record<GoodId, number>;
  for (const id of GOOD_IDS) {
    out[id] = Math.abs(north[id] - south[id]);
  }
  return out;
}

export function insertOrder(book: Book, order: Order): void {
  if (order.side === "bid") {
    book.bids.push(order);
    book.bids.sort((a, b) => b.price - a.price || a.id - b.id);
  } else {
    book.asks.push(order);
    book.asks.sort((a, b) => a.price - b.price || a.id - b.id);
  }
}
