# Gauntlet status — five parallel builders

Loop is **autonomous**. Critic = pixels only. Tests = each builder. No user hard-refresh.

**Held:** inland spawn, black tarmac, PAPER HUD.
**Traffic:** still under a strict pixel critic (must see colored meshes move). Do not rewrite `traffic.js`.

**Live builders (one piece each, cursor grok 4.6 high fast):**

1. Taxi: 60s leave if not boarded; boarded → top-down island map, tap dest — `taxi.js` + overlay
2. RMB-hold camera (Roblox-style); left click still walk — `camera.js`
3. Ferry quote: route + PAPER cost before travel — `ferry-ticket.js`
4. Building catalog: house / shop / house+shop / farm / factory shells — `buildings.js`
5. Interiors: enter owned buildings, up/down — `interior.js`

Do not touch `traffic.js`, `land.ts` island centres, or PLAN.md. Rebase if `main.js` conflicts; keep other agents' imports.

**You are the brake.**
