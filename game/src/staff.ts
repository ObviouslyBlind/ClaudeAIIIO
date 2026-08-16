/** PAPER AI staff on developed visitor plots. Max 2 per plot. SIMULATED wages. Not live. */

import { TICKS_PER_SIM_DAY } from "./calendar.ts";
import type { GoodId } from "./goods.ts";
import type { Visitor, World } from "./sim.ts";

export const MAX_STAFF_PER_PLOT = 2;
/** PAPER daily wage per slot. Matches the wage-floor catalog default. */
export const STAFF_WAGE = 4;
/** Extra goods per staffed slot on payday. */
export const STAFF_OUTPUT = 1;

export const STAFF_NOTE =
  "PAPER AI staff on developed plots. Max 2 per plot. SIMULATED wages. Not live.";

/** Developed-plot use → matching good (food for farm, etc.). */
export const GOOD_FOR_USE: Record<string, GoodId> = {
  farm: "corn",
  stall: "corn",
  shop: "beans",
  house_shop: "potato",
  warehouse: "lumber",
  factory: "tools",
  house: "lettuce",
};

export type StaffablePlot = {
  id: string;
  owner?: string | null;
  use?: string | null;
};

export type StaffSlot = {
  plotId: string;
  use: string;
  good: GoodId;
  wage: number;
  mode: "PAPER";
  provenance: "SIMULATED";
};

export type StaffOk = { ok: true; slot: StaffSlot; staffSlots: StaffSlot[] };
export type StaffFail = { ok: false; reason: string };
export type StaffResult = StaffOk | StaffFail;

export type StaffSnapshot = {
  mode: "PAPER";
  provenance: "SIMULATED";
  note: string;
  staffSlots: StaffSlot[];
};

function roundMoney(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function slotsOf(visitor: Visitor): StaffSlot[] {
  if (!visitor.staffSlots) visitor.staffSlots = [];
  return visitor.staffSlots;
}

function goodsOf(visitor: Visitor): Record<string, number> {
  if (!visitor.goods) visitor.goods = visitor.stock;
  return visitor.goods;
}

function plotIdOf(plot: StaffablePlot | string): string {
  if (typeof plot === "string") return plot.trim();
  return String(plot?.id ?? "").trim();
}

function countOnPlot(visitor: Visitor, plotId: string): number {
  return slotsOf(visitor).filter((s) => s.plotId === plotId).length;
}

export function staffSlotsOf(visitor: Visitor): StaffSlot[] {
  return slotsOf(visitor);
}

export function staffSnapshot(visitor: Visitor): StaffSnapshot {
  return {
    mode: "PAPER",
    provenance: "SIMULATED",
    note: STAFF_NOTE,
    staffSlots: slotsOf(visitor).map((s) => ({ ...s })),
  };
}

function makeSlot(plotId: string, use: string, good: GoodId): StaffSlot {
  return {
    plotId,
    use,
    good,
    wage: STAFF_WAGE,
    mode: "PAPER",
    provenance: "SIMULATED",
  };
}

/**
 * Hire one PAPER AI slot on a developed visitor plot.
 * Rejects if cash cannot cover one day's wage, the plot is not yours,
 * it is vacant, or the plot is already at the cap.
 */
export function hireStaff(visitor: Visitor, plot: StaffablePlot): StaffResult {
  const plotId = plotIdOf(plot);
  if (!plotId) return { ok: false, reason: "no_plot" };
  if (plot.owner !== "visitor") return { ok: false, reason: "not_yours" };

  const use = String(plot.use ?? "").trim();
  if (!use) return { ok: false, reason: "not_developed" };

  const good = GOOD_FOR_USE[use];
  if (!good) return { ok: false, reason: "bad_use" };

  if (countOnPlot(visitor, plotId) >= MAX_STAFF_PER_PLOT) {
    return { ok: false, reason: "cap" };
  }

  if (visitor.cash < STAFF_WAGE) return { ok: false, reason: "no_cash" };

  const slot = makeSlot(plotId, use, good);
  slotsOf(visitor).push(slot);
  return { ok: true, slot, staffSlots: slotsOf(visitor) };
}

/** Fire one PAPER AI slot on the plot. Last hired on that plot leaves first. */
export function fireStaff(visitor: Visitor, plot: StaffablePlot | string): StaffResult {
  const plotId = plotIdOf(plot);
  if (!plotId) return { ok: false, reason: "no_plot" };

  const slots = slotsOf(visitor);
  let last = -1;
  for (let i = 0; i < slots.length; i++) {
    if (slots[i]!.plotId === plotId) last = i;
  }
  if (last < 0) return { ok: false, reason: "no_staff" };

  const slot = slots[last]!;
  slots.splice(last, 1);
  return { ok: true, slot, staffSlots: slots };
}

function isPayday(tick: number): boolean {
  return tick > 0 && tick % TICKS_PER_SIM_DAY === 0;
}

/**
 * Each sim day (3600 ticks) every staffed slot costs a PAPER wage from visitor
 * cash and adds a little matching output into visitor.goods.
 * Unpaid slots stay hired but idle that day.
 */
export function tickStaff(world: World, visitor: Visitor): void {
  if (!isPayday(world.tick)) return;

  const goods = goodsOf(visitor);
  for (const slot of slotsOf(visitor)) {
    const wage = slot.wage > 0 ? slot.wage : STAFF_WAGE;
    if (visitor.cash < wage) continue;
    visitor.cash = roundMoney(visitor.cash - wage);
    const have = goods[slot.good] ?? 0;
    goods[slot.good] = roundMoney(have + STAFF_OUTPUT);
  }
}
