import { describe, expect, it } from "vitest";
import { insertOrder } from "../src/books.ts";
import {
  listOpenOrders,
  matchVisitorOrders,
  placeAsk,
  placeBid,
} from "../src/orders.ts";
import { createVisitor, createWorld, tick } from "../src/sim.ts";

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

function seedBid(
  world: ReturnType<typeof createWorld>,
  island: "north" | "south",
  good: "corn" | "ore",
  price: number,
  qty: number,
) {
  insertOrder(world.books[island][good], {
    id: world.nextOrderId++,
    good,
    side: "bid",
    price,
    qty,
  });
}

describe("PAPER visitor orders vs NPC books", () => {
  it("labels every place/match PAPER / SIMULATED and is not a live exchange", () => {
    const world = createWorld(1);
    const visitor = createVisitor(50);
    const placed = placeBid(world, visitor, {
      island: "north",
      goodId: "corn",
      price: 0.25,
      qty: 4,
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(placed.mode).toBe("PAPER");
    expect(placed.provenance).toBe("SIMULATED");
    expect(placed.note).toMatch(/PAPER/);
    expect(placed.note).toMatch(/Not a live exchange/);
    expect(placed.order.mode).toBe("PAPER");
    expect(placed.order.provenance).toBe("SIMULATED");
    const report = matchVisitorOrders(world);
    expect(report.mode).toBe("PAPER");
    expect(report.provenance).toBe("SIMULATED");
    expect(listOpenOrders(visitor).every((row) => row.mode === "PAPER")).toBe(true);
  });

  it("escrows bid cash and lists the resting PAPER order", () => {
    const world = createWorld(1);
    const visitor = createVisitor(10);
    const placed = placeBid(world, visitor, {
      island: "south",
      goodId: "ore",
      price: 8,
      qty: 1,
    });
    expect(placed.ok).toBe(true);
    expect(visitor.cash).toBeCloseTo(2, 4);
    const open = listOpenOrders(visitor);
    expect(open).toHaveLength(1);
    expect(open[0]?.side).toBe("bid");
    expect(open[0]?.island).toBe("south");
    expect(open[0]?.goodId).toBe("ore");
    expect(open[0]?.qty).toBe(1);
  });

  it("rejects mixed or insufficient cash instead of selling stock to fund a bid", () => {
    const world = createWorld(1);
    const visitor = createVisitor(1);
    visitor.stock.corn = 80;
    const mixed = placeBid(world, visitor, {
      island: "north",
      goodId: "corn",
      price: 0.5,
      qty: 10,
    });
    expect(mixed.ok).toBe(false);
    if (mixed.ok) return;
    expect(mixed.reason).toBe("no_cash");
    expect(mixed.mode).toBe("PAPER");
    expect(visitor.cash).toBe(1);
    expect(visitor.stock.corn).toBe(80);
    expect(listOpenOrders(visitor)).toEqual([]);

    visitor.cash = Number.NaN;
    const dirty = placeBid(world, visitor, {
      island: "north",
      goodId: "corn",
      price: 0.25,
      qty: 1,
    });
    expect(dirty.ok).toBe(false);
    if (dirty.ok) return;
    expect(dirty.reason).toBe("mixed_cash");
  });

  it("rejects a second bid that would overdraw remaining cash", () => {
    const world = createWorld(1);
    const visitor = createVisitor(10);
    expect(
      placeBid(world, visitor, { island: "north", goodId: "corn", price: 6, qty: 1 }).ok,
    ).toBe(true);
    const second = placeBid(world, visitor, {
      island: "south",
      goodId: "corn",
      price: 6,
      qty: 1,
    });
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.reason).toBe("no_cash");
    expect(listOpenOrders(visitor)).toHaveLength(1);
  });

  it("escrows ask stock and rejects an ask without inventory", () => {
    const world = createWorld(1);
    const visitor = createVisitor(20);
    const empty = placeAsk(world, visitor, {
      island: "north",
      goodId: "corn",
      price: 0.3,
      qty: 2,
    });
    expect(empty.ok).toBe(false);
    if (empty.ok) return;
    expect(empty.reason).toBe("no_stock");

    visitor.stock.corn = 2;
    const placed = placeAsk(world, visitor, {
      island: "north",
      goodId: "corn",
      price: 0.3,
      qty: 2,
    });
    expect(placed.ok).toBe(true);
    expect(visitor.stock.corn).toBe(0);
    expect(listOpenOrders(visitor)[0]?.side).toBe("ask");
  });

  it("fills a visitor bid against an NPC ask on that island and refunds the spread", () => {
    const world = createWorld(1);
    const visitor = createVisitor(10);
    seedAsk(world, "north", "corn", 0.2, 4);
    const placed = placeBid(world, visitor, {
      island: "north",
      goodId: "corn",
      price: 0.5,
      qty: 4,
    });
    expect(placed.ok).toBe(true);
    expect(visitor.stock.corn).toBe(4);
    expect(visitor.cash).toBeCloseTo(10 - 0.8, 4);
    expect(world.lastPrice.corn).toBe(0.2);
    expect(listOpenOrders(visitor)).toEqual([]);
  });

  it("fills a visitor ask against an NPC bid and credits PAPER cash", () => {
    const world = createWorld(1);
    const visitor = createVisitor(0);
    visitor.stock.ore = 2;
    seedBid(world, "south", "ore", 9, 2);
    const placed = placeAsk(world, visitor, {
      island: "south",
      goodId: "ore",
      price: 8,
      qty: 2,
    });
    expect(placed.ok).toBe(true);
    expect(visitor.stock.ore).toBe(0);
    expect(visitor.cash).toBeCloseTo(16, 4);
    expect(world.lastPriceSouth.ore).toBe(8);
    expect(listOpenOrders(visitor)).toEqual([]);
  });

  it("does not let a North order take South book liquidity", () => {
    const world = createWorld(1);
    const visitor = createVisitor(20);
    seedAsk(world, "south", "corn", 0.1, 8);
    const placed = placeBid(world, visitor, {
      island: "north",
      goodId: "corn",
      price: 1,
      qty: 8,
    });
    expect(placed.ok).toBe(true);
    expect(visitor.stock.corn).toBe(0);
    expect(listOpenOrders(visitor)).toHaveLength(1);
    expect(world.books.south.corn.asks[0]?.qty).toBe(8);
  });

  it("partial-fills and leaves the rest open until matchVisitorOrders", () => {
    const world = createWorld(1);
    const visitor = createVisitor(10);
    seedAsk(world, "north", "corn", 0.25, 2);
    placeBid(world, visitor, {
      island: "north",
      goodId: "corn",
      price: 0.4,
      qty: 5,
    });
    expect(visitor.stock.corn).toBe(2);
    expect(listOpenOrders(visitor)[0]?.qty).toBe(3);

    seedAsk(world, "north", "corn", 0.3, 3);
    const report = matchVisitorOrders(world);
    expect(report.mode).toBe("PAPER");
    expect(report.fills).toBeGreaterThan(0);
    expect(visitor.stock.corn).toBe(5);
    expect(listOpenOrders(visitor)).toEqual([]);
  });

  it("lets sim tick match a resting PAPER bid against a fresh NPC quote", () => {
    const world = createWorld(3);
    const visitor = createVisitor(100);
    const placed = placeBid(world, visitor, {
      island: "north",
      goodId: "corn",
      price: 50,
      qty: 1,
    });
    expect(placed.ok).toBe(true);
    expect(listOpenOrders(visitor)).toHaveLength(1);
    tick(world);
    expect(visitor.stock.corn).toBe(1);
    expect(listOpenOrders(visitor)).toEqual([]);
  });

  it("rejects unknown island, unknown good, and non-positive size", () => {
    const world = createWorld(1);
    const visitor = createVisitor(50);
    expect(
      placeBid(world, visitor, {
        island: "east" as "north",
        goodId: "corn",
        price: 1,
        qty: 1,
      }).ok,
    ).toBe(false);
    expect(
      placeAsk(world, visitor, {
        island: "north",
        goodId: "gold" as "corn",
        price: 1,
        qty: 1,
      }).ok,
    ).toBe(false);
    expect(
      placeBid(world, visitor, { island: "north", goodId: "corn", price: 0, qty: 1 }).ok,
    ).toBe(false);
    expect(
      placeBid(world, visitor, { island: "north", goodId: "corn", price: 1, qty: -2 }).ok,
    ).toBe(false);
    expect(listOpenOrders(visitor)).toEqual([]);
  });
});
