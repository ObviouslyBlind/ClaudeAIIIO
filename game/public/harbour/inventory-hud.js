/**
 * Left-rail Inventory: what is on you. Warehouse is the other stash.
 * Place kits from here. PAPER / SIMULATED.
 */

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
  return String(kind || "").replace(/_/g, " ");
}

function rowHtml(play, r) {
  const kit = isKit(play, r.kind);
  return `
    <div class="inv-row">
      <span>${kindLabel(play, r.kind)} × ${r.qty}</span>
      ${kit ? `<button type="button" class="go" data-place="${r.kind}">Place</button>` : `<span>on you</span>`}
    </div>`;
}

export function formatInventoryBody(play) {
  if (!play) return "<p>Loading inventory · PAPER</p>";
  const rows = (play.inventory || []).filter((r) => (Number(r.qty) || 0) > 0);
  const kits = rows.filter((r) => isKit(play, r.kind));
  const stock = rows.filter((r) => !isKit(play, r.kind));
  const empty = !kits.length && !stock.length;
  return `
    <h2>Inventory</h2>
    <p class="menu-note">PAPER · SIMULATED. On you. Warehouse is the dock stash.</p>
    ${
      empty
        ? "<p>Nothing on you. Marketplace Buy, then Bring to me — or Take all from a kerb crate.</p>"
        : `${kits.map((r) => rowHtml(play, r)).join("")}${stock.map((r) => rowHtml(play, r)).join("")}`
    }
  `;
}
