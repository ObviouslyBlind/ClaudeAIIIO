/**
 * Authored harbour buildings and buyable rooms.
 * PAPER / SIMULATED. Alpha 0.5 scripts. No mesh, no dollhouse.
 */

import {
  BUILDING_LAND_PRICE,
  GROUND_RENT_PER_UNIT_DAY,
  HIRE_COST,
  HOTDOG_SALE_PRICE,
  LEASE_HOURS_MAX,
  LEASE_HOURS_MIN,
  PACKER_MOVE_PER_TICK,
  TICKS_PER_SIM_HOUR,
  UNIT_KIT,
  UNIT_ROOM_PRICE,
} from "./economy.ts";
import { TICKS_PER_SIM_DAY } from "./calendar.ts";
import { UNIT_PRECINCT, UNIT_ROW_YAW, unitLotPose, unitPlotId } from "./unitPrecinct.ts";
import { appealFor } from "./siteScore.ts";
import type { Delivery, InvKind, LoopFail, LoopOk, PlayState, WorkSite } from "./firstLoop.ts";

export const UNITS_NOTE = "PAPER units. SIMULATED. Rooms inside a building.";

export type UnitUse = "shop" | "apartment" | "office";
export type TenantBand = "poor" | "mid" | "high";
export type UnitRole = "packer" | "till";

export type UnitVisitor = { cash: number; play: PlayState };

export type UnitLease = {
  tenantId: string;
  tenantName: string;
  who: string;
  band: TenantBand;
  hours: number;
  startTick: number;
  endTick: number;
  rentPerHour: number;
  lastPaidHour: number;
};

export type TenantProfile = {
  tenantId: string;
  tenantName: string;
  who: string;
  band: TenantBand;
  hours: number;
  rentPerHour: number;
};

export type HarbourUnit = {
  id: string;
  buildingId: string;
  floor: number;
  room: number;
  use: UnitUse;
  label: string;
  owner: "visitor" | null;
  kit: string[];
  lease: UnitLease | null;
  offers: TenantProfile[];
  price: number;
  mode: "PAPER";
  provenance: "SIMULATED";
};

export type BuildingLand = {
  buildingId: string;
  owner: "visitor" | null;
  price: number;
  lastRentDay: number;
};

export type BuildingSpec = {
  id: string;
  name: string;
  floors: number;
  x: number;
  z: number;
  plotId: string;
  rooms: { floor: number; room: number; use: UnitUse; label: string }[];
};

const SHOP_STOCK: InvKind[] = ["hotdogs", "melon", "fish_chips"];

const UNIT_ROOMS: Record<string, BuildingSpec["rooms"]> = {
  "quay-shops": [
    { floor: 0, room: 0, use: "shop", label: "Quay shop left" },
    { floor: 0, room: 1, use: "shop", label: "Quay shop right" },
  ],
  "strand-flats": [
    { floor: 0, room: 0, use: "apartment", label: "Strand flat G-L" },
    { floor: 0, room: 1, use: "apartment", label: "Strand flat G-R" },
    { floor: 1, room: 0, use: "apartment", label: "Strand flat 1-L" },
    { floor: 1, room: 1, use: "apartment", label: "Strand flat 1-R" },
  ],
  "mixed-house": [
    { floor: 0, room: 0, use: "shop", label: "Mixed house shop" },
    { floor: 1, room: 0, use: "apartment", label: "Mixed house flat" },
    { floor: 2, room: 0, use: "office", label: "Mixed house office" },
  ],
};

/**
 * Three shells on buyable lots next to the $750 spawn pads.
 * 1 / 2 / 3 storeys in a row. Dirt is the lot; rooms are separate buys.
 */
export const UNIT_BUILDINGS: BuildingSpec[] = UNIT_PRECINCT.map((row) => {
  const pose = unitLotPose(row.index);
  return {
    id: row.id,
    name: row.name,
    floors: row.floors,
    x: pose.x,
    z: pose.z,
    plotId: unitPlotId(row.id),
    rooms: UNIT_ROOMS[row.id]!,
  };
});

