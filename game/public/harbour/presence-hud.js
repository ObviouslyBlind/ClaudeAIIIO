/**
 * Nearby outdoor count on the harbour sheet.
 * Polls GET /api/presence?x=&z= ~1/s. 250 m PAPER cell. HTTP only.
 * SIMULATED. Not Colyseus. Never a wallet.
 */

export const POLL_MS = 1000;
export const CELL_SIZE_M = 250;
const TITLE = "PAPER · SIMULATED · 250 m cell";

/** Origin is the unspawned three.js mesh, not the north quay. Omit coords. */
export function xzOf(getPos) {
  if (typeof getPos !== "function") return null;
  const p = getPos();
  const pos = p && p.position ? p.position : p;
  const x = pos ? Number(pos.x) : NaN;
  const z = pos ? Number(pos.z) : NaN;
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  if (x === 0 && z === 0) return null;
  return { x, z };
}

export function presenceUrl(pos) {
  if (!pos) return "/api/presence";
  return `/api/presence?x=${encodeURIComponent(pos.x)}&z=${encodeURIComponent(pos.z)}`;
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
      const res = await fetchImpl(presenceUrl(xzOf(getPos)));
      if (!res || !res.ok) return;
      el.textContent = formatPresenceLine(await res.json());
    } catch {
      /* keep the last painted line */
    }
  }

  if (el) {
    const already = String(el.textContent || "");
    if (!already.includes("PAPER")) el.textContent = formatPresenceLine(null);
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
