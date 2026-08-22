/**
 * Small "Do you want to buy this lot?" prompt. PAPER / SIMULATED.
 * Clicking a $ bar or vacant dirt opens this. Yes posts /api/lease. No closes.
 */

import { plotDisplayName } from "./parcel-map.js";

export function askMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "$0";
  return "$" + v.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/** Null when the lot cannot be offered (taken / yours / missing). */
export function buyAskModel(plot) {
  if (!plot || plot.owner) return null;
  if (plot.class === "cart_pad") {
    return {
      question: "Do you want to buy this cart pad?",
      name: plotDisplayName(plot),
      priceLabel: askMoney(plot.price),
      yes: "Yes, buy",
      no: "No",
    };
  }
  return {
    question: "Do you want to buy this lot?",
    name: plotDisplayName(plot),
    priceLabel: askMoney(plot.price),
    yes: "Yes, buy",
    no: "No",
  };
}

/** Room buy is a confirm, same shape as the lot ask. Green tile must not debit. */
export function unitAskModel(room) {
  if (!room || room.owner) return null;
  return {
    question: `Buy ${room.label} for ${askMoney(room.price)}?`,
    name: room.use ? `${room.use} · vacant` : "Vacant room",
    priceLabel: askMoney(room.price),
    yes: "Yes, buy",
    no: "No",
  };
}

/** Dirt under a shell. Spawn cannot afford it and does not need it to run a room. */
export function landAskModel(building, cash) {
  if (!building || building.landOwner) return null;
  const price = Number(building.landPrice);
  const can = Number(cash) >= price;
  return {
    question: `Buy the dirt under ${building.name} for ${askMoney(price)}?`,
    name: "You do not need this to run a room. Spawn cannot afford it.",
    priceLabel: askMoney(price),
    yes: can ? "Yes, buy" : "Need " + askMoney(price),
    no: "No",
    disabled: !can,
  };
}
