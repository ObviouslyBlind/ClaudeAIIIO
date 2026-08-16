/**
 * Harbour PAPER develop afford hint on inspect.
 * When #status / #plot-line shows a leased vacant plot, paint remaining cash vs
 * cheapest catalogue cost (House $40) (can / cannot afford).
 * Polls GET /api/snapshot ~1/s. PAPER / SIMULATED. Never a wallet.
 */

export const POLL_MS = 1000;
export const HOUSE_COST = 40;
export const CHEAPEST_LABEL = "House";

function money(n) {
  return Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function cashOf(data) {
  const n = data && data.visitor ? Number(data.visitor.cash) : NaN;
  return Number.isFinite(n) ? n : null;
}

/** Cheapest catalogue paperCost, else developCost, else House $40. */
export function cheapestDevelop(data) {
  const cat = data && Array.isArray(data.catalog) ? data.catalog : [];
  const costs = [];
  for (const row of cat) {
    const n = row ? Number(row.paperCost) : NaN;
    if (Number.isFinite(n) && n > 0) costs.push(n);
  }
  if (costs.length) return Math.min(...costs);
  const fallback = data ? Number(data.developCost) : NaN;
  return Number.isFinite(fallback) && fallback > 0 ? fallback : HOUSE_COST;
}

function cheapestLabel(data) {
  const cost = cheapestDevelop(data);
  const cat = data && Array.isArray(data.catalog) ? data.catalog : [];
  for (const row of cat) {
    if (row && Number(row.paperCost) === cost && row.label) return String(row.label);
  }
  return CHEAPEST_LABEL;
}

/** Leased vacant inspect: plot-line ends with " · yours", or status says develop it. */
export function isLeasedVacantInspect(status, plot) {
  const s = String(status || "");
  const p = String(plot || "").trim();
  if (/\bDevelop it\b/i.test(s)) return true;
  if (/land you leased/i.test(s)) return true;
  if (!p || /taken|Inside|^Tap land/i.test(p)) return false;
  return / · yours$/i.test(p);
}

export function formatDevelopHint(data, inspect) {
  const mode = (data && data.mode) || "PAPER";
  const provenance = (data && data.provenance) || "SIMULATED";
  const status = inspect && inspect.status;
  const plot = inspect && inspect.plot;
  if (!isLeasedVacantInspect(status, plot)) return "";
  const price = cheapestDevelop(data);
  const label = cheapestLabel(data);
  const cash = cashOf(data);
  const priceBit = "$" + money(price);
  const cashBit = cash == null ? "—" : "$" + money(cash);
  if (cash == null) {
    return `${mode} · ${provenance} · cash ${cashBit} vs ${label} ${priceBit} · remain —`;
  }
  const remain = cash - price;
  const afford = cash >= price ? "can afford" : "cannot afford";
  const remainBit = remain < 0 ? "-$" + money(Math.abs(remain)) : "$" + money(remain);
  return `${mode} · ${provenance} · cash ${cashBit} vs ${label} ${priceBit} · remain ${remainBit} · ${afford}`;
}

function ensureDevelopHint() {
  if (typeof document === "undefined" || !document.getElementById) return null;
  let el = document.getElementById("develop-hint");
  if (el) return el;
  el = document.createElement("p");
  el.id = "develop-hint";
  el.title = "PAPER · SIMULATED";
  const lease = document.getElementById("lease-hint");
  const plot = document.getElementById("plot-line");
  const sheet = document.getElementById("sheet");
  if (lease && lease.parentNode) lease.parentNode.insertBefore(el, lease.nextSibling);
  else if (plot && plot.parentNode) plot.parentNode.insertBefore(el, plot.nextSibling);
  else if (sheet) sheet.appendChild(el);
  else return null;
  return el;
}

function inspectOf(statusEl, plotEl) {
  return {
    status: statusEl && statusEl.textContent,
    plot: plotEl && plotEl.textContent,
  };
}

export function mountDevelopHud(opts = {}) {
  const el = opts.el !== undefined ? opts.el : ensureDevelopHint();
  const fetchImpl = opts.fetch || globalThis.fetch;
  const statusEl =
    opts.statusEl !== undefined
      ? opts.statusEl
      : typeof document !== "undefined" && document.getElementById
        ? document.getElementById("status")
        : null;
  const plotEl =
    opts.plotEl !== undefined
      ? opts.plotEl
      : typeof document !== "undefined" && document.getElementById
        ? document.getElementById("plot-line")
        : null;
  let timer = 0;
  let lastData = null;
  let observer = null;

  function paint() {
    if (!el) return;
    el.textContent = formatDevelopHint(lastData, inspectOf(statusEl, plotEl));
  }

  async function refresh() {
    if (typeof fetchImpl === "function") {
      try {
        const res = await fetchImpl("/api/snapshot");
        if (res && res.ok) lastData = await res.json();
      } catch {
        /* keep last PAPER cash */
      }
    }
    paint();
  }

  if (el) {
    if (el.setAttribute) el.setAttribute("title", "PAPER · SIMULATED");
    el.textContent = formatDevelopHint(null, inspectOf(statusEl, plotEl));
    refresh();
    timer = setInterval(refresh, POLL_MS);
    if (
      typeof MutationObserver === "function" &&
      statusEl &&
      typeof statusEl.nodeType === "number" &&
      plotEl &&
      typeof plotEl.nodeType === "number"
    ) {
      observer = new MutationObserver(paint);
      observer.observe(statusEl, { childList: true, characterData: true, subtree: true });
      observer.observe(plotEl, { childList: true, characterData: true, subtree: true });
    }
  }

  return {
    tick() {},
    stop() {
      if (timer) clearInterval(timer);
      timer = 0;
      if (observer) observer.disconnect();
      observer = null;
    },
  };
}

if (typeof document !== "undefined" && document.getElementById && document.getElementById("develop-hint")) {
  mountDevelopHud();
}
