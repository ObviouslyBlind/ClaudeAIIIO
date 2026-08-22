# Units — rooms inside a building

PAPER / SIMULATED. **Accepted spec.** Alpha **0.5** is the scripts for this loop. Version: [VERSION.md](VERSION.md). Live status: [HANDOVER.md](HANDOVER.md).

The sim owns cash, stock, leases, staff, and prices. The browser is a camera. Buildings are grey boxes until we mock them in **Blender**. Do not spend a design pass on façades.

Live loop today: [PLAY.md](PLAY.md). Catalog and job graph: [MARKETPLACE.md](../MARKETPLACE.md). Land plots: [LAND.md](../LAND.md). Kernel: [FOUNDATION.md](../FOUNDATION.md). Money: [ECONOMY.md](../ECONOMY.md).

---

## What we learned (genre, not a clone)

Borrow the *systems*. Do not copy clients, Earth, OSM, or another game’s UI.

| Game | What to steal | What to leave |
|---|---|---|
| **Eco** | A shop is furniture in a **room**. It sells while you are logged out. | Player-minted currencies, block-built homesteads. |
| **Albion houses** | Furniture **tier** caps what you may place. Laborers work the house while you are away. | Private islands, laborer journals. |
| **EVE offices** | You rent a **slot in a building you do not own**. Rent is a bill on a clock. | 30-day real bills, corp hangars. |
| **World of Fate / Capital Rift genre** | You claim a **building that is already in the world**, then run something inside it. | Real-Earth footprints, OSM, their client, their protocol. |
| **Project Highrise / SimTower** | One building, **floors**, mixed use. The owner of the tower is not the tenant of every room. | Elevators, HVAC, 90-floor landlord sim. |
| **Two Point Hospital** | A room has a **type**, a minimum kit, and a staff slot. | Drawing room polygons, diagnosis trees. |
| **Recettear** | Display + furniture change **who shows up**. The till can run without you. | Weekly debt, dungeon crawling. |
| **Foxhole factories** | You queue work; the building **ticks without you**. | War crates, squad reservations. |
| **Our carts** | Appeal 0–10, hire, stock, upgrades, foot traffic, Books, same delivery crate. | Do not invent a second score. |

The pattern that survives: **site → designated use → kit nodes → staff jobs → sim demand**. Pretty mesh is last. Operator will mock a few simple buildings in Blender; the scripts do not wait on that.

---

## What already exists here

Do not rebuild these. Do not rename leftover `hotdog_*` identifiers this pass.

- **Plots** are dirt. Pads are carts-only. Street lots are dear. `developPlot` already has house / shop / farm uses.
- **Carts** already sell fruit / melon / fry from `stand.hotdogs`. One cart flag `hired` both auto-stocks and sells.
- **WorkSite** already exists for a developed shop plot (street lots $2,400 — starter cannot buy).
- **Marketplace** already has empty Shopfit / Hospitality aisles. Honest empty until kit SKUs exist.
- **Logistics** is already nodes + jobs. A packer is the shop version of a quarry truck, on the **existing** 1 Hz clock.
- Three staff systems stay unmerged: cart/site `hireStand`, leftover `staff.ts` payday, `labour.ts` mill slots.
- **Kernel** still has one `visitor`, in-memory persist, spawn wipe. Units must round-trip in the persist blob even if restore stays refused on the live visitor.
- **Calendar:** 1 Hz. One sim day = **3600 ticks** = one real hour. Tenant “hours” are **sim hours**.

---

## The test block

Three authored **buildings** on South, each on a **plot** next to the $750 cart pads. Each room is a grey box. You buy rooms one at a time. The dirt under a building is a **separate**, expensive landlord buy.

| Building | Floors | Rooms (each buyable) | Locked use |
|---|---|---|---|
| **Quay Shops** | 1 | 2 side-by-side ground rooms | shop, shop |
| **Strand Flats** | 2 | 2 rooms per floor (4 flats) | apartment |
| **Mixed House** | 3 | 1 room per floor (3 rooms) | shop / apartment / office |

