/** PAPER labour. AI slots always fill. Human shifts are extra cash. SIMULATED. */

export const JOB_RANKS = ["worker", "miller", "clerk", "manager", "officer"] as const;
export type JobRank = (typeof JOB_RANKS)[number];

/** Statute `three_job_cap`. Across all sites. */
export const JOB_CAP = 3;

export const SITE_CLASSES = ["artisan", "factory", "farm", "mill"] as const;
export type SiteClass = (typeof SITE_CLASSES)[number];

/** Matches statute `ai_worker_slots_by_class`, plus mill for E2 output tests. */
export const AI_SLOTS_BY_CLASS: Record<SiteClass, number> = {
  artisan: 2,
  factory: 8,
  farm: 3,
  mill: 4,
};

/** PAPER extra cash on a completed human shift. Not an AI wage. */
export const SHIFT_BONUS = 2;

/** One output unit per filled AI slot. Humans never change this. */
export const OUTPUT_PER_AI_SLOT = 1;

export type ShiftStatus = "active" | "completed" | "aborted" | "disconnected";

export type LabourSite = {
  id: string;
  siteClass: SiteClass;
  aiSlots: number;
  /** Always equals `aiSlots`. Humans do not occupy these. */
  aiFilled: number;
  /** Mill/site output flag. Stays true if a human disconnects. */
  aiOutput: true;
  /** AI-driven units. Unchanged by take / complete / abort / disconnect. */
  output: number;
  hiringPoolOpen: boolean;
  shiftBonus: number;
};

export type JobHolding = {
  playerId: string;
  siteId: string;
  rank: JobRank;
};

export type Shift = {
  id: string;
  playerId: string;
  siteId: string;
  rank: JobRank;
  status: ShiftStatus;
  bonusPaid: number;
  mode: "PAPER";
  provenance: "SIMULATED";
};

export type LabourBoard = {
  sites: LabourSite[];
  jobs: JobHolding[];
  shifts: Shift[];
  nextShiftId: number;
  mode: "PAPER";
  provenance: "SIMULATED";
  note: "PAPER labour. AI slots always fill. Human bonus is extra cash. Not live wages.";
};

export type TakeShiftInput = {
  playerId: string;
  siteId: string;
  rank: JobRank;
};

export type ShiftRef = {
  playerId: string;
  siteId?: string;
  shiftId?: string;
  /** Optional PAPER wallet. Credited only on completeShift. */
  player?: { cash: number };
};

export type RegisterSiteInput = {
  id: string;
  siteClass?: SiteClass;
  aiSlots?: number;
  shiftBonus?: number;
  hiringPoolOpen?: boolean;
};

export type LabourOk = {
  ok: true;
  shift: Shift;
  bonusPaid: number;
  aiOutput: true;
  output: number;
};
export type LabourFail = { ok: false; reason: string };
export type LabourResult = LabourOk | LabourFail;

export type SiteOk = { ok: true; site: LabourSite };
export type SiteResult = SiteOk | LabourFail;

