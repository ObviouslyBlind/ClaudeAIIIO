/**
 * Site card for carts, shops, and mines.
 * Tabs: Stock · Run · Upgrades · Stats. Hire lives on Run.
 * PAPER / SIMULATED.
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
  { id: "upgrades", label: "Upgrades" },
  { id: "stats", label: "Stats" },
];

const DEFAULT_UPGRADES = [
  { id: "fridge", label: "Fridge", cost: 200, appeal: 3 },
  { id: "sign", label: "Sign", cost: 80, appeal: 0.8 },
  { id: "awning", label: "Awning", cost: 120, appeal: 0.7 },
  { id: "lights", label: "Lights", cost: 60, appeal: 0.4 },
  { id: "stools", label: "Stools", cost: 50, appeal: 0.4 },
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

function ownedUpgrades(site) {
  const list = Array.isArray(site && site.upgrades) ? [...site.upgrades] : [];
  if (site && site.upgraded && !list.includes("fridge")) list.unshift("fridge");
  return list;
}

function stickerTone(sticker, today) {
  const d = Math.abs(Number(sticker) - Number(today));
  if (d < 0.01) return "is-today";
  if (d <= 1.5) return "is-near";
  return "is-far";
}

function stockBand(have, cap) {
  const r = have / Math.max(cap, 1);
  if (r <= 0.25) return "is-low";
  if (r < 0.85) return "is-mid";
  return "is-full";
}

function paintStock(site, play) {
  const todayN = Number(play && play.todayPrice != null ? play.todayPrice : 6);
  const sticker = Number(site.stickerPrice != null ? site.stickerPrice : todayN);
  const cap = Number(site.storageCap || 20);
  const have = Number(site.hotdogs != null ? site.hotdogs : site.stock) || 0;
  const stockId = site.stockId || "hotdogs";
  const invQty = ((play && play.inventory) || []).find((r) => r.kind === stockId)?.qty || 0;
  const whQty = ((play && play.warehouse && play.warehouse.items) || []).find((r) => r.kind === stockId)?.qty || 0;
  const room = Math.max(0, cap - have);
  const maxFromInv = Math.min(invQty, room);
  const maxFromWh = Math.min(whQty, room);
  const vs = stickerTone(sticker, todayN);
  const min = 1;
  const max = 11;
  const span = max - min;
  const mark = ((todayN - min) / span) * 100;
  const zoneLo = Math.max(min, todayN - 1.5);
  const zoneHi = Math.min(max, todayN + 1.5);
  const zoneLeft = ((zoneLo - min) / span) * 100;
  const zoneWidth = ((zoneHi - zoneLo) / span) * 100;
  const mine = site.siteClass === "mine";
  const hired = Boolean(site.hired);
  const loaders =
    mine || hired
      ? ""
      : `
      <div class="source-row">
        <button type="button" class="source src-pocket" data-stock="inventory" ${maxFromInv ? "" : "disabled"}>
          <strong>${invQty}</strong><span>On you</span>
        </button>
        <button type="button" class="source src-wh" data-stock="warehouse" ${maxFromWh ? "" : "disabled"}>
          <strong>${whQty}</strong><span>Warehouse</span>
        </button>
      </div>`;
  return `
    <p class="stock-num ${stockBand(have, cap)}">${Math.round(have)}<small>/${cap}</small></p>
    ${loaders}
    <div class="sticker-slide">
      <span class="sticker-read ${vs}" data-sticker-out>${money(sticker)}</span>
      <div class="sticker-track">
        <i class="sticker-band" aria-hidden="true"></i>
        <i class="sticker-zone" style="left:${zoneLeft}%;width:${zoneWidth}%"></i>
        <i class="sticker-mark" style="left:${mark}%"></i>
        <input id="sticker-price" type="range" min="${min}" max="${max}" step="0.5" value="${sticker}" />
      </div>
    </div>
  `;
}

function paintRun(site, play) {
  const names = Array.isArray(site.games) && site.games.length ? site.games : ["Fruit slice"];
  const cost = Number(play && play.hireCost != null ? play.hireCost : 30);
  if (site.hired) {
    return `
      <div class="inv-row">
        <span>${esc(site.staffName || "Vendor")}</span>
        <button type="button" class="ghost" data-fire-site="${esc(site.id)}">Fire</button>
      </div>`;
  }
  return `
    <button type="button" class="go hire-site" id="hire-site" data-hire-site="${esc(site.id)}">Hire ${money(cost)}</button>
    ${names
      .map(
        (name) => `
      <div class="inv-row">
        <span>${esc(name)}</span>
        <button type="button" class="go" data-pack-start="1" data-game="${esc(name)}">Play</button>
      </div>`,
      )
      .join("")}
  `;
}

function paintUpgrades(site, play) {
  const catalog = (play && play.upgradeCatalog) || DEFAULT_UPGRADES;
  const owned = ownedUpgrades(site);
  const rows = [];
  for (let i = 0; i < catalog.length; i++) {
    const u = catalog[i];
    const done = owned.includes(u.id);
    const prev = i > 0 ? catalog[i - 1] : null;
    const open = !prev || owned.includes(prev.id);
    const appeal = Number(u.appeal != null ? u.appeal : 0);
    const appealTxt = appeal ? ` +${appeal.toFixed(1)}` : "";
    if (done) {
      rows.push(`
        <div class="upg-row is-on">
          <span>${esc(u.label)}<small>${appealTxt}</small></span>
          <strong class="upg-tick" aria-label="Bought">✓</strong>
        </div>`);
      continue;
    }
    if (open) {
      rows.push(`
        <div class="upg-row">
          <span>${esc(u.label)}<small>${appealTxt}</small></span>
          <button type="button" class="go" data-upgrade="${esc(site.id)}" data-upgrade-id="${esc(u.id)}">${money(u.cost)}</button>
        </div>`);
      break;
    }
  }
  return rows.join("") || `<div class="upg-row is-on"><span>Done</span><strong class="upg-tick">✓</strong></div>`;
}

function paintStats(site) {
  const score = Number(site.desirability != null ? site.desirability : 0);
  const parts = Array.isArray(site.parts) ? site.parts : [];
  const searching = Number(site.searching != null ? site.searching : 0);
  const rivals = Number(site.rivalsOnStreet != null ? site.rivalsOnStreet : 0);
  const sellTicks = Number(site.sellTicks != null ? site.sellTicks : 18);
  const perMin = Number(site.perMinute != null ? site.perMinute : 0);
  const windowSales = Math.round(180 / Math.max(1, sellTicks));
  const sticker = Number(site.stickerPrice != null ? site.stickerPrice : 6);
  const band = site.stickerBand || stickerTone(sticker, 6).replace("is-today", "green").replace("is-near", "yellow").replace("is-far", "red");
  const mul = Number(site.stickerMul != null ? site.stickerMul : 1);
  const area = site.trafficBand || "red";
  const boost = Number(site.boostLeft != null ? site.boostLeft : 0);
  const shiftLine = boost > 0 ? `Shift speeding ×${boost}` : "Shift idle — Play on Run";
  return `
    <p class="site-score"><strong>${score.toFixed(1)}</strong><span>/ 10</span></p>
    <ul class="site-parts">
      ${parts
        .map(
          (p) =>
            `<li><span>${esc(p.label)}</span><strong>${Number(p.points).toFixed(1)}</strong></li>`,
        )
        .join("")}
    </ul>
    <div class="stand-row"><span>Area</span><strong>${esc(area)}</strong></div>
    <div class="stand-row"><span>Sticker</span><strong>${money(sticker)} ${esc(band)} ×${mul.toFixed(1)}</strong></div>
    <div class="stand-row"><span>Street</span><strong>${searching}</strong></div>
    <div class="stand-row"><span>Rivals</span><strong>${rivals}</strong></div>
    <div class="stand-row"><span>Sale every</span><strong>${sellTicks}s</strong></div>
    <div class="stand-row"><span>Sales</span><strong>~${windowSales} / 3 min</strong></div>
    <div class="stand-row"><span>$ / min</span><strong>${money(perMin)}</strong></div>
    <div class="stand-row"><span>Shift</span><strong>${esc(shiftLine)}</strong></div>
  `;
}

export function formatSiteMenu(site, play, tab) {
  if (!site) return "";
  const current = TABS.some((t) => t.id === tab) ? tab : "stock";
  const title = site.label || (site.siteClass === "shop" ? "Shop" : site.siteClass === "mine" ? "Mine" : "Cart");
  const body =
    current === "run"
      ? paintRun(site, play)
      : current === "stats"
        ? paintStats(site)
        : current === "upgrades"
          ? paintUpgrades(site, play)
          : paintStock(site, play);
  return `
    <div class="site-card">
      <div class="stand-head">
        <h2>${esc(title)}</h2>
        <button type="button" class="stand-x" id="stand-close">Close</button>
      </div>
      <div class="site-tabs" role="tablist">
        ${TABS.map(
          (t) =>
            `<button type="button" role="tab" class="site-tab${t.id === current ? " is-on" : ""}" data-site-tab="${t.id}" aria-selected="${t.id === current ? "true" : "false"}">${t.label}</button>`,
        ).join("")}
      </div>
      <div class="site-body">${body}</div>
    </div>
  `;
}
