/** PAPER Senate, PM, and Governor freeze. Appointed after the House sits. Not live votes. */

import { TICKS_PER_SIM_DAY } from "./calendar.ts";
import type { IslandId } from "./land.ts";
import {
  canOriginateMoneyBill,
  maybeElectHouse,
  type HouseChamber,
} from "./offices.ts";
import {
  fileApplication,
  type FileApplicationInput,
  type PlanningBoard,
  type PlanningResult,
} from "./planning.ts";

export const SENATE_SEATS = 11;
export const GOVERNMENT_SENATORS = 6;
export const OPPOSITION_SENATORS = 3;
export const INDEPENDENT_SENATORS = 2;
/** House confidence majority (catalog `confidence_rule`). */
export const CONFIDENCE_MAJORITY = 11;
/** 24h freeze. Sim day is 3600 ticks; 1Hz wall 24h would be 86400. */
export const GOVERNOR_FREEZE_TICKS = TICKS_PER_SIM_DAY;
/** One Senate delay, max 24h. */
export const SENATE_DELAY_TICKS = TICKS_PER_SIM_DAY;

export type SenateBloc = "government" | "opposition" | "independent";
export type SenateNamer = "government" | "opposition" | "governor";

export type SenateSeat = {
  index: number;
  bloc: SenateBloc;
  namedBy: SenateNamer;
  member: string | null;
};

export type SenateChamber = {
  mode: "PAPER";
  provenance: "SIMULATED";
  note: string;
  seats: SenateSeat[];
  /** Bill ids the Senate has already delayed. One delay each. */
  delayedBillIds: string[];
};

export type GovernorFreeze = {
  island: IslandId;
  startedAt: number;
  untilTick: number;
} | null;

export type Bill = {
  id: string;
  money: boolean;
};

export type DelayOk = { ok: true; delayed: true; untilTick: number };
export type DelayFail = { ok: false; reason: string };
export type DelayResult = DelayOk | DelayFail;

export type FreezeOk = { ok: true; freeze: NonNullable<GovernorFreeze> };
export type FreezeFail = { ok: false; reason: string };
export type FreezeResult = FreezeOk | FreezeFail;

const VACANT_NOTE =
  "PAPER vacant Senate. Appointed 6/3/2 after the House sits. Not live votes.";
const SEATED_NOTE =
  "PAPER Senate appointed 6 government / 3 opposition / 2 Governor independents. SIMULATED. Not live votes.";

const BLOC_PLAN: { bloc: SenateBloc; namedBy: SenateNamer }[] = [
  ...Array.from({ length: GOVERNMENT_SENATORS }, () => ({
    bloc: "government" as const,
    namedBy: "government" as const,
  })),
  ...Array.from({ length: OPPOSITION_SENATORS }, () => ({
    bloc: "opposition" as const,
    namedBy: "opposition" as const,
  })),
  ...Array.from({ length: INDEPENDENT_SENATORS }, () => ({
    bloc: "independent" as const,
    namedBy: "governor" as const,
  })),
];

function seatsOf(members: Array<string | null>): SenateSeat[] {
  return BLOC_PLAN.map((row, index) => ({
    index,
    bloc: row.bloc,
    namedBy: row.namedBy,
    member: members[index] ?? null,
  }));
}

function chamberOf(seats: SenateSeat[], seated: boolean): SenateChamber {
  return {
    mode: "PAPER",
    provenance: "SIMULATED",
    note: seated ? SEATED_NOTE : VACANT_NOTE,
    seats,
    delayedBillIds: [],
  };
}

function npcSenator(bloc: SenateBloc, n: number): string {
  if (bloc === "government") return `npc:senate-gov-${n}`;
  if (bloc === "opposition") return `npc:senate-opp-${n}`;
  return `npc:senate-ind-${n}`;
}

