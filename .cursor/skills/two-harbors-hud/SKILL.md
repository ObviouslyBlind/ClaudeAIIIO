---
name: two-harbors-hud
description: >
  Two Harbors DOM HUD. Use when editing chrome, menu stack, econ strip, market
  submenus, or dock chips. Phone-safe. Impeccable for visual craft, not sim.ts.
---

# HUD

DOM over the canvas. Not world-space health bars. Not a React app.

- Shell: `chrome.js` + `chrome.css` — dusk-ferry brass, destination-board wordmark.
- Stack: `menu-stack.js` mirrors `kernel/menus.ts`.
- Always-on econ: money supply, 24h goods, price index (`hud-econ.js`).
- Dock: taxi / ferry / exit at the bottom. Cash top-left.
- Market/Inv/Staff: one compact submenu, Back drills in.
- PAPER labels on money.

Planning and Hansard are PLAN M — do not invent a 3D council hall for votes.

Impeccable: HUD chrome only. Never `/impeccable craft` on `sim.ts`.
Pair with `game-ui-ux`, `web-design-guidelines`, `two-harbors-phone`.
