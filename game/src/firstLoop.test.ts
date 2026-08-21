import { describe, expect, it } from "vitest";
import { createLandBoard, developPlot, ISLANDS, leasePlot, STARTER_CASH } from "./land.ts";
import { createVisitor } from "./sim.ts";
import { BAND_LEVEL, footTrafficSnapshot, roadTrafficBand } from "./footTraffic.ts";
import { roadsideDrop } from "./roadside.ts";
import {
  CART_KINDS,
  CART_PAPER_PRICE,
  CART_PRICES,
  DELIVERY_WAIT_MS,
  HIRE_COST,
  HIRE_ROSTER,
  HOTDOG_PACK_PRICE,
  HOTDOG_SALE_PRICE,
  MARKET_CATALOG,
  PROPANE_PRICE,
  PROPANE_SALES,
  PLACE_CORRIDOR_M,
  SALES_TAX,
  STORAGE_UPGRADE_COST,
  TODAY_PRICE,
  WAREHOUSE_FEE_PER_DAY,
  WAREHOUSE_RENT_TICKS,
  cartLoopNeeds,
  fireStand,
  fuelStand,
  hireStand,
  incomePerMinute,
  markArrived,
  orderMarket,
  placeStand,
  playSnapshot,
  recallStaleDeliveries,
  setStandPrice,
  standNeeds,
  stickerBand,
  stockStand,
  takeAll,
  tickHotdogSales,
  tickWarehouseRent,
  upgradeStand,
  withdrawWarehouse,
  sellWarehouse,
  pickupStand,
  sellVisitorPlot,
  sellShiftBurst,
  resetVisitorPlay,
  setVisitorLook,
} from "./firstLoop.ts";

