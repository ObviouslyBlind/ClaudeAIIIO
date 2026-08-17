/**
 * South-island first loop: lease land, order a hotdog cart + hotdogs,
 * van delivers a crate, take-all → inventory, place, stock, hire, earn.
 * PAPER / SIMULATED. Not a wallet.
 */

import { getPlot, ISLANDS, type IslandId, type LandBoard, type Parcel } from "./land.ts";
import { plotTrafficBand, type TrafficBand } from "./footTraffic.ts";
import { roadsideDrop, type DropPoint } from "./roadside.ts";
import type { Visitor } from "./sim.ts";

export const FIRST_LOOP_NOTE =
  "PAPER first loop on South. SIMULATED. Not live. Not a wallet.";

export const HOTDOG_SALE_PRICE = 0.1;
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

export type CatalogSku = {
  id: InvKind;
  label: string;
  paperPrice: number;
  qty: number;
  note: string;
};

export const MARKET_CATALOG: CatalogSku[] = [
  {
    id: "hotdog_cart",
    label: "Hotdog cart",
    paperPrice: CART_PAPER_PRICE,
    qty: 1,
    note: "Starting street cart. PAPER. Delivered in a crate.",
  },
  {
    id: "hotdogs",
    label: `Hotdogs (×${HOTDOG_PACK_QTY})`,
    paperPrice: HOTDOG_PACK_PRICE,
    qty: HOTDOG_PACK_QTY,
    note: "Stock for the cart. Sells at $0.10 PAPER each.",
  },
];

export type Delivery = {
  id: string;
  island: IslandId;
  plotId: string;
  items: InvItem[];
  status: "en_route" | "arrived";
  drop: DropPoint | null;
  mode: "PAPER";
  provenance: "SIMULATED";
};

export type Stand = {
  id: string;
  plotId: string;
  island: IslandId;
  hotdogs: number;
  hired: boolean;
  attending: boolean;
  sellAcc: number;
  mode: "PAPER";
  provenance: "SIMULATED";
};

export type PlayState = {
  inventory: InvItem[];
  deliveries: Delivery[];
  stands: Stand[];
  salesRing: number[];
  nextId: number;
};

export function createPlayState(): PlayState {
  return { inventory: [], deliveries: [], stands: [], salesRing: [], nextId: 1 };
}

export function ensurePlay(visitor: Visitor): PlayState {
  if (!visitor.play) visitor.play = createPlayState();
  return visitor.play;
}

function roundMoney(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function sku(id: InvKind): CatalogSku | undefined {
  return MARKET_CATALOG.find((row) => row.id === id);
}

function addInv(play: PlayState, kind: InvKind, qty: number): void {
  const have = play.inventory.find((row) => row.kind === kind);
  if (have) have.qty = roundMoney(have.qty + qty);
  else play.inventory.push({ kind, qty, mode: "PAPER", provenance: "SIMULATED" });
}

function takeInv(play: PlayState, kind: InvKind, qty: number): boolean {
  const have = play.inventory.find((row) => row.kind === kind);
  if (!have || have.qty < qty) return false;
  have.qty = roundMoney(have.qty - qty);
  if (have.qty <= 0) play.inventory.splice(play.inventory.indexOf(have), 1);
  return true;
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
 * Buy catalog lines and spawn a crate delivery to a leased South plot.
 * v1 island is South only.
 */
export function orderMarket(
  visitor: Visitor,
  land: LandBoard,
  body: { plotId?: unknown; skus?: unknown; island?: unknown },
): LoopOk<{ delivery: Delivery; paid: number }> | LoopFail {
  const play = ensurePlay(visitor);
  const island = String(body.island ?? "south");
  if (island !== "south") return fail("south_only");
  const plot = southVisitorPlot(land, String(body.plotId ?? ""));
  if (!plot) return fail("not_yours");

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
  if (visitor.cash < paid) return fail("no_cash");
  visitor.cash = roundMoney(visitor.cash - paid);

  const delivery: Delivery = {
    id: `del-${play.nextId++}`,
    island: "south",
    plotId: plot.id,
    items,
    status: "en_route",
    drop: roadsideDrop(land.roads, "south", plot.x, plot.z),
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
  return ok({ delivery });
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

export function placeStand(
  visitor: Visitor,
  land: LandBoard,
  plotId: string,
): LoopOk<{ stand: Stand }> | LoopFail {
  const play = ensurePlay(visitor);
  const plot = southVisitorPlot(land, plotId);
  if (!plot) return fail("not_yours");
  if (play.stands.some((s) => s.plotId === plot.id)) return fail("already_placed");
  if (!takeInv(play, "hotdog_cart", 1)) return fail("no_cart");
  const stand: Stand = {
    id: `stand-${play.nextId++}`,
    plotId: plot.id,
    island: "south",
    hotdogs: 0,
    hired: false,
    attending: false,
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
): LoopOk<{ stand: Stand }> | LoopFail {
  const play = ensurePlay(visitor);
  const stand = play.stands.find((s) => s.id === standId);
  if (!stand) return fail("no_stand");
  const want = qty > 0 ? qty : play.inventory.find((r) => r.kind === "hotdogs")?.qty ?? 0;
  if (want <= 0) return fail("no_hotdogs");
  if (!takeInv(play, "hotdogs", want)) return fail("no_hotdogs");
  stand.hotdogs = roundMoney(stand.hotdogs + want);
  return ok({ stand });
}

export function hireStand(visitor: Visitor, standId: string): LoopOk<{ stand: Stand }> | LoopFail {
  const play = ensurePlay(visitor);
  const stand = play.stands.find((s) => s.id === standId);
  if (!stand) return fail("no_stand");
  if (stand.hired) return fail("already_hired");
  stand.hired = true;
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
    if (!stand.hired && !stand.attending) continue;
    const plot = getPlot(land, stand.plotId);
    if (!plot) continue;
    const band = plotTrafficBand(land, plot);
    const need = SELL_TICKS[band];
    stand.sellAcc += 1;
    while (stand.sellAcc >= need && stand.hotdogs >= 1) {
      stand.sellAcc -= need;
      stand.hotdogs = roundMoney(stand.hotdogs - 1);
      earned = roundMoney(earned + HOTDOG_SALE_PRICE);
    }
  }
  visitor.cash = roundMoney(visitor.cash + earned);
  play.salesRing.push(earned);
  if (play.salesRing.length > INCOME_WINDOW) play.salesRing.shift();
  return earned;
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
    playersOnline: 1,
    catalog: MARKET_CATALOG,
    inventory: play.inventory.map((row) => ({ ...row })),
    deliveries: play.deliveries.map((d) => ({ ...d, items: d.items.map((i) => ({ ...i })) })),
    stands: play.stands.map((s) => ({ ...s })),
    leases: land.plots.filter((p) => p.owner === "visitor" && p.island === "south").map((p) => ({
      id: p.id,
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
        price: p.price,
        band: plotTrafficBand(land, p),
      })),
  };
}
