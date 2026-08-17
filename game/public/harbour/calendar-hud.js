/**
 * Harbour PAPER sim calendar strip: day + tick on #calendar.
 * Polls GET /api/snapshot ~1/s. PAPER / SIMULATED. Never a wallet.
 */

export const POLL_MS = 1000;
export const TICKS_PER_SIM_DAY = 3600;

function num(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function calendarOf(data) {
  const cal = data && data.calendar;
  if (cal && typeof cal === "object") return cal;
  const tick = num(data && data.hud && data.hud.tick);
  if (tick == null) return null;
  return {
    mode: (data && data.mode) || "PAPER",
    provenance: (data && data.provenance) || "SIMULATED",
    tick,
    day: Math.floor(Math.max(0, tick) / TICKS_PER_SIM_DAY),
  };
}

export function formatCalendarLine(data) {
  const cal = calendarOf(data);
  const mode = (cal && cal.mode) || (data && data.mode) || "PAPER";
  const provenance = (cal && cal.provenance) || (data && data.provenance) || "SIMULATED";
  const day = cal && num(cal.day);
  const tick = cal && num(cal.tick);
  const dayBit = day == null ? "—" : String(day);
  const tickBit = tick == null ? "—" : String(tick);
  return `${mode} · ${provenance} · Day ${dayBit} · tick ${tickBit}`;
}

function ensureCalendar() {
  if (typeof document === "undefined" || !document.getElementById) return null;
  let el = document.getElementById("calendar");
  if (el) return el;
  el = document.createElement("p");
  el.id = "calendar";
  el.title = "PAPER · SIMULATED";
  const cash = document.getElementById("cash");
  const sheet = document.getElementById("sheet");
  if (cash && cash.parentNode) cash.parentNode.insertBefore(el, cash.nextSibling);
  else if (sheet) sheet.appendChild(el);
  else return null;
  return el;
}

export function mountCalendarHud(opts = {}) {
  const el = opts.el !== undefined ? opts.el : ensureCalendar();
  const fetchImpl = opts.fetch || globalThis.fetch;
  let timer = 0;

  async function refresh() {
    if (!el || typeof fetchImpl !== "function") return;
    try {
      const res = await fetchImpl("/api/snapshot");
      if (!res || !res.ok) return;
      el.textContent = formatCalendarLine(await res.json());
    } catch {
      /* keep the last painted PAPER line */
    }
  }

  if (el) {
    if (el.setAttribute) el.setAttribute("title", "PAPER · SIMULATED");
    // Do not clobber the first-frame "Day 0 · tick 0" line with dashes
    // before snapshot returns (`/g/hud48` FAIL HUD).
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

