/**
 * Harbour PAPER minerals catalog. Lists what minerals exist in this shard.
 * Ore is the extract good. Not a 13th good. PAPER / SIMULATED.
 */

export const POLL_MS = 1000;
export const IDLE_LINE = "PAPER · SIMULATED · Minerals —";

function money(n) {
  return Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function formatMineralsLine(data) {
  const mode = (data && data.mode) || "PAPER";
  const provenance = (data && data.provenance) || "SIMULATED";
  const catalog = data && Array.isArray(data.catalog) ? data.catalog : [];
  if (!catalog.length) return `${mode} · ${provenance} · Minerals —`;
  const names = catalog.map((row) => row.label || row.id).filter(Boolean);
  const n = data && Array.isArray(data.deposits) ? data.deposits.length : 0;
  const held = data && data.held && Number(data.held.ore);
  const bits = [`${mode} · ${provenance}`, names.join(", ")];
  if (n) bits.push(n + " deposits");
  if (Number.isFinite(held) && held > 0) bits.push("held " + money(held));
  return bits.join(" · ");
}

export function formatMineralsBody(data) {
  const catalog = data && Array.isArray(data.catalog) ? data.catalog : [];
  const deposits = data && Array.isArray(data.deposits) ? data.deposits : [];
  const held = data && data.held && Number(data.held.ore);
  const lines = ['<p class="menu-note">PAPER · SIMULATED. Catalog is sim data.</p>'];
  if (!catalog.length) {
    lines.push("<p>No minerals in this shard.</p>");
    return lines.join("");
  }
  for (const row of catalog) {
    const label = row.label || row.id;
    const note = row.note || "";
    const fair = row.fair0 != null ? money(row.fair0) : "—";
    const n = deposits.filter((d) => d.mineral === row.id).length;
    lines.push(
      `<article class="mineral-row"><h3>${label}</h3>` +
        `<p>Good ${row.goodId} · fair $${fair} · ${n} deposits</p>` +
        `<p>${note}</p></article>`,
    );
  }
  if (Number.isFinite(held) && held > 0) {
    lines.push(`<p>Held ore ${money(held)} · PAPER</p>`);
  }
  return lines.join("");
}

function lookup(id) {
  return typeof document !== "undefined" && document.getElementById
    ? document.getElementById(id)
    : null;
}

function ensureLine() {
  if (typeof document === "undefined" || !document.getElementById) return null;
  let el = document.getElementById("minerals");
  if (el) return el;
  el = document.createElement("p");
  el.id = "minerals";
  el.title = "PAPER · SIMULATED";
  el.textContent = IDLE_LINE;
  const goods = document.getElementById("goods");
  const staff = document.getElementById("staff-line");
  const sheet = document.getElementById("sheet");
  if (goods && goods.parentNode) goods.parentNode.insertBefore(el, goods.nextSibling);
  else if (staff && staff.parentNode) staff.parentNode.insertBefore(el, staff);
  else if (sheet) sheet.appendChild(el);
  return el;
}

export function mountMineralsHud(opts = {}) {
  const el = opts.el !== undefined ? opts.el : ensureLine();
  const btn = opts.btnEl !== undefined ? opts.btnEl : lookup("btn-minerals");
  const fetchImpl = opts.fetch || globalThis.fetch;
  const openMenu = opts.openMenu;
  let timer = 0;
  let last = null;

  function paint() {
    if (el) el.textContent = formatMineralsLine(last);
  }

  async function refresh() {
    if (typeof fetchImpl !== "function") return;
    try {
      const res = await fetchImpl("/api/minerals");
      if (!res || !res.ok) return;
      last = await res.json();
      paint();
    } catch {
      /* keep last PAPER line */
    }
  }

  function open() {
    const html = formatMineralsBody(last);
    if (typeof openMenu === "function") {
      openMenu({ id: "minerals", title: "Minerals" }, html);
      return;
    }
    const menus = globalThis.__harbourMenus;
    if (menus && typeof menus.open === "function") {
      menus.open({ id: "minerals", title: "Minerals" }, html);
    }
  }

  if (el && el.setAttribute) el.setAttribute("title", "PAPER · SIMULATED");
  if (btn && btn.addEventListener) btn.addEventListener("click", open);
  paint();
  refresh();
  if (el || btn) timer = setInterval(refresh, POLL_MS);

  return {
    open,
    stop() {
      if (timer) clearInterval(timer);
      timer = 0;
    },
  };
}

if (
  typeof document !== "undefined" &&
  document.getElementById &&
  (document.getElementById("minerals") || document.getElementById("btn-minerals"))
) {
  mountMineralsHud();
}
