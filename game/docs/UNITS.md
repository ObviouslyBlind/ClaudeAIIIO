# Units — rooms inside a building

PAPER / SIMULATED. Spec draft for the next harbour slice. **Do not implement until this file is accepted.**

You can own a **unit** (a room, or several rooms) without owning the dirt under the whole building. The building already exists. The sim owns cash, stock, leases, staff, and prices. The browser is a camera.

Live loop today: [PLAY.md](PLAY.md). Catalog and job graph: [MARKETPLACE.md](../MARKETPLACE.md). Land plots: [LAND.md](../LAND.md). Kernel: [FOUNDATION.md](../FOUNDATION.md). Money: [ECONOMY.md](../ECONOMY.md).

---

## What we learned (genre, not a clone)

Borrow the *systems*. Do not copy clients, Earth, OSM, or another game’s UI.

| Game | What to steal | What to leave |
|---|---|---|
| **Eco** | A shop is furniture in a **room**. It sells while you are logged out. Housing score comes from furniture tags in a room, not from walking every tile. | Player-minted currencies, block-built homesteads, skill XP from beds. |
| **Albion houses** | Furniture **tier** caps what you may place. Laborers work the house while you are away. The house is a site with an admin sheet. | Private islands, laborer journals, city plot taxes. |
| **EVE offices** | You rent a **slot in a building you do not own**. The station exists either way. Rent is a bill on a clock. Hangars are rooms with access, not a walkable mesh. | 30-day real bills, corp hangar roles, medical clones. |
| **World of Fate / Capital Rift genre** | You claim a **building that is already in the world**, then run something inside it. Indoors is not broadcast. Save rows include buildings and leases. | Real-Earth footprints, OSM, their client, their protocol. |
| **Project Highrise / SimTower** | One building, **floors**, mixed use (shop / apartment / office). Tenants pay by appeal. The owner of the tower is not the tenant of every room. | Elevators, HVAC, you-are-the-landlord-of-90-floors. We are a tenant of one unit first. |
| **Two Point Hospital** | A room has a **type**, a minimum kit, and a staff slot. Prestige is furniture. Jobs are assigned to that room. The sim walks the patients. | Hospital comedy, drawing room polygons, diagnosis trees. |
| **Recettear** | Display + furniture change **who shows up and how often**. The till can run without you haggling every sale (vendors). | Atmosphere gaudy/plain chart, weekly debt, dungeon crawling. |
| **Foxhole factories** | You queue work; the building **ticks without you**. Pickup is later. | War crates, squad reservations. |
| **Our carts** | Appeal 0–10, hire, stock, upgrades, foot traffic, Books, same delivery crate. Offline sales already exist. | Do not invent a second score. |

The pattern that survives: **site → designated use → kit nodes → staff jobs → sim demand**. Pretty mesh is last.

---

## What already exists here

Do not rebuild these.

- **Plots** are dirt. Pads are carts-only. Street lots are dear. `developPlot` already has house / shop / farm uses.
- **Carts** already sell. `siteScore` is 0–10 from hire + stock + upgrades + traffic. Rivals cap the score.
- **Marketplace** already has empty **Shopfit** and **Hospitality** aisles. Honest empty until this slice places kit.
- **Logistics** is already specified as nodes + jobs. A packer is the shop version of a quarry truck.
- **Interior.js** is a first-person walk-in of a dressed Caribbean house. That is **not** the unit camera. Leave it parked. Do not dress it for this test.
- **Kernel** still has one `visitor`, in-memory persist, spawn wipe. Units must round-trip in the persist blob even if restore stays refused on the live visitor.
- **Calendar:** 1 Hz. One sim day = **3600 ticks** = one real hour. Tenant “hours” are **sim hours**, not wall-clock days.

---

## The test building (placeholder)

One authored building on South, near spawn, **not** a street lease the player buys as dirt.

Three grey boxes stacked:

| Floor | Use (locked) | Unit | Camera |
|---|---|---|---|
| Ground | **shop** | one room | dollhouse, tilted |
| First | **apartment** | one room | same |
| Second | **office** | one room | same |

Grey boxes are the product for this pass. Kit is also grey boxes (shelf, fridge, till, bed, shower, sink, desk, cabinet). No CSG, no wallpaper pack, no unique minigames.

The **game** is the building owner. Uses are marked on the floors. The player cannot rezone ground into an apartment this pass.

Starter cash for this slice: **$10,000** PAPER (test faucet). Cart pads stay $750. Label the extra cash as a slice faucet, not a second economy.

---

## Ownership (three layers, never mixed)

| Layer | Question | This pass |
|---|---|---|
| **Plot** | Who owns the dirt? | Game / NPC. Player does not buy this plot. |
| **Building** | Who owns the shell? | Game. Later: a player landlord. |
| **Unit** | Who owns this room? | The visitor, after **Buy**. |

A unit is a kernel fact: unique id, parent building id, floor index, designated use, owner, kit list, staff slots, stock, books line.

