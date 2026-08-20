/** In-memory PAPER shard snapshot. Not Postgres. PLAN C save blob. */

import { DEVELOP_COST, createLandBoard, getPlot, leasePlot, type LandBoard } from "./land.ts";
import { pinCartPadAsks } from "./landPrice.ts";
import { isLandUse, type LandUseId } from "./buildings.ts";
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
import { ensurePlay, type PlayState } from "./firstLoop.ts";
import {
  KERNEL_VERSION,
  dumpEvents,
  restoreEvents,
  type EventLog,
  type ShardEvent,
} from "./kernel/index.ts";

export type DevelopedPlot = { plotId: string; use: LandUseId };

export type ShardInput = {
  world: World;
  land: LandBoard;
  visitor: Visitor;
  events?: EventLog;
};

export type ShardBlob = {
  mode: "PAPER";
  provenance: "SIMULATED";
  note: string;
  kernel: typeof KERNEL_VERSION;
  tick: number;
  visitor: {
    cash: number;
    leases: string[];
    develops: DevelopedPlot[];
    cart: CartLine[];
    staffSlots: StaffSlot[];
    visitorOrders: VisitorOrder[];
    play?: PlayState | null;
  };
  statutes: {
    sales_tax: { rate: number };
  };
  landAsks: { id: string; price: number }[];
  events: ShardEvent[];
};

export type RestoreOk = { ok: true; world: World; land: LandBoard; visitor: Visitor; events: EventLog };
export type RestoreFail = { ok: false; reason: string };
export type RestoreResult = RestoreOk | RestoreFail;

const NOTE = "PAPER in-memory shard snapshot. SIMULATED. Not Postgres. Buildings and leases are facts.";

function jsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function salesTaxSlider(world: World): number {
  const row = statuteById(world.statutes, "sales_tax");
  const rate = Number(row?.sliders.rate);
  return Number.isFinite(rate) ? rate : 0;
}

function dumpLandAsks(land: LandBoard): { id: string; price: number }[] {
  return land.plots.map((p) => ({ id: p.id, price: p.price }));
}

function readLandAsks(raw: unknown): { id: string; price: number }[] {
  if (!Array.isArray(raw)) return [];
  const out: { id: string; price: number }[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = String(r.id ?? "").trim();
    if (!id || !isFiniteNumber(r.price) || r.price <= 0) continue;
    out.push({ id, price: r.price });
  }
  return out;
}

function applyLandAsks(land: LandBoard, asks: { id: string; price: number }[]): void {
  if (!asks.length) return;
  const byId = new Map(asks.map((row) => [row.id, row.price]));
  for (const plot of land.plots) {
    const price = byId.get(plot.id);
    if (price != null) plot.price = price;
  }
  pinCartPadAsks(land.plots);
}

function visitorLeaseIds(land: LandBoard): string[] {
  return land.plots.filter((p) => p.owner === "visitor").map((p) => p.id);
}

function visitorDevelops(land: LandBoard): DevelopedPlot[] {
  return land.plots
    .filter((p) => p.owner === "visitor" && p.use && isLandUse(p.use))
    .map((p) => ({ plotId: p.id, use: p.use as LandUseId }));
}

function readDevelops(raw: unknown): DevelopedPlot[] {
  if (!Array.isArray(raw)) return [];
  const out: DevelopedPlot[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const plotId = String(r.plotId ?? "").trim();
    if (!plotId || !isLandUse(r.use)) continue;
    out.push({ plotId, use: r.use });
  }
  return out;
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
    kernel: KERNEL_VERSION,
    tick: b.tick,
    visitor: {
      cash: v.cash,
      leases: [...(v.leases as string[])],
      develops: readDevelops(v.develops),
      cart: restoreCart(v.cart),
      staffSlots: restoreStaffSlots(v.staffSlots),
      visitorOrders: restoreVisitorOrders(v.visitorOrders),
      play: v.play && typeof v.play === "object" ? (v.play as PlayState) : null,
    },
    statutes: { sales_tax: { rate } },
    landAsks: readLandAsks(b.landAsks),
    events: dumpEvents(restoreEvents(b.events)),
  };
}

/** Dump a JSON-safe PAPER shard. Cash, leases, buildings, cart, staff, orders, events. */
export function serializeShard(input: ShardInput): ShardBlob {
  return jsonSafe({
    mode: "PAPER" as const,
    provenance: "SIMULATED" as const,
    note: NOTE,
    kernel: KERNEL_VERSION,
    tick: input.world.tick,
    visitor: {
      cash: input.visitor.cash,
      leases: visitorLeaseIds(input.land),
      develops: visitorDevelops(input.land),
      cart: dumpCart(input.visitor.cart),
      staffSlots: dumpStaffSlots(input.visitor.staffSlots),
      visitorOrders: dumpVisitorOrders(input.visitor),
      play: input.visitor.play ?? null,
    },
    statutes: {
      sales_tax: { rate: salesTaxSlider(input.world) },
    },
    landAsks: dumpLandAsks(input.land),
    events: dumpEvents(input.events ?? restoreEvents([])),
  });
}

/**
 * Rebuild world, land, and visitor from a blob.
 * Re-applies leasePlot, seats saved buildings without charging again, then restores cash.
 */
export function restoreShard(raw: unknown): RestoreResult {
  if (raw == null) return { ok: false, reason: "no_blob" };
  const blob = readBlob(raw);
  if (!blob) return { ok: false, reason: "bad_blob" };

  const world = createWorld();
  world.tick = blob.tick;
  setStatuteSlider(world.statutes, "sales_tax", "rate", blob.statutes.sales_tax.rate);

  const land = createLandBoard();
  applyLandAsks(land, blob.landAsks);
  const leaseCost = blob.visitor.leases.reduce((sum, id) => {
    const plot = getPlot(land, id);
    return sum + (plot?.price ?? 0);
  }, 0);
  const visitor = createVisitor(leaseCost + DEVELOP_COST + Math.max(0, blob.visitor.cash));

  for (const id of blob.visitor.leases) {
    const leased = leasePlot(land, visitor, id, "visitor", { inflate: false });
    if (!leased.ok) return { ok: false, reason: leased.reason };
  }
  for (const row of blob.visitor.develops) {
    const plot = getPlot(land, row.plotId);
    if (!plot || plot.owner !== "visitor") continue;
    plot.use = row.use;
  }
  visitor.cash = blob.visitor.cash;
  visitor.cart = blob.visitor.cart;
  visitor.staffSlots = blob.visitor.staffSlots;
  applyVisitorOrders(world, visitor, blob.visitor.visitorOrders);
  if (blob.visitor.play) {
    visitor.play = blob.visitor.play;
    ensurePlay(visitor);
  }

  return { ok: true, world, land, visitor, events: restoreEvents(blob.events) };
}
