/**
 * South-island first loop: lease land, order a street cart + matching stock,
 * warehouse or the kerb, place, then hire / stock / sticker / fridge
 * on that cart. Cash is $. One shared island warehouse on the dock.
 */

import { findParcelAt, getPlot, ISLANDS, type IslandId, type LandBoard, type Parcel } from "./land.ts";
import { plotTrafficBand } from "./footTraffic.ts";
import { roadsideDrop, type DropPoint } from "./roadside.ts";
import { skuFitsPlot, type ZoneId } from "./zones.ts";
import type { Visitor } from "./sim.ts";
import { scoreSite, siteClassForUse, type SiteClass, type SiteScore } from "./siteScore.ts";
import {
  CART_PAPER_PRICE,
  CART_PRICES,
  HIRE_COST,
  HOTDOG_PACK_PRICE,
  HOTDOG_PACK_QTY,
  HOTDOG_SALE_PRICE,
  LAUNCH_SALES_TAX,
  PROPANE_PRICE,
  PROPANE_SALES,
} from "./economy.ts";

export const FIRST_LOOP_NOTE = "South island. One visitor on this process.";

/** Island sticker hint. You set the price; this sits beside the field. */
export {
  CART_PAPER_PRICE,
  CART_PRICES,
  HIRE_COST,
  HOTDOG_PACK_PRICE,
  HOTDOG_PACK_QTY,
  HOTDOG_SALE_PRICE,
  LAUNCH_SALES_TAX,
  PROPANE_PRICE,
  PROPANE_SALES,
};
export const TODAY_PRICE = HOTDOG_SALE_PRICE;
/** Launch default. Live ticks write the statute rate onto PlayState. */
export const SALES_TAX = LAUNCH_SALES_TAX;
export const WAREHOUSE_FEE_PER_DAY = 5;
export const WAREHOUSE_RENT_TICKS = 3600;
/** Seconds the kerb crate waits before it goes to the warehouse. */
export const DELIVERY_WAIT_MS = 60_000;
export const ORDER_MAX_QTY = 10;
export const STORAGE_UPGRADE_COST = 200;
export const STICKER_MIN = 1;
export const STICKER_MAX = 16;
/** |sticker − today| within this is yellow. Exact match is green. Further is red. */
export const STICKER_YELLOW = 1.5;
export const CART_STORAGE = 20;
export const INCOME_WINDOW = 60;
export const BOOST_PER_HIT = 1;
export const SHIFT_BURST_MIN = 5;
export const SHIFT_BURST_MAX = 10;

/** Caribbean street carts. Starter kit id stays hotdog_cart so old saves still place. */
export type CartKindId = "fruit" | "watermelon" | "fish_chips";
export type InvKind =
  | "hotdog_cart"
  | "hotdogs"
  | "melon_cart"
  | "melon"
  | "fish_cart"
  | "fish_chips"
  | "propane";

export type CartKind = {
  id: CartKindId;
  kitId: InvKind;
  stockId: InvKind;
  label: string;
  kitLabel: string;
  stockLabel: string;
  note: string;
  games: string[];
};

export const CART_KINDS: CartKind[] = [
  {
    id: "fruit",
    kitId: "hotdog_cart",
    stockId: "hotdogs",
    label: "Fruit cart",
    kitLabel: "Fruit cart",
    stockLabel: "Fruit",
    note: "Caribbean fruit stall. Buy fruit packs, place, then stock this cart.",
    games: ["Fruit slice"],
  },
  {
    id: "watermelon",
    kitId: "melon_cart",
    stockId: "melon",
    label: "Watermelon cart",
    kitLabel: "Watermelon cart",
    stockLabel: "Watermelon",
    note: "Cut melon on the kerb. Same hire / run / stats menu as the fruit cart.",
    games: ["Melon slice"],
  },
  {
    id: "fish_chips",
    kitId: "fish_cart",
    stockId: "fish_chips",
    label: "Fish and chips",
    kitLabel: "Fish and chips cart",
    stockLabel: "Fish and chips",
    note: "Harbour fry cart. Needs propane. Dearest kit, highest sticker.",
    games: ["Fry run", "Basket pull", "Wrap ticket"],
  },
];

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
  cartKind: CartKindId;
  role: "kit" | "stock";
};

export const MARKET_AISLES: { id: MarketAisle; label: string; note: string }[] = [
  {
    id: "street_carts",
    label: "Street carts",
    note: "Fruit, watermelon, or fish and chips. Buy to the warehouse or the kerb — not onto a stall.",
  },
  {
    id: "stock",
    label: "Stock",
    note: "Packs for a cart you already placed. Fry carts also need a propane canister.",
  },
];

export const MARKET_CATALOG: CatalogSku[] = [
  ...CART_KINDS.flatMap((cart) => [
    {
      id: cart.kitId,
      aisle: "street_carts" as const,
      aisleLabel: "Street carts",
      label: cart.kitLabel,
      paperPrice: CART_PRICES[cart.id].kit,
      qty: 1,
      note: cart.note,
      zone: "commercial" as const,
      cartKind: cart.id,
      role: "kit" as const,
    },
    {
      id: cart.stockId,
      aisle: "stock" as const,
      aisleLabel: "Stock",
      label: `${cart.stockLabel} (×${HOTDOG_PACK_QTY})`,
      paperPrice: CART_PRICES[cart.id].pack,
      qty: HOTDOG_PACK_QTY,
      note: `Stock for the ${cart.label}. Load it after the cart is on the kerb.`,
      zone: "commercial" as const,
      cartKind: cart.id,
      role: "stock" as const,
    },
  ]),
  {
    id: "propane",
    aisle: "stock",
    aisleLabel: "Stock",
    label: "Propane canister",
    paperPrice: PROPANE_PRICE,
    qty: 1,
    note: "Fuel for the fry cart. One bottle lasts 40 sales. First-loop stock, not a book good.",
    zone: "commercial",
    cartKind: "fish_chips",
    role: "stock",
  },
];

