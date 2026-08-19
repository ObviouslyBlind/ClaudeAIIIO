/**
 * Launch PAPER prices. SIMULATED. The sim owns these numbers.
 *
 * Land is scarce and generally expensive. Street carts are the cheap first
 * loop: $1000 PAPER buys a cart, hire, and stock, not a street lease.
 * Sales tax is one statute rate for books, stalls, and carts.
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

/** Street-cart kit stays the affordable entry vs land. Fruit is cheapest. */
export const CART_PRICES = {
  fruit: { kit: 85, pack: 12, sale: 6 },
  watermelon: { kit: 95, pack: 14, sale: 7 },
  fish_chips: { kit: 140, pack: 22, sale: 11 },
} as const;

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
