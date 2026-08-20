---
name: two-harbors-gauntlet
description: Run a constrained Gauntlet Loop on one Two Harbors piece. Builder and blind critic, real bar, ratchet. Never use Capital Rift or Call of Duty as the visual bar. Never skip PLAN.md.
---

# Two Harbors Gauntlet

Read `game/GAUNTLET.md` and `game/PLAN.md` first. Live ratchet: `game/reports/GAUNTLET_STATUS.md`. Doc map: `game/docs/README.md`. Do not restart the swarm unless a named piece is in a real loop.

## Roles (do not mix)

- **Lead** (this run): splits one piece, runs `cd game && npm test`, restarts play, updates `game/reports/GAUNTLET_STATUS.md`, launches the next agent without waiting for the user to type.
- **Builder**: ships running code. Runs unit tests. Does not grade its own pixels.
- **Critic**: pixels (or HUD HTML) only. Opens `http://localhost:8787/`. Does **not** run `npm test`. Does **not** ask anyone to hard-refresh. Server already stamps JS/CSS and sends `Cache-Control: no-store`. Wait a few seconds if the bar needs motion (traffic). Screenshot. Pass/fail the named bar. Stop.

## Loop (autonomous)

1. Lead picks the next queued piece from `GAUNTLET_STATUS.md`.
2. Builder ships. Lead runs tests, restarts `two-harbors-play` (`npm run play`).
3. Fresh critic, cursor grok 4.6 high fast, computerUse, live page only.
4. On critic completion the **lead continues immediately**: fail → one fix; pass → next queued piece. Do not wait for the user to refresh the chat.
5. Stop only if the user says stop, or the critic cannot name a gap worth the cost.

User is the brake, not the clock.

## Bar

Current slice: **base harbour loop** (spawn, cart, lease, develop, market, nearby outdoor presence, persist). Genre-close to a public persistent shard: one world, sim owns numbers. One inspectable bar per round.

Forbidden: cloning Capital Rift’s client / Earth / OSM / wallet, Call of Duty, “looks AAA.”

## Frozen (do not launch)

House bills, Senate, councils, elections, amendments. Statute catalog is sim data only.

## Do not

- Fan out a whole FPS
- Let the critic grade a summary or run the test suite
- Rewrite `BACKEND.md` as a side effect
- Run uncapped overnight without a status page
- Start new politics work while the harbour loop is the bar
