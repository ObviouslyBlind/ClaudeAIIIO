/**
 * Harbour PAPER cart strip: visitor cart lines (goodId × qty).
 * Polls GET /api/snapshot ~1/s. PAPER / SIMULATED. Never a wallet.
 */

export const POLL_MS = 1000;

function fmtQty(n) {
  const r = Math.round(Number(n) * 10000) / 10000;
  return Number.isFinite(r) ? String(r) : "—";
}

function linesOf(data) {
  const cart = data && data.visitor && Array.isArray(data.visitor.cart) ? data.visitor.cart : [];
  const bits = [];
  for (const row of cart) {
    if (!row || typeof row !== "object") continue;
    const id = row.goodId ? String(row.goodId).trim() : "";
    const qty = Number(row.qty);
    if (!id || !Number.isFinite(qty) || qty <= 0) continue;
    bits.push(`${id} × ${fmtQty(qty)}`);
  }
  return bits;
}

export function formatCartLine(data) {
  const mode = (data && data.mode) || "PAPER";
  const provenance = (data && data.provenance) || "SIMULATED";
  const bits = linesOf(data);
  const goods = bits.length ? bits.join(", ") : "—";
  return `${mode} · ${provenance} · Cart ${goods}`;
}

export function mountCartHud(opts = {}) {
  const el = opts.el;
  const fetchImpl = opts.fetch || globalThis.fetch;
  let timer = 0;

  async function refresh() {
    if (!el || typeof fetchImpl !== "function") return;
    try {
      const res = await fetchImpl("/api/snapshot");
      if (!res || !res.ok) return;
      el.textContent = formatCartLine(await res.json());
    } catch {
      /* keep the last painted line */
    }
  }

  if (el) {
    el.textContent = formatCartLine(null);
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
