import type { Visitor } from "./sim.ts";

export type IslandId = "north" | "south";
export type PlotBand = "quay" | "town" | "inland";
export type PlotClass = "by_right" | "reserved";

/** Metres. Origin is the channel midpoint. +Z is south. */
export type IslandSpec = {
  id: IslandId;
  name: string;
  cx: number;
  cz: number;
  rx: number;
  rz: number;
  peak: number;
  port: { x: number; z: number };
  hill: { x: number; z: number };
  /** Harbour plot grid: origin is the inland-left corner. */
  grid: {
    originX: number;
    originZ: number;
    cols: number;
    rows: number;
    /** +1 = rows go south, -1 = rows go north (inland). */
    rowSign: number;
  };
};

export type Plot = {
  id: string;
  island: IslandId;
  x: number;
  z: number;
  w: number;
  d: number;
  band: PlotBand;
  class: PlotClass;
  price: number;
  owner: string | null;
};

export type LandBoard = {
  plots: Plot[];
};

export const PLOT_SIZE = 20;
export const PLOT_GAP = 6;
export const CELL = PLOT_SIZE + PLOT_GAP;

/**
 * Small inhabited Caribbean cay scale, not Jamaica.
 * Each ellipse is about 2.0 km east-west by 1.2 km north-south (~1.9 km²).
 */
export const ISLANDS: Record<IslandId, IslandSpec> = {
  north: {
    id: "north",
    name: "North",
    cx: 0,
    cz: -820,
    rx: 1000,
    rz: 580,
    peak: 92,
    port: { x: 0, z: -310 },
    hill: { x: -240, z: -980 },
    grid: { originX: -104, originZ: -368, cols: 8, rows: 5, rowSign: -1 },
  },
  south: {
    id: "south",
    name: "South",
    cx: 0,
    cz: 820,
    rx: 1000,
    rz: 580,
    peak: 74,
    port: { x: 0, z: 310 },
    hill: { x: 220, z: 980 },
    grid: { originX: -104, originZ: 368, cols: 8, rows: 5, rowSign: 1 },
  },
};

function bandForRow(row: number): PlotBand {
  if (row === 0) return "quay";
  if (row <= 2) return "town";
  return "inland";
}

function priceFor(island: IslandId, band: PlotBand): number {
  const base = island === "north" ? 180 : 70;
  const mult = band === "quay" ? 1.6 : band === "town" ? 1 : 0.55;
  return Math.round(base * mult);
}

export function buildPlots(): Plot[] {
  const plots: Plot[] = [];
  for (const spec of Object.values(ISLANDS)) {
    const { cols, rows, originX, originZ, rowSign } = spec.grid;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const band = bandForRow(r);
        const reserved = r === 0 && (c === 3 || c === 4);
        const x = originX + c * CELL + PLOT_SIZE / 2;
        const z = originZ + rowSign * (r * CELL + PLOT_SIZE / 2);
        plots.push({
          id: `${spec.id[0].toUpperCase()}-${c}-${r}`,
          island: spec.id,
          x,
          z,
          w: PLOT_SIZE,
          d: PLOT_SIZE,
          band,
          class: reserved ? "reserved" : "by_right",
          price: reserved ? 0 : priceFor(spec.id, band),
          owner: null,
        });
      }
    }
  }
  seedNpc(plots);
  return plots;
}

function seedNpc(plots: Plot[]): void {
  const npcIds = ["N-0-1", "N-6-2", "S-7-1", "S-1-3"];
  for (const plot of plots) {
    if (npcIds.includes(plot.id)) plot.owner = "npc";
  }
}

export function createLandBoard(): LandBoard {
  return { plots: buildPlots() };
}

export function getPlot(board: LandBoard, id: string): Plot | undefined {
  return board.plots.find((p) => p.id === id);
}

export function leasePlot(
  board: LandBoard,
  visitor: Visitor,
  plotId: string,
  owner = "visitor",
): { ok: true; paid: number; plot: Plot } | { ok: false; reason: string } {
  const plot = getPlot(board, plotId);
  if (!plot) return { ok: false, reason: "no_plot" };
  if (plot.class === "reserved") return { ok: false, reason: "reserved" };
  if (plot.owner) return { ok: false, reason: "owned" };
  if (visitor.cash < plot.price) return { ok: false, reason: "no_cash" };
  visitor.cash = Math.round((visitor.cash - plot.price) * 10000) / 10000;
  plot.owner = owner;
  return { ok: true, paid: plot.price, plot };
}

/** Same formula the harbour client uses. Keep in sync with public/harbour/main.js */
export function heightAt(spec: IslandSpec, x: number, z: number): number {
  const dx = (x - spec.cx) / spec.rx;
  const dz = (z - spec.cz) / spec.rz;
  const ang = Math.atan2(dz, dx);
  const edge = 1 + 0.06 * Math.sin(ang * 5) + 0.03 * Math.sin(ang * 9 + 1.1);
  const r = Math.hypot(dx, dz);
  const toward = spec.id === "north" ? 1 : -1;
  const along = (z - spec.port.z) * toward;
  const across = Math.abs(x - spec.port.x);
  if (across < 16 && along > -24 && along < 90) return 1.12;
  if (r > edge) return -8;
  const t = r / edge;
  const portD = Math.hypot(x - spec.port.x, z - spec.port.z);
  const hillD = Math.hypot(x - spec.hill.x, z - spec.hill.z);
  let h = (1 - t) * (1 - t) * spec.peak * 0.35;
  h += spec.peak * 0.7 * Math.max(0, 1 - hillD / 320) ** 2;
  if (portD < 160) {
    const flatten = 1.15 + portD * 0.002;
    h = Math.min(Math.max(h, 1.05), flatten);
  }
  if (t > 0.8) {
    const beach = (t - 0.8) / 0.2;
    h = h * (1 - beach) + 0.35 * beach;
  }
  return h;
}

export function landSnapshot(board: LandBoard, visitor: Visitor) {
  return {
    mode: "PAPER" as const,
    provenance: "SIMULATED",
    note: "Authored islands in metres. Not Earth. Not OSM. Leases are paper.",
    islands: ISLANDS,
    plotSize: PLOT_SIZE,
    plotGap: PLOT_GAP,
    visitor: {
      cash: visitor.cash,
      leases: board.plots.filter((p) => p.owner === "visitor").map((p) => p.id),
    },
    plots: board.plots,
  };
}
