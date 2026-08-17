/**
 * Floating HUD. Panels are extra UI, not extra pages.
 * PAPER / SIMULATED. Polls /api/play.
 */

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
  const standMenu = document.getElementById("stand-menu");

  let play = null;
  let openPanel = null;
  let overlay = "world";
  let placing = false;
  let skuCart = true;
  let skuDogs = true;

  function setOverlay(id) {
    overlay = id;
    root.querySelectorAll("[data-overlay]").forEach((b) => {
      b.classList.toggle("is-on", b.getAttribute("data-overlay") === id);
    });
    if (opts.onOverlay) opts.onOverlay(id);
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
    const optsHtml = leases.length
      ? leases
          .map(
            (l) =>
              `<option value="${l.id}">${l.id} · ${money(l.price)} · ${l.band}</option>`,
          )
          .join("")
      : `<option value="">Lease South land first</option>`;
    body.innerHTML = `
      <p class="float-kicker">PAPER · SIMULATED · South island</p>
      <h2>Market</h2>
      <p>Order a crate. A van drives paved roads to the plot you pick.</p>
      ${play.catalog
        .map(
          (s) => `
        <div class="sku-row">
          <span><input type="checkbox" data-sku="${s.id}" ${s.id === "hotdog_cart" && skuCart ? "checked" : ""} ${s.id === "hotdogs" && skuDogs ? "checked" : ""}/> ${s.label}</span>
          <strong>${money(s.paperPrice)}</strong>
        </div>`,
        )
        .join("")}
      <label>Deliver to</label>
      <select id="deliver-plot">${optsHtml}</select>
      <div class="sku-row"><span></span><button type="button" class="go" id="btn-order">Order crate</button></div>
    `;
    body.querySelectorAll("[data-sku]").forEach((box) => {
      box.addEventListener("change", () => {
        if (box.getAttribute("data-sku") === "hotdog_cart") skuCart = box.checked;
        if (box.getAttribute("data-sku") === "hotdogs") skuDogs = box.checked;
      });
    });
    const orderBtn = body.querySelector("#btn-order");
    if (orderBtn) {
      orderBtn.addEventListener("click", async () => {
        const plotId = body.querySelector("#deliver-plot")?.value;
        const skus = [];
        if (skuCart) skus.push("hotdog_cart");
        if (skuDogs) skus.push("hotdogs");
        const { ok, data } = await readJson("/api/market/order", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ plotId, skus, island: "south" }),
        });
        if (!ok) {
          if (opts.setStatus) opts.setStatus("Order failed: " + (data && data.reason) + " · PAPER");
          return;
        }
        play = data.play;
        paintTop();
        paintPanels();
        if (opts.onOrder) opts.onOrder(data.delivery);
        if (opts.setStatus) opts.setStatus("Van rolling. PAPER · SIMULATED.");
      });
    }
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
        setOverlay("foot");
        closePanels();
        if (opts.setStatus) {
          opts.setStatus("Foot traffic on. Tap your leased South plot to place the cart.");
        }
        if (opts.onPlaceMode) opts.onPlaceMode(true);
      });
    }
  }

  function paintStaff() {
    const body = document.getElementById("staff-body");
    if (!body || !play) return;
    const stands = play.stands || [];
    body.innerHTML = `
      <p class="float-kicker">PAPER · SIMULATED</p>
      <h2>Employees</h2>
      ${
        stands.length
          ? stands
              .map(
                (s) => `
        <div class="stand-row">
          <span>Hotdog cart · ${s.hotdogs} dogs${s.hired ? " · hired" : ""}</span>
          ${s.hired ? "" : `<button type="button" data-hire="${s.id}">Hire</button>`}
        </div>`,
              )
              .join("")
          : "<p>Place a cart first, then hire from here.</p>"
      }
    `;
    body.querySelectorAll("[data-hire]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const { data } = await readJson("/api/stand/hire", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ standId: btn.getAttribute("data-hire") }),
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
      const id = btn.getAttribute("data-overlay");
      if (id === "minerals" && opts.setStatus) {
        opts.setStatus("Minerals: not on the South first loop yet. PAPER.");
      }
      setOverlay(id);
    });
  });

  async function poll() {
    const { data } = await readJson("/api/play");
    if (data && data.mode === "PAPER") {
      play = data;
      paintTop();
      if (openPanel) paintPanels();
      if (opts.onPlay) opts.onPlay(play);
    }
  }

  poll();
  const timer = setInterval(poll, POLL_MS);
  setOverlay("world");

  return {
    stop() {
      clearInterval(timer);
    },
    refresh: poll,
    isPlacing: () => placing,
    clearPlacing() {
      placing = false;
      if (opts.onPlaceMode) opts.onPlaceMode(false);
    },
    getPlay: () => play,
    setOverlay,
    open,
    closePanels,
    paintLand(plot, extras) {
      if (!landCard) return;
      if (!plot) {
        landCard.hidden = true;
        return;
      }
      landCard.hidden = false;
      const band = extras && extras.band ? extras.band : "";
      const crate = extras && extras.crate;
      landCard.innerHTML = `
        <p class="float-kicker">PAPER · SIMULATED</p>
        <h2>${plot.owner === "visitor" ? "Your plot" : "South land"}</h2>
        <p class="price">${plot.owner ? (plot.owner === "visitor" ? "YOURS" : "taken") : money(plot.price)}</p>
        ${band ? `<p><span class="band-dot ${band}"></span>Foot traffic ${band}</p>` : ""}
        ${!plot.owner ? `<button type="button" class="take-all" id="land-lease">Lease</button>` : ""}
        ${crate ? `<button type="button" class="take-all" id="land-take">Take all</button>` : ""}
      `;
      const leaseBtn = landCard.querySelector("#land-lease");
      if (leaseBtn && opts.lease) leaseBtn.addEventListener("click", () => opts.lease());
      const takeBtn = landCard.querySelector("#land-take");
      if (takeBtn && extras.onTake) takeBtn.addEventListener("click", extras.onTake);
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
