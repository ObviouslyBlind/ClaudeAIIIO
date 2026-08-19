/**
 * Center 2Isles Marketplace sheet. Kit catalogs, not a grocery list.
 * Street is live. Other aisles are honest empty until those lots exist.
 * Do not say PAPER, outfitter, or books on this sheet.
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

function needle(q) {
  return String(q || "")
    .trim()
    .toLowerCase();
}

function matches(q, ...parts) {
  const n = needle(q);
  if (!n) return true;
  return parts.some((p) => String(p || "").toLowerCase().includes(n));
}

export const MARKET_SHEET_AISLES = [
  {
    id: "street",
    label: "Street",
    live: true,
    blurb: "Carts you drop on a pad.",
  },
  {
    id: "shopfit",
    label: "Shop fit",
    live: false,
    soon: "Shelves, till, fridge, counter, backstock — when you own a shop. A stocker fills shelves the same way a truck fills a pile.",
  },
  {
    id: "hospitality",
    label: "Hospitality",
    live: false,
    soon: "Beds, kitchen, lobby, rooms — when you own a house or hotel. Kit that sits inside, not a second map.",
  },
  {
    id: "plant",
    label: "Plant",
    live: false,
    soon: "Static excavator, crushers, belts — when a quarry lot exists. About twenty SKUs for the whole chain, not a yard of random lumber.",
  },
  {
    id: "farming",
    label: "Farming",
    live: false,
    soon: "Orchard and field kit — when a farm lot exists. Pick, crate, shed, truck. Same jobs as a shop.",
  },
];

export function marketAisleById(id) {
  return MARKET_SHEET_AISLES.find((a) => a.id === id) || MARKET_SHEET_AISLES[0];
}

function skuBuyRow(s) {
  return `
    <article class="sku-buy">
      <div class="sku-buy-copy">
        <strong class="sku-buy-name">${esc(s.label)}</strong>
        <span class="sku-buy-price">${money(s.paperPrice)}</span>
      </div>
      <button type="button" class="go" data-order="${esc(s.id)}">Buy</button>
    </article>`;
}

function goodRow(id, prices) {
  const px = Number(prices[id]);
  const label = String(id).replace(/_/g, " ");
  const cost = Number.isFinite(px) ? money(px) : "—";
  return `<div class="inv-row"><span>${esc(label)} · ${cost}</span><button type="button" class="go" data-buy="${esc(id)}">Buy 1</button></div>`;
}

function filterSkus(rows, q) {
  return rows.filter((s) => matches(q, s.label, s.id, s.note, s.aisleLabel));
}

function streetBody(play, q) {
  const catalog = play.catalog || [];
  const kits = filterSkus(
    catalog.filter((s) => s.aisle === "street_carts" || s.role === "kit"),
    q,
  );
  const stock = filterSkus(
    catalog.filter((s) => s.aisle === "stock" || s.role === "stock"),
    q,
  );
  const prices = play.lastPricesSouth || {};
  const goods = (play.goods || Object.keys(prices)).filter((id) =>
    matches(q, id, String(id).replace(/_/g, " "), "south", "island"),
  );
  const bits = [];
  if (kits.length) {
    bits.push(`<h3 class="sheet-kicker">Carts</h3>${kits.map(skuBuyRow).join("")}`);
  }
  if (stock.length) {
    bits.push(`<h3 class="sheet-kicker">Stock</h3>${stock.map(skuBuyRow).join("")}`);
  }
  if (goods.length && !needle(q)) {
    bits.push(
      `<h3 class="sheet-kicker">South island goods</h3>${goods.map((id) => goodRow(id, prices)).join("")}`,
    );
  } else if (goods.length && needle(q)) {
    bits.push(
      `<h3 class="sheet-kicker">South island goods</h3>${goods.map((id) => goodRow(id, prices)).join("")}`,
    );
  }
  if (!bits.length) {
    return `<p class="mp-empty">Nothing on Street matches that search.</p>`;
  }
  return bits.join("");
}

function soonBody(aisle, q) {
  if (needle(q) && !matches(q, aisle.label, aisle.soon, aisle.id)) {
    return `<p class="mp-empty">Nothing in ${esc(aisle.label)} matches that search.</p>`;
  }
  return `
    <div class="mp-soon">
      <p class="mp-soon-lead">${esc(aisle.label)} is not for sale yet.</p>
      <p>${esc(aisle.soon)}</p>
    </div>`;
}

function northBody() {
  return `
    <div class="mp-soon">
      <p class="mp-soon-lead">You buy on the island you stand on.</p>
      <p>North is closed until you ferry — and there is nothing to buy there yet.</p>
    </div>`;
}

export function formatMarketplace(play, opts = {}) {
  const aisle = marketAisleById(opts.aisle);
  const island = opts.island === "north" ? "north" : "south";
  const query = opts.query || "";
  const aisles = MARKET_SHEET_AISLES.map(
    (a) => `
      <button type="button" class="mp-aisle${a.id === aisle.id ? " is-on" : ""}" data-aisle="${a.id}" ${
        a.live ? "" : 'data-soon="1"'
      }>${esc(a.label)}</button>`,
  ).join("");
  let list = "";
  if (island === "north") list = northBody();
  else if (aisle.live) list = streetBody(play || {}, query);
  else list = soonBody(aisle, query);
  return `
    <header class="mp-head">
      <h2 class="mp-word">2Isles Marketplace</h2>
      <button type="button" class="sheet-close" data-sheet-close aria-label="Close">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
    </header>
    <div class="mp-tools">
      <label class="mp-search-wrap">
        <span class="visually-hidden">Search the marketplace</span>
        <input id="market-search" class="mp-search" type="search" placeholder="Search carts, stock, aisles" value="${esc(query)}" autocomplete="off" enterkeyhint="search" />
      </label>
      <div class="isle-stack">
        <button type="button" class="isle is-on" data-island="south">South · you are here</button>
        <p class="isle-shut">North is closed until you ferry.</p>
      </div>
    </div>
    <div class="mp-aisles" role="tablist" aria-label="Aisle">${aisles}</div>
    <div class="mp-scroll">${list}</div>
  `;
}
