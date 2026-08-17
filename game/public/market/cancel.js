/**
 * Cancel PAPER on each open visitor order in the market strip.
 * POST /api/order/cancel { orderId }. SIMULATED. No wallet.
 */

const strip = document.getElementById("order-strip");

function reasonCopy(reason) {
  if (reason === "missing") return "That PAPER order is gone. PAPER · SIMULATED.";
  if (reason === "not-owner") return "Not your PAPER order. PAPER · SIMULATED.";
  if (reason) return "Could not cancel: " + reason + " (PAPER).";
  return "";
}

function setNotice(text) {
  const el = strip && strip.querySelector("#order-err");
  if (el) el.textContent = text || "";
}

function mountCancelButtons() {
  const list = document.getElementById("open-orders");
  if (!list) return;
  list.querySelectorAll(":scope > .row").forEach((row) => {
    if (row.querySelector("[data-paper-cancel]")) return;
    const orderId = row.dataset.orderId;
    if (orderId == null || orderId === "") return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.paperCancel = "1";
    btn.dataset.orderId = String(orderId);
    btn.title = "PAPER · SIMULATED · no wallet";
    btn.textContent = "Cancel PAPER";
    row.appendChild(btn);
  });
}

async function cancel(orderId) {
  const res = await fetch("/api/order/cancel", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ orderId }),
  });
  const body = await res.json();
  setNotice(body.ok ? "Cancelled PAPER · SIMULATED." : reasonCopy(body.reason));
  if (typeof applySnapshot === "function") applySnapshot(body.snapshot);
  mountCancelButtons();
}

if (strip) {
  const list = document.getElementById("open-orders");
  if (list) {
    new MutationObserver(mountCancelButtons).observe(list, { childList: true });
  }

  strip.addEventListener("click", (ev) => {
    const btn = ev.target && ev.target.closest("[data-paper-cancel]");
    if (!btn || !strip.contains(btn)) return;
    ev.preventDefault();
    const orderId = Number(btn.dataset.orderId);
    if (!Number.isFinite(orderId)) return;
    cancel(orderId);
  });

  mountCancelButtons();
}
