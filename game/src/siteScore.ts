/**
 * Site desirability for carts, shops, and mines.
 * Score is 0–10. Crowding on the same street caps earnings.
 * PAPER / SIMULATED.
 */

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

export type SiteScoreInput = {
  hired: boolean;
  stocked: boolean;
  upgraded: boolean;
  traffic: TrafficBand;
  rivalsOnStreet: number;
  boostLeft?: number;
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
  if (band === "green") return 2;
  if (band === "yellow") return 1;
  return 0.5;
}

/** How many people are looking on this street. High traffic, more search. */
export function searchingOnStreet(traffic: TrafficBand, rivals: number): number {
  const base = traffic === "green" ? 8 : traffic === "yellow" ? 4 : 2;
  return Math.max(1, base - rivals);
}

/**
 * Staff 2.5, stock 2.5, fridge/upgrade 3, foot traffic up to 2 → 10.
 * Two or more rivals on the same street cap the score at 5.
 */
export function scoreSite(input: SiteScoreInput): SiteScore {
  const parts: SiteScorePart[] = [
    { id: "staff", label: "Staffed", points: input.hired ? 2.5 : 0 },
    { id: "stock", label: "Stocked", points: input.stocked ? 2.5 : 0 },
    { id: "upgrade", label: "Upgraded", points: input.upgraded ? 3 : 0 },
    { id: "traffic", label: "Foot traffic", points: trafficPoints(input.traffic) },
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
