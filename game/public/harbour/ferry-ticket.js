/**
 * Paper ferry quote. Confirm posts /api/ferry (shared visitor cash), then spawnAt.
 * Kraft card overlay: PAPER / SIMULATED stamp + fare from the quote. Not a wallet.
 */

const KRAFT = "#efe4c8";
const KRAFT_EDGE = "#8a6238";
const STAMP = "#7a2e22";
const INK = "#3d2a1c";

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
  el.className = "paper-ticket";
  el.hidden = true;
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-labelledby", "ferry-ticket-title");
  el.setAttribute("data-mode", "PAPER");
  el.setAttribute("data-provenance", "SIMULATED");
  el.title = "PAPER · SIMULATED";
  el.style.background = KRAFT;
  el.style.color = INK;
  el.style.border = "2px dashed " + KRAFT_EDGE;
  el.style.boxShadow = "0 10px 28px rgba(61, 42, 28, 0.35), inset 0 0 0 2px " + STAMP;
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
      <p class="stamp" style="display:inline-block;margin:2px 0 10px;padding:8px 14px;border:3px dashed ${STAMP};color:${STAMP};background:${KRAFT};font-family:Georgia,'Times New Roman',serif;font-size:15px;font-weight:700;letter-spacing:0.16em;line-height:1.25;text-transform:uppercase;transform:rotate(-6deg);box-shadow:inset 0 0 0 2px ${STAMP}">PAPER / SIMULATED</p>
      <h2 id="ferry-ticket-title">${routeLabel(next)}</h2>
      <p class="mute">From ${cap(from)} port. Kraft ticket. Not a teleport until you confirm.</p>
      <svg viewBox="0 0 280 88" aria-hidden="true" style="background:${KRAFT};border:1px dashed ${KRAFT_EDGE}">
        <rect x="1" y="1" width="278" height="86" fill="${KRAFT}" stroke="${KRAFT_EDGE}" stroke-dasharray="5 3" />
        <path d="${d}" fill="none" stroke="#8a3b2a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
        <text x="18" y="16" fill="${INK}" font-size="11">${cap(next.from)}</text>
        <text x="232" y="80" fill="${INK}" font-size="11">${cap(next.to)}</text>
        <g transform="translate(184,8) rotate(-12)">
          <rect x="0" y="0" width="88" height="40" fill="${KRAFT}" stroke="${STAMP}" stroke-width="2.8" stroke-dasharray="6 3" rx="2" />
          <rect x="5" y="5" width="78" height="30" fill="none" stroke="${STAMP}" stroke-width="1.6" rx="1" />
          <text x="44" y="18" text-anchor="middle" fill="${STAMP}" font-size="11" font-weight="700" font-family="Georgia, Times New Roman, serif">PAPER</text>
          <text x="44" y="32" text-anchor="middle" fill="${STAMP}" font-size="9" font-weight="700" font-family="Georgia, Times New Roman, serif">SIMULATED</text>
        </g>
      </svg>
      <p class="fare" style="display:inline-block;margin:10px 0 0;padding:8px 12px;border:3px dashed ${STAMP};color:${INK};background:${KRAFT};font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;letter-spacing:0.04em;transform:rotate(-2deg)">PAPER $${fare}</p>
      <p class="stamp" style="display:inline-block;margin:8px 0 0;padding:5px 10px;border:2px dashed ${STAMP};font-size:12px;font-weight:700;letter-spacing:0.16em;color:${STAMP};text-transform:uppercase;font-family:Georgia,'Times New Roman',serif">SIMULATED · $${fare} fare</p>
      <div class="actions">
        <button type="button" class="cancel" id="ferry-cancel">Cancel</button>
        <button type="button" class="confirm" id="ferry-confirm">Confirm</button>
      </div>
    `;
    el.querySelector("#ferry-cancel").addEventListener("click", () => {
      close();
      setStatus("Ferry cancelled. PAPER.");
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
        setStatus("Ferry: " + body.reason + " (PAPER).");
        return;
      }
      if (body.snapshot) applyMap(body.snapshot);
      close();
      spawnAt(body.to);
      setStatus("Ferry to " + cap(body.to) + " · paid $" + money(body.paid) + " PAPER.");
    } catch {
      busy = false;
      if (confirmBtn) confirmBtn.disabled = false;
      setStatus("Ferry quote failed. PAPER.");
    }
  }

  async function open() {
    try {
      const res = await fetch("/api/ferry");
      const data = await res.json();
      const from = getIslandId();
      const next = (data.routes || []).find((r) => r.from === from || r.to === from);
      if (!next) {
        setStatus("No ferry from this port. PAPER.");
        return;
      }
      render(next, from);
      el.hidden = false;
      setStatus("Ferry quote. PAPER $" + money(next.cost) + ".");
    } catch {
      setStatus("Ferry quote failed. PAPER.");
    }
  }

  return { open, close, el };
}