function leaseCheapSouth() {
  const land = createLandBoard();
  const plot = land.plots.find(
    (p) =>
      p.island === "south" &&
      !p.owner &&
      !p.buildingId &&
      p.band === "street" &&
      p.class === "by_right",
  );
  expect(plot).toBeTruthy();
  const visitor = createVisitor(plot!.price + 800);
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
  it("offers a vacant street lot next to the south pad that $1000 cannot lease", () => {
    const land = createLandBoard();
    const visitor = createVisitor(1_000);
    const near = land.plots.find(
      (p) =>
        p.island === "south" &&
        !p.owner &&
        p.band === "street" &&
        p.class === "by_right" &&
        !p.buildingId &&
        Math.hypot(p.x - ISLANDS.south.port.x, p.z - ISLANDS.south.port.z) < 120,
    );
    expect(near).toBeTruthy();
    expect(near!.price).toBeGreaterThan(1_000);
    expect(leasePlot(land, visitor, near!.id).ok).toBe(false);
    const rich = createVisitor(near!.price + 800);
    expect(leasePlot(land, rich, near!.id).ok).toBe(true);
    const after = playSnapshot(rich, land);
    expect(after.leases.some((row) => row.id === near!.id)).toBe(true);
    expect(after.leaseOptions.some((row) => row.id === near!.id)).toBe(false);
  });

  it("lets $1000 PAPER lease a highway cart pad and still buy a fruit cart", () => {
    const land = createLandBoard();
    const visitor = createVisitor(1_000);
    const pad = land.plots.find((p) => p.class === "cart_pad" && !p.owner)!;
    expect(pad.price).toBe(750);
    expect(leasePlot(land, visitor, pad.id).ok).toBe(true);
    const kit = CART_PAPER_PRICE + HOTDOG_PACK_PRICE;
    expect(visitor.cash).toBeGreaterThanOrEqual(kit);
    expect(visitor.cash).toBeLessThan(HIRE_COST);
    const snap = playSnapshot(visitor, land);
    expect(snap.leases.some((row) => row.id === pad.id)).toBe(true);
    expect(snap.leases.find((row) => row.id === pad.id)!.island).toBe("south");
    expect(snap.leases.find((row) => row.id === pad.id)!.class).toBe("cart_pad");
    expect(snap.leaseOptions.some((row) => row.price === 750)).toBe(true);
  });

  it("sends a kerb van without a lease, and rejects a vacant plotId", () => {
    const land = createLandBoard();
    const visitor = createVisitor(1_000);
    const vacant = land.plots.find(
      (p) =>
        p.island === "south" &&
        !p.owner &&
        !p.buildingId &&
        p.band === "street" &&
        p.class === "by_right",
    );
    expect(vacant).toBeTruthy();
    const stolen = orderMarket(visitor, land, { plotId: vacant!.id, skus: ["hotdog_cart"], dest: "road" });
    expect(stolen.ok).toBe(false);
    if (!stolen.ok) expect(stolen.reason).toBe("not_yours");
    const kerb = orderMarket(visitor, land, {
      skus: ["hotdog_cart"],
      dest: "road",
      x: ISLANDS.south.port.x + 10,
      z: ISLANDS.south.port.z,
    });
    expect(kerb.ok).toBe(true);
    if (!kerb.ok) return;
    expect(kerb.delivery.dest).toBe("road");
    expect(kerb.delivery.status).toBe("en_route");
  });

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
    expect(order.delivery.arrivedAtMs).toBeNull();
    expect(order.delivery.drop).toBeTruthy();
    expect(order.delivery.drop?.roadName).toBeTruthy();
    expect(order.delivery.drop!.x !== plot.x || order.delivery.drop!.z !== plot.z).toBe(true);
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
    expect(visitor.play.gameBank).toBeCloseTo(HOTDOG_SALE_PRICE * SALES_TAX + STORAGE_UPGRADE_COST + HIRE_COST, 8);
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
    expect(snap.stands[0]!.stickerBand).toBe("green");
    expect(snap.stands[0]!.stickerMul).toBe(1);
    expect(snap.stands[0]!.parts.some((p) => p.id === "fridge" && p.points === 1.5)).toBe(true);
    expect(snap.upgradeCatalog.some((u) => u.id === "lights" && u.appeal === 1.2)).toBe(true);
    expect(snap.upgradeCatalog.some((u) => u.id === "stools")).toBe(true);
    expect(snap.books.mode).toBe("PAPER");
    expect(snap.books.sites).toHaveLength(1);
    expect(snap.books.sites[0]!.cogsEst).toBeCloseTo(CART_PRICES.fruit.pack / 20, 8);
    expect(snap.books.sites[0]!.netPerSale).toBeCloseTo(HOTDOG_SALE_PRICE * (1 - SALES_TAX), 8);
    expect(snap.books.sites[0]!.cogsSold).toBeCloseTo(CART_PRICES.fruit.pack / 20, 8);
    expect(snap.books.sites[0]!.unitsSold).toBe(1);
    expect(snap.books.sites[0]!.worthPaper).toBeGreaterThan(CART_PRICES.fruit.kit);
    expect(snap.books.sites[0]!.staffName).toBe("Vendor");
    expect(snap.books.salesTax).toBe(SALES_TAX);
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

  it("snaps a far tap onto the lot verge instead of leaving the cart inland", () => {
    const { land, visitor, plot } = leaseCheapSouth();
    const order = orderMarket(visitor, land, { plotId: plot.id, skus: ["hotdog_cart"] });
    expect(order.ok).toBe(true);
    if (!order.ok) return;
    takeAll(visitor, order.delivery.id);
    const placed = placeStand(visitor, land, plot.id, { x: plot.x + 90, z: plot.z + 90 });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(placed.stand.plotId).toBe(plot.id);
    expect(Math.hypot(placed.stand.x - plot.x, placed.stand.z - plot.z)).toBeLessThan(PLACE_CORRIDOR_M + 4);
  });

  it("places a cart on a highway pad and keeps yaw", () => {
    const land = createLandBoard();
    const pad = land.plots.find((p) => p.class === "cart_pad" && !p.owner)!;
    const visitor = createVisitor(1_000);
    expect(leasePlot(land, visitor, pad.id).ok).toBe(true);
    const order = orderMarket(visitor, land, { plotId: pad.id, skus: ["hotdog_cart"] });
    expect(order.ok).toBe(true);
    if (!order.ok) return;
    takeAll(visitor, order.delivery.id);
    const yaw = 0.85;
    const placed = placeStand(visitor, land, pad.id, { x: pad.x, z: pad.z, yaw });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(placed.stand.plotId).toBe(pad.id);
    expect(placed.stand.yaw).toBeCloseTo(yaw);
    expect(Math.hypot(placed.stand.x - pad.x, placed.stand.z - pad.z)).toBeLessThan(0.05);
    const snap = playSnapshot(visitor, land);
    expect(snap.stands[0]!.yaw).toBeCloseTo(yaw);
  });

  it("refuses a cart that hangs off the pad and does not take the kit", () => {
    const land = createLandBoard();
    const pad = land.plots.find((p) => p.class === "cart_pad" && !p.owner)!;
    const visitor = createVisitor(1_000);
    expect(leasePlot(land, visitor, pad.id).ok).toBe(true);
    const order = orderMarket(visitor, land, { plotId: pad.id, skus: ["hotdog_cart"] });
    expect(order.ok).toBe(true);
    if (!order.ok) return;
    takeAll(visitor, order.delivery.id);
    const before = visitor.play.inventory.find((r) => r.kind === "hotdog_cart")?.qty ?? 0;
    const placed = placeStand(visitor, land, pad.id, { x: pad.x + 40, z: pad.z + 40, yaw: 0 });
    expect(placed.ok).toBe(false);
    if (placed.ok) return;
    expect(placed.reason).toBe("off_pad");
    expect(visitor.play.inventory.find((r) => r.kind === "hotdog_cart")?.qty).toBe(before);
    expect(visitor.play.stands).toHaveLength(0);
  });

  it("snaps a slightly-off pad tap onto the dirt without taking a street lot", () => {
    const land = createLandBoard();
    const pad = land.plots.find((p) => p.class === "cart_pad" && !p.owner)!;
    const visitor = createVisitor(1_000);
    expect(leasePlot(land, visitor, pad.id).ok).toBe(true);
    const order = orderMarket(visitor, land, { plotId: pad.id, skus: ["hotdog_cart"] });
    expect(order.ok).toBe(true);
    if (!order.ok) return;
    takeAll(visitor, order.delivery.id);
    const placed = placeStand(visitor, land, pad.id, { x: pad.x + 2.1, z: pad.z + 0.35, yaw: 0 });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(placed.stand.plotId).toBe(pad.id);
    expect(Math.hypot(placed.stand.x - pad.x, placed.stand.z - pad.z)).toBeLessThan(2.2);
  });

  it("lets a kerb crate drop by a residential lot, but will not place a cart there", () => {
    const land = createLandBoard();
    const visitor = createVisitor(20_000);
    const home = land.plots
      .filter((p) => p.island === "south" && p.zone === "residential" && !p.owner)
      .sort((a, b) => a.price - b.price)[0];
    expect(home).toBeTruthy();
    const leased = leasePlot(land, visitor, home!.id);
    expect(leased.ok).toBe(true);
    const order = orderMarket(visitor, land, { plotId: home!.id, skus: ["hotdog_cart"] });
    expect(order.ok).toBe(true);
    if (!order.ok) return;
    expect(order.delivery.status).toBe("en_route");
    expect(takeAll(visitor, order.delivery.id).ok).toBe(true);
    const placed = placeStand(visitor, land, home!.id);
    expect(placed.ok).toBe(false);
    if (placed.ok) return;
    expect(placed.reason).toBe("zone_mismatch");
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
    const cash1 = visitor.cash;
    for (let i = 0; i < 40; i++) tickHotdogSales(visitor, land);
    expect(visitor.cash).toBeGreaterThan(cash1);
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

  it("returns a missed roadside crate to the warehouse after 60 seconds", () => {
    const { land, visitor, plot } = leaseCheapSouth();
    const order = orderMarket(visitor, land, { plotId: plot.id, skus: ["hotdogs"], dest: "road" });
    expect(order.ok).toBe(true);
    if (!order.ok) return;
    expect(order.delivery.status).toBe("en_route");
    expect(DELIVERY_WAIT_MS).toBe(60_000);
    expect(markArrived(visitor, order.delivery.id).ok).toBe(true);
    visitor.play.deliveries[0]!.arrivedAtMs = 1;
    expect(recallStaleDeliveries(visitor, 1 + DELIVERY_WAIT_MS)).toBe(1);
    expect(visitor.play.deliveries).toHaveLength(0);
    expect(visitor.play.warehouse.items.find((i) => i.kind === "hotdogs")?.qty).toBe(20);
  });

  it("multiplies pack price and qty, and drops at the player without a plotId", () => {
    const { land, visitor, plot } = leaseCheapSouth();
    const before = visitor.cash;
    const packs = orderMarket(visitor, land, { skus: ["hotdogs"], dest: "warehouse", qty: 3 });
    expect(packs.ok).toBe(true);
    if (!packs.ok) return;
    expect(packs.paid).toBe(HOTDOG_PACK_PRICE * 3);
    expect(visitor.cash).toBe(before - packs.paid);
    expect(visitor.play.warehouse.items.find((i) => i.kind === "hotdogs")?.qty).toBe(60);
    const kerb = orderMarket(visitor, land, {
      skus: ["hotdog_cart"],
      dest: "road",
      x: plot.x,
      z: plot.z,
    });
    expect(kerb.ok).toBe(true);
    if (!kerb.ok) return;
    expect(kerb.delivery.status).toBe("en_route");
    expect(kerb.delivery.drop).toBeTruthy();
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
    expect(cartLoopNeeds(visitor.play)[0]!.label).toMatch(/pad/);
    expect(cartLoopNeeds(visitor.play)[0]!.label).toMatch(/Hold R/);
    const placed = placeStand(visitor, land, plot.id);
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(standNeeds(placed.stand).map((n) => n.id)).toEqual(["hire", "stock", "fridge"]);
    expect(hireStand(visitor, placed.stand.id, "pat").ok).toBe(true);
    expect(placed.stand.hotdogs).toBe(20);
    expect(setStandPrice(visitor, placed.stand.id, 8).ok).toBe(true);
    expect(standNeeds(placed.stand).map((n) => n.id)).toEqual(["fridge", "sticker"]);
    expect(standNeeds(placed.stand).some((n) => n.label.includes("Sticker $"))).toBe(true);
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
    visitor.cash = 8_000;
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
    expect(snap.stands[0]!.games).toEqual(["Melon slice", "Seed spit"]);
  });

  it("uses the same site card for a shop and a mine", () => {
    const land = createLandBoard();
    const visitor = createVisitor(80_000);
    const plot = land.plots.find(
      (p) =>
        p.island === "south" &&
        !p.owner &&
        !p.buildingId &&
        p.band === "street" &&
        p.class === "by_right" &&
        p.zone === "commercial",
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

  it("charges $300 to hire, lets you fire, and fills extra fridge room while hired", () => {
    const { land, visitor, plot } = leaseCheapSouth();
    const kit = orderMarket(visitor, land, { skus: ["hotdog_cart"], dest: "cart" });
    expect(kit.ok).toBe(true);
    const dogs = orderMarket(visitor, land, { skus: ["hotdogs"], dest: "warehouse", qty: 2 });
    expect(dogs.ok).toBe(true);
    const placed = placeStand(visitor, land, plot.id);
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    visitor.cash = 10;
    expect(hireStand(visitor, placed.stand.id).reason).toBe("no_cash");
    visitor.cash = 400;
    const cash0 = visitor.cash;
    expect(hireStand(visitor, placed.stand.id).ok).toBe(true);
    expect(visitor.cash).toBeCloseTo(cash0 - HIRE_COST, 8);
    expect(placed.stand.hired).toBe(true);
    expect(placed.stand.hotdogs).toBe(20);
    expect(visitor.play.warehouse.items.find((i) => i.kind === "hotdogs")?.qty).toBe(20);
    visitor.cash = 250;
    expect(upgradeStand(visitor, placed.stand.id, "fridge").ok).toBe(true);
    expect(placed.stand.storageCap).toBe(40);
    expect(placed.stand.hotdogs).toBe(40);
    expect(visitor.play.warehouse.items.find((i) => i.kind === "hotdogs")).toBeUndefined();
    expect(fireStand(visitor, placed.stand.id).ok).toBe(true);
    expect(placed.stand.hired).toBe(false);
    expect(placed.stand.staffName).toBeNull();
    expect(fireStand(visitor, placed.stand.id).reason).toBe("not_hired");
  });

  it("does not sell a mini-game burst while a vendor is manning", () => {
    const { land, visitor, plot } = leaseCheapSouth();
    const order = orderMarket(visitor, land, { plotId: plot.id, skus: ["hotdog_cart", "hotdogs"] });
    expect(order.ok).toBe(true);
    if (!order.ok) return;
    takeAll(visitor, order.delivery.id);
    const placed = placeStand(visitor, land, plot.id);
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(stockStand(visitor, placed.stand.id).ok).toBe(true);
    expect(hireStand(visitor, placed.stand.id).ok).toBe(true);
    const cash0 = visitor.cash;
    const burst = sellShiftBurst(visitor, land, placed.stand.id, 8);
    expect(burst.sold).toBe(0);
    expect(burst.reason).toBe("hired");
    expect(placed.stand.hotdogs).toBe(20);
    expect(visitor.cash).toBe(cash0);
  });

  it("lets you buy the fridge before anyone is hired", () => {
    const { land, visitor, plot } = leaseCheapSouth();
    const order = orderMarket(visitor, land, { plotId: plot.id, skus: ["hotdog_cart"] });
    expect(order.ok).toBe(true);
    if (!order.ok) return;
    takeAll(visitor, order.delivery.id);
    const placed = placeStand(visitor, land, plot.id);
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(placed.stand.hired).toBe(false);
    expect(upgradeStand(visitor, placed.stand.id).ok).toBe(true);
    expect(placed.stand.upgraded).toBe(true);
    expect(placed.stand.storageCap).toBe(40);
  });

  it("sells 5 to 10 in one go after a finished shift, without hire", () => {
    const { land, visitor, plot } = leaseCheapSouth();
    const order = orderMarket(visitor, land, { plotId: plot.id, skus: ["hotdog_cart", "hotdogs"] });
    expect(order.ok).toBe(true);
    if (!order.ok) return;
    takeAll(visitor, order.delivery.id);
    const placed = placeStand(visitor, land, plot.id);
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(stockStand(visitor, placed.stand.id).ok).toBe(true);
    const cash0 = visitor.cash;
    const miss = sellShiftBurst(visitor, land, placed.stand.id, 0);
    expect(miss.sold).toBe(0);
    expect(miss.reason).toBe("no_hits");
    const burst = sellShiftBurst(visitor, land, placed.stand.id, 8);
    expect(burst.reason).toBe("ok");
    expect(burst.sold).toBeGreaterThanOrEqual(5);
    expect(burst.sold).toBeLessThanOrEqual(10);
    expect(placed.stand.hotdogs).toBe(20 - burst.sold);
    expect(visitor.cash).toBeCloseTo(cash0 + burst.sold * HOTDOG_SALE_PRICE * (1 - SALES_TAX), 8);
  });

  it("reads sticker green on today, yellow nearby, red far", () => {
    expect(stickerBand(TODAY_PRICE)).toBe("green");
    expect(stickerBand(TODAY_PRICE + 1)).toBe("yellow");
    expect(stickerBand(TODAY_PRICE + 3)).toBe("red");
  });

  it("lets a hired vendor buy a pack when the warehouse and pockets are empty", () => {
    const { land, visitor, plot } = leaseCheapSouth();
    const kit = orderMarket(visitor, land, { skus: ["hotdog_cart"], dest: "cart" });
    expect(kit.ok).toBe(true);
    const placed = placeStand(visitor, land, plot.id);
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(placed.stand.hotdogs).toBe(0);
    const cash0 = visitor.cash;
    expect(hireStand(visitor, placed.stand.id).ok).toBe(true);
    expect(placed.stand.hotdogs).toBe(20);
    expect(visitor.cash).toBeCloseTo(cash0 - HIRE_COST - HOTDOG_PACK_PRICE, 8);
  });

  it("makes fish and chips the dear propane cart with the highest sticker", () => {
    expect(CART_PRICES.fruit.kit).toBe(90);
    expect(CART_PRICES.watermelon.kit).toBeGreaterThan(1_000);
    expect(CART_PRICES.fish_chips.kit).toBeGreaterThan(CART_PRICES.watermelon.kit);
    expect(CART_PRICES.fish_chips.kit).toBeLessThan(2_400);
    expect(CART_PRICES.fish_chips.sale).toBe(11);
    expect(CART_PRICES.fish_chips.sale).toBeGreaterThan(CART_PRICES.fruit.sale);
    expect(PROPANE_PRICE).toBe(18);
    expect(PROPANE_SALES).toBe(40);
    expect(MARKET_CATALOG.find((s) => s.id === "propane")?.paperPrice).toBe(PROPANE_PRICE);
    expect(MARKET_CATALOG.find((s) => s.id === "fish_cart")?.paperPrice).toBe(CART_PRICES.fish_chips.kit);
    expect(CART_KINDS.find((c) => c.id === "fruit")?.games).toEqual(["Fruit slice", "Ripe sort"]);
    expect(CART_KINDS.find((c) => c.id === "watermelon")?.games).toEqual(["Melon slice", "Seed spit"]);
    expect(CART_KINDS.find((c) => c.id === "fish_chips")?.games).toEqual(["Fry run", "Basket pull", "Wrap ticket"]);
    const fryStart =
      CART_PRICES.fish_chips.kit + CART_PRICES.fish_chips.pack + PROPANE_PRICE + HIRE_COST;
    expect(fryStart).toBeGreaterThan(1_000);
    expect(fryStart).toBeLessThan(2_400);
    expect(fryStart).toBeGreaterThan(CART_PRICES.fruit.kit + HOTDOG_PACK_PRICE + HIRE_COST);

    const { land, visitor, plot } = leaseCheapSouth();
    visitor.cash = 8_000;
    const order = orderMarket(visitor, land, {
      skus: ["fish_cart", "fish_chips", "propane"],
      dest: "cart",
    });
    expect(order.ok).toBe(true);
    if (!order.ok) return;
    expect(order.paid).toBe(CART_PRICES.fish_chips.kit + CART_PRICES.fish_chips.pack + PROPANE_PRICE);
    const placed = placeStand(visitor, land, plot.id, { kitId: "fish_cart" });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(placed.stand.kind).toBe("fish_chips");
    expect(placed.stand.stickerPrice).toBe(CART_PRICES.fish_chips.sale);
    expect(placed.stand.propaneLeft).toBe(0);
    expect(standNeeds(placed.stand).map((n) => n.id)).toEqual(["hire", "stock", "propane", "fridge"]);
    expect(stockStand(visitor, placed.stand.id, 0, "inventory").ok).toBe(true);
    expect(fuelStand(visitor, placed.stand.id, "inventory").ok).toBe(true);
    expect(placed.stand.propaneLeft).toBe(PROPANE_SALES);
    const snap = playSnapshot(visitor, land);
    expect(snap.stands[0]!.todayPrice).toBe(11);
    expect(snap.stands[0]!.games).toEqual(["Fry run", "Basket pull", "Wrap ticket"]);
    expect(snap.stands[0]!.stickerBand).toBe("green");

    expect(hireStand(visitor, placed.stand.id).ok).toBe(true);
    visitor.cash = 0;
    visitor.play.inventory = [];
    visitor.play.warehouse.items = [];
    placed.stand.hotdogs = 5;
    placed.stand.propaneLeft = 1;
    placed.stand.sellAcc = 10_000;
    tickHotdogSales(visitor, land);
    expect(placed.stand.propaneLeft).toBe(0);
    expect(placed.stand.hotdogs).toBe(4);
    tickHotdogSales(visitor, land);
    expect(placed.stand.hotdogs).toBe(4);
    expect(placed.stand.propaneLeft).toBe(0);
  });

  it("will not burst-sell fry without heat, and one bottle lasts 40 sales", () => {
    const { land, visitor, plot } = leaseCheapSouth();
    visitor.cash = 8_000;
    const order = orderMarket(visitor, land, { skus: ["fish_cart", "fish_chips"], dest: "cart" });
    expect(order.ok).toBe(true);
    const placed = placeStand(visitor, land, plot.id, { kitId: "fish_cart" });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(stockStand(visitor, placed.stand.id).ok).toBe(true);
    const dry = sellShiftBurst(visitor, land, placed.stand.id, 8);
    expect(dry.sold).toBe(0);
    expect(dry.reason).toBe("no_propane");
    expect(placed.stand.hotdogs).toBe(20);
    expect(orderMarket(visitor, land, { skus: ["propane"], dest: "cart" }).ok).toBe(true);
    expect(fuelStand(visitor, placed.stand.id, "inventory").ok).toBe(true);
    const wet = sellShiftBurst(visitor, land, placed.stand.id, 8);
    expect(wet.sold).toBeGreaterThan(0);
    expect(placed.stand.propaneLeft).toBe(PROPANE_SALES - wet.sold);
    expect(fuelStand(visitor, "stand-missing").reason).toBe("no_stand");
  });

  it("keeps watermelon and fry kits above $1,000 PAPER", () => {
    const land = createLandBoard();
    const visitor = createVisitor(1_000);
    expect(orderMarket(visitor, land, { skus: ["melon_cart"], dest: "warehouse" }).ok).toBe(false);
    expect(orderMarket(visitor, land, { skus: ["fish_cart"], dest: "warehouse" }).ok).toBe(false);
    expect(orderMarket(visitor, land, { skus: ["hotdog_cart"], dest: "warehouse" }).ok).toBe(true);
    expect(visitor.play.warehouse.items.find((i) => i.kind === "hotdog_cart")?.qty).toBe(1);
  });

  it("pulls warehouse packs onto the cart when a finished shift sells", () => {
    const { land, visitor, plot } = leaseCheapSouth();
    const order = orderMarket(visitor, land, { skus: ["hotdog_cart", "hotdogs"], dest: "warehouse" });
    expect(order.ok).toBe(true);
    expect(placeStand(visitor, land, plot.id).ok).toBe(false);
    expect(placeStand(visitor, land, plot.id).reason).toBe("in_warehouse");
    expect(withdrawWarehouse(visitor, "hotdog_cart").ok).toBe(true);
    const placed = placeStand(visitor, land, plot.id);
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(placed.stand.hotdogs).toBe(0);
    expect(visitor.play.warehouse.items.find((i) => i.kind === "hotdogs")?.qty).toBe(20);
    const cash0 = visitor.cash;
    const empty = sellShiftBurst(visitor, land, placed.stand.id, 8);
    expect(empty.reason).toBe("ok");
    expect(empty.sold).toBeGreaterThanOrEqual(5);
    expect(visitor.cash).toBeGreaterThan(cash0);
    expect(visitor.play.warehouse.items.find((i) => i.kind === "hotdogs")?.qty ?? 0).toBeLessThan(20);
  });

  it("names empty when there is nothing left to sell", () => {
    const { land, visitor, plot } = leaseCheapSouth();
    const order = orderMarket(visitor, land, { skus: ["hotdog_cart"], dest: "warehouse" });
    expect(order.ok).toBe(true);
    expect(withdrawWarehouse(visitor, "hotdog_cart").ok).toBe(true);
    const placed = placeStand(visitor, land, plot.id);
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    const burst = sellShiftBurst(visitor, land, placed.stand.id, 8);
    expect(burst.sold).toBe(0);
    expect(burst.reason).toBe("empty");
  });

  it("resets the island save and keeps look; delete restores the default look", () => {
    const { land, visitor, plot } = leaseCheapSouth();
    expect(orderMarket(visitor, land, { skus: ["hotdog_cart"], dest: "warehouse" }).ok).toBe(true);
    expect(placeStand(visitor, land, plot.id).ok).toBe(false);
    expect(withdrawWarehouse(visitor, "hotdog_cart").ok).toBe(true);
    expect(placeStand(visitor, land, plot.id).ok).toBe(true);
    setVisitorLook(visitor, { skin: "deep", hair: "locs", shirt: "night" });
    expect(visitor.look.skin).toBe("deep");
    resetVisitorPlay(land, visitor, "reset");
    expect(visitor.cash).toBe(STARTER_CASH);
    expect(visitor.play.stands).toHaveLength(0);
    expect(land.plots.some((p) => p.owner === "visitor")).toBe(false);
    expect(visitor.look.skin).toBe("deep");
    expect(visitor.look.hair).toBe("locs");
    expect(playSnapshot(visitor, land).accountTag).toBe("#0002");
    resetVisitorPlay(land, visitor, "delete");
    expect(visitor.look.skin).toBe("sand");
    expect(visitor.look.hair).toBe("short");
    expect(visitor.accountNo).toBe(2);
  });

  it("picks a cart up into the warehouse and sells leftover stock", () => {
    const { land, visitor, plot } = leaseCheapSouth();
    expect(orderMarket(visitor, land, { skus: ["hotdog_cart", "hotdogs"], dest: "warehouse" }).ok).toBe(true);
    expect(placeStand(visitor, land, plot.id).ok).toBe(false);
    expect(placeStand(visitor, land, plot.id).reason).toBe("in_warehouse");
    expect(withdrawWarehouse(visitor, "hotdog_cart").ok).toBe(true);
    const placed = placeStand(visitor, land, plot.id);
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(stockStand(visitor, placed.stand.id, 0, "warehouse").ok).toBe(true);
    expect(visitor.play.warehouse.items.find((i) => i.kind === "hotdog_cart")).toBeUndefined();
    const packed = pickupStand(visitor, land, placed.stand.id);
    expect(packed.ok).toBe(true);
    if (!packed.ok) return;
    expect(visitor.play.stands).toHaveLength(0);
    expect(visitor.play.warehouse.items.find((i) => i.kind === "hotdog_cart")?.qty).toBe(1);
    expect(visitor.play.warehouse.items.find((i) => i.kind === "hotdogs")?.qty).toBeGreaterThan(0);
    expect(placeStand(visitor, land, plot.id).ok).toBe(false);
    expect(placeStand(visitor, land, plot.id).reason).toBe("in_warehouse");
    expect(playSnapshot(visitor, land).cartNeeds[0]?.label).toMatch(/Bring to me/);
    expect(withdrawWarehouse(visitor, "hotdog_cart").ok).toBe(true);
    expect(placeStand(visitor, land, plot.id).ok).toBe(true);
  });

  it("sells the lot, packs the cart, and refunds the tile", () => {
    const { land, visitor, plot } = leaseCheapSouth();
    const paid = plot.price;
    expect(orderMarket(visitor, land, { skus: ["hotdog_cart"], dest: "warehouse" }).ok).toBe(true);
    expect(withdrawWarehouse(visitor, "hotdog_cart").ok).toBe(true);
    expect(placeStand(visitor, land, plot.id).ok).toBe(true);
    const cash = visitor.cash;
    const sold = sellVisitorPlot(visitor, land, plot.id);
    expect(sold.ok).toBe(true);
    if (!sold.ok) return;
    expect(sold.refunded).toBe(paid);
    expect(sold.packed).toBe(1);
    expect(plot.owner).toBeNull();
    expect(visitor.play.stands).toHaveLength(0);
    expect(visitor.play.warehouse.items.find((i) => i.kind === "hotdog_cart")?.qty).toBe(1);
    expect(visitor.cash).toBeCloseTo(cash + paid, 4);
  });

  it("sells warehouse stock at the catalog PAPER price after a confirm", () => {
    const { land, visitor } = leaseCheapSouth();
    expect(orderMarket(visitor, land, { skus: ["hotdog_cart"], dest: "warehouse" }).ok).toBe(true);
    const cash = visitor.cash;
    const sold = sellWarehouse(visitor, "hotdog_cart");
    expect(sold.ok).toBe(true);
    if (!sold.ok) return;
    expect(sold.paid).toBe(CART_PRICES.fruit.kit);
    expect(visitor.cash).toBeCloseTo(cash + CART_PRICES.fruit.kit, 4);
    expect(visitor.play.warehouse.items.find((i) => i.kind === "hotdog_cart")).toBeUndefined();
    const empty = sellWarehouse(visitor, "hotdog_cart");
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.reason).toBe("empty_warehouse");
  });
});
