/**
 * Dual-island NPC quote bias. PLAN §3.2–3.3:
 * South grows food and ore. North makes tools and concrete.
 * The ferry (ticket, port fee, tariff) is the only wedge on imports.
 * PAPER / SIMULATED.
 */

import { GOODS, type GoodId } from "./goods.ts";
import type { BookIsland } from "./books.ts";
import { ferryTicketCost, nationalTariffRate, portFeeAmount, type Statute } from "./statutes.ts";

export const NATIVE_FAIR_MUL = 0.92;
export const IMPORT_FAIR_MUL = 1.08;
export const NATIVE_SUPPLY_MUL = 1.35;
export const IMPORT_SUPPLY_MUL = 0.7;
export const NATIVE_DEMAND_MUL = 0.85;
export const IMPORT_DEMAND_MUL = 1.25;

/** South is native in food and extract. North is native in industry. */
export function isNative(island: BookIsland, good: GoodId): boolean {
  const chain = GOODS[good].chain;
  if (island === "south") return chain === "food" || chain === "extract";
  return chain === "industry";
}

export function islandFairMul(island: BookIsland, good: GoodId): number {
  return isNative(island, good) ? NATIVE_FAIR_MUL : IMPORT_FAIR_MUL;
}

export function islandSupplyMul(island: BookIsland, good: GoodId): number {
  return isNative(island, good) ? NATIVE_SUPPLY_MUL : IMPORT_SUPPLY_MUL;
}

export function islandDemandMul(island: BookIsland, good: GoodId): number {
  return isNative(island, good) ? NATIVE_DEMAND_MUL : IMPORT_DEMAND_MUL;
}

/**
 * Extra premium on the importing island.
 * Launch: ticket $15 / 500 + port $2 / 50 + tariff 0 ≈ 7%.
 * Raising tariff or the ferry ticket widens North–South last prints.
 */
export function ferryFriction(statutes: Statute[]): number {
  const tariff = nationalTariffRate(statutes);
  const ticket = ferryTicketCost(statutes);
  const port = portFeeAmount(statutes);
  return Math.max(0, tariff) + ticket / 500 + port / 50;
}

/** Ask multiplier vs island fair. Imports pay ferry friction. */
export function islandAskMul(island: BookIsland, good: GoodId, statutes: Statute[]): number {
  const base = islandFairMul(island, good);
  if (isNative(island, good)) return base;
  return base * (1 + ferryFriction(statutes));
}
