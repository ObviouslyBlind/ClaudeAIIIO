/**
 * Each tick, stroll the seeded quay PAPER actors a few metres
 * so nearby() names are not frozen statues. North and South aprons.
 * PAPER. SIMULATED. Not live multiplayer. Not Colyseus.
 */

import { ISLANDS } from "./land.ts";
import {
  NORTH_QUAY_WALKERS,
  SOUTH_QUAY_WALKERS,
  register,
  seedNorthQuayWalkers,
  seedSouthQuayWalkers,
  type OutdoorActor,
  type PresenceGrid,
} from "./presence.ts";

export const MODE = "PAPER" as const;
export const PROVENANCE = "SIMULATED" as const;

export const WALK_NOTE =
  "PAPER. Seeded north- and south-quay walkers stroll a few metres per tick. SIMULATED. Not live multiplayer.";

/** Metres per tick along the quay apron (z). A few metres, not a sprint. */
export const STEP_M = 2;

/** Same along-quay band as public/harbour/pedestrians.js. */
export const QUAY_ALONG_MIN_M = -22;
export const QUAY_ALONG_MAX_M = 64;
/** Land-ish x pad around the seeded walkers / port. */
export const QUAY_X_PAD_M = 28;

const northPort = ISLANDS.north.port;
const southPort = ISLANDS.south.port;

type Dir = 1 | -1;

const dirs = new WeakMap<PresenceGrid, Map<string, Dir>>();

export function quayBounds(port = northPort): {
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
} {
  return {
    xMin: port.x - QUAY_X_PAD_M,
    xMax: port.x + QUAY_X_PAD_M,
    zMin: port.z + QUAY_ALONG_MIN_M,
    zMax: port.z + QUAY_ALONG_MAX_M,
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function clampToQuay(
  x: number,
  z: number,
  port = northPort,
): { x: number; z: number } {
  const b = quayBounds(port);
  return { x: clamp(x, b.xMin, b.xMax), z: clamp(z, b.zMin, b.zMax) };
}

export function clampToNorthQuay(
  x: number,
  z: number,
  port = northPort,
): { x: number; z: number } {
  return clampToQuay(x, z, port);
}

export function clampToSouthQuay(
  x: number,
  z: number,
  port = southPort,
): { x: number; z: number } {
  return clampToQuay(x, z, port);
}

function dirBag(grid: PresenceGrid): Map<string, Dir> {
  let bag = dirs.get(grid);
  if (!bag) {
    bag = new Map();
    dirs.set(grid, bag);
  }
  return bag;
}

function dirOf(grid: PresenceGrid, id: string, index: number): Dir {
  const bag = dirBag(grid);
  let d = bag.get(id);
  if (!d) {
    d = index % 2 === 0 ? 1 : -1;
    bag.set(id, d);
  }
  return d;
}

function ensureSeeded(grid: PresenceGrid): void {
  if (!grid.actors.has(NORTH_QUAY_WALKERS[0]!.id)) seedNorthQuayWalkers(grid);
  if (!grid.actors.has(SOUTH_QUAY_WALKERS[0]!.id)) seedSouthQuayWalkers(grid);
}

function stroll(
  grid: PresenceGrid,
  seeds: OutdoorActor[],
  port: { x: number; z: number },
  step: number,
  indexBase: number,
): OutdoorActor[] {
  const b = quayBounds(port);
  const bag = dirBag(grid);
  const moved: OutdoorActor[] = [];
  seeds.forEach((seed, i) => {
    const actor = grid.actors.get(seed.id);
    if (!actor) return;
    let dir = dirOf(grid, seed.id, indexBase + i);
    let z = actor.z + dir * step;
    if (z < b.zMin || z > b.zMax) {
      dir = (dir === 1 ? -1 : 1) as Dir;
      bag.set(seed.id, dir);
      z = actor.z + dir * step;
    }
    const next = clampToQuay(actor.x, z, port);
    moved.push(register(grid, { ...actor, x: next.x, z: next.z }));
  });
  return moved;
}

/**
 * Move the seeded quay PAPER NPCs a few metres along z.
 * Leaves any other registered actor (visitor, etc.) alone.
 */
export function walkSeededPresence(grid: PresenceGrid, stepM = STEP_M): OutdoorActor[] {
  ensureSeeded(grid);
  const step = Number.isFinite(stepM) && stepM > 0 ? stepM : STEP_M;
  return [
    ...stroll(grid, NORTH_QUAY_WALKERS, northPort, step, 0),
    ...stroll(grid, SOUTH_QUAY_WALKERS, southPort, step, NORTH_QUAY_WALKERS.length),
  ];
}
