import { describe, expect, it } from "vitest";
import { createLandBoard, leasePlot, STARTER_CASH } from "./land.ts";
import { SOUTH_PORT, southSpawnPad } from "./southGeom.ts";
import { createVisitor, createWorld } from "./sim.ts";
import {
  BUILDING_LAND_PRICE,
  TICKS_PER_SIM_HOUR,
  UNIT_ROOM_PRICE,
  UNIT_SLICE_FAUCET,
} from "./economy.ts";
import { serializeShard, restoreShard } from "./persist.ts";
import {
  DELIVERY_WAIT_MS,
  hireStand,
  markArrived,
  orderMarket,
  placeStand,
  playSnapshot,
  recallStaleDeliveries,
  stockStand,
  takeAll,
  tickHotdogSales,
  tickPlay,
} from "./firstLoop.ts";
import {
  UNIT_BUILDINGS,
  buyBuildingLand,
  buyRoom,
  fireUnitRole,
  fitUnitKit,
  hireUnitRole,
  pickupUnitKit,
  placeUnitKit,
  scoutTenant,
  signLease,
} from "./units.ts";

const QUAY_LEFT = "quay-shops-0-0";
const QUAY_RIGHT = "quay-shops-0-1";
const STRAND = "strand-flats-0-0";
const OFFICE = "mixed-house-2-0";

function ripeVisitor() {
  const land = createLandBoard();
  const visitor = createVisitor(UNIT_SLICE_FAUCET);
  return { land, visitor };
}

