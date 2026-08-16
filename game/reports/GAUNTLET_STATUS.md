# Gauntlet status

Loop is **autonomous**. Critic = pixels only. Tests = lead/builder.

**Held:** inland spawn, black tarmac, PAPER HUD — only when a **fresh** document actually boots.
**Shipped (code):** taxi, RMB orbit, ferry ticket, catalogue, interiors.

## Round 12–13 — traffic critic

Both pixel critics **FAIL** on a blank teal viewport + Cash $0.

Round 13 still showed the **old** status line (“Tap a piece of land…”) and no Enter button. That is a **stale tab**, not a live load of the boot-fix HTML (which starts as `Loading 3D harbour…` and stamps the tab title with a nonce).

**This round:** classic (non-module) `fetch("/api/map")` writes Cash even if three.js never runs; tab title includes the asset nonce; critics must open a **new query** so Chrome does not reuse the dead tab.

## Next critic

Open **exactly** `http://localhost:8787/?g=13`  
(not `/harbour/index.html`, not a tab that is already on `/`).

Wait until Cash is not `$0`. Then wait ~6s. PASS traffic only if colored vehicle meshes are visible on black tarmac.

Do not rewrite `traffic.js`, island centres, or PLAN.md.