export function cartTodayPrice(kind: string | undefined): number {
  if (kind === "watermelon") return CART_PRICES.watermelon.sale;
  if (kind === "fish_chips") return CART_PRICES.fish_chips.sale;
  return CART_PRICES.fruit.sale;
}

export function isFryCart(stand: { kind?: string }): boolean {
  return stand.kind === "fish_chips";
}

export function cartKindById(id: string | undefined): CartKind | undefined {
  return CART_KINDS.find((row) => row.id === id);
}

export function cartKindByKit(kitId: string | undefined): CartKind | undefined {
  return CART_KINDS.find((row) => row.kitId === kitId);
}

export function cartKindForStand(stand: Pick<Stand, "kind">): CartKind {
  return cartKindById(stand.kind) ?? CART_KINDS[0]!;
}

export function isCartKit(kind: string): boolean {
  return CART_KINDS.some((row) => row.kitId === kind);
}

export function isKnownSku(id: string): id is InvKind {
  return MARKET_CATALOG.some((row) => row.id === id);
}

export function skuLabel(kind: string): string {
  const row = MARKET_CATALOG.find((s) => s.id === kind);
  if (row) return row.label;
  const cart = cartKindByKit(kind);
  return cart ? cart.kitLabel : kind;
}

function hasKit(play: PlayState): boolean {
  return CART_KINDS.some(
    (cart) =>
      play.inventory.some((row) => row.kind === cart.kitId && row.qty > 0) ||
      play.warehouse.items.some((row) => row.kind === cart.kitId && row.qty > 0),
  );
}

/** Metres from your lot toward the paved road where a cart may sit. */
export const PLACE_CORRIDOR_M = 22;

export const SITE_UPGRADES: { id: string; label: string; cost: number; appeal: number }[] = [
  { id: "fridge", label: "Fridge", cost: STORAGE_UPGRADE_COST, appeal: 3 },
  { id: "sign", label: "Sign", cost: 80, appeal: 0.8 },
  { id: "awning", label: "Awning", cost: 120, appeal: 0.7 },
  { id: "lights", label: "Lights", cost: 60, appeal: 0.4 },
  { id: "stools", label: "Stools", cost: 50, appeal: 0.4 },
];

/** One Hire. An AI vendor appears and runs the site. */
export const HIRE_ROSTER: { id: string; name: string; role: string; suggest: string }[] = [
  {
    id: "ai",
    name: "Vendor",
    role: "Vendor",
    suggest: "Hire. They stock from the warehouse and keep this site running.",
  },
];

const KIND_FIX: Record<string, CartKindId> = {
  roast_corn: "fruit",
  potato_roti: "fruit",
  callaloo: "fruit",
  stew_peas: "fruit",
  hotdog: "fruit",
};

export type CartNeedId = "buy" | "place" | "hire" | "stock" | "propane" | "fridge" | "sticker";

export type CartNeed = {
  id: CartNeedId;
  label: string;
};

/** What a placed street cart still wants before it earns. */
export function standNeeds(stand: Stand, today = cartTodayPrice(stand.kind)): CartNeed[] {
  const needs: CartNeed[] = [];
  if (!stand.hired) needs.push({ id: "hire", label: "Hire" });
  if (Number(stand.hotdogs) < 1) needs.push({ id: "stock", label: "Stock" });
  if (isFryCart(stand) && Number(stand.propaneLeft) < 1) needs.push({ id: "propane", label: "Propane" });
  if (!stand.upgraded) needs.push({ id: "fridge", label: "Fridge" });
  if (Math.abs(Number(stand.stickerPrice) - today) > 0.01) {
    needs.push({ id: "sticker", label: `Sticker $${today.toFixed(2)}` });
  }
  return needs;
}

/** First-loop cart jobs, in order: buy → place → hire / stock / fridge / sticker. */
export function cartLoopNeeds(play: PlayState, today = TODAY_PRICE): CartNeed[] {
  if (!play.stands.length && !hasKit(play)) {
    return [{ id: "buy", label: "Buy a street cart in Market." }];
  }
  if (!play.stands.length) {
    return [{ id: "place", label: "Place the cart on your YOURS lot or the verge by the road." }];
  }
  return play.stands.flatMap((stand) => standNeeds(stand, today));
}

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
  kind: CartKindId;
  hotdogs: number;
  hired: boolean;
  staffId: string | null;
  staffName: string | null;
  attending: boolean;
  stickerPrice: number;
  storageCap: number;
  upgraded: boolean;
  upgrades: string[];
  sellAcc: number;
  boostLeft: number;
  propaneLeft: number;
  mode: "PAPER";
  provenance: "SIMULATED";
};

/** Shop or mine on a developed visitor plot. Same hire / run / stats card as a cart. */
export type WorkSite = {
  id: string;
  plotId: string;
  island: IslandId;
  siteClass: Exclude<SiteClass, "cart">;
  use: string;
  label: string;
  stock: number;
  hired: boolean;
  staffId: string | null;
  staffName: string | null;
  stickerPrice: number;
  storageCap: number;
  upgraded: boolean;
  upgrades: string[];
  sellAcc: number;
  boostLeft: number;
  stockId: InvKind | null;
  games: string[];
  mode: "PAPER";
  provenance: "SIMULATED";
};