You may buy **one or several** units. This test has three. Buying all three is allowed if cash holds.

**Manage** is grey until you own at least one unit in that building.

Designated use is set by the building owner (here: the game). The tenant fits out that use. They do not flip a shop into a flat.

---

## Camera and menu (one control scheme)

Primary = tap / left click. Secondary = long-press / right click. No WASD. No virtual stick.

1. Tap the stacked boxes in the harbour → small menu on the building.
2. **View ground floor / first floor / second floor.** Opens a **dollhouse** of that floor: tilted 3D, RMB-hold orbit, 360 around the box. Not first-person walk. Not a second island.
3. Submenu: **Buy units** · **Manage units** (grey if you own none).
4. Buy: each vacant unit, use badge, ask price. Tap → pay → you own it. Cash is $.
5. Manage: only units you own. Use is already shop / apartment / office. Actions depend on use.

Indoor **presence** stays off. The dollhouse is a camera on sim facts, same as Books. Other players do not need your furniture mesh.

---

## Three uses, one engine

Every unit is a **site** with **nodes** and **jobs**. Same Books row shape as a cart. Appeal is `siteScore` (extend parts; do not fork a second 0–10).

### Shop (ground)

Kit (placeholder boxes): **shelf**, **fridge**, **till**. Later: upgrades of those three, still Shopfit aisle.

Jobs:

| Job | Node A → B | Who |
|---|---|---|
| **Packer** | Delivery crate (same market van / kerb box) → shelf | Hire. Unhired = stock sits in the crate / backstock and does not sell. |
| **Till** | Shelf → customer cash | Hire. Unhired = no sales, even if shelves are full. |

Shoppers are the **existing foot-traffic NPCs**. They do not need a new walker. Ground-floor traffic band feeds `siteScore` the way a cart street does.

Manage sheet: goods sold, PAPER revenue, tax, wages, stock, appeal, $/min. Same Books facts, not a second inflation HUD.

### Apartment (first)

Kit: **bed**, **shower**, **sink**. No till. No packer.

**Scout tenants** is a manage action, not a hire. The sim offers NPC tenants. You sign a **PAPER lease**: **3 / 6 / 24 / 48 sim hours**.

At 1 Hz, 24 sim hours = one sim day = **3600 ticks** = one real hour. So 3h ≈ 7.5 real minutes, 48h ≈ two real hours. That is long enough to prove the clock and short enough to watch. Do not use wall-clock 48 hours for this test.

Rent scales with appeal (kit placed). Empty grey room = low rent or no takers. Bed+shower+sink = higher. Vacancy when the lease ends unless you re-sign.

### Office (second)

Kit: **desk**, **filing cabinet**. Same scout + lease clock as the apartment. Tenants are NPC firms, not residents. Rent scales with appeal. No shoppers, no till. A clerk hire is **not** this pass.

---

## Money (PAPER)

| | Shop | Apartment / office |
|---|---|---|
| Faucet | NPC buys from stock at sticker, tax carved first | NPC rent on the lease clock |
| Sinks | Kit, hire, restock, sales tax | Kit, (optional later: building fee) |
| Fail states | No packer / no till / empty shelf → no sales | No kit / low appeal → no tenant or cheap tenant |

Unit asks: cheap enough that $10,000 can buy one floor and kit it, not all three fully staffed on minute one. Exact numbers land in [ECONOMY.md](../ECONOMY.md) when we implement — not here as fake SKUs.

Carts stay the street loop. Units do not replace pads.

---

## Build order (when we build)

Sim first. Camera second. No mesh pass before the tick moves money.

1. **Kernel unit table** — unique ids, parent building, floor, use, owner. Persist blob round-trip. Tests with zero 3D.
2. **Buy / manage intents** — HTTP. Manage grey until owned. Cash $10,000 faucet for the slice.
3. **Shop jobs** — packer + till on the existing delivery crate. Sales while the owner is “logged out” (headless ticks).
4. **Apartment + office leases** — 3/6/24/48 sim hours, appeal from placed kit, scout tenants.
5. **Dollhouse camera** — three grey boxes, floor picker, RMB orbit, tap unit. Placeholder kit boxes.
6. **Books row** — each owned unit on the terminal beside carts.

Stop after 5 if the critic can buy a floor, place two grey boxes, hire a packer, and watch cash move.

**Not this pass:** player-designed buildings, rezoning, landlord-of-the-shell, quarry, farming aisle, interiors you walk, North kit, politics, Postgres (still PLAN C; blob must still store units).

---

## Do not

- Clone Capital Rift / Eco / Highrise UI
- Fake Shopfit SKUs you cannot place (three shop boxes, two apartment, two office — that is the catalog)
- A second logistics engine for packers
- A second appeal meter
- Left-click hop, WASD, or walking the dollhouse
- Wall-clock tenant leases
- Place kit from the warehouse (inventory / Bring to me, same as carts)
- Unfreeze House / Senate / councils
