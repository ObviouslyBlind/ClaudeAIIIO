---
name: two-harbors-play-ops
description: >
  Two Harbors play server and tunnel ops. Use when restarting play, cache-busting,
  ASSET_NONCE, or Cloudflare quick tunnels. Restart wipes.
---

# Play ops

```bash
cd game
npm test
bash scripts/restart-play.sh
```

- `tsx src/server.ts` binds `0.0.0.0:8787`.
- Restart **wipes** in-memory play.
- After JS/CSS changes, restart so `ASSET_NONCE` changes (`cache-bust.ts`).
  Server already sends `Cache-Control: no-store`.
- Operator plays from cursor.com/agents via the tunnel in
  `game/reports/HANDOVER.md`. Do not tell them to use localhost.
- If the tunnel dies, new quick tunnel to `http://127.0.0.1:8787` and update handover.

`npm run play:laptop` for a pasteable URL when working locally.
