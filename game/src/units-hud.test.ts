import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  findBuilding,
  floorLetter,
  floorName,
  formatBuildingSheet,
  formatOrderDests,
  ownedShopUnits,
  ownsBuildingDirt,
} from "../public/harbour/units-hud.js";
import { formatSiteMenu } from "../public/harbour/site-menu.js";
import { formatHireSheet, listBusinesses, peopleLine } from "../public/harbour/hire-sheet.js";
import { buildingKerbPose, KERB_DUMP_M, mountUnitBlocks, roomBoxCount, TAG_ABOVE_M, TAG_DEPTH_TEST } from "../public/harbour/unit-blocks.js";
import { createKitMesh } from "../public/harbour/unit-kit.js";
import { createVisitor } from "./sim.ts";
import { createLandBoard } from "./land.ts";
import { UNIT_ROOM_PRICE, UNIT_SLICE_FAUCET } from "./economy.ts";
import { playSnapshot } from "./firstLoop.ts";
import { buyRoom as purchaseRoom, fitUnitKit, scoutTenant, signLease, UNIT_BUILDINGS } from "./units.ts";
import { southSpawnPad } from "./southGeom.ts";

const QUAY = "quay-shops-0-0";
const QUAY_RIGHT = "quay-shops-0-1";

function snapWithCash(cash = UNIT_SLICE_FAUCET) {
  const visitor = createVisitor(cash);
  const land = createLandBoard();
  return { visitor, land, play: playSnapshot(visitor, land) };
}

