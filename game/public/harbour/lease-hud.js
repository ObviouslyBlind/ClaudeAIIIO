/**
 * Harbour PAPER lease leftover hint on inspect.
 * When #status / #plot-line shows a vacant plot, paint leftover PAPER cash after
 * the lease price, and House $40 when leftover still covers it. Numbers only.
 * Polls GET /api/snapshot ~1/s. PAPER / SIMULATED. Never a wallet.
 */

export const POLL_MS = 1000;
export const HOUSE_COST = 40;
export const HOUSE_LABEL = "House";

function money(n) {
  return Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function cashOf(data) {
  const n = data && data.visitor ? Number(data.visitor.cash) : NaN;
  return Number.isFinite(n) ? n : null;
}

/** House paperCost from catalog, else developCost, else $40. */
export function houseCostOf(data) {
  const cat = data && Array.isArray(data.catalog) ? data.catalog : [];
  for (const row of cat) {
    if (!row) continue;
    if (row.id === "house" || String(row.label) === HOUSE_LABEL) {
      const n = Number(row.paperCost);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  const fallback = data ? Number(data.developCost) : NaN;
  return Number.isFinite(fallback) && fallback > 0 ? fallback : HOUSE_COST;
}

export function parseLeasePrice(plot) {
  const m = String(plot || "").match(/\$([\d,]+)/);
  if (!m) return null;
  const n = Number(String(m[1]).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Vacant inspect: status says lease, or plot-line shows a price (not yours / taken). */
export function isVacantInspect(status, plot) {
  const s = String(status || "");
  const p = String(plot || "");
  if (/Lease it to develop/i.test(s)) return true;
  if (!p || /yours|taken|Inside|Tap land/i.test(p)) return false;
  return /\$[\d,]+/.test(p);
}

function leftoverBit(n) {
  return n < 0 ? "-$" + money(Math.abs(n)) : "$" + money(n);
}

export function formatLeaseHint(data, inspect) {
  const mode = (data && data.mode) || "PAPER";
  const provenance = (data && data.provenance) || "SIMULATED";
  const status = inspect && inspect.status;
  const plot = inspect && inspect.plot;
  if (!isVacantInspect(status, plot)) return "";
  const price = parseLeasePrice(plot);
  const cash = cashOf(data);
  const house = houseCostOf(data);
  const priceBit = price == null ? "—" : "$" + money(price);
  if (price == null || cash == null) {
    return `${mode} · ${provenance} · leftover — after ${priceBit}`;
  }
  const leftover = cash - price;
  let line = `${mode} · ${provenance} · leftover ${leftoverBit(leftover)} after ${priceBit}`;
  if (leftover >= house) line += ` · ${HOUSE_LABEL} $${money(house)}`;
  return line;
}

function ensureLeaseHint() {
  if (typeof document === "undefined" || !document.getElementById) return null;
  let el = document.getElementById("lease-hint");
  if (el) return el;
  el = document.createElement("p");
  el.id = "lease-hint";
  el.title = "PAPER · SIMULATED";
  const plot = document.getElementById("plot-line");
  const sheet = document.getElementById("sheet");
  if (plot && plot.parentNode) plot.parentNode.insertBefore(el, plot.nextSibling);
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

export function mountLeaseHud(opts = {}) {
  const el = opts.el !== undefined ? opts.el : ensureLeaseHint();
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
    const next = formatLeaseHint(lastData, inspectOf(statusEl, plotEl));
    if (el.textContent !== next) el.textContent = next;
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
    el.textContent = formatLeaseHint(null, inspectOf(statusEl, plotEl));
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

if (typeof document !== "undefined" && document.getElementById && document.getElementById("lease-hint")) {
  mountLeaseHud();
}
