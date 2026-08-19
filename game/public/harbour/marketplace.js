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
    label: "Shopfit",
    live: false,
    soon: "Shelves, till, fridge, counter, backstock — when you own a shop. A stocker fills shelves the same way a truck fills a pile.",
  },
  {
    id: "farming",
    label: "Farming",
    live: false,
    soon: "Orchard and field kit — when a farm lot exists. Pick, crate, shed, truck. Same jobs as a shop.",
  },
  {
    id: "hospitality",
    label: "Hospitality",
    live: false,
    soon: "Beds, kitchen, lobby, rooms — when you own a house or hotel. Kit that sits inside, not a second map.",
  },
  {
    id: "machinery",
    label: "Machinery",
    live: false,
    soon: "Static excavator, crushers, belts — when a quarry lot exists. About twenty SKUs for the whole chain, not a yard of random lumber.",
  },
];

export function marketAisleById(id) {
  const raw = id === "plant" ? "machinery" : id;
  return MARKET_SHEET_AISLES.find((a) => a.id === raw) || MARKET_SHEET_AISLES[0];
}

function shortDesc(s) {
  const note = String((s && s.note) || "")
    .replace(/First-loop stock, not a book good\.?/gi, "")
    .trim();
  if (note) {
    const first = note.split(/(?<=\.)\s/)[0] || note;
    return first.length > 64 ? first.slice(0, 62) + "…" : first;
  }
  if (s && (s.role === "kit" || s.aisle === "street_carts")) return "Place on a pad.";
  if (s && (s.role === "stock" || s.aisle === "stock")) return "Load after the cart is on the kerb.";
  return "South island good.";
}

function skuBuyRow(s) {
  return `
    <article class="sku-buy">
      <div class="sku-buy-copy">
        <strong class="sku-buy-name">${esc(s.label)}</strong>
        <span class="sku-buy-blurb">${esc(shortDesc(s))}</span>
        <span class="sku-buy-price">${money(s.paperPrice)}</span>
      </div>
      <div class="sku-buy-actions">
        <button type="button" class="go" data-order="${esc(s.id)}">Buy</button>
        <button type="button" class="ghost" data-add-cart="${esc(s.id)}" data-via="order">Add</button>
      </div>
    </article>`;
}

function goodRow(id, prices) {
  const px = Number(prices[id]);
  const label = String(id).replace(/_/g, " ");
  const cost = Number.isFinite(px) ? money(px) : "—";
  return `
    <article class="sku-buy">
      <div class="sku-buy-copy">
        <strong class="sku-buy-name">${esc(label)}</strong>
        <span class="sku-buy-blurb">One unit. South last price.</span>
        <span class="sku-buy-price">${cost}</span>
      </div>
      <div class="sku-buy-actions">
        <button type="button" class="go" data-buy="${esc(id)}">Buy</button>
        <button type="button" class="ghost" data-add-cart="${esc(id)}" data-via="good">Add</button>
      </div>
    </article>`;
}

function filterSkus(rows, q) {
  return rows.filter((s) => matches(q, s.label, s.id, s.note, s.aisleLabel));
}

function foldOpen(folds, id, force) {
  if (force) return true;
  return Boolean(folds && folds[id]);
}

function foldBlock(id, title, inner, open) {
  if (!inner) return "";
  return `
    <details class="mp-fold" data-fold="${esc(id)}"${open ? " open" : ""}>
      <summary>${esc(title)}</summary>
      ${inner}
    </details>`;
}

