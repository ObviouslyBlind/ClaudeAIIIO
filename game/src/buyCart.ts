/** After a successful PAPER buy, add qty to visitor.cart. Skip rejected buys. SIMULATED. */

import { addLine, type CartHolder, type CartLine } from "./visitorCart.ts";

export const BUY_CART_NOTE =
  "PAPER buy also fills the cart. SIMULATED. Not a live exchange.";

export type BuyCartFill = {
  goodId?: unknown;
  qty?: unknown;
  ok?: boolean;
};

export type BuyCartOk = {
  ok: true;
  line: CartLine;
  cart: CartLine[];
  mode: "PAPER";
  provenance: "SIMULATED";
  note: string;
};

export type BuyCartFail = {
  ok: false;
  reason: string;
  mode: "PAPER";
  provenance: "SIMULATED";
  note: string;
};

export type BuyCartResult = BuyCartOk | BuyCartFail;

function fail(reason: string): BuyCartFail {
  return { ok: false, reason, mode: "PAPER", provenance: "SIMULATED", note: BUY_CART_NOTE };
}

/**
 * Add a successful PAPER buy onto visitor.cart (same goodId, qty merges).
 * Skip if the buy was rejected (`ok === false`). Not a live exchange.
 */
export function afterBuyFillCart(visitor: CartHolder, fill: BuyCartFill): BuyCartResult {
  if (fill.ok === false) return fail("buy_rejected");
  const added = addLine(visitor, fill.goodId, fill.qty);
  if (!added.ok) return fail(added.reason);
  return {
    ok: true,
    line: added.line,
    cart: added.cart,
    mode: "PAPER",
    provenance: "SIMULATED",
    note: BUY_CART_NOTE,
  };
}
