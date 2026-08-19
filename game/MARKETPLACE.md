# 2Isles Marketplace

How you buy kit, stand up a business, and run it on **one logistics system**.  
This is the player-facing spec. Not built yet. Street carts already exist; the rest is the shape we build toward.

Do **not** call this shop PAPER, simulated cash, an outfitter, or books. Money still is not real-world cash — the HUD can say that. This sheet does not.

---

## The idea in one breath

You are not filling a grocery list.

You buy **things that sit in the world** and **hire people onto a business**. The sim moves goods between those things. A person stocking a shelf, a static excavator loading a truck, and a picker walking an orchard are the **same engine**: a job from A to B, on a clock, while you are logged out.

The difference is **what kind of business you put down**, not a different game mode.

---

## What you open

Center sheet. Wordmark: **2Isles Marketplace**. Search at the top.

**South** and **North**. You only buy on the island you are standing on. The other island is grey until you ferry. North is grey for now — there is nothing to buy there yet.

Left rail **Market** opens this sheet. It does not stay a skinny panel of “Buy 1.”

---

## Aisles (what you buy)

These are **catalogs of kit**. They are not separate sims.

| Aisle | What it is | Examples |
|---|---|---|
| **Street** | Carts you drop on a pad | Fry, fruit, veg, coffee, meat, bakery |
| **Shop fit** | What goes *inside* a shop | Shelves, till, fridge, counter, backstock |
| **Hospitality** | What goes *inside* a house or hotel | Beds, kitchen, lobby, rooms |
| **Plant** | Machines that sit and run | Crushers, belts, static excavator, packing line |
| **Farming** | Crop + orchard kit | Trees, irrigation, crates, tractor, packing shed |

**Street** is live (carts you already know). The other aisles start empty / coming soon until that loop exists. We do not fake a quarry you cannot place.

There is **no Yard aisle**. Aggregates is not a hardware-store shelf of random lumber. It is a **business type** you place, then kit out from Plant (and a bit of Fleet on the business itself).

Trucks and vans are **not** a mall you wander for fun. You buy them as kit, then they **belong to a business at a location**. You see them when you open that business — parked, assigned, or on a job.

---

## One logistics system

Everything is a **site** with **nodes** and **jobs**.

- A **node** is a place or machine: shelf, backstock, excavator, pile, crusher, belt, truck, sell bay, tree row, packing shed.
- A **job** is “move this from here to there” or “run this machine.” Staff (or a parked truck) take the job. The sim ticks it. You do not click the belt every second.

Same rules for:

| Business | Nodes (sketch) | Jobs |
|---|---|---|
| Cart / shop | Backstock → shelf → customer | Stocker fills shelves. Vendor sells. |
| Aggregates | Face → excavator → truck → pile → crusher → belt → pile → truck → sell bay | Load, haul, crush, convey, deliver, sell. |
| Farm / orchard | Tree or row → crate → shed → truck → market or shop | Pick, pack, haul. |

If we can describe a chain as nodes + jobs, it belongs here. We do not invent a second logistics toy for mines.

---

## Hiring is the business, not a cart button forever

Today: hire on **this cart**.

Next: hire on **the company**.

1. Open **Hire** (or the business sheet).
2. See **your businesses** — cart on South shore, shop in town, quarry inland, orchard up the hill.
3. Tap one. You are looking at **that location**.
4. You see what is actually there: people, trucks, vans, delivery, excavator, crushers, belts.
5. You hire **into a slot** on that site (driver, stocker, crusher operator, picker), or you park a truck on that site so logistics can assign it.

Putting down an aggregates company is the same gesture as putting down a shop: land + kit + staff. Logistics does the rest.

A disconnected owner does not stall the mill. Hired work keeps ticking. Skip never replaces a hired person.

---

## Aggregates (small quarry)

Not “yard.” A **small quarry / mine** you set up.

### Chain (player picture)

1. **Static excavator** at the face (it does not roam the island).
2. Excavator loads a **truck**.
3. Truck dumps a **pile**.
4. Pile feeds a **crusher**. You own **3–4 crusher sizes**, each with **its own conveyor**.
5. Belts drop into sized piles.
6. Another truck takes product to a **set sell area** (weigh / bay / yard gate — whatever we name in-world).

