# Two Harbors handover (2026-08-17)

Paste this file into a **new chat**. Do not continue the bloated gauntlet thread.

This is a PAPER / SIMULATED harbour game in `/workspace/game`. The Polymarket paper bot in the rest of the repo is not the active work. Do not delete it.

## You are here

Operator came back to **playtest**. Bar is **`http://localhost:8787/`**, inland spawn, walkable harbour.

Gauntlet live. `/g/play95` PASS PLAY (taxi + short pier). Next `/g/house96` (Develop House → Enter → Exit).

Last playtest fix: D037 — taxi at boot; 7×32 m pier over water. D036 still applies (no auto trees).

## Play

```bash
cd /workspace/game
npm test
npm run play          # or game/scripts/restart-play.sh
```

Open **`http://localhost:8787/`**. Close leftover `/g/` tabs.

- Port **8787**. tmux session `two-harbors-play`.
- Left click / tap = walk or use. RMB-hold = orbit. No WASD. No wallet.
- Loop that was pixel-held: click land → lease cheap lot → House → Enter → Exit. Ferry ticket $15.

## Git / PR

- Repo: `github.com/ObviouslyBlind/ClaudeAIIIO`
- Branch: `cursor/two-harbors-game-plan-461c`
- Draft PR: https://github.com/ObviouslyBlind/ClaudeAIIIO/pull/30
- Keep the human title: **Two Harbors: claimable land parcels, ports, paper develop**
- Preferred base: `main`. Do **not** merge unless the operator asks.
- `gh` is read-only. Use `ManagePullRequest` for PR writes.
- Stage only the files you meant to change. Parallel builders dirty many harbour files.

## Spawn (live)

North player: port `{0, -6950}`, spawn `z - 8` → `z = -6958`.

| | north |
|---|---|
| `spawnCameraOffset` | `{ x: 20, y: 24, z: 40 }` |
| `spawnLookAtOffset` | `{ x: 0, y: 5, z: -120 }` |
| first-frame `CAM` | `{ x: 20, y: 26, z: -6918 }` |
| first-frame `LOOK` | `{ x: 0, y: 7, z: -7078 }` |

Camera sits slightly seaward of the visitor and looks **inland** along the tarmac. D029 seaward look (`z: -40` / look-at `z: +90`, first-frame `{18,22,-6888}` → berth `-6835`) is **superseded** for `/` (D030).

Ferry berth stays `HOME_Z = BERTH_Z = -6835`. Do not move `PLAN.md` / `BACKEND.md` / `land.ts` centres.

## Live quay extras

Keep: sage dinghies (`/g/ding65` PASS), rust buoy on cream hull (`/g/buoy70` PASS), normal crates / bollards / fenders.

Off the live quay (unread, wrecked playtest): brow, plate, ring, funnel, cargo, teal, clay, green. Do not put 8–40 m cubes back for a critic.

## Pixel-held (do not redo)

Inland spawn, paved ribbon, dirt, cars, yellow taxi, trees+cart, lease → House → Enter → Exit, ferry $15, RMB orbit (humans), cream hull `/g/ferry37`, shore foam `/g/shore40`, quay crates `/g/quay41`, crate-scale peds `/g/peds44` (teal `0x2a7a72` / slate `0x4a6e8a` / green `0x6a8f44` / terracotta `0xc45c3a`), nametags `/g/tags46`, HUD `/g/hud47`–`52` `/g/near50` `/g/flow51`, fender `/g/fend54`, dinghies `/g/ding65`, buoy `/g/buoy70`.

## Pixel failed / stopped (do not restart)

lamps 55–58, signs 59–62, ding 63–64, brows 66–68, buoy69, rings 71–73, funnels 74–75, cargo 76–78, plates 79–81, teal 82–83, clay 84–85, green 86–87.

computerUse **cannot** emit trusted RMB. Never ask a critic to orbit. Unique `/g/…` path each critic. `resolvePublicPath` maps `/g/*` → `/harbour/index.html`. Do not restart play while a critic is on the page.

## Frozen

House bills, Senate, councils, elections, amendments. Statute catalog is sim data only.

No wallet, no secrets, no live trading, no WASD. Label PAPER / SIMULATED. Do not clone Capital Rift / CoD / OSM Earth.

## Hard files

- Skill: `.cursor/skills/two-harbors-gauntlet/SKILL.md`
- Status: `game/reports/GAUNTLET_STATUS.md` (long critic log — do not paste it into chat)
- Run: `docs/RUNBOOK.md`
- `createWorld` stays in `game/src/server.ts`

WOOD / PLASTER / LINEN / KRAFT hexes. Ped shirts already used: teal / green / terracotta. Avoid new greys (`isGrey`).

## If the operator is playing

Help them play. Do not start a new cube round. Do not flip spawn seaward “so the critic can see the ferry.”

If `/` looks like a broken harbour: they still have a stale `/g/` tab, or play was not restarted after `e0cc773a`. Restart `game/scripts/restart-play.sh`, open `/` in a fresh tab.

## If they ask to resume the gauntlet

One inspectable bar. Not more unread giant cubes. Building shells still wait (not in inland first frame; critic cannot RMB). Next useful bars are playtest bugs the operator names, not another funnel.
