/**
 * Harbour PAPER sales-tax strip: live statute slider on the sheet.
 * Polls GET /api/statutes (~1/s); also reads snapshot/persist statute shapes.
 * PAPER / SIMULATED. Never a wallet.
 */

export const POLL_MS = 1000;

function fmtPct(rate) {
  const pct = Number(rate) * 100;
  if (!Number.isFinite(pct) || pct <= 0) return "0";
  const rounded = Math.round(pct * 100) / 100;
  return String(rounded);
}

function catalogRow(statutes) {
  if (!Array.isArray(statutes)) return null;
  for (const row of statutes) {
    if (row && (row.id === "sales_tax" || row.id === "sales-tax")) return row;
  }
  return null;
}

/** Catalog row, persist `{ sales_tax: { rate } }`, or a lone rate object. */
function salesTaxRow(data) {
  if (!data || typeof data !== "object") return null;
  const fromCatalog = catalogRow(data.statutes);
  if (fromCatalog) return fromCatalog;
  const statutes = data.statutes;
  if (statutes && typeof statutes === "object" && !Array.isArray(statutes)) {
    const nested = statutes.sales_tax || statutes["sales-tax"];
    if (nested && typeof nested === "object") return nested;
  }
  if (data.sales_tax && typeof data.sales_tax === "object") return data.sales_tax;
  return null;
}

export function salesTaxRateFrom(data) {
  const row = salesTaxRow(data);
  if (!row) return 0;
  if (row.enabled === false) return 0;
  const raw = row.sliders && row.sliders.rate != null ? row.sliders.rate : row.rate;
  const rate = Number(raw);
  if (!Number.isFinite(rate) || rate < 0) return 0;
  return rate;
}

export function formatTaxLine(data) {
  const mode = (data && data.mode) || "PAPER";
  const provenance = (data && data.provenance) || "SIMULATED";
  return `${mode} · ${provenance} · Sales tax ${fmtPct(salesTaxRateFrom(data))}%`;
}

function ensureTax() {
  if (typeof document === "undefined" || !document.getElementById) return null;
  let el = document.getElementById("tax");
  if (el) return el;
  el = document.createElement("p");
  el.id = "tax";
  el.title = "PAPER · SIMULATED";
  const spread = document.getElementById("spread");
  const econ = document.getElementById("econ");
  const sheet = document.getElementById("sheet");
  if (spread && spread.parentNode) spread.parentNode.insertBefore(el, spread.nextSibling);
  else if (econ && econ.parentNode) econ.parentNode.insertBefore(el, econ.nextSibling);
  else if (sheet) sheet.appendChild(el);
  else return null;
  return el;
}

async function readJson(fetchImpl, url) {
  const res = await fetchImpl(url);
  if (!res || !res.ok) return null;
  return await res.json();
}

async function loadStatutes(fetchImpl) {
  if (typeof fetchImpl !== "function") return null;
  try {
    const data = await readJson(fetchImpl, "/api/statutes");
    if (data && salesTaxRow(data)) return data;
  } catch {
    /* fall through to snapshot statutes */
  }
  try {
    return await readJson(fetchImpl, "/api/snapshot");
  } catch {
    /* keep the last painted PAPER line */
  }
  return null;
}

export function mountTaxHud(opts = {}) {
  const el = opts.el !== undefined ? opts.el : ensureTax();
  const fetchImpl = opts.fetch || globalThis.fetch;
  let timer = 0;

  async function refresh() {
    if (!el) return;
    const data = await loadStatutes(fetchImpl);
    if (data) el.textContent = formatTaxLine(data);
  }

  if (el) {
    const already = String(el.textContent || "");
    if (!already.includes("PAPER")) el.textContent = formatTaxLine(null);
    if (el.setAttribute) el.setAttribute("title", "PAPER · SIMULATED");
    refresh();
    timer = setInterval(refresh, POLL_MS);
  }

  return {
    tick() {},
    stop() {
      if (timer) clearInterval(timer);
      timer = 0;
    },
  };
}

if (typeof document !== "undefined" && document.getElementById && document.getElementById("tax")) {
  mountTaxHud();
}
