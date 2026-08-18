/**
 * HUD menu stack. Play systems nest (Menu → market / cart / pack).
 * Inspect still nests (plot → develop → staff → minerals).
 * Client renders frames. Server does not own chrome.
 */

export const MENU_IDS = [
  "root",
  "play",
  "inspect",
  "develop",
  "staff",
  "minerals",
  "inventory",
  "market",
  "warehouse",
  "pack",
] as const;

export type MenuId = (typeof MENU_IDS)[number];

export type MenuFrame = {
  id: MenuId;
  title: string;
  plotId?: string | null;
};

export type MenuStack = {
  frames: MenuFrame[];
};

const ROOT: MenuFrame = { id: "root", title: "Harbour" };

export const MENU_TITLES: Record<MenuId, string> = {
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

export function createMenuStack(): MenuStack {
  return { frames: [{ ...ROOT }] };
}

export function topMenu(stack: MenuStack): MenuFrame {
  return stack.frames[stack.frames.length - 1] ?? ROOT;
}

export function menuDepth(stack: MenuStack): number {
  return stack.frames.length;
}

export function pushMenu(stack: MenuStack, frame: MenuFrame): MenuFrame {
  const top = topMenu(stack);
  if (top.id === frame.id && (top.plotId ?? null) === (frame.plotId ?? null)) {
    return top;
  }
  const next: MenuFrame = {
    id: frame.id,
    title: frame.title || MENU_TITLES[frame.id],
    plotId: frame.plotId ?? null,
  };
  stack.frames.push(next);
  return next;
}

export function popMenu(stack: MenuStack): MenuFrame {
  if (stack.frames.length > 1) stack.frames.pop();
  return topMenu(stack);
}

export function resetMenu(stack: MenuStack): MenuFrame {
  stack.frames = [{ ...ROOT }];
  return topMenu(stack);
}

export function crumbs(stack: MenuStack): string[] {
  return stack.frames.map((f) => f.title);
}

export function isMenuId(raw: unknown): raw is MenuId {
  return typeof raw === "string" && (MENU_IDS as readonly string[]).includes(raw);
}
