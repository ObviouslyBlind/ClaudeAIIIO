/**
 * PAPER stall sell strip on the market board only.
 * Island / good / qty → POST /api/sell. SIMULATED. No wallet.
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

const root = document.getElementById("sell-strip");
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
  if (reason === "no_stock") {
    return "No paper stock to sell. PAPER · SIMULATED.";
  }
  if (reason === "no_cash") {
    return "NPC book has no paper cash. PAPER · SIMULATED.";
  }
  if (reason === "mixed") {
    return "Mixed holdings are rejected. PAPER · SIMULATED.";
  }
  if (reason) return "Could not sell: " + reason + " (PAPER).";
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

function setResult(text) {
  const el = root.querySelector("#sell-err");
  if (el) el.textContent = text || "";
}

function applySnapshot(data) {
  fillGoods(data);
}

async function sell() {
  const island = root.querySelector('[name="island"]');
  const good = root.querySelector('[name="good"]');
  const qty = root.querySelector('[name="qty"]');
  const res = await fetch("/api/sell", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      island: island ? island.value : "north",
      goodId: good ? good.value : "corn",
      qty: Number(qty && qty.value),
    }),
  });
  const body = await res.json();
  setResult(
    body.ok
      ? "Sold " +
          body.qty +
          " " +
          labelGood(body.goodId) +
          " at " +
          cap(body.island) +
          " · $" +
          money(body.paid) +
          " · PAPER · SIMULATED."
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
    #sell-strip { margin-top: 16px; }
    #sell-strip form {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin: 0 0 8px;
    }
    #sell-strip label {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
    }
    #sell-strip select,
    #sell-strip input {
      min-height: 44px;
      border: 0;
      border-radius: var(--radius);
      background: var(--panel);
      color: var(--ink);
      font-size: 16px;
      padding: 0 10px;
      font-variant-numeric: tabular-nums;
    }
    #sell-strip .sell-actions {
      grid-column: 1 / -1;
    }
    #sell-strip .sell-actions button {
      width: 100%;
      min-height: 44px;
      border: 0;
      border-radius: var(--radius);
      background: var(--accent);
      color: #1a140c;
      font-weight: 700;
      font-size: 15px;
    }
    #sell-strip .sell-actions button:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
  `;
  document.head.appendChild(css);

  root.innerHTML = `
    <p class="badge">PAPER · SIMULATED · no wallet</p>
    <p class="stall-note">
      Sell into the island last print. North and South books can diverge. Not a live
      exchange.
    </p>
    <form id="paper-sell-form">
      <label>Island
        <select name="island">
          <option value="north" selected>North</option>
          <option value="south">South</option>
        </select>
      </label>
      <label>Good
        <select name="good">${FALLBACK_GOODS.map((g) => `<option value="${g}">${labelGood(g)}</option>`).join("")}</select>
      </label>
      <label>Qty
        <input name="qty" type="number" min="0.01" step="0.01" required value="1" />
      </label>
      <div class="sell-actions">
        <button type="submit">Sell PAPER</button>
      </div>
    </form>
    <p class="err" id="sell-err"></p>
  `;

  root.addEventListener("submit", (ev) => {
    ev.preventDefault();
    sell();
  });

  refresh();
}
