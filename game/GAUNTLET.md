# The Gauntlet Loop (research)

Matt Shumer named it after [Claude of Duty](https://github.com/mshumer/Claude-of-Duty) (July 2026). The method is not that one FPS. People pointed the same three-paragraph prompt at other bars and shipped a lot of other things.

Directory of playable games: [somethingbig.ai/games](https://somethingbig.ai/games) (47 listed when researched). Method: [somethingbig.ai/gauntlet-loop](https://somethingbig.ai/gauntlet-loop). Independent four-run test including **non-game SEO**: [wotai.co/blog/gauntlet-loop-playbook](https://wotai.co/blog/gauntlet-loop-playbook).

## What it is

A lead agent gets a **goal** and a **real bar**. It splits the work. Each piece gets a **builder** and a **fresh critic** that never sees the builder’s excuses. The critic inspects the real output (pixels, timings, HTML, tests), preferably blind A/B. If the bar wins, one biggest gap goes back. No round cap. **You** are the brake.

Shumer’s own list of jobs it applies to: games, code, websites, product design, marketing, writing, research — anything you can inspect.

## What people actually built

### Games (same prompt, swapped bar)

Not only Call of Duty clones. From the public directory:

| Kind | Examples |
|---|---|
| FPS / arena | Claude of Duty, Pastel Nuketown, Dust Corridor, RICHTER, Workmelt, Codex of Duty |
| Co-op / zombies | Der Koloss (4p, voice, Pack-a-Punch), Claude\Zombies, Sands of the Restless |
| Racing | Kart Royale, Yakko Kart, Speed Racer, DESCENT (MTB), Penguin Peak, Claude for Speed |
| Space / RTS | The Long Silence (24h, zero assets), Starfall (Homeworld-style), Frontline |
| Platform / other | Claude Bandicoot, The Hooded One, You Always Do This (Getting Over It, 32h, blind playtester agent) |
| Gentle / idle | Sakura — Petals of the Everblossom |
| Sport / arcade | Rocketball, Hoop D Doop, Tiro Libre, Nutso Cab-O |
| MMO-flavoured | Phantasy Claude Online (buggy on purpose) |

The Long Silence is the useful cousin for us: procedural world, browser, verification scripts, not an FPS.

### Not games

WotAI ran the same loop four times. Only one was a new 3D game (Wotnopoly). The others:

- **Snake** — timing/lifecycle vs *measured* Google Snake + Nokia manual
- **Doodle Jump** — physics vs 2009 footage, not a screenshot vibe
- **SEO / AEO** — no pixels. Critic checked rendered HTML, robots.txt, sitemap, JSON-LD against Google/Bing/OpenAI crawler docs. Seven pieces. Shipped.

Shumer’s bar examples besides CoD stills: best real sites in a category, Paul Graham paragraphs for clarity (not voice-copy), test suites and latency for backends.

Packaged skills exist (`robonuggets/gauntlet-loop`, etc.) so people run it on sites, essays, CLIs, research briefs.

## What the viral prompt leaves out

Copying the 150 words without a corpus on disk is how you get expensive chaos. Reported: Pieter Levels, messy unperformant code and a large bill. Game-dev critique: a one-shot game leaves you with **no mental model**, so later bugs are paralyzing.

WotAI’s conclusion, which matches PLAN: the loop is a **polish amplifier**, not a zero-to-one generator. Anchor first (we already have sim + paper HUD + spec). Then sharpen one piece.

Also: a critic verdict from a **bad screenshot** is worse than no verdict. Keep the prior best (ratchet).

## Two Harbors

We do **not** set the bar to Capital Rift, Call of Duty, or OSM Earth. That is a clone prompt.

We do **not** Gauntlet the whole MMO in one run.

We **do** have the right starting shape: a running sim, tests, a live HUD. That is the “already on-brief” case the successful non-CoD runs used.

| Piece | Bar the critic inspects |
|---|---|
| Sim | `npm test`, cash conserved, prices finite, 0 players |
| Paper HUD | Live page, phone width, PAPER label, Buy 1 fills |
| Statutes | Flip sales tax → next tick collections change |
| Harbour (L) | Our last-best shot + 30fps / 20 actors, original islands |

Skill: `.cursor/skills/two-harbors-gauntlet/SKILL.md`.
