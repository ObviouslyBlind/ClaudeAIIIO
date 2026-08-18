/**
 * Site mini-game. Client-only timing. Skip never cuts hired output.
 * A finished shift asks the sim to sell a handful at once.
 */

export const PACK_SECONDS = 24;
export const FRUIT_SLICE = ["mango", "pineapple", "papaya", "banana", "watermelon"];

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
  let left = PACK_SECONDS;
  let timer = 0;
  let falling = 0;
  let running = false;
  let onDone = null;
  let goods = FRUIT_SLICE;
  let spawnMs = 720;

  function paintHits() {
    if (hitsEl) hitsEl.textContent = hits + " sliced · finish to sell 5–10";
  }

  function spawn() {
    if (!running) return;
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
    left = PACK_SECONDS;
    spawnMs = 720;
    running = true;
    onDone = opts && opts.onDone;
    goods = opts && Array.isArray(opts.goods) && opts.goods.length ? opts.goods : FRUIT_SLICE;
    if (badge) badge.textContent = ((opts && opts.title) || "Fruit slice") + " · PAPER";
    if (hint) hint.textContent = "Tap fruit as they fall. A full shift sells a handful.";
    root.hidden = false;
    slots.innerHTML = "";
    paintHits();
    if (clock) clock.textContent = left.toFixed(0) + "s";
    spawn();
    if (timer) clearInterval(timer);
    if (falling) clearInterval(falling);
    falling = setInterval(spawn, spawnMs);
    timer = setInterval(() => {
      left -= 0.1;
      if (clock) clock.textContent = Math.max(0, left).toFixed(0) + "s";
      const spent = PACK_SECONDS - left;
      const nextMs = Math.max(380, 720 - spent * 14);
      if (Math.abs(nextMs - spawnMs) > 40) {
        spawnMs = nextMs;
        clearInterval(falling);
        falling = setInterval(spawn, spawnMs);
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
