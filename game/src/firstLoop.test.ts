import { describe, expect, it } from "vitest";
import { createLandBoard, developPlot, leasePlot } from "./land.ts";
import { createVisitor } from "./sim.ts";
import { BAND_LEVEL, footTrafficSnapshot, roadTrafficBand } from "./footTraffic.ts";
import { roadsideDrop } from "./roadside.ts";
import {
  CART_KINDS,
  CART_PAPER_PRICE,
  DELIVERY_WAIT_MS,
  HIRE_ROSTER,
  HOTDOG_PACK_PRICE,
  HOTDOG_SALE_PRICE,
  MARKET_CATALOG,
  PLACE_CORRIDOR_M,
  SALES_TAX,
  STORAGE_UPGRADE_COST,
  TODAY_PRICE,
  WAREHOUSE_FEE_PER_DAY,
  WAREHOUSE_RENT_TICKS,
  cartLoopNeeds,
  hireStand,
  incomePerMinute,
  markArrived,
  orderMarket,
  placeStand,
  playSnapshot,
  recallStaleDeliveries,
  setStandPrice,
  standNeeds,
  stockStand,
  takeAll,
  tickHotdogSales,
  tickWarehouseRent,
  upgradeStand,
  withdrawWarehouse,
} from "./firstLoop.ts";

function leaseCheapSouth() {
  const land = createLandBoard();
  const visitor = createVisitor(1_000);
  const plot = land.plots.find(
    (p) => p.island === "south" && !p.owner && p.band === "street" && p.class === "by_right" && p.price < 400,
  );
  expect(plot).toBeTruthy();
  const leased = leasePlot(land, visitor, plot!.id);
  expect(leased.ok).toBe(true);
  return { land, visitor, plot: plot! };
}

