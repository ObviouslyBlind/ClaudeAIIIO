/**
 * Authored harbour buildings and buyable rooms.
 * PAPER / SIMULATED. Alpha 0.5 scripts. No mesh, no dollhouse.
 */

import {
  BUILDING_LAND_PRICE,
  GROUND_RENT_PER_UNIT_DAY,
  HIRE_COST,
  HOTDOG_SALE_PRICE,
  LEASE_HOURS,
  PACKER_MOVE_PER_TICK,
  TICKS_PER_SIM_HOUR,
  UNIT_KIT,
  UNIT_ROOM_PRICE,
} from "./economy.ts";
import { TICKS_PER_SIM_DAY } from "./calendar.ts";
import { SOUTH_PORT } from "./southGeom.ts";
import type { Delivery, InvKind, LoopFail, LoopOk, PlayState, WorkSite } from "./firstLoop.ts";

export const UNITS_NOTE = "PAPER units. SIMULATED. Rooms inside a building.";

export type UnitUse = "shop" | "apartment" | "office";
export type LeaseHours = (typeof LEASE_HOURS)[number];
export type UnitRole = "packer" | "till";

export type UnitVisitor = { cash: number; play: PlayState };

export type UnitLease = {
  tenantId: string;
  tenantName: string;
  hours: LeaseHours;
  startTick: number;
  endTick: number;
  rentPerHour: number;
  lastPaidHour: number;
};

export type TenantOffer = {
  tenantId: string;
  tenantName: string;
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
  offer: TenantOffer | null;
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
  rooms: { floor: number; room: number; use: UnitUse; label: string }[];
};

const SHOP_STOCK: InvKind[] = ["hotdogs", "melon", "fish_chips"];

/**
 * First-frame cluster, inland of Island Hwy, in the south spawn look.
 * Strand Flats ($900) is closest. Spawn is $10,000 so a shop is buyable too.
 */
export const UNIT_BUILDINGS: BuildingSpec[] = [
  {
    id: "strand-flats",
    name: "Strand Flats",
    floors: 2,
    x: SOUTH_PORT.x + 28,
    z: SOUTH_PORT.z + 10,
    rooms: [
      { floor: 0, room: 0, use: "apartment", label: "Strand flat G-L" },
      { floor: 0, room: 1, use: "apartment", label: "Strand flat G-R" },
      { floor: 1, room: 0, use: "apartment", label: "Strand flat 1-L" },
      { floor: 1, room: 1, use: "apartment", label: "Strand flat 1-R" },
    ],
  },
  {
    id: "quay-shops",
    name: "Quay Shops",
    floors: 1,
    x: SOUTH_PORT.x + 44,
    z: SOUTH_PORT.z + 12,
    rooms: [
      { floor: 0, room: 0, use: "shop", label: "Quay shop left" },
      { floor: 0, room: 1, use: "shop", label: "Quay shop right" },
    ],
  },
  {
    id: "mixed-house",
    name: "Mixed House",
    floors: 3,
    x: SOUTH_PORT.x + 34,
    z: SOUTH_PORT.z + 22,
    rooms: [
      { floor: 0, room: 0, use: "shop", label: "Mixed house shop" },
      { floor: 1, room: 0, use: "apartment", label: "Mixed house flat" },
      { floor: 2, room: 0, use: "office", label: "Mixed house office" },
    ],
  },
  {
    id: "harbour-offices",
    name: "Harbour Offices",
    floors: 2,
    x: SOUTH_PORT.x + 52,
    z: SOUTH_PORT.z + 22,
    rooms: [
      { floor: 0, room: 0, use: "office", label: "Harbour office G-L" },
      { floor: 0, room: 1, use: "office", label: "Harbour office G-R" },
      { floor: 1, room: 0, use: "office", label: "Harbour office 1-L" },
      { floor: 1, room: 1, use: "office", label: "Harbour office 1-R" },
    ],
  },
];

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
    offer: null,
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
  return play;
}

export function getUnit(play: PlayState, unitId: string): HarbourUnit | undefined {
  seedUnits(play);
  return play.units.find((u) => u.id === unitId);
}

export function canManageBuilding(play: PlayState, buildingId: string): boolean {
  seedUnits(play);
  return play.units.some((u) => u.buildingId === buildingId && u.owner === "visitor");
}

export function requiredKit(use: UnitUse): string[] {
  return UNIT_KIT.filter((row) => row.use === use).map((row) => row.id);
}

/** Empty or partial kit = no takers. Bed+shower+sink / desk+cabinet = a tenant. */
export function kitComplete(unit: HarbourUnit): boolean {
  const need = requiredKit(unit.use);
  return need.length > 0 && need.every((id) => unit.kit.includes(id));
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

function rentPerHour(unit: HarbourUnit): number {
  const base = unit.use === "office" ? 3 : 2;
  return roundMoney(base + unit.kit.length * 1.5);
}

export function scoutTenant(
  visitor: UnitVisitor,
  unitId: string,
): LoopOk<{ unit: HarbourUnit; offer: TenantOffer }> | LoopFail {
  const play = seedUnits(visitor.play);
  const unit = getUnit(play, unitId);
  if (!unit || unit.owner !== "visitor") return fail("not_yours");
  if (unit.use !== "apartment" && unit.use !== "office") return fail("not_lease");
  if (unit.lease) return fail("occupied");
  if (!kitComplete(unit)) return fail("no_takers");
  const offer: TenantOffer = {
    tenantId: unit.use === "office" ? "firm-harbour" : "npc-tenant",
    tenantName: unit.use === "office" ? "Harbour clerk" : "Quay tenant",
    rentPerHour: rentPerHour(unit),
  };
  unit.offer = offer;
  return ok({ unit, offer });
}

export function signLease(
  visitor: UnitVisitor,
  unitId: string,
  hours: number,
  tick = 0,
): LoopOk<{ unit: HarbourUnit; lease: UnitLease }> | LoopFail {
  const play = seedUnits(visitor.play);
  const unit = getUnit(play, unitId);
  if (!unit || unit.owner !== "visitor") return fail("not_yours");
  if (!unit.offer) return fail("no_offer");
  if (unit.lease) return fail("occupied");
  if (!(LEASE_HOURS as readonly number[]).includes(hours)) return fail("bad_hours");
  const leaseHours = hours as LeaseHours;
  const lease: UnitLease = {
    tenantId: unit.offer.tenantId,
    tenantName: unit.offer.tenantName,
    hours: leaseHours,
    startTick: tick,
    endTick: tick + leaseHours * TICKS_PER_SIM_HOUR,
    rentPerHour: unit.offer.rentPerHour,
    lastPaidHour: -1,
  };
  unit.lease = lease;
  unit.offer = null;
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
    leaseHours: [...LEASE_HOURS],
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
        landOwner: land.owner,
        landPrice: land.price,
        canManage: rooms.some((u) => u.owner === "visitor"),
        rooms: rooms.map((u) => ({
          ...u,
          vacant: !u.owner,
        })),
      };
    }),
  };
}
