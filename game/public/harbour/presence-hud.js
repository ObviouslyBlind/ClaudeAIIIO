/**
 * Nearby outdoor count on the harbour sheet.
 * Polls GET /api/presence?x=&z= ~1/s. 250 m PAPER cell. HTTP only.
 * SIMULATED. Not Colyseus. Never a wallet.
 */

export const POLL_MS = 1000;
export const CELL_SIZE_M = 250;
const TITLE = "PAPER · SIMULATED · 250 m cell";

function xzOf(getPos) {
  if (typeof getPos !== "function") return { x: 0, z: 0 };
  const p = getPos();
  const pos = p && p.position ? p.position : p;
  const x = pos ? Number(pos.x) : 0;
  const z = pos ? Number(pos.z) : 0;
  return {
    x: Number.isFinite(x) ? x : 0,
    z: Number.isFinite(z) ? z : 0,
  };
}

function cellMetres(data) {
  const raw = data && data.cellSize != null ? Number(data.cellSize) : CELL_SIZE_M;
  return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : CELL_SIZE_M;
}

export function formatPresenceLine(data) {
  const mode = (data && data.mode) || "PAPER";
  const provenance = (data && data.provenance) || "SIMULATED";
  const cellM = cellMetres(data);
  const cellBit = `${cellM} m PAPER cell`;
  if (!data || !Array.isArray(data.actors)) {
    return `${mode} · ${provenance} · ${cellBit} · — nearby`;
  }
  return `${mode} · ${provenance} · ${cellBit} · ${data.actors.length} nearby`;
}

export function mountPresenceHud(opts = {}) {
  const el = opts.el;
  const fetchImpl = opts.fetch || globalThis.fetch;
  const getPos = opts.getPos;
  let timer = 0;

  async function refresh() {
    if (!el || typeof fetchImpl !== "function") return;
    try {
      const { x, z } = xzOf(getPos);
      const res = await fetchImpl(`/api/presence?x=${encodeURIComponent(x)}&z=${encodeURIComponent(z)}`);
      if (!res || !res.ok) return;
      el.textContent = formatPresenceLine(await res.json());
    } catch {
      /* keep the last painted line */
    }
  }

  if (el) {
    el.textContent = formatPresenceLine(null);
    if (el.setAttribute) el.setAttribute("title", TITLE);
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
