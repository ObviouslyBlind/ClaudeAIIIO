/** PAPER daily land upkeep sink. Visitor leases only. SIMULATED. Not live. */

import { TICKS_PER_SIM_DAY } from "./calendar.ts";

/** PAPER cash charged once per sim day (3600 ticks) per visitor-leased plot. */
export const UPKEEP_PER_DAY = 1;
/** Inflated asks pay more to hold. Floor stays $1 so old tests without a price still sink. */
export const UPKEEP_OF_ASK = 0.0004;

export function upkeepDue(plot: UpkeepPlot): number {
  const price = Number(plot.price);
  if (!Number.isFinite(price) || price <= 0) return UPKEEP_PER_DAY;
  return Math.max(UPKEEP_PER_DAY, Math.round(price * UPKEEP_OF_ASK));
}

export const UPKEEP_NOTE =
  "PAPER daily land upkeep sink. Visitor-leased plots only. SIMULATED. Not live. Unpaid stays leased in v1.";

export type UpkeepPlot = {
  id: string;
  owner?: string | null;
  use?: string | null;
  unpaid?: boolean;
  price?: number;
};

export type UpkeepLand = {
  plots?: UpkeepPlot[] | null;
};

export type UpkeepWorld = {
  tick: number;
  ledger?: { sink?: number };
  hud?: { sink?: number };
};

export type UpkeepVisitor = {
  cash: number;
};

function roundMoney(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function isDue(tick: number): boolean {
  return tick > 0 && tick % TICKS_PER_SIM_DAY === 0;
}

function isVisitorLease(plot: UpkeepPlot): boolean {
  return plot.owner === "visitor";
}

function hasSinkField(bag: { sink?: number } | undefined): bag is { sink: number } {
  if (!bag || !("sink" in bag)) return false;
  return Number.isFinite(Number(bag.sink));
}

/** Write world.hud.sink and/or world.ledger.sink when those fields exist. */
function addSink(world: UpkeepWorld, amount: number): void {
  if (amount <= 0) return;
  if (hasSinkField(world.ledger)) {
    world.ledger.sink = roundMoney(Number(world.ledger.sink) + amount);
  }
  if (hasSinkField(world.hud)) {
    world.hud.sink = roundMoney(Number(world.hud.sink) + amount);
  }
}

/**
 * Each sim day, visitor-leased plots pay a PAPER upkeep sink.
 * Vacant unleased lots are skipped. Short cash marks the plot unpaid
 * without taking remaining cash and without eviction.
 */
export function tickUpkeep(world: UpkeepWorld, visitor: UpkeepVisitor, land: UpkeepLand): void {
  if (!isDue(world.tick)) return;
  const plots = land?.plots;
  if (!Array.isArray(plots)) return;

  for (const plot of plots) {
    if (!plot || !isVisitorLease(plot)) continue;

    const due = upkeepDue(plot);
    if (!Number.isFinite(visitor.cash) || visitor.cash < due) {
      plot.unpaid = true;
      continue;
    }

    visitor.cash = roundMoney(visitor.cash - due);
    addSink(world, due);
    plot.unpaid = false;
  }
}
