/**
 * Nearby outdoor names on the harbour sheet.
 * Polls GET /api/presence?x=&z= ~1/s. PAPER / SIMULATED. HTTP only. Not Colyseus.
 */

export const POLL_MS = 1000;
const MAX_NAMES = 4;

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

export function formatPresenceLine(data) {
  const mode = (data && data.mode) || "PAPER";
  const provenance = (data && data.provenance) || "SIMULATED";
  const actors = data && Array.isArray(data.actors) ? data.actors : [];
  const names = [];
  for (const actor of actors) {
    const name = actor && actor.name ? String(actor.name).trim() : "";
    if (name) names.push(name);
    if (names.length >= MAX_NAMES) break;
  }
  const who = names.length ? names.join(", ") : "—";
  return `${mode} · ${provenance} · Nearby ${who}`;
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
