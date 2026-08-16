import { describe, expect, it } from "vitest";
import { GOOD_IDS, GOODS } from "./goods.ts";
import { buyFromStall, createVisitor, createWorld, fastForward, hud } from "./sim.ts";

describe("headless sim step A", () => {
  it("runs an empty hour without NaN prices or a dead market", () => {
    const world = createWorld(42);
    fastForward(world, 3600);
    const h = hud(world);

    expect(world.tick).toBe(3600);
    expect(Number.isFinite(h.moneySupply)).toBe(true);
    expect(h.moneySupply).toBeCloseTo(50_000, 2);
    expect(h.faucet).toBe(0);
    expect(h.sink).toBe(0);
    expect(Number.isFinite(h.priceIndex)).toBe(true);
    expect(h.priceIndex).toBeGreaterThan(0.2);
    expect(h.priceIndex).toBeLessThan(5);
    expect(h.goodsProducedWindow).toBeGreaterThan(0);
    expect(h.tradeCount).toBeGreaterThan(100);
    expect(world.ledger.consumed).toBeGreaterThan(1000);
    expect(GOOD_IDS.some((id) => world.lastPrice[id] !== GOODS[id].fair0)).toBe(true);
  });

  it("is reproducible from a seed", () => {
    const a = createWorld(9);
    const b = createWorld(9);
    fastForward(a, 250);
    fastForward(b, 250);
    expect(hud(a)).toEqual(hud(b));
    expect(a.lastPrice).toEqual(b.lastPrice);
  });

  it("lets a paper visitor buy from the stall at lastPrice", () => {
    const world = createWorld(3);
    fastForward(world, 30);
    const visitor = createVisitor(1_000);
    const beforeNpc = world.npcCash;
    const beforeStock = world.npcStock.corn;
    const result = buyFromStall(world, visitor, "corn", 4);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(visitor.stock.corn).toBe(4);
    expect(visitor.cash).toBeCloseTo(1_000 - result.paid, 4);
    expect(world.npcCash).toBeCloseTo(beforeNpc + result.paid, 4);
    expect(world.npcStock.corn).toBeCloseTo(beforeStock - 4, 4);
  });
});
