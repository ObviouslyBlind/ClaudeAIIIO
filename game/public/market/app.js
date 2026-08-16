const hudEl = document.getElementById("hud");
const boardEl = document.getElementById("board");
let err = "";

function money(n) {
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function render(data) {
  const h = data.hud;
  hudEl.innerHTML = [
    ["Tick", h.tick],
    ["Your cash", "$" + money(data.visitor.cash)],
    ["NPC money", "$" + money(h.moneySupply)],
    ["Price index", h.priceIndex],
    ["Trades", h.tradeCount],
  ]
    .map(
      ([k, v]) => `<div><span>${k}</span><strong>${v}</strong></div>`,
    )
    .join("");

  boardEl.innerHTML =
    `<p class="err">${err}</p>` +
    data.goods
      .map((g) => {
        const px = data.lastPrices[g];
        const held = data.visitor.stock[g] || 0;
        return `<div class="row">
          <div>
            <div class="name">${g.replace("_", " ")}</div>
            <div class="px">$${money(px)} · held ${held}</div>
          </div>
          <button data-good="${g}" ${data.visitor.cash < px ? "disabled" : ""}>Buy 1</button>
        </div>`;
      })
      .join("");
}

async function refresh() {
  const res = await fetch("/api/snapshot");
  render(await res.json());
}

boardEl.addEventListener("click", async (ev) => {
  const btn = ev.target.closest("button[data-good]");
  if (!btn) return;
  const res = await fetch("/api/buy", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ good: btn.dataset.good, qty: 1 }),
  });
  const body = await res.json();
  err = body.ok ? "" : "Could not buy: " + body.reason;
  render(body.snapshot);
});

refresh();
setInterval(refresh, 1000);
