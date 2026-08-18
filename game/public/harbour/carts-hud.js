/**
 * Left-rail Carts submenu. First loop: buy → place → hire → stock → sticker → fridge.
 * Pack is a client-side shift bonus. PAPER / SIMULATED.
 */

function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "$0.00";
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function kindLabel(kind) {
  return kind === "hotdog_cart" ? "Street cart" : "Stock";
}

function plotNameFor(play, stand) {
  const lease = ((play && play.leases) || []).find((l) => l.id === stand.plotId);
  return (lease && lease.name) || "your lot";
}

function ticksHtml(have, cap) {
  const tickN = 20;
  const filled = Math.round((have / Math.max(cap, 1)) * tickN);
  const ticks = Array.from(
    { length: tickN },
    (_, i) => `<i class="${i < filled ? "on" : ""}"></i>`,
  ).join("");
  return `<div class="stock-ticks" title="Stock">${ticks}</div><p class="stock-read">${have}<small>/${cap}</small></p>`;
}

export function formatCartsBody(play) {
  if (!play) return "<p>Loading carts · PAPER</p>";
  const today = Number(play.todayPrice != null ? play.todayPrice : 5);
  const needs = Array.isArray(play.cartNeeds) ? play.cartNeeds : [];
  const rows = play.inventory || [];
  const cart = (play.cart || []).filter((r) => r && r.goodId && Number(r.qty) > 0);
  const stands = play.stands || [];
  const roster = play.hireRoster || [];
  const wh = play.warehouse || { items: [] };
  const whCart = (wh.items || []).some((r) => r.kind === "hotdog_cart" && r.qty > 0);
  const canPlace = rows.some((r) => r.kind === "hotdog_cart") || whCart;
  const invQty = rows.find((r) => r.kind === "hotdogs")?.qty || 0;
  const whQty = (wh.items || []).find((r) => r.kind === "hotdogs")?.qty || 0;

  const needsHtml = needs.length
    ? needs.map((n) => `<p class="cart-need">${n.label}</p>`).join("")
    : `<p class="cart-need is-ok">Staffed, stocked, sticker at today. PAPER.</p>`;

  const kitHtml = rows.length
    ? rows
        .map(
          (r) => `
        <div class="inv-row">
          <span>${kindLabel(r.kind)} × ${r.qty}</span>
          ${r.kind === "hotdog_cart" ? `<button type="button" data-place="1">Place</button>` : ""}
        </div>`,
        )
        .join("")
    : "<p>No kit in pockets.</p>";

  const goodsHtml = cart.length
    ? cart
        .map(
          (r) =>
            `<div class="inv-row"><span>${String(r.goodId).replace("_", " ")} × ${r.qty}</span><span>PAPER</span></div>`,
        )
        .join("")
    : "";

  const placeRow =
    !rows.some((r) => r.kind === "hotdog_cart") && canPlace
      ? `<div class="inv-row"><span>Cart in warehouse</span><button type="button" data-place="1">Place</button></div>`
      : "";

  const standsHtml = stands.length
    ? stands
        .map((s) => {
          const where = plotNameFor(play, s);
          const have = Number(s.hotdogs) || 0;
          const cap = Number(s.storageCap || 20);
          const room = Math.max(0, cap - have);
          const sticker = Number(s.stickerPrice != null ? s.stickerPrice : today);
          const standNeeds = Array.isArray(s.needs) ? s.needs : [];
          const maxFromInv = Math.min(invQty, room);
          const maxFromWh = Math.min(whQty, room);
          return `
          <article class="cart-stand" data-stand="${s.id}">
            <h3 class="sheet-kicker">${where}</h3>
            ${standNeeds.map((n) => `<p class="cart-need">${n.label}</p>`).join("")}
            ${ticksHtml(have, cap)}
            <div class="source-row">
              <button type="button" class="source src-pocket" data-stock="inventory" data-stand="${s.id}" ${maxFromInv ? "" : "disabled"}>
                <strong>${invQty}</strong><span>Pockets</span>
              </button>
              <button type="button" class="source src-wh" data-stock="warehouse" data-stand="${s.id}" ${maxFromWh ? "" : "disabled"}>
                <strong>${whQty}</strong><span>Warehouse</span>
              </button>
            </div>
            <p class="sticker-label">Sticker</p>
            <div class="sticker-row">
              <input type="number" min="1" max="12" step="0.5" value="${sticker}" data-sticker="${s.id}" />
              <span class="today-price">${money(today)} is today's price</span>
            </div>
            ${
              s.hired
                ? `<p class="hired-pill">${s.staffName || "Vendor"} on</p>`
                : `<div class="hire-row">${roster
                    .map(
                      (p) =>
                        `<button type="button" class="hire-chip" data-hire-stand="${s.id}" data-hire-person="${p.id}">${p.name}</button>`,
                    )
                    .join("")}</div>
                   <p class="whisper">${(roster[0] && roster[0].suggest) || "Hire someone. Carts do not sell without staff."}</p>`
            }
            ${
              s.hired && !s.upgraded
                ? `<button type="button" class="go fridge" data-upgrade="${s.id}">Fridge · $200</button>`
                : ""
            }
            <div class="inv-row">
              <span>Pack shift · PAPER bonus</span>
              <button type="button" class="go" data-pack-start="1">Pack</button>
            </div>
          </article>`;
        })
        .join("")
    : `<p>Place a cart, then hire, stock, and set a sticker. ${money(today)} is today's price.</p>
       <div class="inv-row">
         <span>Pack shift · PAPER bonus</span>
         <button type="button" class="go" data-pack-start="1">Pack</button>
       </div>`;

  return `
    <h2>Carts</h2>
    <p class="menu-note">PAPER · SIMULATED. Hire, stock, sticker, fridge. Carts do not sell without staff.</p>
    ${needsHtml}
    <h3 class="sheet-kicker">Kit</h3>
    ${kitHtml}
    ${placeRow}
    ${goodsHtml ? `<h3 class="sheet-kicker">Goods cart</h3>${goodsHtml}` : ""}
    <h3 class="sheet-kicker">On the kerb</h3>
    ${standsHtml}
  `;
}
