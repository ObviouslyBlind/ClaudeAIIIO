import { describe, expect, it } from "vitest";
import { TICKS_PER_SIM_DAY } from "../src/calendar.ts";
import { createVisitor, createWorld, hud, tick } from "../src/sim.ts";
import {
  UPKEEP_NOTE,
  UPKEEP_PER_DAY,
  tickUpkeep,
  type UpkeepLand,
  type UpkeepPlot,
  type UpkeepWorld,
} from "../src/upkeep.ts";

function plot(owner: string | null, id = "plot-1", extra: Partial<UpkeepPlot> = {}): UpkeepPlot {
  return { id, owner, use: extra.use ?? null, unpaid: extra.unpaid, ...extra };
}

function board(...plots: UpkeepPlot[]): UpkeepLand {
  return { plots };
}

function paperWorld(tickCount = TICKS_PER_SIM_DAY, sink = 0): UpkeepWorld {
  return { tick: tickCount, ledger: { sink } };
}

describe("PAPER daily land upkeep sink", () => {
  it("charges visitor.cash and ledger.sink on a leased plot each sim day", () => {
    const world = paperWorld();
    const visitor = { cash: 20 };
    const leased = plot("visitor");
    tickUpkeep(world, visitor, board(leased));
    expect(visitor.cash).toBeCloseTo(20 - UPKEEP_PER_DAY, 4);
    expect(world.ledger?.sink).toBeCloseTo(UPKEEP_PER_DAY, 4);
    expect(leased.unpaid).toBe(false);
    expect(leased.owner).toBe("visitor");
  });

  it("writes world.hud.sink when that field exists", () => {
    const world: UpkeepWorld = {
      tick: TICKS_PER_SIM_DAY,
      hud: { sink: 2 },
    };
    const visitor = { cash: 10 };
    tickUpkeep(world, visitor, board(plot("visitor")));
    expect(world.hud?.sink).toBeCloseTo(2 + UPKEEP_PER_DAY, 4);
    expect(world.ledger).toBeUndefined();
  });

  it("writes both hud.sink and ledger.sink when both fields exist", () => {
    const world: UpkeepWorld = {
      tick: TICKS_PER_SIM_DAY,
      ledger: { sink: 1 },
      hud: { sink: 4 },
    };
    const visitor = { cash: 10 };
    tickUpkeep(world, visitor, board(plot("visitor")));
    expect(world.ledger?.sink).toBeCloseTo(1 + UPKEEP_PER_DAY, 4);
    expect(world.hud?.sink).toBeCloseTo(4 + UPKEEP_PER_DAY, 4);
  });

  it("skips vacant unleased lots and NPC lots", () => {
    const world = paperWorld();
    const visitor = { cash: 20 };
    const vacant = plot(null, "vacant");
    const npc = plot("npc", "npc-farm", { use: "farm" });
    tickUpkeep(world, visitor, board(vacant, npc));
    expect(visitor.cash).toBe(20);
    expect(world.ledger?.sink).toBe(0);
    expect(vacant.unpaid).toBeUndefined();
    expect(npc.unpaid).toBeUndefined();
    expect(npc.owner).toBe("npc");
  });

  it("still charges a leased vacant lot (owned, no building)", () => {
    const world = paperWorld();
    const visitor = { cash: 20 };
    const leasedVacant = plot("visitor", "empty-lease", { use: null });
    tickUpkeep(world, visitor, board(leasedVacant));
    expect(visitor.cash).toBeCloseTo(20 - UPKEEP_PER_DAY, 4);
    expect(world.ledger?.sink).toBeCloseTo(UPKEEP_PER_DAY, 4);
  });

  it("marks unpaid and does not steal leftover cash when the visitor is short", () => {
    const world = paperWorld();
    const visitor = { cash: UPKEEP_PER_DAY - 0.25 };
    const leased = plot("visitor");
    tickUpkeep(world, visitor, board(leased));
    expect(visitor.cash).toBe(UPKEEP_PER_DAY - 0.25);
    expect(world.ledger?.sink).toBe(0);
    expect(leased.unpaid).toBe(true);
    expect(leased.owner).toBe("visitor");
  });

  it("does not evict an unpaid lease in v1", () => {
    const world = paperWorld();
    const visitor = { cash: 0 };
    const leased = plot("visitor", "keep-me", { use: "house" });
    tickUpkeep(world, visitor, board(leased));
    expect(leased.owner).toBe("visitor");
    expect(leased.use).toBe("house");
    expect(leased.unpaid).toBe(true);
  });

  it("pays one plot and marks the next unpaid when cash covers only the first", () => {
    const world = paperWorld();
    const visitor = { cash: UPKEEP_PER_DAY };
    const a = plot("visitor", "a");
    const b = plot("visitor", "b");
    tickUpkeep(world, visitor, board(a, b));
    expect(visitor.cash).toBeCloseTo(0, 4);
    expect(world.ledger?.sink).toBeCloseTo(UPKEEP_PER_DAY, 4);
    expect(a.unpaid).toBe(false);
    expect(b.unpaid).toBe(true);
    expect(b.owner).toBe("visitor");
  });

  it("clears unpaid on a later payday once cash covers the day", () => {
    const world = paperWorld();
    const visitor = { cash: 0 };
    const leased = plot("visitor");
    tickUpkeep(world, visitor, board(leased));
    expect(leased.unpaid).toBe(true);

    visitor.cash = 10;
    world.tick = TICKS_PER_SIM_DAY * 2;
    tickUpkeep(world, visitor, board(leased));
    expect(leased.unpaid).toBe(false);
    expect(visitor.cash).toBeCloseTo(10 - UPKEEP_PER_DAY, 4);
    expect(leased.owner).toBe("visitor");
  });

  it("does nothing off the sim-day boundary", () => {
    const world = paperWorld(TICKS_PER_SIM_DAY - 1);
    const visitor = { cash: 20 };
    const leased = plot("visitor");
    tickUpkeep(world, visitor, board(leased));
    expect(visitor.cash).toBe(20);
    expect(world.ledger?.sink).toBe(0);
    expect(leased.unpaid).toBeUndefined();
  });

  it("labels the sink PAPER / SIMULATED", () => {
    expect(UPKEEP_NOTE).toMatch(/PAPER/);
    expect(UPKEEP_NOTE).toMatch(/SIMULATED/);
  });

  it("ticks upkeep from sim.tick when land is passed", () => {
    const world = createWorld(2);
    const visitor = createVisitor(1_000);
    const leased = plot("visitor");
    const land = board(leased);
    world.tick = TICKS_PER_SIM_DAY - 1;
    const cash = visitor.cash;
    const sink = hud(world).sink;
    tick(world, visitor, land);
    expect(world.tick).toBe(TICKS_PER_SIM_DAY);
    expect(visitor.cash).toBeCloseTo(cash - UPKEEP_PER_DAY, 4);
    expect(hud(world).sink).toBeGreaterThanOrEqual(sink + UPKEEP_PER_DAY);
    expect(leased.unpaid).toBe(false);
  });
});
