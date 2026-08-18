/**
 * Site card for carts, shops, and mines. Tabs at the top, Hire at the bottom.
 * No left-right scroll. PAPER / SIMULATED.
 */

function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "$0.00";
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const TABS = [
  { id: "stock", label: "Stock" },
  { id: "run", label: "Run" },
  { id: "stats", label: "Stats" },
];

export const SITE_GAMES = {
  fruit: ["mango", "pineapple", "papaya", "banana", "watermelon"],
  watermelon: ["watermelon", "melon wedge", "seeds"],
  fish_chips: ["fish", "chips", "batter"],
  shop: ["till", "bag", "change"],
  mine: ["ore", "lumber", "pick"],
};

export function gamesForSite(site) {
  const cls = site && site.siteClass;
  if (cls === "shop") return SITE_GAMES.shop;
  if (cls === "mine") return SITE_GAMES.mine;
  const kind = site && site.kind;
  return SITE_GAMES[kind] || SITE_GAMES.fruit;
}

export function siteClassForUse(use) {
  if (!use) return null;
  if (use === "shop" || use === "house_shop" || use === "stall") return "shop";
  if (use === "factory" || use === "farm") return "mine";
  return null;
}

function stockTicks(have, cap) {
  const tickN = 20;
  const filled = Math.round((have / Math.max(cap, 1)) * tickN);
  return Array.from({ length: tickN }, (_, i) => `<i class="${i < filled ? "on" : ""}"></i>`).join("");
}

function paintStock(site, play) {
  const todayN = Number(play && play.todayPrice != null ? play.todayPrice : 6);
  const today = money(todayN);
  const sticker = Number(site.stickerPrice != null ? site.stickerPrice : todayN);
  const cap = Number(site.storageCap || 20);
  const have = Number(site.hotdogs != null ? site.hotdogs : site.stock) || 0;
  const stockId = site.stockId || "hotdogs";
  const food = site.stockLabel || site.label || "Stock";
  const invQty = ((play && play.inventory) || []).find((r) => r.kind === stockId)?.qty || 0;
  const whQty = ((play && play.warehouse && play.warehouse.items) || []).find((r) => r.kind === stockId)?.qty || 0;
  const room = Math.max(0, cap - have);
  const maxFromInv = Math.min(invQty, room);
  const maxFromWh = Math.min(whQty, room);
  const maxQty = Math.max(maxFromInv, maxFromWh);
  const vs = sticker < todayN - 0.01 ? "is-low" : sticker > todayN + 0.01 ? "is-high" : "is-today";
  const mine = site.siteClass === "mine";
  const fridgeLabel = site.siteClass === "cart" ? "Fridge · $200" : "Upgrade · $200";
  const loaders = mine
    ? `<p class="whisper">Hired staff extract. Play a mini-game on Run to speed the next sales.</p>`
    : `
      <div class="source-row">
        <button type="button" class="source src-pocket" data-stock="inventory" ${maxFromInv ? "" : "disabled"}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8h10l1.2 12H5.8L7 8z"/><path d="M9 8V6.4a3 3 0 0 1 6 0V8"/></svg>
          <strong>${invQty}</strong><span>Pockets</span>
        </button>
        <button type="button" class="source src-wh" data-stock="warehouse" ${maxFromWh ? "" : "disabled"}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5V20H4z"/><path d="M4 10.5h16M12 10.5V20"/></svg>
          <strong>${whQty}</strong><span>Warehouse</span>
        </button>
      </div>
      ${
        maxQty
          ? `<div class="slider-row"><input id="stock-qty" class="qty-slider" type="range" min="1" max="${maxQty}" value="${maxQty}" /><span data-qty-out>${maxQty}</span></div>`
          : `<p class="whisper">${have ? "Storage is holding this site." : "Buy a stock pack in Market, then load it here."}</p>`
      }`;
  return `
    <div class="stock-ticks" title="Stock">${stockTicks(have, cap)}</div>
    <p class="stock-read">${have}<small>/${cap}</small> ${esc(String(food).toLowerCase())}</p>
    ${loaders}
    <p class="sticker-label">Sticker</p>
    <div class="sticker-row">
      <input id="sticker-price" type="number" min="0.01" max="1000" step="0.5" value="${sticker}" />
      <span class="today-price ${vs}">${today} is today's price</span>
    </div>
    ${
      site.hired && !site.upgraded
        ? `<button type="button" class="go fridge" data-upgrade="${esc(site.id)}">${fridgeLabel}</button>`
        : ""
    }
  `;
}