function fillAppointed(pm: string | null): SenateSeat[] {
  let gov = 0;
  let opp = 0;
  let ind = 0;
  const members = BLOC_PLAN.map((row) => {
    if (row.bloc === "government") return npcSenator("government", ++gov);
    if (row.bloc === "opposition") return npcSenator("opposition", ++opp);
    const name = npcSenator("independent", ++ind);
    return name === pm ? `npc:senate-ind-${ind}-alt` : name;
  });
  return seatsOf(members);
}

function senateSeated(chamber: SenateChamber): boolean {
  return (
    chamber.seats.length === SENATE_SEATS &&
    chamber.seats.every((s) => s.member != null)
  );
}

function appointFromHouse(house: HouseChamber): SenateChamber {
  if (!canOriginateMoneyBill(house)) return chamberOf(seatsOf(Array(SENATE_SEATS).fill(null)), false);
  return chamberOf(fillAppointed(namePM(house)), true);
}

/** Eleven empty chairs. 6/3/2 labels wait for appointment. */
export function createSenate(): SenateChamber {
  return chamberOf(seatsOf(Array(SENATE_SEATS).fill(null)), false);
}

/**
 * Call maybeElectHouse first. Appoint 6/3/2 only once the House can originate
 * money bills (20 members sit).
 */
export function maybeAppointSenate(tick: number): SenateChamber {
  const house = maybeElectHouse(tick);
  return appointFromHouse(house);
}

/**
 * PM from House confidence. Null until 20 members sit; PAPER NPC slate
 * then commands 20 ≥ 11.
 */
export function namePM(chamber: HouseChamber): string | null {
  if (!canOriginateMoneyBill(chamber)) return null;
  const seated = chamber.seats.filter((s) => s.member != null);
  if (seated.length < CONFIDENCE_MAJORITY) return null;
  return seated[0]!.member;
}

/** Senate may delay a non-money bill once. Cannot delay or kill money bills. */
export function delayBill(senate: SenateChamber, bill: Bill, nowTick: number): DelayResult {
  if (!senateSeated(senate)) return { ok: false, reason: "senate_vacant" };
  const id = String(bill.id ?? "").trim();
  if (!id) return { ok: false, reason: "no_bill" };
  if (bill.money) return { ok: false, reason: "money_bill" };
  if (senate.delayedBillIds.includes(id)) return { ok: false, reason: "already_delayed" };
  senate.delayedBillIds.push(id);
  return {
    ok: true,
    delayed: true,
    untilTick: nowTick + SENATE_DELAY_TICKS,
  };
}

/**
 * Governor 24h permit freeze on one island. Executive after the House (and
 * Governor) sit. Does not demolish existing buildings or apps.
 */
export function issueGovernorFreeze(tick: number, island: IslandId): FreezeResult {
  const house = maybeElectHouse(tick);
  if (!canOriginateMoneyBill(house)) return { ok: false, reason: "house_vacant" };
  if (island !== "north" && island !== "south") return { ok: false, reason: "bad_island" };
  return {
    ok: true,
    freeze: {
      island,
      startedAt: tick,
      untilTick: tick + GOVERNOR_FREEZE_TICKS,
    },
  };
}

export function isIslandFrozen(
  freeze: GovernorFreeze,
  island: IslandId,
  nowTick: number,
): boolean {
  if (!freeze) return false;
  if (freeze.island !== island) return false;
  return nowTick < freeze.untilTick;
}

/** New large apps on the frozen island are blocked. The other island is not. */
export function canFileNewLarge(
  freeze: GovernorFreeze,
  island: IslandId,
  nowTick: number,
): boolean {
  return !isIslandFrozen(freeze, island, nowTick);
}

/**
 * File a large-class application unless a Governor freeze covers that island.
 * Existing queued apps are untouched.
 */
export function fileNewLargeApp(
  board: PlanningBoard,
  freeze: GovernorFreeze,
  island: IslandId,
  nowTick: number,
  input: FileApplicationInput,
): PlanningResult {
  if (!canFileNewLarge(freeze, island, nowTick)) {
    return { ok: false, reason: "governor_freeze" };
  }
  return fileApplication(board, { ...input, filedAt: input.filedAt ?? nowTick });
}
