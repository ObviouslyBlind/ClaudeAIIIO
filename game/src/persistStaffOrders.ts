/** PAPER staffSlots + open visitorOrders dump/restore. SIMULATED. Not live. */

import { BOOK_ISLANDS, type BookIsland, type Side } from "./books.ts";
import { GOOD_IDS, type GoodId } from "./goods.ts";
import {
  listOpenOrders,
  restoreRestingOrders,
  type VisitorOrder,
} from "./orders.ts";
import type { StaffSlot } from "./staff.ts";
import type { Visitor, World } from "./sim.ts";

function roundMoney(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function isGoodId(raw: unknown): raw is GoodId {
  return typeof raw === "string" && (GOOD_IDS as readonly string[]).includes(raw);
}

function isIsland(raw: unknown): raw is BookIsland {
  return typeof raw === "string" && (BOOK_ISLANDS as readonly string[]).includes(raw);
}

function isSide(raw: unknown): raw is Side {
  return raw === "bid" || raw === "ask";
}

/** JSON-safe PAPER staff slots. Missing or junk → empty. */
export function restoreStaffSlots(raw: unknown): StaffSlot[] {
  if (!Array.isArray(raw)) return [];
  const out: StaffSlot[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const plotId = typeof rec.plotId === "string" ? rec.plotId.trim() : "";
    if (!plotId) continue;
    const use = typeof rec.use === "string" ? rec.use.trim() : "";
    if (!use) continue;
    if (!isGoodId(rec.good)) continue;
    const wage = roundMoney(Number(rec.wage));
    if (!Number.isFinite(wage) || wage < 0) continue;
    out.push({
      plotId,
      use,
      good: rec.good,
      wage,
      mode: "PAPER",
      provenance: "SIMULATED",
    });
  }
  return out;
}

export function dumpStaffSlots(slots: StaffSlot[] | undefined): StaffSlot[] {
  return restoreStaffSlots(slots);
}

/** JSON-safe open PAPER visitor orders. Missing or junk → empty. Filled qty is gone. */
export function restoreVisitorOrders(raw: unknown): VisitorOrder[] {
  if (!Array.isArray(raw)) return [];
  const out: VisitorOrder[] = [];
  const seen = new Set<number>();
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const id = Number(rec.id);
    if (!Number.isInteger(id) || id < 1 || seen.has(id)) continue;
    if (!isIsland(rec.island) || !isGoodId(rec.goodId) || !isSide(rec.side)) continue;
    const price = roundMoney(Number(rec.price));
    const qty = roundMoney(Number(rec.qty));
    if (!Number.isFinite(price) || price <= 0) continue;
    if (!Number.isFinite(qty) || qty <= 1e-9) continue;
    seen.add(id);
    out.push({
      id,
      island: rec.island,
      goodId: rec.goodId,
      side: rec.side,
      price,
      qty,
      mode: "PAPER",
      provenance: "SIMULATED",
    });
  }
  return out;
}

export function dumpVisitorOrders(visitor: Visitor): VisitorOrder[] {
  return restoreVisitorOrders(listOpenOrders(visitor));
}

/**
 * Re-seat parsed PAPER open orders on a restored world + visitor.
 * Does not escrow again. Does not evict leases or staff.
 */
export function applyVisitorOrders(
  world: World,
  visitor: Visitor,
  orders: VisitorOrder[],
): void {
  restoreRestingOrders(world, visitor, orders);
}
