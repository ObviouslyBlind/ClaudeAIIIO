/**
 * Paper ferry quote. Confirm posts /api/ferry (shared visitor cash), then spawnAt.
 */

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
    el.innerHTML = `
      <p class="stamp">PAPER · SIMULATED · TICKET</p>
      <h2 id="ferry-ticket-title">${routeLabel(next)}</h2>
      <p class="mute">From ${cap(from)} port. Not a teleport until you confirm.</p>
      <svg viewBox="0 0 280 88" aria-hidden="true">
        <path d="${d}" fill="none" stroke="#8a3b2a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
        <text x="18" y="16" fill="#5a3a22" font-size="11">${cap(next.from)}</text>
        <text x="232" y="80" fill="#5a3a22" font-size="11">${cap(next.to)}</text>
      </svg>
      <p class="fare">PAPER $${money(next.cost)}</p>
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
