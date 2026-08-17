/** PAPER stall sell at an island lastPrice. SIMULATED. Not a live exchange. */

import { GOOD_IDS, type GoodId } from "./goods.ts";
import { BOOK_ISLANDS, type BookIsland } from "./books.ts";

export const SELL_NOTE =
  "PAPER sell at island lastPrice. SIMULATED. Not a live exchange.";

export type SellIntent = {
  island: unknown;
  goodId: unknown;
  qty?: unknown;
};

export type SellOk = {
  ok: true;
  paid: number;
  island: BookIsland;
  goodId: GoodId;
  qty: number;
  mode: "PAPER";
  provenance: "SIMULATED";
  note: string;
};

export type SellFail = {
  ok: false;
  reason: string;
  mode: "PAPER";
  provenance: "SIMULATED";
  note: string;
};

export type SellResult = SellOk | SellFail;

type PaperVisitor = {
  cash: number;
  stock: Record<GoodId, number>;
  /** Same bag as stock when aliased. Staff payday may write here. */
  goods?: Record<GoodId, number>;
};

type PaperWorld = {
  npcCash: number;
  npcStock: Record<GoodId, number>;
  lastPrice: Record<GoodId, number>;
  lastPriceSouth: Record<GoodId, number>;
  ledger: { consumed: number };
  tradeCount: number;
  moneySupply: number;
};

function roundMoney(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function fail(reason: string): SellFail {
  return { ok: false, reason, mode: "PAPER", provenance: "SIMULATED", note: SELL_NOTE };
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

function bagQty(bag: Record<GoodId, number> | undefined, goodId: GoodId): number {
  if (!bag) return 0;
  const n = Number(bag[goodId] ?? 0);
  return n;
}

/**
 * Visitor inventory is stock, or the staff goods bag when that is the same bag.
 * Split / NaN / negative holdings are mixed and do not sell.
 */
function visitorHeld(
  visitor: PaperVisitor,
  goodId: GoodId,
): { ok: true; qty: number } | { ok: false; reason: "mixed" } {
  const stockQty = bagQty(visitor.stock, goodId);
  const goods = visitor.goods;
  if (goods && goods !== visitor.stock) {
    const goodsQty = bagQty(goods, goodId);
    if (!Number.isFinite(stockQty) || stockQty < 0 || !Number.isFinite(goodsQty) || goodsQty < 0) {
      return { ok: false, reason: "mixed" };
    }
    if (stockQty !== goodsQty) return { ok: false, reason: "mixed" };
    return { ok: true, qty: stockQty };
  }
  if (!Number.isFinite(stockQty) || stockQty < 0) return { ok: false, reason: "mixed" };
  return { ok: true, qty: stockQty };
}

function debitHeld(visitor: PaperVisitor, goodId: GoodId, qty: number): void {
  visitor.stock[goodId] = roundMoney((visitor.stock[goodId] ?? 0) - qty);
  if (visitor.goods && visitor.goods !== visitor.stock) {
    visitor.goods[goodId] = roundMoney((visitor.goods[goodId] ?? 0) - qty);
  }
}

/**
 * PAPER fill selling visitor.stock/goods into that island's lastPrice book.
 * Rejects no stock or mixed bags. Credits visitor.cash. Not a live exchange.
 */
export function sellAtIsland(
  world: PaperWorld,
  visitor: PaperVisitor,
  intent: SellIntent,
): SellResult {
  if (!isIsland(intent.island)) return fail("unknown_island");
  if (!isGood(intent.goodId)) return fail("unknown_good");
  const qty = roundMoney(Number(intent.qty ?? 1));
  if (!Number.isFinite(qty) || qty <= 0) return fail("bad_qty");
  if (!Number.isFinite(visitor.cash) || visitor.cash < 0) return fail("mixed");

  const held = visitorHeld(visitor, intent.goodId);
  if (!held.ok) return fail(held.reason);
  if (held.qty < qty) return fail("no_stock");

  const price = lastPricesOf(world, intent.island)[intent.goodId];
  const paid = roundMoney(qty * price);
  if (!Number.isFinite(price) || price < 0) return fail("mixed");
  if (world.npcCash < paid) return fail("no_cash");

  visitor.cash = roundMoney(visitor.cash + paid);
  debitHeld(visitor, intent.goodId, qty);
  world.npcStock[intent.goodId] = roundMoney((world.npcStock[intent.goodId] ?? 0) + qty);
  world.npcCash = roundMoney(world.npcCash - paid);
  world.moneySupply = world.npcCash;
  world.tradeCount += 1;

  return {
    ok: true,
    paid,
    island: intent.island,
    goodId: intent.goodId,
    qty,
    mode: "PAPER",
    provenance: "SIMULATED",
    note: SELL_NOTE,
  };
}
