/**
 * South-island first loop: lease land, order a street cart + stock,
 * warehouse or roadside van, place, hire, earn.
 * Cash is $. One shared island warehouse on the dock.
 */

import { findParcelAt, getPlot, ISLANDS, type IslandId, type LandBoard, type Parcel } from "./land.ts";
import { plotTrafficBand, type TrafficBand } from "./footTraffic.ts";
import { roadsideDrop, type DropPoint } from "./roadside.ts";
import { skuFitsPlot, type ZoneId } from "./zones.ts";
import type { Visitor } from "./sim.ts";

export const FIRST_LOOP_NOTE = "South island. One visitor on this process.";

/** Island sticker hint. You set the price; this sits beside the field. */
export const HOTDOG_SALE_PRICE = 5;
export const TODAY_PRICE = HOTDOG_SALE_PRICE;
export const SALES_TAX = 0.2;
export const WAREHOUSE_FEE_PER_DAY = 5;
export const WAREHOUSE_RENT_TICKS = 3600;
export const DELIVERY_WAIT_MS = 180_000;
export const STORAGE_UPGRADE_COST = 200;
export const CART_STORAGE = 20;
export const CART_PAPER_PRICE = 85;
export const HOTDOG_PACK_PRICE = 3;
export const HOTDOG_PACK_QTY = 20;
export const SELL_TICKS: Record<TrafficBand, number> = {
  green: 8,
  yellow: 16,
  red: 32,
};
export const INCOME_WINDOW = 60;

export type InvKind = "hotdog_cart" | "hotdogs";

export type InvItem = {
  kind: InvKind;
  qty: number;
  mode: "PAPER";
  provenance: "SIMULATED";
};

export type MarketAisle = "street_carts" | "stock";

export type CatalogSku = {
  id: InvKind;
  aisle: MarketAisle;
  aisleLabel: string;
  label: string;
  paperPrice: number;
  qty: number;
  note: string;
  zone: ZoneId;
};

export const MARKET_AISLES: { id: MarketAisle; label: string; note: string }[] = [
  { id: "street_carts", label: "Street carts", note: "Commercial kerb stalls. Pick one, then where it drops." },
  { id: "stock", label: "Stock", note: "Food for a cart you already own. Same delivery pick." },
];

export const MARKET_CATALOG: CatalogSku[] = [
  {
    id: "hotdog_cart",
    aisle: "street_carts",
    aisleLabel: "Street carts",
    label: "Hotdog cart",
    paperPrice: CART_PAPER_PRICE,
    qty: 1,
    note: "Starting street cart. Lands in the island warehouse unless you send the van.",
    zone: "commercial",
  },
  {
    id: "hotdogs",
    aisle: "stock",
    aisleLabel: "Stock",
    label: `Hotdogs (×${HOTDOG_PACK_QTY})`,
    paperPrice: HOTDOG_PACK_PRICE,
    qty: HOTDOG_PACK_QTY,
    note: "Stock for the cart. Today's price sits next to your sticker.",
    zone: "commercial",
  },
];

/** Metres from your lot toward the paved road where a cart may sit. */
export const PLACE_CORRIDOR_M = 22;

/** People you can put on a cart. A cart does not sell until one of them is hired. */
export const HIRE_ROSTER: { id: string; name: string; role: string; suggest: string }[] = [
  {
    id: "pat",
    name: "Pat K.",
    role: "Cart vendor",
    suggest: "A $200 fridge would hold more stock through the weekend.",
  },
  {
    id: "rui",
    name: "Rui M.",
    role: "Cart vendor",
    suggest: "A $200 fridge would hold more stock through the weekend.",
  },
  {
    id: "sam",
    name: "Sam D.",
    role: "Cart vendor",
    suggest: "A $200 fridge would hold more stock through the weekend.",
  },
];

export type Warehouse = {
  island: IslandId;
  feePerDay: number;
  items: InvItem[];
  lastRentDay: number;
};

