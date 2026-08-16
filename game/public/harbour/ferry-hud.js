/**
 * Harbour PAPER ferry fare hint on the sheet.
 * When #btn-ferry is enabled or #ferry-ticket is up, paint "Ferry $15 · PAPER".
 * Fare from snapshot / statute if available, else 15. PAPER / SIMULATED. Never a wallet.
 */

export const POLL_MS = 1000;
export const FALLBACK_FARE = 15;

function money(n) {
  return Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function fareFromStatutes(statutes) {
  if (!statutes) return null;
  if (Array.isArray(statutes)) {
    const row = statutes.find((s) => s && (s.id === "ferry_ticket" || s.id === "ferry"));
    if (!row) return null;
    const sliders = row.sliders && typeof row.sliders === "object" ? row.sliders : row;
    return num(sliders.cost ?? sliders.fare ?? sliders.ticket ?? row.cost);
  }
  if (typeof statutes === "object") {
    const row = statutes.ferry_ticket || statutes.ferry;
    if (row && typeof row === "object") {
      const sliders = row.sliders && typeof row.sliders === "object" ? row.sliders : row;
      return num(sliders.cost ?? sliders.fare ?? sliders.ticket ?? row.cost);
    }
  }
  return null;
}

/** Snapshot first, then statute `ferry_ticket` cost, else 15. */
export function fareOf(data) {
  if (!data || typeof data !== "object") return FALLBACK_FARE;
  const hud = data.hud;
  if (hud && typeof hud === "object") {
    const n = num(hud.ferryCost ?? hud.ferryTicket ?? hud.ticket);
    if (n != null) return n;
  }
  const direct = num(data.ferryCost ?? data.ticket ?? data.fare);
  if (direct != null) return direct;
  if (data.ferry && typeof data.ferry === "object") {
    const n = num(data.ferry.cost ?? data.ferry.ticket ?? data.ferry.fare);
    if (n != null) return n;
  }
  if (Array.isArray(data.routes)) {
    for (const r of data.routes) {
      const n = num(r && r.cost);
      if (n != null) return n;
    }
  }
  const fromLaw = fareFromStatutes(data.statutes != null ? data.statutes : data);
  if (fromLaw != null) return fromLaw;
  return FALLBACK_FARE;
}

export function isFerryHintActive(btn, overlay) {
  const btnOn = Boolean(btn && !btn.disabled);
  const overlayOn = Boolean(overlay && overlay.hidden === false);
  return btnOn || overlayOn;
}

export function formatFerryHint(data, active) {
  if (!active) return "";
  const mode = (data && data.mode) || "PAPER";
  return `Ferry $${money(fareOf(data))} · ${mode}`;
}

function mergeFareSources(snapshot, statutesBody) {
  const data = snapshot && typeof snapshot === "object" ? { ...snapshot } : {};
  if (statutesBody && typeof statutesBody === "object") {
    if (Array.isArray(statutesBody.statutes)) data.statutes = statutesBody.statutes;
    else if (Array.isArray(statutesBody)) data.statutes = statutesBody;
    if (!data.mode && statutesBody.mode) data.mode = statutesBody.mode;
  }
  return Object.keys(data).length ? data : null;
}

function ensureFerryHint() {
  if (typeof document === "undefined" || !document.getElementById) return null;
  let el = document.getElementById("ferry-hint");
  if (el) return el;
  el = document.createElement("p");
  el.id = "ferry-hint";
  el.title = "PAPER · SIMULATED";
  const lease = document.getElementById("lease-hint");
  const sheet = document.getElementById("sheet");
  if (lease && lease.parentNode) lease.parentNode.insertBefore(el, lease.nextSibling);
  else if (sheet) sheet.appendChild(el);
  else return null;
  return el;
}

function lookup(id) {
  return typeof document !== "undefined" && document.getElementById
    ? document.getElementById(id)
    : null;
}

export function mountFerryHud(opts = {}) {
  const el = opts.el !== undefined ? opts.el : ensureFerryHint();
  const fetchImpl = opts.fetch || globalThis.fetch;
  const btnEl = opts.btnEl !== undefined ? opts.btnEl : lookup("btn-ferry");
  let overlayEl = opts.overlayEl !== undefined ? opts.overlayEl : lookup("ferry-ticket");
  let timer = 0;
  let lastData = null;
  let observer = null;

  function overlay() {
    if (opts.overlayEl !== undefined) return overlayEl;
    return lookup("ferry-ticket") || overlayEl;
  }

  function active() {
    if (typeof opts.isActive === "function") return Boolean(opts.isActive());
    return isFerryHintActive(btnEl, overlay());
  }

  function paint() {
    if (!el) return;
    el.textContent = formatFerryHint(lastData, active());
  }

  async function refresh() {
    if (typeof fetchImpl === "function") {
      try {
        const [snapRes, lawRes] = await Promise.all([
          fetchImpl("/api/snapshot"),
          fetchImpl("/api/statutes"),
        ]);
        const snap = snapRes && snapRes.ok ? await snapRes.json() : null;
        const law = lawRes && lawRes.ok ? await lawRes.json() : null;
        lastData = mergeFareSources(snap, law);
      } catch {
        /* keep last PAPER fare, else fallback 15 */
      }
    }
    paint();
  }

  if (el) {
    if (el.setAttribute) el.setAttribute("title", "PAPER · SIMULATED");
    el.textContent = formatFerryHint(null, active());
    refresh();
    timer = setInterval(refresh, POLL_MS);
    if (typeof MutationObserver === "function") {
      observer = new MutationObserver(paint);
      if (btnEl && typeof btnEl.nodeType === "number") {
        observer.observe(btnEl, { attributes: true, attributeFilter: ["disabled", "hidden"] });
      }
      const ticket = overlay();
      if (ticket && typeof ticket.nodeType === "number") {
        observer.observe(ticket, { attributes: true, attributeFilter: ["hidden"] });
      }
      if (typeof document !== "undefined" && document.body) {
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
      }
    }
  }

  return {
    tick() {},
    sync: paint,
    stop() {
      if (timer) clearInterval(timer);
      timer = 0;
      if (observer) observer.disconnect();
      observer = null;
    },
  };
}

if (
  typeof document !== "undefined" &&
  document.getElementById &&
  (document.getElementById("ferry-hint") || document.getElementById("btn-ferry"))
) {
  mountFerryHud();
}
