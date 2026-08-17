/** PAPER stall buy at an island lastPrice. SIMULATED. Not a live exchange. */

import { GOOD_IDS, type GoodId } from "./goods.ts";
import { BOOK_ISLANDS, type BookIsland } from "./books.ts";
import { afterBuyFillCart } from "./buyCart.ts";
import type { CartLine } from "./visitorCart.ts";

export const BUY_NOTE =
  "PAPER buy at island lastPrice. SIMULATED. Not a live exchange.";

export type BuyIntent = {
  island: unknown;
  goodId: unknown;
  qty?: unknown;
};

export type BuyOk = {
  ok: true;
  paid: number;
  island: BookIsland;
  goodId: GoodId;
  qty: number;
  mode: "PAPER";
  provenance: "SIMULATED";
  note: string;
};

export type BuyFail = {
  ok: false;
  reason: string;
  mode: "PAPER";
  provenance: "SIMULATED";
  note: string;
};

export type BuyResult = BuyOk | BuyFail;

type PaperVisitor = {
  cash: number;
  stock: Record<GoodId, number>;
  cart?: CartLine[];
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

function fail(reason: string): BuyFail {
  return { ok: false, reason, mode: "PAPER", provenance: "SIMULATED", note: BUY_NOTE };
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

/**
 * PAPER fill at that island's lastPrice book. Rejects mixed or missing cash.
 * Does not sell inventory to raise funds. Not a live exchange.
 */
export function buyAtIsland(
  world: PaperWorld,
  visitor: PaperVisitor,
  intent: BuyIntent,
): BuyResult {
  if (!isIsland(intent.island)) return fail("unknown_island");
  if (!isGood(intent.goodId)) return fail("unknown_good");
  const qty = roundMoney(Number(intent.qty ?? 1));
  if (!Number.isFinite(qty) || qty <= 0) return fail("bad_qty");
  if (!Number.isFinite(visitor.cash) || visitor.cash < 0) return fail("mixed_cash");

  const price = lastPricesOf(world, intent.island)[intent.goodId];
  const paid = roundMoney(qty * price);
  if (visitor.cash < paid) return fail("no_cash");
  if (world.npcStock[intent.goodId] < qty) return fail("no_stock");

  visitor.cash = roundMoney(visitor.cash - paid);
  visitor.stock[intent.goodId] = roundMoney((visitor.stock[intent.goodId] ?? 0) + qty);
  world.npcStock[intent.goodId] = roundMoney(world.npcStock[intent.goodId] - qty);
  world.npcCash = roundMoney(world.npcCash + paid);
  world.moneySupply = world.npcCash;
  world.ledger.consumed += qty;
  world.tradeCount += 1;

  const result: BuyOk = {
    ok: true,
    paid,
    island: intent.island,
    goodId: intent.goodId,
    qty,
    mode: "PAPER",
    provenance: "SIMULATED",
    note: BUY_NOTE,
  };
  if (visitor.cart) afterBuyFillCart(visitor, result);
  return result;
}
