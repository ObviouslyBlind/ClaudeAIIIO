/**
 * Hire / fire PAPER AI staff on a developed visitor plot.
 * POST /api/staff. SIMULATED. Not live. Not a wallet.
 */

export const MAX_STAFF_PER_PLOT = 2;
/** PAPER daily wage per slot, and hire cost (one day's wage on hand). */
export const STAFF_WAGE = 4;

function money(n) {
  return Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function slotsOf(map) {
  if (!map) return [];
  if (Array.isArray(map.staffSlots)) return map.staffSlots;
  const visitor = map.visitor;
  if (visitor && Array.isArray(visitor.staffSlots)) return visitor.staffSlots;
  return [];
}

function countOnPlot(slots, plotId) {
  return slots.filter((s) => s && s.plotId === plotId).length;
}

function wageFromStatutes(statutes) {
  if (!statutes) return null;
  if (Array.isArray(statutes)) {
    const row = statutes.find((s) => s && (s.id === "wage_floor" || s.id === "wage"));
    if (!row) return null;
    const sliders = row.sliders && typeof row.sliders === "object" ? row.sliders : row;
    return num(sliders.wage ?? sliders.cost ?? sliders.floor ?? row.wage);
  }
  if (typeof statutes === "object") {
    const row = statutes.wage_floor || statutes.wage;
    if (row && typeof row === "object") {
      const sliders = row.sliders && typeof row.sliders === "object" ? row.sliders : row;
      return num(sliders.wage ?? sliders.cost ?? sliders.floor ?? row.wage);
    }
    return num(statutes.wage);
  }
  return null;
}

/** Slot wage, map/hud field, wage-floor statute, else $4. Never visitor cash. */
export function wageOf(map) {
  if (!map || typeof map !== "object") return STAFF_WAGE;
  const slots = slotsOf(map);
  for (const s of slots) {
    const w = s ? num(s.wage) : null;
    if (w != null) return w;
  }
  const hud = map.hud && typeof map.hud === "object" ? map.hud : null;
  const direct = num(
    map.staffWage ?? map.wage ?? map.hireCost ?? (hud && (hud.staffWage ?? hud.wage)),
  );
  if (direct != null) return direct;
  const fromLaw = wageFromStatutes(map.statutes != null ? map.statutes : map);
  if (fromLaw != null) return fromLaw;
  return STAFF_WAGE;
}

export function formatStaffLine(map, plot) {
  if (!plot || plot.owner !== "visitor" || !plot.use) {
    return "PAPER · SIMULATED · Staff —";
  }
  const n = countOnPlot(slotsOf(map), plot.id);
  const bit = "$" + money(wageOf(map));
  return `PAPER · SIMULATED · Staff ${n}/${MAX_STAFF_PER_PLOT} · hire ${bit} · wage ${bit}/day`;
}

function ensureStaffLine() {
  if (typeof document === "undefined") return null;
  let el = document.getElementById("staff-line");
  if (el) return el;
  const sheet = document.getElementById("sheet");
  if (!sheet) return null;
  el = document.createElement("p");
  el.id = "staff-line";
  el.title = "PAPER · SIMULATED";
  sheet.appendChild(el);
  return el;
}

function ensureDockButton(id, label) {
  if (typeof document === "undefined") return null;
  let btn = document.getElementById(id);
  if (btn) return btn;
  btn = document.createElement("button");
  btn.type = "button";
  btn.id = id;
  btn.textContent = label;
  btn.title = "PAPER · SIMULATED";
  const dock = document.querySelector("nav.dock");
  const taxiBtn = document.getElementById("btn-taxi");
  if (dock && taxiBtn) dock.insertBefore(btn, taxiBtn);
  else if (dock) dock.appendChild(btn);
  return btn;
}

function selectedPlot(opts) {
  const map = typeof opts.getMap === "function" ? opts.getMap() : null;
  const id = typeof opts.getSelected === "function" ? opts.getSelected() : null;
  if (!map || !id || !Array.isArray(map.plots)) return null;
  return map.plots.find((p) => p.id === id) || null;
}

/**
 * Sheet line + Hire/Fire dock buttons. Posts { plotId, action } to /api/staff.
 */
export function mountStaffHud(opts = {}) {
  const fetchImpl = opts.fetch || globalThis.fetch;
  const lineEl = opts.lineEl || ensureStaffLine();
  const hireBtn = opts.hireBtn || ensureDockButton("btn-hire", "Hire");
  const fireBtn = opts.fireBtn || ensureDockButton("btn-fire", "Fire");
  const setStatus = typeof opts.setStatus === "function" ? opts.setStatus : () => {};
  const applySnapshot = typeof opts.applySnapshot === "function" ? opts.applySnapshot : () => {};
  let busy = false;

  function sync() {
    const map = typeof opts.getMap === "function" ? opts.getMap() : null;
    const plot = selectedPlot(opts);
    if (lineEl) lineEl.textContent = formatStaffLine(map, plot);
    const mine = Boolean(plot && plot.owner === "visitor" && plot.use);
    const n = plot ? countOnPlot(slotsOf(map), plot.id) : 0;
    if (hireBtn) hireBtn.disabled = !mine || n >= MAX_STAFF_PER_PLOT || busy;
    if (fireBtn) fireBtn.disabled = !mine || n < 1 || busy;
  }

  async function post(action) {
    const plot = selectedPlot(opts);
    if (!plot || busy || typeof fetchImpl !== "function") return;
    busy = true;
    sync();
    try {
      const res = await fetchImpl("/api/staff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plotId: plot.id, action }),
      });
      const body = await res.json();
      if (body && body.snapshot) applySnapshot(body.snapshot);
      if (!body || !body.ok) {
        setStatus("Could not " + action + ": " + ((body && body.reason) || "error") + " (PAPER)");
        return;
      }
      setStatus(
        action === "hire"
          ? "Hired PAPER staff on this " + plot.use + "."
          : "Fired PAPER staff on this " + plot.use + ".",
      );
    } catch {
      setStatus("Could not " + action + " (PAPER)");
    } finally {
      busy = false;
      sync();
    }
  }

  if (hireBtn && hireBtn.addEventListener) {
    hireBtn.addEventListener("click", () => post("hire"));
  }
  if (fireBtn && fireBtn.addEventListener) {
    fireBtn.addEventListener("click", () => post("fire"));
  }
  sync();

  return { sync, post };
}
