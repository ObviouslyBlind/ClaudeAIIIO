/** PAPER House money bills. Slider writes at House passage. Not live votes. */

import { canOriginateMoneyBill, maybeElectHouse } from "./offices.ts";
import { setStatuteSlider, type Statute } from "./statutes.ts";

export type MoneyBill = {
  statuteId: string;
  slider: string;
  value: number;
  mode: "PAPER";
  provenance: "SIMULATED";
  note: string;
};

export type MoneyWorld = {
  statutes: Statute[];
  tick: number;
};

export type PassMoneyBillOk = { ok: true };
export type PassMoneyBillFail = { ok: false; reason: string };
export type PassMoneyBillResult = PassMoneyBillOk | PassMoneyBillFail;

const BILL_NOTE =
  "PAPER House money bill. Writes a catalog slider at House passage. Not live votes.";

/** Table a catalog slider write. Does not change the live rate until House passage. */
export function tableMoneyBill(input: {
  statuteId: string;
  slider: string;
  value: number;
}): MoneyBill {
  return {
    statuteId: input.statuteId,
    slider: input.slider,
    value: input.value,
    mode: "PAPER",
    provenance: "SIMULATED",
    note: BILL_NOTE,
  };
}

/**
 * Money bills originate in the House and write at passage (PLAN §5.4).
 * Elects the PAPER NPC slate from `tick` (day 14 general). Vacant House: no write.
 */
export function passMoneyBill(world: MoneyWorld, bill: MoneyBill): PassMoneyBillResult {
  const chamber = maybeElectHouse(world.tick);
  if (!canOriginateMoneyBill(chamber)) {
    return { ok: false, reason: "cannot_originate" };
  }

  const row = world.statutes.find((s) => s.id === bill.statuteId);
  if (!row) return { ok: false, reason: "unknown_statute" };
  if (!row.money_bill) return { ok: false, reason: "not_money_bill" };

  if (!setStatuteSlider(world.statutes, bill.statuteId, bill.slider, bill.value)) {
    return { ok: false, reason: "write_failed" };
  }
  return { ok: true };
}
