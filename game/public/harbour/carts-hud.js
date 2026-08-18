/**
 * Left-rail Carts directory. Place kits here. Hire, train, stock, sticker,
 * and fridge live on that cart's own click menu.
 */

function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "$0.00";
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

function plotNameFor(play, stand) {
  const lease = ((play && play.leases) || []).find((l) => l.id === stand.plotId);
  return (lease && lease.name) || "your lot";
}

function kitQty(rows, kind) {
  return Number((rows || []).find((r) => r.kind === kind)?.qty) || 0;
}

export function formatCartsBody(play) {
  if (!play) return "<p>Loading carts · PAPER</p>";
  const today = Number(play.todayPrice != null ? play.todayPrice : 5);
  const needs = Array.isArray(play.cartNeeds) ? play.cartNeeds : [];
  const rows = play.inventory || [];
  const stands = play.stands || [];
  const catalog = play.catalog || [];
  const wh = play.warehouse || { items: [] };
  const kitIds = catalog.filter((s) => s.aisle === "street_carts" || s.role === "kit").map((s) => s.id);
  const kinds = kitIds.length ? kitIds : ["hotdog_cart"];

  const needsHtml = needs.length
    ? needs.map((n) => `<p class="cart-need">${n.label}</p>`).join("")
    : stands.length
      ? `<p class="cart-need is-ok">Staffed, stocked, sticker at today. PAPER.</p>`
      : "";

  const pocketKits = kinds
    .map((id) => {
      const qty = kitQty(rows, id);
      if (qty < 1) return "";
      return `
        <div class="inv-row">
          <span>${kindLabel(play, id)} × ${qty}</span>
          <button type="button" data-place="${id}">Place</button>
        </div>`;
    })
    .join("");

  const stockRows = rows.filter((r) => !isKit(play, r.kind) && r.qty > 0);
  const stockHtml = stockRows.length
    ? stockRows
        .map(
          (r) =>
            `<div class="inv-row"><span>${kindLabel(play, r.kind)} × ${r.qty}</span><span>pockets</span></div>`,
        )
        .join("")
    : "";

  const whKits = kinds
    .map((id) => {
      const qty = kitQty(wh.items, id);
      if (qty < 1) return "";
      const inPockets = kitQty(rows, id) > 0;
      return `
        <div class="inv-row">
          <span>${kindLabel(play, id)} in warehouse × ${qty}</span>
          ${inPockets ? "" : `<button type="button" data-place="${id}">Place</button>`}
        </div>`;
    })
    .join("");

  const kitHtml = pocketKits || whKits ? `${pocketKits}${whKits}` : "<p>No cart kit yet. Buy one in Market.</p>";

  const standsHtml = stands.length
    ? stands
        .map((s) => {
          const where = plotNameFor(play, s);
          const name = s.label || "Street cart";
          const standNeeds = Array.isArray(s.needs) ? s.needs : [];
          return `
          <article class="cart-stand" data-stand="${s.id}">
            <h3 class="sheet-kicker">${name}</h3>
            <p class="whisper">${where}</p>
            ${standNeeds.map((n) => `<p class="cart-need">${n.label}</p>`).join("")}
            <div class="inv-row">
              <span>This cart's menu</span>
              <button type="button" class="go" data-open-stand="${s.id}">Open</button>
            </div>
          </article>`;
        })
        .join("")
    : `<p>Place a cart on your YOURS lot or the verge, then tap that cart. Hire, train, stock, sticker, and fridge live there. ${money(today)} is today's price.</p>`;

  return `
    <h2>Carts</h2>
    <p class="menu-note">PAPER · SIMULATED. Directory only. Each placed cart has its own menu.</p>
    ${needsHtml}
    <h3 class="sheet-kicker">Kit</h3>
    ${kitHtml}
    ${stockHtml ? `<h3 class="sheet-kicker">Pockets</h3>${stockHtml}` : ""}
    <h3 class="sheet-kicker">On the kerb</h3>
    ${standsHtml}
  `;
}
