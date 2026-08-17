import { describe, expect, it } from "vitest";
import {
  FIRST_GENERAL_DAY,
  TICKS_PER_SIM_DAY,
  isGeneralElectionDay,
  simDay,
} from "./calendar.ts";
import {
  HOUSE_SEATS,
  canOriginateMoneyBill,
  createChamber,
  maybeElectHouse,
} from "./offices.ts";

function dayTick(day: number): number {
  return day * TICKS_PER_SIM_DAY;
}

function islandCount(chamber: ReturnType<typeof createChamber>, island: "north" | "south") {
  return chamber.seats.filter((s) => s.island === island).length;
}

describe("PAPER House of 20 seats", () => {
  it("exports a vacant chamber until the first general", () => {
    const vacant = createChamber();
    expect(vacant.mode).toBe("PAPER");
    expect(vacant.provenance).toBe("SIMULATED");
    expect(vacant.seats).toHaveLength(HOUSE_SEATS);
    expect(vacant.seats.every((s) => s.member === null)).toBe(true);
    expect(canOriginateMoneyBill(vacant)).toBe(false);

    expect(simDay(dayTick(13))).toBe(13);
    expect(isGeneralElectionDay(dayTick(13))).toBe(false);

    const before = maybeElectHouse(dayTick(13));
    expect(before.seats.every((s) => s.member === null)).toBe(true);
    expect(canOriginateMoneyBill(before)).toBe(false);
    expect(before.note).toMatch(/vacant/i);
  });

  it("fills a PAPER NPC slate on and after day 14", () => {
    expect(FIRST_GENERAL_DAY).toBe(14);
    expect(isGeneralElectionDay(dayTick(14))).toBe(true);

    const election = maybeElectHouse(dayTick(14));
    expect(election.mode).toBe("PAPER");
    expect(election.provenance).toBe("SIMULATED");
    expect(election.seats).toHaveLength(20);
    expect(election.seats.every((s) => typeof s.member === "string")).toBe(true);
    expect(election.seats.every((s) => s.member?.startsWith("npc:"))).toBe(true);
    expect(canOriginateMoneyBill(election)).toBe(true);

    const after = maybeElectHouse(dayTick(15));
    expect(isGeneralElectionDay(dayTick(15))).toBe(false);
    expect(after.seats.every((s) => s.member != null)).toBe(true);
    expect(canOriginateMoneyBill(after)).toBe(true);

    const laterGeneral = maybeElectHouse(dayTick(42));
    expect(isGeneralElectionDay(dayTick(42))).toBe(true);
    expect(laterGeneral.seats).toHaveLength(20);
    expect(canOriginateMoneyBill(laterGeneral)).toBe(true);
  });

  it("keeps 10 North and 10 South constituencies", () => {
    const vacant = createChamber();
    expect(islandCount(vacant, "north")).toBe(10);
    expect(islandCount(vacant, "south")).toBe(10);
    expect(vacant.seats.map((s) => s.districtId)).toEqual([
      "north-1",
      "north-2",
      "north-3",
      "north-4",
      "north-5",
      "north-6",
      "north-7",
      "north-8",
      "north-9",
      "north-10",
      "south-1",
      "south-2",
      "south-3",
      "south-4",
      "south-5",
      "south-6",
      "south-7",
      "south-8",
      "south-9",
      "south-10",
    ]);

    const seated = maybeElectHouse(dayTick(14));
    expect(islandCount(seated, "north")).toBe(10);
    expect(islandCount(seated, "south")).toBe(10);
    expect(seated.seats[0]).toEqual({
      index: 0,
      island: "north",
      districtId: "north-1",
      member: "npc:north-1",
    });
    expect(seated.seats[10]).toMatchObject({
      index: 10,
      island: "south",
      districtId: "south-1",
    });
  });

  it("uses supplied districts when maybeElectHouse is given a slate map", () => {
    const districts = [
      { id: "harbour", island: "north" as const },
      { id: "mill", island: "south" as const },
    ];
    const seated = maybeElectHouse(dayTick(14), districts);
    expect(seated.seats).toHaveLength(2);
    expect(seated.seats[0]?.member).toBe("npc:harbour");
    expect(seated.seats[1]?.island).toBe("south");
    expect(canOriginateMoneyBill(seated)).toBe(false);
  });
});
