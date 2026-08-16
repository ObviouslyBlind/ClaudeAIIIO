import { GOODS, GOOD_IDS, INDEX_WEIGHTS, type GoodId } from "./goods.ts";
import {
  BOOK_ISLANDS,
  arbSpreads,
  createDualBooks,
  emptyBook,
  emptyLastPrices,
  insertOrder,
  type BookIsland,
  type DualBooks,
  type Order,
  type Side,
} from "./books.ts";
import { mulberry32 } from "./rng.ts";
import { createStatuteCatalog, salesTaxRate, type Statute } from "./statutes.ts";
import { createVisitorCart, type CartLine } from "./visitorCart.ts";

export {
  BOOK_ISLANDS,
  arbSpreads,
  createDualBooks,
  type Book,
  type BookIsland,
  type DualBooks,
  type Order,
  type Side,
};

export type Ledger = {
  produced: number;
  consumed: number;
  faucet: number;
  sink: number;
};

export type World = {
  tick: number;
  rng: () => number;
  nextOrderId: number;
  npcCash: number;
  npcStock: Record<GoodId, number>;
  fair: Record<GoodId, number>;
  /** North last prices. Stall + `/api/snapshot` keep reading this field. */
  lastPrice: Record<GoodId, number>;
  lastPriceSouth: Record<GoodId, number>;
  books: DualBooks;
  /** |North − South| last price per good. */
  arbSpread: Record<GoodId, number>;
  moneySupply: number;
  goodsProducedWindow: number;
  priceIndex: number;
  ledger: Ledger;
  tradeCount: number;
  /** Rolling 3600-tick produced qty for the HUD "24h" analog in tests. */
  producedRing: number[];
  statutes: Statute[];
};

export function createWorld(seed = 1): World {
  const fair = {} as Record<GoodId, number>;
  const npcStock = {} as Record<GoodId, number>;
  const lastPrice = emptyLastPrices();
  const lastPriceSouth = emptyLastPrices();
  for (const id of GOOD_IDS) {
    fair[id] = GOODS[id].fair0;
    npcStock[id] = GOODS[id].produce * 20;
  }
  return {
    tick: 0,
    rng: mulberry32(seed),
    nextOrderId: 1,
    npcCash: 50_000,
    npcStock,
    fair,
    lastPrice,
    lastPriceSouth,
    books: createDualBooks(),
    arbSpread: arbSpreads(lastPrice, lastPriceSouth),
    moneySupply: 50_000,
    goodsProducedWindow: 0,
    priceIndex: 1,
    ledger: { produced: 0, consumed: 0, faucet: 0, sink: 0 },
    tradeCount: 0,
    producedRing: [],
    statutes: createStatuteCatalog(),
  };
}

