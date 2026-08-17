/**
 * Harbour PAPER unpaid-upkeep hint on inspect.
 * If the inspected/selected plot has unpaid, paint "Upkeep unpaid · PAPER".
 * Polls GET /api/map ~1/s. No eviction UI. No wallet. SIMULATED.
 */

export const POLL_MS = 1000;
export const UNPAID_LINE = "Upkeep unpaid · PAPER";

function money(n) {
  return Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function parcelLabel(p) {
  const kind = p.band === "field" ? "field" : p.band === "shore" ? "shore land" : "street land";
  return kind + " · " + money(p.area) + " m²";
}

export function formatUnpaidLine(plot) {
  return plot && plot.unpaid ? UNPAID_LINE : "";
}

/** Match #plot-line text to a map plot (same labels as main.js inspect). */
export function matchInspectedPlot(plots, plotLine) {
  const t = String(plotLine || "");
  if (!t || /^Tap land/i.test(t) || /^Inside/i.test(t) || /place it/i.test(t)) return null;
  const list = Array.isArray(plots) ? plots : [];
  const hits = [];
  for (const p of list) {
    if (!p) continue;
    const label = parcelLabel(p);
    if (t.indexOf(label) === -1) continue;
    hits.push(p);
  }
  if (hits.length === 1) return hits[0];
  for (const p of hits) {
    if (p.owner !== "visitor") continue;
    const suffix = p.use ? " · " + p.use : " · yours";
    if (t.indexOf(parcelLabel(p) + suffix) !== -1) return p;
  }
  return hits.find((p) => p.unpaid) || hits[0] || null;
}

function plotsOf(data) {
  return data && Array.isArray(data.plots) ? data.plots : [];
}

function ensureUnpaidHint() {
  if (typeof document === "undefined" || !document.getElementById) return null;
  let el = document.getElementById("unpaid-hint");
  if (el) return el;
  el = document.createElement("p");
  el.id = "unpaid-hint";
  el.title = "PAPER · SIMULATED";
  const plot = document.getElementById("plot-line");
  const sheet = document.getElementById("sheet");
  if (plot && plot.parentNode) plot.parentNode.insertBefore(el, plot.nextSibling);
  else if (sheet) sheet.appendChild(el);
  else return null;
  return el;
}

function inspectedPlot(opts, lastMap, plotEl) {
  const polled = plotsOf(lastMap);
  if (typeof opts.getSelected === "function") {
    const id = opts.getSelected();
    if (id) {
      const hit = polled.find((p) => p.id === id);
      if (hit) return hit;
      const live = typeof opts.getMap === "function" ? opts.getMap() : null;
      const livePlots = plotsOf(live);
      const fromLive = livePlots.find((p) => p.id === id);
      if (fromLive) return fromLive;
    }
  }
  return matchInspectedPlot(polled, plotEl && plotEl.textContent);
}

export function mountUnpaidHud(opts = {}) {
  const el = opts.el !== undefined ? opts.el : ensureUnpaidHint();
  const fetchImpl = opts.fetch || globalThis.fetch;
  const plotEl =
    opts.plotEl !== undefined
      ? opts.plotEl
      : typeof document !== "undefined" && document.getElementById
        ? document.getElementById("plot-line")
        : null;
  let timer = 0;
  let lastMap = typeof opts.getMap === "function" ? opts.getMap() : null;
  let observer = null;

  function paint() {
    if (!el) return;
    const next = formatUnpaidLine(inspectedPlot(opts, lastMap, plotEl));
    if (el.textContent !== next) el.textContent = next;
  }

  async function refresh() {
    if (typeof fetchImpl === "function") {
      try {
        const res = await fetchImpl("/api/map");
        if (res && res.ok) lastMap = await res.json();
      } catch {
        /* keep last PAPER map */
      }
    }
    paint();
  }

  if (el) {
    if (el.setAttribute) el.setAttribute("title", "PAPER · SIMULATED");
    el.textContent = formatUnpaidLine(null);
    refresh();
    timer = setInterval(refresh, POLL_MS);
    if (typeof MutationObserver === "function" && plotEl && typeof plotEl.nodeType === "number") {
      observer = new MutationObserver(paint);
      observer.observe(plotEl, { childList: true, characterData: true, subtree: true });
    }
  }

  return {
    tick() {},
    sync: paint,
    stop() {
      if (timer) clearInterval(timer);
      timer = 0;
      if (observer) observer.disconnect();
      observer = null;
    },
  };
}

if (typeof document !== "undefined" && document.getElementById && document.getElementById("plot-line")) {
  mountUnpaidHud();
}