describe("units scripts (alpha 0.5)", () => {
  it("authors three buildings and nine rooms on lots next to spawn", () => {
    const { visitor } = ripeVisitor();
    const rooms = UNIT_BUILDINGS.flatMap((b) => b.rooms);
    expect(UNIT_BUILDINGS).toHaveLength(3);
    expect(rooms).toHaveLength(9);
    expect(visitor.play.units).toHaveLength(9);
    const land = createLandBoard();
    const snap = playSnapshot(visitor, land);
    expect(snap.units.buildings).toHaveLength(3);
    expect(snap.units.leaseHours).toEqual({ min: 3, max: 168 });
    expect(UNIT_BUILDINGS.map((b) => b.floors)).toEqual([1, 2, 3]);
    const spawn = southSpawnPad();
    const quay = UNIT_BUILDINGS.find((b) => b.id === "quay-shops")!;
    expect(Math.hypot(quay.x - spawn.x, quay.z - spawn.z)).toBeLessThan(40);
    for (const b of UNIT_BUILDINGS) {
      expect(Math.hypot(b.x - spawn.x, b.z - spawn.z)).toBeLessThan(80);
      expect(b.plotId).toBe("south-unit-" + b.id);
      const plot = land.plots.find((p) => p.id === b.plotId);
      expect(plot).toBeTruthy();
      expect(plot!.buildingId).toBe(b.id);
      expect(plot!.price).toBe(BUILDING_LAND_PRICE);
      expect(Math.hypot(plot!.x - b.x, plot!.z - b.z)).toBeLessThan(1);
      expect(leasePlot(land, visitor, plot!.id).reason).toBe("building_lot");
    }
    for (let i = 0; i < UNIT_BUILDINGS.length; i++) {
      for (let j = i + 1; j < UNIT_BUILDINGS.length; j++) {
        const a = UNIT_BUILDINGS[i]!;
        const b = UNIT_BUILDINGS[j]!;
        expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(16);
      }
    }
    const hwy = land.roads.find(
      (r) =>
        r.name === "Island Hwy" &&
        r.cls === "highway" &&
        r.points.some((p) => Math.hypot(p.x - SOUTH_PORT.x, p.z - SOUTH_PORT.z) < 8),
    );
    expect(hwy).toBeTruthy();
    const pts = hwy!.points;
    for (const b of UNIT_BUILDINGS) {
      let min = Infinity;
      for (let i = 0; i < pts.length - 1; i++) {
        const ax = pts[i]!.x;
        const az = pts[i]!.z;
        const bx = pts[i + 1]!.x;
        const bz = pts[i + 1]!.z;
        const dx = bx - ax;
        const dz = bz - az;
        const l2 = dx * dx + dz * dz || 1;
        let t = ((b.x - ax) * dx + (b.z - az) * dz) / l2;
        t = Math.max(0, Math.min(1, t));
        min = Math.min(min, Math.hypot(b.x - (ax + t * dx), b.z - (az + t * dz)));
      }
      expect(min).toBeGreaterThan(16);
    }
  });

  it("lets live starter cash buy a flat and a shop, not the dirt", () => {
    const visitor = createVisitor(STARTER_CASH);
    expect(STARTER_CASH).toBe(10_000);
    expect(buyRoom(visitor, STRAND).ok).toBe(true);
    expect(buyRoom(visitor, QUAY_LEFT).ok).toBe(true);
    expect(buyBuildingLand(visitor, "quay-shops").reason).toBe("no_cash");
  });

  it("lets $10k buy a room but not the dirt", () => {
    const { visitor } = ripeVisitor();
    expect(buyBuildingLand(visitor, "quay-shops").reason).toBe("no_cash");
    expect(visitor.cash).toBe(UNIT_SLICE_FAUCET);
    const buy = buyRoom(visitor, QUAY_LEFT);
    expect(buy.ok).toBe(true);
    if (!buy.ok) return;
    expect(visitor.cash).toBe(UNIT_SLICE_FAUCET - UNIT_ROOM_PRICE.shop);
    expect(buy.unit.owner).toBe("visitor");
    expect(visitor.play.units.find((u) => u.id === QUAY_RIGHT)?.owner).toBeNull();
    expect(playSnapshot(visitor, createLandBoard()).units.buildings.find((b) => b.id === "quay-shops")?.canManage).toBe(
      true,
    );
    expect(playSnapshot(visitor, createLandBoard()).units.buildings.find((b) => b.id === "strand-flats")?.canManage).toBe(
      false,
    );
    visitor.cash = BUILDING_LAND_PRICE;
    const board = createLandBoard();
    expect(buyBuildingLand(visitor, "quay-shops", board.plots).ok).toBe(true);
    expect(visitor.play.buildingLands.find((b) => b.buildingId === "quay-shops")?.owner).toBe("visitor");
    expect(board.plots.find((p) => p.buildingId === "quay-shops")?.owner).toBe("visitor");
  });

  it("fills a quay shop from the crate only when a packer is hired, and sells only with a till", () => {
    const { land, visitor } = ripeVisitor();
    expect(buyRoom(visitor, QUAY_LEFT).ok).toBe(true);
    expect(visitor.play.units.find((u) => u.id === QUAY_RIGHT)?.owner).toBeNull();

    const packed = orderMarket(visitor, land, { skus: ["hotdogs"], dest: "unit", unitId: QUAY_LEFT });
    expect(packed.ok).toBe(true);
    if (!packed.ok) return;
    expect(packed.delivery.dest).toBe("unit");
    expect(packed.delivery.unitId).toBe(QUAY_LEFT);
    expect(markArrived(visitor, packed.delivery.id).ok).toBe(true);

    expect(hireUnitRole(visitor, QUAY_LEFT, "packer").ok).toBe(true);
    const afterHire = visitor.cash;
    const site = visitor.play.workSites.find((s) => s.unitId === QUAY_LEFT)!;
    expect(site.stock).toBe(0);
    expect(hireStand(visitor, site.id).reason).toBe("unit_role");

    tickPlay(visitor, land, 1);
    expect(site.stock).toBe(2);
    expect(visitor.cash).toBe(afterHire);

    for (let i = 0; i < 12; i++) tickPlay(visitor, land, 2 + i);
    expect(site.stock).toBe(20);
    expect(visitor.cash).toBe(afterHire);

    expect(hireUnitRole(visitor, QUAY_LEFT, "till").ok).toBe(true);
    const beforeTill = visitor.cash;
    for (let i = 0; i < 80; i++) tickHotdogSales(visitor, land);
    expect(visitor.cash).toBeGreaterThan(beforeTill);
    expect(site.unitsSold).toBeGreaterThan(0);

    expect(fireUnitRole(visitor, QUAY_LEFT, "packer").ok).toBe(true);
    const sitting = orderMarket(visitor, land, { skus: ["hotdogs"], dest: "unit", unitId: QUAY_LEFT });
    expect(sitting.ok).toBe(true);
    if (!sitting.ok) return;
    expect(markArrived(visitor, sitting.delivery.id).ok).toBe(true);
    const crateQty = sitting.delivery.items.reduce((n, i) => n + i.qty, 0);
    tickPlay(visitor, land, 20);
    const still = visitor.play.deliveries.find((d) => d.id === sitting.delivery.id);
    expect(still).toBeTruthy();
    expect(still!.items.reduce((n, i) => n + i.qty, 0)).toBe(crateQty);
  });

  it("keeps the cart fruit loop on one hired vendor after a room is owned", () => {
    const { land, visitor } = ripeVisitor();
    expect(buyRoom(visitor, QUAY_LEFT).ok).toBe(true);
    const site = visitor.play.workSites.find((s) => s.unitId === QUAY_LEFT)!;
    expect(hireStand(visitor, site.id).reason).toBe("unit_role");

    const pad = land.plots.find((p) => p.class === "cart_pad" && !p.owner)!;
    expect(leasePlot(land, visitor, pad.id).ok).toBe(true);
    const order = orderMarket(visitor, land, { plotId: pad.id, skus: ["hotdog_cart", "hotdogs"] });
    expect(order.ok).toBe(true);
    if (!order.ok) return;
    takeAll(visitor, order.delivery.id);
    const placed = placeStand(visitor, land, pad.id);
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(stockStand(visitor, placed.stand.id).ok).toBe(true);
    expect(hireStand(visitor, placed.stand.id).ok).toBe(true);
    const cash0 = visitor.cash;
    for (let i = 0; i < 40; i++) tickHotdogSales(visitor, land);
    expect(visitor.cash).toBeGreaterThan(cash0);
    expect(placed.stand.unitsSold).toBeGreaterThan(0);
    expect(placed.stand.hired).toBe(true);
    expect(site.tillHired).toBe(false);
  });

  it("scouts poor profiles on an empty flat and pays rent on the signed hours", () => {
    const { land, visitor } = ripeVisitor();
    expect(buyRoom(visitor, STRAND).ok).toBe(true);
    const empty = scoutTenant(visitor, STRAND);
    expect(empty.ok).toBe(true);
    if (!empty.ok) return;
    expect(empty.offers.length).toBeGreaterThanOrEqual(1);
    expect(empty.offers.length).toBeLessThanOrEqual(3);
    expect(empty.offers.every((o) => o.band === "poor")).toBe(true);
    expect(empty.offers.every((o) => o.hours >= 3 && o.hours <= 24)).toBe(true);
    expect(empty.offers.every((o) => o.who && o.tenantId)).toBe(true);
    const booksEmpty = playSnapshot(visitor, land).books.sites.find((s) => s.standId === `unit-${STRAND}`);
    expect(booksEmpty?.vacantNote).toMatch(/Empty room/);
    expect(booksEmpty?.rentNote).toMatch(/Scout/);

    expect(fitUnitKit(visitor, STRAND, "bed").ok).toBe(true);
    const mid = scoutTenant(visitor, STRAND);
    expect(mid.ok).toBe(true);
    if (!mid.ok) return;
    expect(mid.offers.every((o) => o.band === "mid")).toBe(true);

    expect(fitUnitKit(visitor, STRAND, "shower").ok).toBe(true);
    expect(fitUnitKit(visitor, STRAND, "sink").ok).toBe(true);
    const high = scoutTenant(visitor, STRAND);
    expect(high.ok).toBe(true);
    if (!high.ok) return;
    expect(high.offers.every((o) => o.band === "high")).toBe(true);
    expect(high.offers.every((o) => o.hours >= 48 && o.hours <= 168)).toBe(true);
    const pick = high.offers[0]!;
    expect(signLease(visitor, STRAND, pick.tenantId, 0).ok).toBe(true);
    const cash0 = visitor.cash;
    tickPlay(visitor, land, TICKS_PER_SIM_HOUR);
    expect(visitor.cash).toBeGreaterThan(cash0);
    const books = playSnapshot(visitor, land).books.sites.find((s) => s.siteClass === "apartment" && s.hired);
    expect(books).toBeTruthy();
    expect(books?.rentNote).toMatch(/sim hours/);
    tickPlay(visitor, land, pick.hours * TICKS_PER_SIM_HOUR);
    expect(visitor.play.units.find((u) => u.id === STRAND)?.lease).toBeNull();
  });

  it("places furniture from inventory, not the warehouse", () => {
    const { visitor } = ripeVisitor();
    expect(buyRoom(visitor, STRAND).ok).toBe(true);
    expect(placeUnitKit(visitor, STRAND, "bed").reason).toBe("no_kit");
    visitor.play.warehouse.items.push({ kind: "bed", qty: 1, mode: "PAPER", provenance: "SIMULATED" });
    expect(placeUnitKit(visitor, STRAND, "bed").reason).toBe("in_warehouse");
    visitor.play.warehouse.items = [];
    visitor.play.inventory.push({ kind: "bed", qty: 1, mode: "PAPER", provenance: "SIMULATED" });
    expect(placeUnitKit(visitor, STRAND, "bed").ok).toBe(true);
    expect(visitor.play.inventory.find((i) => i.kind === "bed")).toBeUndefined();
    expect(visitor.play.units.find((u) => u.id === STRAND)?.kit).toContain("bed");
    expect(pickupUnitKit(visitor, STRAND, "bed").ok).toBe(true);
    expect(visitor.play.warehouse.items.find((i) => i.kind === "bed")?.qty).toBe(1);
    expect(visitor.play.units.find((u) => u.id === STRAND)?.kit).not.toContain("bed");
  });

  it("charges ground rent to the game bank when the dirt is unowned", () => {
    const { land, visitor } = ripeVisitor();
    expect(buyRoom(visitor, QUAY_LEFT).ok).toBe(true);
    const cash0 = visitor.cash;
    const bank0 = visitor.play.gameBank;
    tickPlay(visitor, land, 3600);
    expect(visitor.cash).toBe(cash0 - 8);
    expect(visitor.play.gameBank).toBe(bank0 + 8);
  });

  it("round-trips owned rooms through the PAPER persist blob", () => {
    const world = createWorld();
    const land = createLandBoard();
    const visitor = createVisitor(UNIT_SLICE_FAUCET);
    expect(buyRoom(visitor, QUAY_LEFT).ok).toBe(true);
    const blob = serializeShard({ world, land, visitor });
    expect(blob.visitor.play?.units.find((u) => u.id === QUAY_LEFT)?.owner).toBe("visitor");
    const restored = restoreShard(blob);
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.visitor.play.units.find((u) => u.id === QUAY_LEFT)?.owner).toBe("visitor");
    expect(restored.visitor.play.units.find((u) => u.id === QUAY_RIGHT)?.owner).toBeNull();
    expect(restored.visitor.play.units).toHaveLength(9);
  });

  it("skips ground rent when the visitor owns the dirt", () => {
    const { land, visitor } = ripeVisitor();
    expect(buyRoom(visitor, QUAY_LEFT).ok).toBe(true);
    visitor.cash = BUILDING_LAND_PRICE;
    expect(buyBuildingLand(visitor, "quay-shops").ok).toBe(true);
    const cash0 = visitor.cash;
    const bank0 = visitor.play.gameBank;
    tickPlay(visitor, land, 3600);
    expect(visitor.cash).toBe(cash0);
    expect(visitor.play.gameBank).toBe(bank0);
  });

  it("scouts a fitted office on the same lease clock", () => {
    const { land, visitor } = ripeVisitor();
    expect(buyRoom(visitor, OFFICE).ok).toBe(true);
    const empty = scoutTenant(visitor, OFFICE);
    expect(empty.ok).toBe(true);
    if (!empty.ok) return;
    expect(empty.offers.every((o) => o.band === "poor")).toBe(true);
    expect(fitUnitKit(visitor, OFFICE, "desk").ok).toBe(true);
    expect(fitUnitKit(visitor, OFFICE, "cabinet").ok).toBe(true);
    const scouted = scoutTenant(visitor, OFFICE);
    expect(scouted.ok).toBe(true);
    if (!scouted.ok) return;
    expect(scouted.offers[0]!.tenantName).toMatch(/clerk|Harbour|Channel|ledger|filings|firm/i);
    expect(scouted.offers.every((o) => o.band === "high")).toBe(true);
    const pick = scouted.offers[0]!;
    expect(signLease(visitor, OFFICE, pick.tenantId, 0).ok).toBe(true);
    const cash0 = visitor.cash;
    tickPlay(visitor, land, TICKS_PER_SIM_HOUR);
    expect(visitor.cash).toBeGreaterThan(cash0);
    const books = playSnapshot(visitor, land).books.sites.find((s) => s.standId === `unit-${OFFICE}`);
    expect(books?.siteClass).toBe("office");
    expect(books?.hired).toBe(true);
    expect(books?.rentNote).toMatch(pick.tenantName);
  });

  it("warehouses a stale unit crate after 60s", () => {
    const { land, visitor } = ripeVisitor();
    expect(buyRoom(visitor, QUAY_LEFT).ok).toBe(true);
    const packed = orderMarket(visitor, land, { skus: ["hotdogs"], dest: "unit", unitId: QUAY_LEFT });
    expect(packed.ok).toBe(true);
    if (!packed.ok) return;
    expect(markArrived(visitor, packed.delivery.id).ok).toBe(true);
    const qty = packed.delivery.items.reduce((n, i) => n + i.qty, 0);
    recallStaleDeliveries(visitor, Date.now() + DELIVERY_WAIT_MS + 1);
    expect(visitor.play.deliveries.find((d) => d.id === packed.delivery.id)).toBeUndefined();
    expect(visitor.play.warehouse.items.find((i) => i.kind === "hotdogs")?.qty).toBe(qty);
  });

  it("feeds shop kit into the existing siteScore, not a second meter", () => {
    const { land, visitor } = ripeVisitor();
    expect(buyRoom(visitor, QUAY_LEFT).ok).toBe(true);
    const site = visitor.play.workSites.find((s) => s.unitId === QUAY_LEFT)!;
    site.stock = 8;
    site.tillHired = true;
    site.hired = true;
    const bare = playSnapshot(visitor, land).workSites.find((s) => s.unitId === QUAY_LEFT)!;
    expect(fitUnitKit(visitor, QUAY_LEFT, "shelf").ok).toBe(true);
    expect(fitUnitKit(visitor, QUAY_LEFT, "till").ok).toBe(true);
    expect(fitUnitKit(visitor, QUAY_LEFT, "fridge").ok).toBe(true);
    const fitted = playSnapshot(visitor, land).workSites.find((s) => s.unitId === QUAY_LEFT)!;
    expect(fitted.parts.some((p) => p.id === "shelf" && p.points === 1)).toBe(true);
    expect(fitted.parts.some((p) => p.id === "fridge" && p.points === 1.5)).toBe(true);
    expect(fitted.desirability).toBeGreaterThan(bare.desirability);
    expect(fitted.trafficBand).not.toBe("red");
  });

  it("puts two quay shops on two Books rows", () => {
    const { land, visitor } = ripeVisitor();
    expect(buyRoom(visitor, QUAY_LEFT).ok).toBe(true);
    expect(buyRoom(visitor, QUAY_RIGHT).ok).toBe(true);
    const shops = playSnapshot(visitor, land).books.sites.filter((s) => s.siteClass === "shop");
    expect(shops).toHaveLength(2);
    expect(shops.map((s) => s.label).sort()).toEqual(["Quay shop left", "Quay shop right"]);
  });
});