export type Delivery = {
  id: string;
  island: IslandId;
  plotId: string;
  items: InvItem[];
  status: "en_route" | "arrived" | "stored";
  drop: DropPoint | null;
  arrivedAtMs: number | null;
  dest: "warehouse" | "road" | "cart";
  mode: "PAPER";
  provenance: "SIMULATED";
};

export type Stand = {
  id: string;
  plotId: string;
  island: IslandId;
  x: number;
  z: number;
  hotdogs: number;
  hired: boolean;
  staffId: string | null;
  staffName: string | null;
  attending: boolean;
  stickerPrice: number;
  storageCap: number;
  upgraded: boolean;
  sellAcc: number;
  mode: "PAPER";
  provenance: "SIMULATED";
};

export type PlayState = {
  inventory: InvItem[];
  deliveries: Delivery[];
  stands: Stand[];
  salesRing: number[];
  warehouse: Warehouse;
  gameBank: number;
  nextId: number;
};

export function createPlayState(): PlayState {
  return {
    inventory: [],
    deliveries: [],
    stands: [],
    salesRing: [],
    warehouse: {
      island: "south",
      feePerDay: WAREHOUSE_FEE_PER_DAY,
      items: [],
      lastRentDay: -1,
    },
    gameBank: 0,
    nextId: 1,
  };
}

export function ensurePlay(visitor: Visitor): PlayState {
  if (!visitor.play) visitor.play = createPlayState();
  const play = visitor.play;
  if (!play.warehouse) {
    play.warehouse = {
      island: "south",
      feePerDay: WAREHOUSE_FEE_PER_DAY,
      items: [],
      lastRentDay: -1,
    };
  }
  if (!Number.isFinite(play.gameBank)) play.gameBank = 0;
  for (const stand of play.stands) {
    if (!Number.isFinite(stand.stickerPrice)) stand.stickerPrice = TODAY_PRICE;
    if (!Number.isFinite(stand.storageCap)) stand.storageCap = CART_STORAGE;
    if (stand.upgraded == null) stand.upgraded = false;
  }
  return play;
}

