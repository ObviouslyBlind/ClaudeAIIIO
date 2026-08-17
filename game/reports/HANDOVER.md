# Two Harbors handover (2026-08-17)

Paste this file into a **new chat**. Do not continue the bloated gauntlet thread.

This is a PAPER / SIMULATED harbour game in `/workspace/game`. The Polymarket paper bot in the rest of the repo is not the active work. Do not delete it.

Fable 5’s ship list: **[FABLE5_NOTES.md](FABLE5_NOTES.md)**. Roadmap: **[../ROADMAP.md](../ROADMAP.md)**.

## You are here

Operator playtest. Bar is **`http://localhost:8787/`**, inland spawn, walkable harbour with a priced parcel map, named side streets, point taxi, honest traffic.

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
- Left click / tap = walk or use. Click a **$ tag** for name / cost / Lease or Close. RMB-hold = orbit. Wheel = zoom. No WASD. No wallet.
- Taxi: stand on paved, hail, tap a named stop (Port / Mill St / …). Dirt forbidden.
- Ferry: near a port, ticket PAPER $15, North ↔ South.

## Git / PR

- Repo: `github.com/ObviouslyBlind/ClaudeAIIIO`
- Branch: `cursor/capital-map-v2-183a`
- Draft PR: https://github.com/ObviouslyBlind/ClaudeAIIIO/pull/31
- Preferred base: `main`. Do **not** merge unless the operator asks (this PR is the whole game).
- `gh` is read-only. Use ManagePullRequest for PR writes.

## Guardrails

- Never fetch or reverse Capital Rift's play client, assets, or protocol.
- Keep `heightAt` in `src/land.ts` and `public/harbour/main.js` in sync.
- Keep `createWorld` in `src/server.ts`.
- Movement stays: tap-to-walk, taxi on paved, ferry between islands.
- Label PAPER / SIMULATED everywhere money shows.