function streetBody(play, q, folds) {
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
  const searching = Boolean(needle(q));
  const bits = [];
  if (kits.length) {
    bits.push(foldBlock("carts", "Carts", kits.map(skuBuyRow).join(""), foldOpen(folds, "carts", searching)));
  }
  if (stock.length) {
    bits.push(foldBlock("stock", "Stock", stock.map(skuBuyRow).join(""), foldOpen(folds, "stock", searching)));
  }
  if (goods.length) {
    bits.push(
      foldBlock(
        "goods",
        "South island goods",
        goods.map((id) => goodRow(id, prices)).join(""),
        foldOpen(folds, "goods", searching),
      ),
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
      <p>North island is closed until you ferry — and there is nothing to buy there yet.</p>
    </div>`;
}

export function basketCount(lines) {
  return (lines || []).reduce((n, row) => n + Math.max(0, Number(row.qty) || 0), 0);
}

export function addBasketLine(lines, sku, via) {
  const next = Array.isArray(lines) ? lines.map((r) => ({ ...r })) : [];
  const hit = next.find((r) => r.sku === sku && r.via === via);
  if (hit) hit.qty = Math.min(10, (Number(hit.qty) || 0) + 1);
  else next.push({ sku, via: via === "good" ? "good" : "order", qty: 1 });
  return next;
}

export function removeBasketLine(lines, sku, via) {
  return (lines || []).filter((r) => !(r.sku === sku && r.via === via));
}

function linePrice(play, row) {
  if (row.via === "good") {
    const px = Number((play.lastPricesSouth || {})[row.sku]);
    return Number.isFinite(px) ? px : 0;
  }
  const cat = ((play && play.catalog) || []).find((s) => s.id === row.sku);
  return cat ? Number(cat.paperPrice) || 0 : 0;
}

function lineLabel(play, row) {
  if (row.via === "good") return String(row.sku).replace(/_/g, " ");
  const cat = ((play && play.catalog) || []).find((s) => s.id === row.sku);
  return (cat && cat.label) || row.sku;
}

export function basketTotal(play, lines) {
  return (lines || []).reduce((n, row) => n + linePrice(play, row) * Math.max(0, Number(row.qty) || 0), 0);
}

function basketBody(play, lines) {
  if (!lines || !lines.length) {
    return `<p class="mp-empty">Nothing in the cart. Open Carts or Stock, then Add.</p>`;
  }
  const rows = lines
    .map((row) => {
      const qty = Math.max(1, Number(row.qty) || 1);
      const unit = linePrice(play, row);
      return `
        <article class="sku-buy">
          <div class="sku-buy-copy">
            <strong class="sku-buy-name">${esc(lineLabel(play, row))} × ${qty}</strong>
            <span class="sku-buy-price">${money(unit * qty)}</span>
          </div>
          <div class="sku-buy-actions">
            <button type="button" class="go" data-basket-buy="${esc(row.sku)}" data-via="${esc(row.via)}">Buy</button>
            <button type="button" class="ghost" data-basket-remove="${esc(row.sku)}" data-via="${esc(row.via)}">Remove</button>
          </div>
        </article>`;
    })
    .join("");
  return `
    ${rows}
    <div class="mp-basket-pay">
      <p class="mp-basket-sum">Cart ${money(basketTotal(play, lines))}</p>
      <button type="button" class="go" data-basket-pay>Buy cart</button>
    </div>`;
}

function head(play, opts) {
  const cash = money(opts.cash != null ? opts.cash : play && play.cash);
  const n = basketCount(opts.basket);
  const cartOn = opts.view === "basket" ? " is-on" : "";
  return `
    <header class="mp-head">
      <h2 class="mp-word">2Isles Marketplace</h2>
      <div class="mp-head-actions">
        <p class="mp-cash" aria-label="Cash">${cash}</p>
        <button type="button" class="mp-cart-btn${cartOn}" data-market-cart aria-label="Marketplace cart"${
          n ? ` data-count="${n}"` : ""
        }>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8h10l1.2 12H5.8L7 8z"/><path d="M9 8V6.4a3 3 0 0 1 6 0V8"/></svg>
          ${n ? `<span class="mp-cart-n">${n}</span>` : ""}
        </button>
        <button type="button" class="sheet-close" data-sheet-close aria-label="Close">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </div>
    </header>`;
}

export function formatMarketplace(play, opts = {}) {
  const aisle = marketAisleById(opts.aisle);
  const island = opts.island === "north" ? "north" : "south";
  const query = opts.query || "";
  const view = opts.view === "basket" ? "basket" : "shop";
  const aisles = MARKET_SHEET_AISLES.map(
    (a) => `
      <button type="button" class="mp-aisle${a.id === aisle.id ? " is-on" : ""}" data-aisle="${a.id}">${esc(a.label)}</button>`,
  ).join("");
  let list = "";
  if (view === "basket") list = basketBody(play || {}, opts.basket || []);
  else if (island === "north") list = northBody();
  else if (aisle.live) list = streetBody(play || {}, query, opts.folds || {});
  else list = soonBody(aisle, query);
  return `
    ${head(play || {}, opts)}
    <div class="mp-tools">
      <label class="mp-search-wrap">
        <span class="visually-hidden">Search the marketplace</span>
        <input id="market-search" class="mp-search" type="search" placeholder="Search carts, stock, aisles" value="${esc(query)}" autocomplete="off" enterkeyhint="search" />
      </label>
      <div class="isle-row" role="group" aria-label="Island">
        <button type="button" class="isle is-on" data-island="south">South island</button>
        <p class="isle-shut">North island</p>
      </div>
    </div>
    <div class="mp-aisles" role="tablist" aria-label="Aisle">${aisles}</div>
    <div class="mp-scroll">${list}</div>
  `;
}
