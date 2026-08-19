/**
 * Named kinds for Two Harbors meshes and viewers.
 * Island redesign: grep these strings, or look at reports/LABELS.md.
 * PAPER / SIMULATED.
 */

export const VIEWERS = ["world", "lots", "yours", "foot", "logistics", "minerals"] as const;
export type ViewerId = (typeof VIEWERS)[number];

export const KIND = {
  harbour: "harbour",
  ground: "ground",
  road: "road",
  parcelFill: "parcel-fill",
  parcelLines: "parcel-lines",
  parcelLabel: "parcel-label",
  plot: "plot",
  plotLine: "plot-line",
  crate: "crate",
  van: "van",
  hotdogCart: "hotdog-cart",
  footRoad: "foot-road",
  footLabel: "foot-label",
  lotOutline: "lot-outline",
  logisticsPad: "logistics-pad",
  vendor: "vendor",
  building: "building",
  port: "port",
} as const;

export const LAYER = {
  world: "world",
  lots: "lots",
  foot: "foot",
  logistics: "logistics",
  minerals: "minerals",
} as const;
