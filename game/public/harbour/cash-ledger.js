/**
 * Cash hover ledger. What you own, where it sits, last-minute sales
 * versus running $/min. Brass-on-hull chrome. PAPER / SIMULATED.
 */

import { fullCash } from "./cash-chip.js";

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function signedCash(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v === 0) return "+$0.00";
  const body = fullCash(Math.abs(v));
  return (v > 0 ? "+" : "−") + body;
}

export function islandName(id) {
  return id === "north" ? "North" : "South";
}

function lotKind(lease) {
  if (!lease) return "Lot";
  if (lease.class === "cart_pad") return "Cart pad";
  if (lease.use === "shop") return "Shop";
  if (lease.use === "mine") return "Mine";
  const band = lease.plotBand || lease.band;
  if (band === "field") return "Field lot";
  if (band === "shore") return "Shore lot";
  return "Street lot";
}

function catalogLabel(play, kind) {
  const row = ((play && play.catalog) || []).find((s) => s.id === kind);
  return row && row.label ? row.label : String(kind || "");
}

function isKitSku(play, kind) {
  const row = ((play && play.catalog) || []).find((s) => s.id === kind);
  if (row) return row.role === "kit" || row.aisle === "street_carts";
  return String(kind).endsWith("_cart") || kind === "hotdog_cart";
}

function siteStock(site) {
  const n = Number(site && (site.hotdogs != null ? site.hotdogs : site.stock));
  return Number.isFinite(n) ? n : 0;
}

function siteStatus(site) {
  if (!site) return { earning: false, note: "Empty" };
  const stock = siteStock(site);
  const fryDry = site.kind === "fish_chips" && !(Number(site.propaneLeft) > 0);
  if (site.hired && stock >= 1) {
    if (fryDry) return { earning: false, note: "No propane" };
    return { earning: true, note: site.staffName ? `Hired · ${site.staffName}` : "Hired" };
  }
  if (site.hired && fryDry) return { earning: false, note: "No propane" };
  if (site.hired) return { earning: false, note: "No stock" };
  if (stock >= 1) return { earning: false, note: "Play to sell" };
  return { earning: false, note: "Idle" };
}

function siteTitle(site, lease) {
  if (site && site.label) return site.label;
  if (site && site.siteClass === "shop") return "Shop";
  if (site && site.siteClass === "mine") return "Mine";
  return lotKind(lease);
}

function whereLine(lease, site) {
  const name = (lease && lease.name) || (site && site.lotName) || "Unnamed lot";
  const island = islandName((lease && lease.island) || (site && site.island));
  const kind = lotKind(lease);
  return { name, place: `${island} · ${kind}` };
}

function stashHoldings(play) {
  const out = [];
  function take(rows, place) {
    for (const item of rows || []) {
      const qty = Number(item && item.qty) || 0;
      if (qty < 1) continue;
      if (!isKitSku(play, item.kind)) continue;
      out.push({
        id: `stash-${place}-${item.kind}`,
        title: catalogLabel(play, item.kind),
        name: qty > 1 ? `${qty}× in ${place}` : `In ${place}`,
        place: "Not on a lot",
        perMinute: 0,
        note: "Not placed",
        earning: false,
        kind: "stash",
      });
    }
  }
  take(play && play.inventory, "pockets");
  const wh = play && play.warehouse;
  take(wh && wh.items, `${islandName(wh && wh.island)} warehouse`);
  return out;
}

