/** PAPER sim calendar. 1Hz tick. One sim day is 3600 ticks so tests stay short. */

export const TICKS_PER_SIM_DAY = 3600;
export const FIRST_GENERAL_DAY = 14;
export const FIRST_COUNCIL_DAY = 21;
export const GENERAL_INTERVAL_DAYS = 28;
export const COUNCIL_INTERVAL_DAYS = 28;

export function simDay(tick: number): number {
  return Math.floor(Math.max(0, tick) / TICKS_PER_SIM_DAY);
}

export function nextGeneralDay(tick: number): number {
  const day = simDay(tick);
  if (day < FIRST_GENERAL_DAY) return FIRST_GENERAL_DAY;
  const since = day - FIRST_GENERAL_DAY;
  const steps = Math.ceil(since / GENERAL_INTERVAL_DAYS);
  const next = FIRST_GENERAL_DAY + steps * GENERAL_INTERVAL_DAYS;
  return next === day ? next + GENERAL_INTERVAL_DAYS : next;
}

export function calendarHud(tick: number) {
  return {
    mode: "PAPER" as const,
    provenance: "SIMULATED" as const,
    tick,
    day: simDay(tick),
    nextGeneralDay: nextGeneralDay(tick),
  };
}
