import { describe, expect, it } from "vitest";
import { buyAtIsland } from "./buy.ts";
import { createVisitor, createWorld } from "./sim.ts";

describe("PAPER buyAtIsland", () => {
  it("labels every fill PAPER / SIMULATED and is not a live exchange", () => {
    const world = createWorld(1);
    const visitor = createVisitor(10);
    const result = buyAtIsland(world, visitor, { island: "north", goodId: "corn", qty: 1 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mode).toBe("PAPER");
    expect(result.provenance).toBe("SIMULATED");
    expect(result.note).toMatch(/PAPER/);
    expect(result.note).toMatch(/Not a live exchange/);
    expect(result.island).toBe("north");
    expect(result.goodId).toBe("corn");
  });

  it("fills North at lastPrice and leaves lastPriceSouth alone", () => {
    const world = createWorld(1);
    world.lastPrice.corn = 0.4;
    world.lastPriceSouth.corn = 0.1;
    const visitor = createVisitor(10);
    const beforeNpc = world.npcCash;
    const beforeStock = world.npcStock.corn;
    const result = buyAtIsland(world, visitor, { island: "north", goodId: "corn", qty: 2 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.paid).toBeCloseTo(0.8, 4);
    expect(visitor.cash).toBeCloseTo(9.2, 4);
    expect(visitor.stock.corn).toBe(2);
    expect(world.npcCash).toBeCloseTo(beforeNpc + 0.8, 4);
    expect(world.npcStock.corn).toBeCloseTo(beforeStock - 2, 4);
    expect(world.lastPrice.corn).toBe(0.4);
    expect(world.lastPriceSouth.corn).toBe(0.1);
  });

  it("fills South at lastPriceSouth, not the North stall print", () => {
    const world = createWorld(1);
    world.lastPrice.ore = 9;
    world.lastPriceSouth.ore = 7;
    const visitor = createVisitor(20);
    const result = buyAtIsland(world, visitor, { island: "south", goodId: "ore", qty: 1 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.paid).toBeCloseTo(7, 4);
    expect(result.island).toBe("south");
    expect(visitor.cash).toBeCloseTo(13, 4);
    expect(visitor.stock.ore).toBe(1);
    expect(world.lastPrice.ore).toBe(9);
    expect(world.lastPriceSouth.ore).toBe(7);
  });

  it("rejects mixed or insufficient cash instead of selling stock to fund a buy", () => {
    const world = createWorld(1);
    world.lastPrice.corn = 0.5;
    const visitor = createVisitor(1);
    visitor.stock.corn = 80;
    const short = buyAtIsland(world, visitor, { island: "north", goodId: "corn", qty: 10 });
    expect(short.ok).toBe(false);
    if (short.ok) return;
    expect(short.reason).toBe("no_cash");
    expect(short.mode).toBe("PAPER");
    expect(visitor.cash).toBe(1);
    expect(visitor.stock.corn).toBe(80);

    visitor.cash = Number.NaN;
    const dirty = buyAtIsland(world, visitor, { island: "south", goodId: "corn", qty: 1 });
    expect(dirty.ok).toBe(false);
    if (dirty.ok) return;
    expect(dirty.reason).toBe("mixed_cash");
    expect(visitor.stock.corn).toBe(80);

    visitor.cash = -4;
    const negative = buyAtIsland(world, visitor, { island: "north", goodId: "corn", qty: 1 });
    expect(negative.ok).toBe(false);
    if (negative.ok) return;
    expect(negative.reason).toBe("mixed_cash");
  });

  it("rejects a second buy that would overdraw remaining cash", () => {
    const world = createWorld(1);
    world.lastPrice.ore = 8;
    world.lastPriceSouth.ore = 8;
    const visitor = createVisitor(10);
    expect(buyAtIsland(world, visitor, { island: "north", goodId: "ore", qty: 1 }).ok).toBe(true);
    const second = buyAtIsland(world, visitor, { island: "south", goodId: "ore", qty: 1 });
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.reason).toBe("no_cash");
    expect(visitor.stock.ore).toBe(1);
  });

  it("rejects unknown island, unknown good, and bad qty", () => {
    const world = createWorld(1);
    const visitor = createVisitor(10);
    const island = buyAtIsland(world, visitor, { island: "west", goodId: "corn", qty: 1 });
    expect(island.ok).toBe(false);
    if (island.ok) return;
    expect(island.reason).toBe("unknown_island");

    const good = buyAtIsland(world, visitor, { island: "north", goodId: "gold", qty: 1 });
    expect(good.ok).toBe(false);
    if (good.ok) return;
    expect(good.reason).toBe("unknown_good");

    const qty = buyAtIsland(world, visitor, { island: "south", goodId: "corn", qty: 0 });
    expect(qty.ok).toBe(false);
    if (qty.ok) return;
    expect(qty.reason).toBe("bad_qty");
  });
});
