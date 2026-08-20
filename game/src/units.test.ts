import { describe, expect, it } from "vitest";
import { createLandBoard } from "./land.ts";
import { createVisitor, createWorld } from "./sim.ts";
import {
  BUILDING_LAND_PRICE,
  HIRE_COST,
  UNIT_ROOM_PRICE,
  UNIT_SLICE_FAUCET,
} from "./economy.ts";
import { serializeShard, restoreShard } from "./persist.ts";
import {
  hireStand,
  markArrived,
  orderMarket,
  playSnapshot,
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
  scoutTenant,
  signLease,
} from "./units.ts";

const QUAY_LEFT = "quay-shops-0-0";
const QUAY_RIGHT = "quay-shops-0-1";
const STRAND = "strand-flats-0-0";

function ripeVisitor() {
  const land = createLandBoard();
  const visitor = createVisitor(UNIT_SLICE_FAUCET);
  return { land, visitor };
}

describe("units scripts (alpha 0.5)", () => {
  it("authors four buildings and thirteen rooms", () => {
    const { visitor } = ripeVisitor();
    const rooms = UNIT_BUILDINGS.flatMap((b) => b.rooms);
    expect(UNIT_BUILDINGS).toHaveLength(4);
    expect(rooms).toHaveLength(13);
    expect(visitor.play.units).toHaveLength(13);
    expect(playSnapshot(visitor, createLandBoard()).units.buildings).toHaveLength(4);
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
    expect(buyBuildingLand(visitor, "quay-shops").ok).toBe(true);
    expect(visitor.play.buildingLands.find((b) => b.buildingId === "quay-shops")?.owner).toBe("visitor");
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

  it("keeps the cart fruit loop on one hired vendor", () => {
    const { land, visitor } = ripeVisitor();
    expect(buyRoom(visitor, QUAY_LEFT).ok).toBe(true);
    expect(visitor.play.units.find((u) => u.id === QUAY_LEFT)?.owner).toBe("visitor");
    expect(visitor.play.stands).toHaveLength(0);
  });

  it("scouts a fitted flat and pays rent on the sim-hour clock", () => {
    const { land, visitor } = ripeVisitor();
    expect(buyRoom(visitor, STRAND).ok).toBe(true);
    expect(scoutTenant(visitor, STRAND).reason).toBe("no_takers");
    expect(fitUnitKit(visitor, STRAND, "bed").ok).toBe(true);
    expect(fitUnitKit(visitor, STRAND, "shower").ok).toBe(true);
    expect(fitUnitKit(visitor, STRAND, "sink").ok).toBe(true);
    const scouted = scoutTenant(visitor, STRAND);
    expect(scouted.ok).toBe(true);
    if (!scouted.ok) return;
    expect(signLease(visitor, STRAND, 3, 0).ok).toBe(true);
    const cash0 = visitor.cash;
    tickPlay(visitor, land, 150);
    expect(visitor.cash).toBeGreaterThan(cash0);
    tickPlay(visitor, land, 3 * 150);
    expect(visitor.play.units.find((u) => u.id === STRAND)?.lease).toBeNull();
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
    expect(restored.visitor.play.units).toHaveLength(13);
  });
});
