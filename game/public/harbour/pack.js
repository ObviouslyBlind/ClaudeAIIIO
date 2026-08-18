/**
 * Site mini-game. Client-only timing. The sim already sold; POST only
 * asks for a PAPER bonus and a sales boost. Skip or miss never cuts output.
 */

export const PACK_SECONDS = 8;
export const FRUIT_SLICE = ["mango", "pineapple", "papaya", "banana", "watermelon"];

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

  function paintHits() {
    if (hitsEl) hitsEl.textContent = hits + " sliced · PAPER";
  }

  function spawn() {
    if (!running) return;
    const pool = goods.length ? goods : FRUIT_SLICE;
    const id = pool[Math.floor(Math.random() * pool.length)] || "mango";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pack-good pack-fall";
    btn.textContent = id;
    btn.style.left = 8 + Math.random() * 72 + "%";
    btn.addEventListener("click", () => {
      if (!running) return;
      hits += 1;
      paintHits();
      btn.remove();
    });
    slots.appendChild(btn);
    window.setTimeout(() => {
      if (btn.parentNode) btn.remove();
    }, 1400);
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
    running = true;
    onDone = opts && opts.onDone;
    goods = opts && Array.isArray(opts.goods) && opts.goods.length ? opts.goods : FRUIT_SLICE;
    if (badge) badge.textContent = ((opts && opts.title) || "Fruit slice") + " · PAPER";
    root.hidden = false;
    slots.innerHTML = "";
    paintHits();
    if (clock) clock.textContent = left.toFixed(1);
    spawn();
    if (timer) clearInterval(timer);
    if (falling) clearInterval(falling);
    falling = setInterval(spawn, 520);
    timer = setInterval(() => {
      left -= 0.1;
      if (clock) clock.textContent = Math.max(0, left).toFixed(1);
      if (left <= 0) finish(true);
    }, 100);
  }

  function close() {
    finish(false);
  }

  if (closeBtn) closeBtn.addEventListener("click", close);

  return { open, close };
}
