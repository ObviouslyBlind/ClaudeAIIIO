import { describe, expect, it } from "vitest";
import { sellAtIsland } from "./sell.ts";
import { createVisitor, createWorld } from "./sim.ts";
import type { GoodId } from "./goods.ts";

describe("PAPER sellAtIsland", () => {
  it("labels every fill PAPER / SIMULATED and is not a live exchange", () => {
    const world = createWorld(1);
    const visitor = createVisitor(10);
    visitor.stock.corn = 2;
    const result = sellAtIsland(world, visitor, { island: "north", goodId: "corn", qty: 1 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mode).toBe("PAPER");
    expect(result.provenance).toBe("SIMULATED");
    expect(result.note).toMatch(/PAPER/);
    expect(result.note).toMatch(/Not a live exchange/);
    expect(result.island).toBe("north");
    expect(result.goodId).toBe("corn");
  });

  it("fills North at lastPrice, credits cash, and leaves lastPriceSouth alone", () => {
    const world = createWorld(1);
    world.lastPrice.corn = 0.4;
    world.lastPriceSouth.corn = 0.1;
    const visitor = createVisitor(10);
    visitor.stock.corn = 5;
    const beforeNpc = world.npcCash;
    const beforeStock = world.npcStock.corn;
    const result = sellAtIsland(world, visitor, { island: "north", goodId: "corn", qty: 2 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.paid).toBeCloseTo(0.8, 4);
    expect(visitor.cash).toBeCloseTo(10.8, 4);
    expect(visitor.stock.corn).toBe(3);
    expect(visitor.goods.corn).toBe(3);
    expect(world.npcCash).toBeCloseTo(beforeNpc - 0.8, 4);
    expect(world.npcStock.corn).toBeCloseTo(beforeStock + 2, 4);
    expect(world.lastPrice.corn).toBe(0.4);
    expect(world.lastPriceSouth.corn).toBe(0.1);
  });

  it("fills South at lastPriceSouth, not the North stall print", () => {
    const world = createWorld(1);
    world.lastPrice.ore = 9;
    world.lastPriceSouth.ore = 7;
    const visitor = createVisitor(20);
    visitor.stock.ore = 2;
    const result = sellAtIsland(world, visitor, { island: "south", goodId: "ore", qty: 1 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.paid).toBeCloseTo(7, 4);
    expect(result.island).toBe("south");
    expect(visitor.cash).toBeCloseTo(27, 4);
    expect(visitor.stock.ore).toBe(1);
    expect(world.lastPrice.ore).toBe(9);
    expect(world.lastPriceSouth.ore).toBe(7);
  });

  it("sells from visitor.goods when that bag is aliased to stock", () => {
    const world = createWorld(1);
    world.lastPrice.beans = 0.5;
    const visitor = createVisitor(1);
    visitor.goods.beans = 4;
    const result = sellAtIsland(world, visitor, { island: "north", goodId: "beans", qty: 3 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.paid).toBeCloseTo(1.5, 4);
    expect(visitor.cash).toBeCloseTo(2.5, 4);
    expect(visitor.goods.beans).toBe(1);
    expect(visitor.stock.beans).toBe(1);
  });

  it("rejects no stock and mixed bags instead of inventing inventory", () => {
    const world = createWorld(1);
    world.lastPrice.corn = 0.5;
    const visitor = createVisitor(1);
    const empty = sellAtIsland(world, visitor, { island: "north", goodId: "corn", qty: 1 });
    expect(empty.ok).toBe(false);
    if (empty.ok) return;
    expect(empty.reason).toBe("no_stock");
    expect(empty.mode).toBe("PAPER");
    expect(visitor.cash).toBe(1);
    expect(visitor.stock.corn).toBe(0);

    visitor.stock.corn = 2;
    const short = sellAtIsland(world, visitor, { island: "south", goodId: "corn", qty: 10 });
    expect(short.ok).toBe(false);
    if (short.ok) return;
    expect(short.reason).toBe("no_stock");
    expect(visitor.stock.corn).toBe(2);
    expect(visitor.cash).toBe(1);

    visitor.stock.corn = Number.NaN;
    const dirty = sellAtIsland(world, visitor, { island: "north", goodId: "corn", qty: 1 });
    expect(dirty.ok).toBe(false);
    if (dirty.ok) return;
    expect(dirty.reason).toBe("mixed");
    expect(visitor.cash).toBe(1);

    visitor.stock.corn = -4;
    const negative = sellAtIsland(world, visitor, { island: "south", goodId: "corn", qty: 1 });
    expect(negative.ok).toBe(false);
    if (negative.ok) return;
    expect(negative.reason).toBe("mixed");

    visitor.stock.corn = 5;
    const splitGoods: Record<GoodId, number> = { ...visitor.stock, corn: 3 };
    visitor.goods = splitGoods;
    const mixed = sellAtIsland(world, visitor, { island: "north", goodId: "corn", qty: 1 });
    expect(mixed.ok).toBe(false);
    if (mixed.ok) return;
    expect(mixed.reason).toBe("mixed");
    expect(visitor.stock.corn).toBe(5);
    expect(visitor.goods.corn).toBe(3);
    expect(visitor.cash).toBe(1);
  });

  it("rejects a second sell that would overdraw remaining stock", () => {
    const world = createWorld(1);
    world.lastPrice.ore = 8;
    world.lastPriceSouth.ore = 8;
    const visitor = createVisitor(10);
    visitor.stock.ore = 1;
    expect(sellAtIsland(world, visitor, { island: "north", goodId: "ore", qty: 1 }).ok).toBe(true);
    const second = sellAtIsland(world, visitor, { island: "south", goodId: "ore", qty: 1 });
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.reason).toBe("no_stock");
    expect(visitor.stock.ore).toBe(0);
    expect(visitor.cash).toBe(18);
  });

  it("rejects unknown island, unknown good, and bad qty", () => {
    const world = createWorld(1);
    const visitor = createVisitor(10);
    visitor.stock.corn = 4;
    const island = sellAtIsland(world, visitor, { island: "west", goodId: "corn", qty: 1 });
    expect(island.ok).toBe(false);
    if (island.ok) return;
    expect(island.reason).toBe("unknown_island");

    const good = sellAtIsland(world, visitor, { island: "north", goodId: "gold", qty: 1 });
    expect(good.ok).toBe(false);
    if (good.ok) return;
    expect(good.reason).toBe("unknown_good");

    const qty = sellAtIsland(world, visitor, { island: "south", goodId: "corn", qty: 0 });
    expect(qty.ok).toBe(false);
    if (qty.ok) return;
    expect(qty.reason).toBe("bad_qty");
    expect(visitor.stock.corn).toBe(4);
  });
});
