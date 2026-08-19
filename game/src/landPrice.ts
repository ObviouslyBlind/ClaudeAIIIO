/**
 * Plot asks and land-ask inflation. PAPER / SIMULATED.
 * A lease bumps remaining vacant asks; prices stay finite vs seed.
 */

import {
  LAND_ASK_CAP_MUL,
  LAND_FLOOR,
  LAND_GLOBAL_BUMP,
  LAND_ISLAND_BUMP,
  LAND_NORTH_RATE,
  LAND_SOUTH_RATE,
  LAND_STREET_BUMP,
} from "./economy.ts";

export type PricedBand = "shore" | "street" | "field";
export type PricedIsland = "north" | "south";

export type AskPlot = {
  id: string;
  island: PricedIsland;
  band: PricedBand;
  street: string;
  owner: string | null;
  price: number;
  seedPrice: number;
  class?: string;
};

function roundAsk(n: number): number {
  return Math.max(1, Math.round(n));
}

export function bandMul(band: PricedBand): number {
  if (band === "shore") return 1.55;
  if (band === "street") return 1;
  return 0.62;
}

export function portDistMul(portDist: number): number {
  return 1.35 - Math.min(0.7, portDist / 520);
}

export function plotAsk(
  island: PricedIsland,
  area: number,
  band: PricedBand,
  portDist: number,
): number {
  const rate = island === "north" ? LAND_NORTH_RATE : LAND_SOUTH_RATE;
  const raw = area * rate * bandMul(band) * portDistMul(portDist);
  return Math.max(LAND_FLOOR[island][band], roundAsk(raw));
}

function bumpFor(bought: AskPlot, other: AskPlot): number {
  if (other.island === bought.island && other.street === bought.street) return LAND_STREET_BUMP;
  if (other.island === bought.island) return LAND_ISLAND_BUMP;
  return LAND_GLOBAL_BUMP;
}

function capAsk(plot: AskPlot, next: number): number {
  const seed = plot.seedPrice > 0 ? plot.seedPrice : plot.price;
  return Math.min(roundAsk(seed * LAND_ASK_CAP_MUL), roundAsk(next));
}

/** Raise vacant asks after a lease. Restore passes inflate: false.
 *  Cart pads stay $750 and do not bump street / field asks. */
export function inflateAsksAfterLease(plots: AskPlot[], bought: AskPlot): void {
  if (bought.class === "cart_pad") return;
  for (const other of plots) {
    if (other.id === bought.id) continue;
    if (other.owner) continue;
    if (other.class === "cart_pad") continue;
    const next = other.price * (1 + bumpFor(bought, other));
    other.price = capAsk(other, next);
  }
}

/** Mean vacant ask / seed. 1 at spawn. Stays finite under the cap. */
export function landAskIndex(plots: AskPlot[]): number {
  let num = 0;
  let den = 0;
  for (const p of plots) {
    if (p.owner) continue;
    const seed = p.seedPrice > 0 ? p.seedPrice : p.price;
    if (seed <= 0) continue;
    num += p.price / seed;
    den += 1;
  }
  if (den < 1) return 1;
  return Math.round((num / den) * 10000) / 10000;
}
