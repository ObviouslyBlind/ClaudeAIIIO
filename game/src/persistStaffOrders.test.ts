import { describe, expect, it } from "vitest";
import { insertOrder } from "./books.ts";
import { createLandBoard, getPlot, leasePlot } from "./land.ts";
import { listOpenOrders, matchVisitorOrders, placeAsk, placeBid } from "./orders.ts";
import { restoreShard, serializeShard } from "./persist.ts";
import {
  applyVisitorOrders,
  dumpStaffSlots,
  dumpVisitorOrders,
  restoreStaffSlots,
  restoreVisitorOrders,
} from "./persistStaffOrders.ts";
import { createVisitor, createWorld } from "./sim.ts";
import { hireStaff, type StaffablePlot } from "./staff.ts";
import { addLine } from "./visitorCart.ts";

function farm(id = "plot-1"): StaffablePlot {
  return { id, owner: "visitor", use: "farm" };
}

function cheapVacant(land: ReturnType<typeof createLandBoard>, cash: number) {
  return land.plots
    .filter((p) => !p.owner && p.class === "by_right" && p.price + 40 <= cash)
    .sort((a, b) => a.price - b.price)[0]!;
}

describe("PAPER staffSlots + open visitorOrders persist", () => {
  it("dumps and restores PAPER staff slots; junk and missing become empty", () => {
    const visitor = createVisitor(1_000);
    expect(hireStaff(visitor, farm()).ok).toBe(true);

    const blob = JSON.parse(JSON.stringify(dumpStaffSlots(visitor.staffSlots)));
    expect(blob).toHaveLength(1);
    expect(blob[0]!.mode).toBe("PAPER");
    expect(blob[0]!.provenance).toBe("SIMULATED");
    expect(blob[0]!.plotId).toBe("plot-1");
    expect(blob[0]!.good).toBe("corn");

    const restored = restoreStaffSlots(blob);
    expect(restored).toEqual(visitor.staffSlots);
    expect(restoreStaffSlots(undefined)).toEqual([]);
    expect(restoreStaffSlots([{ plotId: "x" }])).toEqual([]);
    expect(restoreStaffSlots("nope")).toEqual([]);
  });

  it("dumps open PAPER visitorOrders and skips filled or junk rows", () => {
    const world = createWorld(1);
    const visitor = createVisitor(20);
    expect(
      placeBid(world, visitor, { island: "south", goodId: "ore", price: 8, qty: 1 }).ok,
    ).toBe(true);
    const open = dumpVisitorOrders(visitor);
    expect(open).toHaveLength(1);
    expect(open[0]!.mode).toBe("PAPER");
    expect(open[0]!.provenance).toBe("SIMULATED");
    expect(open[0]!.side).toBe("bid");
    expect(open[0]!.qty).toBe(1);

    expect(restoreVisitorOrders(undefined)).toEqual([]);
    expect(restoreVisitorOrders([{ id: 1, side: "bid" }])).toEqual([]);
    expect(restoreVisitorOrders([{ ...open[0], qty: 0 }])).toEqual([]);
  });

  it("round-trips staffSlots and open visitorOrders on the PAPER shard dump/restore", () => {
    const world = createWorld(3);
    const land = createLandBoard();
    const visitor = createVisitor(1_000);
    const vacant = cheapVacant(land, visitor.cash);
    expect(leasePlot(land, visitor, vacant.id).ok).toBe(true);
    expect(hireStaff(visitor, farm(vacant.id)).ok).toBe(true);
    expect(addLine(visitor, "potato", 2).ok).toBe(true);
    visitor.stock.corn = 3;
    expect(
      placeAsk(world, visitor, { island: "north", goodId: "corn", price: 4, qty: 2 }).ok,
    ).toBe(true);
    expect(
      placeBid(world, visitor, { island: "south", goodId: "ore", price: 1, qty: 1 }).ok,
    ).toBe(true);
    const cash = visitor.cash;

    const blob = serializeShard({ world, land, visitor });
    const json = JSON.parse(JSON.stringify(blob));
    expect(json.mode).toBe("PAPER");
    expect(json.provenance).toBe("SIMULATED");
    expect(json.visitor.staffSlots).toHaveLength(1);
    expect(json.visitor.staffSlots[0]!.mode).toBe("PAPER");
    expect(json.visitor.visitorOrders).toHaveLength(2);
    expect(json.visitor.visitorOrders.every((row: { mode: string }) => row.mode === "PAPER")).toBe(
      true,
    );
    expect(json.visitor.leases).toEqual([vacant.id]);
    expect(json.visitor.cart).toEqual([{ goodId: "potato", qty: 2 }]);

    const restored = restoreShard(json);
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.visitor.cash).toBe(cash);
    expect(restored.visitor.staffSlots).toHaveLength(1);
    expect(restored.visitor.staffSlots[0]!.plotId).toBe(vacant.id);
    expect(restored.visitor.staffSlots[0]!.mode).toBe("PAPER");
    expect(restored.visitor.staffSlots[0]!.provenance).toBe("SIMULATED");
    expect(getPlot(restored.land, vacant.id)?.owner).toBe("visitor");
    expect(listOpenOrders(restored.visitor)).toHaveLength(2);
    expect(listOpenOrders(restored.visitor).map((row) => row.side).sort()).toEqual(["ask", "bid"]);
  });

  it("does not evict a lease when restoring staff and orders", () => {
    const world = createWorld(9);
    const land = createLandBoard();
    const visitor = createVisitor(1_000);
    const vacant = cheapVacant(land, visitor.cash);
    expect(leasePlot(land, visitor, vacant.id).ok).toBe(true);
    hireStaff(visitor, farm(vacant.id));
    placeBid(world, visitor, { island: "north", goodId: "corn", price: 0.05, qty: 1 });

    const restored = restoreShard(serializeShard({ world, land, visitor }));
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(getPlot(restored.land, vacant.id)?.owner).toBe("visitor");
    expect(restored.land.plots.filter((p) => p.owner === "visitor")).toHaveLength(1);
  });

  it("lets a restored resting bid still match NPC books", () => {
    const world = createWorld(1);
    const land = createLandBoard();
    const visitor = createVisitor(10);
    expect(
      placeBid(world, visitor, { island: "north", goodId: "corn", price: 0.5, qty: 4 }).ok,
    ).toBe(true);
    expect(listOpenOrders(visitor)).toHaveLength(1);

    const restored = restoreShard(serializeShard({ world, land, visitor }));
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(listOpenOrders(restored.visitor)).toHaveLength(1);
    expect(restored.visitor.cash).toBeCloseTo(8, 4);

    insertOrder(restored.world.books.north.corn, {
      id: restored.world.nextOrderId++,
      good: "corn",
      side: "ask",
      price: 0.2,
      qty: 4,
    });
    const report = matchVisitorOrders(restored.world);
    expect(report.mode).toBe("PAPER");
    expect(report.provenance).toBe("SIMULATED");
    expect(report.fills).toBeGreaterThan(0);
    expect(restored.visitor.stock.corn).toBe(4);
    expect(listOpenOrders(restored.visitor)).toEqual([]);
  });

  it("loads an old PAPER blob that has no staffSlots or visitorOrders", () => {
    const world = createWorld(3);
    const land = createLandBoard();
    const visitor = createVisitor(1_000);
    const vacant = cheapVacant(land, visitor.cash);
    expect(leasePlot(land, visitor, vacant.id).ok).toBe(true);
    const blob = serializeShard({ world, land, visitor });
    const json = JSON.parse(JSON.stringify(blob)) as Record<string, unknown>;
    const v = json.visitor as Record<string, unknown>;
    delete v.staffSlots;
    delete v.visitorOrders;

    const restored = restoreShard(json);
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.visitor.staffSlots).toEqual([]);
    expect(listOpenOrders(restored.visitor)).toEqual([]);
    expect(getPlot(restored.land, vacant.id)?.owner).toBe("visitor");
  });

  it("applyVisitorOrders reseats without a second escrow", () => {
    const world = createWorld(1);
    const visitor = createVisitor(10);
    placeBid(world, visitor, { island: "south", goodId: "ore", price: 8, qty: 1 });
    const dumped = dumpVisitorOrders(visitor);
    const cash = visitor.cash;

    const other = createWorld(2);
    const fresh = createVisitor(cash);
    applyVisitorOrders(other, fresh, dumped);
    expect(fresh.cash).toBe(cash);
    expect(listOpenOrders(fresh)).toHaveLength(1);
    expect(listOpenOrders(fresh)[0]!.id).toBe(dumped[0]!.id);
  });
});
