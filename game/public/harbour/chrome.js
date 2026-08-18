/**
 * One harbour ledger. Cash stays on the world. Chapters drill in.
 * Mix of dusk glass (A) and a customs book (C).
 */

import { plotDisplayName } from "./parcel-map.js";
import { buyAskModel } from "./buy-ask.js";
import { playPaperBuy } from "./paper-sfx.js";
import { toggleViewer, footLevel } from "./overlays.js";

export const POLL_MS = 1000;

const CHAPTERS = ["market", "warehouse", "carts", "map", "you"];

function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "$0";
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function readJson(url, opts) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => null);
  return { ok: res.ok, data };
}

function chapterFor(id) {
  if (id === "inventory" || id === "employees" || id === "carts") return "carts";
  if (id === "leaderboard" || id === "account" || id === "you") return "you";
  if (CHAPTERS.includes(id)) return id;
  return "market";
}

export function mountChrome(opts) {
  const root = document.getElementById("chrome");
  if (!root) return { stop() {}, refresh() {} };

  const cashEl = document.getElementById("balance");
  const incomeEl = document.getElementById("income");
  const onlineEl = document.getElementById("online");
  const landCard = document.getElementById("land-card");
  const buyAsk = document.getElementById("buy-ask");
  const sheet = document.getElementById("harbour-sheet");
  const body = document.getElementById("sheet-body");

  let play = null;
  let overlay = "world";
  let placing = false;
  let sheetOpen = false;
  let chapter = "market";
  let marketAisle = null;
  let marketSku = null;
  let marketDest = "warehouse";
  let focusStand = null;
  let cartHandlers = { onStock: null, onHire: null };

  const HINTS = {
    world: "World: left-click walks. Open Harbour → Map for lots.",
    lots: "Lots on. Nearby $ bars. Click a $ bar to buy.",
    foot: "Foot traffic: High / Moderate / Low on each named road.",
    logistics: "Logistics: tap the crate. The van waits until you take it.",
    minerals: "Minerals: ore catalog is in. Overlay paint comes next.",
  };

  function setPlaceHint(text, show) {
    const hint = document.getElementById("place-hint");
    const line = document.getElementById("place-hint-text");
    if (line && text) line.textContent = text;
    if (hint) hint.hidden = !show;
  }

  function setOverlay(id) {
    overlay = id;
    root.querySelectorAll("[data-overlay]").forEach((b) => {
      b.classList.toggle("is-on", b.getAttribute("data-overlay") === id);
    });
    const hint = document.getElementById("viewer-hint");
    if (hint) hint.textContent = HINTS[id] || HINTS.world;
    if (opts.setStatus) opts.setStatus(HINTS[id] || HINTS.world);
    if (opts.onOverlay) opts.onOverlay(id);
  }

  function paintSpine() {
    root.querySelectorAll("[data-chapter]").forEach((b) => {
      b.classList.toggle("is-on", b.getAttribute("data-chapter") === chapter);
    });
  }

  function closePanels() {
    sheetOpen = false;
    if (sheet) {
      sheet.hidden = true;
      sheet.classList.remove("is-open");
    }
    document.getElementById("btn-harbour")?.classList.remove("is-on");
  }

  function openSheet(id) {
    chapter = chapterFor(id);
    if (id === "employees" || id === "inventory") focusStand = focusStand || ((play && play.stands) || [])[0]?.id || null;
    sheetOpen = true;
    if (sheet) {
      sheet.hidden = false;
      requestAnimationFrame(() => sheet.classList.add("is-open"));
    }
    document.getElementById("btn-harbour")?.classList.add("is-on");
    paintSpine();
    paintPage();
  }

  function open(id) {
    if (sheetOpen && chapterFor(id) === chapter) {
      closePanels();
      return;
    }
    openSheet(id);
  }

  function paintTop() {
    if (!play) return;
    if (cashEl) cashEl.textContent = money(play.cash);
    if (incomeEl) {
      const n = Number(play.incomePerMinute) || 0;
      incomeEl.textContent = (n >= 0 ? "+" : "") + money(n) + "/min";
      incomeEl.classList.toggle("is-zero", n <= 0);
    }
    if (onlineEl) onlineEl.textContent = (play.playersOnline || 1) + " online";
    const fee = document.getElementById("storage-fee");
    if (fee) {
      const wh = play.warehouse;
      const occupied = wh && wh.occupied;
      fee.hidden = !occupied;
      if (occupied) {
        const island = wh.island === "north" ? "North" : "South";
        fee.textContent = island + " warehouse " + money(wh.feePerDay) + "/day";
      }
    }
    const hiddenCash = document.getElementById("cash");
    if (hiddenCash) {
      hiddenCash.textContent =
        "Cash $" + Number(play.cash).toLocaleString("en-US", { maximumFractionDigits: 0 });
    }
  }

  function kindLabel(kind) {
    return kind === "hotdog_cart" ? "Street cart" : "Stock";
  }

  function plotNameFor(stand) {
    const lease = ((play && play.leases) || []).find((l) => l.id === stand.plotId);
    return (lease && lease.name) || "your lot";
  }

  function paintMarket() {
    if (!body || !play) return;
    const leases = play.leases || [];
    const aisles = play.aisles || [];
    const catalog = play.catalog || [];
    const sku = catalog.find((s) => s.id === marketSku) || null;
    const fee = play.warehouse ? money(play.warehouse.feePerDay) : "$5.00";

    if (!marketAisle) {
      body.innerHTML = `
        <h2>Market</h2>
        <p>South marketplace. Street carts and stock land in the island warehouse unless you send the van.</p>
        ${aisles
          .map(
            (a) => `
          <button type="button" class="aisle-btn" data-aisle="${a.id}">
            <strong>${a.label}</strong>
            <span>${a.note}</span>
          </button>`,
          )
          .join("")}
      `;
      body.querySelectorAll("[data-aisle]").forEach((btn) => {
        btn.addEventListener("click", () => {
          marketAisle = btn.getAttribute("data-aisle");
          marketSku = null;
          paintMarket();
        });
      });
      return;
    }

    if (!sku) {
      const rows = catalog.filter((s) => s.aisle === marketAisle);
      body.innerHTML = `
        <button type="button" class="back" id="mkt-back">← Marketplace</button>
        <h2>${rows[0] ? rows[0].aisleLabel : "Section"}</h2>
        ${rows
          .map(
            (s) => `
          <button type="button" class="aisle-btn" data-pick="${s.id}">
            <strong>${s.label} · ${money(s.paperPrice)}</strong>
            <span>${s.note} · ${s.zone}</span>
          </button>`,
          )
          .join("")}
      `;
      body.querySelector("#mkt-back")?.addEventListener("click", () => {
        marketAisle = null;
        paintMarket();
      });
      body.querySelectorAll("[data-pick]").forEach((btn) => {
        btn.addEventListener("click", () => {
          marketSku = btn.getAttribute("data-pick");
          paintMarket();
        });
      });
      return;
    }

    const dests = leases
      .filter((l) => !sku.zone || l.zone === sku.zone)
      .map((l) => `<option value="${l.id}">${l.name || l.id} · ${l.zone || ""} · by the road</option>`)
      .join("");
    const roadOk = Boolean(dests);
    const canBuy = marketDest === "warehouse" || roadOk;
    body.innerHTML = `
      <button type="button" class="back" id="mkt-back">← ${sku.aisleLabel}</button>
      <h2>${sku.label}</h2>
      <p>${sku.note}</p>
      <div class="sku-row"><span>Price</span><strong>${money(sku.paperPrice)}</strong></div>
      <div class="dest-row">
        <button type="button" class="dest ${marketDest === "warehouse" ? "is-on" : ""}" data-dest="warehouse">Store in warehouse</button>
        <button type="button" class="dest ${marketDest === "road" ? "is-on" : ""}" data-dest="road">Deliver to me</button>
      </div>
      ${
        marketDest === "warehouse"
          ? `<p class="whisper">South warehouse ${fee}/day while it sits. Shared dock, every player.</p>`
          : `<label>Deliver to</label>
      <select id="deliver-plot">${dests || `<option value="">Lease a ${sku.zone} lot first (Harbour → Map → Lots)</option>`}</select>`
      }
      <div class="sku-row"><span></span><button type="button" class="go" id="btn-order" ${canBuy ? "" : "disabled"}>Buy · ${money(sku.paperPrice)}</button></div>
    `;
    body.querySelector("#mkt-back")?.addEventListener("click", () => {
      marketSku = null;
      paintMarket();
    });
    body.querySelectorAll("[data-dest]").forEach((btn) => {
      btn.addEventListener("click", () => {
        marketDest = btn.getAttribute("data-dest") || "warehouse";
        paintMarket();
      });
    });
    body.querySelector("#btn-order")?.addEventListener("click", async () => {
      const plotId = body.querySelector("#deliver-plot")?.value;
      const { ok, data } = await readJson("/api/market/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          plotId,
          skus: [sku.id],
          island: "south",
          dest: marketDest,
        }),
      });
      if (!ok) {
        if (opts.setStatus) opts.setStatus("Order failed: " + (data && data.reason));
        return;
      }
      playPaperBuy();
      play = data.play;
      paintTop();
      paintPage();
      if (marketDest === "road" && opts.onOrder) opts.onOrder(data.delivery);
      if (opts.setStatus) {
        opts.setStatus(
          marketDest === "warehouse"
            ? "In the South warehouse. Open Harbour → Warehouse when you want it."
            : "Van rolling. It waits at the kerb for 3 minutes, then goes back to the warehouse.",
        );
      }
    });
  }

  function startPlace() {
    placing = true;
    if (landCard) landCard.hidden = true;
    if (buyAsk) buyAsk.hidden = true;
    setOverlay("lots");
    closePanels();
    setPlaceHint("Tap the green YOURS lot, or the verge by the road.", true);
    if (opts.setStatus) opts.setStatus("Tap your lot or the verge out to the main road to place the cart.");
    if (opts.onPlaceMode) opts.onPlaceMode(true);
  }

  async function stockStand(standId) {
    const { ok, data } = await readJson("/api/stand/stock", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ standId }),
    });
    if (data && data.play) play = data.play;
    paintTop();
    paintPage();
    if (opts.setStatus) {
      opts.setStatus(ok ? "Stock in the cart." : "Could not stock: " + ((data && data.reason) || "fail"));
    }
    if (opts.onStocked && ok) opts.onStocked(standId);
  }

  function paintWarehouse() {
    if (!body || !play) return;
    const wh = play.warehouse || { items: [], feePerDay: 5, island: "south" };
    const items = wh.items || [];
    const island = wh.island === "north" ? "North" : "South";
    body.innerHTML = `
      <h2>Warehouse</h2>
      <p>${island} dock · shared · ${money(wh.feePerDay)}/day while occupied</p>
      ${
        items.length
          ? items
              .map(
                (r) => `
        <div class="inv-row">
          <span>${kindLabel(r.kind)} × ${r.qty}</span>
          <button type="button" data-withdraw="${r.kind}">Bring to me</button>
        </div>`,
              )
              .join("")
          : "<p>Nothing stored. Buys default here.</p>"
      }
    `;
    body.querySelectorAll("[data-withdraw]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const { data } = await readJson("/api/warehouse/withdraw", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ kind: btn.getAttribute("data-withdraw") }),
        });
        if (data && data.play) play = data.play;
        paintTop();
        paintPage();
      });
    });
  }

  function paintCarts() {
    if (!body || !play) return;
    const stands = play.stands || [];
    const roster = play.hireRoster || [];
    const rows = play.inventory || [];
    const whItems = (play.warehouse && play.warehouse.items) || [];
    const stand = stands.find((s) => s.id === focusStand) || stands[0] || null;
    focusStand = stand ? stand.id : null;
    const today = money(play.todayPrice != null ? play.todayPrice : 5);
    const canPlace =
      rows.some((r) => r.kind === "hotdog_cart") || whItems.some((r) => r.kind === "hotdog_cart" && r.qty > 0);

    if (!stand) {
      body.innerHTML = `
        <h2>Carts</h2>
        <p>Place a street cart, then hire someone. It does not sell empty-handed.</p>
        ${
          canPlace
            ? `<button type="button" class="go" data-place="1">Place in world</button>`
            : `<p>Buy a cart in Market. It waits in the warehouse.</p>`
        }
        ${rows.map((r) => `<div class="inv-row"><span>${kindLabel(r.kind)} × ${r.qty}</span></div>`).join("")}
      `;
      body.querySelector("[data-place]")?.addEventListener("click", startPlace);
      return;
    }

    const sticker = stand.stickerPrice != null ? stand.stickerPrice : 5;
    const person = roster.find((p) => p.id === stand.staffId) || roster[0];
    const hireBlock = stand.hired
      ? `<div class="stand-row"><span>${stand.staffName || "Vendor"} · ${plotNameFor(stand)}</span><strong>hired</strong></div>
         ${
           !stand.upgraded && person && person.suggest
             ? `<p class="suggest">${stand.staffName}: ${person.suggest}</p><button type="button" class="go" data-upgrade="${stand.id}">Add fridge · $200</button>`
             : ""
         }`
      : `<p>A cart does not sell until you hire someone at ${plotNameFor(stand)}.</p>
         ${roster
           .map(
             (p) =>
               `<button type="button" class="take-all" data-hire-stand="${stand.id}" data-hire-person="${p.id}">${p.name} · ${p.role}</button>`,
           )
           .join("")}`;

    body.innerHTML = `
      <h2>Street cart</h2>
      <p>${stand.hired ? (stand.staffName || "Vendor") + " is working" : "Closed until you hire"} · stock ${stand.hotdogs}/${stand.storageCap || 20}</p>
      <label class="sticker-label" for="sticker-price">Your price</label>
      <div class="sticker-row">
        <input id="sticker-price" type="number" min="0.01" step="0.5" value="${sticker}" />
        <span class="today-price">${today} is today's price</span>
      </div>
      <button type="button" class="take-all" data-stock="1">Stock from warehouse</button>
      ${hireBlock}
      ${canPlace ? `<button type="button" class="row-btn" data-place="1"><strong>Place another cart</strong></button>` : ""}
    `;
    body.querySelector("[data-place]")?.addEventListener("click", startPlace);
    body.querySelector("[data-stock]")?.addEventListener("click", () => {
      if (cartHandlers.onStock) cartHandlers.onStock();
      else stockStand(stand.id);
    });
    body.querySelectorAll("[data-hire-person]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (cartHandlers.onHire) {
          cartHandlers.onHire();
          return;
        }
        const { ok, data } = await readJson("/api/stand/hire", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            standId: btn.getAttribute("data-hire-stand"),
            personId: btn.getAttribute("data-hire-person"),
          }),
        });
        if (data && data.play) play = data.play;
        paintTop();
        paintPage();
        if (opts.onHired && ok) opts.onHired(btn.getAttribute("data-hire-stand"));
      });
    });
    body.querySelector("[data-upgrade]")?.addEventListener("click", async () => {
      const { data } = await readJson("/api/stand/upgrade", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ standId: stand.id }),
      });
      if (data && data.play) play = data.play;
      paintTop();
      paintPage();
    });
    const input = body.querySelector("#sticker-price");
    if (input) {
      input.addEventListener("change", async () => {
        const { data } = await readJson("/api/stand/price", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ standId: stand.id, price: Number(input.value) }),
        });
        if (data && data.play) play = data.play;
        paintTop();
      });
    }
  }

  function paintMap() {
    if (!body) return;
    const roads = ((play && play.traffic && play.traffic.roads) || []).filter((r) => r.island === "south");
    body.innerHTML = `
      <h2>Map</h2>
      <p>${HINTS[overlay] || HINTS.world}</p>
      <button type="button" class="aisle-btn ${overlay === "world" ? "is-on" : ""}" data-overlay="world"><strong>World</strong><span>Walk. Land does not steal taps.</span></button>
      <button type="button" class="aisle-btn ${overlay === "lots" ? "is-on" : ""}" data-overlay="lots"><strong>Lots</strong><span>Nearby $ bars. Click a $ bar to buy.</span></button>
      <button type="button" class="aisle-btn ${overlay === "foot" ? "is-on" : ""}" data-overlay="foot"><strong>Foot traffic</strong><span>High / Moderate / Low on the pavement.</span></button>
      <button type="button" class="aisle-btn ${overlay === "logistics" ? "is-on" : ""}" data-overlay="logistics"><strong>Logistics</strong><span>Vans and roadside crates.</span></button>
      ${
        overlay === "foot"
          ? roads
              .map(
                (r) =>
                  `<div class="sku-row"><span><span class="band-dot ${r.band}"></span>${r.name || "Harbour Rd"}</span><strong>${footLevel(r.band)}</strong></div>`,
              )
              .join("")
          : ""
      }
    `;
    body.querySelectorAll("[data-overlay]").forEach((btn) => {
      btn.addEventListener("click", () => {
        setOverlay(toggleViewer(overlay, btn.getAttribute("data-overlay")));
        paintMap();
      });
    });
  }

  function paintYou() {
    if (!body || !play) return;
    const taxPct = Math.round((Number(play.salesTax) || 0.2) * 100);
    body.innerHTML = `
      <h2>You</h2>
      <p>Visitor on South island. Sales tax ${taxPct}% is already in every sale.</p>
      <div class="stand-row"><span>Balance</span><strong>${money(play.cash)}</strong></div>
      <div class="stand-row"><span>Income</span><strong>${money(play.incomePerMinute)}/min</strong></div>
      <div class="stand-row"><span>Island bank</span><strong>${money(play.gameBank)}</strong></div>
      <h2>South carts</h2>
      <div class="stand-row"><span>You</span><strong>${money(play.cash)}</strong></div>
      <div class="stand-row"><span>Mill St cart</span><strong>$412.40</strong></div>
      <div class="stand-row"><span>Harbour Rd cart</span><strong>$188.10</strong></div>
    `;
  }

  function paintPage() {
    if (!sheetOpen) return;
    if (chapter === "market") paintMarket();
    else if (chapter === "warehouse") paintWarehouse();
    else if (chapter === "carts") paintCarts();
    else if (chapter === "map") paintMap();
    else paintYou();
  }

  function sheetBack() {
    if (chapter === "market" && (marketSku || marketAisle)) {
      if (marketSku) marketSku = null;
      else marketAisle = null;
      paintMarket();
      return;
    }
    closePanels();
  }

  root.querySelectorAll("[data-chapter]").forEach((btn) => {
    btn.addEventListener("click", () => openSheet(btn.getAttribute("data-chapter")));
  });
  document.getElementById("sheet-back")?.addEventListener("click", sheetBack);
  document.getElementById("sheet-close")?.addEventListener("click", closePanels);
  document.getElementById("btn-harbour")?.addEventListener("click", () => {
    if (sheetOpen) closePanels();
    else openSheet(chapter);
  });

  async function poll() {
    const { data } = await readJson("/api/play");
    if (data && data.mode === "PAPER") {
      play = data;
      paintTop();
      if (sheetOpen) paintPage();
      if (opts.onPlay) opts.onPlay(play);
    }
  }

  poll();
  const timer = setInterval(poll, POLL_MS);

  function paintBuyAsk(plot, extras) {
    if (!buyAsk) return;
    const model = buyAskModel(plot);
    if (!model) {
      buyAsk.hidden = true;
      return;
    }
    buyAsk.hidden = false;
    if (landCard) landCard.hidden = true;
    closePanels();
    const note = extras && extras.note ? `<p class="lease-note">${extras.note}</p>` : "";
    buyAsk.innerHTML = `
      <h2>${model.question}</h2>
      <p class="buy-ask-name">${model.name}</p>
      <p class="price">${model.priceLabel}</p>
      ${note}
      <div class="land-row">
        <button type="button" class="take-all" id="buy-ask-yes">${model.yes}</button>
        <button type="button" class="take-all" id="buy-ask-no">${model.no}</button>
      </div>
    `;
    const yes = buyAsk.querySelector("#buy-ask-yes");
    const no = buyAsk.querySelector("#buy-ask-no");
    if (yes && opts.lease) yes.addEventListener("click", () => opts.lease());
    if (no) {
      no.addEventListener("click", () => {
        buyAsk.hidden = true;
        if (opts.onCloseLand) opts.onCloseLand();
      });
    }
  }

  document.getElementById("place-cancel")?.addEventListener("click", () => {
    placing = false;
    setPlaceHint("", false);
    setOverlay("world");
    if (opts.onPlaceMode) opts.onPlaceMode(false);
    if (opts.setStatus) opts.setStatus("Place cancelled.");
  });

  setOverlay("world");

  return {
    stop() {
      clearInterval(timer);
    },
    refresh: poll,
    isPlacing: () => placing,
    clearPlacing() {
      placing = false;
      setPlaceHint("", false);
      if (opts.onPlaceMode) opts.onPlaceMode(false);
    },
    getPlay: () => play,
    setOverlay,
    open,
    closePanels,
    hideBuyAsk() {
      if (buyAsk) buyAsk.hidden = true;
    },
    paintBuyAsk,
    paintLand(plot, extras) {
      if (!landCard) return;
      if (buyAsk) buyAsk.hidden = true;
      if (!plot) {
        landCard.hidden = true;
        return;
      }
      landCard.hidden = false;
      const band = extras && extras.band ? extras.band : "";
      const crate = extras && extras.crate;
      const roadside = extras && extras.roadside;
      const title = roadside ? "Roadside crate" : plotDisplayName(plot);
      const vacant = !roadside && !plot.owner;
      const price = roadside
        ? ""
        : vacant
          ? `<button type="button" class="land-buy take-all" id="land-lease">${money(plot.price)} · Buy lot</button>`
          : `<p class="price">${plot.owner === "visitor" ? "YOURS" : "taken"}</p>`;
      const note = extras && extras.note ? `<p class="lease-note">${extras.note}</p>` : "";
      landCard.innerHTML = `
        <h2>${title}</h2>
        ${price}
        ${note}
        ${band ? `<p><span class="band-dot ${band}"></span>Foot traffic ${footLevel(band)}</p>` : ""}
        ${
          roadside
            ? ""
            : `<div class="land-row"><button type="button" class="take-all" id="land-close">Close</button></div>`
        }
        ${crate ? `<button type="button" class="take-all" id="land-take">Take all</button>` : ""}
        ${roadside ? `<button type="button" class="take-all" id="land-close">Close</button>` : ""}
      `;
      const leaseBtn = landCard.querySelector("#land-lease");
      if (leaseBtn) leaseBtn.addEventListener("click", () => paintBuyAsk(plot, extras || {}));
      const closeBtn = landCard.querySelector("#land-close");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => {
          landCard.hidden = true;
          if (opts.onCloseLand) opts.onCloseLand();
        });
      }
      const takeBtn = landCard.querySelector("#land-take");
      if (takeBtn && extras.onTake) {
        takeBtn.addEventListener("click", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          landCard.hidden = true;
          extras.onTake();
        });
      }
    },
    paintStandMenu(stand, onStock, onHire) {
      cartHandlers = { onStock, onHire };
      if (!stand) {
        cartHandlers = { onStock: null, onHire: null };
        if (chapter === "carts") closePanels();
        return;
      }
      focusStand = stand.id;
      openSheet("carts");
    },
    hideStandMenu() {
      cartHandlers = { onStock: null, onHire: null };
      if (chapter === "carts") closePanels();
    },
  };
}
