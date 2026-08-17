/**
 * Plot zoning. Cities-skylines style, baked in.
 * Commercial + residential are on. High density is government-locked.
 * PAPER / SIMULATED.
 */

export const ZONE_IDS = ["commercial", "residential", "high_commercial", "high_residential"] as const;
export type ZoneId = (typeof ZONE_IDS)[number];

/** Which zones a visitor can use right now. High density stays off. */
export const ZONE_ON: Record<ZoneId, boolean> = {
  commercial: true,
  residential: true,
  high_commercial: false,
  high_residential: false,
};

export const ZONE_LABEL: Record<ZoneId, string> = {
  commercial: "Commercial",
  residential: "Residential",
  high_commercial: "High commercial (government)",
  high_residential: "High residential (government)",
};

export function zoneForBand(band: string): ZoneId {
  return band === "street" ? "commercial" : "residential";
}

export function zoneUnlocked(zone: ZoneId | string): boolean {
  return ZONE_ON[zone as ZoneId] === true;
}

export function skuFitsPlot(
  skuZone: ZoneId | string,
  plotZone: ZoneId | string,
): { ok: true } | { ok: false; reason: "zone_locked" | "zone_mismatch" } {
  if (!zoneUnlocked(plotZone) || !zoneUnlocked(skuZone)) return { ok: false, reason: "zone_locked" };
  if (skuZone !== plotZone) return { ok: false, reason: "zone_mismatch" };
  return { ok: true };
}
