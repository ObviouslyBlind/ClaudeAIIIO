/**
 * Launch PAPER prices. SIMULATED. The sim owns these numbers.
 *
 * Land is scarce. Live spawn is $10,000: rooms and kit fit; $15,000 dirt does not.
 * A highway pad is still $750. Sales tax is one statute rate for books, stalls, and carts.
 */

/** Launch sales-tax statute. PLAN §3.4 sink. NPC-NPC fills recycle as wages. */
export const LAUNCH_SALES_TAX = 0.08;

/** PAPER $/m² before band and port multipliers. North stays dearer. */
export const LAND_NORTH_RATE = 22.5;
export const LAND_SOUTH_RATE = 8.5;

/** Floors so a tiny lot is still a real ask, not a $24 starter. */
export const LAND_FLOOR: Record<"north" | "south", Record<"shore" | "street" | "field", number>> = {
  north: { shore: 11_000, street: 6_800, field: 5_200 },
  south: { shore: 4_200, street: 2_400, field: 1_800 },
};

/** Same-street vacant asks jump most; other island the least. Capped vs seed. */
export const LAND_STREET_BUMP = 0.035;
export const LAND_ISLAND_BUMP = 0.012;
export const LAND_GLOBAL_BUMP = 0.004;
export const LAND_ASK_CAP_MUL = 4;

/**
 * Fruit is the cheap first cart. Watermelon and fry kits also fit $10,000 spawn.
 * Fry stays under the South street floor. Building dirt does not fit spawn.
 */
export const CART_PRICES = {
  fruit: { kit: 90, pack: 14, sale: 6 },
  watermelon: { kit: 1_150, pack: 22, sale: 8 },
  fish_chips: { kit: 1_850, pack: 28, sale: 11 },
} as const;

/** Empty fruit / melon carts read 1/10. Fry starts a notch higher. */
export const CART_BASE_GRADE: Record<"fruit" | "watermelon" | "fish_chips", number> = {
  fruit: 1,
  watermelon: 1,
  fish_chips: 2,
};

/**
 * Path from 1–2/10 to 8–10/10. Sum is on the order of a South street lot.
 * Fridge still first; later kit is the grind.
 */
export const CART_UPGRADES: { id: string; label: string; cost: number; appeal: number }[] = [
  { id: "fridge", label: "Fridge", cost: 180, appeal: 1.5 },
  { id: "sign", label: "Sign", cost: 260, appeal: 1.0 },
  { id: "awning", label: "Awning", cost: 400, appeal: 1.2 },
  { id: "lights", label: "Lights", cost: 480, appeal: 1.2 },
  { id: "stools", label: "Stools", cost: 720, appeal: 1.6 },
];

export const CART_PAPER_PRICE = CART_PRICES.fruit.kit;
export const HIRE_COST = 300;
/** Pack of 20. Fruit default; fry packs cost more in the catalog. */
export const HOTDOG_PACK_PRICE = CART_PRICES.fruit.pack;
export const HOTDOG_PACK_QTY = 20;
export const HOTDOG_SALE_PRICE = CART_PRICES.fruit.sale;

/** Fry cart bottle. Not a 13th market good — first-loop stock only. */
export const PROPANE_PRICE = 18;
export const PROPANE_SALES = 40;

/** Tiny highway-verge cart pads. Fixed ask. Max three per visitor. */
export const CART_PAD_PRICE = 750;
export const CART_PAD_MAX = 3;

export const STORAGE_UPGRADE_COST = CART_UPGRADES[0]!.cost;

export const OWNER_ACCOUNT_NO = 1;
export const VISITOR_ACCOUNT_NO = 2;

/** Live spawn / reset. $10,000 buys one or two rooms and kit, not $15,000 dirt. */
export const UNIT_SLICE_FAUCET = 10_000;
export const UNIT_ROOM_PRICE = { shop: 1_200, apartment: 900, office: 1_100 } as const;
export const BUILDING_LAND_PRICE = 15_000;
export const GROUND_RENT_PER_UNIT_DAY = 8;
export const PACKER_MOVE_PER_TICK = 2;
export const LEASE_HOURS = [3, 6, 24, 48] as const;
export const TICKS_PER_SIM_HOUR = 150;
/** Shop kit feeds the same 0–10 siteScore as cart fridge/sign. Not a second meter. */
export const UNIT_KIT = [
  { id: "shelf", label: "Shelf", use: "shop", cost: 70, appeal: 1.0 },
  { id: "till", label: "Till", use: "shop", cost: 90, appeal: 1.0 },
  { id: "fridge", label: "Fridge", use: "shop", cost: 180, appeal: 1.5 },
  { id: "bed", label: "Bed", use: "apartment", cost: 80, appeal: 0 },
  { id: "shower", label: "Shower", use: "apartment", cost: 90, appeal: 0 },
  { id: "sink", label: "Sink", use: "apartment", cost: 60, appeal: 0 },
  { id: "desk", label: "Desk", use: "office", cost: 100, appeal: 0 },
  { id: "cabinet", label: "Filing cabinet", use: "office", cost: 80, appeal: 0 },
] as const;
