/**
 * Harbour PAPER persist restore control on the sheet.
 * Polls GET /api/persist (~1/s) for the last in-memory shard dump.
 * Restore POSTs /api/persist/restore. Does not leave /. Does not restart play.
 * PAPER / SIMULATED. Never a wallet. Not Postgres.
 */

export const POLL_MS = 1000;
export const IDLE_LINE = "PAPER · SIMULATED";
export const RESTORE_LABEL = "Restore";

function money(n) {
  return Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function lookup(id) {
  return typeof document !== "undefined" && document.getElementById
    ? document.getElementById(id)
    : null;
}

/** Last PAPER dump as a short sheet line. Empty dump stays PAPER · SIMULATED. */
export function formatPersistLine(blob, phase) {
  const mode = (blob && blob.mode) || "PAPER";
  const provenance = (blob && blob.provenance) || "SIMULATED";
  if (phase === "busy") return `${mode} · ${provenance} · restoring…`;
  if (phase === "no_blob") return `${mode} · ${provenance} · no dump`;
  if (phase === "error") return `${mode} · ${provenance} · restore failed`;
  if (phase === "restored") return `${mode} · ${provenance} · restored`;
  if (!blob || typeof blob !== "object") return `${mode} · ${provenance}`;
  const tick = num(blob.tick);
  const cash = blob.visitor ? num(blob.visitor.cash) : null;
  const bits = [`${mode} · ${provenance}`];
  if (tick != null) bits.push("tick " + tick);
  if (cash != null) bits.push("$" + money(cash));
  return bits.join(" · ");
}

function ensurePersistLine() {
  if (typeof document === "undefined" || !document.getElementById) return null;
  let el = document.getElementById("persist-line");
  if (el) return el;
  el = document.createElement("p");
  el.id = "persist-line";
  el.title = "PAPER · SIMULATED";
  const stall = document.getElementById("stall-hint");
  const ferry = document.getElementById("ferry-hint");
  const sheet = document.getElementById("sheet");
  if (stall && stall.parentNode) stall.parentNode.insertBefore(el, stall.nextSibling);
  else if (ferry && ferry.parentNode) ferry.parentNode.insertBefore(el, ferry.nextSibling);
  else if (sheet) sheet.appendChild(el);
  else return null;
  return el;
}

function styleRestoreBtn(btn) {
  if (!btn || !btn.style) return;
  btn.style.pointerEvents = "auto";
  btn.style.display = "block";
  btn.style.marginTop = "6px";
  btn.style.minHeight = "32px";
  btn.style.width = "100%";
  btn.style.border = "0";
  btn.style.borderRadius = "8px";
  btn.style.background = "#c4a574";
  btn.style.color = "#1a140c";
  btn.style.fontWeight = "700";
  btn.style.fontSize = "12px";
  btn.style.cursor = "pointer";
}

function ensureRestoreBtn() {
  if (typeof document === "undefined" || !document.getElementById) return null;
  let btn = document.getElementById("btn-restore");
  if (btn) {
    styleRestoreBtn(btn);
    return btn;
  }
  btn = document.createElement("button");
  btn.type = "button";
  btn.id = "btn-restore";
  btn.textContent = RESTORE_LABEL;
  btn.title = "PAPER · SIMULATED";
  styleRestoreBtn(btn);
  const line = document.getElementById("persist-line");
  const sheet = document.getElementById("sheet");
  if (line && line.parentNode) line.parentNode.insertBefore(btn, line.nextSibling);
  else if (sheet) sheet.appendChild(btn);
  else return null;
  return btn;
}

function paintCash(cashEl, blob) {
  if (!cashEl || !blob || !blob.visitor) return;
  const cash = num(blob.visitor.cash);
  if (cash == null) return;
  cashEl.textContent = "Cash $" + money(cash);
}

export function mountPersistHud(opts = {}) {
  const el = opts.el !== undefined ? opts.el : ensurePersistLine();
  const btn = opts.btnEl !== undefined ? opts.btnEl : ensureRestoreBtn();
  const cashEl =
    opts.cashEl !== undefined
      ? opts.cashEl
      : lookup("cash");
  const statusEl =
    opts.statusEl !== undefined
      ? opts.statusEl
      : lookup("status");
  const fetchImpl = opts.fetch || globalThis.fetch;
  let timer = 0;
  let lastBlob = null;
  let phase = "";
  let busy = false;

  function hasDump() {
    return Boolean(lastBlob);
  }

  function paint() {
    if (el) el.textContent = formatPersistLine(lastBlob, phase);
    if (btn) {
      if (btn.disabled !== undefined) btn.disabled = busy || !hasDump();
      if (!btn.textContent) btn.textContent = RESTORE_LABEL;
      if (btn.setAttribute) btn.setAttribute("title", "PAPER · SIMULATED");
      styleRestoreBtn(btn);
    }
  }

  async function refresh() {
    if (typeof fetchImpl !== "function") return;
    try {
      const res = await fetchImpl("/api/persist");
      if (!res) return;
      if (res.status === 204) {
        lastBlob = null;
        if (phase !== "restored" && phase !== "busy") phase = "";
        paint();
        return;
      }
      if (!res.ok) return;
      lastBlob = await res.json();
      if (phase !== "busy") phase = "";
      paint();
    } catch {
      /* keep the last painted PAPER line */
    }
  }

  async function restore() {
    if (busy || !hasDump() || typeof fetchImpl !== "function") return;
    busy = true;
    phase = "busy";
    paint();
    try {
      const res = await fetchImpl("/api/persist/restore", { method: "POST" });
      const body = res && typeof res.json === "function" ? await res.json() : null;
      if (body && body.ok) {
        phase = "restored";
        paintCash(cashEl, lastBlob);
        if (statusEl) {
          statusEl.textContent =
            (body.note && String(body.note)) ||
            "PAPER restore of last in-memory shard blob. SIMULATED.";
        }
      } else {
        phase = body && body.reason === "no_blob" ? "no_blob" : "error";
        if (statusEl) {
          const reason = (body && body.reason) || "error";
          statusEl.textContent = "Could not restore: " + reason + " (PAPER)";
        }
      }
    } catch {
      phase = "error";
      if (statusEl) statusEl.textContent = "Could not restore (PAPER)";
    } finally {
      busy = false;
      paint();
    }
  }

  if (el) {
    if (el.setAttribute) el.setAttribute("title", "PAPER · SIMULATED");
  }
  if (btn && btn.addEventListener) {
    btn.addEventListener("click", () => {
      restore();
    });
  }
  paint();
  refresh();
  if (el || btn) {
    timer = setInterval(refresh, POLL_MS);
  }

  return {
    tick() {},
    restore,
    stop() {
      if (timer) clearInterval(timer);
      timer = 0;
    },
  };
}

if (
  typeof document !== "undefined" &&
  document.getElementById &&
  (document.getElementById("persist-line") ||
    document.getElementById("btn-restore") ||
    document.getElementById("sheet"))
) {
  mountPersistHud();
}
