/** PAPER House chamber. Vacant until the first general. Not live votes. */

import type { IslandId } from "./land.ts";
import {
  FIRST_GENERAL_DAY,
  isGeneralElectionDay,
  simDay,
} from "./calendar.ts";

export const HOUSE_SEATS = 20;
export const SEATS_PER_ISLAND = 10;

export type HouseDistrictRef = { id: string; island: IslandId };

export type HouseSeat = {
  index: number;
  island: IslandId;
  districtId: string;
  member: string | null;
};

export type HouseChamber = {
  mode: "PAPER";
  provenance: "SIMULATED";
  note: string;
  seats: HouseSeat[];
};

const VACANT_NOTE =
  "PAPER vacant House. No elected members until the first general (day 14). Not live votes.";
const SEATED_NOTE =
  "PAPER NPC slate after the first general. SIMULATED members. Not live votes.";

function defaultDistricts(): HouseDistrictRef[] {
  const out: HouseDistrictRef[] = [];
  for (const island of ["north", "south"] as const) {
    for (let n = 1; n <= SEATS_PER_ISLAND; n++) {
      out.push({ id: `${island}-${n}`, island });
    }
  }
  return out;
}

function vacantSeats(districts: HouseDistrictRef[]): HouseSeat[] {
  return districts.map((d, index) => ({
    index,
    island: d.island,
    districtId: d.id,
    member: null,
  }));
}

function npcMember(districtId: string): string {
  return `npc:${districtId}`;
}

function fillNpcSlate(seats: HouseSeat[]): HouseSeat[] {
  return seats.map((seat) => ({
    ...seat,
    member: npcMember(seat.districtId),
  }));
}

function chamberOf(seats: HouseSeat[], seated: boolean): HouseChamber {
  return {
    mode: "PAPER",
    provenance: "SIMULATED",
    note: seated ? SEATED_NOTE : VACANT_NOTE,
    seats,
  };
}

/** Twenty empty chairs. 10 North, 10 South when districts are omitted. */
export function createChamber(districts?: HouseDistrictRef[]): HouseChamber {
  return chamberOf(vacantSeats(districts ?? defaultDistricts()), false);
}

/**
 * Until day 14 the House is vacant. On and after the first general a PAPER NPC
 * slate fills every seat so the sim is not lawless. No live election UI.
 */
export function maybeElectHouse(
  tick: number,
  districts?: HouseDistrictRef[],
): HouseChamber {
  const vacant = createChamber(districts);
  const day = simDay(tick);
  const afterFirstGeneral = day > FIRST_GENERAL_DAY;
  const seated = isGeneralElectionDay(tick) || afterFirstGeneral;
  if (!seated) return vacant;
  return chamberOf(fillNpcSlate(vacant.seats), true);
}

/** Money bills originate in the House only, and only once 20 members sit. */
export function canOriginateMoneyBill(chamber: HouseChamber): boolean {
  return (
    chamber.seats.length === HOUSE_SEATS &&
    chamber.seats.every((s) => s.member != null)
  );
}
