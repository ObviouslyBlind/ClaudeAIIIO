/**
 * PAPER bid/ask strip on the market board only.
 * POST /api/order. SIMULATED. No wallet. Mixed or missing cash is rejected.
 */

const FALLBACK_GOODS = [
  "corn",
  "potato",
  "lettuce",
  "beans",
  "ore",
  "lumber",
  "planks",
  "nails",
  "iron_bars",
  "tools",
  "concrete",
  "fuel",
];

const root = document.getElementById("order-strip");
let goodsReady = false;

function money(n) {
  return Number(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function labelGood(g) {
  return String(g).replace(/_/g, " ");
}

function cap(s) {
  return String(s).charAt(0).toUpperCase() + String(s).slice(1);
}

function reasonCopy(reason) {
  if (reason === "no_cash") {
    return "No paper cash. Bids do not sell inventory to raise funds. PAPER · SIMULATED.";
  }
  if (reason === "mixed_cash") {
    return "Mixed cash is rejected. PAPER · SIMULATED.";
  }
  if (reason === "no_stock") {
    return "No paper stock to ask. PAPER · SIMULATED.";
  }
  if (reason) return "Could not place: " + reason + " (PAPER).";
  return "";
}

function goodsOf(data) {
  return data && Array.isArray(data.goods) && data.goods.length ? data.goods : FALLBACK_GOODS;
}

function fillGoods(data) {
  const sel = root.querySelector('[name="good"]');
  if (!sel || goodsReady) return;
  const current = sel.value;
  sel.innerHTML = goodsOf(data)
    .map((g) => `<option value="${g}">${labelGood(g)}</option>`)
    .join("");
  if (current) sel.value = current;
  goodsReady = true;
}

function paintOrders(data) {
  const list = root.querySelector("#open-orders");
  if (!list) return;
  const orders = data && Array.isArray(data.visitorOrders) ? data.visitorOrders : [];
  if (!orders.length) {
    list.innerHTML = `<p class="stall-note">No open PAPER orders.</p>`;
    return;
  }
  list.innerHTML = orders
    .map((row) => {
      return `<div class="row" data-order-id="${row.id}">
        <div>
          <div class="name">${cap(row.side)} ${labelGood(row.goodId)}</div>
          <div class="px">$${money(row.price)} × ${row.qty}</div>
          <div class="cmp">${cap(row.island)} · ${row.mode || "PAPER"} · ${row.provenance || "SIMULATED"}</div>
        </div>
        <button type="button" data-paper-cancel data-order-id="${row.id}" title="PAPER · SIMULATED · no wallet">Cancel PAPER</button>
      </div>`;
    })
    .join("");
}

function setNotice(text) {
  const el = root.querySelector("#order-err");
  if (el) el.textContent = text || "";
}

function applySnapshot(data) {
  fillGoods(data);
  paintOrders(data);
}

async function place(side) {
  const island = root.querySelector('[name="island"]');
  const good = root.querySelector('[name="good"]');
  const price = root.querySelector('[name="price"]');
  const qty = root.querySelector('[name="qty"]');
  const res = await fetch("/api/order", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      side,
      island: island ? island.value : "north",
      goodId: good ? good.value : "corn",
      price: Number(price && price.value),
      qty: Number(qty && qty.value),
    }),
  });
  const body = await res.json();
  setNotice(
    body.ok
      ? body.order && body.order.qty > 1e-9
        ? "Resting PAPER order."
        : "Filled PAPER · SIMULATED."
      : reasonCopy(body.reason),
  );
  applySnapshot(body.snapshot);
}

async function refresh() {
  const res = await fetch("/api/snapshot");
  applySnapshot(await res.json());
}

if (root) {
  const css = document.createElement("style");
  css.textContent = `
    #order-strip { margin-top: 16px; }
    #order-strip form {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin: 0 0 8px;
    }
    #order-strip label {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
    }
    #order-strip select,
    #order-strip input {
      min-height: 44px;
      border: 0;
      border-radius: var(--radius);
      background: var(--panel);
      color: var(--ink);
      font-size: 16px;
      padding: 0 10px;
      font-variant-numeric: tabular-nums;
    }
    #order-strip .order-actions {
      grid-column: 1 / -1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    #order-strip .order-actions button {
      min-height: 44px;
      border: 0;
      border-radius: var(--radius);
      background: var(--accent);
      color: #1a140c;
      font-weight: 700;
      font-size: 15px;
    }
    #order-strip .order-actions button:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
  `;
  document.head.appendChild(css);

  root.innerHTML = `
    <p class="badge">PAPER · SIMULATED · no wallet</p>
    <p class="stall-note">
      Limit bid or ask vs the island book. Bids escrow paper cash. Mixed or missing cash
      is rejected — this does not sell inventory to raise funds. Asks escrow paper stock.
      Not a live exchange.
    </p>
    <form id="paper-order-form">
      <label>Island
        <select name="island">
          <option value="north" selected>North</option>
          <option value="south">South</option>
        </select>
      </label>
      <label>Good
        <select name="good">${FALLBACK_GOODS.map((g) => `<option value="${g}">${labelGood(g)}</option>`).join("")}</select>
      </label>
      <label>Price
        <input name="price" type="number" min="0.01" step="0.01" required />
      </label>
      <label>Qty
        <input name="qty" type="number" min="0.01" step="0.01" required value="1" />
      </label>
      <div class="order-actions">
        <button type="submit" name="side" value="bid">Bid</button>
        <button type="submit" name="side" value="ask">Ask</button>
      </div>
    </form>
    <p class="err" id="order-err"></p>
    <div id="open-orders"></div>
  `;

  root.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const btn = ev.submitter;
    place(btn && btn.value === "ask" ? "ask" : "bid");
  });

  refresh();
  setInterval(refresh, 1000);
}