describe("units 0.5.1 systems (placeholders, not façades)", () => {
  it("lists three buildings and nine rooms on the play snapshot", () => {
    const { play } = snapWithCash();
    expect(play.units.buildings).toHaveLength(3);
    expect(play.units.buildings.flatMap((b) => b.rooms)).toHaveLength(9);
    expect(findBuilding(play, "quay-shops")?.name).toBe("Quay Shops");
    expect(play.units.buildings.map((b) => b.floors)).toEqual([1, 2, 3]);
    expect(play.units.buildings.every((b) => b.plotId && b.plotId.startsWith("south-unit-"))).toBe(true);
  });

  it("keeps vacant rooms as confirm tiles, not instant buys or landlord dirt", () => {
    const { play } = snapWithCash();
    const html = formatBuildingSheet(play, { buildingId: "quay-shops", view: "root" });
    expect(html).toContain("Quay Shops");
    expect(html).toContain("buy-tile");
    expect(html).toContain(`data-ask-unit="${QUAY}"`);
    expect(html).not.toContain("data-buy-unit=");
    expect(html).not.toContain("data-buy-land=");
    expect(html).not.toContain("Buy this land");
    expect(html).toContain("Buy is a confirm");
    expect(html).toContain("Floor:");
    expect(html).toContain(`<b>${floorLetter(0)}</b>`);
    expect(html).toContain("data-floor-dir");
    expect(html).not.toContain("View Ground floor");
    expect(html).toContain("RMB-hold orbit");
    expect(html).toContain("Buy the dirt · $15,000");
    expect(html).toContain('data-ask-land="quay-shops"');
    expect(html).toContain("bottom of the screen");
    expect(html).not.toContain("data-exit-room");
    expect(ownsBuildingDirt(play)).toBe(false);
    expect(floorName(0)).toBe("Ground floor");
    const landlord = formatBuildingSheet(play, { view: "landlord" });
    expect(landlord).toContain("Landlord");
    expect(landlord).toContain("$15,000.00");
    expect(landlord).toContain('data-ask-land="quay-shops"');
    expect(landlord).toMatch(/data-ask-land="quay-shops"[^>]*disabled/);
    expect(landlord).toContain("You do not need this to run a room");
    const pointed = formatBuildingSheet(play, { buildingId: "quay-shops", view: "sale", unitId: QUAY });
    expect(pointed).toContain("buy-tile is-on");
    expect(pointed).toContain("Selected");
  });

  it("sells one quay room and leaves the sibling vacant", () => {
    const { visitor, land } = snapWithCash();
    expect(purchaseRoom(visitor, QUAY).ok).toBe(true);
    const play = playSnapshot(visitor, land);
    expect(play.units.buildings.find((b) => b.id === "quay-shops")?.canManage).toBe(true);
    expect(play.units.buildings.find((b) => b.id === "strand-flats")?.canManage).toBe(false);
    const buy = formatBuildingSheet(play, { buildingId: "quay-shops", view: "buy", floor: 0 });
    expect(buy).toContain(`data-enter-unit="${QUAY}"`);
    expect(buy).toContain("Owned");
    expect(buy).toContain(`data-ask-unit="${QUAY_RIGHT}"`);
    expect(buy).toContain(`<b>${floorLetter(0)}</b>`);
    const root = formatBuildingSheet(play, { buildingId: "quay-shops", view: "root" });
    expect(root).toContain(`data-enter-unit="${QUAY}"`);
    expect(root).toContain("own-tile");
    const mixed = formatBuildingSheet(play, { buildingId: "mixed-house", view: "root", floor: 0 });
    expect(mixed).toContain(`<b>G</b>`);
    expect(mixed).toContain("data-floor-dir");
    expect(mixed).toContain("Mixed house shop");
    expect(mixed).not.toContain("Mixed house office");
    const upstairs = formatBuildingSheet(play, { buildingId: "mixed-house", view: "root", floor: 2 });
    expect(upstairs).toContain(`<b>2</b>`);
    expect(upstairs).toContain("Mixed house office");
    expect(upstairs).not.toContain("Mixed house shop");
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
    expect(html).toContain("Hire a packer");
    expect(html).toContain("Hire a till worker");
    expect(html).toContain('data-unit-role="packer"');
    expect(html).toContain('data-unit-role="till"');
    expect(html).toContain("crate sits");
    expect(html).toContain("not Shopfit furniture");
  });

  it("lists the unit shop on Hire with two roles", () => {
    const { visitor, land } = snapWithCash();
    expect(purchaseRoom(visitor, QUAY).ok).toBe(true);
    const play = playSnapshot(visitor, land);
    const site = play.workSites.find((s) => s.unitId === QUAY);
    expect(listBusinesses(play).some((s) => s.unitId === QUAY)).toBe(true);
    expect(peopleLine(site)).toBe("No one hired");
    const html = formatHireSheet(play, { selectedId: site.id });
    expect(html).toContain("Hire a packer");
    expect(html).toContain("Hire a till worker");
  });

  it("plants nine placeholder boxes with unit-block picks", () => {
    const { play } = snapWithCash();
    const scene = new THREE.Scene();
    const blocks = mountUnitBlocks({ scene, heightAt: () => 1.28 });
    expect(blocks.sync(play)).toBe(9);
    expect(roomBoxCount(play.units.buildings)).toBe(9);
    expect(scene.getObjectByName("unit-blocks")).toBeTruthy();
    const quay = scene.getObjectByName("unit-" + QUAY);
    expect(quay.userData.kind).toBe("unit-block");
    expect(quay.userData.buildingId).toBe("quay-shops");
    expect(blocks.clickables()).toHaveLength(0);
    expect(scene.getObjectByName("unit-label-strand-flats")).toBeTruthy();
    expect(scene.getObjectByName("unit-label-strand-flats").visible).toBe(false);
    expect(scene.getObjectByName("unit-pad-quay-shops")).toBeFalsy();
    blocks.setViewer({ propertiesOn: true, overlay: "world" });
    expect(scene.getObjectByName("unit-label-strand-flats").visible).toBe(true);
    expect(blocks.clickables().length).toBeGreaterThanOrEqual(9);
    blocks.setViewer({ propertiesOn: false, overlay: "lots" });
    expect(blocks.clickables()).toHaveLength(0);
    blocks.highlight(QUAY);
    expect(blocks.getHighlight()).toBe(QUAY);
    expect(quay.material.color.getHex()).toBe(0x3dcc6a);
    expect(TAG_DEPTH_TEST).toBe(false);
    expect(TAG_ABOVE_M).toBeGreaterThan(3);
    const tag = scene.getObjectByName("unit-label-strand-flats");
    expect(tag.material.depthTest).toBe(false);
    expect(tag.position.y).toBeGreaterThan(quay.position.y + 3);
    const yaw = play.units.buildings.find((b) => b.id === "quay-shops").yaw;
    expect(quay.rotation.y).toBeCloseTo(yaw, 5);
    const right = scene.getObjectByName("unit-" + QUAY_RIGHT);
    const along = Math.hypot(right.position.x - quay.position.x, right.position.z - quay.position.z);
    expect(along).toBeGreaterThan(5);
  });

  it("sits the test block next to south spawn and plants kit boxes", () => {
    const spawn = southSpawnPad();
    for (const b of UNIT_BUILDINGS) {
      expect(Math.hypot(b.x - spawn.x, b.z - spawn.z)).toBeLessThan(80);
    }
    const quay = UNIT_BUILDINGS.find((b) => b.id === "quay-shops");
    expect(Math.hypot(quay.x - spawn.x, quay.z - spawn.z)).toBeLessThan(40);
    const { visitor, land } = snapWithCash();
    expect(purchaseRoom(visitor, "strand-flats-0-0").ok).toBe(true);
    expect(fitUnitKit(visitor, "strand-flats-0-0", "bed").ok).toBe(true);
    const play = playSnapshot(visitor, land);
    const scene = new THREE.Scene();
    const blocks = mountUnitBlocks({ scene, heightAt: () => 1.28 });
    blocks.sync(play);
    const bed = scene.getObjectByName("unit-kit-strand-flats-0-0-bed");
    expect(bed).toBeTruthy();
    expect(bed.children.length).toBeGreaterThan(4);
    const lone = createKitMesh("fridge");
    expect(lone.children.length).toBeGreaterThan(3);
  });

  it("plants a tenant body in a signed room", () => {
    const { visitor, land } = snapWithCash();
    expect(purchaseRoom(visitor, "strand-flats-0-0").ok).toBe(true);
    const scouted = scoutTenant(visitor, "strand-flats-0-0");
    expect(scouted.ok).toBe(true);
    if (!scouted.ok) return;
    expect(signLease(visitor, "strand-flats-0-0", scouted.offers[0].tenantId, 0).ok).toBe(true);
    const play = playSnapshot(visitor, land);
    const scene = new THREE.Scene();
    const blocks = mountUnitBlocks({ scene, heightAt: () => 1.28 });
    blocks.sync(play);
    const tenant = scene.getObjectByName("unit-tenant-strand-flats-0-0");
    expect(tenant).toBeTruthy();
    expect(tenant.visible).toBe(false);
    blocks.applyCutaway({ buildingId: "strand-flats", floor: 0, unitId: "strand-flats-0-0" });
    expect(tenant.visible).toBe(true);
  });

  it("puts an owned shop on Books", () => {
    const { visitor, land } = snapWithCash();
    expect(purchaseRoom(visitor, QUAY).ok).toBe(true);
    const play = playSnapshot(visitor, land);
    expect(play.books.sites.some((s) => s.siteClass === "shop" && s.label.includes("Quay"))).toBe(true);
  });

  it("starts live spawn at $10,000 so a shop room is buyable", () => {
    expect(UNIT_ROOM_PRICE.shop).toBeGreaterThan(1000);
    expect(UNIT_ROOM_PRICE.shop).toBeLessThan(10_000);
    const { play } = snapWithCash(10_000);
    expect(play.cash).toBe(10_000);
    const shop = formatBuildingSheet(play, { buildingId: "quay-shops", view: "buy", floor: 0 });
    expect(shop).not.toMatch(/data-ask-unit="quay-shops-0-0"[^>]*disabled/);
    expect(shop).toContain("$1,200.00");
    expect(shop).toContain("buy-tile");
    const root = formatBuildingSheet(play, { buildingId: "quay-shops", view: "root" });
    expect(root).toContain("Point at a vacant room");
    expect(root).not.toContain("data-buy-land=");
    const broke = formatBuildingSheet(snapWithCash(1000).play, { buildingId: "quay-shops", view: "buy", floor: 0 });
    expect(broke).toMatch(/data-ask-unit="quay-shops-0-0"[^>]*disabled/);
    expect(broke).toContain("Need $1,200.00");
  });

  it("opens an owned shop on the room sheet with kit, not a skipped site card", () => {
    const { visitor, land } = snapWithCash();
    expect(purchaseRoom(visitor, QUAY).ok).toBe(true);
    const play = playSnapshot(visitor, land);
    const html = formatBuildingSheet(play, { buildingId: "quay-shops", view: "room", unitId: QUAY });
    expect(html).toContain("Shopfit");
    expect(html).toContain("Inventory Place");
    expect(html).not.toContain("data-fit-kit");
    expect(html).toContain("Hire a packer");
    expect(html).toContain("Hire a till worker");
    expect(html).toContain('data-unit-hire="');
    expect(html).toContain("Open site card");
    expect(html).toContain("Unhired packer");
    expect(html).toContain("not a Shopfit SKU");
    expect(html).not.toContain("data-exit-room");
  });

  it("kits and scouts a flat from manage", () => {
    const { visitor, land } = snapWithCash();
    expect(purchaseRoom(visitor, "strand-flats-0-0").ok).toBe(true);
    const play = playSnapshot(visitor, land);
    const manage = formatBuildingSheet(play, { buildingId: "strand-flats", view: "manage", floor: 0 });
    expect(manage).toContain(`<b>G</b>`);
    expect(manage).toContain("data-floor-dir");
    expect(manage).toContain('data-enter-unit="strand-flats-0-0"');
    const room = formatBuildingSheet(play, {
      buildingId: "strand-flats",
      view: "room",
      unitId: "strand-flats-0-0",
    });
    expect(room).toContain("Scout tenants");
    expect(room).toContain("Empty room still scouts poor profiles");
    expect(room).not.toContain("data-fit-kit");
    expect(room).not.toContain("Empty room = no takers");
    expect(room).not.toContain("data-exit-room");
    expect(room).toContain("Place furniture from inventory");
  });

  it("dumps a body onto the kerb in front of the shell, toward the port", () => {
    const quay = UNIT_BUILDINGS.find((b) => b.id === "quay-shops");
    const pose = buildingKerbPose(quay, () => 1.28);
    expect(Math.hypot(pose.x - quay.x, pose.z - quay.z)).toBeCloseTo(KERB_DUMP_M, 5);
    const port = { x: -2280, z: 7280 };
    const at = Math.hypot(pose.x - port.x, pose.z - port.z);
    const centre = Math.hypot(quay.x - port.x, quay.z - port.z);
    expect(at).toBeLessThan(centre);
    expect(pose.y).toBe(1.28);
  });
});
