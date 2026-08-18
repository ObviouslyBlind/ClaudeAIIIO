# Skill research (10 passes)

Date: 2026-08-18. Vanilla Three.js + harbour MMO only.

## Installed this pass

| Source | Took | Skipped |
|---|---|---|
| emalorenzo/three-agent-skills | `three-best-practices` | `r3f-best-practices` (not React) |
| noklip-io/agent-skills | `three-js` | gsap, theatre-js, react-19, shadcn |
| CloudAI-X/threejs-skills | shaders, interaction, fundamentals, geometry | animation/materials/loaders (already in full-stack-skills 18) |
| scottstts/Threejs-Awesome-Graphics-Agent-Skills | water, ocean, sky, vegetation, architecture, shadows, GFX router, bloom (HIGH-ONLY), planets (SHELF) | — |
| PlayableIntelligence/game-creator | `threejs-perf`, `threejs-game` (OVERRIDE) | make-game, viral-game, phaser, unity, monetize, worldlabs |
| chrislaupama/threejs-game-studio | references; **scaffold script removed** | Vite starter assets |
| CK42BB/procedural-landscapes-threejs | `procedural-landscapes` (NOTES-ONLY) | replacing `heightAt` |

Example HDR/PNG/EXR binaries stripped after install (~52 MB). Skills keep SKILL.md + references + example source.

## Already had (from harbour craft pack)

majidmanzarpour/threejs-game-skills (9), full-stack-skills/threejs-skills (18),
gamedev-skills disciplines (10, no Godot/Unity), vercel guidelines, supabase
Postgres notes, playwright-cli.

## Researched, not installed

| Source | Why skip |
|---|---|
| linegel/threejs-complete-set-of-skill | Same water/sky family as scottstts; also ships unrelated `product-from-scratch` |
| secondsky/claude-skills `threejs` | Mostly stubs; CloudAI + noklip already cover it |
| sickn33/agentic-awesome-skills `threejs-skills` | CloudAI mirror |
| heagandev/threejs-agent-starter | Cube-runner + WASD/D-pad `threejs-game.md`; fights click-to-walk |
| PlayableIntelligence make-game / viral-game / phaser | New games / 2D / Unity |
| gamedev-skills Godot/Unity/Unreal/FPS/Phaser | Wrong engine |

## Pass log

1. skills.sh / agenticskills.io — CloudAI 10, full-stack 18, majid 9
2. Vanilla water/terrain — scottstts graphics pack, linegel fork, CK42BB landscapes
3. Game directors — majid threejs-game-director (already in), chrislaupama studio, PlayableIntelligence threejs-game
4. emalorenzo three-best-practices (vanilla 100+ rules)
5. gamedev-skills awesome-gamedev — three.js subset already copied to `.cursor/skills/`
6. noklip `three-js` 18-doc vanilla reference
7. secondsky / sickn33 duplicates
8. Instancing/LOD/fog — covered by threejs-perf + three-best-practices + threejs-geometry
9. heagandev starter — skip WASD kit
10. PlayableIntelligence threejs-perf (measured InstancedMesh) + rest of game-creator tree (skip Phaser/Unity/monetize)
