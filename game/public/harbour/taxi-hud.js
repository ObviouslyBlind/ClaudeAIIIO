/**
 * Harbour PAPER taxi fare hint on the sheet.
 * When #btn-taxi is enabled or #taxi-map is up, paint
 * "Taxi · PAPER · $5 · dirt forbidden".
 * Fare from GET /api/map if present, else 5. PAPER / SIMULATED. Never a wallet.
 */

export const POLL_MS = 1000;
export const FALLBACK_FARE = 5;
export const DIRT_FORBIDDEN = "dirt forbidden";

function money(n) {
  return Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function fareFromStatutes(statutes) {
  if (!statutes) return null;
  if (Array.isArray(statutes)) {
    const row = statutes.find((s) => s && (s.id === "taxi_fare" || s.id === "taxi" || s.id === "taxi_ticket"));
    if (!row) return null;
    const sliders = row.sliders && typeof row.sliders === "object" ? row.sliders : row;
    return num(sliders.cost ?? sliders.fare ?? sliders.ticket ?? row.cost);
  }
  if (typeof statutes === "object") {
    const row = statutes.taxi_fare || statutes.taxi_ticket || statutes.taxi;
    if (row && typeof row === "object") {
      const sliders = row.sliders && typeof row.sliders === "object" ? row.sliders : row;
      return num(sliders.cost ?? sliders.fare ?? sliders.ticket ?? row.cost);
    }
  }
  return null;
}

/** Map first (`taxiCost` / taxi.fare), then statute, else 5. */
export function fareOf(data) {
  if (!data || typeof data !== "object") return FALLBACK_FARE;
  const hud = data.hud;
  if (hud && typeof hud === "object") {
    const n = num(hud.taxiCost ?? hud.taxiFare ?? hud.taxi);
    if (n != null) return n;
  }
  const direct = num(data.taxiCost ?? data.taxiFare ?? data.fare);
  if (direct != null) return direct;
  if (data.taxi && typeof data.taxi === "object") {
    const n = num(data.taxi.cost ?? data.taxi.fare ?? data.taxi.ticket);
    if (n != null) return n;
  }
  const fromLaw = fareFromStatutes(data.statutes != null ? data.statutes : data);
  if (fromLaw != null) return fromLaw;
  return FALLBACK_FARE;
}

export function isTaxiHintActive(btn, overlay) {
  const btnOn = Boolean(btn && !btn.disabled);
  const overlayOn = Boolean(overlay && overlay.hidden === false);
  return btnOn || overlayOn;
}

export function formatTaxiHint(data, active) {
  if (!active) return "";
  const mode = (data && data.mode) || "PAPER";
  return `Taxi · ${mode} · $${money(fareOf(data))} · ${DIRT_FORBIDDEN}`;
}

function ensureTaxiHint() {
  if (typeof document === "undefined" || !document.getElementById) return null;
  let el = document.getElementById("taxi-hint");
  if (el) return el;
  el = document.createElement("p");
  el.id = "taxi-hint";
  el.title = "PAPER · SIMULATED";
  const ferry = document.getElementById("ferry-hint");
  const stall = document.getElementById("stall-hint");
  const sheet = document.getElementById("sheet");
  if (ferry && ferry.parentNode) ferry.parentNode.insertBefore(el, ferry.nextSibling);
  else if (stall && stall.parentNode) stall.parentNode.insertBefore(el, stall);
  else if (sheet) sheet.appendChild(el);
  else return null;
  return el;
}

function lookup(id) {
  return typeof document !== "undefined" && document.getElementById
    ? document.getElementById(id)
    : null;
}

export function mountTaxiHud(opts = {}) {
  const el = opts.el !== undefined ? opts.el : ensureTaxiHint();
  const fetchImpl = opts.fetch || globalThis.fetch;
  const btnEl = opts.btnEl !== undefined ? opts.btnEl : lookup("btn-taxi");
  let overlayEl = opts.overlayEl !== undefined ? opts.overlayEl : lookup("taxi-map");
  let timer = 0;
  let lastData = null;
  let observer = null;

  function overlay() {
    if (opts.overlayEl !== undefined) return overlayEl;
    return lookup("taxi-map") || overlayEl;
  }

  function active() {
    if (typeof opts.isActive === "function") return Boolean(opts.isActive());
    return isTaxiHintActive(btnEl, overlay());
  }

  function paint() {
    if (!el) return;
    const next = formatTaxiHint(lastData, active());
    if (el.textContent !== next) el.textContent = next;
  }

  async function refresh() {
    if (typeof fetchImpl === "function") {
      try {
        const res = await fetchImpl("/api/map");
        if (res && res.ok) lastData = await res.json();
      } catch {
        /* keep last PAPER fare, else fallback 5 */
      }
    }
    paint();
  }

  if (el) {
    if (el.setAttribute) el.setAttribute("title", "PAPER · SIMULATED");
    el.textContent = formatTaxiHint(null, active());
    refresh();
    timer = setInterval(refresh, POLL_MS);
    if (typeof MutationObserver === "function") {
      observer = new MutationObserver(paint);
      if (btnEl && typeof btnEl.nodeType === "number") {
        observer.observe(btnEl, { attributes: true, attributeFilter: ["disabled", "hidden"] });
      }
      const map = overlay();
      if (map && typeof map.nodeType === "number") {
        observer.observe(map, { attributes: true, attributeFilter: ["hidden"] });
      }
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

if (
  typeof document !== "undefined" &&
  document.getElementById &&
  (document.getElementById("taxi-hint") || document.getElementById("btn-taxi"))
) {
  mountTaxiHud();
}
