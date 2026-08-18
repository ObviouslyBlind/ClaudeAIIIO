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
import { formatSiteMenu, gamesForSite } from "./site-menu.js";

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
  let placingKit = "";
  let marketDest = "warehouse";
  const packShift = mountPackShift();
  let siteTab = "stock";
  let openSiteId = null;

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
    const destPockets = marketDest === "cart";
    const kits = catalog.filter((s) => s.aisle === "street_carts" || s.role === "kit");
    const stock = catalog.filter((s) => s.aisle === "stock" || s.role === "stock");
    body.innerHTML = `
      ${title("Market")}
      <p>Buy a fruit cart, watermelon cart, or fish and chips. That is not stocking a stall — place the cart first, then load it from that cart.</p>
      <div class="dest-row">
        <button type="button" class="dest ${destPockets ? "is-on" : ""}" data-dest="cart">Pockets</button>
        <button type="button" class="dest ${marketDest === "warehouse" ? "is-on" : ""}" data-dest="warehouse">Warehouse</button>
      </div>
      <p class="whisper">${destPockets ? "Goes in pockets. Place from Carts, then tap that cart to stock it." : "South warehouse " + fee + "/day. Default."}</p>
      <h3 class="sheet-kicker">Street carts</h3>
      ${kits
        .map(
          (s) => `
        <div class="inv-row">
          <span>${s.label} · ${money(s.paperPrice)}</span>
          <button type="button" class="go" data-order="${s.id}">Buy</button>
        </div>`,
        )
        .join("")}
      <h3 class="sheet-kicker">Stock packs</h3>
      ${stock
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

  function beginPlace(kitId) {
    placing = true;
    placingKit = kitId || "";
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
        stands.length || (play.workSites || []).length
          ? [...stands, ...(play.workSites || [])]
              .map((s) => {
                const where = plotNameFor(s);
                if (s.hired) {
                  return `<div class="stand-row"><span>${s.staffName || "Vendor"}</span><strong>${where}</strong></div>`;
                }
                return `<div class="stand-row"><span>${s.label || "Site"} · ${where}</span><button type="button" class="go" data-open-stand="${s.id}">Open</button></div>`;
              })
              .join("")
          : "<p>Place a cart or tap your shop or mine. Hire from that site. Sites do not run without staff.</p>"
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
          <span>${((play.catalog || []).find((s) => s.id === r.kind) || {}).label || r.kind} × ${r.qty}</span>
          <button type="button" data-withdraw="${r.kind}">Bring to me</button>
        </div>`,
              )
              .join("")
          : "<p>Nothing stored. Market can send kit here.</p>"
      }
    `;
  }

  function startPack(goods, standId, title) {
    packShift.open({
      goods,
      title,
      async onDone(hits) {
        const { ok, data } = await readJson("/api/shift/pack", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ hits, standId: standId || undefined }),
        });
        if (data && data.play) play = data.play;
        paintTop();
        if (openPanel === "inventory") paintInv();
        const fresh = findSite(standId);
        if (fresh) paintStandMenu(fresh);
        if (opts.setStatus) {
          opts.setStatus(
            ok
              ? `Pack bonus ${money(data.bonus)} · PAPER · site already ran`
              : "Pack: " + ((data && data.reason) || "skipped"),
          );
        }
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
      standMenu.hidden = true;
      if (standVeil) standVeil.hidden = true;
      openSiteId = null;
      return;
    }
    closePanels();
    openSiteId = stand.id;
    standMenu.hidden = false;
    if (standVeil) standVeil.hidden = false;
    const live = findSite(stand.id) || stand;
    standMenu.innerHTML = formatSiteMenu(live, play, siteTab);
    function closeStand() {
      standMenu.hidden = true;
      if (standVeil) standVeil.hidden = true;
      openSiteId = null;
    }
    standMenu.querySelector("#stand-close")?.addEventListener("click", closeStand);
    standMenu.querySelectorAll("[data-site-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        siteTab = btn.getAttribute("data-site-tab") || "stock";
        paintStandMenu(live, onStock, onHire);
      });
    });
    const priceEl = standMenu.querySelector("#sticker-price");
    if (priceEl) {
      priceEl.addEventListener("change", async () => {
        const { data } = await readJson("/api/stand/price", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ standId: live.id, price: Number(priceEl.value) }),
        });
        if (data && data.play) play = data.play;
        paintTop();
        const fresh = findSite(live.id);
        if (fresh) paintStandMenu(fresh, onStock, onHire);
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
      if (data && data.play) play = data.play;
      paintTop();
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
    const hireBtn = standMenu.querySelector("#hire-site");
    if (hireBtn) {
      hireBtn.addEventListener("click", async () => {
        const { ok, data } = await readJson("/api/stand/hire", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ standId: hireBtn.getAttribute("data-hire-site") }),
        });
        if (data && data.play) play = data.play;
        paintTop();
        const fresh = findSite(live.id);
        paintStandMenu(fresh, onStock, onHire);
        if (ok && typeof onHire === "function") onHire();
      });
    }
    standMenu.querySelectorAll("[data-upgrade]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const { data } = await readJson("/api/stand/upgrade", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ standId: btn.getAttribute("data-upgrade") }),
        });
        if (data && data.play) play = data.play;
        paintTop();
        const fresh = findSite(live.id);
        paintStandMenu(fresh, onStock, onHire);
      });
    });
    standMenu.querySelector("[data-pack-start]")?.addEventListener("click", () => {
      startPack(gamesForSite(live), live.id, (live.games && live.games[0]) || "Fruit slice");
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
            "[data-dest], [data-order], [data-buy], [data-place], [data-withdraw], [data-open-stand]",
          )
        : null;
      if (!hit || (standMenu && standMenu.contains(hit))) return;
      if (hit.hasAttribute("data-dest")) {
        marketDest = hit.getAttribute("data-dest") || "warehouse";
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
            marketDest === "cart"
              ? "In pockets. Place the cart, then tap it to stock."
              : "In the South warehouse.",
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
        beginPlace(hit.getAttribute("data-place"));
        return;
      }
      if (hit.hasAttribute("data-open-stand")) {
        const stand = findSite(hit.getAttribute("data-open-stand"));
        paintStandMenu(stand);
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

  const placeCancel = document.getElementById("place-cancel");
  if (placeCancel) {
    placeCancel.addEventListener("click", () => {
      placing = false;
      placingKit = "";
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
      openSiteId = null;
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
    paintStandMenu,
    hideStandMenu() {
      if (standMenu) standMenu.hidden = true;
      if (standVeil) standVeil.hidden = true;
      openSiteId = null;
    },
  };
}
