/**
 * Harbour PAPER held-goods strip: visitor.stock / goods on #goods.
 * Non-zero only, e.g. "corn 2 · beans 1 · PAPER".
 * Polls GET /api/snapshot ~1/s. PAPER / SIMULATED. Never a wallet.
 */

export const POLL_MS = 1000;

function fmtQty(n) {
  const r = Math.round(Number(n) * 10000) / 10000;
  return Number.isFinite(r) ? String(r) : "—";
}

/** Visitor inventory bag. Prefer stock; goods is the same bag when aliased. */
function stockBag(data) {
  const visitor = data && data.visitor;
  if (!visitor || typeof visitor !== "object") return null;
  if (visitor.stock && typeof visitor.stock === "object" && !Array.isArray(visitor.stock)) {
    return visitor.stock;
  }
  if (visitor.goods && typeof visitor.goods === "object" && !Array.isArray(visitor.goods)) {
    return visitor.goods;
  }
  return null;
}

function heldBits(data) {
  const bag = stockBag(data);
  if (!bag) return [];
  const seen = new Set();
  const ids = [];
  const catalog = data && Array.isArray(data.goods) ? data.goods : [];
  for (const id of catalog) {
    if (!id) continue;
    const key = String(id);
    if (seen.has(key)) continue;
    seen.add(key);
    ids.push(key);
  }
  for (const id of Object.keys(bag)) {
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  const bits = [];
  for (const id of ids) {
    const qty = Number(bag[id]);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    bits.push(`${id} ${fmtQty(qty)}`);
  }
  return bits;
}

export function formatGoodsLine(data) {
  const mode = (data && data.mode) || "PAPER";
  const bits = heldBits(data);
  if (!bits.length) return mode;
  return `${bits.join(" · ")} · ${mode}`;
}

function ensureGoods() {
  if (typeof document === "undefined" || !document.getElementById) return null;
  let el = document.getElementById("goods");
  if (el) return el;
  el = document.createElement("p");
  el.id = "goods";
  el.title = "PAPER · SIMULATED";
  const cart = document.getElementById("cart");
  const cash = document.getElementById("cash");
  const sheet = document.getElementById("sheet");
  if (cart && cart.parentNode) cart.parentNode.insertBefore(el, cart.nextSibling);
  else if (cash && cash.parentNode) cash.parentNode.insertBefore(el, cash.nextSibling);
  else if (sheet) sheet.appendChild(el);
  else return null;
  return el;
}

export function mountGoodsHud(opts = {}) {
  const el = opts.el !== undefined ? opts.el : ensureGoods();
  const fetchImpl = opts.fetch || globalThis.fetch;
  let timer = 0;

  async function refresh() {
    if (!el || typeof fetchImpl !== "function") return;
    try {
      const res = await fetchImpl("/api/snapshot");
      if (!res || !res.ok) return;
      el.textContent = formatGoodsLine(await res.json());
    } catch {
      /* keep the last painted PAPER line */
    }
  }

  if (el) {
    el.textContent = formatGoodsLine(null);
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

if (
  typeof document !== "undefined" &&
  document.getElementById &&
  (document.getElementById("goods") || document.getElementById("sheet"))
) {
  mountGoodsHud();
}
