/**
 * Floating HUD. Panels are extra UI, not extra pages.
 * Polls /api/play.
 */

import { plotDisplayName } from "./parcel-map.js";
import { buyAskModel } from "./buy-ask.js";
import { playPaperBuy } from "./paper-sfx.js";
import { toggleViewer, footLevel } from "./overlays.js";

export const POLL_MS = 1000;

function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "$0";
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function el(html) {
  const wrap = document.createElement("div");
  wrap.innerHTML = html.trim();
  return wrap.firstElementChild;
}

async function readJson(url, opts) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => null);
  return { ok: res.ok, data };
}

export function mountChrome(opts) {
  const root = document.getElementById("chrome");
  if (!root) return { stop() {}, refresh() {} };

  const cashEl = document.getElementById("balance");
  const incomeEl = document.getElementById("income");
  const onlineEl = document.getElementById("online");
  const landCard = document.getElementById("land-card");
  const buyAsk = document.getElementById("buy-ask");
  const standVeil = document.getElementById("stand-veil");
  const standMenu = document.getElementById("stand-menu");

  let play = null;
  let openPanel = null;
  let overlay = "world";
  let placing = false;
  let marketAisle = null;
  let marketSku = null;
  let marketDest = "warehouse";

  function setPlaceHint(text, show) {
    const hint = document.getElementById("place-hint");
    const line = document.getElementById("place-hint-text");
    if (line && text) line.textContent = text;
    if (hint) hint.hidden = !show;
  }

  const HINTS = {
    world: "World: left-click walks. Lots chip shows lot outlines and $ bars.",
    lots: "Lots on. Nearby $ bars only — walk to see more. Click Lots again to hide. Click a $ bar to buy.",
    foot: "Foot traffic: High (green) / Moderate (yellow) / Low (red) on each named road.",
    logistics: "Logistics: tap the crate. The van waits until you take it.",
    minerals: "Minerals: ore catalog is in. Overlay paint comes next.",
  };

  function setOverlay(id) {
    overlay = id;
    root.querySelectorAll("[data-overlay]").forEach((b) => {
      b.classList.toggle("is-on", b.getAttribute("data-overlay") === id);
    });
    const hint = document.getElementById("viewer-hint");
    if (hint) hint.textContent = HINTS[id] || HINTS.world;
    if (opts.setStatus) opts.setStatus(HINTS[id] || HINTS.world);
    if (opts.onOverlay) opts.onOverlay(id);
    paintFootLegend();
  }

  function closePanels() {
    openPanel = null;
    root.querySelectorAll(".float-panel").forEach((p) => {
      p.classList.remove("is-open");
      p.hidden = true;
    });
    root.querySelectorAll(".rail-btn, .chrome-tr .chip[data-panel]").forEach((b) => b.classList.remove("is-on"));
  }

  function open(id) {
    if (openPanel === id) {
      closePanels();
      return;
    }
    closePanels();
    if (standMenu) standMenu.hidden = true;
    if (standVeil) standVeil.hidden = true;
    openPanel = id;
    const panel = document.getElementById("panel-" + id);
    if (panel) {
      panel.hidden = false;
      panel.classList.add("is-open");
    }
    const btn = root.querySelector(`[data-panel="${id}"]`);
    if (btn) btn.classList.add("is-on");
    paintPanels();
  }

  function title(text) {
    return `<h2>${text}</h2>`;
  }

  function paintTop() {
    if (!play) return;
    if (cashEl) cashEl.textContent = money(play.cash);
    if (incomeEl) {
      const n = Number(play.incomePerMinute) || 0;
      incomeEl.textContent = (n >= 0 ? "+" : "") + money(n) + "/min";
      incomeEl.classList.toggle("is-zero", n <= 0);
    }
    if (onlineEl) {
      onlineEl.textContent = (play.playersOnline || 1) + " online";
    }
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

  function paintMarket() {
    const body = document.getElementById("market-body");
    if (!body || !play) return;
    const leases = play.leases || [];
    const aisles = play.aisles || [];
    const catalog = play.catalog || [];
    const sku = catalog.find((s) => s.id === marketSku) || null;
    const fee = play.warehouse ? money(play.warehouse.feePerDay) : "$5.00";

    if (!marketAisle) {
      body.innerHTML = `
        ${title("Market", "market")}
        <p>Street carts. Buys sit in the dock warehouse unless you send the van.</p>
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
        ${title(rows[0] ? rows[0].aisleLabel : "Section", "market")}
        <button type="button" class="back" id="mkt-back">← Marketplace</button>
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
      ${title(sku.label, "market")}
      <button type="button" class="back" id="mkt-back">← ${sku.aisleLabel}</button>
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
      <select id="deliver-plot">${dests || `<option value="">Lease a ${sku.zone} lot first (Lots overlay)</option>`}</select>`
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
    const orderBtn = body.querySelector("#btn-order");
    if (orderBtn) {
      orderBtn.addEventListener("click", async () => {
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
        paintPanels();
        if (marketDest === "road" && opts.onOrder) opts.onOrder(data.delivery);
        if (opts.setStatus) {
          opts.setStatus(
            marketDest === "warehouse"
              ? "In the South warehouse. Open Warehouse when you want it."
              : "Van rolling. It waits at the kerb for 3 minutes, then goes back to the warehouse.",
          );
        }
      });
    }
  }

  function paintFootLegend() {
    const el = document.getElementById("foot-legend");
    if (!el) return;
    const roads = ((play && play.traffic && play.traffic.roads) || []).filter((r) => r.island === "south");
    if (overlay !== "foot" || !roads.length) {
      el.hidden = true;
      el.innerHTML = "";
      return;
    }
    el.hidden = false;
    el.innerHTML = roads
      .map(
        (r) =>
          `<div class="sku-row"><span><span class="band-dot ${r.band}"></span>${r.name || "Harbour Rd"}</span><strong>${footLevel(r.band)}</strong></div>`,
      )
      .join("");
  }

  function kindLabel(kind) {
    return kind === "hotdog_cart" ? "Street cart" : "Stock";
  }

  function paintInv() {
    const body = document.getElementById("inv-body");
    if (!body || !play) return;
    const rows = play.inventory || [];
    const whCart = ((play.warehouse && play.warehouse.items) || []).some((r) => r.kind === "hotdog_cart" && r.qty > 0);
    const canPlace = rows.some((r) => r.kind === "hotdog_cart") || whCart;
    body.innerHTML = `
      ${title("Inventory", "inventory")}
      ${
        rows.length
          ? rows
              .map(
                (r) => `
        <div class="inv-row">
          <span>${kindLabel(r.kind)} × ${r.qty}</span>
          ${
            r.kind === "hotdog_cart"
              ? `<button type="button" data-place="1">Place in world</button>`
              : ""
          }
        </div>`,
              )
              .join("")
          : "<p>Empty pockets. Warehouse holds the rest.</p>"
      }
      ${
        !rows.some((r) => r.kind === "hotdog_cart") && canPlace
          ? `<div class="inv-row"><span>Cart in warehouse</span><button type="button" data-place="1">Place in world</button></div>`
          : ""
      }
    `;
    const placeBtn = body.querySelector("[data-place]");
    if (placeBtn) {
      placeBtn.addEventListener("click", () => {
        placing = true;
        if (landCard) landCard.hidden = true;
        if (buyAsk) buyAsk.hidden = true;
        setOverlay("lots");
        closePanels();
        setPlaceHint("Tap the green YOURS lot, or the verge by the road.", true);
        if (opts.setStatus) {
          opts.setStatus("Tap your lot or the verge out to the main road to place the cart.");
        }
        if (opts.onPlaceMode) opts.onPlaceMode(true);
      });
    }
  }

  function plotNameFor(stand) {
    const lease = ((play && play.leases) || []).find((l) => l.id === stand.plotId);
    return (lease && lease.name) || "your lot";
  }

  function paintStaff() {
    const body = document.getElementById("staff-body");
    if (!body || !play) return;
    const stands = play.stands || [];
    body.innerHTML = `
      ${title("Staff", "employees")}
      ${
        stands.length
          ? stands
              .map((s) => {
                const where = plotNameFor(s);
                if (s.hired) {
                  return `<div class="stand-row"><span>${s.staffName || "Vendor"}</span><strong>${where}</strong></div>`;
                }
                return `<div class="stand-row"><span>${where}</span><strong>Tap the cart</strong></div>`;
              })
              .join("")
          : "<p>Place a cart, then tap it to hire.</p>"
      }
    `;
    body.querySelectorAll("[data-hire-person]").forEach((btn) => {
      btn.addEventListener("click", async () => {
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
        paintPanels();
        if (opts.onHired && ok) opts.onHired(btn.getAttribute("data-hire-stand"));
      });
    });
    body.querySelectorAll("[data-upgrade]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const { data } = await readJson("/api/stand/upgrade", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ standId: btn.getAttribute("data-upgrade") }),
        });
        if (data && data.play) play = data.play;
        paintTop();
        paintPanels();
      });
    });
  }

  function paintBoard() {
    const body = document.getElementById("board-body");
    if (!body || !play) return;
    body.innerHTML = `
      ${title("Leaderboard", "leaderboard")}
      <p>South island street carts.</p>
      <div class="stand-row"><span>You</span><strong>${money(play.cash)}</strong></div>
      <div class="stand-row"><span>Mill St cart (NPC)</span><strong>$412.40</strong></div>
      <div class="stand-row"><span>Harbour Rd cart (NPC)</span><strong>$188.10</strong></div>
    `;
  }

  function paintAccount() {
    const body = document.getElementById("acct-body");
    if (!body || !play) return;
    const taxPct = Math.round((Number(play.salesTax) || 0.2) * 100);
    body.innerHTML = `
      ${title("Account", "account")}
      <p>Visitor on South island. Sales tax ${taxPct}% is already in every sale.</p>
      <div class="stand-row"><span>Balance</span><strong>${money(play.cash)}</strong></div>
      <div class="stand-row"><span>Income</span><strong>${money(play.incomePerMinute)}/min</strong></div>
      <div class="stand-row"><span>Island bank</span><strong>${money(play.gameBank)}</strong></div>
    `;
  }

  function paintWarehouse() {
    const body = document.getElementById("warehouse-body");
    if (!body || !play) return;
    const wh = play.warehouse || { items: [], feePerDay: 5, island: "south" };
    const items = wh.items || [];
    const island = wh.island === "north" ? "North" : "South";
    body.innerHTML = `
      ${title("Warehouse", "warehouse")}
      <p class="whisper">${island} dock · shared · ${money(wh.feePerDay)}/day while occupied</p>
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
        paintPanels();
      });
    });
  }

  function paintPanels() {
    paintMarket();
    paintInv();
    paintWarehouse();
    paintStaff();
    paintBoard();
    paintAccount();
  }

  root.querySelectorAll("[data-panel]").forEach((btn) => {
    btn.addEventListener("click", () => open(btn.getAttribute("data-panel")));
  });
  root.querySelectorAll("[data-overlay]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setOverlay(toggleViewer(overlay, btn.getAttribute("data-overlay")));
      if (btn.closest("#panel-view")) closePanels();
    });
  });

  async function poll() {
    const { data } = await readJson("/api/play");
    if (data && data.mode === "PAPER") {
      play = data;
      paintTop();
      paintFootLegend();
      if (root.querySelector(".float-panel.is-open")) paintPanels();
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

  const placeCancel = document.getElementById("place-cancel");
  if (placeCancel) {
    placeCancel.addEventListener("click", () => {
      placing = false;
      setPlaceHint("", false);
      setOverlay("world");
      if (opts.onPlaceMode) opts.onPlaceMode(false);
      if (opts.setStatus) opts.setStatus("Place cancelled.");
    });
  }
  if (standVeil) {
    standVeil.addEventListener("click", () => {
      standMenu.hidden = true;
      standVeil.hidden = true;
    });
  }

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
    paintStandMenu: function paintStandMenu(stand, onStock, onHire) {
      if (!standMenu) return;
      if (!stand) {
        standMenu.hidden = true;
        if (standVeil) standVeil.hidden = true;
        return;
      }
      closePanels();
      standMenu.hidden = false;
      if (standVeil) standVeil.hidden = false;
      const todayN = Number(play && play.todayPrice != null ? play.todayPrice : 5);
      const today = money(todayN);
      const sticker = Number(stand.stickerPrice != null ? stand.stickerPrice : 5);
      const cap = Number(stand.storageCap || 20);
      const have = Number(stand.hotdogs) || 0;
      const tickN = 20;
      const filled = Math.round((have / Math.max(cap, 1)) * tickN);
      const ticks = Array.from(
        { length: tickN },
        (_, i) => `<i class="${i < filled ? "on" : ""}"></i>`,
      ).join("");
      const invQty = ((play && play.inventory) || []).find((r) => r.kind === "hotdogs")?.qty || 0;
      const whQty = ((play && play.warehouse && play.warehouse.items) || []).find((r) => r.kind === "hotdogs")?.qty || 0;
      const room = Math.max(0, cap - have);
      const maxFromInv = Math.min(invQty, room);
      const maxFromWh = Math.min(whQty, room);
      const maxQty = Math.max(maxFromInv, maxFromWh);
      const pip = Math.max(0, Math.min(100, ((todayN - 1) / 11) * 100));
      const vs =
        sticker < todayN - 0.01 ? "is-low" : sticker > todayN + 0.01 ? "is-high" : "is-today";
      const roster = (play && play.hireRoster) || [];
      standMenu.innerHTML = `
        <div class="stand-head">
          <h2>Cart</h2>
          <button type="button" class="stand-x" id="stand-close">Close</button>
        </div>
        <div class="stock-ticks" title="Stock">${ticks}</div>
        <p class="stock-read">${have}<small>/${cap}</small></p>
        <div class="source-row">
          <button type="button" class="source src-pocket" data-stock="inventory" ${maxFromInv ? "" : "disabled"}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8h10l1.2 12H5.8L7 8z"/><path d="M9 8V6.4a3 3 0 0 1 6 0V8"/></svg>
            <strong>${invQty}</strong><span>Pockets</span>
          </button>
          <button type="button" class="source src-wh" data-stock="warehouse" ${maxFromWh ? "" : "disabled"}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5V20H4z"/><path d="M4 10.5h16M12 10.5V20"/></svg>
            <strong>${whQty}</strong><span>Warehouse</span>
          </button>
        </div>
        ${
          maxQty
            ? `<div class="slider-row"><input id="stock-qty" class="qty-slider" type="range" min="1" max="${maxQty}" value="${maxQty}" /><span data-qty-out>${maxQty}</span></div>`
            : ""
        }
        <div class="price-block">
          <div class="price-track-wrap">
            <span class="today-pip" style="left:${pip}%"></span>
            <input id="sticker-price" type="range" min="1" max="12" step="0.5" value="${sticker}" />
          </div>
          <div class="price-readout ${vs}">
            <strong data-price-out>${money(sticker)}</strong>
            <span class="today-price">today ${today}</span>
          </div>
        </div>
        ${
          stand.hired
            ? `<p class="hired-pill">${stand.staffName || "Vendor"} on</p>`
            : `<div class="hire-row">${roster
                .map(
                  (p) =>
                    `<button type="button" class="hire-chip" data-hire-stand="${stand.id}" data-hire-person="${p.id}">${p.name}</button>`,
                )
                .join("")}</div>`
        }
        ${
          stand.hired && !stand.upgraded
            ? `<button type="button" class="go fridge" data-upgrade="${stand.id}">Fridge · $200</button>`
            : ""
        }
      `;
      function closeStand() {
        standMenu.hidden = true;
        if (standVeil) standVeil.hidden = true;
      }
      standMenu.querySelector("#stand-close")?.addEventListener("click", closeStand);
      const priceEl = standMenu.querySelector("#sticker-price");
      const priceOut = standMenu.querySelector("[data-price-out]");
      const readout = standMenu.querySelector(".price-readout");
      function paintVs(v) {
        const n = Number(v);
        if (priceOut) priceOut.textContent = money(n);
        if (readout) {
          readout.classList.toggle("is-low", n < todayN - 0.01);
          readout.classList.toggle("is-high", n > todayN + 0.01);
          readout.classList.toggle("is-today", Math.abs(n - todayN) <= 0.01);
        }
      }
      const qtyEl = standMenu.querySelector("#stock-qty");
      const qtyOut = standMenu.querySelector("[data-qty-out]");
      if (qtyEl && qtyOut) {
        qtyEl.addEventListener("input", () => {
          qtyOut.textContent = String(qtyEl.value);
        });
      }
      if (priceEl) {
        priceEl.addEventListener("input", () => paintVs(priceEl.value));
        priceEl.addEventListener("change", async () => {
          const { data } = await readJson("/api/stand/price", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ standId: stand.id, price: Number(priceEl.value) }),
          });
          if (data && data.play) play = data.play;
          paintTop();
        });
      }
      async function stockFrom(from) {
        const qtyEl = standMenu.querySelector("#stock-qty");
        const qty = qtyEl ? Number(qtyEl.value) : 0;
        const { ok, data } = await readJson("/api/stand/stock", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ standId: stand.id, qty, from }),
        });
        if (data && data.play) play = data.play;
        paintTop();
        const fresh = ((play && play.stands) || []).find((s) => s.id === stand.id);
        paintStandMenu(fresh, onStock, onHire);
        if (opts.setStatus) {
          opts.setStatus(ok ? "Stock in the cart." : "Could not stock: " + ((data && data.reason) || "fail"));
        }
        if (ok && typeof onStock === "function") onStock();
        if (ok && opts.onStocked) opts.onStocked(stand.id);
      }
      standMenu.querySelectorAll("[data-stock]").forEach((btn) => {
        btn.addEventListener("click", () => stockFrom(btn.getAttribute("data-stock")));
      });
      standMenu.querySelectorAll("[data-hire-person]").forEach((btn) => {
        btn.addEventListener("click", async () => {
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
          const fresh = ((play && play.stands) || []).find((s) => s.id === stand.id);
          paintStandMenu(fresh, onStock, onHire);
          if (ok && typeof onHire === "function") onHire();
        });
      });
      standMenu.querySelectorAll("[data-upgrade]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const { data } = await readJson("/api/stand/upgrade", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ standId: btn.getAttribute("data-upgrade") }),
          });
          if (data && data.play) play = data.play;
          paintTop();
          const fresh = ((play && play.stands) || []).find((s) => s.id === stand.id);
          paintStandMenu(fresh, onStock, onHire);
        });
      });
    },
    hideStandMenu() {
      if (standMenu) standMenu.hidden = true;
      if (standVeil) standVeil.hidden = true;
    },
  };
}
