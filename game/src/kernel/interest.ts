/**
 * Interest query: nearby plots + outdoor actors on one island.
 * The other island is silent. Indoors actors are silent.
 */

import { nearby, type OutdoorActor, type PresenceGrid } from "../presence.ts";
import { outdoorPlayersOnIsland, type IslandId, type PlayerBoard } from "./players.ts";
import { PLOT_CELL_M, plotsNear, type PlotIndex, type PlotLike } from "./plots.ts";

export type InterestQuery = {
  island: IslandId;
  x: number;
  z: number;
  radius?: number;
  exceptId?: string;
};

export type InterestSnapshot<P extends PlotLike = PlotLike> = {
  mode: "PAPER";
  provenance: "SIMULATED";
  note: string;
  kernel: "K.1";
  cellSize: number;
  query: { island: IslandId; x: number; z: number; radius: number };
  plots: P[];
  actors: OutdoorActor[];
};

const NOTE =
  "PAPER interest. Nearby plots and outdoor bodies on this island. SIMULATED. Not the other island. Not indoors.";

export function interestSnapshot<P extends PlotLike>(
  input: {
    plotIndex: PlotIndex;
    plotsById?: Map<string, P>;
    presence?: PresenceGrid;
    players?: PlayerBoard;
    query: InterestQuery;
  },
): InterestSnapshot<P> {
  const radius = Number.isFinite(input.query.radius)
    ? Math.max(0, Number(input.query.radius))
    : PLOT_CELL_M * 2;
  const nearbyPlots = plotsNear(
    input.plotIndex,
    input.query.island,
    input.query.x,
    input.query.z,
    radius,
  );
  const plots: P[] = [];
  for (const p of nearbyPlots) {
    const full = input.plotsById?.get(p.id) ?? (p as P);
    if (full.island !== input.query.island) continue;
    plots.push(full);
  }

  const actors: OutdoorActor[] = [];
  if (input.presence) {
    for (const a of nearby(
      input.presence,
      input.query.x,
      input.query.z,
      Math.max(250, radius),
      input.query.exceptId,
    )) {
      if (a.island === input.query.island) actors.push(a);
    }
  } else if (input.players) {
    for (const row of outdoorPlayersOnIsland(input.players, input.query.island)) {
      if (input.query.exceptId && row.id === input.query.exceptId) continue;
      const dx = row.x - input.query.x;
      const dz = row.z - input.query.z;
      if (dx * dx + dz * dz > radius * radius) continue;
      actors.push({
        id: row.id,
        name: row.id,
        x: row.x,
        z: row.z,
        island: row.island,
      });
    }
  }

  return {
    mode: "PAPER",
    provenance: "SIMULATED",
    note: NOTE,
    kernel: "K.1",
    cellSize: input.plotIndex.cellSize,
    query: {
      island: input.query.island,
      x: input.query.x,
      z: input.query.z,
      radius,
    },
    plots,
    actors,
  };
}
