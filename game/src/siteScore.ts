/**
 * Site desirability for carts, shops, and mines.
 * Score is 0–10. Crowding on the same street caps earnings.
 * PAPER / SIMULATED.
 */

import { CART_UPGRADES } from "./economy.ts";

export type SiteClass = "cart" | "shop" | "mine";
export type TrafficBand = "green" | "yellow" | "red";

/** 10 sales in 3 minutes at 1 Hz when the site is a 10. */
export const SALES_PER_WINDOW = 10;
export const SALE_WINDOW_TICKS = 180;
export const BASE_SELL_TICKS = SALE_WINDOW_TICKS / SALES_PER_WINDOW;
export const SALE_PRICE = 6;

export type SiteScorePart = {
  id: string;
  label: string;
  points: number;
};

export type SiteUpgradePart = {
  id: string;
  label: string;
  points: number;
};

/** Fridge is first. Later kit is how you climb toward 8–10. */
export const UPGRADE_APPEAL: SiteUpgradePart[] = CART_UPGRADES.map((u) => ({
  id: u.id,
  label: u.label,
  points: u.appeal,
}));

export function appealFor(id: string): number {
  return UPGRADE_APPEAL.find((u) => u.id === id)?.points ?? 0;
}

export type SiteScoreInput = {
  hired: boolean;
  stocked: boolean;
  upgraded: boolean;
  upgrades?: string[];
  traffic: TrafficBand;
  rivalsOnStreet: number;
  boostLeft?: number;
  /** Empty cart floor. Fruit 1, fry 2. */
  baseGrade?: number;
};

export type SiteScore = {
  parts: SiteScorePart[];
  raw: number;
  cap: number;
  score: number;
  sellTicks: number;
  rivalsOnStreet: number;
  searching: number;
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function trafficPoints(band: TrafficBand): number {
  if (band === "green") return 1.5;
  if (band === "yellow") return 1;
  return 0.5;
}

/** How many people are looking on this street. High traffic, more search. */
export function searchingOnStreet(traffic: TrafficBand, rivals: number): number {
  const base = traffic === "green" ? 8 : traffic === "yellow" ? 4 : 2;
  return Math.max(1, base - rivals);
}

function upgradeParts(input: SiteScoreInput): SiteScorePart[] {
  const ids = Array.isArray(input.upgrades) ? input.upgrades : [];
  if (ids.length) {
    return ids.map((id) => {
      const spec = UPGRADE_APPEAL.find((u) => u.id === id);
      return { id, label: spec?.label || id, points: spec?.points ?? 0 };
    });
  }
  return [{ id: "upgrade", label: "Upgraded", points: input.upgraded ? appealFor("fridge") : 0 }];
}

/**
 * Empty carts sit at 1–2. Hire, stock, and paid kit climb toward 8–10.
 * Two or more rivals on the same street cap the score at 5.
 */
export function scoreSite(input: SiteScoreInput): SiteScore {
  const base = Math.max(1, Math.min(2, Number(input.baseGrade) || 1));
  const parts: SiteScorePart[] = [
    { id: "cart", label: "Cart", points: base },
    { id: "staff", label: "Staffed", points: input.hired ? 1 : 0 },
    { id: "stock", label: "Stocked", points: input.stocked ? 1 : 0 },
    ...upgradeParts(input),
    {
      id: "traffic",
      label: "Foot traffic",
      points: input.stocked ? trafficPoints(input.traffic) : 0,
    },
  ];
  const raw = round1(parts.reduce((sum, p) => sum + p.points, 0));
  const rivals = Math.max(0, Math.floor(Number(input.rivalsOnStreet) || 0));
  const cap = rivals >= 2 ? 5 : rivals === 1 ? 7.5 : 10;
  const score = round1(Math.min(raw, cap));
  const denom = Math.max(1, score);
  let sellTicks = Math.max(6, Math.round(BASE_SELL_TICKS * (10 / denom)));
  if ((input.boostLeft || 0) > 0) {
    sellTicks = Math.max(6, Math.round(sellTicks * 0.6));
  }
  return {
    parts,
    raw,
    cap,
    score,
    sellTicks,
    rivalsOnStreet: rivals,
    searching: searchingOnStreet(input.traffic, rivals),
  };
}

export function siteClassForUse(use: string | null | undefined): SiteClass | null {
  if (!use) return null;
  if (use === "shop" || use === "house_shop" || use === "stall") return "shop";
  if (use === "factory" || use === "farm") return "mine";
  return null;
}
