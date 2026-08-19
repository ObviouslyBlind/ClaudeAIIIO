/** Paper statute catalog. Players amend rows; they do not author from blank paper. */

import { LAUNCH_SALES_TAX } from "./economy.ts";

export type StatuteGroup =
  | "money"
  | "trade"
  | "land"
  | "planning"
  | "firms"
  | "labour"
  | "environment"
  | "stocks"
  | "elections"
  | "offices";

export type Statute = {
  id: string;
  title: string;
  group: StatuteGroup;
  enabled: boolean;
  money_bill: boolean;
  council_may_restrict: boolean;
  sliders: Record<string, number>;
  writes: string[];
  provenance: "PAPER";
};

type StatuteDraft = Omit<Statute, "provenance" | "money_bill" | "council_may_restrict" | "sliders" | "writes"> &
  Partial<Pick<Statute, "money_bill" | "council_may_restrict" | "sliders" | "writes">>;

function statute(draft: StatuteDraft): Statute {
  return {
    money_bill: false,
    council_may_restrict: false,
    sliders: {},
    writes: [],
    ...draft,
    provenance: "PAPER",
  };
}

/**
 * Starter pack from PLAN §8: ~80 catalog rows, ~60 enabled at launch.
 * Disabled rows stay visible so a later House can turn them on.
 */
