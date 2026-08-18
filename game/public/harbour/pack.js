/**
 * Cart pack shift. Client-only timing. The sim already sold; POST only
 * asks for a PAPER bonus. Skip or miss never cuts stall output.
 */

const PACK_GOODS = [
  "corn",
  "potato",
  "lettuce",
  "beans",
  "ore",
  "lumber",
  "planks",
  "nails",
  "iron bars",
  "tools",
  "concrete",
  "fuel",
];

export const PACK_SECONDS = 8;

function el(id) {
  return document.getElementById(id);
}

export function mountPackShift() {
  const root = el("pack-shift");
  const slots = el("pack-slots");
  const clock = el("pack-clock");
  const hitsEl = el("pack-hits");
  const closeBtn = el("pack-close");
  if (!root || !slots) {
    return { open() {}, close() {} };
  }

  let hits = 0;
  let left = PACK_SECONDS;
  let timer = 0;
  let running = false;
  let onDone = null;

  function paintHits() {
    if (hitsEl) hitsEl.textContent = hits + " packed · PAPER";
  }

  function flash() {
    slots.innerHTML = "";
    const id = PACK_GOODS[Math.floor(Math.random() * PACK_GOODS.length)] || "corn";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pack-good";
    btn.textContent = id.replace("_", " ");
    btn.addEventListener("click", () => {
      if (!running) return;
      hits += 1;
      paintHits();
      flash();
    });
    slots.appendChild(btn);
  }

  function finish(submit) {
    running = false;
    if (timer) clearInterval(timer);
    timer = 0;
    root.hidden = true;
    const done = onDone;
    onDone = null;
    if (submit && done) done(hits);
  }

  function open(opts) {
    hits = 0;
    left = PACK_SECONDS;
    running = true;
    onDone = opts && opts.onDone;
    root.hidden = false;
    paintHits();
    if (clock) clock.textContent = left.toFixed(1);
    flash();
    if (timer) clearInterval(timer);
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