That is **3 buildings, 9 rooms**, on **buyable lots** next to the $750 spawn pads. $10,000 buys **one or two empty rooms**. Furniture is placed from inventory, like a cart. Dirt is **$15,000** and is a different buy.

Grey boxes are the product for the camera later. Kit is constructed furniture (shelf, fridge, till, bed, shower, sink, desk, cabinet). No CSG, no wallpaper pack, no unique minigames. **Blender meshes are a later version.** Alpha 0.5 is scripts only.

Use is marked **per room**, not per building. Two shops in Quay Shops are two businesses: you can buy the left room and leave the right vacant. The player cannot rezone a shop room into a flat this pass.

Live spawn cash is **$10,000**. That buys one or two rooms and kit, not the $15,000 dirt. Do not drop spawn back to $1,000 while this buildings slice is the play.

---

## Ownership (three layers, never mixed)

| Layer | Question | This pass |
|---|---|---|
| **Plot (dirt)** | Who owns the land under the shell? | **Buyable, very expensive.** Owner is landlord of the shell: ground rent / cut. Does **not** run packer or till. $10k must not afford this (ask **$15,000**). |
| **Building shell** | Who owns the box? | Game, until someone buys the dirt. Owning every room ≠ owning the building. |
| **Unit (room)** | Who owns this room? | The visitor, after **Buy**. Cheap. $10k buys one or two **empty** rooms. Furniture is extra. |

A unit is a sim fact: unique id, parent **building** id, **floor** index, **room** index on that floor, designated use, owner, kit list, staff slots, stock, books line.

You may buy **one room, several rooms in one building, or rooms across buildings**. Vacant rooms stay listed.

**Manage** is grey on a building until you own at least one room in **that** building. Manage on Mixed House does not unlock Strand Flats.

Designated use is set per room. The tenant fits out that use. They do not flip a shop into a flat.

---

## Camera and menus (the product)

Primary = tap / left click. Secondary = long-press / right click. No WASD. No virtual stick.

`interior.js` is a first-person walk-in of a dressed Caribbean house. **Leave it parked.** The room camera is the existing **dollhouse**: you teleport into the room, **RMB-hold orbit**, tap to use. Not walking. Not a second island.

Grey boxes in the harbour are the systems camera. Not Blender.

Live 0.5.1 shipped a **one-sheet click service** (Lots turns Properties on, green buy tiles spend cash, Fit kit buttons, scout after a checklist). That is the wrong loop. This section is the replacement. Do not keep the kitchen-sink building sheet.

### Three menus, three verbs

| Menu | What it is | What it is not |
|---|---|---|
| **Lots** | Dirt and $750 pads. Same buy-ask as today. | Houses. Rooms. Furniture. |
| **Properties** | Buildings and rooms. Own chip. Does **not** turn on from Lots. | Pads. Landlord dirt. |
| **Landlord** | Chip **only after you own dirt under a shell**. Lists the $15,000 dirt you already bought. Buy dirt from the Properties sale sheet or secondary on the grey box. | A spawn viewer. A reason to exist before you own dirt. |

Spawn is **$10,000**. The landlord ask is **$15,000**. The card must say you cannot afford it, and that you do **not** need the dirt to run a room.

### Buy a room (harder than a tile)

1. **Properties** on, or tap a house **$**. Opens **For sale**, not Manage, not Kit, not Land.
2. Point at a vacant room. That **grey box goes green in the world** (and in the dollhouse). Sisters stay grey. The sheet names that room and the ask.
3. Buy is a **confirm**, same shape as the lot buy-ask: “Buy Strand flat G-L for $900?” One more tap spends. Green tile must not debit cash by itself.
4. On confirm the **camera enters that room**. Body teleports onto that floor box. RMB-hold orbit around **that** flat, not the whole storey.

### Inside a room you own

The room starts **empty**. Furniture is not a button.

Same place loop as a cart:

