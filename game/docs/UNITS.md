# Units — rooms inside a building

PAPER / SIMULATED. **Accepted spec.** Alpha **0.5** is the scripts for this loop. Version: [VERSION.md](VERSION.md). Live status: [HANDOVER.md](HANDOVER.md).

The sim owns cash, stock, leases, staff, and prices. The browser is a camera. Buildings are grey boxes until we mock them in **Blender**. Do not spend a design pass on façades, dollhouse chrome, or unique meshes.

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

Four authored **buildings** on South, near spawn. Each room is a grey box. You buy rooms one at a time. The dirt under a building is a **separate**, expensive landlord buy.

| Building | Floors | Rooms (each buyable) | Locked use |
|---|---|---|---|
| **Quay Shops** | 1 | 2 side-by-side ground rooms | shop, shop |
| **Strand Flats** | 2 | 2 rooms per floor (4 flats) | apartment |
| **Harbour Offices** | 2 | 2 rooms per floor (4 offices) | office |
| **Mixed House** | 3 | 1 room per floor (3 rooms) | shop / apartment / office |

That is **4 buildings, 13 rooms**. $10,000 (slice faucet in tests) should buy **one or two rooms** and kit them, not the block, and **not** the dirt.

Grey boxes are the product for the camera later. Kit is also grey boxes (shelf, fridge, till, bed, shower, sink, desk, cabinet). No CSG, no wallpaper pack, no unique minigames. **Blender meshes are a later version.** Alpha 0.5 is scripts only.

Use is marked **per room**, not per building. Two shops in Quay Shops are two businesses: you can buy the left room and leave the right vacant. The player cannot rezone a shop room into a flat this pass.

Live spawn cash stays **$1,000** (cart loop). Unit tests use a **$10,000** PAPER faucet. Do not change `STARTER_CASH`.

---

## Ownership (three layers, never mixed)

| Layer | Question | This pass |
|---|---|---|
| **Plot (dirt)** | Who owns the land under the shell? | **Buyable, very expensive.** Owner is landlord of the shell: ground rent / cut. Does **not** run packer or till. $10k must not afford this (ask **$15,000**). |
| **Building shell** | Who owns the box? | Game, until someone buys the dirt. Owning every room ≠ owning the building. |
| **Unit (room)** | Who owns this room? | The visitor, after **Buy**. Cheap. $10k buys one or two rooms + kit. |

A unit is a sim fact: unique id, parent **building** id, **floor** index, **room** index on that floor, designated use, owner, kit list, staff slots, stock, books line.

You may buy **one room, several rooms in one building, or rooms across buildings**. Vacant rooms stay listed.

**Manage** is grey on a building until you own at least one room in **that** building. Manage on Mixed House does not unlock Strand Flats.

Designated use is set per room. The tenant fits out that use. They do not flip a shop into a flat.

---

## Camera and menu (later — not 0.5)

Primary = tap / left click. Secondary = long-press / right click. No WASD. No virtual stick.

Do **not** build the dollhouse this version. Scripts first. When the camera comes:

1. Tap **one building** → small menu on that shell.
2. **View floor** (only floors that exist). Rooms on the floor are separate grey boxes. Not first-person walk.
3. Submenu: **Buy rooms** · **Manage rooms** (grey if you own none in this building) · **Buy this land**.
4. Buy: one vacant room → pay → you own **that room**. Neighbours stay listed.
5. Manage: only rooms you own in this building.

Indoor presence stays off. Reuse existing sheets. Site card = cart tabs; shop Run has **two** hires (packer, till).

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

Kit: **bed**, **shower**, **sink**. No till. No packer.

**Scout tenants** is a manage action, not a hire. Sign a **PAPER lease**: **3 / 6 / 24 / 48 sim hours**.

At 1 Hz, 24 sim hours = one sim day = **3600 ticks** = one real hour. So 3h ≈ 7.5 real minutes, 48h ≈ two real hours.

Rent scales with kit. Empty grey room = no takers. Bed+shower+sink = a tenant. Vacancy when the lease ends unless you re-sign. Rent ticks like warehouse $5/day (a clock, not a cutscene).

### Office (Harbour Offices all four; Mixed House second)

Kit: **desk**, **filing cabinet**. Same scout + lease clock. Tenants are NPC firms. No shoppers, no till. A clerk hire is **not** this pass.

---

## Money (PAPER)

| | Shop | Apartment / office |
|---|---|---|
| Faucet | NPC buys from stock at sticker, tax carved first | NPC rent on the lease clock |
| Sinks | Kit, hire, restock, sales tax, ground rent if you do not own the dirt | Kit, ground rent |
| Fail states | No packer / no till / empty shelf → no sales | No kit → no tenant |

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

Buy Quay Shops room 0, leave room 1 vacant. Fruit pack dest = that unit. Hire packer only → shelf fills, cash frozen. Hire till → existing sell loop pays. Fire packer → crate sits. Cart pad + fruit + one vendor still matches today’s tests.

---

## Version cut

| Version | What |
|---|---|
| **0.5** | This spec + sim scripts (`units.ts`). Tests. Persist blob round-trip. HTTP intents. **No 3D, no Blender, no dollhouse.** |
| **0.5.1** | This scripts slice, once tests pass. |
| Later | Dollhouse camera, Blender shells, Books rows, Shopfit SKUs from inventory. |

**Not this pass:** quarry, farming aisle, rezoning, walking interiors, WASD, a Job class, walking NPCs with boxes, renaming hotdog fields, merging `staff.ts` / `labour.ts`, politics, Postgres (blob must still store units), Capital Rift clone.

---

## Do not

- Spend a week on façades — Blender mock-ups come from the operator
- Clone Capital Rift / Eco / Highrise UI
- Fake Shopfit SKUs you cannot place
- A second logistics engine for packers
- A second appeal meter
- Left-click hop, WASD, or walking the dollhouse
- Wall-clock tenant leases
- Place kit from the warehouse (inventory / Bring to me, same as carts — kit cash-buy is the scripts stand-in until Shopfit SKUs exist)
- Unfreeze House / Senate / councils
- Change live `STARTER_CASH` to $10,000
