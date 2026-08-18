/**
 * Floating HUD. Panels are extra UI, not extra pages.
 * PAPER / SIMULATED. Polls /api/play.
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
  const standMenu = document.getElementById("stand-menu");

  let play = null;
  let openPanel = null;
  let overlay = "world";
  let placing = false;
  let marketAisle = null;
  let marketSku = null;

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
    if (hint) hint.textContent = (HINTS[id] || HINTS.world) + " PAPER · SIMULATED";
    if (opts.setStatus) opts.setStatus((HINTS[id] || HINTS.world) + " PAPER.");
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

  function paintTop() {
    if (!play) return;
    if (cashEl) cashEl.textContent = money(play.cash);
    if (incomeEl) {
      const n = Number(play.incomePerMinute) || 0;
      incomeEl.textContent = (n >= 0 ? "+" : "") + money(n) + "/min";
      incomeEl.classList.toggle("is-zero", n <= 0);
    }
    if (onlineEl) {
      onlineEl.textContent = (play.playersOnline || 1) + " online · PAPER · SIMULATED";
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

    if (!marketAisle) {
      body.innerHTML = `
        <p class="float-kicker">PAPER · SIMULATED · South marketplace</p>
        <h2>Market</h2>
        <p>Pick a section. Then pick the thing. Then pick where the van drops it.</p>
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
        <p class="float-kicker">PAPER · SIMULATED</p>
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
    body.innerHTML = `
      <p class="float-kicker">PAPER · SIMULATED · buy chirp on confirm</p>
      <button type="button" class="back" id="mkt-back">← ${sku.aisleLabel}</button>
      <h2>${sku.label}</h2>
      <p>${sku.note}</p>
      <div class="sku-row"><span>PAPER price</span><strong>${money(sku.paperPrice)}</strong></div>
      <label>Deliver to</label>
      <select id="deliver-plot">${dests || `<option value="">Lease a ${sku.zone} lot first (Lots overlay)</option>`}</select>
      <div class="sku-row"><span></span><button type="button" class="go" id="btn-order" ${dests ? "" : "disabled"}>Buy · ${money(sku.paperPrice)}</button></div>
    `;
    body.querySelector("#mkt-back")?.addEventListener("click", () => {
      marketSku = null;
      paintMarket();
    });
    const orderBtn = body.querySelector("#btn-order");
    if (orderBtn) {
      orderBtn.addEventListener("click", async () => {
        const plotId = body.querySelector("#deliver-plot")?.value;
        const { ok, data } = await readJson("/api/market/order", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ plotId, skus: [sku.id], island: "south" }),
        });
        if (!ok) {
          if (opts.setStatus) opts.setStatus("Order failed: " + (data && data.reason) + " · PAPER");
          return;
        }
        playPaperBuy();
        play = data.play;
        paintTop();
        paintPanels();
        if (opts.onOrder) opts.onOrder(data.delivery);
        if (opts.setStatus) opts.setStatus("Van rolling. It waits at the kerb. PAPER · SIMULATED.");
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
    el.innerHTML =
      `<p class="float-kicker">PAPER · SIMULATED · Foot traffic</p>` +
      roads
        .map(
          (r) =>
            `<div class="sku-row"><span><span class="band-dot ${r.band}"></span>${r.name || "Harbour Rd"}</span><strong>${footLevel(r.band)}</strong></div>`,
        )
        .join("");
  }

  function paintInv() {
    const body = document.getElementById("inv-body");
    if (!body || !play) return;
    const rows = play.inventory || [];
    body.innerHTML = `
      <p class="float-kicker">PAPER · SIMULATED</p>
      <h2>Inventory</h2>
      ${
        rows.length
          ? rows
              .map(
                (r) => `
        <div class="inv-row">
          <span>${r.kind === "hotdog_cart" ? "Hotdog cart" : "Hotdogs"} × ${r.qty}</span>
          ${
            r.kind === "hotdog_cart"
              ? `<button type="button" data-place="1">Place in world</button>`
              : r.kind === "hotdogs" && (play.stands || []).length
                ? `<button type="button" data-stock="1">Stock cart</button>`
                : ""
          }
        </div>`,
              )
              .join("")
          : "<p>Empty. Order a crate from the market.</p>"
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
    const stockBtn = body.querySelector("[data-stock]");
    if (stockBtn) {
      stockBtn.addEventListener("click", async () => {
        const stand = (play.stands || [])[0];
        if (!stand) return;
        const { ok, data } = await readJson("/api/stand/stock", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ standId: stand.id }),
        });
        if (data && data.play) play = data.play;
        paintTop();
        paintPanels();
        if (opts.setStatus) {
          opts.setStatus(
            ok ? "Hotdogs in the cart. PAPER." : "Could not stock: " + ((data && data.reason) || "fail") + " · PAPER",
          );
        }
        if (opts.onStocked && ok) opts.onStocked(stand.id);
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
    const roster = play.hireRoster || [];
    body.innerHTML = `
      <p class="float-kicker">PAPER · SIMULATED</p>
      <h2>Employees</h2>
      ${
        stands.length
          ? stands
              .map((s) => {
                const where = plotNameFor(s);
                if (s.hired) {
                  return `<div class="stand-row"><span>${s.staffName || "Vendor"} · ${where}</span><strong>hired</strong></div>`;
                }
                const people = roster
                  .map(
                    (p) =>
                      `<button type="button" class="take-all" data-hire-stand="${s.id}" data-hire-person="${p.id}">${p.name} · ${p.role} at ${where}</button>`,
                  )
                  .join("");
                return `<div class="hire-block"><p>Hire someone to run the cart at ${where}.</p>${people}</div>`;
              })
              .join("")
          : "<p>Place a cart first, then hire a person onto that lot.</p>"
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
  }

  function paintBoard() {
    const body = document.getElementById("board-body");
    if (!body || !play) return;
    body.innerHTML = `
      <p class="float-kicker">PAPER · SIMULATED</p>
      <h2>Leaderboard</h2>
      <p>South island street carts. Not live ranks.</p>
      <div class="stand-row"><span>You</span><strong>${money(play.cash)}</strong></div>
      <div class="stand-row"><span>Mill St cart (NPC)</span><strong>$412.40</strong></div>
      <div class="stand-row"><span>Harbour Rd cart (NPC)</span><strong>$188.10</strong></div>
    `;
  }

  function paintAccount() {
    const body = document.getElementById("acct-body");
    if (!body || !play) return;
    body.innerHTML = `
      <p class="float-kicker">PAPER · SIMULATED · no wallet</p>
      <h2>Account</h2>
      <p>Visitor on South island.</p>
      <div class="stand-row"><span>Balance</span><strong>${money(play.cash)}</strong></div>
      <div class="stand-row"><span>Income</span><strong>${money(play.incomePerMinute)}/min</strong></div>
    `;
  }

  function paintPanels() {
    paintMarket();
    paintInv();
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
    });
  });

  async function poll() {
    const { data } = await readJson("/api/play");
    if (data && data.mode === "PAPER") {
      play = data;
      paintTop();
      paintFootLegend();
      if (openPanel) paintPanels();
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
      <p class="float-kicker">PAPER · SIMULATED</p>
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
      if (opts.setStatus) opts.setStatus("Place cancelled. PAPER.");
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
          ? `<button type="button" class="land-buy take-all" id="land-lease">${money(plot.price)} PAPER · Buy lot</button>`
          : `<p class="price">${plot.owner === "visitor" ? "YOURS" : "taken"}</p>`;
      const note = extras && extras.note ? `<p class="lease-note">${extras.note}</p>` : "";
      landCard.innerHTML = `
        <p class="float-kicker">PAPER · SIMULATED</p>
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
    paintStandMenu(stand, onStock, onHire, onRun) {
      if (!standMenu) return;
      if (!stand) {
        standMenu.hidden = true;
        return;
      }
      standMenu.hidden = false;
      standMenu.innerHTML = `
        <p class="float-kicker">PAPER · SIMULATED</p>
        <h2>Hotdog cart</h2>
        <p>Stock ${stand.hotdogs} · ${stand.hired ? "hired" : "no staff"}</p>
        <button type="button" class="take-all" id="stand-stock">Put hotdogs in</button>
        ${stand.hired ? "" : `<button type="button" class="take-all" id="stand-hire" style="margin-top:6px;background:#c4a574">Hire</button>`}
        <button type="button" class="take-all" id="stand-run" style="margin-top:6px;background:#24444c;color:#f3efe4">Run it myself</button>
      `;
      standMenu.querySelector("#stand-stock")?.addEventListener("click", onStock);
      standMenu.querySelector("#stand-hire")?.addEventListener("click", onHire);
      standMenu.querySelector("#stand-run")?.addEventListener("click", onRun);
    },
    hideStandMenu() {
      if (standMenu) standMenu.hidden = true;
    },
  };
}