function roundMoney(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function sku(id: InvKind): CatalogSku | undefined {
  return MARKET_CATALOG.find((row) => row.id === id);
}

function addStack(rows: InvItem[], kind: InvKind, qty: number): void {
  const have = rows.find((row) => row.kind === kind);
  if (have) have.qty = roundMoney(have.qty + qty);
  else rows.push({ kind, qty, mode: "PAPER", provenance: "SIMULATED" });
}

function takeStack(rows: InvItem[], kind: InvKind, qty: number): boolean {
  const have = rows.find((row) => row.kind === kind);
  if (!have || have.qty < qty) return false;
  have.qty = roundMoney(have.qty - qty);
  if (have.qty <= 0) rows.splice(rows.indexOf(have), 1);
  return true;
}

function addInv(play: PlayState, kind: InvKind, qty: number): void {
  addStack(play.inventory, kind, qty);
}

function takeInv(play: PlayState, kind: InvKind, qty: number): boolean {
  return takeStack(play.inventory, kind, qty);
}

function addWarehouse(play: PlayState, kind: InvKind, qty: number): void {
  addStack(play.warehouse.items, kind, qty);
}

function takeWarehouse(play: PlayState, kind: InvKind, qty: number): boolean {
  return takeStack(play.warehouse.items, kind, qty);
}

function warehouseQty(play: PlayState, kind: InvKind): number {
  return play.warehouse.items.find((row) => row.kind === kind)?.qty ?? 0;
}

export type LoopFail = { ok: false; reason: string; mode: "PAPER"; provenance: "SIMULATED"; note: string };
export type LoopOk<T> = T & { ok: true; mode: "PAPER"; provenance: "SIMULATED"; note: string };

function fail(reason: string): LoopFail {
  return { ok: false, reason, mode: "PAPER", provenance: "SIMULATED", note: FIRST_LOOP_NOTE };
}

function ok<T>(extra: T): LoopOk<T> {
  return { ...extra, ok: true, mode: "PAPER", provenance: "SIMULATED", note: FIRST_LOOP_NOTE };
}

export function southVisitorPlot(land: LandBoard, plotId: string): Parcel | null {
  const plot = getPlot(land, plotId);
  if (!plot || plot.island !== "south" || plot.owner !== "visitor") return null;
  return plot;
}

/**
 * Buy catalog lines. Default dest is the shared island warehouse.
 * dest=road still sends a van to a leased South plot.
 */
export function orderMarket(
  visitor: Visitor,
  land: LandBoard,
  body: { plotId?: unknown; skus?: unknown; island?: unknown; dest?: unknown },
): LoopOk<{ delivery: Delivery; paid: number; stored?: boolean }> | LoopFail {
  const play = ensurePlay(visitor);
  const island = String(body.island ?? "south");
  if (island !== "south") return fail("south_only");

  const destRaw = body.dest != null ? String(body.dest) : "";
  const dest: "warehouse" | "road" | "cart" =
    destRaw === "cart" || destRaw === "pocket" || destRaw === "inventory"
      ? "cart"
      : destRaw === "warehouse" || destRaw === "store"
        ? "warehouse"
        : destRaw === "road"
          ? "road"
          : body.plotId
            ? "road"
            : "warehouse";
  const wanted = Array.isArray(body.skus) ? body.skus.map((id) => String(id)) : [];
  if (!wanted.length) return fail("empty_order");

  const items: InvItem[] = [];
  let paid = 0;
  for (const id of wanted) {
    if (id !== "hotdog_cart" && id !== "hotdogs") return fail("unknown_sku");
    const row = sku(id)!;
    paid = roundMoney(paid + row.paperPrice);
    items.push({ kind: row.id, qty: row.qty, mode: "PAPER", provenance: "SIMULATED" });
  }

  let plot: Parcel | null = null;
  if (dest === "road") {
    plot = southVisitorPlot(land, String(body.plotId ?? ""));
    if (!plot) return fail("not_yours");
    for (const item of items) {
      const row = sku(item.kind)!;
      const fit = skuFitsPlot(row.zone, plot.zone);
      if (!fit.ok) return fail(fit.reason);
    }
  }

  if (visitor.cash < paid) return fail("no_cash");
  visitor.cash = roundMoney(visitor.cash - paid);

  if (dest === "cart") {
    for (const item of items) addInv(play, item.kind, item.qty);
    const delivery: Delivery = {
      id: `del-${play.nextId++}`,
      island: "south",
      plotId: "cart",
      items,
      status: "stored",
      drop: null,
      arrivedAtMs: Date.now(),
      dest: "cart",
      mode: "PAPER",
      provenance: "SIMULATED",
    };
    return ok({ delivery, paid, stored: true as const });
  }

  if (dest === "warehouse") {
    for (const item of items) addWarehouse(play, item.kind, item.qty);
    const delivery: Delivery = {
      id: `del-${play.nextId++}`,
      island: "south",
      plotId: plot?.id ?? "warehouse",
      items,
      status: "stored",
      drop: null,
      arrivedAtMs: Date.now(),
      dest: "warehouse",
      mode: "PAPER",
      provenance: "SIMULATED",
    };
    return ok({ delivery, paid, stored: true as const });
  }

  const delivery: Delivery = {
    id: `del-${play.nextId++}`,
    island: "south",
    plotId: plot!.id,
    items,
    status: "en_route",
    drop: roadsideDrop(land.roads, "south", plot!.x, plot!.z),
    arrivedAtMs: null,
    dest: "road",
    mode: "PAPER",
    provenance: "SIMULATED",
  };
  play.deliveries.push(delivery);
  return ok({ delivery, paid });
}

export function markArrived(visitor: Visitor, deliveryId: string): LoopOk<{ delivery: Delivery }> | LoopFail {
  const play = ensurePlay(visitor);
  const delivery = play.deliveries.find((d) => d.id === deliveryId);
  if (!delivery) return fail("no_delivery");
  delivery.status = "arrived";
  delivery.arrivedAtMs = Date.now();
  return ok({ delivery });
}

/** Missed kerb drop → shared island warehouse. Goods are not lost. */
export function recallStaleDeliveries(visitor: Visitor, nowMs = Date.now()): number {
  const play = ensurePlay(visitor);
  let moved = 0;
  play.deliveries = play.deliveries.filter((d) => {
    if (d.status !== "arrived" || d.arrivedAtMs == null) return true;
    if (nowMs - d.arrivedAtMs < DELIVERY_WAIT_MS) return true;
    for (const item of d.items) addWarehouse(play, item.kind, item.qty);
    moved += 1;
    return false;
  });
  return moved;
}

export function withdrawWarehouse(
  visitor: Visitor,
  kind: InvKind,
  qty = 0,
): LoopOk<{ inventory: InvItem[] }> | LoopFail {
  const play = ensurePlay(visitor);
  const have = warehouseQty(play, kind);
  const want = qty > 0 ? qty : have;
  if (want <= 0 || have < want) return fail("empty_warehouse");
  if (!takeWarehouse(play, kind, want)) return fail("empty_warehouse");
  addInv(play, kind, want);
  return ok({ inventory: play.inventory.map((row) => ({ ...row })) });
}

export function tickWarehouseRent(visitor: Visitor, tick: number): number {
  const play = ensurePlay(visitor);
  if (!play.warehouse.items.length) return 0;
  const day = Math.floor(tick / WAREHOUSE_RENT_TICKS);
  if (day <= 0) return 0;
  if (day <= play.warehouse.lastRentDay) return 0;
  const fee = play.warehouse.feePerDay;
  if (visitor.cash < fee) return 0;
  visitor.cash = roundMoney(visitor.cash - fee);
  play.gameBank = roundMoney(play.gameBank + fee);
  play.warehouse.lastRentDay = day;
  return fee;
}

export function takeAll(visitor: Visitor, deliveryId: string): LoopOk<{ inventory: InvItem[] }> | LoopFail {
  const play = ensurePlay(visitor);
  const idx = play.deliveries.findIndex((d) => d.id === deliveryId);
  if (idx < 0) return fail("no_delivery");
  const delivery = play.deliveries[idx]!;
  for (const item of delivery.items) addInv(play, item.kind, item.qty);
  play.deliveries.splice(idx, 1);
  return ok({ inventory: play.inventory.map((row) => ({ ...row })) });
}

/** Your South lot, or the lot whose road verge you tapped. */
export function plotForPlace(
  land: LandBoard,
  plotId?: string,
  x?: number,
  z?: number,
): Parcel | null {
  if (plotId) {
    const named = southVisitorPlot(land, plotId);
    if (named) return named;
  }
  if (Number.isFinite(x) && Number.isFinite(z)) {
    const at = findParcelAt(land, x as number, z as number);
    if (at && at.island === "south" && at.owner === "visitor") return at;
    let best: Parcel | null = null;
    let bestD = Infinity;
    for (const p of land.plots) {
      if (p.island !== "south" || p.owner !== "visitor") continue;
      const drop = roadsideDrop(land.roads, "south", p.x, p.z);
      const dPlot = Math.hypot((x as number) - p.x, (z as number) - p.z);
      const dDrop = drop ? Math.hypot((x as number) - drop.x, (z as number) - drop.z) : Infinity;
      const dCurb = drop ? Math.hypot((x as number) - drop.curbX, (z as number) - drop.curbZ) : Infinity;
      const d = Math.min(dPlot, dDrop, dCurb);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    if (best && bestD <= PLACE_CORRIDOR_M) return best;
  }
  return null;
}

export function placeStand(
  visitor: Visitor,
  land: LandBoard,
  plotId: string,
  pose?: { x?: number; z?: number },
): LoopOk<{ stand: Stand }> | LoopFail {
  const play = ensurePlay(visitor);
  const plot = plotForPlace(land, plotId, pose?.x, pose?.z);
  if (!plot) return fail("not_yours");
  if (play.stands.some((s) => s.plotId === plot.id)) return fail("already_placed");
  if (!takeInv(play, "hotdog_cart", 1) && !takeWarehouse(play, "hotdog_cart", 1)) {
    return fail("no_cart");
  }
  const x = Number.isFinite(pose?.x) ? (pose!.x as number) : plot.x;
  const z = Number.isFinite(pose?.z) ? (pose!.z as number) : plot.z;
  const stand: Stand = {
    id: `stand-${play.nextId++}`,
    plotId: plot.id,
    island: "south",
    x,
    z,
    hotdogs: 0,
    hired: false,
    staffId: null,
    staffName: null,
    attending: false,
    stickerPrice: TODAY_PRICE,
    storageCap: CART_STORAGE,
    upgraded: false,
    sellAcc: 0,
    mode: "PAPER",
    provenance: "SIMULATED",
  };
  play.stands.push(stand);
  return ok({ stand });
}

export function stockStand(
  visitor: Visitor,
  standId: string,
  qty = 0,
  from?: string,
): LoopOk<{ stand: Stand }> | LoopFail {
  const play = ensurePlay(visitor);
  const stand = play.stands.find((s) => s.id === standId);
  if (!stand) return fail("no_stand");
  let fromInv = play.inventory.find((r) => r.kind === "hotdogs")?.qty ?? 0;
  let fromWh = warehouseQty(play, "hotdogs");
  if (from === "inventory") fromWh = 0;
  else if (from === "warehouse") fromInv = 0;
  const room = Math.max(0, stand.storageCap - stand.hotdogs);
  const want = qty > 0 ? Math.min(qty, fromInv + fromWh, room) : Math.min(fromInv + fromWh, room);
  if (want <= 0) return fail(room <= 0 ? "full" : "no_hotdogs");
  const takeInvN = Math.min(fromInv, want);
  const takeWhN = want - takeInvN;
  if (takeInvN && !takeInv(play, "hotdogs", takeInvN)) return fail("no_hotdogs");
  if (takeWhN && !takeWarehouse(play, "hotdogs", takeWhN)) return fail("no_hotdogs");
  stand.hotdogs = roundMoney(stand.hotdogs + want);
  return ok({ stand });
}

export function hireStand(
  visitor: Visitor,
  standId: string,
  personId?: string,
): LoopOk<{ stand: Stand }> | LoopFail {
  const play = ensurePlay(visitor);
  const stand = play.stands.find((s) => s.id === standId);
  if (!stand) return fail("no_stand");
  if (stand.hired) return fail("already_hired");
  const person = personId
    ? HIRE_ROSTER.find((p) => p.id === personId)
    : HIRE_ROSTER[0];
  if (!person) return fail("no_person");
  stand.hired = true;
  stand.staffId = person.id;
  stand.staffName = person.name;
  return ok({ stand });
}

export function setStandPrice(
  visitor: Visitor,
  standId: string,
  price: number,
): LoopOk<{ stand: Stand }> | LoopFail {
  const play = ensurePlay(visitor);
  const stand = play.stands.find((s) => s.id === standId);
  if (!stand) return fail("no_stand");
  const n = Number(price);
  if (!Number.isFinite(n) || n < 0.01 || n > 1000) return fail("bad_price");
  stand.stickerPrice = roundMoney(n);
  return ok({ stand });
}

export function upgradeStand(visitor: Visitor, standId: string): LoopOk<{ stand: Stand }> | LoopFail {
  const play = ensurePlay(visitor);
  const stand = play.stands.find((s) => s.id === standId);
  if (!stand) return fail("no_stand");
  if (stand.upgraded) return fail("already_upgraded");
  if (visitor.cash < STORAGE_UPGRADE_COST) return fail("no_cash");
  visitor.cash = roundMoney(visitor.cash - STORAGE_UPGRADE_COST);
  play.gameBank = roundMoney(play.gameBank + STORAGE_UPGRADE_COST);
  stand.upgraded = true;
  stand.storageCap = CART_STORAGE * 2;
  return ok({ stand });
}

export function attendStand(visitor: Visitor, standId: string | null): LoopOk<{ attending: string | null }> | LoopFail {
  const play = ensurePlay(visitor);
  for (const s of play.stands) s.attending = false;
  if (!standId) return ok({ attending: null });
  const stand = play.stands.find((s) => s.id === standId);
  if (!stand) return fail("no_stand");
  stand.attending = true;
  return ok({ attending: stand.id });
}

export function incomePerMinute(play: PlayState): number {
  const sum = play.salesRing.reduce((a, n) => a + n, 0);
  if (play.salesRing.length < INCOME_WINDOW) {
    const ticks = Math.max(1, play.salesRing.length);
    return roundMoney((sum / ticks) * INCOME_WINDOW);
  }
  return roundMoney(sum);
}

export function tickHotdogSales(visitor: Visitor, land: LandBoard): number {
  const play = ensurePlay(visitor);
  let earned = 0;
  for (const stand of play.stands) {
    if (stand.hotdogs < 1) continue;
    if (!stand.hired) continue;
    const plot = getPlot(land, stand.plotId);
    if (!plot) continue;
    const band = plotTrafficBand(land, plot);
    const need = SELL_TICKS[band];
    stand.sellAcc += 1;
    while (stand.sellAcc >= need && stand.hotdogs >= 1) {
      stand.sellAcc -= need;
      stand.hotdogs = roundMoney(stand.hotdogs - 1);
      const gross = stand.stickerPrice;
      const tax = roundMoney(gross * SALES_TAX);
      const net = roundMoney(gross - tax);
      play.gameBank = roundMoney(play.gameBank + tax);
      earned = roundMoney(earned + net);
    }
  }
  visitor.cash = roundMoney(visitor.cash + earned);
  play.salesRing.push(earned);
  if (play.salesRing.length > INCOME_WINDOW) play.salesRing.shift();
  return earned;
}

export function tickPlay(visitor: Visitor, land: LandBoard, tick: number, nowMs = Date.now()): number {
  recallStaleDeliveries(visitor, nowMs);
  tickWarehouseRent(visitor, tick);
  return tickHotdogSales(visitor, land);
}

export function playSnapshot(visitor: Visitor, land: LandBoard) {
  const play = ensurePlay(visitor);
  return {
    mode: "PAPER" as const,
    provenance: "SIMULATED" as const,
    note: FIRST_LOOP_NOTE,
    island: "south" as const,
    cash: visitor.cash,
    incomePerMinute: incomePerMinute(play),
    todayPrice: TODAY_PRICE,
    salesTax: SALES_TAX,
    gameBank: play.gameBank,
    warehouse: {
      island: play.warehouse.island,
      feePerDay: play.warehouse.feePerDay,
      items: play.warehouse.items.map((row) => ({ ...row })),
      occupied: play.warehouse.items.some((row) => row.qty > 0),
    },
    playersOnline: 1,
    aisles: MARKET_AISLES,
    catalog: MARKET_CATALOG,
    inventory: play.inventory.map((row) => ({ ...row })),
    hireRoster: HIRE_ROSTER.map((p) => ({ ...p })),
    deliveries: play.deliveries.map((d) => ({ ...d, items: d.items.map((i) => ({ ...i })) })),
    stands: play.stands.map((s) => ({ ...s })),
    leases: land.plots.filter((p) => p.owner === "visitor" && p.island === "south").map((p) => ({
      id: p.id,
      name: p.name,
      street: p.street,
      zone: p.zone,
      x: p.x,
      z: p.z,
      price: p.price,
      band: plotTrafficBand(land, p),
    })),
    leaseOptions: land.plots
      .filter((p) => p.island === "south" && p.band === "street" && !p.owner && p.class === "by_right")
      .sort((a, b) => {
        const port = ISLANDS.south.port;
        return Math.hypot(a.x - port.x, a.z - port.z) - Math.hypot(b.x - port.x, b.z - port.z);
      })
      .slice(0, 8)
      .map((p) => ({
        id: p.id,
        name: p.name,
        zone: p.zone,
        price: p.price,
        band: plotTrafficBand(land, p),
      })),
  };
}
