/**
 * Outdoor presence on this shard. 250 m interest cells.
 * HTTP poll only. Not Colyseus. Not Earth / OSM. PAPER.
 */

import { ISLANDS, type IslandId } from "./land.ts";

export const CELL_SIZE_M = 250;
export const DEFAULT_RADIUS_M = 250;

export type OutdoorActor = {
  id: string;
  name: string;
  x: number;
  z: number;
  island: IslandId;
};

export type PresenceGrid = {
  cellSize: number;
  actors: Map<string, OutdoorActor>;
  cells: Map<string, Set<string>>;
};

export type PresenceSnapshot = {
  mode: "PAPER";
  provenance: "SIMULATED";
  note: string;
  cellSize: number;
  query: { x: number; z: number; radius: number };
  actors: OutdoorActor[];
};

const NOTE =
  "PAPER outdoor presence. Interest cells, HTTP poll. SIMULATED. Not live multiplayer. Not Colyseus. Not Earth/OSM.";

const northPort = ISLANDS.north.port;

/** Four named NPC walkers on the north quay apron. Local metres. */
export const NORTH_QUAY_WALKERS: OutdoorActor[] = [
  { id: "npc:nell", name: "Nell Palmetto", x: northPort.x - 16, z: northPort.z + 10, island: "north" },
  { id: "npc:tomas", name: "Tomas Crane", x: northPort.x + 14, z: northPort.z + 24, island: "north" },
  { id: "npc:isla", name: "Isla Bollard", x: northPort.x - 6, z: northPort.z + 38, island: "north" },
  { id: "npc:reed", name: "Reed Cart", x: northPort.x + 20, z: northPort.z - 8, island: "north" },
];

export function createPresence(cellSize = CELL_SIZE_M): PresenceGrid {
  return {
    cellSize,
    actors: new Map(),
    cells: new Map(),
  };
}

export function cellIndex(n: number, cellSize = CELL_SIZE_M): number {
  return Math.floor(n / cellSize);
}

export function cellKey(x: number, z: number, cellSize = CELL_SIZE_M): string {
  return `${cellIndex(x, cellSize)}:${cellIndex(z, cellSize)}`;
}

function copyActor(actor: OutdoorActor): OutdoorActor {
  return { id: actor.id, name: actor.name, x: actor.x, z: actor.z, island: actor.island };
}

function dropFromCell(grid: PresenceGrid, id: string, key: string): void {
  const bucket = grid.cells.get(key);
  if (!bucket) return;
  bucket.delete(id);
  if (bucket.size === 0) grid.cells.delete(key);
}

/** Upsert an outdoor actor and keep the cell map in sync. */
export function register(grid: PresenceGrid, actor: OutdoorActor): OutdoorActor {
  const next = copyActor(actor);
  const prev = grid.actors.get(next.id);
  const nextKey = cellKey(next.x, next.z, grid.cellSize);
  if (prev) {
    const prevKey = cellKey(prev.x, prev.z, grid.cellSize);
    if (prevKey !== nextKey) dropFromCell(grid, next.id, prevKey);
  }
  grid.actors.set(next.id, next);
  let bucket = grid.cells.get(nextKey);
  if (!bucket) {
    bucket = new Set();
    grid.cells.set(nextKey, bucket);
  }
  bucket.add(next.id);
  return next;
}

export function unregister(grid: PresenceGrid, id: string): boolean {
  const prev = grid.actors.get(id);
  if (!prev) return false;
  dropFromCell(grid, id, cellKey(prev.x, prev.z, grid.cellSize));
  grid.actors.delete(id);
  return true;
}

/**
 * Actors in the query cell plus neighbour cells.
 * `radius` grows the ring (at least one neighbour ring).
 */
export function nearby(
  grid: PresenceGrid,
  x: number,
  z: number,
  radius = DEFAULT_RADIUS_M,
  exceptId?: string,
): OutdoorActor[] {
  const size = grid.cellSize;
  const ring = Math.max(1, Math.ceil(Math.max(0, radius) / size));
  const cx = cellIndex(x, size);
  const cz = cellIndex(z, size);
  const out: OutdoorActor[] = [];
  for (let dx = -ring; dx <= ring; dx++) {
    for (let dz = -ring; dz <= ring; dz++) {
      const bucket = grid.cells.get(`${cx + dx}:${cz + dz}`);
      if (!bucket) continue;
      for (const id of bucket) {
        if (exceptId && id === exceptId) continue;
        const actor = grid.actors.get(id);
        if (actor) out.push(copyActor(actor));
      }
    }
  }
  return out;
}

export function seedNorthQuayWalkers(grid: PresenceGrid): OutdoorActor[] {
  return NORTH_QUAY_WALKERS.map((walker) => register(grid, walker));
}

function seedNorthQuayWalkersOnce(grid: PresenceGrid): void {
  if (grid.actors.has(NORTH_QUAY_WALKERS[0]!.id)) return;
  seedNorthQuayWalkers(grid);
}

function parseCoord(raw: string | null | undefined, fallback: number): number {
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function toSnapshot(
  grid: PresenceGrid,
  query: { x: number; z: number; radius?: number },
): PresenceSnapshot {
  const radius = query.radius ?? DEFAULT_RADIUS_M;
  return {
    mode: "PAPER",
    provenance: "SIMULATED",
    note: NOTE,
    cellSize: grid.cellSize,
    query: { x: query.x, z: query.z, radius },
    actors: nearby(grid, query.x, query.z, radius),
  };
}

function isBlank(raw: string | null | undefined): boolean {
  return raw == null || raw === "";
}

/**
 * Unspawned three.js mesh sits at the origin. That is mid-channel, not a quay.
 * Treat missing coords or explicit 0,0 as the north port so spawn HUD is not
 * "0 nearby" while boot() still has not called spawnAt.
 */
export function resolvePresenceQuery(
  params: { x?: string | null; z?: string | null },
): { x: number; z: number } {
  const x = parseCoord(params.x, northPort.x);
  const z = parseCoord(params.z, northPort.z);
  if ((isBlank(params.x) && isBlank(params.z)) || (x === 0 && z === 0)) {
    return { x: northPort.x, z: northPort.z };
  }
  return { x, z };
}

/** HTTP poll helper. First query seeds the north-quay walkers. */
export function presenceQuery(
  grid: PresenceGrid,
  params: { x?: string | null; z?: string | null; radius?: string | null },
): PresenceSnapshot {
  seedNorthQuayWalkersOnce(grid);
  const { x, z } = resolvePresenceQuery(params);
  const radius = parseCoord(params.radius, DEFAULT_RADIUS_M);
  return toSnapshot(grid, { x, z, radius: radius > 0 ? radius : DEFAULT_RADIUS_M });
}
