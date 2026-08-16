/**
 * Harbour PAPER lease afford hint on inspect.
 * When #status / #plot-line shows a vacant plot, paint remaining cash vs lease price
 * (can / cannot afford). Polls GET /api/snapshot ~1/s. PAPER / SIMULATED. Never a wallet.
 */

export const POLL_MS = 1000;

function money(n) {
  return Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function cashOf(data) {
  const n = data && data.visitor ? Number(data.visitor.cash) : NaN;
  return Number.isFinite(n) ? n : null;
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

export function formatLeaseHint(data, inspect) {
  const mode = (data && data.mode) || "PAPER";
  const provenance = (data && data.provenance) || "SIMULATED";
  const status = inspect && inspect.status;
  const plot = inspect && inspect.plot;
  if (!isVacantInspect(status, plot)) return "";
  const price = parseLeasePrice(plot);
  const cash = cashOf(data);
  if (price == null && cash == null) return `${mode} · ${provenance} · lease —`;
  const priceBit = price == null ? "—" : "$" + money(price);
  const cashBit = cash == null ? "—" : "$" + money(cash);
  if (price == null || cash == null) {
    return `${mode} · ${provenance} · cash ${cashBit} vs lease ${priceBit} · remain —`;
  }
  const remain = cash - price;
  const afford = cash >= price ? "can afford" : "cannot afford";
  const remainBit = remain < 0 ? "-$" + money(Math.abs(remain)) : "$" + money(remain);
  return `${mode} · ${provenance} · cash ${cashBit} vs lease ${priceBit} · remain ${remainBit} · ${afford}`;
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
    el.textContent = formatLeaseHint(lastData, inspectOf(statusEl, plotEl));
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
