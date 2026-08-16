import { describe, expect, it } from "vitest";
import {
  COUNCIL_INTERVAL_DAYS,
  FIRST_COUNCIL_DAY,
  FIRST_GENERAL_DAY,
  GENERAL_INTERVAL_DAYS,
  SESSION_INTERVAL_TICKS,
  TICKS_PER_SIM_DAY,
  VOTE_WINDOW_TICKS,
  calendarHud,
  daysUntilGeneral,
  isCouncilElectionDay,
  isGeneralElectionDay,
  isVoteWindow,
  nextCouncilDay,
  nextGeneralDay,
  nextSessionTick,
  sessionStartTick,
  simDay,
  ticksUntilNextSession,
  ticksUntilVoteCloses,
} from "./calendar.ts";

function dayTick(day: number): number {
  return day * TICKS_PER_SIM_DAY;
}

describe("PAPER sim calendar", () => {
  it("keeps the step H clock constants", () => {
    expect(TICKS_PER_SIM_DAY).toBe(3600);
    expect(FIRST_GENERAL_DAY).toBe(14);
    expect(FIRST_COUNCIL_DAY).toBe(21);
    expect(GENERAL_INTERVAL_DAYS).toBe(28);
    expect(COUNCIL_INTERVAL_DAYS).toBe(28);
    expect(SESSION_INTERVAL_TICKS).toBe(7200);
    expect(VOTE_WINDOW_TICKS).toBe(1200);
  });

  it("maps ticks onto sim days and keeps the first general on day 14", () => {
    expect(simDay(0)).toBe(0);
    expect(simDay(TICKS_PER_SIM_DAY - 1)).toBe(0);
    expect(simDay(TICKS_PER_SIM_DAY)).toBe(1);
    expect(nextGeneralDay(0)).toBe(FIRST_GENERAL_DAY);
    expect(nextGeneralDay(dayTick(FIRST_GENERAL_DAY))).toBe(FIRST_GENERAL_DAY + 28);
  });

  it("flags general and council election days on the 28-day offset calendars", () => {
    expect(isGeneralElectionDay(0)).toBe(false);
    expect(isGeneralElectionDay(dayTick(13))).toBe(false);
    expect(isGeneralElectionDay(dayTick(14))).toBe(true);
    expect(isGeneralElectionDay(dayTick(15))).toBe(false);
    expect(isGeneralElectionDay(dayTick(21))).toBe(false);
    expect(isGeneralElectionDay(dayTick(42))).toBe(true);

    expect(isCouncilElectionDay(dayTick(14))).toBe(false);
    expect(isCouncilElectionDay(dayTick(20))).toBe(false);
    expect(isCouncilElectionDay(dayTick(21))).toBe(true);
    expect(isCouncilElectionDay(dayTick(22))).toBe(false);
    expect(isCouncilElectionDay(dayTick(49))).toBe(true);
    expect(nextCouncilDay(0)).toBe(FIRST_COUNCIL_DAY);
    expect(nextCouncilDay(dayTick(FIRST_COUNCIL_DAY))).toBe(FIRST_COUNCIL_DAY + 28);
  });

  it("counts days until the next general, zero on election day", () => {
    expect(daysUntilGeneral(0)).toBe(14);
    expect(daysUntilGeneral(dayTick(13))).toBe(1);
    expect(daysUntilGeneral(dayTick(14))).toBe(0);
    expect(daysUntilGeneral(dayTick(15))).toBe(27);
    expect(daysUntilGeneral(dayTick(42))).toBe(0);
  });

  it("opens a 20-minute vote at the start of every 2-hour session", () => {
    expect(sessionStartTick(0)).toBe(0);
    expect(sessionStartTick(7199)).toBe(0);
    expect(sessionStartTick(7200)).toBe(7200);
    expect(nextSessionTick(0)).toBe(7200);
    expect(ticksUntilNextSession(100)).toBe(7100);

    expect(isVoteWindow(0)).toBe(true);
    expect(isVoteWindow(1199)).toBe(true);
    expect(isVoteWindow(1200)).toBe(false);
    expect(isVoteWindow(7199)).toBe(false);
    expect(isVoteWindow(7200)).toBe(true);
    expect(isVoteWindow(8399)).toBe(true);
    expect(isVoteWindow(8400)).toBe(false);

    expect(ticksUntilVoteCloses(0)).toBe(1200);
    expect(ticksUntilVoteCloses(200)).toBe(1000);
    expect(ticksUntilVoteCloses(1200)).toBe(0);
    expect(ticksUntilVoteCloses(7200)).toBe(1200);
  });

  it("labels calendarHud PAPER / SIMULATED", () => {
    const hud = calendarHud(0);
    expect(hud.mode).toBe("PAPER");
    expect(hud.provenance).toBe("SIMULATED");
    expect(hud.note).toMatch(/PAPER/);
    expect(hud.day).toBe(0);
    expect(hud.nextGeneralDay).toBe(14);
    expect(hud.nextCouncilDay).toBe(21);
    expect(hud.daysUntilGeneral).toBe(14);
    expect(hud.voteOpen).toBe(true);

    const election = calendarHud(dayTick(14));
    expect(election.mode).toBe("PAPER");
    expect(election.isGeneralElectionDay).toBe(true);
    expect(election.isCouncilElectionDay).toBe(false);
    expect(election.daysUntilGeneral).toBe(0);
  });
});