export function createStatuteCatalog(): Statute[] {
  return [
    // --- money (~12) ---
    statute({
      id: "sales_tax",
      title: "Sales tax",
      group: "money",
      enabled: true,
      money_bill: true,
      sliders: { rate: LAUNCH_SALES_TAX },
      writes: ["ledger.sink"],
    }),
    statute({
      id: "income_tax",
      title: "Income tax",
      group: "money",
      enabled: false,
      money_bill: true,
      sliders: { rate: 0 },
      writes: ["ledger.sink"],
    }),
    statute({
      id: "deposit_interest",
      title: "Deposit interest",
      group: "money",
      enabled: true,
      money_bill: true,
      sliders: { rate: 0.01 },
      writes: ["bank.deposit_rate"],
    }),
    statute({
      id: "lending_rate",
      title: "Lending rate",
      group: "money",
      enabled: true,
      money_bill: true,
      sliders: { rate: 0.04 },
      writes: ["bank.lending_rate"],
    }),
    statute({
      id: "treasury_spend_lock",
      title: "Treasury spend lock",
      group: "money",
      enabled: true,
      money_bill: true,
      sliders: { lock: 1 },
      writes: ["treasury.spend_lock"],
    }),
    statute({
      id: "new_player_cash_cap",
      title: "New-player cash cap",
      group: "money",
      enabled: true,
      sliders: { cap: 100 },
      writes: ["spawn.cash_cap"],
    }),
    statute({
      id: "transfer_tax",
      title: "Transfer tax",
      group: "money",
      enabled: true,
      money_bill: true,
      sliders: { rate: 0.01 },
      writes: ["ledger.sink"],
    }),
    statute({
      id: "company_registration_fee",
      title: "Company registration fee",
      group: "money",
      enabled: false,
      money_bill: true,
      sliders: { fee: 50 },
      writes: ["ledger.sink", "firms.registration_fee"],
    }),
    statute({
      id: "planning_fee_schedule",
      title: "Planning fee schedule",
      group: "money",
      enabled: true,
      money_bill: true,
      council_may_restrict: true,
      sliders: { fee: 25 },
      writes: ["planning.fee", "ledger.sink"],
    }),
    statute({
      id: "upkeep_multiplier",
      title: "Upkeep multiplier",
      group: "money",
      enabled: true,
      sliders: { multiplier: 1 },
      writes: ["sites.upkeep"],
    }),
    statute({
      id: "unemployment_none",
      title: "Unemployment none",
      group: "money",
      enabled: false,
      money_bill: true,
      sliders: { dole: 0 },
      writes: ["labour.dole"],
    }),
    statute({
      id: "payroll_withholding",
      title: "Payroll withholding",
      group: "money",
      enabled: false,
      money_bill: true,
      sliders: { rate: 0 },
      writes: ["ledger.sink", "labour.withholding"],
    }),

    // --- trade (~10) ---
    statute({
      id: "national_tariff",
      title: "National tariff",
      group: "trade",
      enabled: true,
      money_bill: true,
      sliders: { rate: 0 },
      writes: ["trade.tariff", "ledger.sink"],
    }),
    statute({
      id: "ferry_ticket",
      title: "Ferry ticket",
      group: "trade",
      enabled: true,
      money_bill: true,
      sliders: { cost: 15 },
      writes: ["ferry.cost"],
    }),
    statute({
      id: "port_fee",
      title: "Port fee",
      group: "trade",
      enabled: true,
      money_bill: true,
      sliders: { fee: 2 },
      writes: ["ferry.port_fee"],
    }),
    statute({
      id: "ferry_travel_time",
      title: "Ferry travel time",
      group: "trade",
      enabled: true,
      sliders: { seconds: 90 },
      writes: ["ferry.travel_time"],
    }),
    statute({
      id: "cargo_hold_cap",
      title: "Cargo hold cap",
      group: "trade",
      enabled: true,
      sliders: { cap: 8 },
      writes: ["cart.hold_cap"],
    }),
    statute({
      id: "embargo_variant",
      title: "Embargo variant",
      group: "trade",
      enabled: false,
      sliders: { ore: 0, fuel: 0 },
      writes: ["trade.embargo"],
    }),
    statute({
      id: "island_export_license",
      title: "Island export license",
      group: "trade",
      enabled: false,
      sliders: { required: 1 },
      writes: ["trade.export_license"],
    }),
    statute({
      id: "smuggling_none",
      title: "Smuggling none",
      group: "trade",
      enabled: false,
      sliders: { penalty: 0 },
      writes: ["trade.smuggling"],
    }),
    statute({
      id: "npc_importer_bid_size",
      title: "NPC importer bid size",
      group: "trade",
      enabled: true,
      sliders: { size: 1 },
      writes: ["npc.importer_bid"],
    }),
    statute({
      id: "npc_exporter_bid_size",
      title: "NPC exporter bid size",
      group: "trade",
      enabled: true,
      sliders: { size: 1 },
      writes: ["npc.exporter_bid"],
    }),

    // --- land (~10; density is one row with north/south sliders) ---
    statute({
      id: "plot_sizes",
      title: "Plot sizes",
      group: "land",
      enabled: true,
      sliders: { stall: 1, farm: 2, artisan: 1 },
      writes: ["land.plot_sizes"],
    }),
    statute({
      id: "by_right_list",
      title: "By-right list",
      group: "land",
      enabled: true,
      sliders: { stall: 1, farm: 1, artisan: 1, workshop: 1 },
      writes: ["land.by_right"],
    }),
    statute({
      id: "large_class_list",
      title: "Large-class list",
      group: "land",
      enabled: true,
      sliders: { mine: 1, factory: 1, warehouse: 1, plantation: 1, quay: 1 },
      writes: ["land.large_class"],
    }),
    statute({
      id: "artisan_output_caps",
      title: "Artisan output caps",
      group: "land",
      enabled: true,
      council_may_restrict: true,
      sliders: { ore_per_hour: 20 },
      writes: ["sites.artisan_cap"],
    }),
    statute({
      id: "factory_output_caps",
      title: "Factory output caps",
      group: "land",
      enabled: true,
      council_may_restrict: true,
      sliders: { units_per_hour: 80 },
      writes: ["sites.factory_cap"],
    }),
    statute({
      id: "mine_depth_depletion",
      title: "Mine depth / depletion",
      group: "land",
      enabled: true,
      sliders: { depth: 12, depletion: 0.02 },
      writes: ["sites.mine_depth", "sites.depletion"],
    }),
    statute({
      id: "farm_plot_max_by_right",
      title: "Farm plot max by-right",
      group: "land",
      enabled: true,
      council_may_restrict: true,
      sliders: { plots: 2 },
      writes: ["land.farm_by_right_plots"],
    }),
    statute({
      id: "warehouse_cap",
      title: "Warehouse cap",
      group: "land",
      enabled: true,
      council_may_restrict: true,
      sliders: { lots: 4 },
      writes: ["sites.warehouse_cap"],
    }),
    statute({
      id: "density_caps",
      title: "Density caps",
      group: "land",
      enabled: true,
      sliders: { north: 40, south: 40 },
      writes: ["land.density_north", "land.density_south"],
    }),
    statute({
      id: "lease_length",
      title: "Lease length",
      group: "land",
      enabled: true,
      sliders: { days: 28 },
      writes: ["land.lease_days"],
    }),

    // --- planning (~8) ---
    statute({
      id: "council_vote_window",
      title: "Council vote window",
      group: "planning",
      enabled: true,
      sliders: { hours: 48 },
      writes: ["planning.vote_hours"],
    }),
    statute({
      id: "council_quorum",
      title: "Council quorum",
      group: "planning",
      enabled: true,
      sliders: { quorum: 3 },
      writes: ["planning.quorum"],
    }),
    statute({
      id: "majority_rule",
      title: "Majority rule",
      group: "planning",
      enabled: true,
      sliders: { majority: 0.5 },
      writes: ["planning.majority"],
    }),
    statute({
      id: "resident_poll_bootstrap",
      title: "Resident-poll bootstrap",
      group: "planning",
      enabled: true,
      sliders: { hours: 48, quorum: 3 },
      writes: ["planning.bootstrap_hours", "planning.bootstrap_quorum"],
    }),
    statute({
      id: "neighbour_notice",
      title: "Neighbour notice",
      group: "planning",
      enabled: false,
      sliders: { notice: 1 },
      writes: ["planning.neighbour_notice"],
    }),
    statute({
      id: "variation_rule",
      title: "Variation rule",
      group: "planning",
      enabled: true,
      sliders: { required: 1 },
      writes: ["planning.variation"],
    }),
    statute({
      id: "planning_freeze",
      title: "Planning freeze",
      group: "planning",
      enabled: false,
      sliders: { freeze: 0 },
      writes: ["planning.freeze"],
    }),
    statute({
      id: "appeal_none",
      title: "Appeal none (beta)",
      group: "planning",
      enabled: false,
      sliders: { appeal: 0 },
      writes: ["planning.appeal"],
    }),

    // --- firms (~8) ---
    statute({
      id: "sole_trader",
      title: "Sole trader",
      group: "firms",
      enabled: true,
      sliders: { allowed: 1 },
      writes: ["firms.sole_trader"],
    }),
    statute({
      id: "co_owners",
      title: "Co-owners",
      group: "firms",
      enabled: true,
      sliders: { allowed: 1 },
      writes: ["firms.co_owners"],
    }),
    statute({
      id: "owner_neq_ceo_allowed",
      title: "Owner≠CEO allowed",
      group: "firms",
      enabled: true,
      sliders: { allowed: 1 },
      writes: ["firms.owner_neq_ceo"],
    }),
    statute({
      id: "owner_eq_ceo_stack",
      title: "Owner=CEO stack",
      group: "firms",
      enabled: true,
      sliders: { allowed: 1 },
      writes: ["firms.owner_eq_ceo"],
    }),
    statute({
      id: "max_owners_on_form",
      title: "Max owners on a form",
      group: "firms",
      enabled: true,
      sliders: { cap: 8 },
      writes: ["firms.max_owners"],
    }),
    statute({
      id: "books_public_if_large",
      title: "Books public if large",
      group: "firms",
      enabled: false,
      sliders: { required: 1 },
      writes: ["firms.books_public"],
    }),
    statute({
      id: "bankruptcy_unowned",
      title: "Bankruptcy (site returns to unowned)",
      group: "firms",
      enabled: true,
      sliders: { return_unowned: 1 },
      writes: ["firms.bankruptcy"],
    }),
    statute({
      id: "npc_firm_charter",
      title: "NPC firm charter",
      group: "firms",
      enabled: true,
      sliders: { allowed: 1 },
      writes: ["firms.npc_charter"],
    }),

    // --- labour (~8) ---
    statute({
      id: "wage_floor",
      title: "Wage floor",
      group: "labour",
      enabled: true,
      sliders: { wage: 4 },
      writes: ["labour.wage_floor"],
    }),
    statute({
      id: "three_job_cap",
      title: "3-job cap",
      group: "labour",
      enabled: true,
      sliders: { cap: 3 },
      writes: ["labour.job_cap"],
    }),
    statute({
      id: "ai_worker_slots_by_class",
      title: "AI worker slots by site class",
      group: "labour",
      enabled: true,
      sliders: { artisan: 2, factory: 8, farm: 3 },
      writes: ["labour.ai_slots"],
    }),
    statute({
      id: "human_shift_bonus_cap",
      title: "Human shift bonus cap",
      group: "labour",
      enabled: false,
      sliders: { bonus_per_hour: 2 },
      writes: ["labour.shift_bonus_cap"],
    }),
    statute({
      id: "hiring_pool",
      title: "Hiring pool",
      group: "labour",
      enabled: false,
      sliders: { open: 0 },
      writes: ["labour.hiring_pool"],
    }),
    statute({
      id: "president_ceo_stack_one_job",
      title: "President+CEO stack counts as one",
      group: "labour",
      enabled: true,
      sliders: { stack: 1 },
      writes: ["labour.president_ceo_stack"],
    }),
    statute({
      id: "staff_hire_cap_by_class",
      title: "Staff hire cap by class",
      group: "labour",
      enabled: true,
      sliders: { artisan: 4, factory: 16, farm: 6 },
      writes: ["labour.hire_cap"],
    }),
    statute({
      id: "npc_labour_pool_size",
      title: "NPC labour pool size",
      group: "labour",
      enabled: true,
      sliders: { size: 400 },
      writes: ["npc.labour_pool"],
    }),

    // --- environment (~8, mostly local-amendable) ---
    statute({
      id: "noise_cap",
      title: "Noise cap",
      group: "environment",
      enabled: true,
      council_may_restrict: true,
      sliders: { cap: 60 },
      writes: ["nuisance.noise"],
    }),
    statute({
      id: "smoke_cap",
      title: "Smoke cap",
      group: "environment",
      enabled: true,
      council_may_restrict: true,
      sliders: { cap: 40 },
      writes: ["nuisance.smoke"],
    }),
    statute({
      id: "river_spoil_cap",
      title: "River spoil cap",
      group: "environment",
      enabled: true,
      council_may_restrict: true,
      sliders: { cap: 20 },
      writes: ["nuisance.river_spoil"],
    }),
    statute({
      id: "night_hours_factories",
      title: "Night hours for factories",
      group: "environment",
      enabled: false,
      council_may_restrict: true,
      sliders: { start_hour: 22, end_hour: 6 },
      writes: ["nuisance.night_hours"],
    }),
    statute({
      id: "sunday_close",
      title: "Sunday-close variant",
      group: "environment",
      enabled: false,
      council_may_restrict: true,
      sliders: { closed: 1 },
      writes: ["nuisance.sunday_close"],
    }),
    statute({
      id: "forest_replant",
      title: "Forest replant rule",
      group: "environment",
      enabled: false,
      council_may_restrict: true,
      sliders: { replant: 1 },
      writes: ["land.replant"],
    }),
    statute({
      id: "fishery_none",
      title: "Fishery none",
      group: "environment",
      enabled: false,
      sliders: { fishery: 0 },
      writes: ["land.fishery"],
    }),
    statute({
      id: "quarry_buffer_harbour",
      title: "Quarry buffer from harbour",
      group: "environment",
      enabled: false,
      council_may_restrict: true,
      sliders: { metres: 80 },
      writes: ["land.quarry_buffer"],
    }),

    // --- stocks (~6) ---
    statute({
      id: "auction_period",
      title: "Auction period",
      group: "stocks",
      enabled: false,
      sliders: { hours: 24 },
      writes: ["stocks.auction_hours"],
    }),
    statute({
      id: "trading_fee",
      title: "Trading fee",
      group: "stocks",
      enabled: false,
      money_bill: true,
      sliders: { rate: 0.005 },
      writes: ["stocks.fee", "ledger.sink"],
    }),
    statute({
      id: "listing_gate",
      title: "Listing gate",
      group: "stocks",
      enabled: false,
      sliders: { min_books: 1 },
      writes: ["stocks.listing_gate"],
    }),
    statute({
      id: "shorting",
      title: "Shorting",
      group: "stocks",
      enabled: false,
      sliders: { allowed: 0 },
      writes: ["stocks.shorting"],
    }),
    statute({
      id: "leverage",
      title: "Leverage",
      group: "stocks",
      enabled: false,
      sliders: { allowed: 0 },
      writes: ["stocks.leverage"],
    }),
    statute({
      id: "island_bank_reserve_ratio",
      title: "Island Bank reserve ratio",
      group: "stocks",
      enabled: true,
      money_bill: true,
      sliders: { ratio: 0.2 },
      writes: ["bank.reserve_ratio"],
    }),

    // --- elections (~8) ---
    statute({
      id: "general_interval",
      title: "General interval",
      group: "elections",
      enabled: true,
      sliders: { days: 28 },
      writes: ["calendar.general_interval"],
    }),
    statute({
      id: "council_interval",
      title: "Council interval",
      group: "elections",
      enabled: true,
      sliders: { days: 28 },
      writes: ["calendar.council_interval"],
    }),
    statute({
      id: "first_general_offset",
      title: "First-general offset",
      group: "elections",
      enabled: true,
      sliders: { days: 14 },
      writes: ["calendar.first_general"],
    }),
    statute({
      id: "first_council_offset",
      title: "First-council offset",
      group: "elections",
      enabled: true,
      sliders: { days: 21 },
      writes: ["calendar.first_council"],
    }),
    statute({
      id: "franchise",
      title: "Franchise",
      group: "elections",
      enabled: true,
      sliders: { lease: 1, citizen: 0 },
      writes: ["elections.franchise"],
    }),
    statute({
      id: "house_fptp",
      title: "House FPTP",
      group: "elections",
      enabled: true,
      sliders: { fptp: 1 },
      writes: ["elections.house_system"],
    }),
    statute({
      id: "council_at_large",
      title: "Council at-large",
      group: "elections",
      enabled: true,
      sliders: { seats: 5 },
      writes: ["elections.council_seats"],
    }),
    statute({
      id: "dual_sitting_allowed",
      title: "Dual-sitting allowed",
      group: "elections",
      enabled: true,
      sliders: { allowed: 1 },
      writes: ["elections.dual_sitting"],
    }),

    // --- offices (~6) ---
    statute({
      id: "confidence_rule",
      title: "Confidence rule",
      group: "offices",
      enabled: true,
      sliders: { majority: 11 },
      writes: ["offices.confidence"],
    }),
    statute({
      id: "senate_appointment",
      title: "Senate appointment 6/3/2",
      group: "offices",
      enabled: true,
      sliders: { government: 6, opposition: 3, independents: 2 },
      writes: ["offices.senate"],
    }),
    statute({
      id: "money_bill_certification",
      title: "Money-bill certification",
      group: "offices",
      enabled: true,
      sliders: { required: 1 },
      writes: ["offices.money_bill_cert"],
    }),
    statute({
      id: "senate_delay_once",
      title: "Senate delay once",
      group: "offices",
      enabled: true,
      sliders: { delay: 1, hours: 24 },
      writes: ["offices.senate_delay"],
    }),
    statute({
      id: "governor_freeze_24h",
      title: "Governor freeze 24h",
      group: "offices",
      enabled: false,
      sliders: { hours: 24 },
      writes: ["offices.governor_freeze"],
    }),
    statute({
      id: "speaker_tie_break",
      title: "Speaker tie-break",
      group: "offices",
      enabled: true,
      sliders: { allowed: 1 },
      writes: ["offices.speaker_tie"],
    }),
  ];
}

