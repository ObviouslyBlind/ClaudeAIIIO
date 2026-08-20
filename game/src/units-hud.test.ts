import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  findBuilding,
  floorName,
  formatBuildingSheet,
  formatOrderDests,
  ownedShopUnits,
} from "../public/harbour/units-hud.js";
import { formatSiteMenu } from "../public/harbour/site-menu.js";
import { formatHireSheet, listBusinesses, peopleLine } from "../public/harbour/hire-sheet.js";
import { mountUnitBlocks, roomBoxCount } from "../public/harbour/unit-blocks.js";
import { createVisitor } from "./sim.ts";
import { createLandBoard } from "./land.ts";
import { UNIT_ROOM_PRICE, UNIT_SLICE_FAUCET } from "./economy.ts";
import { playSnapshot } from "./firstLoop.ts";
import { buyRoom as purchaseRoom, fitUnitKit, UNIT_BUILDINGS } from "./units.ts";
import { southSpawnPad } from "./southGeom.ts";

const QUAY = "quay-shops-0-0";
const QUAY_RIGHT = "quay-shops-0-1";

function snapWithCash(cash = UNIT_SLICE_FAUCET) {
  const visitor = createVisitor(cash);
  const land = createLandBoard();
  return { visitor, land, play: playSnapshot(visitor, land) };
}

