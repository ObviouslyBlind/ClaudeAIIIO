/**
 * Floating HUD. Panels are extra UI, not extra pages.
 * Polls /api/play.
 */

import { plotDisplayName } from "./parcel-map.js";
import { buyAskModel, unitAskModel, landAskModel } from "./buy-ask.js";
import { playPaperBuy } from "./paper-sfx.js";
import {
  toggleViewer,
  isLotsViewer,
  footLevel,
  viewerCaption,
  viewerHint,
  cycleProperties,
  propertiesCaption,
} from "./overlays.js";
import { mountPackShift } from "./pack.js";
import { formatBooksBody } from "./books-hud.js";
import { formatInventoryBody } from "./inventory-hud.js";
import { formatSiteMenu, gamesForSite, stickerFromPct } from "./site-menu.js";
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
import { findBuilding, findUnit, formatBuildingSheet, formatOrderDests, ownedShopUnits, ownsBuildingDirt } from "./units-hud.js";

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
  const sellAsk = document.getElementById("sell-ask");
  const standVeil = document.getElementById("stand-veil");
  const standMenu = document.getElementById("stand-menu");
  const crateAsk = document.getElementById("crate-ask");

  let play = null;
  /** Bumped on POST stamps so an in-flight GET /api/play cannot restore stale cash. */
  let playGen = 0;
  let openPanel = null;
  let overlay = "world";
  let placing = false;
  let booksExpanded = false;
  let placingKit = "";
  let marketDest = "";
  let pendingBasketPay = false;
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
  let unitBuildingId = "";
  let unitView = "sale";
  let unitFloor = 0;
  let unitRoomId = "";
  let roomLocked = false;
  let marketUnitId = "";
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
    yours: "Your Lots. Click Lots again to hide.",
    foot: "Foot traffic: High (green) / Moderate (yellow) / Low (red) on each named road.",
    landlord: "Buy the dirt under a building for $15,000. You do not need this to run a room.",
  };

  let propertiesMode = "off";

  function paintLandlordChip() {
    root.querySelectorAll('[data-overlay="landlord"]').forEach((b) => {
      const show = ownsBuildingDirt(play);
      b.hidden = !show;
      b.setAttribute("aria-label", "Landlord");
      b.setAttribute("data-tip", "Landlord");
      if (!show && overlay === "landlord") overlay = "world";
    });
  }

  function paintViewerChrome() {
    root.querySelectorAll("[data-overlay]").forEach((b) => {
      const key = b.getAttribute("data-overlay");
      const on = key === "lots" ? isLotsViewer(overlay) : key === overlay;
      b.classList.toggle("is-on", on);
      if (key === "lots") {
        b.classList.toggle("is-yours", overlay === "yours");
        const label = isLotsViewer(overlay) ? viewerCaption(overlay, propertiesMode) : "Lots";
        b.setAttribute("aria-label", label);
        b.setAttribute("data-tip", label);
      }
      if (key === "landlord") {
        const show = ownsBuildingDirt(play);
        b.hidden = !show;
        b.setAttribute("aria-label", "Landlord");
        b.setAttribute("data-tip", "Landlord");
        if (!show && overlay === "landlord") overlay = "world";
      }
    });
    const propBtn = root.querySelector('[data-toggle="properties"]');
    if (propBtn) {
      const on = propertiesMode !== "off";
      propBtn.classList.toggle("is-on", on);
      propBtn.classList.toggle("is-yours", propertiesMode === "yours");
      propBtn.setAttribute("aria-pressed", on ? "true" : "false");
      const label = propertiesCaption(propertiesMode);
      propBtn.setAttribute("aria-label", label);
      propBtn.setAttribute("data-tip", label);
    }
    const text = viewerHint(overlay, propertiesMode) || HINTS[overlay] || HINTS.world;
    const hint = document.getElementById("viewer-hint");
    if (hint) hint.textContent = text;
    if (opts.setStatus) opts.setStatus(text);
  }

  function setOverlay(id) {
    if (id === "landlord" && !ownsBuildingDirt(play)) {
      if (opts.setStatus) opts.setStatus("Buy the dirt under a building first.");
      return;
    }
    overlay = id;
    paintViewerChrome();
    if (opts.onOverlay) opts.onOverlay(id);
    paintFootLegend();
    if (id === "landlord" && !roomLocked) {
      unitView = "landlord";
      unitBuildingId = "landlord";
      paintBuildingSheet("landlord");
    }
  }

  function emitProperties() {
    if (opts.onProperties) {
      opts.onProperties(propertiesMode !== "off", propertiesMode);
    }
  }

  function setPropertiesOn(on) {
    const want = Boolean(on);
    const next = want ? (propertiesMode === "off" ? "sale" : propertiesMode) : "off";
    if (next === propertiesMode) return;
    propertiesMode = next;
    if (propertiesMode === "off" && !roomLocked) dismissStandMenu();
    paintViewerChrome();
    emitProperties();
  }

  function cyclePropertiesChip() {
    propertiesMode = cycleProperties(propertiesMode);
    paintViewerChrome();
    emitProperties();
    if (propertiesMode === "off") {
      if (!roomLocked) dismissStandMenu();
      return;
    }
    if (propertiesMode === "yours") {
      unitView = "yours-all";
      unitBuildingId = "yours";
      paintBuildingSheet("yours");
      return;
    }
    if (opts.setStatus) opts.setStatus("Properties for sale. Tap a house $ or a vacant room.");
  }

  function syncSheetVeil() {
    if (!sheetVeil) return;
    const sheet = openPanel === "market" || openPanel === "employees" || (openPanel === "books" && booksExpanded);
    sheetVeil.hidden = !sheet;
  }

  function closePanels() {
    openPanel = null;
    booksExpanded = false;
    const booksPanel = document.getElementById("panel-books");
    if (booksPanel) booksPanel.classList.remove("sheet-center");
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

  function leaveDollhouse(force) {
    if (roomLocked && !force) return;
    roomLocked = false;
    paintExitRoom();
    if (typeof opts.onDollhouse === "function") opts.onDollhouse(null);
  }

  /** Unlocked sale preview dumps when you walk. Locked rooms stay until Exit room. */
  function dumpPreview() {
    if (roomLocked) return false;
    leaveDollhouse();
    return true;
  }

  function enterDollhouse(lock) {
    if (!unitBuildingId || typeof opts.onDollhouse !== "function") return;
    if (unitBuildingId === "landlord" || unitBuildingId === "yours") return;
    const building = findBuilding(play, unitBuildingId);
    const room = building && unitRoomId ? (building.rooms || []).find((r) => r.id === unitRoomId) : null;
    if (lock) roomLocked = true;
    opts.onDollhouse({
      buildingId: unitBuildingId,
      floor: unitFloor,
      building,
      unitId: unitRoomId || "",
      room,
      locked: roomLocked,
    });
    paintExitRoom();
  }

  function exitRoom() {
    const building = findBuilding(play, unitBuildingId);
    roomLocked = false;
    unitRoomId = "";
    unitView = propertiesMode === "yours" ? "yours-all" : "sale";
    if (typeof opts.onExitRoom === "function") opts.onExitRoom(building);
    leaveDollhouse(true);
    dismissStandMenu();
    paintExitRoom();
    if (opts.setStatus) opts.setStatus("Back on the kerb.");
  }

  function paintExitRoom() {
    const btn = document.getElementById("exit-room");
    if (!btn) return;
    btn.hidden = !roomLocked;
  }

  function dismissStandMenu() {
    if (standMenu) standMenu.hidden = true;
    if (standVeil) standVeil.hidden = true;
    const wasOpen = openSiteId != null || unitBuildingId;
    openSiteId = null;
    if (!roomLocked) {
      unitBuildingId = "";
      unitView = "sale";
      unitRoomId = "";
      leaveDollhouse();
    }
    if (wasOpen && typeof opts.onCloseStand === "function" && !roomLocked) opts.onCloseStand();
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
    if (!roomLocked) dismissStandMenu();
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

  function setBooksExpanded(on) {
    booksExpanded = Boolean(on);
    const panel = document.getElementById("panel-books");
    if (panel) panel.classList.toggle("sheet-center", booksExpanded);
    paintBooks();
    syncSheetVeil();
  }

  function title(text) {
    return `<h2>${text}</h2>`;
  }

  function stampPlay(data) {
    if (!data || data.mode !== "PAPER") return false;
    playGen += 1;
    play = data;
    paintTop();
    paintPanels();
    paintLandlordChip();
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
    if (marketDest === "road") return "Comes to you on the kerb";
    if (marketDest === "warehouse") return "South warehouse";
    if (marketDest === "unit") {
      const shop = ownedShopUnits(play).find((r) => r.id === marketUnitId);
      return shop ? "This room · " + shop.label : "This room";
    }
    return "Pick warehouse or bring to me";
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
    if (orderAsk) orderAsk.hidden = true;
    if (orderVeil) orderVeil.hidden = true;
    orderSku = null;
    pendingBasketPay = false;
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
    if (!orderAsk || !play) return;
    const basketMode = pendingBasketPay;
    const row = orderSku ? catalogSku(orderSku) : null;
    if (!basketMode && !row) {
      hideOrderAsk();
      return;
    }
    const unit = row ? Number(row.paperPrice) || 0 : 0;
    const total = basketMode ? null : unit * orderQty;
    const loc = destLabel();
    const waitS = Math.round(Number(play.deliveryWaitMs || 60000) / 1000);
    const canPay =
      marketDest === "road" ||
      marketDest === "warehouse" ||
      (marketDest === "unit" && Boolean(marketUnitId));
    orderAsk.hidden = false;
    if (orderVeil) orderVeil.hidden = false;
    const title = basketMode ? "Where should this go?" : "Buy " + row.label;
    const unitLine = basketMode ? "" : `<p class="order-unit">${money(unit)} each</p>`;
    const qtyBlock = basketMode
      ? ""
      : `
      <p class="order-label">How many</p>
      <div class="order-qty">
        <button type="button" class="ghost" data-order-qty="-1" ${orderQty <= 1 ? "disabled" : ""}>−</button>
        <strong>${orderQty}</strong>
        <button type="button" class="ghost" data-order-qty="1" ${orderQty >= 10 ? "disabled" : ""}>+</button>
      </div>`;
    const payLabel = basketMode ? "Pay" : "Pay " + money(total);
    orderAsk.innerHTML = `
      <h2>${title}</h2>
      ${unitLine}
      ${qtyBlock}
      <p class="order-label">Where</p>
      <div class="dest-row">
        ${formatOrderDests(play, marketDest, marketUnitId)}
      </div>
      <div class="order-pay">
        <p class="buy-loc is-ask">${loc}${marketDest === "road" ? " · " + waitS + "s on the kerb" : ""}</p>
        <button type="button" class="go" id="order-pay" ${canPay ? "" : "disabled"}>${payLabel}</button>
        <button type="button" class="ghost" id="order-cancel">Cancel</button>
      </div>
    `;
    if (canPay) orderAsk.querySelector("#order-pay")?.focus();
  }

  function orderDestBody(extra) {
    const pose = typeof opts.getPose === "function" ? opts.getPose() : {};
    const selectedId = typeof opts.getPlotId === "function" ? opts.getPlotId() : "";
    const leases = (play && play.leases) || [];
    const ownedId = leases.some((l) => l.id === selectedId)
      ? selectedId
      : (leases[0] && leases[0].id) || "";
    return {
      island: "south",
      dest: marketDest,
      x: pose && pose.x,
      z: pose && pose.z,
      plotId: marketDest === "road" ? ownedId || undefined : undefined,
      unitId: marketDest === "unit" ? marketUnitId || undefined : undefined,
      ...extra,
    };
  }

  function destPicked() {
    return (
      marketDest === "road" ||
      marketDest === "warehouse" ||
      (marketDest === "unit" && Boolean(marketUnitId))
    );
  }

  async function submitOrder() {
    if (!destPicked()) {
      paintOrderAsk();
      return;
    }
    if (pendingBasketPay) {
      await submitBasket();
      hideOrderAsk();
      return;
    }
    if (!orderSku) return;
    const { ok, data } = await readJson("/api/market/order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(orderDestBody({ skus: [orderSku], qty: orderQty })),
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
    if (delivery && (delivery.dest === "road" || delivery.dest === "unit")) {
      closePanels();
      if (typeof opts.onOrder === "function") opts.onOrder(delivery);
    } else {
      open("warehouse");
    }
    if (opts.setStatus) {
      opts.setStatus(
        marketDest === "road" || marketDest === "unit"
          ? "Yellow van from the port."
          : "Paid. In the South warehouse.",
      );
    }
  }

  async function submitBasket() {
    if (!destPicked()) {
      pendingBasketPay = true;
      paintOrderAsk();
      return;
    }
    if (!marketBasket.length) return;
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
        body: JSON.stringify(orderDestBody({ skus, qty: 1 })),
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
        if (data && data.snapshot && data.snapshot.visitor) {
          playGen += 1;
          play.cash = data.snapshot.visitor.cash;
          play.cart = data.snapshot.visitor.cart || [];
        }
      }
      playPaperBuy();
    }
    marketBasket = [];
    marketView = "shop";
    const delivery = last && last.delivery;
    if (marketDest === "road" || marketDest === "unit") {
      closePanels();
      if (delivery && typeof opts.onOrder === "function") opts.onOrder(delivery);
    } else {
      open("warehouse");
    }
    if (opts.setStatus) {
      opts.setStatus(
        marketDest === "road" || marketDest === "unit" ? "Yellow van from the port." : "Paid. In the South warehouse.",
      );
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

  function paintInv() {
    const body = document.getElementById("inv-body");
    if (!body || !play) return;
    body.innerHTML = formatInventoryBody(play);
  }

  function paintBooks() {
    const body = document.getElementById("books-body");
    if (!body || !play) return;
    body.innerHTML = formatBooksBody(play, booksExpanded);
  }

  function isFurnitureKind(kind) {
    const row = ((play && play.catalog) || []).find((s) => s.id === kind);
    if (row) return row.aisle === "shopfit" || row.aisle === "hospitality";
    return ["shelf", "till", "fridge", "bed", "shower", "sink", "desk", "cabinet"].includes(kind);
  }

  function beginPlace(kitId) {
    placing = true;
    placingKit = kitId || "";
    if (landCard) landCard.hidden = true;
    if (buyAsk) buyAsk.hidden = true;
    if (isFurnitureKind(kitId)) {
      if (!roomLocked || !unitRoomId) {
        placing = false;
        placingKit = "";
        if (opts.setStatus) opts.setStatus("Enter a room you own, then Place from inventory.");
        return;
      }
      closePanels();
      setPlaceHint("Tap this room's floor. Hold R to rotate.", true);
      if (opts.setStatus) opts.setStatus("Green ghost is the kit. Hold R to rotate, then tap the floor.");
      if (opts.onPlaceMode) opts.onPlaceMode(true);
      return;
    }
    setOverlay("yours");
    closePanels();
    setPlaceHint("Tap your pad or YOURS lot. Hold R to rotate.", true);
    if (opts.setStatus) {
      opts.setStatus("Green cart is the ghost. Hold R to rotate, then tap the pad.");
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
                return `
        <div class="inv-row">
          <span>${label} × ${r.qty}</span>
          <div class="row-acts"><button type="button" class="ghost sell-wh" data-sell-wh="${r.kind}">Sell</button><button type="button" data-withdraw="${r.kind}">Bring to me</button></div>
        </div>`;
              })
              .join("")
          : "<p>Nothing stored. Buy from the marketplace, then pick Warehouse — or Bring to me for the kerb.</p>"
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
        if (openPanel === "books") paintBooks();
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
      ((play.workSites || []).find((s) => s.unitId === id)) ||
      null
    );
  }

  async function postUnit(path, body) {
    const { ok, data } = await readJson(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (data && data.play) stampPlay(data.play);
    return { ok, data };
  }

  function bindUnitSheet(root) {
    root.querySelector("#stand-close")?.addEventListener("click", () => dismissStandMenu());
    root.querySelectorAll("[data-unit-view]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        unitView = btn.getAttribute("data-unit-view") || "root";
        paintBuildingSheet(unitBuildingId);
      });
    });
    root.querySelectorAll("[data-floor-dir]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        const dir = Number(btn.getAttribute("data-floor-dir"));
        if (!Number.isFinite(dir) || dir === 0) return;
        const building = findBuilding(play, unitBuildingId);
        const floors = [...new Set((building?.rooms || []).map((r) => Number(r.floor) || 0))].sort((a, b) => a - b);
        const min = floors[0] ?? 0;
        const max = floors[floors.length - 1] ?? 0;
        unitFloor = Math.max(min, Math.min(max, unitFloor + dir));
        paintBuildingSheet(unitBuildingId);
      });
    });
    root.querySelectorAll("[data-ask-unit], [data-buy-unit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        const id = btn.getAttribute("data-ask-unit") || btn.getAttribute("data-buy-unit");
        unitRoomId = id || "";
        const found = findUnit(play, id);
        if (found) {
          unitBuildingId = found.building.id;
          unitFloor = Number(found.unit.floor) || 0;
        }
        unitView = "sale";
        paintBuildingSheet(unitBuildingId);
        paintUnitAsk(found && found.unit);
        enterDollhouse(false);
        if (opts.onHighlight) opts.onHighlight(id);
      });
    });
    root.querySelectorAll("[data-ask-land], [data-buy-land]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        const id = btn.getAttribute("data-ask-land") || btn.getAttribute("data-buy-land");
        const building = findBuilding(play, id);
        paintLandAsk(building);
      });
    });
    root.querySelectorAll("[data-enter-unit], [data-unit-room]").forEach((btn) => {
      btn.addEventListener("click", () => {
        unitRoomId = btn.getAttribute("data-enter-unit") || btn.getAttribute("data-unit-room") || "";
        const found = findUnit(play, unitRoomId);
        if (found) {
          unitBuildingId = found.building.id;
          unitFloor = Number(found.unit.floor) || 0;
        }
        unitView = "room";
        paintBuildingSheet(unitBuildingId);
        enterDollhouse(true);
        if (opts.onHighlight) opts.onHighlight(unitRoomId);
      });
    });
    root.querySelectorAll("[data-exit-room]").forEach((btn) => {
      btn.addEventListener("click", () => exitRoom());
    });
    root.querySelectorAll("[data-pickup-kit]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const { ok, data } = await postUnit("/api/unit/pickup", {
          unitId: btn.getAttribute("data-unit-id"),
          kitId: btn.getAttribute("data-pickup-kit"),
        });
        if (opts.setStatus) opts.setStatus(ok ? "Packed to the warehouse." : "Could not pick up: " + ((data && data.reason) || "fail"));
        paintBuildingSheet(unitBuildingId);
      });
    });
    root.querySelectorAll("[data-fit-kit]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (btn.disabled) return;
        const { ok, data } = await postUnit("/api/unit/kit", {
          unitId: btn.getAttribute("data-unit-id"),
          kitId: btn.getAttribute("data-fit-kit"),
        });
        if (opts.setStatus) opts.setStatus(ok ? "Kit in the room." : "Could not fit: " + ((data && data.reason) || "fail"));
        paintBuildingSheet(unitBuildingId);
      });
    });
    root.querySelectorAll("[data-scout-unit]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const { ok, data } = await postUnit("/api/unit/scout", { unitId: btn.getAttribute("data-scout-unit") });
        if (opts.setStatus) {
          opts.setStatus(ok ? "Tenant profiles." : "No tenants.");
        }
        paintBuildingSheet(unitBuildingId);
      });
    });
    root.querySelectorAll("[data-sign-lease]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const { ok, data } = await postUnit("/api/unit/lease", {
          unitId: btn.getAttribute("data-sign-lease"),
          tenantId: btn.getAttribute("data-tenant"),
        });
        if (opts.setStatus) opts.setStatus(ok ? "Lease signed." : "Could not sign: " + ((data && data.reason) || "fail"));
        paintBuildingSheet(unitBuildingId);
      });
    });
    root.querySelectorAll("[data-unit-hire]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (btn.disabled) return;
        const { ok, data } = await postUnit("/api/unit/hire", {
          unitId: btn.getAttribute("data-unit-hire"),
          role: btn.getAttribute("data-unit-role"),
        });
        if (opts.setStatus) opts.setStatus(ok ? "Hired." : "Could not hire: " + ((data && data.reason) || "fail"));
        paintBuildingSheet(unitBuildingId);
      });
    });
    root.querySelectorAll("[data-unit-fire]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (btn.disabled) return;
        const { ok, data } = await postUnit("/api/unit/fire", {
          unitId: btn.getAttribute("data-unit-fire"),
          role: btn.getAttribute("data-unit-role"),
        });
        if (opts.setStatus) opts.setStatus(ok ? "Fired." : "Could not fire: " + ((data && data.reason) || "fail"));
        paintBuildingSheet(unitBuildingId);
      });
    });
  }

  function paintBuildingSheet(buildingId, quiet) {
    if (!standMenu) return;
    const id = buildingId || unitBuildingId;
    if (!id || !play) {
      dismissStandMenu();
      return;
    }
    if (!quiet) closePanels();
    openSiteId = null;
    unitBuildingId = id;
    standMenu.hidden = false;
    if (standVeil) standVeil.hidden = true;
    standMenu.innerHTML = formatBuildingSheet(play, {
      buildingId: id,
      view: unitView,
      floor: unitFloor,
      unitId: unitRoomId,
    });
    bindUnitSheet(standMenu);
    enterDollhouse(unitView === "room");
    standMenu.querySelectorAll("[data-open-stand]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const site = findSite(btn.getAttribute("data-open-stand"));
        if (site) paintStandMenu(site);
      });
    });
  }

  function paintStandMenu(stand, onStock, onHire) {
    if (!standMenu) return;
    if (!stand) {
      dismissStandMenu();
      return;
    }
    closePanels();
    if (unitBuildingId) leaveDollhouse();
    unitBuildingId = "";
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
      const dollarMin = Number(priceEl.getAttribute("data-min") || 1);
      const dollarMax = Number(priceEl.getAttribute("data-max") || 16);
      const paintRead = () => {
        const pct = Number(priceEl.value);
        const v = stickerFromPct(pct, todayN, dollarMin, dollarMax);
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
        if (knob) knob.style.left = `${pct}%`;
      };
      paintRead();
      priceEl.addEventListener("input", paintRead);
      priceEl.addEventListener("change", async () => {
        const v = stickerFromPct(Number(priceEl.value), todayN, dollarMin, dollarMax);
        await readJson("/api/stand/price", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ standId: live.id, price: v }),
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
    standMenu.querySelectorAll("[data-unit-hire]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const { ok, data } = await postUnit("/api/unit/hire", {
          unitId: btn.getAttribute("data-unit-hire"),
          role: btn.getAttribute("data-unit-role"),
        });
        const fresh = findSite(live.id);
        paintStandMenu(fresh, onStock, onHire);
        if (ok && opts.onHired) opts.onHired(live.id);
        if (opts.setStatus) opts.setStatus(ok ? "Hired." : "Could not hire: " + ((data && data.reason) || "fail"));
      });
    });
    standMenu.querySelectorAll("[data-unit-fire]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const { ok, data } = await postUnit("/api/unit/fire", {
          unitId: btn.getAttribute("data-unit-fire"),
          role: btn.getAttribute("data-unit-role"),
        });
        const fresh = findSite(live.id);
        paintStandMenu(fresh, onStock, onHire);
        if (ok && opts.onFired) opts.onFired(live.id);
        if (opts.setStatus) opts.setStatus(ok ? "Fired." : "Could not fire: " + ((data && data.reason) || "fail"));
      });
    });
    const pickupBtn = standMenu.querySelector("[data-pickup-stand]");
    if (pickupBtn) {
      pickupBtn.addEventListener("click", async () => {
        const id = pickupBtn.getAttribute("data-pickup-stand");
        const { ok, data } = await readJson("/api/stand/pickup", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ standId: id }),
        });
        if (data && data.play) stampPlay(data.play);
        else paintPanels();
        dismissStandMenu();
        placing = false;
        placingKit = "";
        setPlaceHint("", false);
        if (opts.onPlaceMode) opts.onPlaceMode(false);
        if (ok && opts.onPickedUp) opts.onPickedUp(id);
        if (opts.setStatus) {
          opts.setStatus(ok ? "Cart in the South warehouse." : "Could not pick up: " + ((data && data.reason) || "fail"));
        }
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
    paintBooks();
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
            "[data-dest], [data-order], [data-buy], [data-place], [data-withdraw], [data-sell-wh], [data-open-stand], [data-order-qty], [data-order-dest], [data-aisle], [data-island], [data-sheet-close], [data-books-expand], [data-hire-pick], [data-hire-back], [data-sheet-hire], [data-add-cart], [data-market-cart], [data-basket-remove], [data-basket-buy], [data-basket-pay], [data-look], [data-wipe], [data-wipe-go], [data-wipe-cancel], #order-pay, #order-cancel",
          )
        : null;
      if (!hit || (standMenu && standMenu.contains(hit))) return;
      if (hit.hasAttribute("data-sheet-close")) {
        closePanels();
        return;
      }
      if (hit.hasAttribute("data-books-expand")) {
        const on = hit.getAttribute("data-books-expand") !== "0";
        if (openPanel !== "books") open("books");
        setBooksExpanded(on);
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
        pendingBasketPay = false;
        marketDest = "";
        paintOrderAsk();
        return;
      }
      if (hit.hasAttribute("data-basket-pay")) {
        pendingBasketPay = true;
        orderSku = null;
        marketDest = "";
        paintOrderAsk();
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
        const dest = hit.getAttribute("data-order-dest");
        if (dest === "unit") {
          marketDest = "unit";
          marketUnitId = hit.getAttribute("data-order-unit") || "";
        } else {
          marketDest = dest === "road" ? "road" : "warehouse";
          marketUnitId = "";
        }
        paintOrderAsk();
        return;
      }
      if (hit.hasAttribute("data-unit-hire")) {
        const unitId = hit.getAttribute("data-unit-hire");
        const role = hit.getAttribute("data-unit-role");
        const { ok, data } = await postUnit("/api/unit/hire", { unitId, role });
        paintStaff();
        if (ok && opts.onHired) opts.onHired(unitId);
        if (opts.setStatus) opts.setStatus(ok ? "Hired." : "Could not hire: " + ((data && data.reason) || "fail"));
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
        if (orderAsk && !orderAsk.hidden) paintOrderAsk();
        return;
      }
      if (hit.hasAttribute("data-order")) {
        orderSku = hit.getAttribute("data-order");
        orderQty = 1;
        pendingBasketPay = false;
        marketDest = "";
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
        const kind = hit.getAttribute("data-place");
        const onYou = ((play && play.inventory) || []).some((r) => r.kind === kind && Number(r.qty) >= 1);
        if (!onYou) {
          if (opts.setStatus) opts.setStatus("Warehouse has the kit. Bring to me, then Place.");
          open("warehouse");
          return;
        }
        beginPlace(kind);
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
      if (hit.hasAttribute("data-sell-wh")) {
        paintWarehouseSellAsk(hit.getAttribute("data-sell-wh"));
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
  root.querySelectorAll('[data-toggle="properties"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      cyclePropertiesChip();
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
      } else if (unitBuildingId && standMenu && !standMenu.hidden) {
        paintBuildingSheet(unitBuildingId, true);
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

  function paintAsk(model, onYes) {
    if (!buyAsk || !model) {
      if (buyAsk) buyAsk.hidden = true;
      return;
    }
    buyAsk.hidden = false;
    if (landCard) landCard.hidden = true;
    buyAsk.innerHTML = `
      <h2>${model.question}</h2>
      <p class="buy-ask-name">${model.name}</p>
      <p class="price">${model.priceLabel}</p>
      <div class="land-row">
        <button type="button" class="take-all" id="buy-ask-yes" ${model.disabled ? "disabled" : ""}>${model.yes}</button>
        <button type="button" class="take-all" id="buy-ask-no">${model.no}</button>
      </div>
    `;
    const yes = buyAsk.querySelector("#buy-ask-yes");
    const no = buyAsk.querySelector("#buy-ask-no");
    if (yes && !model.disabled) yes.addEventListener("click", onYes);
    if (no) {
      no.addEventListener("click", () => {
        buyAsk.hidden = true;
        if (opts.onCloseLand) opts.onCloseLand();
      });
    }
  }

  function paintUnitAsk(room) {
    const model = unitAskModel(room);
    if (!model) return;
    paintAsk(model, async () => {
      buyAsk.hidden = true;
      const { ok, data } = await postUnit("/api/unit/buy", { unitId: room.id });
      if (!ok) {
        if (opts.setStatus) opts.setStatus("Could not buy: " + ((data && data.reason) || "fail"));
        return;
      }
      unitRoomId = room.id;
      unitView = "room";
      unitFloor = Number(room.floor) || 0;
      paintBuildingSheet(room.buildingId || unitBuildingId);
      enterDollhouse(true);
      if (opts.onHighlight) opts.onHighlight(room.id);
      if (opts.setStatus) opts.setStatus("Room is yours. Place furniture from inventory.");
    });
  }

  function paintLandAsk(building) {
    const model = landAskModel(building, play && play.cash);
    if (!model) return;
    paintAsk(model, async () => {
      buyAsk.hidden = true;
      const { ok, data } = await postUnit("/api/building/land", { buildingId: building.id });
      if (opts.setStatus) opts.setStatus(ok ? "You own the dirt." : "Could not buy land: " + ((data && data.reason) || "fail"));
      if (!ok) return;
      paintLandlordChip();
      if (unitView === "landlord" || unitBuildingId === "landlord") paintBuildingSheet("landlord");
      else if (unitBuildingId) paintBuildingSheet(unitBuildingId);
    });
  }

  function hideSellAsk() {
    if (sellAsk) sellAsk.hidden = true;
  }

  function paintWarehouseSellAsk(kind) {
    if (!sellAsk || !kind) return;
    const sku = ((play && play.catalog) || []).find((s) => s.id === kind) || { id: kind, label: kind, paperPrice: 0, qty: 1 };
    const have = ((((play && play.warehouse) || {}).items) || []).find((r) => r.kind === kind);
    const qty = Number(have && have.qty) || 0;
    const unit = Number(sku.paperPrice) / Math.max(1, Number(sku.qty) || 1);
    const paid = qty * unit;
    sellAsk.hidden = false;
    sellAsk.innerHTML = `
      <h2>Sell from the warehouse?</h2>
      <p class="buy-ask-name">Are you sure you want to sell from the warehouse?</p>
      <p class="price">${sku.label || kind} × ${qty}</p>
      <p class="buy-ask-name">${money(paid)} PAPER</p>
      <div class="land-row">
        <button type="button" class="take-all" id="sell-ask-yes">Yes, sell</button>
        <button type="button" class="take-all" id="sell-ask-no">No</button>
      </div>
    `;
    const yes = sellAsk.querySelector("#sell-ask-yes");
    const no = sellAsk.querySelector("#sell-ask-no");
    if (yes) {
      yes.addEventListener("click", async () => {
        hideSellAsk();
        const { ok, data } = await readJson("/api/warehouse/sell", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ kind }),
        });
        await refreshPlay(data);
        if (opts.setStatus) {
          opts.setStatus(
            ok ? "Sold from the warehouse · " + money((data && data.paid) || paid) : "Could not sell: " + ((data && data.reason) || "fail"),
          );
        }
      });
    }
    if (no) no.addEventListener("click", hideSellAsk);
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
    const yours = !roadside && (plotIsYours(plot) || plot.owner === "visitor");
    const taken = !roadside && !yours && Boolean(plot.owner) && plot.owner !== "visitor";
    const vacant = !roadside && !yours && !taken;
    const stand = extras && extras.stand;
    const confirmSell = extras && extras.confirmSell;
    if (confirmSell && yours) {
      landCard.innerHTML = `
        <h2>Sell this lot?</h2>
        <p class="lease-note">Are you sure you want to sell this lot? Your cart will go to the warehouse.</p>
        <div class="land-row">
          <button type="button" class="take-all" id="land-sell-yes">Yes, sell</button>
          <button type="button" class="take-all" id="land-sell-no">No</button>
        </div>
      `;
      const yes = landCard.querySelector("#land-sell-yes");
      const no = landCard.querySelector("#land-sell-no");
      if (yes && extras.onSell) yes.addEventListener("click", () => extras.onSell());
      if (no) no.addEventListener("click", () => paintLand(plot, { ...extras, confirmSell: false }));
      return;
    }
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
      ${yours && extras && extras.onSell ? `<button type="button" class="ghost land-sell" id="land-sell">Sell lot</button>` : ""}
      ${yours && stand && extras && extras.onPickup ? `<button type="button" id="land-pickup">Pick up cart</button>` : ""}
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
    const sellBtn = landCard.querySelector("#land-sell");
    if (sellBtn && extras && extras.onSell) {
      sellBtn.addEventListener("click", () => paintLand(plot, { ...extras, confirmSell: true }));
    }
    const pickupBtn = landCard.querySelector("#land-pickup");
    if (pickupBtn && extras && extras.onPickup) {
      pickupBtn.addEventListener("click", () => extras.onPickup());
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
  const exitRoomBtn = document.getElementById("exit-room");
  if (exitRoomBtn) {
    exitRoomBtn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (roomLocked) exitRoom();
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
    if (sellAsk && !sellAsk.hidden) {
      hideSellAsk();
      return;
    }
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

  setOverlay("world");

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
    isPropertiesOn: () => propertiesMode !== "off",
    propertiesMode: () => propertiesMode,
    isRoomLocked: () => roomLocked,
    getPlaceUnitId: () => (roomLocked ? unitRoomId : ""),
    setPropertiesOn,
    cycleProperties: cyclePropertiesChip,
    dumpPreview,
    exitRoom,
    paintLandAsk,
    open,
    closePanels,
    hideBuyAsk() {
      if (buyAsk) buyAsk.hidden = true;
    },
    hideSellAsk,
    hideCrateAsk,
    paintCrateAsk,
    hideOrderAsk,
    paintBuyAsk,
    paintLand,
    paintStandMenu,
    paintBuildingSheet,
    openBuildingSheet(buildingId) {
      unitView = propertiesMode === "yours" ? "yours" : "sale";
      unitFloor = 0;
      unitRoomId = "";
      paintBuildingSheet(buildingId);
    },
    openUnitSheet(buildingId, unitId) {
      const building = findBuilding(play, buildingId);
      const room = building && (building.rooms || []).find((r) => r.id === unitId);
      unitView = room && room.owner === "visitor" ? "room" : "sale";
      unitFloor = room ? Number(room.floor) || 0 : 0;
      unitRoomId = unitId || "";
      paintBuildingSheet(buildingId);
      if (unitView === "sale" && room && !room.owner) paintUnitAsk(room);
      enterDollhouse(unitView === "room");
    },
    openLandlordSheet() {
      unitView = "landlord";
      unitBuildingId = "landlord";
      paintBuildingSheet("landlord");
    },
    hideStandMenu() {
      dismissStandMenu();
    },
    isDollhouseOpen() {
      return Boolean(unitBuildingId && standMenu && !standMenu.hidden);
    },
  };
}
