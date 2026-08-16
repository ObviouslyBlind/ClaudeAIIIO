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
  let timer = 0;

  async function refresh() {
    if (!el || typeof fetchImpl !== "function") return;
    try {
      const res = await fetchImpl("/api/snapshot");
      if (!res || !res.ok) return;
      el.textContent = formatEconLine(await res.json());
    } catch {
      /* keep the last painted line */
    }
  }

  if (el) {
    el.textContent = formatEconLine(null);
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
