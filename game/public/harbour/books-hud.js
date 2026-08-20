/**
 * Left-rail business books. Compact directory beside the rail;
 * expand into the same sheet-center chrome as Marketplace.
 * Numbers come from play.books (sim). PAPER / SIMULATED.
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

function idx(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function catalogRow(play, kind) {
  return ((play && play.catalog) || []).find((s) => s.id === kind);
}

function isKit(play, kind) {
  const row = catalogRow(play, kind);
  if (row) return row.aisle === "street_carts" || row.role === "kit";
  return String(kind).endsWith("_cart") || kind === "hotdog_cart";
}

function kindLabel(play, kind) {
  const row = catalogRow(play, kind);
  if (row) return row.label;
  if (isKit(play, kind)) return "Street cart";
  return "Stock";
}

function kitQty(rows, kind) {
  return Number((rows || []).find((r) => r.kind === kind)?.qty || 0);
}

function booksOf(play) {
  return (play && play.books) || {};
}

function trendWord(row) {
  if (!row) return "at today";
  if (row.priceTrend === "up") return "sticker above today";
  if (row.priceTrend === "down") return "sticker below today";
  return "sticker at today";
}

function staffLine(row) {
  if (row && row.hired) return row.staffName || "Vendor";
  if (row && row.attending) return "You · on the stall";
  return "No staff — hire on the cart";
}

function closeSvg() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>`;
}

function kitRows(play, expanded) {
  const catalog = play.catalog || [];
  const kitIds = catalog.filter((s) => s.aisle === "street_carts" || s.role === "kit").map((s) => s.id);
  const kinds = kitIds.length ? kitIds : ["hotdog_cart"];
  const rows = play.inventory || [];
  const wh = ((play.warehouse || {}).items) || [];
  const pocket = kinds
    .map((id) => {
      const qty = kitQty(rows, id);
      if (qty < 1) return "";
      return `
        <div class="inv-row">
          <span>${esc(kindLabel(play, id))} on you × ${qty}</span>
          <button type="button" class="go" data-place="${esc(id)}">Place</button>
        </div>`;
    })
    .join("");
  const stored = kinds
    .map((id) => {
      const qty = kitQty(wh, id);
      if (qty < 1) return "";
      return `
        <div class="inv-row">
          <span>${esc(kindLabel(play, id))} in warehouse × ${qty}</span>
          <button type="button" data-withdraw="${esc(id)}">Bring to me</button>
        </div>`;
    })
    .join("");
  if (pocket || stored) return `${pocket}${stored}`;
  if (expanded) return "<p>No kit on the books. Buy in Marketplace, Bring to me, then Place.</p>";
  return "<p>No cart kit yet. Buy one in Market.</p>";
}

function siteRailCard(row) {
  return `
    <article class="cart-stand" data-stand="${esc(row.standId)}">
      <h3 class="sheet-kicker">${esc(row.label)}</h3>
      <p class="whisper">${esc(row.lotName || "your lot")} · ${money(row.perMinute)}/min</p>
      <div class="inv-row">
        <span>${esc(staffLine(row))}</span>
        <button type="button" class="go" data-open-stand="${esc(row.standId)}">Open</button>
      </div>
    </article>`;
}

function siteSheetCard(row) {
  const going =
    row.priceTrend === "up" ? "above" : row.priceTrend === "down" ? "below" : "at";
  return `
    <article class="books-site">
      <header class="books-site-head">
        <div>
          <h3 class="sheet-kicker">${esc(row.label)}</h3>
          <p class="whisper">${esc(row.lotName || "your lot")}${row.plotClass === "cart_pad" ? " · pad" : ""}</p>
        </div>
        <button type="button" class="go" data-open-stand="${esc(row.standId)}">Open cart</button>
      </header>
      <div class="stand-row"><span>Trading</span><strong>${money(row.sticker)} sticker · today ${money(row.todayPrice)}</strong></div>
      <div class="stand-row"><span>Where it's going</span><strong>${esc(going)} today · ${esc(row.stickerBand)}</strong></div>
      <div class="stand-row"><span>Worth (kit + upgrades + stock)</span><strong>${money(row.worthPaper)}</strong></div>
      <div class="stand-row"><span>People</span><strong>${esc(staffLine(row))}</strong></div>
      <div class="stand-row"><span>COGS est.</span><strong>${money(row.cogsEst)} / sale</strong></div>
      <div class="stand-row"><span>COGS sold</span><strong>${money(row.cogsSold)} · ${row.unitsSold} sold</strong></div>
      <div class="stand-row"><span>Net / sale after ${Math.round(row.taxRate * 100)}% tax</span><strong>${money(row.netPerSale)}</strong></div>
      <div class="stand-row"><span>Now</span><strong>${money(row.perMinute)}/min</strong></div>
      <div class="stand-row"><span>Proj. hour</span><strong>${money(row.projHour)}</strong></div>
      <div class="stand-row"><span>Proj. day (sim)</span><strong>${money(row.projDay)}</strong></div>
      <p class="whisper">${esc(trendWord(row))}. Projections use this cart's live $/min, not a forecast model.</p>
    </article>`;
}

function islandTape(play) {
  const listings = booksOf(play).listings || [];
  if (!listings.length) {
    return `<p class="whisper">Island listings print on the 5-minute PAPER auction. Not live.</p>`;
  }
  return listings
    .map((row) => {
      const chg = Number(row.chg) || 0;
      const tone = chg > 0.0005 ? "is-up" : chg < -0.0005 ? "is-down" : "is-flat";
      const sign = chg > 0 ? "+" : "";
      return `
        <div class="stand-row books-tape ${tone}">
          <span>${esc(row.name)}</span>
          <strong>${money(row.last)} <em>${sign}${money(chg)}</em></strong>
        </div>`;
    })
    .join("");
}

function islandIndex(play) {
  const b = booksOf(play);
  return `
    <div class="stand-row"><span>Price index</span><strong>${idx(b.priceIndex)}</strong></div>
    <div class="stand-row"><span>North / South</span><strong>${idx(b.priceIndexNorth)} / ${idx(b.priceIndexSouth)}</strong></div>
    <div class="stand-row"><span>Land ask index</span><strong>${idx(b.landPriceIndex)}</strong></div>
    <div class="stand-row"><span>Ferry spread</span><strong>${idx(b.ferrySpread)}</strong></div>
    <div class="stand-row"><span>NPC money supply</span><strong>${b.moneySupply == null ? "—" : money(b.moneySupply)}</strong></div>
    <div class="stand-row"><span>Goods out (window)</span><strong>${b.goodsProducedWindow == null ? "—" : idx(b.goodsProducedWindow)}</strong></div>
    <p class="whisper">Same three HUD numbers as PLAN §3.4, plus land-ask inflation. PAPER · SIMULATED.</p>`;
}

export function formatBooksRail(play) {
  if (!play) return "<p>Loading books · PAPER</p>";
  const today = Number(play.todayPrice != null ? play.todayPrice : 5);
  const needs = Array.isArray(play.cartNeeds) ? play.cartNeeds : [];
  const books = booksOf(play);
  const sites = books.sites || [];
  const stands = play.stands || [];
  const rows = sites.length ? sites : stands.map((s) => ({
    standId: s.id,
    label: s.label || "Street cart",
    lotName: s.lotName,
    perMinute: s.perMinute || 0,
    hired: s.hired,
    staffName: s.staffName,
    attending: s.attending,
  }));

  const needsHtml = needs.length
    ? needs.map((n) => `<p class="cart-need">${esc(n.label)}</p>`).join("")
    : rows.length
      ? `<p class="cart-need is-ok">On the kerb. Open a cart to stock, hire, or upgrade.</p>`
      : "";

  const standsHtml = rows.length
    ? rows.map(siteRailCard).join("")
    : `<p>Place a cart on your pad or YOURS lot. Hold R to rotate. ${money(today)} is today's fruit price.</p>`;

  return `
    <h2>Books</h2>
    <p class="menu-note">PAPER · SIMULATED. Business terminal. Place only from kits on you.</p>
    ${needsHtml}
    <div class="inv-row">
      <span>Island books</span>
      <button type="button" class="go" data-books-expand="1">Open books</button>
    </div>
    <h3 class="sheet-kicker">To place</h3>
    ${kitRows(play, false)}
    <h3 class="sheet-kicker">On the kerb</h3>
    ${standsHtml}
  `;
}

export function formatBooksSheet(play) {
  if (!play) return "<p>Loading books · PAPER</p>";
  const books = booksOf(play);
  const sites = books.sites || [];
  const cash = money(play.cash);
  const sitesHtml = sites.length
    ? sites.map(siteSheetCard).join("")
    : `<p>No site on the books yet. Warehouse → Bring to me → Place on a pad.</p>`;
  return `
    <header class="mp-head">
      <h2 class="mp-word">Books</h2>
      <div class="mp-head-actions">
        <p class="mp-cash" aria-label="Cash">${cash}</p>
        <button type="button" class="ghost" data-books-expand="0">Dock</button>
        <button type="button" class="sheet-close" data-sheet-close aria-label="Close">${closeSvg()}</button>
      </div>
    </header>
    <div class="books-sheet">
      <p class="menu-note">PAPER · SIMULATED. Cart P&amp;L from this shard. Island tape is the 5-minute call auction, not a wallet.</p>
      <h3 class="sheet-kicker">Your sites</h3>
      ${sitesHtml}
      <h3 class="sheet-kicker">Kits</h3>
      ${kitRows(play, true)}
      <h3 class="sheet-kicker">Island listings</h3>
      ${islandTape(play)}
      <h3 class="sheet-kicker">Inflation</h3>
      ${islandIndex(play)}
    </div>
  `;
}

/** Compact rail, or the expanded sheet. */
export function formatBooksBody(play, expanded) {
  return expanded ? formatBooksSheet(play) : formatBooksRail(play);
}

/** @deprecated Use formatBooksBody. Kept so old tests fail loudly if they still import carts. */
export function formatCartsBody(play) {
  return formatBooksRail(play);
}
