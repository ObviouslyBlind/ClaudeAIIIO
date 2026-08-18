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
- **Hire** lives on **Run** only. One vendor. They keep selling if you skip the game.
- **Upgrades** is fridge / storage for $200. You can buy it before you hire.
- Stock loads from **On you** (what you took from a crate) or the **Warehouse**.
- Fruit slice is a 24s shift. Finish it and that site sells **5–10** at once. Hired staff still sell over time if you skip.
- Sticker hint: **$6.00**. Tax 20%. A 10/10 quiet street is about **$16/min** PAPER after tax.
- Desirability 0–10: staffed 2.5, stocked 2.5, upgraded 3, foot traffic up to 2. Crowding on the same street caps earnings (1 rival → 7.5, 2+ → **5**).

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
- Pay to the kerb: a large green-lit package appears. Tap it → **Take all** or **Close**. 60s then warehouse.

## Loop
1. Buy a lot from a nearby $ bar.
2. Market → Fruit cart → Buy → Pay (warehouse or this lot).
3. If the kerb: tap the green package → Take all. Place from Carts. Tap **that** cart.
4. Stock · Run (Hire and Fruit slice) · Upgrades (Fridge) · Stats.
5. Stats shows desirability, people searching the street, and PAPER / min.
6. Sales tax 20% goes to the island bank.

## Next map pass (not this slice)
North harbour sidewalks / kit pieces.