function roundMoney(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function isJobRank(raw: unknown): raw is JobRank {
  return typeof raw === "string" && (JOB_RANKS as readonly string[]).includes(raw);
}

export function isSiteClass(raw: unknown): raw is SiteClass {
  return typeof raw === "string" && (SITE_CLASSES as readonly string[]).includes(raw);
}

export function createLabourBoard(): LabourBoard {
  return {
    sites: [],
    jobs: [],
    shifts: [],
    nextShiftId: 1,
    mode: "PAPER",
    provenance: "SIMULATED",
    note: "PAPER labour. AI slots always fill. Human bonus is extra cash. Not live wages.",
  };
}

export function getSite(board: LabourBoard, siteId: string): LabourSite | undefined {
  return board.sites.find((s) => s.id === siteId);
}

export function millOutput(board: LabourBoard, siteId: string): number {
  return getSite(board, siteId)?.output ?? 0;
}

export function jobsHeld(board: LabourBoard, playerId: string): number {
  const id = String(playerId ?? "").trim();
  if (!id) return 0;
  return board.jobs.filter((j) => j.playerId === id).length;
}

function outputFor(aiSlots: number): number {
  return aiSlots * OUTPUT_PER_AI_SLOT;
}

/**
 * Register a site. AI worker slots fill immediately, even with the hiring pool closed.
 */
export function registerSite(board: LabourBoard, input: RegisterSiteInput): SiteResult {
  const id = String(input.id ?? "").trim();
  if (!id) return { ok: false, reason: "no_site" };
  if (getSite(board, id)) return { ok: false, reason: "site_exists" };

  const siteClass = input.siteClass ?? "mill";
  if (!isSiteClass(siteClass)) return { ok: false, reason: "bad_class" };

  const rawSlots = input.aiSlots ?? AI_SLOTS_BY_CLASS[siteClass];
  const aiSlots = Number.isFinite(rawSlots) ? Math.max(1, Math.floor(Number(rawSlots))) : AI_SLOTS_BY_CLASS[siteClass];
  const bonus = Number.isFinite(input.shiftBonus) ? Math.max(0, Number(input.shiftBonus)) : SHIFT_BONUS;

  const site: LabourSite = {
    id,
    siteClass,
    aiSlots,
    aiFilled: aiSlots,
    aiOutput: true,
    output: outputFor(aiSlots),
    hiringPoolOpen: input.hiringPoolOpen === true,
    shiftBonus: roundMoney(bonus),
  };
  board.sites.push(site);
  return { ok: true, site };
}

export function openHiringPool(board: LabourBoard, siteId: string): SiteResult {
  const site = getSite(board, String(siteId ?? "").trim());
  if (!site) return { ok: false, reason: "no_site" };
  site.hiringPoolOpen = true;
  return { ok: true, site };
}

export function closeHiringPool(board: LabourBoard, siteId: string): SiteResult {
  const site = getSite(board, String(siteId ?? "").trim());
  if (!site) return { ok: false, reason: "no_site" };
  site.hiringPoolOpen = false;
  return { ok: true, site };
}

function holdsJob(board: LabourBoard, playerId: string, siteId: string, rank: JobRank): boolean {
  return board.jobs.some((j) => j.playerId === playerId && j.siteId === siteId && j.rank === rank);
}

function activeShiftAt(board: LabourBoard, playerId: string, siteId: string): Shift | undefined {
  return board.shifts.find((s) => s.playerId === playerId && s.siteId === siteId && s.status === "active");
}

function findActiveShift(board: LabourBoard, input: ShiftRef): Shift | undefined {
  const shiftId = String(input.shiftId ?? "").trim();
  if (shiftId) {
    const shift = board.shifts.find((s) => s.id === shiftId);
    return shift?.status === "active" ? shift : undefined;
  }
  const playerId = String(input.playerId ?? "").trim();
  const siteId = String(input.siteId ?? "").trim();
  if (playerId && siteId) return activeShiftAt(board, playerId, siteId);
  if (playerId && !siteId) {
    const active = board.shifts.filter((s) => s.playerId === playerId && s.status === "active");
    return active.length === 1 ? active[0] : undefined;
  }
  return undefined;
}

function okFrom(site: LabourSite, shift: Shift): LabourOk {
  return {
    ok: true,
    shift,
    bonusPaid: shift.bonusPaid,
    aiOutput: true,
    output: site.output,
  };
}

/**
 * Start a human shift. Hiring pool must be open. AI output is already counted.
 */
export function takeShift(board: LabourBoard, input: TakeShiftInput): LabourResult {
  const playerId = String(input.playerId ?? "").trim();
  if (!playerId) return { ok: false, reason: "no_player" };

  const siteId = String(input.siteId ?? "").trim();
  if (!siteId) return { ok: false, reason: "no_site" };

  const site = getSite(board, siteId);
  if (!site) return { ok: false, reason: "no_site" };

  if (!isJobRank(input.rank)) return { ok: false, reason: "bad_rank" };
  const rank = input.rank;

  if (!site.hiringPoolOpen) return { ok: false, reason: "pool_closed" };
  if (activeShiftAt(board, playerId, siteId)) return { ok: false, reason: "already_on_shift" };

  if (!holdsJob(board, playerId, siteId, rank) && jobsHeld(board, playerId) >= JOB_CAP) {
    return { ok: false, reason: "job_cap" };
  }

  if (!holdsJob(board, playerId, siteId, rank)) {
    board.jobs.push({ playerId, siteId, rank });
  }

  const shift: Shift = {
    id: `s-${board.nextShiftId++}`,
    playerId,
    siteId,
    rank,
    status: "active",
    bonusPaid: 0,
    mode: "PAPER",
    provenance: "SIMULATED",
  };
  board.shifts.push(shift);
  return okFrom(site, shift);
}

/**
 * Pay the PAPER shift bonus. Minigame result is not trusted; this is the grant.
 */
export function completeShift(board: LabourBoard, input: ShiftRef): LabourResult {
  const shift = findActiveShift(board, input);
  if (!shift) return { ok: false, reason: "no_shift" };
  const site = getSite(board, shift.siteId);
  if (!site) return { ok: false, reason: "no_site" };

  const bonus = roundMoney(site.shiftBonus);
  shift.status = "completed";
  shift.bonusPaid = bonus;
  if (input.player) {
    input.player.cash = roundMoney(input.player.cash + bonus);
  }
  return okFrom(site, shift);
}

function endShift(
  board: LabourBoard,
  input: ShiftRef,
  status: "aborted" | "disconnected",
): LabourResult {
  const shift = findActiveShift(board, input);
  if (!shift) return { ok: false, reason: "no_shift" };
  const site = getSite(board, shift.siteId);
  if (!site) return { ok: false, reason: "no_site" };

  shift.status = status;
  shift.bonusPaid = 0;
  return okFrom(site, shift);
}

/** Player quits the minigame. Mill output unchanged. Bonus not paid. */
export function abortShift(board: LabourBoard, input: ShiftRef): LabourResult {
  return endShift(board, input, "aborted");
}

/**
 * Client gone mid-shift. Mill AI output unchanged. Bonus not paid.
 * With only `playerId`, ends every active shift for that player.
 */
export function disconnect(board: LabourBoard, input: ShiftRef): LabourResult {
  const playerId = String(input.playerId ?? "").trim();
  const siteId = String(input.siteId ?? "").trim();
  const shiftId = String(input.shiftId ?? "").trim();
  if (playerId && !siteId && !shiftId) {
    const active = board.shifts.filter((s) => s.playerId === playerId && s.status === "active");
    if (active.length === 0) return { ok: false, reason: "no_shift" };
    let last: LabourResult = { ok: false, reason: "no_shift" };
    for (const shift of active) {
      last = endShift(board, { playerId, siteId: shift.siteId }, "disconnected");
    }
    return last;
  }
  return endShift(board, input, "disconnected");
}
