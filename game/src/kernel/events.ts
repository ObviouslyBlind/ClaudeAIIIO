/** Append-only shard events. PAPER facts. Not a chat log. */

export const EVENT_KINDS = ["lease", "develop", "hire", "fire"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export type ShardEvent = {
  id: number;
  tick: number;
  kind: EventKind;
  playerId: string;
  plotId: string;
  detail?: string;
  mode: "PAPER";
  provenance: "SIMULATED";
};

export type EventLog = {
  nextId: number;
  events: ShardEvent[];
};

export function createEventLog(): EventLog {
  return { nextId: 1, events: [] };
}

export function appendEvent(
  log: EventLog,
  input: {
    tick: number;
    kind: EventKind;
    playerId: string;
    plotId: string;
    detail?: string;
  },
): ShardEvent {
  const row: ShardEvent = {
    id: log.nextId++,
    tick: input.tick,
    kind: input.kind,
    playerId: input.playerId,
    plotId: input.plotId,
    detail: input.detail,
    mode: "PAPER",
    provenance: "SIMULATED",
  };
  log.events.push(row);
  return row;
}

export function eventsForPlot(log: EventLog, plotId: string): ShardEvent[] {
  return log.events.filter((e) => e.plotId === plotId);
}

export function dumpEvents(log: EventLog): ShardEvent[] {
  return log.events.map((e) => ({ ...e }));
}

export function restoreEvents(raw: unknown): EventLog {
  const log = createEventLog();
  if (!Array.isArray(raw)) return log;
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const kind = String(r.kind ?? "");
    if (!EVENT_KINDS.includes(kind as EventKind)) continue;
    const plotId = String(r.plotId ?? "").trim();
    const playerId = String(r.playerId ?? "").trim();
    const tick = Number(r.tick);
    if (!plotId || !playerId || !Number.isFinite(tick)) continue;
    appendEvent(log, {
      tick,
      kind: kind as EventKind,
      playerId,
      plotId,
      detail: typeof r.detail === "string" ? r.detail : undefined,
    });
  }
  return log;
}