/** Facts for the cash hover. Sim remains the source of cash and $/min. */
export function cashLedgerModel(play) {
  const cash = Number(play && play.cash);
  const lastMin = Number(play && play.incomePerMinute) || 0;
  const leases = Array.isArray(play && play.leases) ? play.leases : [];
  const sites = Array.isArray(play && play.sites)
    ? play.sites
    : [...((play && play.stands) || []), ...((play && play.workSites) || [])];
  const used = new Set();
  const holdings = [];

  for (const lease of leases) {
    const site = sites.find((s) => s && s.plotId === lease.id) || null;
    if (site) used.add(site.id);
    const status = siteStatus(site);
    const loc = whereLine(lease, site);
    const perMinute = status.earning ? Number(site && site.perMinute) || 0 : 0;
    holdings.push({
      id: lease.id,
      title: siteTitle(site, lease),
      name: loc.name,
      place: loc.place,
      perMinute,
      note: status.note,
      earning: status.earning,
      kind: "lot",
    });
  }

  for (const site of sites) {
    if (!site || used.has(site.id)) continue;
    const status = siteStatus(site);
    const loc = whereLine(null, site);
    holdings.push({
      id: site.id,
      title: siteTitle(site, null),
      name: loc.name,
      place: loc.place,
      perMinute: status.earning ? Number(site.perMinute) || 0 : 0,
      note: status.note,
      earning: status.earning,
      kind: "site",
    });
  }

  const stash = stashHoldings(play);
  const runningMin = holdings.reduce((sum, row) => sum + (Number(row.perMinute) || 0), 0);
  const fee = Number(play && play.warehouse && play.warehouse.feePerDay) || 0;
  const occupied = Boolean(play && play.warehouse && play.warehouse.occupied);
  const tax = Number(play && play.salesTax);
  return {
    cash: Number.isFinite(cash) ? cash : 0,
    lastMin,
    runningMin,
    holdings,
    stash,
    warehouseFee: occupied ? fee : 0,
    warehouseIsland: islandName(play && play.warehouse && play.warehouse.island),
    tax: Number.isFinite(tax) ? tax : 0,
    hireCost: Number(play && play.hireCost) || 0,
    empty: holdings.length === 0 && stash.length === 0,
  };
}

function rateCell(n, earning) {
  const v = Number(n) || 0;
  if (!earning || v <= 0) return `<span class="is-idle">${esc(signedCash(0))}</span>`;
  return `<span class="is-up">${esc(signedCash(v))}</span>`;
}

function rowHtml(row) {
  return `<tr>
    <th scope="row">
      <b>${esc(row.title)}</b>
      <em>${esc(row.note)}</em>
    </th>
    <td>
      <b>${esc(row.name)}</b>
      <em>${esc(row.place)}</em>
    </td>
    <td class="num">${rateCell(row.perMinute, row.earning)}</td>
  </tr>`;
}

export function formatCashLedger(play) {
  const m = cashLedgerModel(play);
  const lastCls = m.lastMin > 0 ? "is-up" : m.lastMin < 0 ? "is-down" : "is-zero";
  const runCls = m.runningMin > 0 ? "is-up" : "is-zero";
  const rows = [...m.holdings, ...m.stash];
  const taxPct = Math.round(m.tax * 100);
  let body;
  if (m.empty) {
    body = `<p class="cash-ledger-empty">No land, no cart on the kerb. A highway pad is $750. Street lots cost more than starter cash. You make $0.00 a minute until something sells.</p>`;
  } else {
    body = `<table>
      <thead>
        <tr>
          <th>Holding</th>
          <th>Where</th>
          <th class="num">$/min</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(rowHtml).join("")}
      </tbody>
    </table>`;
  }
  const feeLine = m.warehouseFee
    ? `<p class="cash-ledger-note">${esc(m.warehouseIsland)} warehouse −${esc(fullCash(m.warehouseFee))}/day while occupied.</p>`
    : "";
  const taxLine =
    taxPct > 0
      ? `<p class="cash-ledger-note">Sticker $/min is after ${taxPct}% sales tax. PAPER / SIMULATED.</p>`
      : `<p class="cash-ledger-note">PAPER / SIMULATED.</p>`;
  return `
    <div class="cash-ledger-head">
      <p class="cash-ledger-cash" id="balance-full">${esc(fullCash(m.cash))}</p>
      <p class="cash-ledger-mark">PAPER / SIMULATED</p>
      <p class="cash-ledger-rate ${lastCls}" id="income">${esc(signedCash(m.lastMin))}<span> last minute</span></p>
      <p class="cash-ledger-rate ${runCls}">${esc(signedCash(m.runningMin))}<span> if hired and stocked</span></p>
    </div>
    ${body}
    ${feeLine}
    ${taxLine}
  `;
}