About **20 SKUs** for the whole chain. Not hundreds. Not a vague “construction aisle.”

### SKU sketch (about 20 — names can move)

**Dig and haul**

1. Static excavator  
2. Pit truck  
3. Face / dig pad (the bit of ground the excavator is allowed to work)

**Piles**

4. Raw pile  
5. Coarse pile  
6. Mid pile  
7. Fine pile  
8. Fines / waste pile  

**Crush and convey** (three or four sizes, each with its own belt)

9. Primary crusher  
10. Primary conveyor  
11. Secondary crusher  
12. Secondary conveyor  
13. Tertiary crusher  
14. Tertiary conveyor  
15. Optional fourth crusher **or** screen / sorter  
16. Matching belt or chute into the sell piles  

**Sell and keep it running**

17. Road truck (pit → sell area, or sell area → customer)  
18. Sell bay / weigh  
19. Fuel / power for the plant  
20. Spare belt section **or** operator hut (one slot for “keep the line up”)

That is the catalog. Logistics wires excavator → truck → pile → crusher → belt → truck → sell. You do not draw a unique minigame for each step.

Output is still the island goods we already simulate where it fits (ore, concrete later). New SKUs are **kit**, not a 13th mystery commodity until we mean it.

---

## Farming

Own aisle, because the kit is not a crusher.

You pick a **grow** (orchard vs field vs mixed), then the sheet shows **what that grow needs**. Same logistics: pick → crate → shed → truck.

### Grows (Caribbean-facing, fictional islands)

Not a real-Earth dump. Names we can actually put on a lot:

| Grow | Picture | Kit you would buy |
|---|---|---|
| **Orchard** | Mango, citrus, coconut, banana / plantain | Trees or palms, irrigation, crates, picking poles / platform, packing shed |
| **Cane** | Rows, seasonal cut | Cane stools, cutters, cart or small truck, mill feed later |
| **Ground** | Cassava, sweet potato, pineapple, beans, corn (South already knows corn) | Beds, irrigation, crates, small tractor or hand tools |
| **Spice / small plot** | Hot pepper, herbs, coffee as a later “slow tree” | Shade, drying racks, sacks |

Start **orchard + one field grow**. Do not ship twelve crops on day one. Each grow is a short kit list, not a Wikipedia of agriculture.

Jobs: picker fills crates → someone hauls to the shed → truck to a stall, shop, or ferry shed. Same job graph as the stocker and the quarry truck.

---

## Street, shop, hotel (so the aisles make sense)

**Street** — buy a cart, drop it on a pad, hire a vendor, stock it. You already play this.

**Shop fit** — you own a small building. Shelves and a till are nodes. Stocker jobs fill them from backstock. Customers buy from the sim, not from you standing there.

**Hospitality** — you own or lease a house / hotel. Beds and kitchens are kit. Guests are sim demand later. Not politics. Not a second map.

Cart → staff → small building → large + planning. Unchanged. Marketplace only sells what those steps need.

---

## What the sim still owns

- Cash, stock, wages, who owns the lot.
- Whether a truck is on a job.
- Prices on each island (you buy kit on the island you are on).
- Production as **time**, not clicks.

The browser shows the excavator, the belt, the orchard. It does not decide that the crusher ran.

Trucks that “park and run a route” are this same system: a node with a schedule. Not a racing game.

---

## What we do not do

- Do not brand the marketplace PAPER, simulated, outfitter, or books.
- Do not add a Yard department of random building supplies.
- Do not make mine logistics a different engine from shop stocking.
- Do not let you buy North kit from South.
- Do not add House / Senate to get a shelf or a crusher.
- Do not clone another game’s shop UI.

---

## Build order (when we implement)

1. Center **2Isles Marketplace** shell: search, South / North, aisles. **Street** lists real carts. Other aisles say coming soon (honest empty, not fake SKUs).
2. Hire sheet grows from “this cart” to **list of your businesses** — even if the only business is carts at first.
3. **Shop fit** when small buildings exist.
4. **Plant + aggregates** (~20 SKUs) when a quarry lot type exists.
5. **Farming** orchard kit when a farm lot type exists.
6. Split fry stock (fish / chips / oil) when we are ready — that is Street stock, not a new aisle.

Until then, the left Market panel can stay as the temporary buy list. This file is the target, not a promise that the quarry is in the build this week.
