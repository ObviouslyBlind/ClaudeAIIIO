/**
 * Player table for the shard. `visitor` is the paper play session.
 * Cap is 500 records. Not 500 live WebSocket clients.
 */

import { PLAYER_CAP, VISITOR_ID, type PlayerId } from "./ids.ts";

export type IslandId = "north" | "south";

export type PlayerRecord = {
  id: PlayerId;
  cash: number;
  island: IslandId;
  x: number;
  z: number;
  indoors: boolean;
  mode: "PAPER";
  provenance: "SIMULATED";
};

export type PlayerBoard = {
  cap: number;
  players: Map<PlayerId, PlayerRecord>;
};

export function createPlayerBoard(cap = PLAYER_CAP): PlayerBoard {
  return { cap, players: new Map() };
}

export function spawnPlayer(
  board: PlayerBoard,
  input: {
    id: PlayerId;
    cash?: number;
    island?: IslandId;
    x?: number;
    z?: number;
  },
): PlayerRecord | { ok: false; reason: string } {
  const id = String(input.id ?? "").trim();
  if (!id) return { ok: false, reason: "bad_id" };
  if (board.players.has(id)) return { ok: false, reason: "exists" };
  if (board.players.size >= board.cap) return { ok: false, reason: "player_cap" };
  const row: PlayerRecord = {
    id,
    cash: Number.isFinite(input.cash) ? Number(input.cash) : 1_000,
    island: input.island === "south" ? "south" : "north",
    x: Number.isFinite(input.x) ? Number(input.x) : 0,
    z: Number.isFinite(input.z) ? Number(input.z) : 0,
    indoors: false,
    mode: "PAPER",
    provenance: "SIMULATED",
  };
  board.players.set(id, row);
  return row;
}

export function getPlayer(board: PlayerBoard, id: PlayerId): PlayerRecord | undefined {
  return board.players.get(id);
}

export function setPlayerPose(
  board: PlayerBoard,
  id: PlayerId,
  pose: { island?: IslandId; x?: number; z?: number; indoors?: boolean },
): PlayerRecord | undefined {
  const row = board.players.get(id);
  if (!row) return undefined;
  if (pose.island === "north" || pose.island === "south") row.island = pose.island;
  if (Number.isFinite(pose.x)) row.x = Number(pose.x);
  if (Number.isFinite(pose.z)) row.z = Number(pose.z);
  if (typeof pose.indoors === "boolean") row.indoors = pose.indoors;
  return row;
}

export function outdoorPlayersOnIsland(board: PlayerBoard, island: IslandId): PlayerRecord[] {
  const out: PlayerRecord[] = [];
  for (const row of board.players.values()) {
    if (row.island !== island) continue;
    if (row.indoors) continue;
    out.push(row);
  }
  return out;
}

export function spawnVisitor(board: PlayerBoard, cash = 1_000): PlayerRecord {
  const existing = board.players.get(VISITOR_ID);
  if (existing) return existing;
  const row = spawnPlayer(board, { id: VISITOR_ID, cash, island: "north" });
  if ("ok" in row) {
    throw new Error("visitor spawn failed: " + row.reason);
  }
  return row;
}

export function playerCount(board: PlayerBoard): number {
  return board.players.size;
}