1. Marketplace **Shopfit** (and Hospitality for flats) sells the SKUs. Pay → **Bring to me** → kit is **on you**.
2. Inventory → **Place**. Green ghost. Hold **R** to rotate. The footprint must sit on **this room’s floor**.
3. Place consumes inventory only. Warehouse cannot Place.
4. Pickup packs the piece back to the warehouse. The room stays yours.

Kit meshes stay the constructed Lambert set (shelf, fridge, till, bed, shower, sink, desk, cabinet). No CSG. No `interior.js`.

**Enter room** is a camera lock. **Exit room** is a big HUD button at the bottom of the screen. Hide / Close only hides the sheet. Exit dumps the body onto the kerb in front of the shell — not back onto the floor box. Harbour taps while locked toast **Exit room**; they do not dump the camera.

Crate tap hits the kerb crate **before** grey boxes or Lots dirt. Logistics overlay is not required. Unlocked sale preview must not swallow harbour walk or crate taps.

### Your rooms

A second Properties sheet (cycle like Lots → Yours): only rooms you own. Enter, Place, Tenants, Hire (shops). No buy tiles. No $15,000.

---

## Tenants (profiles, not a kit gate)

Appeal is still `siteScore` (extend parts; do not fork a 0–10). It comes from **furniture you placed**, not from a Fit checklist. An empty room is allowed. It draws **poor** tenants: short hours, low rent. More / better pieces draw a better band.

**Scout** is its own **Tenants** menu on a room you own. It is not Hire.

Scout returns **1–3 profiles**. Each profile has:

| Field | What |
|---|---|
| Name | NPC name |
| Who | One line (dock clerk, student, small firm, …) |
| Band | poor / mid / high, from that room’s appeal |
| Hours | Random. Floor **3 sim hours**. Ceiling **1 sim week** (7 sim days = **168 sim hours** = **7 real hours** at 1 Hz). Poor rolls short. High rolls long. |
| Pay | Rent per sim hour. Poor low, high high. |

You pick one profile and sign. No 3 / 6 / 24 / 48 picker. The profile **is** the term. Rent ticks on the sim clock. Vacancy when it ends unless you scout again.

Shops do not use this for sales. Shops still Hire a packer and a till worker ($300 people, not Shopfit SKUs) and sell stock. The Shopfit Till is a counter you Place. Tenants are flats and offices.

---

## People you can see

Outdoor walkers today seed on **North** only. South spawn sees cars, not people. This pass seeds a handful of **South quay walkers** on the same presence clock.

A signed tenant is visible **in that room** while you are inside it (a body in the box). Indoor presence stays off the shard broadcast. Not WASD. Not a walking interior.

---

## Three uses, one engine

Every unit is a **site** with **nodes** and **jobs**. Same Books row shape as a cart. Appeal is `siteScore` (extend parts; do not fork a second 0–10).

### Shop (Quay Shops both rooms; Mixed House ground)

Kit (placeholder): **shelf**, **fridge**, **till**. Two shop rooms are two businesses: two tills, two packers, two Books rows.

Jobs (existing clock, not a new engine):

| Job | Node A → B | Who |
|---|---|---|
| **Packer** | Arrived crate → shelf (`stock`) | Hire. Unhired = crate sits. |
| **Till** | Shelf → customer cash | Hire. Unhired = no sales, even if shelves are full. |

Surgical rule: new job rules **only if** `workSite.unitId` is set. Carts keep one `hired` + `autoStockStand`. Plot-based `WorkSite`s keep the old blob. **Do not** call `autoStockWork` on unit shops (it bypasses the crate).

`Delivery.dest` adds **`unit`** beside warehouse / road / cart. Order dest = this room; crate on that unit’s kerb. `recallStaleDeliveries` still warehouses after 60s.

Shoppers are the **existing foot-traffic NPCs**. Ground-floor traffic band feeds `siteScore`.

### Apartment (Strand Flats all four; Mixed House first)

Place **bed**, **shower**, **sink** from inventory if you want appeal. No till. No packer. Empty is legal; it only changes who scouts.