describe("units 0.5.1 systems (placeholders, not façades)", () => {
  it("lists four buildings and thirteen rooms on the play snapshot", () => {
    const { play } = snapWithCash();
    expect(play.units.buildings).toHaveLength(4);
    expect(play.units.buildings.flatMap((b) => b.rooms)).toHaveLength(13);
    expect(findBuilding(play, "quay-shops")?.name).toBe("Quay Shops");
  });

  it("keeps Manage grey until you own a room in that building", () => {
    const { play } = snapWithCash();
    const html = formatBuildingSheet(play, { buildingId: "quay-shops", view: "root" });
    expect(html).toContain("Quay Shops");
    expect(html).toContain("data-unit-view=\"buy\"");
    expect(html).toMatch(/data-unit-view="manage"[^>]*disabled/);
    expect(html).toContain("Buy this land");
    expect(html).toContain("$15,000.00");
    expect(html).toMatch(/data-buy-land="quay-shops"[^>]*disabled/);
  });

  it("sells one quay room and leaves the sibling vacant", () => {
    const { visitor, land } = snapWithCash();
    expect(purchaseRoom(visitor, QUAY).ok).toBe(true);
    const play = playSnapshot(visitor, land);
    expect(play.units.buildings.find((b) => b.id === "quay-shops")?.canManage).toBe(true);
    expect(play.units.buildings.find((b) => b.id === "strand-flats")?.canManage).toBe(false);
    const buy = formatBuildingSheet(play, { buildingId: "quay-shops", view: "buy", floor: 0 });
    expect(buy).toContain(`data-buy-unit="${QUAY}"`);
    expect(buy).toContain("Owned");
    expect(buy).toContain(`data-buy-unit="${QUAY_RIGHT}"`);
    expect(buy).toContain(floorName(0));
    const root = formatBuildingSheet(play, { buildingId: "quay-shops", view: "root" });
    expect(root).not.toMatch(/data-unit-view="manage"[^>]*disabled/);
  });

  it("offers This room as a market dest only for owned shop units", () => {
    const empty = snapWithCash().play;
    expect(ownedShopUnits(empty)).toHaveLength(0);
    expect(formatOrderDests(empty, "road", "")).toContain("Bring to me");
    expect(formatOrderDests(empty, "road", "")).toContain("Warehouse");
    expect(formatOrderDests(empty, "road", "")).not.toContain("This room");
    const { visitor, land } = snapWithCash();
    expect(purchaseRoom(visitor, QUAY).ok).toBe(true);
    const play = playSnapshot(visitor, land);
    const dest = formatOrderDests(play, "unit", QUAY);
    expect(dest).toContain("This room · Quay shop left");
    expect(dest).toContain(`data-order-unit="${QUAY}"`);
    expect(dest).not.toContain("Quay shop right");
  });

  it("puts packer and till on the shop Run tab, not one vendor", () => {
    const { visitor, land } = snapWithCash();
    expect(purchaseRoom(visitor, QUAY).ok).toBe(true);
    const play = playSnapshot(visitor, land);
    const site = play.workSites.find((s) => s.unitId === QUAY);
    expect(site).toBeTruthy();
    const html = formatSiteMenu(site, play, "run");
    expect(html).toContain("Hire packer");
    expect(html).toContain("Hire till");
    expect(html).toContain('data-unit-role="packer"');
    expect(html).toContain('data-unit-role="till"');
    expect(html).toContain("crate sits");
  });

  it("lists the unit shop on Hire with two roles", () => {
    const { visitor, land } = snapWithCash();
    expect(purchaseRoom(visitor, QUAY).ok).toBe(true);
    const play = playSnapshot(visitor, land);
    const site = play.workSites.find((s) => s.unitId === QUAY);
    expect(listBusinesses(play).some((s) => s.unitId === QUAY)).toBe(true);
    expect(peopleLine(site)).toBe("No one hired");
    const html = formatHireSheet(play, { selectedId: site.id });
    expect(html).toContain("Hire packer");
    expect(html).toContain("Hire till");
  });

  it("plants thirteen placeholder boxes with unit-block picks", () => {
    const { play } = snapWithCash();
    const scene = new THREE.Scene();
    const blocks = mountUnitBlocks({ scene, heightAt: () => 1.28 });
    expect(blocks.sync(play)).toBe(13);
    expect(roomBoxCount(play.units.buildings)).toBe(13);
    expect(scene.getObjectByName("unit-blocks")).toBeTruthy();
    const quay = scene.getObjectByName("unit-" + QUAY);
    expect(quay.userData.kind).toBe("unit-block");
    expect(quay.userData.buildingId).toBe("quay-shops");
    expect(blocks.clickables().length).toBeGreaterThanOrEqual(13);
    expect(scene.getObjectByName("unit-label-strand-flats")).toBeTruthy();
  });

  it("sits the test block next to south spawn and plants kit boxes", () => {
    const spawn = southSpawnPad();
    for (const b of UNIT_BUILDINGS) {
      expect(Math.hypot(b.x - spawn.x, b.z - spawn.z)).toBeLessThan(80);
    }
    const strand = UNIT_BUILDINGS.find((b) => b.id === "strand-flats");
    expect(Math.hypot(strand.x - spawn.x, strand.z - spawn.z)).toBeLessThan(40);
    const { visitor, land } = snapWithCash();
    expect(purchaseRoom(visitor, "strand-flats-0-0").ok).toBe(true);
    expect(fitUnitKit(visitor, "strand-flats-0-0", "bed").ok).toBe(true);
    const play = playSnapshot(visitor, land);
    const scene = new THREE.Scene();
    const blocks = mountUnitBlocks({ scene, heightAt: () => 1.28 });
    blocks.sync(play);
    expect(scene.getObjectByName("unit-kit-strand-flats-0-0-bed")).toBeTruthy();
  });

  it("puts an owned shop on Books", () => {
    const { visitor, land } = snapWithCash();
    expect(purchaseRoom(visitor, QUAY).ok).toBe(true);
    const play = playSnapshot(visitor, land);
    expect(play.books.sites.some((s) => s.siteClass === "shop" && s.label.includes("Quay"))).toBe(true);
  });

  it("does not change live starter cash", () => {
    expect(UNIT_ROOM_PRICE.shop).toBeGreaterThan(1000);
    const { play } = snapWithCash(1000);
    expect(play.cash).toBe(1000);
    const shop = formatBuildingSheet(play, { buildingId: "quay-shops", view: "buy", floor: 0 });
    expect(shop).toMatch(/data-buy-unit="quay-shops-0-0"[^>]*disabled/);
    expect(shop).toContain("Need $1,200.00");
    const flat = formatBuildingSheet(play, { buildingId: "strand-flats", view: "buy", floor: 0 });
    expect(flat).not.toMatch(/data-buy-unit="strand-flats-0-0"[^>]*disabled/);
    expect(flat).toContain("Buy $900.00");
    const root = formatBuildingSheet(play, { buildingId: "strand-flats", view: "root" });
    expect(root).toContain("You can buy a room here.");
  });

  it("opens an owned shop on the room sheet with kit, not a skipped site card", () => {
    const { visitor, land } = snapWithCash();
    expect(purchaseRoom(visitor, QUAY).ok).toBe(true);
    const play = playSnapshot(visitor, land);
    const html = formatBuildingSheet(play, { buildingId: "quay-shops", view: "room", unitId: QUAY });
    expect(html).toContain("Shelf");
    expect(html).toContain("Fridge");
    expect(html).toContain("Till");
    expect(html).toContain("Open site card");
    expect(html).toContain("Packer fills the shelf");
  });

  it("kits and scouts a flat from manage", () => {
    const { visitor, land } = snapWithCash();
    expect(purchaseRoom(visitor, "strand-flats-0-0").ok).toBe(true);
    const play = playSnapshot(visitor, land);
    const manage = formatBuildingSheet(play, { buildingId: "strand-flats", view: "manage", floor: 0 });
    expect(manage).toContain("Ground floor");
    expect(manage).toContain('data-unit-room="strand-flats-0-0"');
    const room = formatBuildingSheet(play, {
      buildingId: "strand-flats",
      view: "room",
      unitId: "strand-flats-0-0",
    });
    expect(room).toContain("Bed");
    expect(room).toContain("Scout tenants");
    expect(room).toContain("Empty room = no takers");
  });
});
