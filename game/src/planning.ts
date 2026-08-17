/** Planning applications. Fail does not place. Pass starts the queue. PAPER. */

import { TICKS_PER_SIM_DAY } from "./calendar.ts";

/** 48h mild vote = 2 sim days. Absentees are not a no. */
export const PLANNING_WINDOW_TICKS = TICKS_PER_SIM_DAY * 2;
/** Bootstrap resident poll (PLAN §4.1). Councils replace this after day 21. */
export const RESIDENT_POLL_QUORUM = 3;

/** Large class under the launch size list. By-right small sites do not file here. */
export const LARGE_CLASS_USES = new Set([
  "warehouse",
  "factory",
  "mill",
  "quarry",
  "depot",
  "mine",
  "plantation",
]);

export type PlanningStatus = "queued" | "passed" | "failed" | "waiting_quorum";
export type PlanningChoice = "yes" | "no";

export type PlanningBallot = {
  voter: string;
  choice: PlanningChoice;
};

export type PlanningApplication = {
  id: string;
  plotId: string;
  use: string;
  owners: string[];
  status: PlanningStatus;
  feePaid: number;
  provenance: "PAPER";
  filedAt: number;
  closesAt: number;
  votes: PlanningBallot[];
};

export type PlanningBoard = {
  apps: PlanningApplication[];
  nextId: number;
  /** Planning-fee money sink. PAPER. Not a treasury transfer. */
  sink: number;
  provenance: "PAPER";
};

export type FileApplicationInput = {
  plotId: string;
  use: string;
  owners: string[];
  feePaid: number;
  filedAt?: number;
  /** Optional PAPER cash. Deducted into `board.sink` when present. */
  payer?: { cash: number };
};

export type PlanningOk = { ok: true; app: PlanningApplication };
export type PlanningFail = { ok: false; reason: string };
export type PlanningResult = PlanningOk | PlanningFail;

function roundMoney(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function isLargeClass(use: string): boolean {
  return LARGE_CLASS_USES.has(use);
}

export function createPlanningBoard(): PlanningBoard {
  return { apps: [], nextId: 1, sink: 0, provenance: "PAPER" };
}

export function getApplication(board: PlanningBoard, id: string): PlanningApplication | undefined {
  return board.apps.find((a) => a.id === id);
}

function openOnPlot(board: PlanningBoard, plotId: string): PlanningApplication | undefined {
  return board.apps.find(
    (a) => a.plotId === plotId && (a.status === "queued" || a.status === "waiting_quorum" || a.status === "passed"),
  );
}

function uniqueOwners(raw: string[]): string[] {
  const seen = new Set<string>();
  const owners: string[] = [];
  for (const item of raw) {
    const name = String(item ?? "").trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    owners.push(name);
  }
  return owners;
}

function tally(app: PlanningApplication): void {
  if (app.votes.length < RESIDENT_POLL_QUORUM) {
    app.status = "waiting_quorum";
    return;
  }
  const yes = app.votes.filter((v) => v.choice === "yes").length;
  const no = app.votes.length - yes;
  app.status = yes > no ? "passed" : "failed";
}

/**
 * File a large-class application. Fee is a sink. Does not call land.develop.
 * Status starts `queued` for the 48h resident poll.
 */
export function fileApplication(board: PlanningBoard, input: FileApplicationInput): PlanningResult {
  const plotId = String(input.plotId ?? "").trim();
  if (!plotId) return { ok: false, reason: "no_plot" };

  const use = String(input.use ?? "").trim();
  if (!isLargeClass(use)) return { ok: false, reason: "not_large" };

  const owners = uniqueOwners(input.owners ?? []);
  if (owners.length < 1) return { ok: false, reason: "no_owners" };

  const feePaid = Number(input.feePaid);
  if (!Number.isFinite(feePaid) || feePaid <= 0) return { ok: false, reason: "no_fee" };

  if (openOnPlot(board, plotId)) return { ok: false, reason: "open_app" };

  if (input.payer) {
    if (input.payer.cash < feePaid) return { ok: false, reason: "no_cash" };
    input.payer.cash = roundMoney(input.payer.cash - feePaid);
  }

  const filedAt = Number.isFinite(input.filedAt) ? Math.max(0, Number(input.filedAt)) : 0;
  const app: PlanningApplication = {
    id: `a-${board.nextId++}`,
    plotId,
    use,
    owners,
    status: "queued",
    feePaid: roundMoney(feePaid),
    provenance: "PAPER",
    filedAt,
    closesAt: filedAt + PLANNING_WINDOW_TICKS,
    votes: [],
  };
  board.apps.push(app);
  board.sink = roundMoney(board.sink + app.feePaid);
  return { ok: true, app };
}

export function castVote(
  board: PlanningBoard,
  input: { appId: string; voter: string; choice: PlanningChoice },
): PlanningResult {
  const app = getApplication(board, input.appId);
  if (!app) return { ok: false, reason: "no_app" };
  if (app.status === "passed" || app.status === "failed") return { ok: false, reason: "closed" };

  const voter = String(input.voter ?? "").trim();
  if (!voter) return { ok: false, reason: "no_voter" };
  if (input.choice !== "yes" && input.choice !== "no") return { ok: false, reason: "bad_choice" };
  if (app.votes.some((v) => v.voter === voter)) return { ok: false, reason: "already_voted" };

  app.votes.push({ voter, choice: input.choice });
  return { ok: true, app };
}

/**
 * Close one application after the 48h window.
 * < quorum → `waiting_quorum` (does not fail). Majority yes → `passed` (queue only).
 */
export function resolveApplication(board: PlanningBoard, appId: string, nowTick: number): PlanningResult {
  const app = getApplication(board, appId);
  if (!app) return { ok: false, reason: "no_app" };
  if (app.status === "passed" || app.status === "failed") return { ok: false, reason: "closed" };
  if (app.status === "queued" && nowTick < app.closesAt) return { ok: false, reason: "window_open" };
  tally(app);
  return { ok: true, app };
}

/** Close every queued application whose 48h window has ended. */
export function resolveDue(board: PlanningBoard, nowTick: number): PlanningApplication[] {
  const closed: PlanningApplication[] = [];
  for (const app of board.apps) {
    if (app.status !== "queued") continue;
    if (nowTick < app.closesAt) continue;
    tally(app);
    closed.push(app);
  }
  return closed;
}
