# Two Harbors handover (2026-08-17)

Paste this file into a **new chat**. Do not continue the bloated gauntlet thread.

This is a PAPER / SIMULATED harbour game in `/workspace/game`. The Polymarket paper bot in the rest of the repo is not the active work. Do not delete it.

Kernel contract: **[FOUNDATION.md](../FOUNDATION.md)**. Fable 5 notes: **[FABLE5_NOTES.md](FABLE5_NOTES.md)**. Roadmap: **[../ROADMAP.md](../ROADMAP.md)**.

## You are here

Shard kernel K.1. **Play restart wipes.** No Restore button on the sheet. Minerals dock lists ore. Politics frozen.

## Play

The harbour is a Node process on this VM, port **8787**.

- **Cursor Desktop:** plug icon → forward **8787** → Open. That is how you play.
- **Web-only cursor.com/agents:** you cannot hit this VM as localhost. Do not try `localhost:8787` in Safari/Chrome on your laptop.

```bash
cd /workspace/game
npm test
npm run play          # or game/scripts/restart-play.sh
```

Left click / tap = walk or use. RMB-hold = orbit. Wheel = zoom. No WASD. No wallet. Taxi on paved. Ferry $15 North ↔ South.

## Git / PR

- Repo: `github.com/ObviouslyBlind/ClaudeAIIIO`
- Preferred base: `main`. Draft PR: https://github.com/ObviouslyBlind/ClaudeAIIIO/pull/33. Do **not** merge unless the operator asks.

## Guardrails

- Never fetch or reverse Capital Rift's play client, assets, or protocol.
- Keep `heightAt` in `src/land.ts` and `public/harbour/main.js` in sync.
- Keep `createWorld` in `src/server.ts`.
- Movement stays: tap-to-walk, taxi on paved, ferry between islands.
- Label PAPER / SIMULATED everywhere money shows.
