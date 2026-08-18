/**
 * Ferry boarding card. Confirm posts /api/ferry, then spawnAt.
 * Same dusk-ferry chrome as the HUD. Fare stays $15. Not a wallet.
 */

const BRASS = "#d4b07a";
const HULL = "#0a1418";
const MUTED = "#b7d0c8";

/** Ticket fare. Do not change. */
export const FARE = 15;
/** Hidden serial for tests. Not drawn on the card. */
export const SERIAL = "NO. 15 · PAPER";

function cap(id) {
  return id.slice(0, 1).toUpperCase() + id.slice(1);
}

function routeLabel(route) {
  return cap(route.from) + " ↔ " + cap(route.to);
}

function polylinePath(points, w, h, pad) {
  const xs = points.map((p) => p.x);
  const zs = points.map((p) => p.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const spanX = Math.max(maxX - minX, 80);
  const spanZ = Math.max(maxZ - minZ, 80);
  const sx = (x) => pad + ((x - minX) / spanX) * (w - pad * 2);
  const sy = (z) => pad + ((z - minZ) / spanZ) * (h - pad * 2);
  return points
    .map((p, i) => (i ? "L" : "M") + sx(p.x).toFixed(1) + "," + sy(p.z).toFixed(1))
    .join(" ");
}

function money(n) {
  return Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function createFerryTicket({ getIslandId, spawnAt, setStatus, applyMap }) {
  const el = document.createElement("aside");
  el.id = "ferry-ticket";
  el.className = "paper-ticket ferry-pass";
  el.hidden = true;
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-labelledby", "ferry-ticket-title");
  el.setAttribute("data-mode", "PAPER");
  el.setAttribute("data-provenance", "SIMULATED");
  document.body.appendChild(el);

  let route = null;
  let busy = false;

  function close() {
    el.hidden = true;
    route = null;
    busy = false;
  }

  function render(next, from) {
    route = next;
    const d = polylinePath(next.points, 280, 88, 18);
    const fare = money(next.cost);
    el.innerHTML = `
      <h2 id="ferry-ticket-title">${routeLabel(next)}</h2>
      <p class="mute">From ${cap(from)} port. Confirm to board — not a teleport until then.</p>
      <svg viewBox="0 0 280 88" aria-hidden="true">
        <rect x="0" y="0" width="280" height="88" fill="${HULL}" />
        <path d="${d}" fill="none" stroke="${BRASS}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
        <text x="18" y="18" fill="${MUTED}" font-size="11">${cap(next.from)}</text>
        <text x="232" y="80" fill="${MUTED}" font-size="11">${cap(next.to)}</text>
      </svg>
      <p class="fare">$${fare}</p>
      <div class="actions">
        <button type="button" class="cancel" id="ferry-cancel">Cancel</button>
        <button type="button" class="confirm" id="ferry-confirm">Board</button>
      </div>
    `;
    el.querySelector("#ferry-cancel").addEventListener("click", () => {
      close();
      setStatus("Ferry cancelled.");
    });
    el.querySelector("#ferry-confirm").addEventListener("click", confirm);
  }

  async function confirm() {
    if (!route || busy) return;
    busy = true;
    const confirmBtn = el.querySelector("#ferry-confirm");
    if (confirmBtn) confirmBtn.disabled = true;
    try {
      const res = await fetch("/api/ferry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ routeId: route.id, from: getIslandId() }),
      });
      const body = await res.json();
      if (!body.ok) {
        busy = false;
        if (confirmBtn) confirmBtn.disabled = false;
        setStatus("Ferry: " + body.reason);
        return;
      }
      if (body.snapshot) applyMap(body.snapshot);
      close();
      spawnAt(body.to);
      setStatus("Ferry to " + cap(body.to) + " · paid $" + money(body.paid));
    } catch {
      busy = false;
      if (confirmBtn) confirmBtn.disabled = false;
      setStatus("Ferry quote failed.");
    }
  }

  async function open() {
    try {
      const res = await fetch("/api/ferry");
      const data = await res.json();
      const from = getIslandId();
      const next = (data.routes || []).find((r) => r.from === from || r.to === from);
      if (!next) {
        setStatus("No ferry from this port.");
        return;
      }
      render(next, from);
      el.hidden = false;
      setStatus("Ferry $" + money(next.cost) + ". Confirm to board.");
    } catch {
      setStatus("Ferry quote failed.");
    }
  }

  return { open, close, el };
}
