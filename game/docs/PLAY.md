# How to play

South west quay. Cash is $. PAPER / SIMULATED. One visitor on this process.

This is the live loop. Long-range design stays in [PLAN.md](../PLAN.md). Money math is [ECONOMY.md](../ECONOMY.md). Operator URL is [HANDOVER.md](HANDOVER.md).

---

## Spawn

Starter cash **$10,000**. **Alpha:** harbour spawn / hard-refresh / play restart wipes this visitor.

World: left-click walks. RMB-hold orbits. No WASD.

---

## Land

Street lots are dear versus the old $1,000 cart tutorial. South street starts at **$2,400**. Building dirt is **$15,000**.

**Cart pads** line Island Hwy: short rectangles, **$750**, max three, carts only. Click a $ tag to buy. Lots overlay: click the lot dirt.

Place the cart on the pad dirt. A green cart ghost follows the pointer and snaps onto the pad. Hold **R** to rotate. The whole footprint must sit on the dirt.

---

## Street carts

| Cart | Kit | Pack | Today | Games |
|---|---|---|---|---|
| Fruit | $90 | ×20 $14 | $6 | Fruit slice, Ripe sort |
| Watermelon | $1,150 | ×20 $22 | $8 | Melon slice, Seed spit |
| Fish and chips | $1,850 | ×20 $28 + propane $18 | $11 | Fry run, Basket pull, Wrap ticket |

Fruit is the cheap first cart (pad + kit + pack ≈ $854). Melon **$1,150** and fry **$1,850** also fit **$10,000**. Building dirt does not (**$15,000**). Hire **$300**. Fridge **$180**, then Sign → Awning → Lights → Stools.

Sales tax **8%**. Fruit net ≈ **$5.52** a sale. Pack COGS **$0.70** / unit.

---

## Buy path

1. Marketplace → **Add Cart** → dest sheet: **Bring to me** or **Warehouse**. Pay is disabled until you pick.
2. Bring to me: yellow van from the port, green crate on the kerb. **Take all** (60s then warehouse).
3. Warehouse: stored. **Bring to me** moves it onto you. **Sell** after a confirm.
4. **Place** only from a kit **on you** (Inventory or Books). Warehouse kits cannot place.
5. **Pick up cart** packs kit + leftover stock into the warehouse. Land stays yours.

---

## HUD

| Rail | Job |
|---|---|
| Inventory | What is on you. Place kits here. |
| Books | Business terminal. Compact list; **Open books** expands to P&L, island listings, inflation. |
| Warehouse | Dock storage. Sell / Bring to me. $5/day while occupied. |
| Marketplace | Catalog. Street, **Shopfit**, and **Hospitality** are live. Farming / Machinery stay honest empty. |
| Hire | Staff onto a site. |

Cash chip (top right) expands to holdings. Click a placed cart for **Stock · Run · Upgrades · Stats**.

Rooms inside harbour buildings are **Alpha 0.5.1**. Three grey shells sit next to the $750 spawn pads. **Lots** is dirt and pads. **Properties** is buildings and rooms — it does not turn on from Lots. **Landlord** is hidden until you own the dirt under a shell. Buy that dirt from the Properties sale sheet (or long-press / right-click the grey box). Spawn cannot afford $15,000 and you do not need the dirt to run a room.

Buy a room: Properties on (or tap a house $), point at a vacant grey box so it goes green, confirm “Buy Strand flat G-L for $900?”. The camera **enters that room**. **Exit room** is the big button at the bottom of the screen. Hide does not dump. Exit puts you on the kerb. Harbour taps while inside toast Exit room.

A crate on the kerb is a tap on the crate — it wins over the grey box. Hire a packer / till worker are **people** ($300), not furniture. The Shopfit Till is a counter you Place.

Empty rooms are legal. Marketplace **Shopfit** / **Hospitality** → Bring to me → Inventory **Place** on that floor (Hold **R**). Pickup packs to the warehouse. **Scout** on a flat or office returns 1–3 tenant profiles (poor / mid / high from placed furniture). Sign the profile; no 3/6/24/48 picker. Books shows the rent line or “Empty room · $0. Scout a tenant.”

South quay has walkers. A signed tenant is a body in that room while you are inside.

Spawn **$10,000**. A shop is $1,200, a flat is $900, an office is $1,100. Dirt under a building is **$15,000**.

---

## First hour

1. Buy a highway pad ($750).
2. Market → Fruit cart + fruit pack → Bring to me (or Warehouse then Bring to me).
3. Place on the pad. Hold R to rotate, tap when the ghost is green.
4. Stock from Inventory or Warehouse. Hire $300, or Play a shift while unhired.
5. Fridge when you can. Open **Books** to see COGS, worth, and $/min.

---

## Verify

```bash
cd game
npm test
npm run play
```
