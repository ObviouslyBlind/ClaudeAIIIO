import { describe, expect, it } from "vitest";
import { insertOrder } from "./books.ts";
import { cancelOrder } from "./cancelOrder.ts";
import { listOpenOrders, placeAsk, placeBid } from "./orders.ts";
import { createVisitor, createWorld } from "./sim.ts";

function seedAsk(
  world: ReturnType<typeof createWorld>,
  island: "north" | "south",
  good: "corn" | "ore",
  price: number,
  qty: number,
) {
  insertOrder(world.books[island][good], {
    id: world.nextOrderId++,
    good,
    side: "ask",
    price,
    qty,
  });
}

describe("PAPER cancelOrder", () => {
  it("labels every cancel PAPER / SIMULATED and is not a live exchange", () => {
    const world = createWorld(1);
    const visitor = createVisitor(10);
    const placed = placeBid(world, visitor, {
      island: "north",
      goodId: "corn",
      price: 0.25,
      qty: 4,
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    const result = cancelOrder(world, visitor, placed.order.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mode).toBe("PAPER");
    expect(result.provenance).toBe("SIMULATED");
    expect(result.note).toMatch(/PAPER/);
    expect(result.note).toMatch(/Not a live exchange/);
    expect(result.order.mode).toBe("PAPER");
    expect(result.order.provenance).toBe("SIMULATED");
  });

  it("refunds escrowed bid cash and drops the row from open orders", () => {
    const world = createWorld(1);
    const visitor = createVisitor(10);
    const placed = placeBid(world, visitor, {
      island: "south",
      goodId: "ore",
      price: 8,
      qty: 1,
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(visitor.cash).toBeCloseTo(2, 4);
    expect(listOpenOrders(visitor)).toHaveLength(1);

    const result = cancelOrder(world, visitor, placed.order.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.refunded.cash).toBeCloseTo(8, 4);
    expect(result.refunded.stock).toBe(0);
    expect(visitor.cash).toBeCloseTo(10, 4);
    expect(listOpenOrders(visitor)).toEqual([]);
  });

  it("refunds escrowed ask stock and drops the row from open orders", () => {
    const world = createWorld(1);
    const visitor = createVisitor(20);
    visitor.stock.corn = 2;
    const placed = placeAsk(world, visitor, {
      island: "north",
      goodId: "corn",
      price: 0.3,
      qty: 2,
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(visitor.stock.corn).toBe(0);
    expect(listOpenOrders(visitor)).toHaveLength(1);

    const result = cancelOrder(world, visitor, placed.order.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.refunded.stock).toBeCloseTo(2, 4);
    expect(result.refunded.cash).toBe(0);
    expect(visitor.stock.corn).toBeCloseTo(2, 4);
    expect(visitor.cash).toBe(20);
    expect(listOpenOrders(visitor)).toEqual([]);
  });

  it("refunds only remaining bid escrow after a partial fill", () => {
    const world = createWorld(1);
    const visitor = createVisitor(10);
    seedAsk(world, "north", "corn", 0.25, 2);
    const placed = placeBid(world, visitor, {
      island: "north",
      goodId: "corn",
      price: 0.4,
      qty: 5,
    });
    expect(placed.ok).toBe(true);
    expect(visitor.stock.corn).toBe(2);
    expect(listOpenOrders(visitor)[0]?.qty).toBe(3);
    const cashAfterFill = visitor.cash;

    const result = cancelOrder(world, visitor, listOpenOrders(visitor)[0]!.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.refunded.cash).toBeCloseTo(1.2, 4);
    expect(visitor.cash).toBeCloseTo(cashAfterFill + 1.2, 4);
    expect(visitor.stock.corn).toBe(2);
    expect(listOpenOrders(visitor)).toEqual([]);
  });

  it("rejects a missing id and leaves cash/stock alone", () => {
    const world = createWorld(1);
    const visitor = createVisitor(10);
    visitor.stock.ore = 1;
    const missing = cancelOrder(world, visitor, 99);
    expect(missing.ok).toBe(false);
    if (missing.ok) return;
    expect(missing.reason).toBe("missing");
    expect(missing.mode).toBe("PAPER");
    expect(visitor.cash).toBe(10);
    expect(visitor.stock.ore).toBe(1);

    const bad = cancelOrder(world, visitor, "nope");
    expect(bad.ok).toBe(false);
    if (bad.ok) return;
    expect(bad.reason).toBe("missing");
  });

  it("rejects not-owner and does not refund the owner's escrow", () => {
    const world = createWorld(1);
    const owner = createVisitor(10);
    const other = createVisitor(50);
    const placed = placeBid(world, owner, {
      island: "north",
      goodId: "corn",
      price: 4,
      qty: 1,
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(owner.cash).toBeCloseTo(6, 4);

    const result = cancelOrder(world, other, placed.order.id);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("not-owner");
    expect(result.mode).toBe("PAPER");
    expect(owner.cash).toBeCloseTo(6, 4);
    expect(other.cash).toBe(50);
    expect(listOpenOrders(owner)).toHaveLength(1);
    expect(listOpenOrders(other)).toEqual([]);
  });

  it("treats a second cancel of the same id as missing", () => {
    const world = createWorld(1);
    const visitor = createVisitor(10);
    const placed = placeBid(world, visitor, {
      island: "north",
      goodId: "corn",
      price: 1,
      qty: 1,
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(cancelOrder(world, visitor, placed.order.id).ok).toBe(true);
    const again = cancelOrder(world, visitor, placed.order.id);
    expect(again.ok).toBe(false);
    if (again.ok) return;
    expect(again.reason).toBe("missing");
    expect(visitor.cash).toBeCloseTo(10, 4);
  });
});
