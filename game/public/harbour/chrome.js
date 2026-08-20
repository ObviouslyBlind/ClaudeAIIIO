/**
 * Floating HUD. Panels are extra UI, not extra pages.
 * Polls /api/play.
 */

import { plotDisplayName } from "./parcel-map.js";
import { buyAskModel } from "./buy-ask.js";
import { playPaperBuy } from "./paper-sfx.js";
import { toggleViewer, isLotsViewer, footLevel } from "./overlays.js";
import { mountPackShift } from "./pack.js";
import { formatCartsBody } from "./carts-hud.js";
import { formatSiteMenu, gamesForSite } from "./site-menu.js";
import { compactCash, fullCash } from "./cash-chip.js";
import { formatCashLedger } from "./cash-ledger.js";
import {
  formatMarketplace,
  marketplaceScrollHtml,
  addBasketLine,
  removeBasketLine,
  basketCount,
} from "./marketplace.js";
import { formatHireSheet } from "./hire-sheet.js";
import { formatAccountSheet } from "./account-sheet.js";

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
  try {
    const res = await fetch(url, opts);
    const data = await res.json().catch(() => null);
    return { ok: res.ok, data };
  } catch {
    return { ok: false, data: null };
  }
}

export function mountChrome(opts) {
  const root = document.getElementById("chrome");
  if (!root) return { stop() {}, refresh() {} };

  const cashEl = document.getElementById("balance");
  const cashPlate = cashEl && cashEl.closest ? cashEl.closest(".cash-plate") : null;
  const cashDock = document.getElementById("cash-dock");
  const onlineEl = document.getElementById("online");
  const landCard = document.getElementById("land-card");
  const buyAsk = document.getElementById("buy-ask");
  const standVeil = document.getElementById("stand-veil");
  const standMenu = document.getElementById("stand-menu");
  const crateAsk = document.getElementById("crate-ask");

  let play = null;
  /** Bumped on POST stamps so an in-flight GET /api/play cannot restore stale cash. */
  let playGen = 0;
  let openPanel = null;
  let overlay = "world";
  let placing = false;
  let placingKit = "";
  let marketDest = "warehouse";
  let accountWipe = "";
  let marketAisle = "street";
  let marketIsland = "south";
  let marketQuery = "";
  let marketView = "shop";
  let marketBasket = [];
  let marketFolds = { carts: false, stock: false, goods: false };
  let hirePick = "";
  const packShift = mountPackShift();
  let siteTab = "stock";
  let openSiteId = null;
  let orderSku = null;
  let orderQty = 1;
  const orderAsk = document.getElementById("order-ask");
  const orderVeil = document.getElementById("order-veil");
  const sheetVeil = document.getElementById("sheet-veil");

  function setPlaceHint(text, show) {
    const hint = document.getElementById("place-hint");
    const line = document.getElementById("place-hint-text");
    if (line && text) line.textContent = text;
    if (hint) hint.hidden = !show;
  }

  const HINTS = {
    world: "World: tap the dirt to walk. Green line is the path.",
    lots: "Lots to buy. Vacant $ bars. Click Lots again for your lots.",
    yours: "Your lots and buildings. Click Lots again to hide.",
    foot: "Foot traffic: High (green) / Moderate (yellow) / Low (red) on each named road.",
    minerals: "Minerals are not in yet.",
  };

  function setOverlay(id) {
    overlay = id;
    root.querySelectorAll("[data-overlay]").forEach((b) => {
      const key = b.getAttribute("data-overlay");
      const on = key === "lots" ? isLotsViewer(id) : key === id;
      b.classList.toggle("is-on", on);
      if (key === "lots") {
        b.classList.toggle("is-yours", id === "yours");
        const label = id === "yours" ? "Your lots" : id === "lots" ? "Lots to buy" : "Lots";
        b.setAttribute("aria-label", label);
        b.setAttribute("data-tip", label);
      }
    });
    const hint = document.getElementById("viewer-hint");
    if (hint) hint.textContent = HINTS[id] || HINTS.world;
    if (opts.setStatus) opts.setStatus(HINTS[id] || HINTS.world);
    if (opts.onOverlay) opts.onOverlay(id);
    paintFootLegend();
  }

  function syncSheetVeil() {
    if (!sheetVeil) return;
    const sheet = openPanel === "market" || openPanel === "employees";
    sheetVeil.hidden = !sheet;
  }

  function closePanels() {
    openPanel = null;
    root.querySelectorAll(".float-panel").forEach((p) => {
      p.classList.remove("is-open");
      p.hidden = true;
    });
    root.querySelectorAll("[data-panel]").forEach((b) => {
      b.classList.remove("is-on");
      if (b.hasAttribute("aria-expanded")) b.setAttribute("aria-expanded", "false");
    });
    syncSheetVeil();
  }

  function dismissStandMenu() {
    if (standMenu) standMenu.hidden = true;
    if (standVeil) standVeil.hidden = true;
    const wasOpen = openSiteId != null;
    openSiteId = null;
    if (wasOpen && typeof opts.onCloseStand === "function") opts.onCloseStand();
  }

  function open(id) {
    if (buyAsk && !buyAsk.hidden) {
      buyAsk.hidden = true;
      if (opts.onCloseLand) opts.onCloseLand();
    }
    if (openPanel === id) {
      closePanels();
      return;
    }
    closePanels();
    dismissStandMenu();
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
    syncSheetVeil();
    if (id === "market") {
      const search = document.getElementById("market-search");
      if (search) search.focus();
    }
  }

  function title(text) {
    return `<h2>${text}</h2>`;
  }

  function stampPlay(data) {
    if (!data || data.mode !== "PAPER") return false;
    playGen += 1;
    play = data;
    paintTop();
    if (typeof opts.onPlay === "function") opts.onPlay(play);
    return true;
  }

  function paintTop() {
    if (!play) return;
    if (cashEl) cashEl.textContent = compactCash(play.cash);
    const ledger = document.getElementById("cash-ledger");
    if (ledger) ledger.innerHTML = formatCashLedger(play);
    if (cashPlate) {
      cashPlate.setAttribute(
        "aria-label",
        "PAPER " + fullCash(play.cash) + ". Holdings and income.",
      );
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

  function propertyName() {
    const leases = (play && play.leases) || [];
    const plotId = typeof opts.getPlotId === "function" ? opts.getPlotId() : "";
    const hit = plotId ? leases.find((l) => l.id === plotId) : null;
    if (hit) return hit.name || "Your lot";
    if (leases.length) return leases[0].name || "Your lot";
    return "Your kerb";
  }

  function destLabel() {
    if (marketDest === "road") return propertyName();
    return "South warehouse";
  }

  function marketOpts() {
    return {
      aisle: marketAisle,
      island: marketIsland,
      query: marketQuery,
      cash: play.cash,
      basket: marketBasket,
      view: marketView,
      folds: marketFolds,
    };
  }

  function paintMarketCash() {
    const cash = document.querySelector("#market-body .mp-cash");
    if (cash) cash.textContent = money(play && play.cash);
  }

  function paintMarketCartBadge() {
    const btn = document.querySelector("#market-body [data-market-cart]");
    if (!btn) return;
    const n = basketCount(marketBasket);
    btn.classList.toggle("is-on", marketView === "basket");
    const badge = btn.querySelector(".mp-cart-n");
    if (n) {
      btn.setAttribute("data-count", String(n));
      if (badge) badge.textContent = String(n);
      else btn.insertAdjacentHTML("beforeend", `<span class="mp-cart-n">${n}</span>`);
    } else {
      btn.removeAttribute("data-count");
      if (badge) badge.remove();
    }
  }

  function bodyAisleOn(id) {
    document.querySelectorAll("#market-body [data-aisle]").forEach((btn) => {
      btn.classList.toggle("is-on", btn.getAttribute("data-aisle") === id);
    });
  }

  function paintMarketList(keepY) {
    const scroller = document.querySelector("#market-body .mp-scroll");
    if (!scroller || !play) {
      paintMarket();
      return;
    }
    const y = keepY ? scroller.scrollTop : 0;
    scroller.innerHTML = marketplaceScrollHtml(play, marketOpts());
    scroller.scrollTop = y;
  }

  function paintMarket() {
    const body = document.getElementById("market-body");
    if (!body || !play) return;
    const search = document.getElementById("market-search");
    const keep = search && document.activeElement === search;
    const start = keep ? search.selectionStart : null;
    const end = keep ? search.selectionEnd : null;
    const scroller = body.querySelector(".mp-scroll");
    const y = scroller ? scroller.scrollTop : 0;
    body.innerHTML = formatMarketplace(play, marketOpts());
    const next = document.getElementById("market-search");
    if (next && keep) {
      next.focus();
      if (start != null && end != null && typeof next.setSelectionRange === "function") {
        next.setSelectionRange(start, end);
      }
    }
    const nextScroll = body.querySelector(".mp-scroll");
    if (nextScroll) nextScroll.scrollTop = y;
  }

  function hideOrderAsk() {
    orderSku = null;
    if (orderAsk) orderAsk.hidden = true;
    if (orderVeil) orderVeil.hidden = true;
  }

  function hideCrateAsk() {
    if (crateAsk) crateAsk.hidden = true;
  }

  function paintCrateAsk(extras) {
    if (!crateAsk) return;
    if (!extras || !extras.crate) {
      crateAsk.hidden = true;
      return;
    }
    closePanels();
    hideOrderAsk();
    if (buyAsk) buyAsk.hidden = true;
    if (landCard) landCard.hidden = true;
    crateAsk.hidden = false;
    crateAsk.innerHTML = `
      <h2>Package</h2>
      <p class="whisper">On the kerb. Take all, or close and come back. 60s then warehouse.</p>
      <div class="land-row">
        <button type="button" class="take-all" id="crate-take">Take all</button>
        <button type="button" class="take-all" id="crate-close">Close</button>
      </div>
    `;
    const take = crateAsk.querySelector("#crate-take");
    const close = crateAsk.querySelector("#crate-close");
    if (take && extras.onTake) take.addEventListener("click", extras.onTake);
    if (close) {
      close.addEventListener("click", () => {
        crateAsk.hidden = true;
        if (typeof extras.onClose === "function") extras.onClose();
      });
    }
    take?.focus();
  }

  function catalogSku(id) {
    return ((play && play.catalog) || []).find((s) => s.id === id);
  }

  function paintOrderAsk() {
    if (!orderAsk || !orderSku || !play) return;
    const row = catalogSku(orderSku);
    if (!row) {
      hideOrderAsk();
      return;
    }
    const unit = Number(row.paperPrice) || 0;
    const total = unit * orderQty;
    const loc = destLabel();
    const waitS = Math.round(Number(play.deliveryWaitMs || 60000) / 1000);
    orderAsk.hidden = false;
    if (orderVeil) orderVeil.hidden = false;
    orderAsk.innerHTML = `
      <h2>Buy ${row.label}</h2>
      <p class="order-unit">${money(unit)} each</p>
      <p class="order-label">How many</p>
      <div class="order-qty">
        <button type="button" class="ghost" data-order-qty="-1" ${orderQty <= 1 ? "disabled" : ""}>−</button>
        <strong>${orderQty}</strong>
        <button type="button" class="ghost" data-order-qty="1" ${orderQty >= 10 ? "disabled" : ""}>+</button>
      </div>
      <p class="order-label">Where</p>
      <div class="dest-row">
        <button type="button" class="dest ${marketDest === "road" ? "is-on" : ""}" data-order-dest="road">${propertyName()}</button>
        <button type="button" class="dest ${marketDest === "warehouse" ? "is-on" : ""}" data-order-dest="warehouse">Warehouse</button>
      </div>
      <div class="order-pay">
        <p class="buy-loc is-ask">${loc}${marketDest === "road" ? " · " + waitS + "s on the kerb" : ""}</p>
        <button type="button" class="go" id="order-pay">Pay ${money(total)}</button>
        <button type="button" class="ghost" id="order-cancel">Cancel</button>
      </div>
    `;
    orderAsk.querySelector("#order-pay")?.focus();
  }

  async function submitOrder() {
    if (!orderSku) return;
    const pose = typeof opts.getPose === "function" ? opts.getPose() : {};
    const selectedId = typeof opts.getPlotId === "function" ? opts.getPlotId() : "";
    const leases = (play && play.leases) || [];
    const ownedId = leases.some((l) => l.id === selectedId)
      ? selectedId
      : (leases[0] && leases[0].id) || "";
    const { ok, data } = await readJson("/api/market/order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        skus: [orderSku],
        island: "south",
        dest: marketDest === "road" ? "road" : "warehouse",
        qty: orderQty,
        x: pose && pose.x,
        z: pose && pose.z,
        plotId: marketDest === "road" ? ownedId || undefined : undefined,
      }),
    });
    hideOrderAsk();
    if (!ok) {
      if (opts.setStatus) opts.setStatus("Order failed: " + (data && data.reason));
      return;
    }
    playPaperBuy();
    marketBasket = removeBasketLine(marketBasket, orderSku, "order");
    await refreshPlay(data);
    const delivery = data && data.delivery;
    if (delivery && delivery.dest === "road") {
      closePanels();
      if (typeof opts.onOrder === "function") opts.onOrder(delivery);
    } else {
      open("warehouse");
    }
    if (opts.setStatus) {
      opts.setStatus(
        marketDest === "road"
          ? "Yellow van from the port."
          : "Paid. In the South warehouse.",
      );
    }
  }

  async function submitBasket() {
    if (!marketBasket.length) return;
    const pose = typeof opts.getPose === "function" ? opts.getPose() : {};
    const selectedId = typeof opts.getPlotId === "function" ? opts.getPlotId() : "";
    const leases = (play && play.leases) || [];
    const ownedId = leases.some((l) => l.id === selectedId)
      ? selectedId
      : (leases[0] && leases[0].id) || "";
    const skus = [];
    for (const row of marketBasket.filter((r) => r.via !== "good")) {
      const q = Math.max(1, Math.min(10, Number(row.qty) || 1));
      for (let i = 0; i < q; i++) skus.push(row.sku);
    }
    let last = null;
    if (skus.length) {
      const { ok, data } = await readJson("/api/market/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          skus,
          island: "south",
          dest: marketDest === "road" ? "road" : "warehouse",
          qty: 1,
          x: pose && pose.x,
          z: pose && pose.z,
          plotId: marketDest === "road" ? ownedId || undefined : undefined,
        }),
      });
      if (!ok) {
        if (opts.setStatus) opts.setStatus("Order failed: " + (data && data.reason));
        return;
      }
      last = data;
      playPaperBuy();
      await refreshPlay(data);
    }
    for (const row of marketBasket.filter((r) => r.via === "good")) {
      const q = Math.max(1, Math.min(10, Number(row.qty) || 1));
      for (let i = 0; i < q; i++) {
        const { ok, data } = await readJson("/api/buy", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ island: "south", goodId: row.sku, qty: 1 }),
        });
        if (!ok) {
          if (opts.setStatus) opts.setStatus("Buy failed: " + (data && data.reason));
          return;
        }
        playPaperBuy();
        if (data && data.snapshot && data.snapshot.visitor) {
          playGen += 1;
          play.cash = data.snapshot.visitor.cash;
          play.cart = data.snapshot.visitor.cart || [];
        }
      }
    }
    marketBasket = [];
    marketView = "shop";
    const delivery = last && last.delivery;
    if (delivery && delivery.dest === "road") {
      closePanels();
      if (typeof opts.onOrder === "function") opts.onOrder(delivery);
    } else {
      open("warehouse");
    }
    if (opts.setStatus) opts.setStatus("Paid. In the South warehouse.");
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

  function beginPlace(kitId) {
    placing = true;
    placingKit = kitId || "";
    if (landCard) landCard.hidden = true;
    if (buyAsk) buyAsk.hidden = true;
    setOverlay("yours");
    closePanels();
    setPlaceHint("Tap the green YOURS lot, or the verge by the road.", true);
    if (opts.setStatus) {
      opts.setStatus("Tap your lot or the verge out to the main road to place the cart.");
    }
    if (opts.onPlaceMode) opts.onPlaceMode(true);
  }

  function paintStaff() {
    const body = document.getElementById("staff-body");
    if (!body || !play) return;
    const sites = [...(play.stands || []), ...(play.workSites || [])];
    if (hirePick && !sites.some((s) => s.id === hirePick)) hirePick = "";
    body.innerHTML = formatHireSheet(play, { selectedId: hirePick });
  }

  function paintAccount() {
    const body = document.getElementById("acct-body");
    if (!body || !play) return;
    body.innerHTML = formatAccountSheet(play, { wipe: accountWipe });
  }

  function isKitKind(kind) {
    return ((play && play.catalog) || []).some((s) => s.id === kind && s.role === "kit");
  }

  function paintWarehouse() {
    const body = document.getElementById("warehouse-body");
    if (!body || !play) return;
    const wh = play.warehouse || { items: [], feePerDay: 5, island: "south" };
    const items = wh.items || [];
    const island = wh.island === "north" ? "North" : "South";
    body.innerHTML = `
      ${title("Warehouse")}
      <p class="whisper">${island} dock · buys land here · ${money(wh.feePerDay)}/day while occupied</p>
      ${
        items.length
          ? items
              .map((r) => {
                const label = ((play.catalog || []).find((s) => s.id === r.kind) || {}).label || r.kind;
                const kit = isKitKind(r.kind);
                return `
        <div class="inv-row">
          <span>${label} × ${r.qty}</span>
          ${
            kit
              ? `<button type="button" data-place="${r.kind}">Place</button>`
              : `<button type="button" data-withdraw="${r.kind}">Bring to me</button>`
          }
        </div>`;
              })
              .join("")
          : "<p>Nothing stored. Marketplace Add Cart pays into this warehouse.</p>"
      }
    `;
  }

  function packLine(ok, data) {
    if (!ok) {
      const why = data && data.reason;
      if (why === "cooldown") return "Wait a minute — this cart just ran.";
      if (why === "hired") return "Hired staff already sell.";
      return "Pack skipped";
    }
    const sold = Number(data && data.sold) || 0;
    const earned = Number(data && data.earned) || 0;
    if (sold > 0) return `Sold ${sold} · ${money(earned)}`;
    const why = (data && data.burstReason) || (data && data.reason);
    if (why === "empty") return "No sales — load stock from the warehouse.";
    if (why === "no_propane") return "No sales — the fry cart needs propane.";
    if (why === "no_hits") return "No sales — tap during the shift.";
    if (why === "hired") return "Hired staff already sell.";
    return "No sales this shift.";
  }

  function qtyOf(kind) {
    const inv = ((play && play.inventory) || []).find((r) => r.kind === kind);
    const wh = ((((play && play.warehouse) || {}).items) || []).find((r) => r.kind === kind);
    return (Number(inv && inv.qty) || 0) + (Number(wh && wh.qty) || 0);
  }

  function packCanSell(site) {
    if (!site) return { ok: true };
    const stockId = site.stockId || "hotdogs";
    const onCart = Number(site.hotdogs != null ? site.hotdogs : site.stock) || 0;
    if (onCart + qtyOf(stockId) < 1) return { ok: false, why: "empty" };
    const fry = site.kind === "fish_chips" || stockId === "fish_chips";
    if (fry && (Number(site.propaneLeft) || 0) < 1 && qtyOf("propane") < 1) {
      return { ok: false, why: "no_propane" };
    }
    return { ok: true };
  }

  function startPack(goods, standId, title) {
    const site = findSite(standId);
    if (site && site.hired) {
      if (opts.setStatus) opts.setStatus("Hired staff already sell.");
      return;
    }
    const wait = Number(play && play.packCooldownMs) || 0;
    if (wait > 800) {
      if (opts.setStatus) opts.setStatus("Wait " + Math.ceil(wait / 1000) + "s before the next shift.");
      return;
    }
    const stocked = packCanSell(site);
    if (!stocked.ok) {
      const line =
        stocked.why === "no_propane"
          ? "No propane — fuel the fry cart first."
          : "No stock — load it from the warehouse first.";
      if (play) play.lastShiftLine = line;
      if (site) paintStandMenu(site);
      if (opts.setStatus) opts.setStatus(line);
      return;
    }
    packShift.open({
      goods,
      title,
      async onDone(hits) {
        const { ok, data } = await readJson("/api/shift/pack", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ hits, standId: standId || undefined }),
        });
        if (data && data.play) stampPlay(data.play);
        const line = packLine(ok, data);
        if (play) play.lastShiftLine = line;
        if (openPanel === "inventory") paintInv();
        const fresh = findSite(standId);
        if (fresh) paintStandMenu(fresh);
        if (opts.setStatus) opts.setStatus(line);
      },
    });
  }

  function findSite(id) {
    if (!play || !id) return null;
    return (
      ((play.sites || []).find((s) => s.id === id)) ||
      ((play.stands || []).find((s) => s.id === id)) ||
      ((play.workSites || []).find((s) => s.id === id)) ||
      null
    );
  }

  function paintStandMenu(stand, onStock, onHire) {
    if (!standMenu) return;
    if (!stand) {
      dismissStandMenu();
      return;
    }
    closePanels();
    openSiteId = stand.id;
    standMenu.hidden = false;
    if (standVeil) standVeil.hidden = false;
    const live = findSite(stand.id) || stand;
    standMenu.innerHTML = formatSiteMenu(live, play, siteTab);
    function closeStand() {
      dismissStandMenu();
    }
    standMenu.querySelector("#stand-close")?.addEventListener("click", closeStand);
    standMenu.querySelectorAll("[data-site-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        siteTab = btn.getAttribute("data-site-tab") || "stock";
        paintStandMenu(live, onStock, onHire);
      });
    });
    const priceEl = standMenu.querySelector("#sticker-price");
    const priceOut = standMenu.querySelector("[data-sticker-out]");
    if (priceEl) {
      const todayN = Number(
        live && live.todayPrice != null
          ? live.todayPrice
          : play && play.todayPrice != null
            ? play.todayPrice
            : 6,
      );
      const paintRead = () => {
        const v = Number(priceEl.value);
        const d = Math.abs(v - todayN);
        const today = d < 0.01;
        const near = !today && d <= 1.5;
        const far = d > 1.5;
        if (priceOut) {
          priceOut.textContent = money(v);
          const read = priceOut.closest(".sticker-read");
          if (read) {
            read.classList.toggle("is-today", today);
            read.classList.toggle("is-near", near);
            read.classList.toggle("is-far", far);
          }
        }
        const slide = priceEl.closest(".sticker-slide");
        if (slide) slide.setAttribute("data-tone", today ? "today" : near ? "near" : "far");
        const knob = slide && slide.querySelector("[data-sticker-knob]");
        const lo = Number(priceEl.min);
        const hi = Number(priceEl.max);
        const span = hi - lo;
        if (knob && span > 0) knob.style.left = `${((v - lo) / span) * 100}%`;
      };
      paintRead();
      priceEl.addEventListener("input", paintRead);
      priceEl.addEventListener("change", async () => {
        await readJson("/api/stand/price", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ standId: live.id, price: Number(priceEl.value) }),
        });
        paintTop();
      });
    }
    const qtyEl = standMenu.querySelector("#stock-qty");
    const qtyOut = standMenu.querySelector("[data-qty-out]");
    if (qtyEl && qtyOut) {
      qtyEl.addEventListener("input", () => {
        qtyOut.textContent = String(qtyEl.value);
      });
    }
    async function stockFrom(from) {
      const qtyEl = standMenu.querySelector("#stock-qty");
      const qty = qtyEl ? Number(qtyEl.value) : 0;
      const { ok, data } = await readJson("/api/stand/stock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ standId: live.id, qty, from }),
      });
      if (data && data.play) stampPlay(data.play);
      const fresh = findSite(live.id);
      paintStandMenu(fresh, onStock, onHire);
      if (opts.setStatus) {
        opts.setStatus(ok ? "Stock on this site." : "Could not stock: " + ((data && data.reason) || "fail"));
      }
      if (ok && typeof onStock === "function") onStock();
      if (ok && opts.onStocked) opts.onStocked(live.id);
    }
    standMenu.querySelectorAll("[data-stock]").forEach((btn) => {
      btn.addEventListener("click", () => stockFrom(btn.getAttribute("data-stock")));
    });
    async function fuelFrom(from) {
      const { ok, data } = await readJson("/api/stand/fuel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ standId: live.id, from }),
      });
      if (data && data.play) stampPlay(data.play);
      const fresh = findSite(live.id);
      paintStandMenu(fresh, onStock, onHire);
      if (opts.setStatus) {
        opts.setStatus(ok ? "Propane on this cart." : "Could not fuel: " + ((data && data.reason) || "fail"));
      }
    }
    standMenu.querySelectorAll("[data-fuel]").forEach((btn) => {
      btn.addEventListener("click", () => fuelFrom(btn.getAttribute("data-fuel")));
    });
    const hireBtn = standMenu.querySelector("#hire-site");
    if (hireBtn) {
      hireBtn.addEventListener("click", async () => {
        const { ok, data } = await readJson("/api/stand/hire", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ standId: hireBtn.getAttribute("data-hire-site") }),
        });
        if (data && data.play) stampPlay(data.play);
        const fresh = findSite(live.id);
        paintStandMenu(fresh, onStock, onHire);
        if (ok && typeof onHire === "function") onHire();
        if (ok && opts.onHired) opts.onHired(live.id);
      });
    }
    const fireBtn = standMenu.querySelector("[data-fire-site]");
    if (fireBtn) {
      fireBtn.addEventListener("click", async () => {
        const id = fireBtn.getAttribute("data-fire-site");
        const { ok, data } = await readJson("/api/stand/fire", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ standId: id }),
        });
        if (data && data.play) stampPlay(data.play);
        const fresh = findSite(live.id);
        paintStandMenu(fresh, onStock, onHire);
        if (ok && opts.onFired) opts.onFired(id);
      });
    }
    standMenu.querySelectorAll("[data-upgrade]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const { data } = await readJson("/api/stand/upgrade", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            standId: btn.getAttribute("data-upgrade"),
            upgradeId: btn.getAttribute("data-upgrade-id") || "fridge",
          }),
        });
        if (data && data.play) stampPlay(data.play);
        const fresh = findSite(live.id);
        paintStandMenu(fresh, onStock, onHire);
      });
    });
    standMenu.querySelectorAll("[data-pack-start]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (live.hired) return;
        startPack(gamesForSite(live), live.id, btn.getAttribute("data-game") || (live.games && live.games[0]) || "Fruit slice");
      });
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
    if (data && data.play) stampPlay(data.play);
    else paintTop();
    paintPanels();
  }

  function bindChromeActions() {
    if (root.dataset.cartBound) return;
    root.dataset.cartBound = "1";
    root.addEventListener("click", async (ev) => {
      const hit = ev.target && ev.target.closest
        ? ev.target.closest(
            "[data-dest], [data-order], [data-buy], [data-place], [data-withdraw], [data-open-stand], [data-order-qty], [data-order-dest], [data-aisle], [data-island], [data-sheet-close], [data-hire-pick], [data-hire-back], [data-sheet-hire], [data-add-cart], [data-market-cart], [data-basket-remove], [data-basket-buy], [data-basket-pay], [data-look], [data-wipe], [data-wipe-go], [data-wipe-cancel], #order-pay, #order-cancel",
          )
        : null;
      if (!hit || (standMenu && standMenu.contains(hit))) return;
      if (hit.hasAttribute("data-sheet-close")) {
        closePanels();
        return;
      }
      if (hit.hasAttribute("data-aisle")) {
        marketAisle = hit.getAttribute("data-aisle") || "street";
        marketView = "shop";
        paintMarketList(false);
        bodyAisleOn(marketAisle);
        return;
      }
      if (hit.hasAttribute("data-market-cart")) {
        marketView = marketView === "basket" ? "shop" : "basket";
        paintMarketCartBadge();
        paintMarketList(false);
        return;
      }
      if (hit.hasAttribute("data-add-cart")) {
        marketBasket = addBasketLine(
          marketBasket,
          hit.getAttribute("data-add-cart"),
          hit.getAttribute("data-via") || "order",
        );
        paintMarketCartBadge();
        if (opts.setStatus) opts.setStatus("In the market cart.");
        return;
      }
      if (hit.hasAttribute("data-basket-remove")) {
        marketBasket = removeBasketLine(
          marketBasket,
          hit.getAttribute("data-basket-remove"),
          hit.getAttribute("data-via") || "order",
        );
        paintMarketCartBadge();
        paintMarketList(true);
        return;
      }
      if (hit.hasAttribute("data-basket-buy")) {
        const sku = hit.getAttribute("data-basket-buy");
        const via = hit.getAttribute("data-via") || "order";
        const line = marketBasket.find((r) => r.sku === sku && r.via === via);
        if (via === "good") {
          const qty = Math.max(1, Number(line && line.qty) || 1);
          for (let i = 0; i < qty; i++) {
            const { ok, data } = await readJson("/api/buy", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ island: "south", goodId: sku, qty: 1 }),
            });
            if (!ok) {
              if (opts.setStatus) opts.setStatus("Buy failed: " + (data && data.reason));
              return;
            }
            playPaperBuy();
            if (data && data.snapshot && data.snapshot.visitor) {
              playGen += 1;
              play.cash = data.snapshot.visitor.cash;
              play.cart = data.snapshot.visitor.cart || [];
            }
          }
          marketBasket = removeBasketLine(marketBasket, sku, "good");
          paintTop();
          paintMarketCash();
          paintMarketCartBadge();
          paintMarketList(true);
          if (opts.setStatus) opts.setStatus("In the cart.");
          return;
        }
        orderSku = sku;
        orderQty = Math.max(1, Math.min(10, Number(line && line.qty) || 1));
        paintOrderAsk();
        return;
      }
      if (hit.hasAttribute("data-basket-pay")) {
        await submitBasket();
        return;
      }
      if (hit.hasAttribute("data-island")) {
        const isle = hit.getAttribute("data-island");
        if (isle === "north") return;
        marketIsland = "south";
        return;
      }
      if (hit.hasAttribute("data-hire-pick")) {
        hirePick = hit.getAttribute("data-hire-pick") || "";
        paintStaff();
        return;
      }
      if (hit.hasAttribute("data-hire-back")) {
        hirePick = "";
        paintStaff();
        return;
      }
      if (hit.hasAttribute("data-sheet-hire")) {
        const standId = hit.getAttribute("data-sheet-hire");
        const { ok, data } = await readJson("/api/stand/hire", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ standId }),
        });
        if (data && data.play) stampPlay(data.play);
        paintStaff();
        if (ok && opts.onHired) opts.onHired(standId);
        if (opts.setStatus) {
          opts.setStatus(ok ? "Hired on this site." : "Could not hire: " + ((data && data.reason) || "fail"));
        }
        return;
      }
      if (hit.hasAttribute("data-order-qty")) {
        orderQty = Math.max(1, Math.min(10, orderQty + Number(hit.getAttribute("data-order-qty") || 0)));
        paintOrderAsk();
        return;
      }
      if (hit.hasAttribute("data-order-dest")) {
        marketDest = hit.getAttribute("data-order-dest") === "road" ? "road" : "warehouse";
        paintOrderAsk();
        return;
      }
      if (hit.id === "order-cancel") {
        hideOrderAsk();
        return;
      }
      if (hit.id === "order-pay") {
        await submitOrder();
        return;
      }
      if (hit.hasAttribute("data-dest")) {
        marketDest = hit.getAttribute("data-dest") === "road" ? "road" : "warehouse";
        return;
      }
      if (hit.hasAttribute("data-order")) {
        orderSku = hit.getAttribute("data-order");
        orderQty = 1;
        paintOrderAsk();
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
          playGen += 1;
          play.cash = data.snapshot.visitor.cash;
          play.cart = data.snapshot.visitor.cart || [];
        }
        paintTop();
        paintMarket();
        paintInv();
        if (opts.setStatus) opts.setStatus("In the cart.");
        return;
      }
      if (hit.hasAttribute("data-wipe-cancel")) {
        accountWipe = "";
        paintAccount();
        return;
      }
      if (hit.hasAttribute("data-wipe")) {
        accountWipe = hit.getAttribute("data-wipe") || "";
        paintAccount();
        return;
      }
      if (hit.hasAttribute("data-wipe-go")) {
        const kind = hit.getAttribute("data-wipe-go");
        if (kind === "reset") {
          const { data } = await readJson("/api/play/reset", { method: "POST" });
          accountWipe = "";
          if (data && data.play) stampPlay(data.play);
          paintPanels();
          if (typeof opts.onLook === "function") opts.onLook(play && play.look);
          if (opts.setStatus) opts.setStatus("Save reset.");
          return;
        }
        if (kind === "delete") {
          if (accountWipe === "delete-1") {
            accountWipe = "delete-2";
            paintAccount();
            return;
          }
          if (accountWipe === "delete-2") {
            accountWipe = "delete-3";
            paintAccount();
            return;
          }
          if (accountWipe === "delete-3") {
            const { data } = await readJson("/api/play/delete", { method: "POST" });
            accountWipe = "";
            if (data && data.play) stampPlay(data.play);
            paintPanels();
            if (typeof opts.onLook === "function") opts.onLook(play && play.look);
            if (opts.setStatus) opts.setStatus("Account deleted on this shard.");
          }
          return;
        }
        return;
      }
      if (hit.hasAttribute("data-look")) {
        const field = hit.getAttribute("data-look");
        const id = hit.getAttribute("data-look-id");
        const body = {};
        body[field] = id;
        const { data } = await readJson("/api/look", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        if (data && data.play) stampPlay(data.play);
        paintAccount();
        if (typeof opts.onLook === "function") opts.onLook((data && data.look) || (play && play.look));
        return;
      }
      if (hit.hasAttribute("data-place")) {
        beginPlace(hit.getAttribute("data-place"));
        return;
      }
      if (hit.hasAttribute("data-open-stand")) {
        const id = hit.getAttribute("data-open-stand");
        if (typeof opts.onOpenStand === "function") opts.onOpenStand(id);
        else paintStandMenu(findSite(id));
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
    });
    root.addEventListener("toggle", (ev) => {
      const fold = ev.target;
      if (!fold || fold.getAttribute == null || !fold.hasAttribute("data-fold")) return;
      const id = fold.getAttribute("data-fold");
      if (id) marketFolds[id] = fold.open;
    }, true);
    let marketSearchTimer = 0;
    root.addEventListener("input", (ev) => {
      const hit = ev.target && ev.target.closest ? ev.target.closest("#market-search") : null;
      if (!hit) return;
      marketQuery = hit.value || "";
      clearTimeout(marketSearchTimer);
      marketSearchTimer = setTimeout(() => paintMarketList(false), 80);
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
    const gen = playGen;
    const { data } = await readJson("/api/play");
    if (gen !== playGen) return;
    if (data && data.mode === "PAPER") {
      play = data;
      paintTop();
      paintFootLegend();
      const ae = document.activeElement;
      const typingMarket = ae && ae.id === "market-search";
      if (openPanel === "market") {
        paintMarketCash();
      } else if (root.querySelector(".float-panel.is-open") && !typingMarket) {
        paintPanels();
      }
      if (opts.onPlay) opts.onPlay(play);
      if (openSiteId && standMenu && !standMenu.hidden) {
        const ae = document.activeElement;
        const typing = ae && standMenu.contains(ae) && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA");
        if (!typing) {
          const fresh = findSite(openSiteId);
          if (fresh) paintStandMenu(fresh);
        }
      }
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

  function plotIsYours(plot) {
    if (!plot || !plot.id) return false;
    const leases = (play && play.leases) || [];
    return leases.some((row) => row.id === plot.id);
  }

  function paintLand(plot, extras) {
    if (!landCard) return;
    if (buyAsk && !buyAsk.hidden) return;
    if (!plot) {
      landCard.hidden = true;
      return;
    }
    landCard.hidden = false;
    const band = extras && extras.band ? extras.band : "";
    const crate = extras && extras.crate;
    const roadside = extras && extras.roadside;
    const title = roadside ? "Roadside crate" : plotDisplayName(plot);
    const yours = !roadside && plotIsYours(plot);
    const taken = !roadside && !yours && Boolean(plot.owner) && plot.owner !== "visitor";
    const vacant = !roadside && !yours && !taken;
    const price = roadside
      ? ""
      : vacant
        ? `<button type="button" class="land-buy take-all" id="land-lease">${money(plot.price)} · ${plot.class === "cart_pad" ? "Buy pad" : "Buy lot"}</button>`
        : `<p class="price">${yours ? "YOURS" : "taken"}</p>`;
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
    if (takeBtn && extras && extras.onTake) {
      takeBtn.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        landCard.hidden = true;
        extras.onTake();
      });
    }
  }

  const placeCancel = document.getElementById("place-cancel");
  if (placeCancel) {
    placeCancel.addEventListener("click", () => {
      placing = false;
      placingKit = "";
      setPlaceHint("", false);
      setOverlay("lots");
      if (opts.onPlaceMode) opts.onPlaceMode(false);
      if (opts.setStatus) opts.setStatus("Place cancelled.");
    });
  }
  function bindCashDock() {
    if (!cashDock || !cashPlate) return;
    function setOpen(on) {
      cashDock.classList.toggle("is-open", on);
      cashPlate.setAttribute("aria-expanded", on ? "true" : "false");
    }
    cashPlate.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      setOpen(!cashDock.classList.contains("is-open"));
    });
    cashPlate.addEventListener("keydown", (ev) => {
      if (ev.key !== "Enter" && ev.key !== " ") return;
      ev.preventDefault();
      setOpen(!cashDock.classList.contains("is-open"));
    });
    document.addEventListener("pointerdown", (ev) => {
      if (!cashDock.classList.contains("is-open")) return;
      if (cashDock.contains(ev.target)) return;
      setOpen(false);
    });
  }

  if (orderVeil) {
    orderVeil.addEventListener("click", hideOrderAsk);
  }
  if (standVeil) {
    standVeil.addEventListener("click", () => {
      dismissStandMenu();
    });
  }
  if (sheetVeil) {
    sheetVeil.addEventListener("click", () => {
      closePanels();
    });
  }
  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "Escape") return;
    if (orderAsk && !orderAsk.hidden) {
      hideOrderAsk();
      return;
    }
    const pack = document.getElementById("pack-shift");
    if (pack && !pack.hidden) return;
    if (openPanel) closePanels();
  });
  bindCashDock();
  bindChromeActions();

  setOverlay("lots");

  return {
    stop() {
      clearInterval(timer);
    },
    refresh: poll,
    applyPlay(data) {
      stampPlay(data);
    },
    isPlacing: () => placing,
    getPlaceKit: () => placingKit,
    clearPlacing() {
      placing = false;
      placingKit = "";
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
    hideCrateAsk,
    paintCrateAsk,
    hideOrderAsk,
    paintBuyAsk,
    paintLand,
    paintStandMenu,
    hideStandMenu() {
      dismissStandMenu();
    },
  };
}
