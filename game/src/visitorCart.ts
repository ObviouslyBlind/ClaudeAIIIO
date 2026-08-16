/** Visitor PAPER cart lines (goodId, qty). Weight skipped. SIMULATED. Not live. */

import { GOOD_IDS, type GoodId } from "./goods.ts";

export type CartLine = {
  goodId: GoodId;
  qty: number;
};

export type CartHolder = {
  cart: CartLine[];
};

export type CartOk = { ok: true; line: CartLine; cart: CartLine[] };
export type CartFail = { ok: false; reason: string };
export type CartResult = CartOk | CartFail;

function roundQty(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function isGoodId(raw: unknown): raw is GoodId {
  return typeof raw === "string" && (GOOD_IDS as readonly string[]).includes(raw);
}

export function createVisitorCart(): CartLine[] {
  return [];
}

export function addLine(holder: CartHolder, goodId: unknown, qty: unknown): CartResult {
  if (!isGoodId(goodId)) return { ok: false, reason: "unknown_good" };
  const want = roundQty(Number(qty));
  if (!Number.isFinite(want) || want <= 0) return { ok: false, reason: "bad_qty" };

  const existing = holder.cart.find((row) => row.goodId === goodId);
  if (existing) {
    existing.qty = roundQty(existing.qty + want);
    return { ok: true, line: existing, cart: holder.cart };
  }

  const line: CartLine = { goodId, qty: want };
  holder.cart.push(line);
  return { ok: true, line, cart: holder.cart };
}

export function removeLine(holder: CartHolder, goodId: unknown): CartResult {
  if (!isGoodId(goodId)) return { ok: false, reason: "unknown_good" };
  const idx = holder.cart.findIndex((row) => row.goodId === goodId);
  if (idx < 0) return { ok: false, reason: "no_line" };
  const [line] = holder.cart.splice(idx, 1);
  return { ok: true, line: line!, cart: holder.cart };
}

/** JSON-safe { goodId, qty } rows. Weight is not dumped. */
export function dumpCart(cart: CartLine[] | undefined): CartLine[] {
  return restoreCart(cart);
}

/** Rebuild lines from a dump. Missing or junk cart → empty. Weight ignored. */
export function restoreCart(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  const out: CartLine[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    if (!isGoodId(rec.goodId)) continue;
    const qty = roundQty(Number(rec.qty));
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const existing = out.find((line) => line.goodId === rec.goodId);
    if (existing) existing.qty = roundQty(existing.qty + qty);
    else out.push({ goodId: rec.goodId, qty });
  }
  return out;
}
