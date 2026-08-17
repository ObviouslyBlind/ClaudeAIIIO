/**
 * In-game minerals. Tied to the 12-good catalog (`ore`).
 * Does not invent a 13th good. PAPER / SIMULATED.
 */

import { GOODS } from "../goods.ts";
import type { PlotLike } from "./plots.ts";

export const MINERAL_IDS = ["ore"] as const;
export type MineralId = (typeof MINERAL_IDS)[number];

export type MineralSpec = {
  id: MineralId;
  label: string;
  goodId: "ore";
  chain: "extract";
  islandBias: "south" | "north";
  fair0: number;
  note: string;
  mode: "PAPER";
  provenance: "SIMULATED";
};

export const MINERALS: Record<MineralId, MineralSpec> = {
  ore: {
    id: "ore",
    label: "Ore",
    goodId: "ore",
    chain: "extract",
    islandBias: "south",
    fair0: GOODS.ore.fair0,
    note: "South inland fields carry most deposits. North wants this via the ferry. Smelts to iron bars.",
    mode: "PAPER",
    provenance: "SIMULATED",
  },
};

export const MINERAL_CATALOG: MineralSpec[] = MINERAL_IDS.map((id) => MINERALS[id]);

export type DepositPlot = PlotLike & {
  band?: string;
  deposit?: MineralId | null;
};

function hash01(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((h >>> 0) % 1000) / 1000;
}

/** Field lots may carry ore. Street / shore stay empty. South is richer. */
export function depositFor(plot: { id: string; island: string; band?: string }): MineralId | null {
  if (plot.band && plot.band !== "field") return null;
  const h = hash01(plot.id);
  const threshold = plot.island === "south" ? 0.42 : 0.78;
  return h >= threshold ? "ore" : null;
}

export function seedDeposits<T extends DepositPlot>(plots: T[]): T[] {
  for (const p of plots) {
    p.deposit = depositFor(p);
  }
  return plots;
}

export function isMineralGood(id: string): id is MineralId {
  return (MINERAL_IDS as readonly string[]).includes(id);
}

export type MineralDepositRow = {
  plotId: string;
  island: string;
  mineral: MineralId;
  x: number;
  z: number;
};

export type MineralsSnapshot = {
  mode: "PAPER";
  provenance: "SIMULATED";
  note: string;
  catalog: MineralSpec[];
  deposits: MineralDepositRow[];
  held: Record<MineralId, number>;
};

const NOTE =
  "PAPER minerals in this shard. Catalog is sim data. Deposits sit on field plots. Not a 13th good.";

export function mineralsSnapshot(
  plots: Array<{ id: string; island: string; x: number; z: number; deposit?: MineralId | null }>,
  held: Partial<Record<string, number>> = {},
): MineralsSnapshot {
  const deposits: MineralDepositRow[] = [];
  for (const p of plots) {
    if (p.deposit !== "ore") continue;
    deposits.push({
      plotId: p.id,
      island: p.island,
      mineral: "ore",
      x: p.x,
      z: p.z,
    });
  }
  return {
    mode: "PAPER",
    provenance: "SIMULATED",
    note: NOTE,
    catalog: MINERAL_CATALOG,
    deposits,
    held: { ore: Number(held.ore) > 0 ? Number(held.ore) : 0 },
  };
}