export function statuteById(catalog: Statute[], id: string): Statute | undefined {
  return catalog.find((s) => s.id === id);
}

export function salesTaxRate(catalog: Statute[]): number {
  const s = statuteById(catalog, "sales_tax");
  if (!s || !s.enabled) return 0;
  const rate = Number(s.sliders.rate) || 0;
  return rate < 0 ? 0 : rate;
}

export function ferryTicketCost(catalog: Statute[], fallback = 15): number {
  const s = statuteById(catalog, "ferry_ticket");
  if (!s || !s.enabled) return fallback;
  const cost = Number(s.sliders.cost);
  return Number.isFinite(cost) && cost >= 0 ? cost : fallback;
}

export function nationalTariffRate(catalog: Statute[]): number {
  const s = statuteById(catalog, "national_tariff");
  if (!s || !s.enabled) return 0;
  const rate = Number(s.sliders.rate) || 0;
  return rate < 0 ? 0 : rate;
}

export function portFeeAmount(catalog: Statute[], fallback = 2): number {
  const s = statuteById(catalog, "port_fee");
  if (!s || !s.enabled) return fallback;
  const fee = Number(s.sliders.fee);
  return Number.isFinite(fee) && fee >= 0 ? fee : fallback;
}

export function setStatuteSlider(catalog: Statute[], id: string, key: string, value: number): boolean {
  const s = statuteById(catalog, id);
  if (!s) return false;
  s.sliders[key] = value;
  return true;
}

export function setStatuteEnabled(catalog: Statute[], id: string, enabled: boolean): boolean {
  const s = statuteById(catalog, id);
  if (!s) return false;
  s.enabled = enabled;
  return true;
}