function paintRun(site) {
  const names = Array.isArray(site.games) && site.games.length ? site.games : ["Fruit slice"];
  const goods = gamesForSite(site);
  return `
    <p class="whisper">Mini-games live on this site. Hired staff still sell if you skip. More plays, faster next sales. PAPER bonus only.</p>
    ${names
      .map(
        (name) => `
      <div class="inv-row">
        <span>${esc(name)}</span>
        <button type="button" class="go" data-pack-start="1" data-game="${esc(name)}">Play</button>
      </div>`,
      )
      .join("")}
    <p class="whisper">Slice ${esc(goods.slice(0, 3).join(", "))}${goods.length > 3 ? "…" : ""}.</p>
  `;
}

function paintStats(site) {
  const score = Number(site.desirability != null ? site.desirability : 0);
  const cap = Number(site.cap != null ? site.cap : 10);
  const parts = Array.isArray(site.parts) ? site.parts : [];
  const searching = Number(site.searching != null ? site.searching : 0);
  const rivals = Number(site.rivalsOnStreet != null ? site.rivalsOnStreet : 0);
  const sellTicks = Number(site.sellTicks != null ? site.sellTicks : 18);
  const perMin = Number(site.perMinute != null ? site.perMinute : 0);
  const windowSales = Math.round(180 / Math.max(1, sellTicks));
  return `
    <p class="site-score"><strong>${score.toFixed(1)}</strong><span>/ 10</span></p>
    <p class="whisper">${cap < 10 ? `Crowding caps this street at ${cap}.` : "Quiet street. No crowding cap."}</p>
    <ul class="site-parts">
      ${parts
        .map(
          (p) =>
            `<li><span>${esc(p.label)}</span><strong>${Number(p.points).toFixed(1)}</strong></li>`,
        )
        .join("")}
    </ul>
    <div class="stand-row"><span>Searching this street</span><strong>${searching}</strong></div>
    <div class="stand-row"><span>Rivals on this street</span><strong>${rivals}</strong></div>
    <div class="stand-row"><span>Sales</span><strong>~${windowSales} / 3 min</strong></div>
    <div class="stand-row"><span>PAPER / min</span><strong>${money(perMin)}</strong></div>
  `;
}

export function formatSiteMenu(site, play, tab) {
  if (!site) return "";
  const current = TABS.some((t) => t.id === tab) ? tab : "stock";
  const title = site.label || (site.siteClass === "shop" ? "Shop" : site.siteClass === "mine" ? "Mine" : "Cart");
  const standNeeds = Array.isArray(site.needs) ? site.needs : [];
  const body =
    current === "run" ? paintRun(site) : current === "stats" ? paintStats(site) : paintStock(site, play);
  const hired = site.hired
    ? `<p class="hired-pill">${esc(site.staffName || "Vendor")} on</p>`
    : `<button type="button" class="go hire-site" id="hire-site" data-hire-site="${esc(site.id)}">Hire</button>
       <p class="whisper">One hire. A vendor appears and keeps this site running.</p>`;
  return `
    <div class="site-card">
      <div class="stand-head">
        <h2>${esc(title)}</h2>
        <button type="button" class="stand-x" id="stand-close">Close</button>
      </div>
      ${standNeeds.map((n) => `<p class="cart-need">${esc(n.label)}</p>`).join("")}
      <div class="site-tabs" role="tablist">
        ${TABS.map(
          (t) =>
            `<button type="button" role="tab" class="site-tab${t.id === current ? " is-on" : ""}" data-site-tab="${t.id}" aria-selected="${t.id === current ? "true" : "false"}">${t.label}</button>`,
        ).join("")}
      </div>
      <div class="site-body">${body}</div>
      <div class="site-foot">${hired}</div>
    </div>
  `;
}
