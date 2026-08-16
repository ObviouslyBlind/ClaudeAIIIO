/** PAPER visitor limit orders vs NPC island books. SIMULATED. Not a live exchange. */

import { GOOD_IDS, type GoodId } from "./goods.ts";
import {
  BOOK_ISLANDS,
  type Book,
  type BookIsland,
  type DualBooks,
  type Side,
} from "./books.ts";
import { salesTaxRate, type Statute } from "./statutes.ts";

export const ORDER_NOTE =
  "PAPER visitor limit order vs NPC island books. SIMULATED. Not a live exchange.";

export type OrderIntent = {
  island: BookIsland;
  goodId: GoodId;
  price: number;
  qty: number;
};

export type VisitorOrder = {
  id: number;
  island: BookIsland;
  goodId: GoodId;
  side: Side;
  price: number;
  qty: number;
  mode: "PAPER";
  provenance: "SIMULATED";
};

export type PlaceOk = {
  ok: true;
  order: VisitorOrder;
  mode: "PAPER";
  provenance: "SIMULATED";
  note: string;
};

export type PlaceFail = {
  ok: false;
  reason: string;
  mode: "PAPER";
  provenance: "SIMULATED";
  note: string;
};

export type PlaceResult = PlaceOk | PlaceFail;

export type MatchReport = {
  mode: "PAPER";
  provenance: "SIMULATED";
  fills: number;
  note: string;
};

type PaperVisitor = {
  cash: number;
  stock: Record<GoodId, number>;
};

type PaperWorld = {
  nextOrderId: number;
  npcCash: number;
  lastPrice: Record<GoodId, number>;
  lastPriceSouth: Record<GoodId, number>;
  books: DualBooks;
  ledger: { consumed: number; sink: number };
  tradeCount: number;
  statutes: Statute[];
};

type Resting = VisitorOrder & { visitor: PaperVisitor };

const restingByWorld = new WeakMap<PaperWorld, Resting[]>();
const restingByVisitor = new WeakMap<PaperVisitor, Resting[]>();

