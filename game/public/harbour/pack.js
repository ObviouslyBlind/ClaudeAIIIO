/**
 * Site mini-game. Client-only timing. The clock runs out; there is no skip.
 * A finished shift asks the sim to sell a handful at once.
 * Tap only. No WASD.
 */

export const PACK_SECONDS = 24;
export const FRUIT_SLICE = ["mango", "pineapple", "papaya", "banana", "watermelon"];
export const GOLD_LO = 58;
export const GOLD_HI = 76;
/** Basket pull: gold starts this wide (% of the heat bar). */
export const GOLD_WIDTH_START = 16;
/** Shrinks toward this. Middle of easy 11 and hard 6. */
export const GOLD_WIDTH_END = 9;
/** Needle sweep. Shorter = less time in gold. */
export const HEAT_CYCLE_MS = 3500;
/** Stops mash. Short enough to retry the next pass. */
export const PULL_LOCK_MS = 480;
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
  if (t.includes("ripe") || t.includes("sort")) return "sort";
  if (t.includes("seed")) return "seed";
  return "fall";
}

export function hintFor(mode, goods) {
  if (mode === "basket") return "Tap when the fry is gold. Pale is early. Burnt is late.";
  if (mode === "wrap") return "Paper, then fish, then chips.";
  if (mode === "sort") return "Tap ripe fruit. Leave the brown ones.";
  if (mode === "seed") return "Tap seeds. Leave the rind.";
  const pool = Array.isArray(goods) ? goods : [];
  if (pool.includes("fish") || pool.includes("batter")) return "Tap fish, chips, batter.";
  if (pool.includes("watermelon") && pool.length <= 3) return "Tap melon.";
  return "Tap fruit.";
}

function heatAt(elapsedMs) {
  const cycle = HEAT_CYCLE_MS;
  const u = (elapsedMs % cycle) / cycle;
  if (u < 0.5) return u * 2 * 100;
  return (1 - (u - 0.5) * 2) * 100;
}

/** Gold window slides and shrinks over the shift. Pale is left, burnt is right. */
export function goldBandAt(elapsedMs) {
  const t = Math.max(0, Math.min(1, Number(elapsedMs) / (PACK_SECONDS * 1000)));
  const width = GOLD_WIDTH_START + (GOLD_WIDTH_END - GOLD_WIDTH_START) * t;
  const wander = Math.sin(Number(elapsedMs) / 740) * 18 + Math.sin(Number(elapsedMs) / 1260) * 9;
  const half = width / 2;
  let center = 52 + wander;
  center = Math.max(8 + half, Math.min(92 - half, center));
  return { lo: center - half, hi: center + half };
}

export function goldHit(heat, band) {
  const b = band && Number.isFinite(band.lo) ? band : { lo: GOLD_LO, hi: GOLD_HI };
  return heat >= b.lo && heat <= b.hi;
}

export function mountPackShift() {
  const root = el("pack-shift");
  const slots = el("pack-slots");
  const clock = el("pack-clock");
  const hitsEl = el("pack-hits");
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
  let band = goldBandAt(0);
  let lastPullAt = 0;

  function paintHits() {
    if (hitsEl) hitsEl.textContent = String(hits);
  }

  function basketRead(h, b) {
    if (goldHit(h, b)) return "Gold";
    if (h < b.lo) return "Pale";
    return "Burnt";
  }

  function applyBasketFrame() {
    const elapsed = performance.now() - startedAt;
    heat = heatAt(elapsed);
    band = goldBandAt(elapsed);
    const inGold = goldHit(heat, band);
    const zone = slots.querySelector(".pack-heat");
    const goldZone = slots.querySelector(".pack-heat-zone");
    const needle = slots.querySelector(".pack-heat-needle");
    const read = slots.querySelector(".pack-heat-read");
    if (zone) {
      zone.classList.toggle("is-gold", inGold);
      zone.classList.toggle("is-pale", heat < band.lo);
      zone.classList.toggle("is-burnt", heat > band.hi);
    }
    if (goldZone) {
      goldZone.style.left = band.lo + "%";
      goldZone.style.width = band.hi - band.lo + "%";
    }
    if (needle) needle.style.left = heat + "%";
    if (read) read.textContent = basketRead(heat, band);
  }

  function spawnFall() {
    if (!running || (mode !== "fall" && mode !== "sort" && mode !== "seed")) return;
    let id;
    let bad = false;
    if (mode === "seed") {
      bad = Math.random() < 0.38;
      id = bad ? "rind" : "seeds";
    } else if (mode === "sort") {
      const pool = goods.length ? goods : FRUIT_SLICE;
      id = pool[Math.floor(Math.random() * pool.length)] || "mango";
      bad = Math.random() < 0.32;
    } else {
      const pool = goods.length ? goods : FRUIT_SLICE;
      id = pool[Math.floor(Math.random() * pool.length)] || "mango";
    }
    const tint = FRUIT_TINT[id] || (bad ? "chips" : "mango");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pack-good pack-fall pack-" + tint + (bad ? " is-mush" : "");
    btn.setAttribute("data-fruit", tint);
    btn.setAttribute("data-ripe", bad ? "0" : "1");
    btn.innerHTML = `<i></i><span>${bad && mode === "sort" ? "brown " + id : id}</span>`;
    btn.style.left = 6 + Math.random() * 70 + "%";
    const life = 2100;
    btn.style.animationDuration = life + "ms";
    btn.addEventListener("click", () => {
      if (!running) return;
      const ripe = btn.getAttribute("data-ripe") !== "0";
      if (mode === "sort" || mode === "seed") {
        if (ripe) hits += 1;
        else hits = Math.max(0, hits - 1);
      } else {
        hits += 1;
      }
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
    band = goldBandAt(performance.now() - startedAt);
    const inGold = goldHit(heat, band);
    const zoneLeft = band.lo;
    const zoneWidth = band.hi - band.lo;
    slots.innerHTML = `
      <div class="pack-heat ${inGold ? "is-gold" : heat < band.lo ? "is-pale" : "is-burnt"}">
        <i class="pack-heat-zone" style="left:${zoneLeft}%;width:${zoneWidth}%"></i>
        <i class="pack-heat-needle" style="left:${heat}%"></i>
      </div>
      <p class="pack-heat-read">${basketRead(heat, band)}</p>
      <button type="button" class="pack-pull">Pull</button>
    `;
    const pull = slots.querySelector(".pack-pull");
    if (pull) {
      pull.addEventListener("click", () => {
        if (!running || mode !== "basket") return;
        const now = performance.now();
        if (now - lastPullAt < PULL_LOCK_MS) return;
        lastPullAt = now;
        const elapsed = now - startedAt;
        heat = heatAt(elapsed);
        band = goldBandAt(elapsed);
        applyBasketFrame();
        if (goldHit(heat, band)) {
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
    band = goldBandAt(0);
    lastPullAt = 0;
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
        applyBasketFrame();
      } else if (mode === "fall" || mode === "sort" || mode === "seed") {
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

  return { open, close };
}
