import { describe, expect, it } from "vitest";
import {
  FIRST_COUNCIL_DAY,
  TICKS_PER_SIM_DAY,
  isCouncilElectionDay,
  simDay,
} from "./calendar.ts";
import { buildDistricts } from "./districts.ts";
import {
  COUNCIL_COUNT,
  COUNCIL_YES_MAJORITY,
  SEATS_PER_COUNCIL,
  councilsSitting,
  createCouncils,
  grantLargeSite,
  maybeElectCouncils,
  type Council,
} from "./councils.ts";

function dayTick(day: number): number {
  return day * TICKS_PER_SIM_DAY;
}

function islandCount(board: ReturnType<typeof createCouncils>, island: "north" | "south") {
  return board.councils.filter((c) => c.island === island).length;
}

function setVotes(council: Council, votes: Array<"yes" | "no" | null>) {
  votes.forEach((vote, i) => {
    council.seats[i]!.vote = vote;
  });
}

describe("PAPER constituency councils step J", () => {
  it("exports 20 vacant 5-seat councils until day 21 (resident poll still stands)", () => {
    const vacant = createCouncils();
    expect(vacant.mode).toBe("PAPER");
    expect(vacant.provenance).toBe("SIMULATED");
    expect(vacant.sitting).toBe(false);
    expect(vacant.councils).toHaveLength(COUNCIL_COUNT);
    expect(vacant.councils).toHaveLength(20);
    expect(vacant.councils.every((c) => c.seats.length === SEATS_PER_COUNCIL)).toBe(true);
    expect(vacant.councils.every((c) => c.seats.every((s) => s.member === null))).toBe(true);
    expect(vacant.note).toMatch(/resident poll/i);

    expect(simDay(dayTick(20))).toBe(20);
    expect(isCouncilElectionDay(dayTick(20))).toBe(false);
    expect(councilsSitting(dayTick(20))).toBe(false);
    expect(councilsSitting(0)).toBe(false);

    const before = maybeElectCouncils(dayTick(20));
    expect(before.sitting).toBe(false);
    expect(before.councils.every((c) => c.seats.every((s) => s.member === null))).toBe(true);
    expect(grantLargeSite(before.councils[0]!, "quarry").ok).toBe(false);
  });

  it("fills PAPER NPC slates of 5 seats per council on and after day 21", () => {
    expect(FIRST_COUNCIL_DAY).toBe(21);
    expect(isCouncilElectionDay(dayTick(21))).toBe(true);
    expect(councilsSitting(dayTick(21))).toBe(true);

    const election = maybeElectCouncils(dayTick(21));
    expect(election.mode).toBe("PAPER");
    expect(election.provenance).toBe("SIMULATED");
    expect(election.sitting).toBe(true);
    expect(election.councils).toHaveLength(20);
    expect(election.councils.every((c) => c.seats.length === 5)).toBe(true);
    expect(
      election.councils.every((c) => c.seats.every((s) => typeof s.member === "string")),
    ).toBe(true);
    expect(
      election.councils.every((c) => c.seats.every((s) => s.member?.startsWith("npc:"))),
    ).toBe(true);
    expect(election.note).toMatch(/NPC/i);

    const after = maybeElectCouncils(dayTick(22));
    expect(isCouncilElectionDay(dayTick(22))).toBe(false);
    expect(councilsSitting(dayTick(22))).toBe(true);
    expect(after.sitting).toBe(true);
    expect(after.councils.every((c) => c.seats.every((s) => s.member != null))).toBe(true);

    const later = maybeElectCouncils(dayTick(49));
    expect(isCouncilElectionDay(dayTick(49))).toBe(true);
    expect(later.councils).toHaveLength(20);
    expect(later.sitting).toBe(true);
  });

  it("keeps one council per House constituency (10 North, 10 South)", () => {
    const districts = buildDistricts();
    expect(districts).toHaveLength(20);
    const vacant = createCouncils();
    expect(islandCount(vacant, "north")).toBe(10);
    expect(islandCount(vacant, "south")).toBe(10);
    expect(vacant.councils.map((c) => c.constituencyId)).toEqual(districts.map((d) => d.id));
    expect(vacant.councils.map((c) => c.island)).toEqual(districts.map((d) => d.island));

    const seated = maybeElectCouncils(dayTick(21));
    expect(islandCount(seated, "north")).toBe(10);
    expect(islandCount(seated, "south")).toBe(10);
    expect(seated.councils[0]).toMatchObject({
      constituencyId: districts[0]!.id,
      island: districts[0]!.island,
    });
    expect(seated.councils[0]!.seats[0]).toEqual({
      index: 0,
      member: `npc:${districts[0]!.id}:0`,
      vote: null,
    });
  });

  it("lets a council majority grant a quarry with >=3 of 5 yes", () => {
    expect(COUNCIL_YES_MAJORITY).toBe(3);
    const seated = maybeElectCouncils(dayTick(21), [
      { id: "harbour", island: "north" },
    ]);
    const council = seated.councils[0]!;
    expect(council.seats).toHaveLength(5);

    const shop = grantLargeSite(council, "shop");
    expect(shop.ok).toBe(false);
    if (!shop.ok) expect(shop.reason).toBe("not_large");

    setVotes(council, ["yes", "yes", null, null, null]);
    const short = grantLargeSite(council, "quarry");
    expect(short.ok).toBe(false);
    if (!short.ok) expect(short.reason).toBe("no_majority");

    setVotes(council, ["yes", "yes", "yes", null, null]);
    const granted = grantLargeSite(council, "quarry");
    expect(granted.ok).toBe(true);
    if (granted.ok) expect(granted.use).toBe("quarry");

    setVotes(council, ["yes", "yes", "yes", "no", "no"]);
    const still = grantLargeSite(council, "quarry");
    expect(still.ok).toBe(true);

    const vacant = createCouncils([{ id: "harbour", island: "north" }]).councils[0]!;
    setVotes(vacant, ["yes", "yes", "yes", "yes", "yes"]);
    const early = grantLargeSite(vacant, "quarry");
    expect(early.ok).toBe(false);
    if (!early.ok) expect(early.reason).toBe("not_sitting");
  });
});
