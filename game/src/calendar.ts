/** PAPER sim calendar. 1Hz tick. One sim day is 3600 ticks so tests stay short. */

export const TICKS_PER_SIM_DAY = 3600;
export const FIRST_GENERAL_DAY = 14;
export const FIRST_COUNCIL_DAY = 21;
export const GENERAL_INTERVAL_DAYS = 28;
export const COUNCIL_INTERVAL_DAYS = 28;

/** House/Senate session every 2 real hours at 1Hz. */
export const SESSION_INTERVAL_TICKS = 7200;
/** Floor vote window: first 20 minutes of each session. */
export const VOTE_WINDOW_TICKS = 1200;

export function simDay(tick: number): number {
  return Math.floor(Math.max(0, tick) / TICKS_PER_SIM_DAY);
}

function nextScheduledDay(day: number, first: number, interval: number): number {
  if (day < first) return first;
  const since = day - first;
  const steps = Math.ceil(since / interval);
  const next = first + steps * interval;
  return next === day ? next + interval : next;
}

function isScheduledDay(day: number, first: number, interval: number): boolean {
  if (day < first) return false;
  return (day - first) % interval === 0;
}

export function nextGeneralDay(tick: number): number {
  return nextScheduledDay(simDay(tick), FIRST_GENERAL_DAY, GENERAL_INTERVAL_DAYS);
}

export function nextCouncilDay(tick: number): number {
  return nextScheduledDay(simDay(tick), FIRST_COUNCIL_DAY, COUNCIL_INTERVAL_DAYS);
}

export function isGeneralElectionDay(tick: number): boolean {
  return isScheduledDay(simDay(tick), FIRST_GENERAL_DAY, GENERAL_INTERVAL_DAYS);
}

export function isCouncilElectionDay(tick: number): boolean {
  return isScheduledDay(simDay(tick), FIRST_COUNCIL_DAY, COUNCIL_INTERVAL_DAYS);
}

export function daysUntilGeneral(tick: number): number {
  if (isGeneralElectionDay(tick)) return 0;
  return nextGeneralDay(tick) - simDay(tick);
}

export function sessionStartTick(tick: number): number {
  return Math.floor(Math.max(0, tick) / SESSION_INTERVAL_TICKS) * SESSION_INTERVAL_TICKS;
}

export function nextSessionTick(tick: number): number {
  return sessionStartTick(tick) + SESSION_INTERVAL_TICKS;
}

export function isVoteWindow(tick: number): boolean {
  const t = Math.max(0, tick);
  return t - sessionStartTick(t) < VOTE_WINDOW_TICKS;
}

export function ticksUntilVoteCloses(tick: number): number {
  if (!isVoteWindow(tick)) return 0;
  return VOTE_WINDOW_TICKS - (Math.max(0, tick) - sessionStartTick(tick));
}

export function ticksUntilNextSession(tick: number): number {
  return nextSessionTick(tick) - Math.max(0, tick);
}

export function calendarHud(tick: number) {
  return {
    mode: "PAPER" as const,
    provenance: "SIMULATED" as const,
    note: "PAPER sim clock. Not live votes. 1Hz tick; 3600 ticks = 1 sim day.",
    tick,
    day: simDay(tick),
    nextGeneralDay: nextGeneralDay(tick),
    nextCouncilDay: nextCouncilDay(tick),
    daysUntilGeneral: daysUntilGeneral(tick),
    isGeneralElectionDay: isGeneralElectionDay(tick),
    isCouncilElectionDay: isCouncilElectionDay(tick),
    sessionStartTick: sessionStartTick(tick),
    nextSessionTick: nextSessionTick(tick),
    voteOpen: isVoteWindow(tick),
  };
}
