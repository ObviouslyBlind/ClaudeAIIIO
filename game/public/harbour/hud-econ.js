/**
 * Harbour economy strip: NPC money supply, price index, output.
 * Polls GET /api/snapshot ~1/s. PAPER / SIMULATED. Never a wallet.
 */

export const POLL_MS = 1000;

function fmtIndex(n) {
  return Number(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtQty(n) {
  return Math.round(Number(n)).toLocaleString("en-US");
}

export function formatEconLine(data) {
  const hud = data && data.hud ? data.hud : null;
  const mode = (data && data.mode) || "PAPER";
  const provenance = (data && data.provenance) || "SIMULATED";
  const idx = hud && Number.isFinite(Number(hud.priceIndex)) ? fmtIndex(hud.priceIndex) : "—";
  const npc = hud && Number.isFinite(Number(hud.moneySupply)) ? "$" + fmtQty(hud.moneySupply) : "—";
  const out = hud && Number.isFinite(Number(hud.goodsProducedWindow)) ? fmtQty(hud.goodsProducedWindow) : "—";
  return `${mode} · ${provenance} · Index ${idx} · NPC ${npc} · out ${out}`;
}

export function mountEconHud(opts = {}) {
  const el = opts.el;
  const fetchImpl = opts.fetch || globalThis.fetch;
  let lastPoll = 0;
  let busy = false;
  let timer = 0;

  async function refresh() {
    if (!el || busy || typeof fetchImpl !== "function") return;
    busy = true;
    try {
      const res = await fetchImpl("/api/snapshot");
      if (!res || !res.ok) return;
      const body = await res.json();
      el.textContent = formatEconLine(body);
    } catch {
      /* keep the last painted line */
    } finally {
      busy = false;
    }
  }

  function maybeRefresh(force) {
    const now = Date.now();
    if (!force && now - lastPoll < POLL_MS) return;
    lastPoll = now;
    refresh();
  }

  if (el) {
    el.textContent = formatEconLine(null);
    if (el.setAttribute) el.setAttribute("title", "PAPER · SIMULATED");
    maybeRefresh(true);
    timer = setInterval(() => maybeRefresh(), POLL_MS);
  }

  return {
    tick() {
      maybeRefresh();
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = 0;
    },
  };
}
