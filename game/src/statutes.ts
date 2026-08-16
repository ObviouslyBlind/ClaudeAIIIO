/** Paper statute catalog. Players amend rows; they do not author from blank paper. */

export type StatuteGroup =
  | "money"
  | "trade"
  | "land"
  | "planning"
  | "firms"
  | "labour"
  | "environment"
  | "stocks"
  | "elections"
  | "offices";

export type Statute = {
  id: string;
  title: string;
  group: StatuteGroup;
  enabled: boolean;
  money_bill: boolean;
  council_may_restrict: boolean;
  sliders: Record<string, number>;
  writes: string[];
  provenance: "PAPER";
};

/**
 * Seed rows so the sim hook and ferry can read them.
 * Builder fills to ~80 rows, ~60 enabled (PLAN §8).
 */
export function createStatuteCatalog(): Statute[] {
  return [
    {
      id: "sales_tax",
      title: "Sales tax",
      group: "money",
      enabled: true,
      money_bill: true,
      council_may_restrict: false,
      sliders: { rate: 0 },
      writes: ["ledger.sink"],
      provenance: "PAPER",
    },
    {
      id: "ferry_ticket",
      title: "Ferry ticket",
      group: "trade",
      enabled: true,
      money_bill: true,
      council_may_restrict: false,
      sliders: { cost: 15 },
      writes: ["ferry.cost"],
      provenance: "PAPER",
    },
  ];
}

export function statuteById(catalog: Statute[], id: string): Statute | undefined {
  return catalog.find((s) => s.id === id);
}

export function salesTaxRate(catalog: Statute[]): number {
  const s = statuteById(catalog, "sales_tax");
  if (!s || !s.enabled) return 0;
  const rate = Number(s.sliders.rate) || 0;
  return rate < 0 ? 0 : rate;
}

export function ferryTicketCost(catalog: Statute[], fallback = 15): number {
  const s = statuteById(catalog, "ferry_ticket");
  if (!s || !s.enabled) return fallback;
  const cost = Number(s.sliders.cost);
  return Number.isFinite(cost) && cost >= 0 ? cost : fallback;
}

export function setStatuteSlider(catalog: Statute[], id: string, key: string, value: number): boolean {
  const s = statuteById(catalog, id);
  if (!s) return false;
  s.sliders[key] = value;
  return true;
}

export function setStatuteEnabled(catalog: Statute[], id: string, enabled: boolean): boolean {
  const s = statuteById(catalog, id);
  if (!s) return false;
  s.enabled = enabled;
  return true;
}
