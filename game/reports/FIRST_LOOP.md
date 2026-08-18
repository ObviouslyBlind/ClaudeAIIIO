# South first loop

- Spawn: South west quay. Cash is $. PAPER / SIMULATED.
- Land: stone quay wrapping to sand, Island Hwy (2+2, stone median) through the island, 5 empty town centres, volcano no-go.

## Street carts

Caribbean fruit-style stalls. Starter kit id stays `hotdog_cart` so old saves still place.

| Cart | Kit in Market | Stock pack | Mini-game |
|---|---|---|---|
| Fruit cart | Fruit cart | Fruit ×20 | Fruit slice |
| Watermelon cart | Watermelon cart | Watermelon ×20 | Melon slice |
| Fish and chips | Fish and chips cart | Fish and chips ×20 | Fry run |

## Site menu (cart, shop, mine)

Same card for a placed cart, a shop, and a mine.

- Tabs: **Stock** · **Run** · **Upgrades** · **Stats**.
- **Stock** is a number, red / yellow / green for low / mid / full. Hired vendor fills remaining room from the warehouse (including after Fridge).
- **Sticker** is a $1–$11 slider, middle $6. Green on today’s price, yellow within $1.50, red further. The green pip moves with the dictated price. Off-green sales are slower.
- **Run**: **Hire $30.00** from cash, or **Vendor + Fire**. Play only while unhired.
- **Upgrades** are ticks then the next buy: Fridge ✓ → Sign → Awning → Lights → Stools. Each row shows its Stats appeal. Fridge $200, doubles cap, no hire required.
- Stats: each upgrade’s appeal, Area (foot traffic), Sticker band × sell time, Street, Rivals, Sale every Ns, Sales, **$ / min**, Shift.

## Play

```bash
./play.sh              # http://localhost:8787
./play.sh --public     # plus a pasteable laptop URL
```

## UI
- Corners stay: cash top-left, viewers top-right, Inv/Wh/Mkt/Staff on the left, travel dock at the bottom
- Left **Carts** is a directory: kits to place, stock on you, carts on the kerb. Ops live on **that site**.
- Click a placed cart, or your shop / mine, for the site menu.
- Market lists name, price, Buy. Where it goes is chosen on the Pay card, not on the catalog.
- Pay to the kerb: yellow van from the port, then a large green-lit crate. Tap it → **Take all** or **Close**. 60s then warehouse.

## Loop
1. Buy a lot from a nearby $ bar.
2. Market → Fruit cart → Buy → Pay (warehouse or this lot).
3. If the kerb: van, then crate → Take all. Place from Carts. Tap **that** cart.
4. Stock · Run (Hire $30 or Play) · Upgrades (Fridge ✓ then Sign → Awning → Lights → Stools) · Stats.
5. Stats shows each upgrade’s appeal, Area, Sticker band, Sale every Ns, $ / min, Shift.
6. Sales tax 20% goes to the island bank.

## Next map pass (not this slice)
North harbour sidewalks / kit pieces.