function roundMoney(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function lastPricesOf(world: World, island: BookIsland): Record<GoodId, number> {
  return island === "north" ? world.lastPrice : world.lastPriceSouth;
}

function post(
  world: World,
  island: BookIsland,
  good: GoodId,
  side: Side,
  price: number,
  qty: number,
): void {
  if (qty <= 0 || price <= 0) return;
  const order: Order = {
    id: world.nextOrderId++,
    good,
    side,
    price: roundMoney(price),
    qty: roundMoney(qty),
  };
  insertOrder(world.books[island][good], order);
}

function match(world: World, island: BookIsland, good: GoodId): void {
  const book = world.books[island][good];
  while (book.bids[0] && book.asks[0] && book.bids[0].price >= book.asks[0].price) {
    const bid = book.bids[0];
    const ask = book.asks[0];
    const qty = Math.min(bid.qty, ask.qty);
    const fillPrice = ask.price;
    const paid = roundMoney(qty * fillPrice);
    const escrowed = roundMoney(qty * bid.price);
    // Seller receives the fill. Buyer already escrowed the bid; refund the spread
    // so a single NPC book does not leak cash.
    world.npcCash = roundMoney(world.npcCash + paid);
    world.npcCash = roundMoney(world.npcCash + (escrowed - paid));
    bid.qty = roundMoney(bid.qty - qty);
    ask.qty = roundMoney(ask.qty - qty);
    lastPricesOf(world, island)[good] = fillPrice;
    const tax = roundMoney(paid * salesTaxRate(world.statutes));
    if (tax > 0) {
      world.npcCash = roundMoney(world.npcCash - tax);
      world.ledger.sink = roundMoney(world.ledger.sink + tax);
    }
    world.ledger.consumed += qty;
    world.tradeCount += 1;
    if (bid.qty <= 1e-9) book.bids.shift();
    if (ask.qty <= 1e-9) book.asks.shift();
  }
}

function restockNpc(world: World): void {
  for (const id of GOOD_IDS) {
    const spec = GOODS[id];
    const shock = 0.85 + world.rng() * 0.3;
    const made = spec.produce * shock;
    world.npcStock[id] = roundMoney(world.npcStock[id] + made);
    world.ledger.produced += made;
    world.producedRing.push(made);
    world.fair[id] = roundMoney(world.fair[id] * (0.995 + world.rng() * 0.01));
  }
  while (world.producedRing.length > 3600) world.producedRing.shift();
  world.goodsProducedWindow = world.producedRing.reduce((a, b) => a + b, 0);
}

function npcQuote(world: World): void {
  for (const island of BOOK_ISLANDS) {
    for (const id of GOOD_IDS) {
      world.books[island][id] = emptyBook();
      const fair = world.fair[id];
      const want = roundMoney(GOODS[id].consume * (0.9 + world.rng() * 0.2));
      const sell = roundMoney(Math.min(world.npcStock[id] * 0.15, GOODS[id].produce * 2));
      const askPx = roundMoney(fair * (0.97 + world.rng() * 0.06));
      const bidPx = roundMoney(fair * (0.98 + world.rng() * 0.06));
      const bidCost = roundMoney(bidPx * want);
      if (bidCost > 0 && world.npcCash >= bidCost) {
        world.npcCash = roundMoney(world.npcCash - bidCost);
        post(world, island, id, "bid", bidPx, want);
      }
      if (sell > 0) {
        world.npcStock[id] = roundMoney(world.npcStock[id] - sell);
        post(world, island, id, "ask", askPx, sell);
      }
    }
  }
}

function settleUnfilled(world: World): void {
  for (const island of BOOK_ISLANDS) {
    for (const id of GOOD_IDS) {
      const book = world.books[island][id];
      for (const bid of book.bids) {
        world.npcCash = roundMoney(world.npcCash + roundMoney(bid.price * bid.qty));
      }
      for (const ask of book.asks) {
        world.npcStock[id] = roundMoney(world.npcStock[id] + ask.qty);
      }
      book.bids = [];
      book.asks = [];
    }
  }
}

function refreshIndex(world: World): void {
  let num = 0;
  let den = 0;
  for (const id of GOOD_IDS) {
    const w = INDEX_WEIGHTS[id];
    num += w * (world.lastPrice[id] / GOODS[id].fair0);
    den += w;
  }
  world.priceIndex = roundMoney(num / den);
  world.arbSpread = arbSpreads(world.lastPrice, world.lastPriceSouth);
  world.moneySupply = world.npcCash;
}

export function tick(world: World): void {
  restockNpc(world);
  npcQuote(world);
  for (const island of BOOK_ISLANDS) {
    for (const id of GOOD_IDS) match(world, island, id);
  }
  settleUnfilled(world);
  refreshIndex(world);
  world.tick += 1;
}

export function fastForward(world: World, n: number): void {
  for (let i = 0; i < n; i++) tick(world);
}

export type Visitor = {
  cash: number;
  stock: Record<GoodId, number>;
  cart: CartLine[];
};

export function createVisitor(cash = 1_000): Visitor {
  const stock = {} as Record<GoodId, number>;
  for (const id of GOOD_IDS) stock[id] = 0;
  return { cash, stock, cart: createVisitorCart() };
}

export function buyFromStall(
  world: World,
  visitor: Visitor,
  good: GoodId,
  qty = 1,
): { ok: true; paid: number } | { ok: false; reason: string } {
  if (!GOOD_IDS.includes(good)) return { ok: false, reason: "unknown_good" };
  const want = roundMoney(qty);
  if (want <= 0) return { ok: false, reason: "bad_qty" };
  const price = world.lastPrice[good];
  const paid = roundMoney(want * price);
  if (visitor.cash < paid) return { ok: false, reason: "no_cash" };
  if (world.npcStock[good] < want) return { ok: false, reason: "no_stock" };
  visitor.cash = roundMoney(visitor.cash - paid);
  visitor.stock[good] = roundMoney(visitor.stock[good] + want);
  world.npcStock[good] = roundMoney(world.npcStock[good] - want);
  world.npcCash = roundMoney(world.npcCash + paid);
  world.ledger.consumed += want;
  world.tradeCount += 1;
  refreshIndex(world);
  return { ok: true, paid };
}

export function hud(world: World): {
  tick: number;
  moneySupply: number;
  goodsProducedWindow: number;
  priceIndex: number;
  tradeCount: number;
  faucet: number;
  sink: number;
} {
  return {
    tick: world.tick,
    moneySupply: world.moneySupply,
    goodsProducedWindow: roundMoney(world.goodsProducedWindow),
    priceIndex: world.priceIndex,
    tradeCount: world.tradeCount,
    faucet: world.ledger.faucet,
    sink: world.ledger.sink,
  };
}