function roundMoney(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function fail(reason: string): PlaceFail {
  return { ok: false, reason, mode: "PAPER", provenance: "SIMULATED", note: ORDER_NOTE };
}

function isIsland(value: unknown): value is BookIsland {
  return (BOOK_ISLANDS as readonly string[]).includes(value as string);
}

function isGood(value: unknown): value is GoodId {
  return (GOOD_IDS as readonly string[]).includes(value as string);
}

function lastPricesOf(world: PaperWorld, island: BookIsland): Record<GoodId, number> {
  return island === "north" ? world.lastPrice : world.lastPriceSouth;
}

function listForWorld(world: PaperWorld): Resting[] {
  let list = restingByWorld.get(world);
  if (!list) {
    list = [];
    restingByWorld.set(world, list);
  }
  return list;
}

function listForVisitor(visitor: PaperVisitor): Resting[] {
  let list = restingByVisitor.get(visitor);
  if (!list) {
    list = [];
    restingByVisitor.set(visitor, list);
  }
  return list;
}

function publicOrder(row: Resting): VisitorOrder {
  return {
    id: row.id,
    island: row.island,
    goodId: row.goodId,
    side: row.side,
    price: row.price,
    qty: row.qty,
    mode: "PAPER",
    provenance: "SIMULATED",
  };
}

function parseIntent(
  intent: OrderIntent,
): PlaceFail | { island: BookIsland; goodId: GoodId; price: number; qty: number } {
  if (!isIsland(intent.island)) return fail("unknown_island");
  if (!isGood(intent.goodId)) return fail("unknown_good");
  const price = roundMoney(Number(intent.price));
  const qty = roundMoney(Number(intent.qty));
  if (!Number.isFinite(price) || price <= 0) return fail("bad_price");
  if (!Number.isFinite(qty) || qty <= 0) return fail("bad_qty");
  return { island: intent.island, goodId: intent.goodId, price, qty };
}

function takeFromBook(book: Book, side: Side): void {
  const row = side === "bid" ? book.bids : book.asks;
  if (row[0] && row[0].qty <= 1e-9) row.shift();
}

function fillAgainstNpc(world: PaperWorld, order: Resting): number {
  const book = world.books[order.island][order.goodId];
  let fills = 0;
  while (order.qty > 1e-9) {
    const npc = order.side === "bid" ? book.asks[0] : book.bids[0];
    if (!npc) break;
    if (order.side === "bid" && order.price < npc.price) break;
    if (order.side === "ask" && npc.price < order.price) break;

    const qty = roundMoney(Math.min(order.qty, npc.qty));
    if (qty <= 0) break;
    const fillPrice = npc.side === "ask" ? npc.price : order.price;
    const paid = roundMoney(qty * fillPrice);

    if (order.side === "bid") {
      const escrowed = roundMoney(qty * order.price);
      order.visitor.cash = roundMoney(order.visitor.cash + (escrowed - paid));
      order.visitor.stock[order.goodId] = roundMoney(order.visitor.stock[order.goodId] + qty);
      world.npcCash = roundMoney(world.npcCash + paid);
    } else {
      const escrowed = roundMoney(qty * npc.price);
      order.visitor.cash = roundMoney(order.visitor.cash + paid);
      world.npcCash = roundMoney(world.npcCash + (escrowed - paid));
      world.ledger.consumed += qty;
    }

    const tax = roundMoney(paid * salesTaxRate(world.statutes));
    if (tax > 0) {
      world.npcCash = roundMoney(world.npcCash - tax);
      world.ledger.sink = roundMoney(world.ledger.sink + tax);
    }

    lastPricesOf(world, order.island)[order.goodId] = fillPrice;
    world.tradeCount += 1;
    order.qty = roundMoney(order.qty - qty);
    npc.qty = roundMoney(npc.qty - qty);
    takeFromBook(book, npc.side);
    fills += 1;
  }
  return fills;
}

function register(world: PaperWorld, visitor: PaperVisitor, order: Resting): void {
  listForWorld(world).push(order);
  listForVisitor(visitor).push(order);
}

/**
 * PAPER bid. Escrows cash. Rejects mixed or insufficient cash.
 * Does not sell inventory to raise funds. Not a live exchange.
 */
export function placeBid(
  world: PaperWorld,
  visitor: PaperVisitor,
  intent: OrderIntent,
): PlaceResult {
  const parsed = parseIntent(intent);
  if ("ok" in parsed) return parsed;
  if (!Number.isFinite(visitor.cash) || visitor.cash < 0) return fail("mixed_cash");
  const cost = roundMoney(parsed.price * parsed.qty);
  if (visitor.cash < cost) return fail("no_cash");
  visitor.cash = roundMoney(visitor.cash - cost);
  const order: Resting = {
    id: world.nextOrderId++,
    island: parsed.island,
    goodId: parsed.goodId,
    side: "bid",
    price: parsed.price,
    qty: parsed.qty,
    mode: "PAPER",
    provenance: "SIMULATED",
    visitor,
  };
  register(world, visitor, order);
  fillAgainstNpc(world, order);
  return { ok: true, order: publicOrder(order), mode: "PAPER", provenance: "SIMULATED", note: ORDER_NOTE };
}

/**
 * PAPER ask. Escrows stock. Rejects mixed cash/goods guesses.
 * Does not invent a live exchange.
 */
export function placeAsk(
  world: PaperWorld,
  visitor: PaperVisitor,
  intent: OrderIntent,
): PlaceResult {
  const parsed = parseIntent(intent);
  if ("ok" in parsed) return parsed;
  if (!Number.isFinite(visitor.cash) || visitor.cash < 0) return fail("mixed_cash");
  const held = visitor.stock[parsed.goodId];
  if (!Number.isFinite(held) || held < parsed.qty) return fail("no_stock");
  visitor.stock[parsed.goodId] = roundMoney(held - parsed.qty);
  const order: Resting = {
    id: world.nextOrderId++,
    island: parsed.island,
    goodId: parsed.goodId,
    side: "ask",
    price: parsed.price,
    qty: parsed.qty,
    mode: "PAPER",
    provenance: "SIMULATED",
    visitor,
  };
  register(world, visitor, order);
  fillAgainstNpc(world, order);
  return { ok: true, order: publicOrder(order), mode: "PAPER", provenance: "SIMULATED", note: ORDER_NOTE };
}

/** Match resting PAPER visitor orders against the current NPC books. Sim calls this each tick. */
export function matchVisitorOrders(world: PaperWorld): MatchReport {
  const rest = listForWorld(world).filter((row) => row.qty > 1e-9);
  const bids = rest
    .filter((row) => row.side === "bid")
    .sort((a, b) => b.price - a.price || a.id - b.id);
  const asks = rest
    .filter((row) => row.side === "ask")
    .sort((a, b) => a.price - b.price || a.id - b.id);
  let fills = 0;
  for (const row of bids) fills += fillAgainstNpc(world, row);
  for (const row of asks) fills += fillAgainstNpc(world, row);
  return { mode: "PAPER", provenance: "SIMULATED", fills, note: ORDER_NOTE };
}

/** Open PAPER orders for this visitor. Filled qty is gone. */
export function listOpenOrders(visitor: PaperVisitor): VisitorOrder[] {
  return listForVisitor(visitor)
    .filter((row) => row.qty > 1e-9)
    .map(publicOrder);
}