export type PlayState = {
  inventory: InvItem[];
  deliveries: Delivery[];
  stands: Stand[];
  salesRing: number[];
  warehouse: Warehouse;
  workSites: WorkSite[];
  gameBank: number;
  nextId: number;
  salesTaxRate: number;
  salesTaxCollected: number;
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
    workSites: [],
    gameBank: 0,
    nextId: 1,
    salesTaxRate: LAUNCH_SALES_TAX,
    salesTaxCollected: 0,
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
  if (!Number.isFinite(play.salesTaxRate)) play.salesTaxRate = LAUNCH_SALES_TAX;
  if (!Number.isFinite(play.salesTaxCollected)) play.salesTaxCollected = 0;
  if (!play.workSites) play.workSites = [];
  for (const stand of play.stands) {
    const mapped = KIND_FIX[String(stand.kind)];
    if (mapped) stand.kind = mapped;
    if (!stand.kind || !cartKindById(stand.kind)) stand.kind = "fruit";
    if (!Number.isFinite(stand.stickerPrice)) stand.stickerPrice = cartTodayPrice(stand.kind);
    if (!Number.isFinite(stand.storageCap)) stand.storageCap = CART_STORAGE;
    if (stand.upgraded == null) stand.upgraded = false;
    if (!Array.isArray(stand.upgrades)) stand.upgrades = stand.upgraded ? ["fridge"] : [];
    if (!Number.isFinite(stand.boostLeft)) stand.boostLeft = 0;
    if (!Number.isFinite(stand.propaneLeft)) stand.propaneLeft = 0;
  }
  for (const site of play.workSites) {
    if (site.upgraded == null) site.upgraded = false;
    if (!Array.isArray(site.upgrades)) site.upgrades = site.upgraded ? ["fridge"] : [];
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

const SHOP_GAMES = ["Till run"];
const MINE_GAMES = ["Pick run"];

export function rivalsOnStreet(land: LandBoard, play: PlayState, plotId: string, selfId: string): number {
  const plot = getPlot(land, plotId);
  if (!plot) return 0;
  let n = 0;
  for (const s of play.stands) {
    if (s.id === selfId) continue;
    const p = getPlot(land, s.plotId);
    if (p && p.street === plot.street) n += 1;
  }
  for (const s of play.workSites || []) {
    if (s.id === selfId) continue;
    const p = getPlot(land, s.plotId);
    if (p && p.street === plot.street) n += 1;
  }
  return n;
}

function scoreWork(
  land: LandBoard,
  play: PlayState,
  row: {
    id: string;
    plotId: string;
    hired: boolean;
    stock: number;
    upgraded: boolean;
    upgrades?: string[];
    boostLeft: number;
  },
): SiteScore {
  const plot = getPlot(land, row.plotId);
  const band = plot ? plotTrafficBand(land, plot) : "red";
  return scoreSite({
    hired: row.hired,
    stocked: row.stock >= 1,
    upgraded: row.upgraded,
    upgrades: ownedUpgrades(row),
    traffic: band,
    rivalsOnStreet: rivalsOnStreet(land, play, row.plotId, row.id),
    boostLeft: row.boostLeft,
  });
}

export function scoreForStand(stand: Stand, land: LandBoard, play: PlayState): SiteScore {
  return scoreWork(land, play, {
    id: stand.id,
    plotId: stand.plotId,
    hired: stand.hired,
    stock: stand.hotdogs,
    upgraded: stand.upgraded,
    upgrades: stand.upgrades,
    boostLeft: stand.boostLeft || 0,
  });
}

function workSiteLabel(plot: Parcel, cls: Exclude<SiteClass, "cart">): string {
  if (cls === "shop") return `${plot.name} shop`;
  return `${plot.name} mine`;
}

export function syncWorkSites(play: PlayState, land: LandBoard): WorkSite[] {
  if (!play.workSites) play.workSites = [];
  const live = new Set<string>();
  for (const plot of land.plots) {
    if (plot.owner !== "visitor") continue;
    const cls = siteClassForUse(plot.use);
    if (cls !== "shop" && cls !== "mine") continue;
    live.add(plot.id);
    let site = play.workSites.find((s) => s.plotId === plot.id);
    if (!site) {
      site = {
        id: `site-${plot.id}`,
        plotId: plot.id,
        island: plot.island,
        siteClass: cls,
        use: String(plot.use),
        label: workSiteLabel(plot, cls),
        stock: 0,
        hired: false,
        staffId: null,
        staffName: null,
        stickerPrice: TODAY_PRICE,
        storageCap: CART_STORAGE,
        upgraded: false,
        upgrades: [],
        sellAcc: 0,
        boostLeft: 0,
        stockId: cls === "shop" ? "hotdogs" : null,
        games: cls === "shop" ? SHOP_GAMES.slice() : MINE_GAMES.slice(),
        mode: "PAPER",
        provenance: "SIMULATED",
      };
      play.workSites.push(site);
    } else {
      site.siteClass = cls;
      site.use = String(plot.use);
      site.label = workSiteLabel(plot, cls);
      site.games = cls === "shop" ? SHOP_GAMES.slice() : MINE_GAMES.slice();
      if (!Number.isFinite(site.boostLeft)) site.boostLeft = 0;
    }
  }
  play.workSites = play.workSites.filter((s) => live.has(s.plotId));
  return play.workSites;
}

function findStandOrSite(
  play: PlayState,
  id: string,
): { kind: "stand"; row: Stand } | { kind: "site"; row: WorkSite } | null {
  const stand = play.stands.find((s) => s.id === id);
  if (stand) return { kind: "stand", row: stand };
  const site = (play.workSites || []).find((s) => s.id === id);
  if (site) return { kind: "site", row: site };
  return null;
}

function ownedUpgrades(row: { upgraded?: boolean; upgrades?: string[] }): string[] {
  const list = Array.isArray(row.upgrades) ? [...row.upgrades] : [];
  if (row.upgraded && !list.includes("fridge")) list.unshift("fridge");
  return list;
}

export function stickerBand(price: number, today = TODAY_PRICE): "green" | "yellow" | "red" {
  const d = Math.abs(Number(price) - today);
  if (!Number.isFinite(d) || d < 0.01) return "green";
  if (d <= STICKER_YELLOW) return "yellow";
  return "red";
}

export function stickerSellMul(band: "green" | "yellow" | "red"): number {
  if (band === "green") return 1;
  if (band === "yellow") return 1.6;
  return 2.8;
}

function buyPackInto(
  visitor: Visitor,
  play: PlayState,
  stockId: InvKind,
  room: number,
): number {
  if (room < 1) return 0;
  const sku = MARKET_CATALOG.find((row) => row.id === stockId);
  if (!sku || visitor.cash < sku.paperPrice) return 0;
  const n = Math.min(sku.qty, room);
  visitor.cash = roundMoney(visitor.cash - sku.paperPrice);
  play.gameBank = roundMoney(play.gameBank + sku.paperPrice);
  return n;
}

function autoFuelStand(play: PlayState, stand: Stand, visitor?: Visitor): void {
  if (!isFryCart(stand) || !stand.hired) return;
  if ((stand.propaneLeft || 0) >= 1) return;
  if (takeWarehouse(play, "propane", 1)) {
    stand.propaneLeft = PROPANE_SALES;
    return;
  }
  if (takeInv(play, "propane", 1)) {
    stand.propaneLeft = PROPANE_SALES;
    return;
  }
  if (visitor) {
    const bought = buyPackInto(visitor, play, "propane", 1);
    if (bought > 0) stand.propaneLeft = PROPANE_SALES;
  }
}

function autoStockStand(play: PlayState, stand: Stand, visitor?: Visitor): void {
  if (!stand.hired) return;
  const stockId = cartKindForStand(stand).stockId;
  let room = Math.max(0, stand.storageCap - stand.hotdogs);
  if (room <= 0) {
    autoFuelStand(play, stand, visitor);
    return;
  }
  const fromWh = Math.min(warehouseQty(play, stockId), room);
  if (fromWh > 0 && takeWarehouse(play, stockId, fromWh)) {
    stand.hotdogs = roundMoney(stand.hotdogs + fromWh);
    room -= fromWh;
  }
  const fromInv = Math.min(play.inventory.find((r) => r.kind === stockId)?.qty ?? 0, room);
  if (fromInv > 0 && takeInv(play, stockId, fromInv)) {
    stand.hotdogs = roundMoney(stand.hotdogs + fromInv);
    room -= fromInv;
  }
  if (visitor && stand.hotdogs < 1) {
    const bought = buyPackInto(visitor, play, stockId, Math.max(room, 1));
    if (bought > 0) stand.hotdogs = roundMoney(stand.hotdogs + bought);
  }
  autoFuelStand(play, stand, visitor);
}

function autoStockWork(play: PlayState, site: WorkSite, visitor?: Visitor): void {
  if (!site.hired) return;
  let room = Math.max(0, site.storageCap - site.stock);
  if (room <= 0) return;
  if (site.siteClass === "mine") {
    site.stock = roundMoney(site.stock + Math.min(room, 1));
    return;
  }
  const wanted = site.stockId ? CART_KINDS.filter((c) => c.stockId === site.stockId) : CART_KINDS;
  const tryList = wanted.length ? [...wanted, ...CART_KINDS] : CART_KINDS;
  const seen = new Set<InvKind>();
  for (const cart of tryList) {
    if (seen.has(cart.stockId)) continue;
    seen.add(cart.stockId);
    const fromWh = Math.min(warehouseQty(play, cart.stockId), room);
    if (fromWh > 0 && takeWarehouse(play, cart.stockId, fromWh)) {
      site.stock = roundMoney(site.stock + fromWh);
      site.stockId = cart.stockId;
      room -= fromWh;
      if (room <= 0) return;
    }
    const fromInv = Math.min(play.inventory.find((r) => r.kind === cart.stockId)?.qty ?? 0, room);
    if (fromInv > 0 && takeInv(play, cart.stockId, fromInv)) {
      site.stock = roundMoney(site.stock + fromInv);
      site.stockId = cart.stockId;
      room -= fromInv;
      if (room <= 0) return;
    }
  }
  if (visitor && site.stock < 1 && site.stockId) {
    const bought = buyPackInto(visitor, play, site.stockId, Math.max(room, 1));
    if (bought > 0) site.stock = roundMoney(site.stock + bought);
  }
}

export function applyShiftBoost(play: PlayState, siteId: string, hits: number): boolean {
  const found = findStandOrSite(play, siteId);
  if (!found) return false;
  const add = Math.max(0, Math.floor(hits)) * BOOST_PER_HIT;
  found.row.boostLeft = Math.min(40, (found.row.boostLeft || 0) + add);
  return true;
}

function burstCount(hits: number): number {
  if (hits < 1) return 0;
  return Math.min(SHIFT_BURST_MAX, SHIFT_BURST_MIN + Math.floor((hits - 1) / 3));
}

function cartTaxRate(play: PlayState): number {
  const rate = Number(play.salesTaxRate);
  if (!Number.isFinite(rate) || rate < 0) return LAUNCH_SALES_TAX;
  return rate;
}

function sellOnce(play: PlayState, sticker: number): number {
  const tax = roundMoney(sticker * cartTaxRate(play));
  const net = roundMoney(sticker - tax);
  play.gameBank = roundMoney(play.gameBank + tax);
  play.salesTaxCollected = roundMoney((play.salesTaxCollected || 0) + tax);
  return net;
}

/** After a finished mini-game: sell 5–10 from stock in one go. Hire not required. */
export function sellShiftBurst(
  visitor: Visitor,
  land: LandBoard,
  siteId: string,
  hits: number,
): { sold: number; earned: number } {
  const play = ensurePlay(visitor);
  syncWorkSites(play, land);
  const found = findStandOrSite(play, siteId);
  if (!found) return { sold: 0, earned: 0 };
  if (found.row.hired) return { sold: 0, earned: 0 };
  const want = burstCount(hits);
  if (want < 1) return { sold: 0, earned: 0 };
  let have = found.kind === "stand" ? found.row.hotdogs : found.row.stock;
  if (found.kind === "stand" && isFryCart(found.row)) {
    have = Math.min(have, Math.max(0, Math.floor(found.row.propaneLeft || 0)));
  }
  const n = Math.min(want, Math.floor(have));
  if (n < 1) return { sold: 0, earned: 0 };
  let earned = 0;
  for (let i = 0; i < n; i++) earned = roundMoney(earned + sellOnce(play, found.row.stickerPrice));
  if (found.kind === "stand") {
    found.row.hotdogs = roundMoney(found.row.hotdogs - n);
    if (isFryCart(found.row)) found.row.propaneLeft = roundMoney((found.row.propaneLeft || 0) - n);
  } else found.row.stock = roundMoney(found.row.stock - n);
  visitor.cash = roundMoney(visitor.cash + earned);
  play.salesRing.push(earned);
  if (play.salesRing.length > INCOME_WINDOW) play.salesRing.shift();
  return { sold: n, earned };
}

function siteNeeds(site: WorkSite, today = TODAY_PRICE): CartNeed[] {
  const needs: CartNeed[] = [];
  if (!site.hired) needs.push({ id: "hire", label: "Hire" });
  if (site.siteClass === "shop" && Number(site.stock) < 1) needs.push({ id: "stock", label: "Stock" });
  if (!site.upgraded) needs.push({ id: "fridge", label: "Fridge" });
  if (Math.abs(Number(site.stickerPrice) - today) > 0.01) {
    needs.push({ id: "sticker", label: `Sticker $${today.toFixed(2)}` });
  }
  return needs;
}

function sellTicksAt(sticker: number, scored: SiteScore, today = TODAY_PRICE): number {
  return Math.max(6, Math.round(scored.sellTicks * stickerSellMul(stickerBand(sticker, today))));
}

function perMinuteAt(sticker: number, sellTicks: number, taxRate = LAUNCH_SALES_TAX): number {
  return roundMoney((60 / Math.max(1, sellTicks)) * sticker * (1 - taxRate));
}

function warehouseQty(play: PlayState, kind: InvKind): number {
  return play.warehouse.items.find((row) => row.kind === kind)?.qty ?? 0;
}

function takeKit(play: PlayState, kitId?: string): CartKind | null {
  const wanted = kitId ? CART_KINDS.filter((row) => row.kitId === kitId) : CART_KINDS;
  for (const cart of wanted) {
    if (takeInv(play, cart.kitId, 1) || takeWarehouse(play, cart.kitId, 1)) return cart;
  }
  return null;
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

function nearestVisitorPlot(land: LandBoard, x?: number, z?: number): Parcel | null {
  const owned = land.plots.filter((p) => p.island === "south" && p.owner === "visitor");
  if (!owned.length) return null;
  if (!Number.isFinite(x) || !Number.isFinite(z)) return owned[0]!;
  let best = owned[0]!;
  let bestD = Infinity;
  for (const p of owned) {
    const d = Math.hypot(p.x - (x as number), p.z - (z as number));
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

/**
 * Buy catalog lines. Default dest is the shared island warehouse.
 * dest=road drops a crate on the verge by you. 60s to take it.
 */
export function orderMarket(
  visitor: Visitor,
  land: LandBoard,
  body: { plotId?: unknown; skus?: unknown; island?: unknown; dest?: unknown; qty?: unknown; x?: unknown; z?: unknown },
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
  const packs = Math.max(1, Math.min(ORDER_MAX_QTY, Math.floor(Number(body.qty) || 1)));

  const items: InvItem[] = [];
  let paid = 0;
  for (const id of wanted) {
    if (!isKnownSku(id)) return fail("unknown_sku");
    const row = sku(id)!;
    paid = roundMoney(paid + row.paperPrice * packs);
    items.push({
      kind: row.id,
      qty: roundMoney(row.qty * packs),
      mode: "PAPER",
      provenance: "SIMULATED",
    });
  }

  const dropX = Number(body.x);
  const dropZ = Number(body.z);
  let plot: Parcel | null = null;
  if (dest === "road") {
    const named = body.plotId != null && String(body.plotId) !== "" ? String(body.plotId) : "";
    if (named) {
      plot = southVisitorPlot(land, named);
      if (!plot) return fail("not_yours");
    } else {
      plot = nearestVisitorPlot(land, dropX, dropZ);
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

  const atX = Number.isFinite(dropX) ? dropX : plot ? plot.x : ISLANDS.south.port.x;
  const atZ = Number.isFinite(dropZ) ? dropZ : plot ? plot.z : ISLANDS.south.port.z;
  const drop = roadsideDrop(land.roads, "south", atX, atZ);
  if (!drop) {
    visitor.cash = roundMoney(visitor.cash + paid);
    return fail("no_road");
  }
  const delivery: Delivery = {
    id: `del-${play.nextId++}`,
    island: "south",
    plotId: plot?.id ?? "road",
    items,
    status: "en_route",
    drop,
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
  pose?: { x?: number; z?: number; kitId?: string },
): LoopOk<{ stand: Stand }> | LoopFail {
  const play = ensurePlay(visitor);
  const plot = plotForPlace(land, plotId, pose?.x, pose?.z);
  if (!plot) return fail("not_yours");
  if (play.stands.some((s) => s.plotId === plot.id)) return fail("already_placed");
  const wanted = pose?.kitId ? CART_KINDS.filter((row) => row.kitId === pose.kitId) : CART_KINDS;
  const peek = wanted.find(
    (cart) => (play.inventory.find((r) => r.kind === cart.kitId)?.qty ?? 0) >= 1 || warehouseQty(play, cart.kitId) >= 1,
  );
  if (!peek) return fail("no_cart");
  const kitSku = sku(peek.kitId);
  if (kitSku) {
    const fit = skuFitsPlot(kitSku.zone, plot.zone);
    if (!fit.ok) return fail(fit.reason);
  }
  const cart = takeKit(play, pose?.kitId);
  if (!cart) return fail("no_cart");
  const tapX = Number.isFinite(pose?.x) ? (pose!.x as number) : plot.x;
  const tapZ = Number.isFinite(pose?.z) ? (pose!.z as number) : plot.z;
  const drop = roadsideDrop(land.roads, "south", plot.x, plot.z);
  const dPlot = Math.hypot(tapX - plot.x, tapZ - plot.z);
  const dDrop = drop ? Math.hypot(tapX - drop.x, tapZ - drop.z) : Infinity;
  const onVerge = dPlot <= PLACE_CORRIDOR_M || dDrop <= PLACE_CORRIDOR_M;
  const x = onVerge ? tapX : drop ? drop.x : plot.x;
  const z = onVerge ? tapZ : drop ? drop.z : plot.z;
  const stand: Stand = {
    id: `stand-${play.nextId++}`,
    plotId: plot.id,
    island: "south",
    x,
    z,
    kind: cart.id,
    hotdogs: 0,
    hired: false,
    staffId: null,
    staffName: null,
    attending: false,
    stickerPrice: cartTodayPrice(cart.id),
    storageCap: CART_STORAGE,
    upgraded: false,
    upgrades: [],
    sellAcc: 0,
    boostLeft: 0,
    propaneLeft: 0,
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
): LoopOk<{ stand: Stand } | { site: WorkSite }> | LoopFail {
  const play = ensurePlay(visitor);
  const found = findStandOrSite(play, standId);
  if (!found) return fail("no_stand");
  if (found.kind === "site") {
    const site = found.row;
    if (site.siteClass === "mine") return fail("mine_extracts");
    const stockId = (site.stockId && isKnownSku(site.stockId) ? site.stockId : "hotdogs") as InvKind;
    let fromInv = play.inventory.find((r) => r.kind === stockId)?.qty ?? 0;
    let fromWh = warehouseQty(play, stockId);
    if (from === "inventory") fromWh = 0;
    else if (from === "warehouse") fromInv = 0;
    const room = Math.max(0, site.storageCap - site.stock);
    const want = qty > 0 ? Math.min(qty, fromInv + fromWh, room) : Math.min(fromInv + fromWh, room);
    if (want <= 0) return fail(room <= 0 ? "full" : "no_stock");
    const takeInvN = Math.min(fromInv, want);
    const takeWhN = want - takeInvN;
    if (takeInvN && !takeInv(play, stockId, takeInvN)) return fail("no_stock");
    if (takeWhN && !takeWarehouse(play, stockId, takeWhN)) return fail("no_stock");
    site.stock = roundMoney(site.stock + want);
    site.stockId = stockId;
    return ok({ site });
  }
  const stand = found.row;
  const stockId = cartKindForStand(stand).stockId;
  let fromInv = play.inventory.find((r) => r.kind === stockId)?.qty ?? 0;
  let fromWh = warehouseQty(play, stockId);
  if (from === "inventory") fromWh = 0;
  else if (from === "warehouse") fromInv = 0;
  const room = Math.max(0, stand.storageCap - stand.hotdogs);
  const want = qty > 0 ? Math.min(qty, fromInv + fromWh, room) : Math.min(fromInv + fromWh, room);
  if (want <= 0) return fail(room <= 0 ? "full" : "no_stock");
  const takeInvN = Math.min(fromInv, want);
  const takeWhN = want - takeInvN;
  if (takeInvN && !takeInv(play, stockId, takeInvN)) return fail("no_stock");
  if (takeWhN && !takeWarehouse(play, stockId, takeWhN)) return fail("no_stock");
  stand.hotdogs = roundMoney(stand.hotdogs + want);
  return ok({ stand });
}

export function fuelStand(
  visitor: Visitor,
  standId: string,
  from?: string,
): LoopOk<{ stand: Stand }> | LoopFail {
  const play = ensurePlay(visitor);
  const found = findStandOrSite(play, standId);
  if (!found || found.kind !== "stand") return fail("no_stand");
  const stand = found.row;
  if (!isFryCart(stand)) return fail("not_fry");
  let fromInv = play.inventory.find((r) => r.kind === "propane")?.qty ?? 0;
  let fromWh = warehouseQty(play, "propane");
  if (from === "inventory") fromWh = 0;
  else if (from === "warehouse") fromInv = 0;
  if (fromInv < 1 && fromWh < 1) return fail("no_propane");
  if (fromInv >= 1) {
    if (!takeInv(play, "propane", 1)) return fail("no_propane");
  } else if (!takeWarehouse(play, "propane", 1)) {
    return fail("no_propane");
  }
  stand.propaneLeft = roundMoney((stand.propaneLeft || 0) + PROPANE_SALES);
  return ok({ stand });
}

export function hireStand(
  visitor: Visitor,
  standId: string,
  _personId?: string,
): LoopOk<{ stand: Stand } | { site: WorkSite }> | LoopFail {
  const play = ensurePlay(visitor);
  const found = findStandOrSite(play, standId);
  if (!found) return fail("no_stand");
  if (found.row.hired) return fail("already_hired");
  if (visitor.cash < HIRE_COST) return fail("no_cash");
  visitor.cash = roundMoney(visitor.cash - HIRE_COST);
  play.gameBank = roundMoney(play.gameBank + HIRE_COST);
  const person = HIRE_ROSTER[0]!;
  found.row.hired = true;
  found.row.staffId = person.id;
  found.row.staffName = person.name;
  if (found.kind === "stand") autoStockStand(play, found.row, visitor);
  else autoStockWork(play, found.row, visitor);
  if (found.kind === "stand") return ok({ stand: found.row });
  return ok({ site: found.row });
}

export function fireStand(
  visitor: Visitor,
  standId: string,
): LoopOk<{ stand: Stand } | { site: WorkSite }> | LoopFail {
  const play = ensurePlay(visitor);
  const found = findStandOrSite(play, standId);
  if (!found) return fail("no_stand");
  if (!found.row.hired) return fail("not_hired");
  found.row.hired = false;
  found.row.staffId = null;
  found.row.staffName = null;
  if (found.kind === "stand") found.row.attending = false;
  if (found.kind === "stand") return ok({ stand: found.row });
  return ok({ site: found.row });
}

export function setStandPrice(
  visitor: Visitor,
  standId: string,
  price: number,
): LoopOk<{ stand: Stand } | { site: WorkSite }> | LoopFail {
  const play = ensurePlay(visitor);
  const found = findStandOrSite(play, standId);
  if (!found) return fail("no_stand");
  const n = Number(price);
  if (!Number.isFinite(n) || n < STICKER_MIN || n > STICKER_MAX) return fail("bad_price");
  found.row.stickerPrice = roundMoney(n);
  if (found.kind === "stand") return ok({ stand: found.row });
  return ok({ site: found.row });
}

export function upgradeStand(
  visitor: Visitor,
  standId: string,
  upgradeId?: string,
): LoopOk<{ stand: Stand } | { site: WorkSite }> | LoopFail {
  const play = ensurePlay(visitor);
  const found = findStandOrSite(play, standId);
  if (!found) return fail("no_stand");
  const id = upgradeId && String(upgradeId) ? String(upgradeId) : "fridge";
  const spec = SITE_UPGRADES.find((u) => u.id === id);
  if (!spec) return fail("unknown_upgrade");
  const owned = ownedUpgrades(found.row);
  if (owned.includes(id)) return fail("already_upgraded");
  const idx = SITE_UPGRADES.findIndex((u) => u.id === id);
  if (idx > 0 && !owned.includes(SITE_UPGRADES[idx - 1]!.id)) return fail("need_prior");
  if (visitor.cash < spec.cost) return fail("no_cash");
  visitor.cash = roundMoney(visitor.cash - spec.cost);
  play.gameBank = roundMoney(play.gameBank + spec.cost);
  found.row.upgrades = [...owned, id];
  if (id === "fridge") {
    found.row.upgraded = true;
    found.row.storageCap = CART_STORAGE * 2;
  }
  if (found.row.hired) {
    if (found.kind === "stand") autoStockStand(play, found.row, visitor);
    else autoStockWork(play, found.row, visitor);
  }
  if (found.kind === "stand") return ok({ stand: found.row });
  return ok({ site: found.row });
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
  syncWorkSites(play, land);
  let earned = 0;

  for (const stand of play.stands) {
    autoStockStand(play, stand, visitor);
    if (stand.hotdogs < 1 || !stand.hired) continue;
    if (isFryCart(stand) && (stand.propaneLeft || 0) < 1) continue;
    if (!getPlot(land, stand.plotId)) continue;
    stand.sellAcc += 1;
    const today = cartTodayPrice(stand.kind);
    while (stand.hotdogs >= 1) {
      if (isFryCart(stand) && (stand.propaneLeft || 0) < 1) {
        autoFuelStand(play, stand, visitor);
        if ((stand.propaneLeft || 0) < 1) break;
      }
      const need = sellTicksAt(stand.stickerPrice, scoreForStand(stand, land, play), today);
      if (stand.sellAcc < need) break;
      stand.sellAcc -= need;
      stand.hotdogs = roundMoney(stand.hotdogs - 1);
      if (isFryCart(stand)) stand.propaneLeft = roundMoney((stand.propaneLeft || 0) - 1);
      if ((stand.boostLeft || 0) > 0) stand.boostLeft -= 1;
      earned = roundMoney(earned + sellOnce(play, stand.stickerPrice));
    }
  }

  for (const site of play.workSites) {
    autoStockWork(play, site, visitor);
    if (site.stock < 1 || !site.hired) continue;
    if (!getPlot(land, site.plotId)) continue;
    site.sellAcc += 1;
    while (site.stock >= 1) {
      const need = sellTicksAt(
        site.stickerPrice,
        scoreWork(land, play, {
          id: site.id,
          plotId: site.plotId,
          hired: site.hired,
          stock: site.stock,
          upgraded: site.upgraded,
          upgrades: site.upgrades,
          boostLeft: site.boostLeft || 0,
        }),
      );
      if (site.sellAcc < need) break;
      site.sellAcc -= need;
      site.stock = roundMoney(site.stock - 1);
      if ((site.boostLeft || 0) > 0) site.boostLeft -= 1;
      earned = roundMoney(earned + sellOnce(play, site.stickerPrice));
    }
  }

  visitor.cash = roundMoney(visitor.cash + earned);
  play.salesRing.push(earned);
  if (play.salesRing.length > INCOME_WINDOW) play.salesRing.shift();
  return earned;
}

export function tickPlay(
  visitor: Visitor,
  land: LandBoard,
  tick: number,
  nowMs = Date.now(),
  taxRate = LAUNCH_SALES_TAX,
): number {
  const play = ensurePlay(visitor);
  play.salesTaxRate = taxRate;
  recallStaleDeliveries(visitor, nowMs);
  tickWarehouseRent(visitor, tick);
  return tickHotdogSales(visitor, land);
}

export function playSnapshot(visitor: Visitor, land: LandBoard, taxRate?: number) {
  const play = ensurePlay(visitor);
  if (Number.isFinite(taxRate)) play.salesTaxRate = Number(taxRate);
  syncWorkSites(play, land);
  const stands = play.stands.map((s) => {
    const cart = cartKindForStand(s);
    const scored = scoreForStand(s, land, play);
    const plot = getPlot(land, s.plotId);
    const today = cartTodayPrice(s.kind);
    const band = stickerBand(s.stickerPrice, today);
    const ticks = sellTicksAt(s.stickerPrice, scored, today);
    return {
      ...s,
      kind: cart.id,
      label: cart.label,
      stockId: cart.stockId,
      stockLabel: cart.stockLabel,
      games: cart.games,
      todayPrice: today,
      propaneLeft: s.propaneLeft || 0,
      siteClass: "cart" as const,
      lotName: plot ? plot.name : null,
      needs: standNeeds(s, today),
      desirability: scored.score,
      sellTicks: ticks,
      parts: scored.parts,
      searching: scored.searching,
      cap: scored.cap,
      rivalsOnStreet: scored.rivalsOnStreet,
      perMinute: perMinuteAt(s.stickerPrice, ticks, play.salesTaxRate),
      boostLeft: s.boostLeft || 0,
      stickerBand: band,
      stickerMul: stickerSellMul(band),
      trafficBand: plot ? plotTrafficBand(land, plot) : "red",
    };
  });
  const work = play.workSites.map((s) => {
    const scored = scoreWork(land, play, {
      id: s.id,
      plotId: s.plotId,
      hired: s.hired,
      stock: s.stock,
      upgraded: s.upgraded,
      upgrades: s.upgrades,
      boostLeft: s.boostLeft || 0,
    });
    const plot = getPlot(land, s.plotId);
    const band = stickerBand(s.stickerPrice);
    const ticks = sellTicksAt(s.stickerPrice, scored);
    return {
      ...s,
      hotdogs: s.stock,
      games: s.games,
      siteClass: s.siteClass,
      lotName: plot ? plot.name : null,
      needs: siteNeeds(s),
      desirability: scored.score,
      sellTicks: ticks,
      parts: scored.parts,
      searching: scored.searching,
      cap: scored.cap,
      rivalsOnStreet: scored.rivalsOnStreet,
      perMinute: perMinuteAt(s.stickerPrice, ticks, play.salesTaxRate),
      boostLeft: s.boostLeft || 0,
      stickerBand: band,
      stickerMul: stickerSellMul(band),
      trafficBand: plot ? plotTrafficBand(land, plot) : "red",
    };
  });
  return {
    mode: "PAPER" as const,
    provenance: "SIMULATED" as const,
    note: FIRST_LOOP_NOTE,
    island: "south" as const,
    cash: visitor.cash,
    incomePerMinute: incomePerMinute(play),
    todayPrice: TODAY_PRICE,
    hireCost: HIRE_COST,
    upgradeCatalog: SITE_UPGRADES.map((u) => ({ ...u })),
    deliveryWaitMs: DELIVERY_WAIT_MS,
    salesTax: play.salesTaxRate,
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
    cartKinds: CART_KINDS.map((row) => ({ ...row })),
    inventory: play.inventory.map((row) => ({ ...row })),
    hireRoster: HIRE_ROSTER.map((p) => ({ ...p })),
    cartNeeds: cartLoopNeeds(play),
    deliveries: play.deliveries.map((d) => ({ ...d, items: d.items.map((i) => ({ ...i })) })),
    stands,
    sites: [...stands, ...work],
    workSites: work,
    leases: land.plots.filter((p) => p.owner === "visitor").map((p) => ({
      id: p.id,
      name: p.name,
      street: p.street,
      zone: p.zone,
      island: p.island,
      class: p.class,
      plotBand: p.band,
      x: p.x,
      z: p.z,
      price: p.price,
      band: plotTrafficBand(land, p),
      use: p.use,
    })),
    leaseOptions: land.plots
      .filter(
        (p) =>
          p.island === "south" &&
          !p.owner &&
          (p.class === "by_right" || p.class === "cart_pad") &&
          (p.band === "street" || p.class === "cart_pad"),
      )
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
        x: p.x,
        z: p.z,
      })),
  };
}