describe("PAPER foot traffic", () => {
  it("reads red as Low, yellow as Moderate, green as High", () => {
    expect(BAND_LEVEL).toEqual({ green: "High", yellow: "Moderate", red: "Low" });
  });

  it("paints paved roads green near the port and cooler inland", () => {
    const land = createLandBoard();
    const snap = footTrafficSnapshot(land);
    expect(snap.mode).toBe("PAPER");
    expect(snap.provenance).toBe("SIMULATED");
    const south = snap.roads.filter((r) => r.island === "south");
    expect(south.length).toBeGreaterThan(3);
    expect(south.some((r) => r.band === "green")).toBe(true);
    const dirt = land.roads.find((r) => r.kind === "dirt" && r.island === "north" && !r.name);
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

  it("places the cart, stocks it, hires, and earns after 20% sales tax", () => {
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
    expect(hireStand(visitor, placed.stand.id, "pat").ok).toBe(true);
    expect(placed.stand.staffName).toBe("Vendor");
    expect(placed.stand.stickerPrice).toBe(TODAY_PRICE);

    const cash0 = visitor.cash;
    expect(upgradeStand(visitor, placed.stand.id).ok).toBe(true);
    const snap0 = playSnapshot(visitor, land);
    const ticks = snap0.stands[0]!.sellTicks;
    for (let i = 0; i < ticks; i++) tickHotdogSales(visitor, land);
    const net = HOTDOG_SALE_PRICE * (1 - SALES_TAX);
    expect(visitor.cash).toBeCloseTo(cash0 - STORAGE_UPGRADE_COST + net, 8);
    expect(visitor.play.gameBank).toBeCloseTo(HOTDOG_SALE_PRICE * SALES_TAX + STORAGE_UPGRADE_COST, 8);
    expect(placed.stand.hotdogs).toBe(19);
    expect(incomePerMinute(visitor.play)).toBeGreaterThan(0);

    const snap = playSnapshot(visitor, land);
    expect(snap.island).toBe("south");
    expect(snap.stands).toHaveLength(1);
    expect(snap.hireRoster).toEqual(HIRE_ROSTER);
    expect(snap.hireRoster).toHaveLength(1);
    expect(snap.hireRoster[0]!.name).toBe("Vendor");
    expect(snap.todayPrice).toBe(TODAY_PRICE);
    expect(snap.salesTax).toBe(SALES_TAX);
    expect(snap.leaseOptions.length).toBeGreaterThan(0);
    expect(snap.leases).toHaveLength(1);
    expect(snap.aisles.some((a) => a.id === "street_carts")).toBe(true);
    expect(placed.stand.x).toBeDefined();
    expect(snap.stands[0]!.siteClass).toBe("cart");
    expect(snap.stands[0]!.desirability).toBeGreaterThan(0);
  });

  it("lets you place the cart on the verge out toward the main road", () => {
    const { land, visitor, plot } = leaseCheapSouth();
    const order = orderMarket(visitor, land, { plotId: plot.id, skus: ["hotdog_cart"] });
    expect(order.ok).toBe(true);
    if (!order.ok) return;
    takeAll(visitor, order.delivery.id);
    const drop = roadsideDrop(land.roads, "south", plot.x, plot.z);
    expect(drop).toBeTruthy();
    const placed = placeStand(visitor, land, "", { x: drop!.x, z: drop!.z });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(placed.stand.plotId).toBe(plot.id);
    expect(Math.hypot(placed.stand.x - plot.x, placed.stand.z - plot.z)).toBeLessThan(PLACE_CORRIDOR_M + 1);
  });

  it("refuses a commercial cart on a residential lot", () => {
    const land = createLandBoard();
    const visitor = createVisitor(20_000);
    const home = land.plots
      .filter((p) => p.island === "south" && p.zone === "residential" && !p.owner)
      .sort((a, b) => a.price - b.price)[0];
    expect(home).toBeTruthy();
    const leased = leasePlot(land, visitor, home!.id);
    expect(leased.ok).toBe(true);
    const order = orderMarket(visitor, land, { plotId: home!.id, skus: ["hotdog_cart"] });
    expect(order.ok).toBe(false);
    if (order.ok) return;
    expect(order.reason).toBe("zone_mismatch");
  });

  it("does not sell until someone is hired, even if you stand there", () => {
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
    expect(hireStand(visitor, placed.stand.id, "rui").ok).toBe(true);
    expect(placed.stand.staffName).toBe("Vendor");
    for (let i = 0; i < 40; i++) tickHotdogSales(visitor, land);
    expect(visitor.cash).toBeGreaterThan(cash0);
  });

  it("stores a buy in the island warehouse and charges $5 a sim day", () => {
    const { land, visitor } = leaseCheapSouth();
    const before = visitor.cash;
    const order = orderMarket(visitor, land, { skus: ["hotdog_cart"], dest: "warehouse" });
    expect(order.ok).toBe(true);
    if (!order.ok) return;
    expect(order.stored).toBe(true);
    expect(visitor.play.warehouse.items.find((i) => i.kind === "hotdog_cart")?.qty).toBe(1);
    expect(visitor.play.deliveries).toHaveLength(0);
    const fee = tickWarehouseRent(visitor, WAREHOUSE_RENT_TICKS);
    expect(fee).toBe(WAREHOUSE_FEE_PER_DAY);
    expect(visitor.cash).toBeCloseTo(before - CART_PAPER_PRICE - WAREHOUSE_FEE_PER_DAY, 8);
    expect(withdrawWarehouse(visitor, "hotdog_cart").ok).toBe(true);
    expect(visitor.play.inventory.find((i) => i.kind === "hotdog_cart")?.qty).toBe(1);
  });

  it("puts a cart buy into pockets when dest is cart, not the warehouse", () => {
    const { land, visitor } = leaseCheapSouth();
    const order = orderMarket(visitor, land, { skus: ["hotdog_cart", "hotdogs"], dest: "cart" });
    expect(order.ok).toBe(true);
    if (!order.ok) return;
    expect(order.stored).toBe(true);
    expect(order.delivery.dest).toBe("cart");
    expect(visitor.play.warehouse.items).toEqual([]);
    expect(visitor.play.inventory.find((i) => i.kind === "hotdog_cart")?.qty).toBe(1);
    expect(visitor.play.inventory.find((i) => i.kind === "hotdogs")?.qty).toBe(20);
  });

  it("returns a missed roadside crate to the warehouse after 3 minutes", () => {
    const { land, visitor, plot } = leaseCheapSouth();
    const order = orderMarket(visitor, land, { plotId: plot.id, skus: ["hotdogs"], dest: "road" });
    expect(order.ok).toBe(true);
    if (!order.ok) return;
    markArrived(visitor, order.delivery.id);
    visitor.play.deliveries[0]!.arrivedAtMs = 1;
    expect(recallStaleDeliveries(visitor, 1 + DELIVERY_WAIT_MS)).toBe(1);
    expect(visitor.play.deliveries).toHaveLength(0);
    expect(visitor.play.warehouse.items.find((i) => i.kind === "hotdogs")?.qty).toBe(20);
  });

  it("stocks a stand from the warehouse without taking pockets", () => {
    const { land, visitor, plot } = leaseCheapSouth();
    const cart = orderMarket(visitor, land, { plotId: plot.id, skus: ["hotdog_cart"] });
    if (!cart.ok) return;
    takeAll(visitor, cart.delivery.id);
    const dogs = orderMarket(visitor, land, { skus: ["hotdogs"], dest: "warehouse" });
    if (!dogs.ok) return;
    const placed = placeStand(visitor, land, plot.id);
    if (!placed.ok) return;
    expect(visitor.play.inventory.find((i) => i.kind === "hotdogs")).toBeUndefined();
    expect(stockStand(visitor, placed.stand.id, 0, "warehouse").ok).toBe(true);
    expect(placed.stand.hotdogs).toBe(20);
    expect(visitor.play.warehouse.items.find((i) => i.kind === "hotdogs")).toBeUndefined();
  });

  it("stocks a stand from pockets without emptying the warehouse", () => {
    const { land, visitor, plot } = leaseCheapSouth();
    const cart = orderMarket(visitor, land, { plotId: plot.id, skus: ["hotdog_cart"] });
    if (!cart.ok) return;
    takeAll(visitor, cart.delivery.id);
    const dogs = orderMarket(visitor, land, { skus: ["hotdogs"], dest: "warehouse" });
    if (!dogs.ok) return;
    expect(withdrawWarehouse(visitor, "hotdogs", 8).ok).toBe(true);
    const placed = placeStand(visitor, land, plot.id);
    if (!placed.ok) return;
    expect(visitor.play.inventory.find((i) => i.kind === "hotdogs")?.qty).toBe(8);
    expect(visitor.play.warehouse.items.find((i) => i.kind === "hotdogs")?.qty).toBe(12);
    expect(stockStand(visitor, placed.stand.id, 0, "inventory").ok).toBe(true);
    expect(placed.stand.hotdogs).toBe(8);
    expect(visitor.play.inventory.find((i) => i.kind === "hotdogs")).toBeUndefined();
    expect(visitor.play.warehouse.items.find((i) => i.kind === "hotdogs")?.qty).toBe(12);
  });

  it("lets staff sell at the sticker you set, and upgrade storage", () => {
    const { land, visitor, plot } = leaseCheapSouth();
    const order = orderMarket(visitor, land, { plotId: plot.id, skus: ["hotdog_cart", "hotdogs"] });
    if (!order.ok) return;
    takeAll(visitor, order.delivery.id);
    const placed = placeStand(visitor, land, plot.id);
    if (!placed.ok) return;
    stockStand(visitor, placed.stand.id);
    hireStand(visitor, placed.stand.id, "sam");
    expect(setStandPrice(visitor, placed.stand.id, 8).ok).toBe(true);
    const cash0 = visitor.cash;
    const ticks = playSnapshot(visitor, land).stands[0]!.sellTicks;
    for (let i = 0; i < ticks; i++) tickHotdogSales(visitor, land);
    expect(visitor.cash).toBeCloseTo(cash0 + 8 * (1 - SALES_TAX), 8);
    expect(upgradeStand(visitor, placed.stand.id).ok).toBe(true);
    expect(placed.stand.storageCap).toBe(40);
    expect(visitor.cash).toBeCloseTo(cash0 + 8 * (1 - SALES_TAX) - STORAGE_UPGRADE_COST, 8);
  });

  it("lists what a cart still wants: buy, place, hire, stock, fridge, sticker", () => {
    const { land, visitor, plot } = leaseCheapSouth();
    expect(cartLoopNeeds(visitor.play).map((n) => n.id)).toEqual(["buy"]);
    const order = orderMarket(visitor, land, { skus: ["hotdog_cart", "hotdogs"], dest: "cart" });
    expect(order.ok).toBe(true);
    expect(cartLoopNeeds(visitor.play).map((n) => n.id)).toEqual(["place"]);
    const placed = placeStand(visitor, land, plot.id);
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(standNeeds(placed.stand).map((n) => n.id)).toEqual(["hire", "stock", "fridge"]);
    expect(hireStand(visitor, placed.stand.id, "pat").ok).toBe(true);
    expect(stockStand(visitor, placed.stand.id, 0, "inventory").ok).toBe(true);
    expect(setStandPrice(visitor, placed.stand.id, 8).ok).toBe(true);
    expect(standNeeds(placed.stand).map((n) => n.id)).toEqual(["fridge", "sticker"]);
    expect(standNeeds(placed.stand).some((n) => n.label.includes("today's price"))).toBe(true);
    expect(upgradeStand(visitor, placed.stand.id).ok).toBe(true);
    expect(setStandPrice(visitor, placed.stand.id, TODAY_PRICE).ok).toBe(true);
    expect(standNeeds(placed.stand)).toEqual([]);
    expect(playSnapshot(visitor, land).cartNeeds).toEqual([]);
  });

  it("refuses to stock a cart that has not been placed", () => {
    const { land, visitor } = leaseCheapSouth();
    expect(stockStand(visitor, "stand-missing").reason).toBe("no_stand");
    const buy = orderMarket(visitor, land, { skus: ["hotdogs"], dest: "cart" });
    expect(buy.ok).toBe(true);
    expect(visitor.play.stands).toHaveLength(0);
    expect(stockStand(visitor, "").reason).toBe("no_stand");
  });

  it("lists fruit, watermelon, and fish-and-chips carts, and stocks only that cart's pack", () => {
    const { land, visitor, plot } = leaseCheapSouth();
    expect(CART_KINDS.map((c) => c.id)).toEqual(["fruit", "watermelon", "fish_chips"]);
    expect(MARKET_CATALOG.filter((s) => s.role === "kit").map((s) => s.label)).toEqual([
      "Fruit cart",
      "Watermelon cart",
      "Fish and chips cart",
    ]);
    const kit = orderMarket(visitor, land, { skus: ["melon_cart", "hotdogs"], dest: "cart" });
    expect(kit.ok).toBe(true);
    const placed = placeStand(visitor, land, plot.id, { kitId: "melon_cart" });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(placed.stand.kind).toBe("watermelon");
    expect(stockStand(visitor, placed.stand.id, 0, "inventory").ok).toBe(false);
    expect(stockStand(visitor, placed.stand.id, 0, "inventory").reason).toBe("no_stock");
    expect(visitor.play.inventory.find((i) => i.kind === "hotdogs")?.qty).toBe(20);
    expect(orderMarket(visitor, land, { skus: ["melon"], dest: "cart" }).ok).toBe(true);
    expect(stockStand(visitor, placed.stand.id, 0, "inventory").ok).toBe(true);
    expect(placed.stand.hotdogs).toBe(20);
    expect(visitor.play.inventory.find((i) => i.kind === "melon")).toBeUndefined();
    expect(visitor.play.inventory.find((i) => i.kind === "hotdogs")?.qty).toBe(20);
    const snap = playSnapshot(visitor, land);
    expect(snap.stands[0]!.label).toBe("Watermelon cart");
    expect(snap.stands[0]!.stockId).toBe("melon");
    expect(snap.stands[0]!.games).toContain("Melon slice");
  });

  it("uses the same site card for a shop and a mine", () => {
    const land = createLandBoard();
    const visitor = createVisitor(20_000);
    const plot = land.plots.find(
      (p) => p.island === "south" && !p.owner && p.band === "street" && p.class === "by_right" && p.zone === "commercial",
    );
    expect(plot).toBeTruthy();
    expect(leasePlot(land, visitor, plot!.id).ok).toBe(true);
    expect(developPlot(land, visitor, plot!.id, "shop").ok).toBe(true);
    const snap = playSnapshot(visitor, land);
    const shop = snap.sites.find((s) => s.siteClass === "shop");
    expect(shop).toBeTruthy();
    expect(shop!.id).toBe(`site-${plot!.id}`);
    expect(hireStand(visitor, shop!.id).ok).toBe(true);
    expect(playSnapshot(visitor, land).sites.find((s) => s.id === shop!.id)!.staffName).toBe("Vendor");
  });
});
