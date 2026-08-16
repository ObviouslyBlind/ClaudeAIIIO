# The Gauntlet Loop (research)

Matt Shumer’s name for the workflow behind [Claude of Duty](https://github.com/mshumer/Claude-of-Duty) (July 2026). Not a game mechanic. Not Capital Rift.

## What it is

A lead agent gets a **goal** and a **real bar**. It splits the work into small pieces. Each piece gets:

1. A **builder** that produces a checkable artifact (running game, screenshot, test output).
2. A **fresh critic** that never sees the builder’s excuses. The critic looks at the real output vs the bar, preferably blind A/B, and picks a winner.
3. If the bar wins, the critic names the **one biggest gap**. The builder goes again.
4. No fixed round cap. **You** are the brake.

The original prompt was ~150 words: AAA FPS in Three.js, fan out sub-agents, harsh visual critic, side-by-side with Call of Duty, `/loop` until it wins. The run was many hours, tens of thousands of lines, every texture in code. It was never a one-shot.

Guides: [somethingbig.ai/gauntlet-loop](https://somethingbig.ai/gauntlet-loop), prompt at [mshumer/Claude-of-Duty/prompt.md](https://github.com/mshumer/Claude-of-Duty/blob/main/prompt.md).

## Rules that actually matter

| Do | Don’t |
|---|---|
| Concrete bar you can inspect | “Make it amazing” |
| Critic on pixels / tests / the running page | Critic on the builder’s write-up |
| Keep the best candidate (ratchet) | Drift sideways after a bad round |
| User stops the run | Uncapped spend with no status page |
| Split into pieces a critic can judge | One agent grades its own homework |

Independent testers: a verdict from **bad evidence** (broken screenshot, lying capture) is worse than no verdict.

## What this is not for Two Harbors

- Do **not** set the bar to Capital Rift screenshots, their client, or Call of Duty. That is a clone prompt.
- Do **not** Gauntlet the whole MMO in one run. PLAN is still sim → statutes → players → 3D.
- Do **not** let the loop invent architecture that contradicts `PLAN.md` / `BACKEND.md`.

## What it *is* for, later

Narrow pieces with a bar we own:

| Piece | Bar the critic inspects |
|---|---|
| Headless sim | `npm test`, cash conserved, prices finite, zero players |
| Paper HUD | Running page: tap Buy works, PAPER label visible, phone-width |
| Statutes | Flip sales tax → next tick collections change |
| Harbour (step L) | Our own last-best screenshot + 30fps / 20 actors — **original** islands, not their map |

Live progress page while it runs (Shumer: HTML or `workbench.md`). Stop when you like it.

Skill: `.cursor/skills/two-harbors-gauntlet/SKILL.md`.