function roundMoney(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function fail(reason: string): LoopFail {
  return { ok: false, reason, mode: "PAPER", provenance: "SIMULATED", note: UNITS_NOTE };
}

function ok<T>(extra: T): LoopOk<T> {
  return { ...extra, ok: true, mode: "PAPER", provenance: "SIMULATED", note: UNITS_NOTE };
}

function roomId(buildingId: string, floor: number, room: number): string {
  return `${buildingId}-${floor}-${room}`;
}

function emptyUnit(building: BuildingSpec, spec: BuildingSpec["rooms"][number]): HarbourUnit {
  return {
    id: roomId(building.id, spec.floor, spec.room),
    buildingId: building.id,
    floor: spec.floor,
    room: spec.room,
    use: spec.use,
    label: spec.label,
    owner: null,
    kit: [],
    lease: null,
    offers: [],
    price: UNIT_ROOM_PRICE[spec.use],
    mode: "PAPER",
    provenance: "SIMULATED",
  };
}

export function buildingById(id: string): BuildingSpec | undefined {
  return UNIT_BUILDINGS.find((b) => b.id === id);
}

export function seedUnits(play: PlayState): PlayState {
  if (!play.units) play.units = [];
  if (!play.buildingLands) play.buildingLands = [];
  if (!play.warehouse) {
    play.warehouse = { items: [], feePerDay: 5, island: "south", lastRentDay: -1 };
  }
  if (!play.inventory) play.inventory = [];
  for (const building of UNIT_BUILDINGS) {
    if (!play.buildingLands.some((row) => row.buildingId === building.id)) {
      play.buildingLands.push({
        buildingId: building.id,
        owner: null,
        price: BUILDING_LAND_PRICE,
        lastRentDay: -1,
      });
    }
    for (const spec of building.rooms) {
      const id = roomId(building.id, spec.floor, spec.room);
      if (!play.units.some((u) => u.id === id)) play.units.push(emptyUnit(building, spec));
    }
  }
  for (const unit of play.units) normalizeUnit(unit);
  return play;
}

function normalizeUnit(unit: HarbourUnit): HarbourUnit {
  if (!Array.isArray(unit.offers)) unit.offers = [];
  if (!Array.isArray(unit.kit)) unit.kit = [];
  return unit;
}

export function getUnit(play: PlayState, unitId: string): HarbourUnit | undefined {
  seedUnits(play);
  const unit = play.units.find((u) => u.id === unitId);
  return unit ? normalizeUnit(unit) : undefined;
}

export function isFurnitureKit(kind: string): boolean {
  return UNIT_KIT.some((row) => row.id === kind);
}

export function furnitureAisle(kind: string): "shopfit" | "hospitality" | null {
  const row = UNIT_KIT.find((k) => k.id === kind);
  return row ? row.aisle : null;
}

export function canManageBuilding(play: PlayState, buildingId: string): boolean {
  seedUnits(play);
  return play.units.some((u) => u.buildingId === buildingId && u.owner === "visitor");
}

export function requiredKit(use: UnitUse): string[] {
  return UNIT_KIT.filter((row) => row.use === use).map((row) => row.id);
}

/** Kit checklist is not a scout gate. Empty rooms still draw poor profiles. */
export function kitComplete(unit: HarbourUnit): boolean {
  const need = requiredKit(unit.use);
  return need.length > 0 && need.every((id) => unit.kit.includes(id));
}

export function unitKitAppeal(unit: HarbourUnit): number {
  return roundMoney((unit.kit || []).reduce((n, id) => n + appealFor(id), 0));
}

export function tenantBandFromAppeal(appeal: number): TenantBand {
  if (appeal >= 2.5) return "high";
  if (appeal >= 1) return "mid";
  return "poor";
}

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function rngFrom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function pickRange(rand: () => number, lo: number, hi: number): number {
  return lo + Math.floor(rand() * (hi - lo + 1));
}

const TENANT_POOL: Record<UnitUse, Record<TenantBand, { name: string; who: string }[]>> = {
  apartment: {
    poor: [
      { name: "Jo Kettle", who: "Dock clerk on short hours" },
      { name: "Ned Pallet", who: "Night watch on the quay" },
    ],
    mid: [
      { name: "Mina Quay", who: "Student over the shops" },
      { name: "Reed Cart", who: "Ferry ticket clerk" },
    ],
    high: [
      { name: "P. Vellum", who: "Small firm, long lease" },
      { name: "Isla Bollard", who: "Harbour accountant" },
    ],
  },
  office: {
    poor: [
      { name: "Solo clerk", who: "One-desk ledger" },
      { name: "Night ledger", who: "After-hours bookkeeping" },
    ],
    mid: [
      { name: "Strand ledger", who: "Two-person firm" },
      { name: "Quay filings", who: "Harbour paperwork" },
    ],
    high: [
      { name: "Harbour clerk", who: "Harbour firm, week-long" },
      { name: "Channel & Co.", who: "Small shipping office" },
    ],
  },
  shop: {
    poor: [],
    mid: [],
    high: [],
  },
};

function hoursForBand(band: TenantBand, rand: () => number): number {
  if (band === "poor") return pickRange(rand, LEASE_HOURS_MIN, 24);
  if (band === "mid") return pickRange(rand, 12, 72);
  return pickRange(rand, 48, LEASE_HOURS_MAX);
}

function rentForBand(band: TenantBand, use: UnitUse, appeal: number, rand: () => number): number {
  const office = use === "office" ? 0.6 : 0;
  if (band === "poor") return roundMoney(0.5 + office + rand() * 1.0);
  if (band === "mid") return roundMoney(1.6 + office + appeal * 0.4 + rand() * 1.4);
  return roundMoney(4 + office + appeal * 0.8 + rand() * 3);
}

export function unitDeliveryTarget(
  play: PlayState,
  unitId: string,
): { unitId: string; buildingId: string; x: number; z: number; plotId: string } | null {
  const unit = getUnit(play, unitId);
  if (!unit || unit.owner !== "visitor" || unit.use !== "shop") return null;
  const building = buildingById(unit.buildingId);
  if (!building) return null;
  return {
    unitId: unit.id,
    buildingId: unit.buildingId,
    x: building.x,
    z: building.z,
    plotId: `unit:${unit.id}`,
  };
}

function unitWorkSiteId(unitId: string): string {
  return `unit-site-${unitId}`;
}

function ensureShopSite(play: PlayState, unit: HarbourUnit): WorkSite {
  let site = play.workSites.find((s) => s.unitId === unit.id);
  if (site) {
    site.label = unit.label;
    site.use = unit.use;
    return site;
  }
  site = {
    id: unitWorkSiteId(unit.id),
    plotId: `unit:${unit.id}`,
    island: "south",
    siteClass: "shop",
    use: "shop",
    label: unit.label,
    stock: 0,
    hired: false,
    staffId: null,
    staffName: null,
    stickerPrice: HOTDOG_SALE_PRICE,
    storageCap: 20,
    upgraded: false,
    upgrades: [],
    sellAcc: 0,
    boostLeft: 0,
    stockId: "hotdogs",
    games: ["Till run"],
    unitsSold: 0,
    unitId: unit.id,
    buildingId: unit.buildingId,
    floor: unit.floor,
    room: unit.room,
    packerHired: false,
    tillHired: false,
    packerStaffId: null,
    packerStaffName: null,
    mode: "PAPER",
    provenance: "SIMULATED",
  };
  play.workSites.push(site);
  return site;
}

export function buyRoom(
  visitor: UnitVisitor,
  unitId: string,
): LoopOk<{ unit: HarbourUnit }> | LoopFail {
  const play = seedUnits(visitor.play);
  const unit = getUnit(play, unitId);
  if (!unit) return fail("no_unit");
  if (unit.owner) return fail("owned");
  if (visitor.cash < unit.price) return fail("no_cash");
  visitor.cash = roundMoney(visitor.cash - unit.price);
  play.gameBank = roundMoney((play.gameBank || 0) + unit.price);
  unit.owner = "visitor";
  if (unit.use === "shop") ensureShopSite(play, unit);
  return ok({ unit });
}

export function buyBuildingLand(
  visitor: UnitVisitor,
  buildingId: string,
  plots?: { buildingId?: string; owner: string | null }[],
): LoopOk<{ land: BuildingLand }> | LoopFail {
  const play = seedUnits(visitor.play);
  if (!buildingById(buildingId)) return fail("no_building");
  const land = play.buildingLands.find((row) => row.buildingId === buildingId);
  if (!land) return fail("no_building");
  if (land.owner) return fail("owned");
  if (visitor.cash < land.price) return fail("no_cash");
  visitor.cash = roundMoney(visitor.cash - land.price);
  play.gameBank = roundMoney((play.gameBank || 0) + land.price);
  land.owner = "visitor";
  const plot = (plots || []).find((p) => p.buildingId === buildingId);
  if (plot) plot.owner = "visitor";
  return ok({ land });
}

export function hireUnitRole(
  visitor: UnitVisitor,
  unitId: string,
  role: string,
): LoopOk<{ site: WorkSite; role: UnitRole }> | LoopFail {
  const play = seedUnits(visitor.play);
  const unit = getUnit(play, unitId);
  if (!unit || unit.owner !== "visitor") return fail("not_yours");
  if (unit.use !== "shop") return fail("not_shop");
  if (role !== "packer" && role !== "till") return fail("bad_role");
  const site = ensureShopSite(play, unit);
  if (role === "packer") {
    if (site.packerHired) return fail("already_hired");
    if (visitor.cash < HIRE_COST) return fail("no_cash");
    visitor.cash = roundMoney(visitor.cash - HIRE_COST);
    play.gameBank = roundMoney((play.gameBank || 0) + HIRE_COST);
    site.packerHired = true;
    site.packerStaffId = "packer";
    site.packerStaffName = "Packer";
    return ok({ site, role: "packer" });
  }
  if (site.tillHired || site.hired) return fail("already_hired");
  if (visitor.cash < HIRE_COST) return fail("no_cash");
  visitor.cash = roundMoney(visitor.cash - HIRE_COST);
  play.gameBank = roundMoney((play.gameBank || 0) + HIRE_COST);
  site.tillHired = true;
  site.hired = true;
  site.staffId = "till";
  site.staffName = "Till";
  return ok({ site, role: "till" });
}

export function fireUnitRole(
  visitor: UnitVisitor,
  unitId: string,
  role: string,
): LoopOk<{ site: WorkSite; role: UnitRole }> | LoopFail {
  const play = seedUnits(visitor.play);
  const unit = getUnit(play, unitId);
  if (!unit || unit.owner !== "visitor") return fail("not_yours");
  const site = play.workSites.find((s) => s.unitId === unit.id);
  if (!site) return fail("no_site");
  if (role !== "packer" && role !== "till") return fail("bad_role");
  if (role === "packer") {
    if (!site.packerHired) return fail("not_hired");
    site.packerHired = false;
    site.packerStaffId = null;
    site.packerStaffName = null;
    return ok({ site, role: "packer" });
  }
  if (!site.tillHired && !site.hired) return fail("not_hired");
  site.tillHired = false;
  site.hired = false;
  site.staffId = null;
  site.staffName = null;
  return ok({ site, role: "till" });
}

function takeInvKit(play: PlayState, kitId: InvKind, qty = 1): boolean {
  const have = play.inventory.find((row) => row.kind === kitId);
  if (!have || have.qty < qty) return false;
  have.qty = roundMoney(have.qty - qty);
  if (have.qty <= 0) play.inventory.splice(play.inventory.indexOf(have), 1);
  return true;
}

function warehouseHas(play: PlayState, kitId: InvKind): boolean {
  return (play.warehouse.items.find((row) => row.kind === kitId)?.qty ?? 0) >= 1;
}

function addWarehouseKit(play: PlayState, kitId: InvKind, qty = 1): void {
  const have = play.warehouse.items.find((row) => row.kind === kitId);
  if (have) have.qty = roundMoney(have.qty + qty);
  else play.warehouse.items.push({ kind: kitId, qty, mode: "PAPER", provenance: "SIMULATED" });
}

/** Test helper: cash-buy kit into the room. Live play Places from inventory. */
export function fitUnitKit(
  visitor: UnitVisitor,
  unitId: string,
  kitId: string,
): LoopOk<{ unit: HarbourUnit }> | LoopFail {
  const play = seedUnits(visitor.play);
  const unit = getUnit(play, unitId);
  if (!unit || unit.owner !== "visitor") return fail("not_yours");
  const spec = UNIT_KIT.find((row) => row.id === kitId);
  if (!spec) return fail("unknown_kit");
  if (spec.use !== unit.use) return fail("wrong_use");
  if (unit.kit.includes(kitId)) return fail("already_fitted");
  if (visitor.cash < spec.cost) return fail("no_cash");
  visitor.cash = roundMoney(visitor.cash - spec.cost);
  play.gameBank = roundMoney((play.gameBank || 0) + spec.cost);
  unit.kit = [...unit.kit, kitId];
  return ok({ unit });
}

/** Place a Shopfit / Hospitality piece from inventory onto an owned room. */
export function placeUnitKit(
  visitor: UnitVisitor,
  unitId: string,
  kitId: string,
): LoopOk<{ unit: HarbourUnit }> | LoopFail {
  const play = seedUnits(visitor.play);
  const unit = getUnit(play, unitId);
  if (!unit || unit.owner !== "visitor") return fail("not_yours");
  const spec = UNIT_KIT.find((row) => row.id === kitId);
  if (!spec) return fail("unknown_kit");
  if (spec.use !== unit.use) return fail("wrong_use");
  if (unit.kit.includes(kitId)) return fail("already_fitted");
  const kind = kitId as InvKind;
  if (!takeInvKit(play, kind)) {
    return fail(warehouseHas(play, kind) ? "in_warehouse" : "no_kit");
  }
  unit.kit = [...unit.kit, kitId];
  return ok({ unit });
}

export function pickupUnitKit(
  visitor: UnitVisitor,
  unitId: string,
  kitId: string,
): LoopOk<{ unit: HarbourUnit; kitId: string }> | LoopFail {
  const play = seedUnits(visitor.play);
  const unit = getUnit(play, unitId);
  if (!unit || unit.owner !== "visitor") return fail("not_yours");
  if (!unit.kit.includes(kitId)) return fail("not_fitted");
  unit.kit = unit.kit.filter((id) => id !== kitId);
  addWarehouseKit(play, kitId as InvKind);
  return ok({ unit, kitId });
}

export function scoutTenant(
  visitor: UnitVisitor,
  unitId: string,
): LoopOk<{ unit: HarbourUnit; offers: TenantProfile[] }> | LoopFail {
  const play = seedUnits(visitor.play);
  const unit = getUnit(play, unitId);
  if (!unit || unit.owner !== "visitor") return fail("not_yours");
  if (unit.use !== "apartment" && unit.use !== "office") return fail("not_lease");
  if (unit.lease) return fail("occupied");
  const appeal = unitKitAppeal(unit);
  const band = tenantBandFromAppeal(appeal);
  const rand = rngFrom(hash32(`${unit.id}:${unit.kit.join(",")}:${band}`));
  const pool = TENANT_POOL[unit.use][band];
  const n = 1 + Math.floor(rand() * 3);
  const offers: TenantProfile[] = [];
  const used = new Set<string>();
  for (let i = 0; i < n; i++) {
    let pick = pool[Math.floor(rand() * pool.length)]!;
    let guard = 0;
    while (used.has(pick.name) && guard < 6) {
      pick = pool[Math.floor(rand() * pool.length)]!;
      guard += 1;
    }
    used.add(pick.name);
    offers.push({
      tenantId: `${unit.id}-${band}-${i}`,
      tenantName: pick.name,
      who: pick.who,
      band,
      hours: hoursForBand(band, rand),
      rentPerHour: rentForBand(band, unit.use, appeal, rand),
    });
  }
  unit.offers = offers;
  return ok({ unit, offers });
}

export function signLease(
  visitor: UnitVisitor,
  unitId: string,
  tenantId: string,
  tick = 0,
): LoopOk<{ unit: HarbourUnit; lease: UnitLease }> | LoopFail {
  const play = seedUnits(visitor.play);
  const unit = getUnit(play, unitId);
  if (!unit || unit.owner !== "visitor") return fail("not_yours");
  if (unit.lease) return fail("occupied");
  const profile = (unit.offers || []).find((row) => row.tenantId === tenantId);
  if (!profile) return fail("no_offer");
  if (profile.hours < LEASE_HOURS_MIN || profile.hours > LEASE_HOURS_MAX) return fail("bad_hours");
  const lease: UnitLease = {
    tenantId: profile.tenantId,
    tenantName: profile.tenantName,
    who: profile.who,
    band: profile.band,
    hours: profile.hours,
    startTick: tick,
    endTick: tick + profile.hours * TICKS_PER_SIM_HOUR,
    rentPerHour: profile.rentPerHour,
    lastPaidHour: -1,
  };
  unit.lease = lease;
  unit.offers = [];
  return ok({ unit, lease });
}

function takeFromCrate(items: Delivery["items"], kind: InvKind, qty: number): number {
  const row = items.find((i) => i.kind === kind);
  if (!row || row.qty < 1) return 0;
  const got = Math.min(qty, row.qty);
  row.qty = roundMoney(row.qty - got);
  return got;
}

function tickPacker(play: PlayState): void {
  for (const site of play.workSites) {
    if (!site.unitId || !site.packerHired) continue;
    let room = Math.max(0, site.storageCap - site.stock);
    if (room <= 0) continue;
    let moved = 0;
    for (const crate of play.deliveries) {
      if (moved >= PACKER_MOVE_PER_TICK) break;
      if (crate.dest !== "unit" || crate.unitId !== site.unitId) continue;
      if (crate.status !== "arrived") continue;
      for (const kind of SHOP_STOCK) {
        if (moved >= PACKER_MOVE_PER_TICK || room <= 0) break;
        const want = Math.min(PACKER_MOVE_PER_TICK - moved, room);
        const got = takeFromCrate(crate.items, kind, want);
        if (got <= 0) continue;
        site.stock = roundMoney(site.stock + got);
        site.stockId = kind;
        room -= got;
        moved += got;
      }
    }
  }
  play.deliveries = play.deliveries.filter((d) => {
    if (d.dest !== "unit") return true;
    return d.items.some((i) => i.qty > 0);
  });
}

function tickLeases(visitor: UnitVisitor, tick: number): void {
  const play = visitor.play;
  const hour = Math.floor(tick / TICKS_PER_SIM_HOUR);
  for (const unit of play.units) {
    const lease = unit.lease;
    if (!lease) continue;
    if (tick >= lease.endTick) {
      unit.lease = null;
      continue;
    }
    if (hour <= 0) continue;
    if (hour <= lease.lastPaidHour) continue;
    const paid = lease.rentPerHour;
    visitor.cash = roundMoney(visitor.cash + paid);
    lease.lastPaidHour = hour;
  }
}

function tickGroundRent(visitor: UnitVisitor, tick: number): void {
  const play = visitor.play;
  const day = Math.floor(tick / TICKS_PER_SIM_DAY);
  if (day <= 0) return;
  for (const land of play.buildingLands) {
    if (day <= land.lastRentDay) continue;
    const occupied = play.units.filter((u) => u.buildingId === land.buildingId && u.owner === "visitor");
    land.lastRentDay = day;
    if (!occupied.length) continue;
    if (land.owner === "visitor") continue;
    const fee = occupied.length * GROUND_RENT_PER_UNIT_DAY;
    if (visitor.cash < fee) continue;
    visitor.cash = roundMoney(visitor.cash - fee);
    play.gameBank = roundMoney((play.gameBank || 0) + fee);
  }
}

export function tickUnits(visitor: UnitVisitor, tick: number): void {
  seedUnits(visitor.play);
  tickPacker(visitor.play);
  tickLeases(visitor, tick);
  tickGroundRent(visitor, tick);
}

export function unitsSnapshot(play: PlayState) {
  seedUnits(play);
  return {
    mode: "PAPER" as const,
    provenance: "SIMULATED" as const,
    note: UNITS_NOTE,
    leaseHours: { min: LEASE_HOURS_MIN, max: LEASE_HOURS_MAX },
    kit: UNIT_KIT.map((row) => ({ ...row })),
    roomPrice: { ...UNIT_ROOM_PRICE },
    landPrice: BUILDING_LAND_PRICE,
    buildings: UNIT_BUILDINGS.map((b) => {
      const land = play.buildingLands.find((row) => row.buildingId === b.id)!;
      const rooms = play.units.filter((u) => u.buildingId === b.id);
      return {
        id: b.id,
        name: b.name,
        floors: b.floors,
        x: b.x,
        z: b.z,
        plotId: b.plotId,
        yaw: UNIT_ROW_YAW,
        landOwner: land.owner,
        landPrice: land.price,
        canManage: rooms.some((u) => u.owner === "visitor"),
        rooms: rooms.map((u) => ({
          ...u,
          vacant: !u.owner,
          appeal: unitKitAppeal(u),
          band: tenantBandFromAppeal(unitKitAppeal(u)),
        })),
      };
    }),
  };
}
