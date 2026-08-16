# Skills to get Two Harbors rolling

What this agent actually needs, what is installed in `.cursor/skills/`, and what can wait.

Nothing named **aeiou** was in this workspace (no clone, submodule, or remote). `github.com/aeiouofficial` was not used. If that was a Cursor dashboard skill source, remove it there; it cannot be deleted from this repo because it is not here.

## Install now (done)

| Skill | Why |
|---|---|
| **two-harbors-sim** (ours) | Spec gate: follow `PLAN.md`, sim-first, no Capital Rift clone |
| **impeccable** (`pbakaus/impeccable`) | Later UI: Hansard, market sheet, HUD. Installed, **not** used on step A |
| **threejs-scene-setup** / **gltf** / **materials** | Step L client only |
| **input-systems** | One mapped primary/secondary scheme (section 3.10) |
| **save-systems** | Persist world, applications, offices |
| **game-ui-ux** | Phone-safe HUD, safe areas |
| **performance-optimization** | 30fps harbour on a phone |
| **survival-crafting** | Closest genre pack: gather → craft → site, not a shooter |

## Needed in our heads, not as a GitHub skill

These are the real work. No off-the-shelf skill replaces them.

1. **Authoritative tick** — 1Hz world, deterministic seed, no client-trusted prices
2. **Order books** — two islands later; one island now; escrowed bids
3. **Faucet/sink ledger** — money supply that can be audited every tick
4. **Statute table** — catalog rows that write sim fields (step B)
5. **Intent protocol** — buy/sell/move/vote/apply as messages
6. **Interest management** — nearby actors only (when 3D exists)
7. **Planning + firms** — size class, Owner vs CEO, AI workers
8. **Election clock** — day 14 / 21 / 28-day cycle

## Do not install yet

- The full 67-skill gamedev dump (Godot, Unity, Unreal, Roblox) — noise
- Colyseus/PlayCanvas skills — pick a net layer after the sim is real
- Running Impeccable on the tick loop — it is a design skill, not an economy skill

## How to run skills

- Sim/economy work → `two-harbors-sim`
- Canvas HUD / Hansard / landing → `impeccable` then `game-ui-ux`
- Three.js harbour → `threejs-scene-setup`
