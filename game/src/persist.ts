/** In-memory PAPER shard snapshot. Not Postgres. PLAN C save blob. */

import { DEVELOP_COST, createLandBoard, getPlot, leasePlot, type LandBoard } from "./land.ts";
import {
  applyVisitorOrders,
  dumpStaffSlots,
  dumpVisitorOrders,
  restoreStaffSlots,
  restoreVisitorOrders,
} from "./persistStaffOrders.ts";
import { createVisitor, createWorld, type Visitor, type World } from "./sim.ts";
import { setStatuteSlider, statuteById } from "./statutes.ts";
import type { StaffSlot } from "./staff.ts";
import type { VisitorOrder } from "./orders.ts";
import { dumpCart, restoreCart, type CartLine } from "./visitorCart.ts";

export type ShardInput = {
  world: World;
  land: LandBoard;
  visitor: Visitor;
};

export type ShardBlob = {
  mode: "PAPER";
  provenance: "SIMULATED";
  note: string;
  tick: number;
  visitor: {
    cash: number;
    leases: string[];
    cart: CartLine[];
    staffSlots: StaffSlot[];
    visitorOrders: VisitorOrder[];
  };
  statutes: {
    sales_tax: { rate: number };
  };
};

export type RestoreOk = { ok: true; world: World; land: LandBoard; visitor: Visitor };
export type RestoreFail = { ok: false; reason: string };
export type RestoreResult = RestoreOk | RestoreFail;

const NOTE = "PAPER in-memory shard snapshot. SIMULATED. Not Postgres.";

function jsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function salesTaxSlider(world: World): number {
  const row = statuteById(world.statutes, "sales_tax");
  const rate = Number(row?.sliders.rate);
  return Number.isFinite(rate) ? rate : 0;
}

function visitorLeaseIds(land: LandBoard): string[] {
  return land.plots.filter((p) => p.owner === "visitor").map((p) => p.id);
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function readBlob(raw: unknown): ShardBlob | null {
  if (raw == null || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  if (b.mode !== "PAPER" || b.provenance !== "SIMULATED") return null;
  if (!isFiniteNumber(b.tick)) return null;

  const visitor = b.visitor;
  if (!visitor || typeof visitor !== "object") return null;
  const v = visitor as Record<string, unknown>;
  if (!isFiniteNumber(v.cash)) return null;
  if (!Array.isArray(v.leases) || v.leases.some((id) => typeof id !== "string")) return null;

  const statutes = b.statutes;
  if (!statutes || typeof statutes !== "object") return null;
  const tax = (statutes as Record<string, unknown>).sales_tax;
  if (!tax || typeof tax !== "object") return null;
  const rate = (tax as Record<string, unknown>).rate;
  if (!isFiniteNumber(rate)) return null;

  return {
    mode: "PAPER",
    provenance: "SIMULATED",
    note: typeof b.note === "string" ? b.note : NOTE,
    tick: b.tick,
    visitor: {
      cash: v.cash,
      leases: [...(v.leases as string[])],
      cart: restoreCart(v.cart),
      staffSlots: restoreStaffSlots(v.staffSlots),
      visitorOrders: restoreVisitorOrders(v.visitorOrders),
    },
    statutes: { sales_tax: { rate } },
  };
}

/** Dump a JSON-safe PAPER shard. Cash, leases, cart, staffSlots, open visitorOrders. */
export function serializeShard(input: ShardInput): ShardBlob {
  return jsonSafe({
    mode: "PAPER" as const,
    provenance: "SIMULATED" as const,
    note: NOTE,
    tick: input.world.tick,
    visitor: {
      cash: input.visitor.cash,
      leases: visitorLeaseIds(input.land),
      cart: dumpCart(input.visitor.cart),
      staffSlots: dumpStaffSlots(input.visitor.staffSlots),
      visitorOrders: dumpVisitorOrders(input.visitor),
    },
    statutes: {
      sales_tax: { rate: salesTaxSlider(input.world) },
    },
  });
}

/**
 * Rebuild world, land, and visitor from a blob.
 * Re-applies leasePlot, then restores the saved cash so the lease is not charged twice.
 */
export function restoreShard(raw: unknown): RestoreResult {
  if (raw == null) return { ok: false, reason: "no_blob" };
  const blob = readBlob(raw);
  if (!blob) return { ok: false, reason: "bad_blob" };

  const world = createWorld();
  world.tick = blob.tick;
  setStatuteSlider(world.statutes, "sales_tax", "rate", blob.statutes.sales_tax.rate);

  const land = createLandBoard();
  const leaseCost = blob.visitor.leases.reduce((sum, id) => {
    const plot = getPlot(land, id);
    return sum + (plot?.price ?? 0);
  }, 0);
  const visitor = createVisitor(leaseCost + DEVELOP_COST + Math.max(0, blob.visitor.cash));

  for (const id of blob.visitor.leases) {
    const leased = leasePlot(land, visitor, id);
    if (!leased.ok) return { ok: false, reason: leased.reason };
  }
  visitor.cash = blob.visitor.cash;
  visitor.cart = blob.visitor.cart;
  visitor.staffSlots = blob.visitor.staffSlots;
  applyVisitorOrders(world, visitor, blob.visitor.visitorOrders);

  return { ok: true, world, land, visitor };
}
