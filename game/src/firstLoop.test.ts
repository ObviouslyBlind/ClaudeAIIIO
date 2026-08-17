import { describe, expect, it } from "vitest";
import { createLandBoard, leasePlot } from "./land.ts";
import { createVisitor } from "./sim.ts";
import { footTrafficSnapshot, plotTrafficBand, roadTrafficBand } from "./footTraffic.ts";
import {
  CART_PAPER_PRICE,
  HOTDOG_PACK_PRICE,
  HOTDOG_SALE_PRICE,
  attendStand,
  hireStand,
  incomePerMinute,
  markArrived,
  orderMarket,
  placeStand,
  playSnapshot,
  stockStand,
  takeAll,
  tickHotdogSales,
} from "./firstLoop.ts";

function leaseCheapSouth() {
  const land = createLandBoard();
  const visitor = createVisitor(1_000);
  const plot = land.plots.find((p) => p.island === "south" && !p.owner && p.band === "street" && p.price < 400);
  expect(plot).toBeTruthy();
  const leased = leasePlot(land, visitor, plot!.id);
  expect(leased.ok).toBe(true);
  return { land, visitor, plot: plot! };
}

describe("PAPER foot traffic", () => {
  it("paints paved roads green near the port and cooler inland", () => {
    const land = createLandBoard();
    const snap = footTrafficSnapshot(land);
    expect(snap.mode).toBe("PAPER");
    expect(snap.provenance).toBe("SIMULATED");
    const south = snap.roads.filter((r) => r.island === "south");
    expect(south.length).toBeGreaterThan(3);
    expect(south.some((r) => r.band === "green")).toBe(true);
    const dirt = land.roads.find((r) => r.kind === "dirt");
    expect(dirt).toBeTruthy();
    expect(roadTrafficBand(dirt!)).toBe("red");
  });
});

describe("South first loop", () => {
  it("rejects orders that are not a leased South plot", () => {
    const { land, visitor } = leaseCheapSouth();
    const north = land.plots.find((p) => p.island === "north" && !p.owner)!;
    expect(orderMarket(visitor, land, { plotId: north.id, skus: ["hotdog_cart"] }).ok).toBe(false);
    expect(orderMarket(visitor, land, { plotId: "nope", skus: ["hotdog_cart"] }).reason).toBe("not_yours");
  });

  it("buys a cart and hotdogs, delivers a crate, take-all fills inventory", () => {
    const { land, visitor, plot } = leaseCheapSouth();
    const before = visitor.cash;
    const order = orderMarket(visitor, land, {
      plotId: plot.id,
      skus: ["hotdog_cart", "hotdogs"],
      island: "south",
    });
    expect(order.ok).toBe(true);
    if (!order.ok) return;
    expect(order.paid).toBe(CART_PAPER_PRICE + HOTDOG_PACK_PRICE);
    expect(visitor.cash).toBe(before - order.paid);
    expect(order.delivery.status).toBe("en_route");
    expect(order.delivery.drop).toBeTruthy();
    expect(order.delivery.drop?.roadName).toBeTruthy();
    expect(order.delivery.drop!.x !== plot.x || order.delivery.drop!.z !== plot.z).toBe(true);
    expect(markArrived(visitor, order.delivery.id).ok).toBe(true);
    const taken = takeAll(visitor, order.delivery.id);
    expect(taken.ok).toBe(true);
    if (!taken.ok) return;
    expect(taken.inventory.find((i) => i.kind === "hotdog_cart")?.qty).toBe(1);
    expect(taken.inventory.find((i) => i.kind === "hotdogs")?.qty).toBe(20);
    expect(visitor.play.deliveries).toHaveLength(0);
  });

  it("places the cart, stocks it, hires, and earns $0.10 PAPER per hotdog", () => {
    const { land, visitor, plot } = leaseCheapSouth();
    const order = orderMarket(visitor, land, {
      plotId: plot.id,
      skus: ["hotdog_cart", "hotdogs"],
    });
    expect(order.ok).toBe(true);
    if (!order.ok) return;
    takeAll(visitor, order.delivery.id);
    const placed = placeStand(visitor, land, plot.id);
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(visitor.play.inventory.find((i) => i.kind === "hotdog_cart")).toBeUndefined();
    expect(stockStand(visitor, placed.stand.id).ok).toBe(true);
    expect(placed.stand.hotdogs).toBe(20);
    expect(hireStand(visitor, placed.stand.id).ok).toBe(true);

    const cash0 = visitor.cash;
    const band = plotTrafficBand(land, plot);
    const ticks = band === "green" ? 8 : band === "yellow" ? 16 : 32;
    for (let i = 0; i < ticks; i++) tickHotdogSales(visitor, land);
    expect(visitor.cash).toBeCloseTo(cash0 + HOTDOG_SALE_PRICE, 8);
    expect(placed.stand.hotdogs).toBe(19);
    expect(incomePerMinute(visitor.play)).toBeGreaterThan(0);

    const snap = playSnapshot(visitor, land);
    expect(snap.island).toBe("south");
    expect(snap.stands).toHaveLength(1);
    expect(snap.mode).toBe("PAPER");
    expect(snap.leaseOptions.length).toBeGreaterThan(0);
    expect(snap.leases).toHaveLength(1);
  });

  it("does not sell when idle, does sell when the player attends", () => {
    const { land, visitor, plot } = leaseCheapSouth();
    const order = orderMarket(visitor, land, { plotId: plot.id, skus: ["hotdog_cart", "hotdogs"] });
    if (!order.ok) return;
    takeAll(visitor, order.delivery.id);
    const placed = placeStand(visitor, land, plot.id);
    if (!placed.ok) return;
    stockStand(visitor, placed.stand.id);
    const cash0 = visitor.cash;
    for (let i = 0; i < 40; i++) tickHotdogSales(visitor, land);
    expect(visitor.cash).toBe(cash0);
    expect(attendStand(visitor, placed.stand.id).ok).toBe(true);
    for (let i = 0; i < 40; i++) tickHotdogSales(visitor, land);
    expect(visitor.cash).toBeGreaterThan(cash0);
  });
});
