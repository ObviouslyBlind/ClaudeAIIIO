/**
 * Floating HUD. Panels are extra UI, not extra pages.
 * Polls /api/play.
 */

import { plotDisplayName } from "./parcel-map.js";
import { buyAskModel } from "./buy-ask.js";
import { playPaperBuy } from "./paper-sfx.js";
import { toggleViewer, footLevel } from "./overlays.js";
import { mountPackShift } from "./pack.js";
import { formatCartsBody } from "./carts-hud.js";

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
  let marketDest = "cart";
  const packShift = mountPackShift();

  function setPlaceHint(text, show) {
    const hint = document.getElementById("place-hint");
    const line = document.getElementById("place-hint-text");
    if (line && text) line.textContent = text;
    if (hint) hint.hidden = !show;
  }

  const HINTS = {
    world: "World: left-click walks. Lots shows lot outlines and $ bars.",
    lots: "Lots on. Nearby $ bars only — walk to see more. Click Lots again to hide. Click a $ bar to buy.",
    foot: "Foot traffic: High (green) / Moderate (yellow) / Low (red) on each named road.",
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
    root.querySelectorAll(".rail-btn, .chrome-tr .chip[data-panel]").forEach((b) => {
      b.classList.remove("is-on");
      if (b.hasAttribute("aria-expanded")) b.setAttribute("aria-expanded", "false");
    });
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
    if (btn) {
      btn.classList.add("is-on");
      if (btn.hasAttribute("aria-expanded")) btn.setAttribute("aria-expanded", "true");
    }
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
    if (fee) fee.hidden = true;
    const hiddenCash = document.getElementById("cash");
    if (hiddenCash) {
      hiddenCash.textContent =
        "Cash $" + Number(play.cash).toLocaleString("en-US", { maximumFractionDigits: 0 });
    }
  }

  function paintMarket() {
    const body = document.getElementById("market-body");
    if (!body || !play) return;
    const catalog = play.catalog || [];
    const fee = play.warehouse ? money(play.warehouse.feePerDay) : "$5.00";
    const prices = play.lastPricesSouth || {};
    const goods = play.goods || Object.keys(prices);
    const destCart = marketDest === "cart";
    body.innerHTML = `
      ${title("Market")}
      <p>One sheet. Stock the cart, or park kit in the warehouse. No aisles.</p>
      <div class="dest-row">
        <button type="button" class="dest ${destCart ? "is-on" : ""}" data-dest="cart">Stock cart</button>
        <button type="button" class="dest ${marketDest === "warehouse" ? "is-on" : ""}" data-dest="warehouse">Warehouse</button>
      </div>
      <p class="whisper">${destCart ? "Goes in your cart / pockets. Place from Carts." : "South warehouse " + fee + "/day."}</p>
      ${catalog
        .map(
          (s) => `
        <div class="inv-row">
          <span>${s.label} · ${money(s.paperPrice)}</span>
          <button type="button" class="go" data-order="${s.id}">Buy</button>
        </div>`,
        )
        .join("")}
      <h3 class="sheet-kicker">Twelve goods · South last price</h3>
      ${goods
        .map((id) => {
          const px = Number(prices[id]);
          const label = String(id).replace("_", " ");
          const cost = Number.isFinite(px) ? money(px) : "—";
          return `<div class="inv-row"><span>${label} · ${cost}</span><button type="button" class="go" data-buy="${id}">Buy 1</button></div>`;
        })
        .join("")}
    `;
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

  function paintInv() {
    const body = document.getElementById("inv-body");
    if (!body || !play) return;
    body.innerHTML = formatCartsBody(play);
  }

  function beginPlace() {
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
      ${title("Staff")}
      ${
        stands.length
          ? stands
              .map((s) => {
                const where = plotNameFor(s);
                if (s.hired) {
                  return `<div class="stand-row"><span>${s.staffName || "Vendor"}</span><strong>${where}</strong></div>`;
                }
                return `<div class="stand-row"><span>${where}</span><strong>Hire from Carts</strong></div>`;
              })
              .join("")
          : "<p>Place a cart, then hire from the Carts submenu. Carts do not sell without staff.</p>"
      }
    `;
  }

  function paintAccount() {
    const body = document.getElementById("acct-body");
    if (!body || !play) return;
    const taxPct = Math.round((Number(play.salesTax) || 0.2) * 100);
    body.innerHTML = `
      ${title("Account")}
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
      ${title("Warehouse")}
      <p class="whisper">${island} dock · shared · ${money(wh.feePerDay)}/day while occupied</p>
      ${
        items.length
          ? items
              .map(
                (r) => `
        <div class="inv-row">
          <span>${r.kind === "hotdog_cart" ? "Street cart" : "Stock"} × ${r.qty}</span>
          <button type="button" data-withdraw="${r.kind}">Bring to me</button>
        </div>`,
              )
              .join("")
          : "<p>Nothing stored. Market can send kit here.</p>"
      }
    `;
  }

  function startPack() {
    packShift.open({
      async onDone(hits) {
        const { ok, data } = await readJson("/api/shift/pack", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ hits }),
        });
        if (data && data.play) play = data.play;
        paintTop();
        if (openPanel === "inventory") paintInv();
        if (opts.setStatus) {
          opts.setStatus(
            ok
              ? `Pack bonus ${money(data.bonus)} · PAPER · stall already ran`
              : "Pack: " + ((data && data.reason) || "skipped"),
          );
        }
      },
    });
  }

  function paintPanels() {
    paintMarket();
    paintInv();
    paintWarehouse();
    paintStaff();
    paintAccount();
  }

  async function refreshPlay(data) {
    if (data && data.play) play = data.play;
    paintTop();
    paintPanels();
  }

  function bindChromeActions() {
    if (root.dataset.cartBound) return;
    root.dataset.cartBound = "1";
    root.addEventListener("click", async (ev) => {
      const hit = ev.target && ev.target.closest
        ? ev.target.closest(
            "[data-dest], [data-order], [data-buy], [data-place], [data-withdraw], [data-pack-start], [data-stock], [data-hire-person], [data-upgrade]",
          )
        : null;
      if (!hit || (standMenu && standMenu.contains(hit))) return;
      if (hit.hasAttribute("data-dest")) {
        marketDest = hit.getAttribute("data-dest") || "cart";
        paintMarket();
        return;
      }
      if (hit.hasAttribute("data-order")) {
        const { ok, data } = await readJson("/api/market/order", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            skus: [hit.getAttribute("data-order")],
            island: "south",
            dest: marketDest === "cart" ? "cart" : "warehouse",
          }),
        });
        if (!ok) {
          if (opts.setStatus) opts.setStatus("Order failed: " + (data && data.reason));
          return;
        }
        playPaperBuy();
        await refreshPlay(data);
        if (opts.setStatus) {
          opts.setStatus(
            marketDest === "cart" ? "On the cart. Open Carts to place it." : "In the South warehouse.",
          );
        }
        return;
      }
      if (hit.hasAttribute("data-buy")) {
        const { ok, data } = await readJson("/api/buy", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            island: "south",
            goodId: hit.getAttribute("data-buy"),
            qty: 1,
          }),
        });
        if (!ok) {
          if (opts.setStatus) opts.setStatus("Buy failed: " + (data && data.reason));
          return;
        }
        playPaperBuy();
        if (data && data.snapshot && data.snapshot.visitor) {
          play.cash = data.snapshot.visitor.cash;
          play.cart = data.snapshot.visitor.cart || [];
        }
        paintTop();
        paintMarket();
        paintInv();
        if (opts.setStatus) opts.setStatus("In the cart · PAPER · SIMULATED");
        return;
      }
      if (hit.hasAttribute("data-place")) {
        beginPlace();
        return;
      }
      if (hit.hasAttribute("data-withdraw")) {
        const { data } = await readJson("/api/warehouse/withdraw", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ kind: hit.getAttribute("data-withdraw") }),
        });
        await refreshPlay(data);
        return;
      }
      if (hit.hasAttribute("data-pack-start")) {
        startPack();
        return;
      }
      if (hit.hasAttribute("data-stock")) {
        const standId = hit.getAttribute("data-stand");
        const { ok, data } = await readJson("/api/stand/stock", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ standId, from: hit.getAttribute("data-stock") }),
        });
        await refreshPlay(data);
        if (opts.setStatus) {
          opts.setStatus(ok ? "Stock in the cart." : "Could not stock: " + ((data && data.reason) || "fail"));
        }
        return;
      }
      if (hit.hasAttribute("data-hire-person")) {
        const { ok, data } = await readJson("/api/stand/hire", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            standId: hit.getAttribute("data-hire-stand"),
            personId: hit.getAttribute("data-hire-person"),
          }),
        });
        await refreshPlay(data);
        if (ok && opts.onHired) opts.onHired(hit.getAttribute("data-hire-stand"));
        return;
      }
      if (hit.hasAttribute("data-upgrade")) {
        const { data } = await readJson("/api/stand/upgrade", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ standId: hit.getAttribute("data-upgrade") }),
        });
        await refreshPlay(data);
      }
    });
    root.addEventListener("change", async (ev) => {
      const hit = ev.target && ev.target.closest ? ev.target.closest("[data-sticker]") : null;
      if (!hit) return;
      const { data } = await readJson("/api/stand/price", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ standId: hit.getAttribute("data-sticker"), price: Number(hit.value) }),
      });
      await refreshPlay(data);
    });
  }

  root.querySelectorAll("[data-panel]").forEach((btn) => {
    btn.addEventListener("click", () => open(btn.getAttribute("data-panel")));
  });
  root.querySelectorAll("[data-overlay]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setOverlay(toggleViewer(overlay, btn.getAttribute("data-overlay")));
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
  bindChromeActions();

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
