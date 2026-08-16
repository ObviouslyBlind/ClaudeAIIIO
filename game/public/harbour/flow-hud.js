/**
 * Harbour PAPER faucet/sink strip on #flow.
 * Polls GET /api/snapshot ~1/s. PAPER / SIMULATED. Never a wallet.
 */

export const POLL_MS = 1000;

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmtAmt(v) {
  const n = num(v);
  if (n == null) return "0";
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function flowOf(data) {
  const hud = data && data.hud && typeof data.hud === "object" ? data.hud : null;
  const ledger = data && data.ledger && typeof data.ledger === "object" ? data.ledger : null;
  const faucet = hud && "faucet" in hud ? hud.faucet : ledger && "faucet" in ledger ? ledger.faucet : data && data.faucet;
  const sink = hud && "sink" in hud ? hud.sink : ledger && "sink" in ledger ? ledger.sink : data && data.sink;
  return { faucet, sink };
}

export function formatFlowLine(data) {
  const { faucet, sink } = flowOf(data);
  const mode = (data && data.mode) || "PAPER";
  const provenance = (data && data.provenance) || "SIMULATED";
  return `${mode} · ${provenance} · Faucet ${fmtAmt(faucet)} · sink ${fmtAmt(sink)}`;
}

function ensureFlow() {
  if (typeof document === "undefined" || !document.getElementById) return null;
  let el = document.getElementById("flow");
  if (el) return el;
  el = document.createElement("p");
  el.id = "flow";
  el.title = "PAPER · SIMULATED";
  const econ = document.getElementById("econ");
  const calendar = document.getElementById("calendar");
  const cash = document.getElementById("cash");
  const sheet = document.getElementById("sheet");
  if (econ && econ.parentNode) econ.parentNode.insertBefore(el, econ.nextSibling);
  else if (calendar && calendar.parentNode) calendar.parentNode.insertBefore(el, calendar.nextSibling);
  else if (cash && cash.parentNode) cash.parentNode.insertBefore(el, cash.nextSibling);
  else if (sheet) sheet.appendChild(el);
  else return null;
  return el;
}

export function mountFlowHud(opts = {}) {
  const el = opts.el !== undefined ? opts.el : ensureFlow();
  const fetchImpl = opts.fetch || globalThis.fetch;
  let timer = 0;

  async function refresh() {
    if (!el || typeof fetchImpl !== "function") return;
    try {
      const res = await fetchImpl("/api/snapshot");
      if (!res || !res.ok) return;
      el.textContent = formatFlowLine(await res.json());
    } catch {
      /* keep the last painted PAPER line */
    }
  }

  if (el) {
    const already = String(el.textContent || "");
    if (!already.includes("PAPER")) el.textContent = formatFlowLine(null);
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
  (document.getElementById("flow") || document.getElementById("sheet"))
) {
  mountFlowHud();
}
