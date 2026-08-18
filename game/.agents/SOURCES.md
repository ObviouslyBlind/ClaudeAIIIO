# Vendor skill sources

Installed into `game/.agents/skills/` with `npx skills add … -a universal --copy`
from `game/`. Example HDR/PNG/EXR binaries were deleted after copy (keep text).

| Source | License (upstream) | What we took |
|---|---|---|
| github.com/majidmanzarpour/threejs-game-skills | MIT | 9 Three.js game skills |
| github.com/full-stack-skills/threejs-skills | see upstream | 18 Three.js API skills |
| github.com/gamedev-skills/awesome-gamedev-agent-skills | see upstream | 10 engine-neutral disciplines only (no Godot/Unity/Unreal/FPS) |
| github.com/vercel-labs/agent-skills | see upstream | web-design-guidelines, writing-guidelines |
| github.com/supabase/agent-skills | see upstream | supabase-postgres-best-practices (SQL patterns, not a Supabase app) |
| github.com/microsoft/playwright-cli | see upstream | playwright-cli |
| github.com/emalorenzo/three-agent-skills | MIT | three-best-practices only (no R3F) |
| github.com/noklip-io/agent-skills | see upstream | three-js vanilla reference |
| github.com/CloudAI-X/threejs-skills | MIT | shaders, interaction, fundamentals, geometry |
| github.com/scottstts/Threejs-Awesome-Graphics-Agent-Skills | MIT AND GPL-3.0-only | water/sky/vegetation/shadows/GFX router (+ shelf planets) |
| github.com/PlayableIntelligence/game-creator | MIT | threejs-perf, threejs-game (override: no new game) |
| github.com/chrislaupama/threejs-game-studio | see upstream | references; create-game scaffold removed |
| github.com/CK42BB/procedural-landscapes-threejs | see upstream | procedural-landscapes (do not replace heightAt) |

Two Harbors skills in `.cursor/skills/two-harbors-*` are original to this repo.

Do not re-add Godot, Unity, Unreal, Roblox, Phaser, OSM, Colyseus, or R3F packs.

Research: [RESEARCH.md](RESEARCH.md). Grab list: `../../.cursor/skills/two-harbors-job-index/SKILL.md`.
