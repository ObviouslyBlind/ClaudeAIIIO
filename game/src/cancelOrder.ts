/** PAPER cancel of a visitor limit order. Refunds escrow. SIMULATED. Not a live exchange. */

import type { GoodId } from "./goods.ts";
import {
  dropRestingOrder,
  findRestingOrder,
  type VisitorOrder,
} from "./orders.ts";

type PaperWorld = Parameters<typeof findRestingOrder>[0];

export const CANCEL_NOTE =
  "PAPER cancel of visitor limit order. Refunds escrow. SIMULATED. Not a live exchange.";

export type CancelOk = {
  ok: true;
  order: VisitorOrder;
  refunded: { cash: number; stock: number };
  mode: "PAPER";
  provenance: "SIMULATED";
  note: string;
};

export type CancelFail = {
  ok: false;
  reason: string;
  mode: "PAPER";
  provenance: "SIMULATED";
  note: string;
};

export type CancelResult = CancelOk | CancelFail;

type PaperVisitor = {
  cash: number;
  stock: Record<GoodId, number>;
};

function roundMoney(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function fail(reason: string): CancelFail {
  return { ok: false, reason, mode: "PAPER", provenance: "SIMULATED", note: CANCEL_NOTE };
}

/**
 * Cancel a resting PAPER visitor order and refund remaining escrow.
 * Bid → cash. Ask → stock. Rejects missing / not-owner. Not a live exchange.
 */
export function cancelOrder(
  world: PaperWorld,
  visitor: PaperVisitor,
  orderId: unknown,
): CancelResult {
  const id = Number(orderId);
  if (!Number.isFinite(id)) return fail("missing");

  const row = findRestingOrder(world, id);
  if (!row) return fail("missing");
  if (row.visitor !== visitor) return fail("not-owner");

  const qty = row.qty;
  let cash = 0;
  let stock = 0;
  if (row.side === "bid") {
    cash = roundMoney(row.price * qty);
    visitor.cash = roundMoney(visitor.cash + cash);
  } else {
    stock = qty;
    visitor.stock[row.goodId] = roundMoney((visitor.stock[row.goodId] ?? 0) + stock);
  }

  const order: VisitorOrder = {
    id: row.id,
    island: row.island,
    goodId: row.goodId,
    side: row.side,
    price: row.price,
    qty,
    mode: "PAPER",
    provenance: "SIMULATED",
  };
  row.qty = 0;
  dropRestingOrder(world, row);
  return {
    ok: true,
    order,
    refunded: { cash, stock },
    mode: "PAPER",
    provenance: "SIMULATED",
    note: CANCEL_NOTE,
  };
}
