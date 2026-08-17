/**
 * HUD menu stack. Systems nest (inspect → minerals → inventory).
 * PAPER / SIMULATED. Mirrors game/src/kernel/menus.ts for the browser.
 */

export const MENU_TITLES = {
  root: "Harbour",
  inspect: "Plot",
  develop: "Develop",
  staff: "Staff",
  minerals: "Minerals",
  inventory: "Inventory",
};

export function createMenuStack() {
  return { frames: [{ id: "root", title: MENU_TITLES.root }] };
}

export function topMenu(stack) {
  return stack.frames[stack.frames.length - 1];
}

export function pushMenu(stack, frame) {
  const top = topMenu(stack);
  if (top && top.id === frame.id && (top.plotId || null) === (frame.plotId || null)) {
    return top;
  }
  const next = {
    id: frame.id,
    title: frame.title || MENU_TITLES[frame.id] || frame.id,
    plotId: frame.plotId || null,
  };
  stack.frames.push(next);
  return next;
}

export function popMenu(stack) {
  if (stack.frames.length > 1) stack.frames.pop();
  return topMenu(stack);
}

export function resetMenu(stack) {
  stack.frames = [{ id: "root", title: MENU_TITLES.root }];
  return topMenu(stack);
}

export function crumbs(stack) {
  return stack.frames.map((f) => f.title);
}

function lookup(id) {
  return typeof document !== "undefined" && document.getElementById
    ? document.getElementById(id)
    : null;
}

export function mountMenuStack(opts = {}) {
  const root = opts.root !== undefined ? opts.root : lookup("menu-stack");
  const titleEl = opts.titleEl !== undefined ? opts.titleEl : lookup("menu-title");
  const crumbsEl = opts.crumbsEl !== undefined ? opts.crumbsEl : lookup("menu-crumbs");
  const bodyEl = opts.bodyEl !== undefined ? opts.bodyEl : lookup("menu-body");
  const backBtn = opts.backBtn !== undefined ? opts.backBtn : lookup("menu-back");
  const closeBtn = opts.closeBtn !== undefined ? opts.closeBtn : lookup("menu-close");
  const stack = createMenuStack();
  let bodyHtml = "";

  function paint() {
    const top = topMenu(stack);
    if (titleEl) titleEl.textContent = top.title;
    if (crumbsEl) crumbsEl.textContent = crumbs(stack).join(" · ");
    if (bodyEl) bodyEl.innerHTML = top.id === "root" ? "" : bodyHtml;
    if (root) {
      if (stack.frames.length <= 1) root.setAttribute("hidden", "");
      else root.removeAttribute("hidden");
    }
    if (backBtn) backBtn.disabled = stack.frames.length <= 1;
  }

  function open(frame, html) {
    pushMenu(stack, frame);
    bodyHtml = html || "";
    paint();
    return topMenu(stack);
  }

  function back() {
    popMenu(stack);
    if (stack.frames.length <= 1) bodyHtml = "";
    paint();
    return topMenu(stack);
  }

  function close() {
    resetMenu(stack);
    bodyHtml = "";
    paint();
    return topMenu(stack);
  }

  if (backBtn && backBtn.addEventListener) backBtn.addEventListener("click", back);
  if (closeBtn && closeBtn.addEventListener) closeBtn.addEventListener("click", close);
  paint();

  return { stack, open, back, close, paint, top: () => topMenu(stack) };
}

let mounted = null;
if (typeof document !== "undefined" && document.getElementById && document.getElementById("menu-stack")) {
  mounted = mountMenuStack();
  globalThis.__harbourMenus = mounted;
}

export function harbourMenus() {
  return mounted || globalThis.__harbourMenus || null;
}
