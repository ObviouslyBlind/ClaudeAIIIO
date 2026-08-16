const hudEl = document.getElementById("hud");
const boardEl = document.getElementById("board");
const errEl = document.getElementById("err");
const stallNoteEl = document.getElementById("stall-note");
const islandBtns = document.querySelectorAll(".islands button[data-island]");
let err = "";
let island = "north";
let lastData = null;

function money(n) {
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function labelGood(g) {
  return String(g).replace(/_/g, " ");
}

function setIsland(next) {
  island = next === "south" ? "south" : "north";
  for (const btn of islandBtns) {
    btn.setAttribute("aria-pressed", btn.dataset.island === island ? "true" : "false");
  }
  stallNoteEl.textContent =
    island === "south"
      ? "South last prints. Buy 1 still fills at the North stall."
      : "North last prints. Buy 1 is the North stall.";
  if (lastData) render(lastData);
}

function render(data) {
  lastData = data;
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

  errEl.textContent = err;

  boardEl.innerHTML = data.goods
    .map((g) => {
      const northPx = data.lastPrices[g];
      const southPx = data.lastPricesSouth[g];
      const spread = data.arbSpread[g];
      const held = data.visitor.stock[g] || 0;
      const herePx = island === "south" ? southPx : northPx;
      const otherLabel = island === "south" ? "North" : "South";
      const otherPx = island === "south" ? northPx : southPx;
      const hereLabel = island === "south" ? "South" : "North";
      return `<div class="row">
          <div>
            <div class="name">${labelGood(g)}</div>
            <div class="px">$${money(herePx)} ${hereLabel} last</div>
            <div class="cmp">${otherLabel} $${money(otherPx)} · ferry $${money(spread)} · held ${held}</div>
          </div>
          <button type="button" data-good="${g}" title="North stall" ${data.visitor.cash < northPx ? "disabled" : ""}>Buy 1</button>
        </div>`;
    })
    .join("");
}

async function refresh() {
  const res = await fetch("/api/snapshot");
  render(await res.json());
}

document.querySelector(".islands").addEventListener("click", (ev) => {
  const btn = ev.target.closest("button[data-island]");
  if (!btn) return;
  setIsland(btn.dataset.island);
});

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

setIsland("north");
refresh();
setInterval(refresh, 1000);
