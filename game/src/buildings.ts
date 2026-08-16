/** Paper building catalogue. Costs are SIMULATED. Not live. No wallet. */

export type BuildingId =
  | "house"
  | "shop"
  | "house_shop"
  | "farm"
  | "warehouse"
  | "factory";

/** NPC lots still use `stall`. Player picker does not list it. */
export type LandUseId = BuildingId | "stall";

export type BuildingSpec = {
  id: BuildingId;
  label: string;
  paperCost: number;
  provenance: "PAPER";
};

/**
 * Keep ids/costs in sync with `public/harbour/buildings.js` FALLBACK_CATALOG.
 * Meshes live in that file. This module is the lease/develop source of truth.
 */
export const BUILDING_CATALOG: BuildingSpec[] = [
  { id: "house", label: "House", paperCost: 40, provenance: "PAPER" },
  { id: "shop", label: "Shop", paperCost: 55, provenance: "PAPER" },
  { id: "house_shop", label: "House with shop", paperCost: 80, provenance: "PAPER" },
  { id: "farm", label: "Small farm", paperCost: 40, provenance: "PAPER" },
  { id: "warehouse", label: "Warehouse", paperCost: 120, provenance: "PAPER" },
  { id: "factory", label: "Factory", paperCost: 180, provenance: "PAPER" },
];

export const DEVELOP_COST = Math.min(...BUILDING_CATALOG.map((b) => b.paperCost));

const CATALOG_IDS = new Set<string>(BUILDING_CATALOG.map((b) => b.id));

export function isLandUse(raw: unknown): raw is LandUseId {
  return raw === "stall" || (typeof raw === "string" && CATALOG_IDS.has(raw));
}

export function parseLandUse(raw: unknown): LandUseId | null {
  return isLandUse(raw) ? raw : null;
}

export function catalogEntry(id: string): BuildingSpec | undefined {
  return BUILDING_CATALOG.find((b) => b.id === id);
}

export function paperCostFor(use: LandUseId): number {
  if (use === "stall") {
    return catalogEntry("shop")!.paperCost;
  }
  return catalogEntry(use)!.paperCost;
}
