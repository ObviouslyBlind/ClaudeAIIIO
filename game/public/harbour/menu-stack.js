/**
 * HUD menu stack. Play systems nest here (Menu → market / cart / pack).
 * Walking chrome stays on the camera. Mirrors game/src/kernel/menus.ts.
 */

export const MENU_TITLES = {
  root: "Harbour",
  play: "Menu",
  inspect: "Plot",
  develop: "Develop",
  staff: "Staff",
  minerals: "Minerals",
  inventory: "Cart",
  market: "Market",
  warehouse: "Warehouse",
  pack: "Pack",
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
  let render = opts.render || null;

  function paint() {
    const top = topMenu(stack);
    if (titleEl) titleEl.textContent = top.title;
    if (crumbsEl) crumbsEl.textContent = crumbs(stack).join(" · ");
    if (root) {
      if (stack.frames.length <= 1) root.setAttribute("hidden", "");
      else root.removeAttribute("hidden");
    }
    if (backBtn) backBtn.disabled = stack.frames.length <= 1;
    if (typeof render === "function") {
      render(top, bodyEl, stack);
    } else if (bodyEl) {
      bodyEl.innerHTML = top.id === "root" ? "" : top.html || bodyHtml;
    }
    return top;
  }

  function open(frame, html) {
    const next = pushMenu(stack, frame);
    if (html != null) {
      next.html = html;
      bodyHtml = html;
    }
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

  function setRender(fn) {
    render = fn;
  }

  if (backBtn && backBtn.addEventListener) backBtn.addEventListener("click", back);
  if (closeBtn && closeBtn.addEventListener) closeBtn.addEventListener("click", close);
  paint();

  return {
    stack,
    open,
    back,
    close,
    paint,
    setRender,
    top: () => topMenu(stack),
    isOpen: () => stack.frames.length > 1,
  };
}

let mounted = null;
if (typeof document !== "undefined" && document.getElementById && document.getElementById("menu-stack")) {
  mounted = mountMenuStack();
  globalThis.__harbourMenus = mounted;
}

export function harbourMenus() {
  return mounted || globalThis.__harbourMenus || null;
}
