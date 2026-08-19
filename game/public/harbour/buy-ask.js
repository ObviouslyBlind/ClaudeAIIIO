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
