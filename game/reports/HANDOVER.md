# Two Harbors handover (2026-08-17)

Paste this file into a **new chat**. Do not continue the bloated gauntlet thread.

This is a PAPER / SIMULATED harbour game in `/workspace/game`. The Polymarket paper bot in the rest of the repo is not the active work. Do not delete it.

Kernel contract: **[FOUNDATION.md](../FOUNDATION.md)**. Fable 5 notes: **[FABLE5_NOTES.md](FABLE5_NOTES.md)**. Roadmap: **[../ROADMAP.md](../ROADMAP.md)**.

## You are here

Shard kernel K.1. Operator playtest bar is still **`http://localhost:8787/`**. Houses must survive Restore. Minerals dock lists ore. Politics frozen.

Do **not** restart `/g/` critics.

## Play

```bash
cd /workspace/game
npm test
npm run play          # or game/scripts/restart-play.sh
```

Open **`http://localhost:8787/`**. Close leftover `/g/` tabs.

- Port **8787**. tmux session `two-harbors-play`. Binds `0.0.0.0:8787`.
- Cursor Desktop: plug icon → Auto-Forward Ports → open **8787**. Web-only agents do not put that port on your laptop.
- Left click / tap = walk or use. RMB-hold = orbit. Wheel = zoom. No WASD. No wallet.
- Taxi: stand on paved, hail, tap a named stop (Port / Mill St / …). Dirt forbidden.
- Ferry: near a port, ticket PAPER $15, North ↔ South.

## Git / PR

- Repo: `github.com/ObviouslyBlind/ClaudeAIIIO`
- Preferred base: `main`. Do **not** merge unless the operator asks.

## Guardrails

- Never fetch or reverse Capital Rift's play client, assets, or protocol.
- Keep `heightAt` in `src/land.ts` and `public/harbour/main.js` in sync.
- Keep `createWorld` in `src/server.ts`.
- Movement stays: tap-to-walk, taxi on paved, ferry between islands.
- Label PAPER / SIMULATED everywhere money shows.
