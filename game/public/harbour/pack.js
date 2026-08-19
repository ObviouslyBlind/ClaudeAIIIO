/**
 * Site mini-game. Client-only timing. Skip never cuts hired output.
 * A finished shift asks the sim to sell a handful at once.
 * Tap only. No WASD.
 */

export const PACK_SECONDS = 24;
export const FRUIT_SLICE = ["mango", "pineapple", "papaya", "banana", "watermelon"];
export const GOLD_LO = 58;
export const GOLD_HI = 76;
export const WRAP_ORDER = ["paper", "fish", "chips"];

const FRUIT_TINT = {
  mango: "mango",
  pineapple: "pineapple",
  papaya: "papaya",
  banana: "banana",
  watermelon: "watermelon",
  "melon wedge": "watermelon",
  seeds: "watermelon",
  fish: "fish",
  chips: "chips",
  batter: "chips",
  paper: "paper",
  till: "mango",
  bag: "papaya",
  change: "banana",
  ore: "chips",
  lumber: "mango",
  pick: "pineapple",
};

function el(id) {
  return document.getElementById(id);
}

export function modeFor(title) {
  const t = String(title || "").toLowerCase();
  if (t.includes("basket")) return "basket";
  if (t.includes("wrap")) return "wrap";
  return "fall";
}

export function hintFor(mode, goods) {
  if (mode === "basket") return "Tap when the fry is gold. Pale is early. Burnt is late.";
  if (mode === "wrap") return "Paper, then fish, then chips.";
  const pool = Array.isArray(goods) ? goods : [];
  if (pool.includes("fish") || pool.includes("batter")) return "Tap fish, chips, batter.";
  if (pool.includes("watermelon") && pool.length <= 3) return "Tap melon.";
  return "Tap fruit.";
}

function heatAt(elapsedMs) {
  const cycle = 4000;
  const u = (elapsedMs % cycle) / cycle;
  if (u < 0.5) return u * 2 * 100;
  return (1 - (u - 0.5) * 2) * 100;
}

function goldHit(heat) {
  return heat >= GOLD_LO && heat <= GOLD_HI;
}

