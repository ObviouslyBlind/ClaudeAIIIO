/** PAPER constituency councils. Vacant until day 21. Not live votes. */

import type { IslandId } from "./land.ts";
import { buildDistricts } from "./districts.ts";
import {
  FIRST_COUNCIL_DAY,
  isCouncilElectionDay,
  simDay,
} from "./calendar.ts";
import { isLargeClass } from "./planning.ts";

export const COUNCIL_COUNT = 20;
export const SEATS_PER_COUNCIL = 5;
/** Simple majority of a 5-seat council. Absentees are not a no, but a grant still needs 3 yes. */
export const COUNCIL_YES_MAJORITY = 3;

export type ConstituencyRef = { id: string; island: IslandId };
export type CouncilVote = "yes" | "no" | null;

export type CouncilSeat = {
  index: number;
  member: string | null;
  vote: CouncilVote;
};

export type Council = {
  constituencyId: string;
  island: IslandId;
  seats: CouncilSeat[];
};

export type CouncilsBoard = {
  mode: "PAPER";
  provenance: "SIMULATED";
  note: string;
  sitting: boolean;
  councils: Council[];
};

export type GrantOk = { ok: true; use: string };
export type GrantFail = { ok: false; reason: string };
export type GrantResult = GrantOk | GrantFail;

const VACANT_NOTE =
  "PAPER vacant councils. Resident poll still stands until the first council election (day 21). Not live votes.";
const SEATED_NOTE =
  "PAPER NPC slates after the first council election. SIMULATED members. Not live votes. Resident poll replaced.";

function defaultConstituencies(): ConstituencyRef[] {
  return buildDistricts().map((d) => ({ id: d.id, island: d.island }));
}

function vacantCouncil(ref: ConstituencyRef): Council {
  const seats: CouncilSeat[] = [];
  for (let index = 0; index < SEATS_PER_COUNCIL; index++) {
    seats.push({ index, member: null, vote: null });
  }
  return { constituencyId: ref.id, island: ref.island, seats };
}

function npcMember(constituencyId: string, index: number): string {
  return `npc:${constituencyId}:${index}`;
}

function fillNpcSlate(council: Council): Council {
  return {
    ...council,
    seats: council.seats.map((seat) => ({
      ...seat,
      member: npcMember(council.constituencyId, seat.index),
      vote: null,
    })),
  };
}

function boardOf(councils: Council[], sitting: boolean): CouncilsBoard {
  return {
    mode: "PAPER",
    provenance: "SIMULATED",
    note: sitting ? SEATED_NOTE : VACANT_NOTE,
    sitting,
    councils,
  };
}

/**
 * True on and after the first council election (day 21). Before that the
 * resident poll still stands.
 */
export function councilsSitting(tick: number): boolean {
  const day = simDay(tick);
  return isCouncilElectionDay(tick) || day > FIRST_COUNCIL_DAY;
}

/** Twenty empty 5-seat councils, one per constituency, when districts are omitted. */
export function createCouncils(districts?: ConstituencyRef[]): CouncilsBoard {
  const refs = districts ?? defaultConstituencies();
  return boardOf(refs.map(vacantCouncil), false);
}

/**
 * Until day 21 councils are vacant and the resident poll still stands.
 * On and after the first council election a PAPER NPC slate fills 5 seats
 * per constituency. No live election UI.
 */
export function maybeElectCouncils(
  tick: number,
  districts?: ConstituencyRef[],
): CouncilsBoard {
  const vacant = createCouncils(districts);
  if (!councilsSitting(tick)) return vacant;
  return boardOf(vacant.councils.map(fillNpcSlate), true);
}

/**
 * Council majority can grant a large site (quarry). Needs >=3 of 5 yes.
 * Does not place a building. PAPER.
 */
export function grantLargeSite(council: Council, use: string): GrantResult {
  const site = String(use ?? "").trim();
  if (!isLargeClass(site)) return { ok: false, reason: "not_large" };
  if (council.seats.length !== SEATS_PER_COUNCIL) return { ok: false, reason: "bad_seats" };
  if (council.seats.some((s) => s.member == null)) return { ok: false, reason: "not_sitting" };
  const yes = council.seats.filter((s) => s.vote === "yes").length;
  if (yes < COUNCIL_YES_MAJORITY) return { ok: false, reason: "no_majority" };
  return { ok: true, use: site };
}