Tenants: profiles, hours, pay — see **Tenants** above. Rent ticks like warehouse $5/day (a clock, not a cutscene).

### Office (Mixed House second)

Place **desk**, **filing cabinet**. Same scout + lease clock. Tenants are NPC firms. No shoppers, no till. A clerk hire is **not** this pass.

---

## Money (PAPER)

| | Shop | Apartment / office |
|---|---|---|
| Faucet | NPC buys from stock at sticker, tax carved first | NPC rent on the lease clock |
| Sinks | Kit, hire, restock, sales tax, ground rent if you do not own the dirt | Kit, ground rent |
| Fail states | No packer / no till / empty shelf → no sales | No signed tenant → no rent. Empty room still scouts poor profiles. |

Asks (law in [ECONOMY.md](../ECONOMY.md)):

| Thing | PAPER |
|---|---|
| Shop room | $1,200 |
| Apartment room | $900 |
| Office room | $1,100 |
| Building dirt | $15,000 |
| Packer or till hire | $300 each |
| Ground rent | $8 / owned unit / sim day, to the land owner, or the game bank if unowned |

Carts stay the street loop. Units do not replace pads. Leftover names (`tickHotdogSales`, `stand.hotdogs`, `hotdog_cart`) stay; fruit is what players sell.

---

## Proof (headless bar)

Buy Quay Shops room 0, leave room 1 vacant. Place shelf from inventory (not a Fit button). Fruit pack dest = that unit. Hire packer only → shelf fills, cash frozen. Hire till → existing sell loop pays. Fire packer → crate sits. Cart pad + fruit + one vendor still matches today’s tests.

Buy a Strand flat. Scout on an empty room returns a poor profile. Place bed. Scout can return a better band. Sign. Cash rises on the lease clock. Books shows the rent line.

---

## Build order (when this ships — not this commit)

Do not boil the ocean. One pass at a time, tests green, play restart.

1. **Camera lock** — Enter room / Exit room (bottom HUD). Harbour taps do not dump the camera; they toast Exit room. Exit teleports onto the kerb. Crate tap before grey boxes.
2. **Menus** — Lots is dirt only. Properties is houses. Landlord is the $15,000 confirm with honest copy. Green-light the 3D room under the pointer.
3. **Place** — Shopfit SKUs buy like a cart. Inventory Place ghost on the room floor. Kill Fit-kit buttons.
4. **Tenants** — Scout returns profiles. Appeal from placed kit. Hours 3 … 168 sim hours. Books shows the rent line.
5. **People** — South quay walkers. Tenant body in a signed room while you are inside.

---

## Version cut

| Version | What |
|---|---|
| **0.5** | Spec start. |
| **0.5.1** | **The whole buildings push.** Grey boxes, buy a room, **enter that room**, place from inventory, tenant profiles, South walkers. Dollhouse camera (RMB-hold orbit). Spawn **$10,000**. Blender shells when the operator has files. |

**Not this pass:** quarry, farming aisle, rezoning, WASD, `interior.js` walk, a Job class, renaming hotdog fields, merging `staff.ts` / `labour.ts`, politics, Postgres (blob must still store units), Capital Rift clone, mixing Lots / Properties / Landlord into one sheet.

---

## Do not

- Spend a week on façades — Blender mock-ups come from the operator
- Clone Capital Rift / Eco / Highrise UI
- Fake Shopfit SKUs you cannot place — Shopfit items must Place into an owned room
- A second logistics engine for packers
- A second appeal meter
- Left-click hop, WASD, or walking `interior.js`
- Instant green buy tiles, Fit-kit cash buttons, or auto-turning Properties on from Lots
- Wall-clock tenant leases
- Place kit from the warehouse
- Dump the room camera on a harbour tap
- Show the Landlord chip before the visitor owns building dirt
- Unfreeze House / Senate / councils
- Drop live `STARTER_CASH` back to $1,000 while 0.5.1 is the play
- Call this 0.5.2