export function mountPackShift() {
  const root = el("pack-shift");
  const slots = el("pack-slots");
  const clock = el("pack-clock");
  const hitsEl = el("pack-hits");
  const closeBtn = el("pack-close");
  const badge = root && root.querySelector(".pack-badge");
  const hint = el("pack-hint");
  if (!root || !slots) {
    return { open() {}, close() {} };
  }

  let hits = 0;
  let startedAt = 0;
  let timer = 0;
  let falling = 0;
  let running = false;
  let onDone = null;
  let goods = FRUIT_SLICE;
  let spawnMs = 720;
  let mode = "fall";
  let wrapStep = 0;
  let heat = 0;

  function paintHits() {
    if (hitsEl) hitsEl.textContent = String(hits);
  }

  function spawnFall() {
    if (!running || mode !== "fall") return;
    const pool = goods.length ? goods : FRUIT_SLICE;
    const id = pool[Math.floor(Math.random() * pool.length)] || "mango";
    const tint = FRUIT_TINT[id] || "mango";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pack-good pack-fall pack-" + tint;
    btn.setAttribute("data-fruit", tint);
    btn.innerHTML = `<i></i><span>${id}</span>`;
    btn.style.left = 6 + Math.random() * 70 + "%";
    const life = 2100;
    btn.style.animationDuration = life + "ms";
    btn.addEventListener("click", () => {
      if (!running) return;
      hits += 1;
      paintHits();
      btn.classList.add("is-sliced");
      window.setTimeout(() => btn.remove(), 120);
    });
    slots.appendChild(btn);
    window.setTimeout(() => {
      if (btn.parentNode) btn.remove();
    }, life);
  }

  function paintBasket() {
    const zoneLeft = GOLD_LO;
    const zoneWidth = GOLD_HI - GOLD_LO;
    const inGold = goldHit(heat);
    slots.innerHTML = `
      <div class="pack-heat ${inGold ? "is-gold" : heat < GOLD_LO ? "is-pale" : "is-burnt"}">
        <i class="pack-heat-zone" style="left:${zoneLeft}%;width:${zoneWidth}%"></i>
        <i class="pack-heat-needle" style="left:${heat}%"></i>
      </div>
      <p class="pack-heat-read">${inGold ? "Gold" : heat < GOLD_LO ? "Pale" : "Burnt"}</p>
      <button type="button" class="pack-pull">Pull</button>
    `;
    const pull = slots.querySelector(".pack-pull");
    if (pull) {
      pull.addEventListener("click", () => {
        if (!running || mode !== "basket") return;
        if (goldHit(heat)) {
          hits += 1;
          paintHits();
        }
      });
    }
  }

  function paintWrap() {
    slots.innerHTML = `
      <p class="pack-wrap-step">Next: ${WRAP_ORDER[wrapStep]}</p>
      <div class="pack-wrap">
        ${WRAP_ORDER.map(
          (id) =>
            `<button type="button" class="pack-good pack-${FRUIT_TINT[id] || "paper"}" data-wrap="${id}"><i></i><span>${id}</span></button>`,
        ).join("")}
      </div>
    `;
    slots.querySelectorAll("[data-wrap]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!running || mode !== "wrap") return;
        const id = btn.getAttribute("data-wrap");
        if (id === WRAP_ORDER[wrapStep]) {
          wrapStep += 1;
          if (wrapStep >= WRAP_ORDER.length) {
            hits += 1;
            wrapStep = 0;
            paintHits();
          }
        } else {
          wrapStep = 0;
        }
        const next = slots.querySelector(".pack-wrap-step");
        if (next) next.textContent = "Next: " + WRAP_ORDER[wrapStep];
      });
    });
  }

  function finish(submit) {
    running = false;
    if (timer) clearInterval(timer);
    if (falling) clearInterval(falling);
    timer = 0;
    falling = 0;
    root.hidden = true;
    slots.innerHTML = "";
    const done = onDone;
    onDone = null;
    if (submit && done) done(hits);
  }

  function open(opts) {
    hits = 0;
    wrapStep = 0;
    heat = 0;
    startedAt = performance.now();
    spawnMs = 720;
    running = true;
    onDone = opts && opts.onDone;
    goods = opts && Array.isArray(opts.goods) && opts.goods.length ? opts.goods : FRUIT_SLICE;
    mode = modeFor(opts && opts.title);
    if (badge) badge.textContent = (opts && opts.title) || "Fruit slice";
    if (hint) hint.textContent = hintFor(mode, goods);
    root.hidden = false;
    slots.innerHTML = "";
    paintHits();
    if (clock) clock.textContent = PACK_SECONDS.toFixed(0) + "s";
    if (timer) clearInterval(timer);
    if (falling) clearInterval(falling);
    falling = 0;
    if (mode === "basket") {
      paintBasket();
    } else if (mode === "wrap") {
      paintWrap();
    } else {
      spawnFall();
      falling = setInterval(spawnFall, spawnMs);
    }
    timer = setInterval(() => {
      const spent = (performance.now() - startedAt) / 1000;
      const left = Math.max(0, PACK_SECONDS - spent);
      if (clock) clock.textContent = left.toFixed(0) + "s";
      if (mode === "basket") {
        heat = heatAt((performance.now() - startedAt));
        const zone = slots.querySelector(".pack-heat");
        const needle = slots.querySelector(".pack-heat-needle");
        const read = slots.querySelector(".pack-heat-read");
        if (zone) {
          const inGold = goldHit(heat);
          zone.classList.toggle("is-gold", inGold);
          zone.classList.toggle("is-pale", heat < GOLD_LO);
          zone.classList.toggle("is-burnt", heat > GOLD_HI);
        }
        if (needle) needle.style.left = heat + "%";
        if (read) read.textContent = goldHit(heat) ? "Gold" : heat < GOLD_LO ? "Pale" : "Burnt";
      } else if (mode === "fall") {
        const nextMs = Math.max(380, 720 - spent * 14);
        if (Math.abs(nextMs - spawnMs) > 40) {
          spawnMs = nextMs;
          clearInterval(falling);
          falling = setInterval(spawnFall, spawnMs);
        }
      }
      if (left <= 0) finish(true);
    }, 100);
  }

  function close() {
    finish(false);
  }

  if (closeBtn) closeBtn.addEventListener("click", close);

  return { open, close };
}
