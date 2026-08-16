import { describe, expect, it } from "vitest";
import { TICKS_PER_SIM_DAY } from "../src/calendar.ts";
import { createVisitor, createWorld, hud, tick } from "../src/sim.ts";
import {
  GOOD_FOR_USE,
  MAX_STAFF_PER_PLOT,
  STAFF_NOTE,
  STAFF_OUTPUT,
  STAFF_WAGE,
  fireStaff,
  hireStaff,
  staffSnapshot,
  tickStaff,
  type StaffablePlot,
} from "../src/staff.ts";

function plot(use: string | null, owner = "visitor", id = "plot-1"): StaffablePlot {
  return { id, owner, use };
}

describe("PAPER staff slots on developed plots", () => {
  it("hires PAPER AI staff on a developed visitor farm", () => {
    const visitor = createVisitor(1_000);
    const result = hireStaff(visitor, plot("farm"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.slot.mode).toBe("PAPER");
    expect(result.slot.provenance).toBe("SIMULATED");
    expect(result.slot.good).toBe("corn");
    expect(result.slot.wage).toBe(STAFF_WAGE);
    expect(visitor.staffSlots).toHaveLength(1);
    expect(GOOD_FOR_USE.farm).toBe("corn");
  });

  it("caps at two staff per plot", () => {
    const visitor = createVisitor(1_000);
    const farm = plot("farm");
    expect(hireStaff(visitor, farm).ok).toBe(true);
    expect(hireStaff(visitor, farm).ok).toBe(true);
    const third = hireStaff(visitor, farm);
    expect(third.ok).toBe(false);
    if (third.ok) return;
    expect(third.reason).toBe("cap");
    expect(visitor.staffSlots).toHaveLength(MAX_STAFF_PER_PLOT);
  });

  it("rejects hire when PAPER cash is too low", () => {
    const visitor = createVisitor(STAFF_WAGE - 1);
    const result = hireStaff(visitor, plot("farm"));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("no_cash");
    expect(visitor.staffSlots).toHaveLength(0);
    expect(visitor.cash).toBe(STAFF_WAGE - 1);
  });

  it("rejects undeveloped or foreign plots", () => {
    const visitor = createVisitor(1_000);
    const vacant = hireStaff(visitor, plot(null));
    expect(vacant.ok).toBe(false);
    if (!vacant.ok) expect(vacant.reason).toBe("not_developed");

    const foreign = hireStaff(visitor, plot("farm", "npc"));
    expect(foreign.ok).toBe(false);
    if (!foreign.ok) expect(foreign.reason).toBe("not_yours");
  });

  it("fires one slot and leaves the other", () => {
    const visitor = createVisitor(1_000);
    const farm = plot("farm");
    hireStaff(visitor, farm);
    hireStaff(visitor, farm);
    const fired = fireStaff(visitor, farm.id);
    expect(fired.ok).toBe(true);
    expect(visitor.staffSlots).toHaveLength(1);
    const empty = fireStaff(visitor, "missing");
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.reason).toBe("no_staff");
  });

  it("pays a wage each sim day and adds matching food on a farm", () => {
    const world = createWorld(1);
    const visitor = createVisitor(1_000);
    expect(hireStaff(visitor, plot("farm")).ok).toBe(true);
    const cash = visitor.cash;
    const corn = visitor.goods.corn;

    world.tick = 1;
    tickStaff(world, visitor);
    expect(visitor.cash).toBe(cash);
    expect(visitor.goods.corn).toBe(corn);

    world.tick = TICKS_PER_SIM_DAY;
    tickStaff(world, visitor);
    expect(visitor.cash).toBeCloseTo(cash - STAFF_WAGE, 4);
    expect(visitor.goods.corn).toBeCloseTo(corn + STAFF_OUTPUT, 4);
  });

  it("adds factory output as tools, not food", () => {
    const world = createWorld(1);
    const visitor = createVisitor(1_000);
    expect(hireStaff(visitor, plot("factory", "visitor", "mill-1")).ok).toBe(true);
    world.tick = TICKS_PER_SIM_DAY;
    tickStaff(world, visitor);
    expect(visitor.goods.tools).toBe(STAFF_OUTPUT);
    expect(visitor.goods.corn).toBe(0);
    expect(GOOD_FOR_USE.factory).toBe("tools");
  });

  it("snapshots staffSlots as PAPER / SIMULATED", () => {
    const visitor = createVisitor(1_000);
    hireStaff(visitor, plot("farm"));
    const snap = staffSnapshot(visitor);
    expect(snap.mode).toBe("PAPER");
    expect(snap.provenance).toBe("SIMULATED");
    expect(snap.note).toBe(STAFF_NOTE);
    expect(snap.note).toMatch(/PAPER/);
    expect(snap.staffSlots).toHaveLength(1);
    expect(snap.staffSlots[0]!.mode).toBe("PAPER");
  });

  it("ticks staff from sim.tick and exposes staffSlots on the hud snapshot", () => {
    const world = createWorld(2);
    const visitor = createVisitor(1_000);
    hireStaff(visitor, plot("farm"));
    world.tick = TICKS_PER_SIM_DAY - 1;
    const cash = visitor.cash;
    tick(world, visitor);
    expect(world.tick).toBe(TICKS_PER_SIM_DAY);
    expect(visitor.cash).toBeCloseTo(cash - STAFF_WAGE, 4);
    expect(visitor.goods.corn).toBe(STAFF_OUTPUT);
    expect(hud(world, visitor).staffSlots).toHaveLength(1);
    expect(hud(world, visitor).staffSlots[0]!.mode).toBe("PAPER");
  });
});
