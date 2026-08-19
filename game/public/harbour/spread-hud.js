/**
 * Harbour PAPER ferry-spread strip: North vs South index (or mean arbSpread).
 * Polls GET /api/snapshot ~1/s. PAPER / SIMULATED. Never a wallet.
 */

export const POLL_MS = 1000;

function fmt(n) {
  return Number(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function meanOf(map) {
  if (!map || typeof map !== "object") return null;
  let n = 0;
  let s = 0;
  for (const key of Object.keys(map)) {
    const v = Number(map[key]);
    if (!Number.isFinite(v)) continue;
    s += v;
    n += 1;
  }
  return n ? s / n : null;
}

function northIndex(data) {
  const hud = data && data.hud ? data.hud : null;
  const named = hud ? Number(hud.priceIndexNorth) : NaN;
  if (Number.isFinite(named)) return named;
  const idx = hud ? Number(hud.priceIndex) : NaN;
  return Number.isFinite(idx) ? idx : null;
}

/** South basket from the sim, or North index × mean(South last / North last). */
function southIndex(data) {
  const hud = data && data.hud ? data.hud : null;
  const named = hud ? Number(hud.priceIndexSouth) : NaN;
  if (Number.isFinite(named)) return named;
  const nIdx = northIndex(data);
  const north = data && data.lastPrices;
  const south = data && data.lastPricesSouth;
  if (nIdx == null || !north || !south) return null;
  let num = 0;
  let den = 0;
  for (const key of Object.keys(south)) {
    const s = Number(south[key]);
    const n = Number(north[key]);
    if (!Number.isFinite(s) || !Number.isFinite(n) || n <= 0) continue;
    num += s / n;
    den += 1;
  }
  return den ? nIdx * (num / den) : null;
}

export function formatSpreadLine(data) {
  const mode = (data && data.mode) || "PAPER";
  const provenance = (data && data.provenance) || "SIMULATED";
  const n = northIndex(data);
  const s = southIndex(data);
  const gap = data && data.hud ? Number(data.hud.ferrySpread) : NaN;
  if (n != null || s != null) {
    const nBit = n == null ? "0.00" : fmt(n);
    const sBit = s == null ? "0.00" : fmt(s);
    const delta = Number.isFinite(gap) ? ` · Δ ${fmt(gap)}` : "";
    return `${mode} · ${provenance} · Ferry spread · N ${nBit} · S ${sBit}${delta}`;
  }
  const arb = meanOf(data && data.arbSpread);
  if (arb != null) {
    return `${mode} · ${provenance} · Ferry spread · arb ${fmt(arb)}`;
  }
  return `${mode} · ${provenance} · Ferry spread · N 0.00 · S 0.00`;
}

function ensureSpread() {
  if (typeof document === "undefined" || !document.getElementById) return null;
  let el = document.getElementById("spread");
  if (el) return el;
  el = document.createElement("p");
  el.id = "spread";
  el.title = "PAPER · SIMULATED";
  const econ = document.getElementById("econ");
  const sheet = document.getElementById("sheet");
  if (econ && econ.parentNode) econ.parentNode.insertBefore(el, econ.nextSibling);
  else if (sheet) sheet.appendChild(el);
  else return null;
  return el;
}

export function mountSpreadHud(opts = {}) {
  const el = opts.el !== undefined ? opts.el : ensureSpread();
  const fetchImpl = opts.fetch || globalThis.fetch;
  let timer = 0;

  async function refresh() {
    if (!el || typeof fetchImpl !== "function") return;
    try {
      const res = await fetchImpl("/api/snapshot");
      if (!res || !res.ok) return;
      el.textContent = formatSpreadLine(await res.json());
    } catch {
      /* keep the last painted PAPER line */
    }
  }

  if (el) {
    const already = String(el.textContent || "");
    if (!already.includes("PAPER")) el.textContent = formatSpreadLine(null);
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

if (typeof document !== "undefined" && document.getElementById && document.getElementById("spread")) {
  mountSpreadHud();
}
