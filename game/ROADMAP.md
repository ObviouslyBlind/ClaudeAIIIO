# Two Harbors roadmap — the evergreen build

Operator direction (2026-08-17). Order matters. Everything stays PAPER / SIMULATED, no wallet.

The reference feel is Capital Rift's public look (flat cadastral map, priced parcels,
preplaced buildings with purchasable interiors) — as **genre**, never as copied files,
client code, assets, or branding. Our identity: two authored islands, a ferry, politics,
and travel that costs something (walk / taxi / ferry — no teleporting; deliveries can
come to the player later, the player does not blink across the map).

## Done (this branch)

- Whole-island parcel map: every lot filled, boundary-inked, price-tagged. `YOURS` on leases.
- Wheel zoom to map height (RMB orbit unchanged, tap-to-walk unchanged).
- Fields carpet rows 2–3 off the road spine.
- NPC town seeded per island (houses, shops, house-shops, warehouse, farms): the world
  starts inhabited, tagged buildings appear via the trickle loader.
- Printed-map terrain greens so the plat reads on top.

## Next, in order

### 1. Road network, not one spine
- Cross streets branching off the spine near each port (town grid), dirt tracks to fields.
- Parcels re-tiled to face their street. Taxi still paved-only; extend the taxi graph to
  the new paved streets. Traffic loops the grid.
- Keep `ROAD_CLEAR` culling so nothing builds on the carriageway.

### 2. Map expansion
- Fill both islands corridor-first: more spine steps, then side-street tiling.
- Chunked loading stays mandatory (phone floor, no full-island mesh).

### 3. Evergreen server
- The shard is already headless-ticking; make it durable: Postgres persistence
  (BACKEND.md step C), boot-restore, event log for leases/develops/statutes.
- One live world. The sim never waits for a player.

### 4. Preplaced buildings with purchasable interiors (before player-built)
- NPC town buildings get room-level interiors: each room is a purchasable unit with a
  PAPER price tag (the Capital Rift room-with-$ pattern, our implementation).
- Buy a room → it is yours (storage, lodging, or shopfront slot). Whole-building buyout
  possible when every room is owned.
- Player-designed buildings come only after this works.

### 5. Working buildings
- A shop sells from its owner's stock. A farm produces on the tick. A warehouse stores.
  Staff slots (already in sim) attach to real sites. No decorative-only meshes.

### 6. Asset sizing + real models
- Rule: door height ≈ 2.1 m against the 1.7 m player capsule. Every mesh placed gets
  checked against the player at spawn distance.
- Replace box shells with CC0 glTF kits (license-safe, commercial OK, no attribution needed):
  - **Kenney Modular Buildings** — 90+ models, glTF (kenney.nl / itch.io, CC0)
  - **Kenney City Kit: Commercial / Suburban / Roads** — matching street + building sets (CC0)
  - **Quaternius Downtown City MegaKit** (May 2026) — 300+ modular pieces, glTF, CC0;
    free tier covers 60–70% of the pack
  - Browsable index for one-offs: poly.pizza (filter CC0)
- Import path: glTF → `game/assets/models/`, loaded through `threejs-gltf-loading` skill
  rules (instancing for repeats, no per-frame loads).

## Guardrails

- Never fetch or reverse Capital Rift's play client, assets, or protocol.
- No critic/builder agent swarms. One change, one playtest, the operator is the brake.
- Movement stays: tap-to-walk, taxi on paved, ferry between islands.
- Label PAPER / SIMULATED everywhere money shows.
