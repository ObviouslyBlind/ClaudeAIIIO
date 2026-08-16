/**
 * Harbour PAPER stall last-print on the sheet.
 * When the player is near an NPC stall (data-near) or #status shows a stall tap,
 * paint "Corn $x · PAPER" from snapshot lastPrices.north / lastPrice.
 * Polls GET /api/snapshot ~1/s. PAPER / SIMULATED. Never a wallet.
 */

export const POLL_MS = 1000;
export const DEFAULT_GOOD = "corn";

function money(n) {
  return Number(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function labelGood(g) {
  const s = String(g || DEFAULT_GOOD).replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** North last-print book: lastPrices.north, lastPrices, or lastPrice. */
export function northLastBook(data) {
  if (!data || typeof data !== "object") return null;
  const prices = data.lastPrices;
  if (prices && typeof prices === "object") {
    if (prices.north && typeof prices.north === "object" && !Array.isArray(prices.north)) {
      return prices.north;
    }
    return prices;
  }
  const last = data.lastPrice;
  if (last && typeof last === "object") {
    if (last.north && typeof last.north === "object" && !Array.isArray(last.north)) {
      return last.north;
    }
    return last;
  }
  return null;
}

export function lastPrintOf(data, good = DEFAULT_GOOD) {
  const book = northLastBook(data);
  if (!book) return null;
  const id = good || DEFAULT_GOOD;
  const nested = book[id];
  if (nested && typeof nested === "object") return num(nested.lastPrice ?? nested.price);
  return num(nested);
}

export function goodFromStatus(status) {
  const s = String(status || "");
  const bought = s.match(/Bought 1 ([a-z][a-z0-9_]*)/i);
  if (bought) return bought[1].toLowerCase();
  return null;
}

/** Near stall (data-near) or a stall tap line on #status. */
export function isStallHintActive(status, hintEl) {
  if (hintEl && hintEl.getAttribute && hintEl.getAttribute("data-near")) return true;
  const s = String(status || "");
  if (/Bought 1 /i.test(s)) return true;
  if (/Could not buy/i.test(s)) return true;
  if (/\bstall\b/i.test(s)) return true;
  return false;
}

export function formatStallHint(data, active, good) {
  if (!active) return "";
  const mode = (data && data.mode) || "PAPER";
  const id = good || DEFAULT_GOOD;
  const px = lastPrintOf(data, id);
  const priceBit = px == null ? "—" : "$" + money(px);
  return `${labelGood(id)} ${priceBit} · ${mode}`;
}

function ensureStallHint() {
  if (typeof document === "undefined" || !document.getElementById) return null;
  let el = document.getElementById("stall-hint");
  if (el) return el;
  el = document.createElement("p");
  el.id = "stall-hint";
  el.title = "PAPER · SIMULATED";
  const ferry = document.getElementById("ferry-hint");
  const develop = document.getElementById("develop-hint");
  const lease = document.getElementById("lease-hint");
  const sheet = document.getElementById("sheet");
  if (ferry && ferry.parentNode) ferry.parentNode.insertBefore(el, ferry.nextSibling);
  else if (develop && develop.parentNode) develop.parentNode.insertBefore(el, develop.nextSibling);
  else if (lease && lease.parentNode) lease.parentNode.insertBefore(el, lease.nextSibling);
  else if (sheet) sheet.appendChild(el);
  else return null;
  return el;
}

function lookup(id) {
  return typeof document !== "undefined" && document.getElementById
    ? document.getElementById(id)
    : null;
}

function goodOf(statusEl, hintEl) {
  const fromHint = hintEl && hintEl.getAttribute && hintEl.getAttribute("data-good");
  if (fromHint) return String(fromHint).toLowerCase();
  return goodFromStatus(statusEl && statusEl.textContent) || DEFAULT_GOOD;
}

export function mountStallHud(opts = {}) {
  const el = opts.el !== undefined ? opts.el : ensureStallHint();
  const fetchImpl = opts.fetch || globalThis.fetch;
  const statusEl = opts.statusEl !== undefined ? opts.statusEl : lookup("status");
  let timer = 0;
  let lastData = null;
  let observer = null;

  function active() {
    if (typeof opts.isActive === "function") return Boolean(opts.isActive());
    return isStallHintActive(statusEl && statusEl.textContent, el);
  }

  function paint() {
    if (!el) return;
    el.textContent = formatStallHint(lastData, active(), goodOf(statusEl, el));
  }

  async function refresh() {
    if (typeof fetchImpl === "function") {
      try {
        const res = await fetchImpl("/api/snapshot");
        if (res && res.ok) lastData = await res.json();
      } catch {
        /* keep last PAPER last-print */
      }
    }
    paint();
  }

  if (el) {
    if (el.setAttribute) el.setAttribute("title", "PAPER · SIMULATED");
    el.textContent = formatStallHint(null, active(), goodOf(statusEl, el));
    refresh();
    timer = setInterval(refresh, POLL_MS);
    if (typeof MutationObserver === "function") {
      observer = new MutationObserver(paint);
      if (statusEl && typeof statusEl.nodeType === "number") {
        observer.observe(statusEl, { childList: true, characterData: true, subtree: true });
      }
      if (el && typeof el.nodeType === "number") {
        observer.observe(el, { attributes: true, attributeFilter: ["data-near", "data-good"] });
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

if (typeof document !== "undefined" && document.getElementById && document.getElementById("stall-hint")) {
  mountStallHud();
}
