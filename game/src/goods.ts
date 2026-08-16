export const GOOD_IDS = [
  "corn",
  "potato",
  "lettuce",
  "beans",
  "ore",
  "lumber",
  "planks",
  "nails",
  "iron_bars",
  "tools",
  "concrete",
  "fuel",
] as const;

export type GoodId = (typeof GOOD_IDS)[number];

export const GOODS: Record<
  GoodId,
  { chain: "food" | "extract" | "industry"; fair0: number; produce: number; consume: number }
> = {
  corn: { chain: "food", fair0: 0.25, produce: 18, consume: 16 },
  potato: { chain: "food", fair0: 0.2, produce: 16, consume: 14 },
  lettuce: { chain: "food", fair0: 0.08, produce: 22, consume: 20 },
  beans: { chain: "food", fair0: 0.18, produce: 14, consume: 12 },
  ore: { chain: "extract", fair0: 8, produce: 6, consume: 5 },
  lumber: { chain: "extract", fair0: 6, produce: 8, consume: 7 },
  planks: { chain: "industry", fair0: 2.2, produce: 10, consume: 9 },
  nails: { chain: "industry", fair0: 1.5, produce: 12, consume: 11 },
  iron_bars: { chain: "industry", fair0: 20, produce: 4, consume: 3.5 },
  tools: { chain: "industry", fair0: 12, produce: 3, consume: 2.8 },
  concrete: { chain: "industry", fair0: 12, produce: 5, consume: 4.5 },
  fuel: { chain: "industry", fair0: 4, produce: 7, consume: 6.5 },
};

export const INDEX_WEIGHTS: Record<GoodId, number> = {
  corn: 1,
  potato: 1,
  lettuce: 1,
  beans: 1,
  ore: 1,
  lumber: 1,
  planks: 1,
  nails: 1,
  iron_bars: 1,
  tools: 1,
  concrete: 1,
  fuel: 1,
};
