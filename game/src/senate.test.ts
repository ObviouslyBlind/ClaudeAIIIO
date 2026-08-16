import { describe, expect, it } from "vitest";
import { TICKS_PER_SIM_DAY } from "./calendar.ts";
import {
  canOriginateMoneyBill,
  maybeElectHouse,
} from "./offices.ts";
import { createPlanningBoard, fileApplication } from "./planning.ts";
import {
  CONFIDENCE_MAJORITY,
  GOVERNMENT_SENATORS,
  GOVERNOR_FREEZE_TICKS,
  INDEPENDENT_SENATORS,
  OPPOSITION_SENATORS,
  SENATE_DELAY_TICKS,
  SENATE_SEATS,
  canFileNewLarge,
  createSenate,
  delayBill,
  fileNewLargeApp,
  issueGovernorFreeze,
  maybeAppointSenate,
  namePM,
} from "./senate.ts";

function dayTick(day: number): number {
  return day * TICKS_PER_SIM_DAY;
}

function countBloc(senate: ReturnType<typeof createSenate>, bloc: string) {
  return senate.seats.filter((s) => s.bloc === bloc && s.member != null).length;
}

describe("PAPER Senate 6/3/2 after the House sits", () => {
  it("keeps 11 empty chairs until the House sits", () => {
    const vacant = createSenate();
    expect(vacant.mode).toBe("PAPER");
    expect(vacant.provenance).toBe("SIMULATED");
    expect(vacant.seats).toHaveLength(SENATE_SEATS);
    expect(SENATE_SEATS).toBe(11);
    expect(GOVERNMENT_SENATORS + OPPOSITION_SENATORS + INDEPENDENT_SENATORS).toBe(11);
    expect(vacant.seats.every((s) => s.member === null)).toBe(true);
    expect(vacant.note).toMatch(/vacant/i);

    const house = maybeElectHouse(dayTick(13));
    expect(canOriginateMoneyBill(house)).toBe(false);
    expect(namePM(house)).toBeNull();

    const before = maybeAppointSenate(dayTick(13));
    expect(before.seats).toHaveLength(11);
    expect(before.seats.every((s) => s.member === null)).toBe(true);
    expect(countBloc(before, "government")).toBe(0);
  });

  it("appoints 11 senators 6 government / 3 opposition / 2 Governor independents", () => {
    const house = maybeElectHouse(dayTick(14));
    expect(canOriginateMoneyBill(house)).toBe(true);

    const senate = maybeAppointSenate(dayTick(14));
    expect(senate.mode).toBe("PAPER");
    expect(senate.provenance).toBe("SIMULATED");
    expect(senate.seats).toHaveLength(11);
    expect(senate.seats.every((s) => typeof s.member === "string")).toBe(true);
    expect(countBloc(senate, "government")).toBe(6);
    expect(countBloc(senate, "opposition")).toBe(3);
    expect(countBloc(senate, "independent")).toBe(2);
    expect(senate.seats.filter((s) => s.namedBy === "governor")).toHaveLength(2);
    expect(senate.seats.filter((s) => s.namedBy === "government")).toHaveLength(6);
    expect(senate.seats.filter((s) => s.namedBy === "opposition")).toHaveLength(3);

    const pm = namePM(house);
    expect(pm).toBe("npc:north-1");
    expect(CONFIDENCE_MAJORITY).toBe(11);
    expect(senate.seats.filter((s) => s.bloc === "independent").every((s) => s.member !== pm)).toBe(
      true,
    );

    const later = maybeAppointSenate(dayTick(15));
    expect(later.seats).toHaveLength(11);
    expect(countBloc(later, "government")).toBe(6);
  });

  it("delays a non-money bill once and refuses a second delay or a money bill", () => {
    const vacant = maybeAppointSenate(dayTick(13));
    const tooSoon = delayBill(vacant, { id: "nuisance-hours", money: false }, dayTick(13));
    expect(tooSoon.ok).toBe(false);
    if (!tooSoon.ok) expect(tooSoon.reason).toBe("senate_vacant");

    const senate = maybeAppointSenate(dayTick(14));
    const money = delayBill(senate, { id: "sales-tax", money: true }, dayTick(14));
    expect(money.ok).toBe(false);
    if (!money.ok) expect(money.reason).toBe("money_bill");

    const first = delayBill(senate, { id: "nuisance-hours", money: false }, dayTick(14));
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.delayed).toBe(true);
    expect(first.untilTick - dayTick(14)).toBe(SENATE_DELAY_TICKS);
    expect(SENATE_DELAY_TICKS).toBe(TICKS_PER_SIM_DAY);

    const second = delayBill(senate, { id: "nuisance-hours", money: false }, dayTick(14) + 10);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe("already_delayed");

    const other = delayBill(senate, { id: "density-cap", money: false }, dayTick(14));
    expect(other.ok).toBe(true);
  });

  it("blocks new large apps on the frozen island for 24h", () => {
    expect(GOVERNOR_FREEZE_TICKS).toBe(TICKS_PER_SIM_DAY);

    const seatedTick = dayTick(14);
    const issued = issueGovernorFreeze(seatedTick, "north");
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;
    expect(issued.freeze.island).toBe("north");
    expect(issued.freeze.untilTick - seatedTick).toBe(GOVERNOR_FREEZE_TICKS);

    expect(canFileNewLarge(issued.freeze, "north", seatedTick)).toBe(false);
    expect(canFileNewLarge(issued.freeze, "south", seatedTick)).toBe(true);

    const board = createPlanningBoard();
    const blocked = fileNewLargeApp(board, issued.freeze, "north", seatedTick, {
      plotId: "north-street-0",
      use: "factory",
      owners: ["ada"],
      feePaid: 25,
    });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.reason).toBe("governor_freeze");
    expect(board.apps).toHaveLength(0);

    const south = fileNewLargeApp(board, issued.freeze, "south", seatedTick, {
      plotId: "south-street-0",
      use: "mill",
      owners: ["bev"],
      feePaid: 25,
    });
    expect(south.ok).toBe(true);
    expect(board.apps).toHaveLength(1);

    const after = seatedTick + GOVERNOR_FREEZE_TICKS;
    expect(canFileNewLarge(issued.freeze, "north", after)).toBe(true);
    const thawed = fileNewLargeApp(board, issued.freeze, "north", after, {
      plotId: "north-street-1",
      use: "warehouse",
      owners: ["ada"],
      feePaid: 25,
    });
    expect(thawed.ok).toBe(true);

    const prior = fileApplication(createPlanningBoard(), {
      plotId: "north-street-2",
      use: "quarry",
      owners: ["ada"],
      feePaid: 25,
      filedAt: seatedTick - 10,
    });
    expect(prior.ok).toBe(true);
  });

  it("refuses a Governor freeze before the House sits", () => {
    const early = issueGovernorFreeze(dayTick(13), "north");
    expect(early.ok).toBe(false);
    if (!early.ok) expect(early.reason).toBe("house_vacant");
    expect(canFileNewLarge(null, "north", dayTick(13))).toBe(true);
    expect(namePM(maybeElectHouse(dayTick(13)))).toBeNull();
  });
});
