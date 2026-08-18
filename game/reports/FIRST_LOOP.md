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

- Tabs at the top: **Stock** · **Run** · **Stats**. No left-right scroll.
- **Hire** at the bottom. One button. An AI vendor appears and runs the site (auto-stock from the warehouse on carts/shops; mines extract).
- Sales: about **10 per 3 minutes** on a 10/10 site (~18 ticks at 1 Hz). Mini-games speed the next sales. Hired AI still sells if you skip.
- Sticker hint: **$6.00**. Tax 20%. A 10/10 quiet street is about **$16/min** PAPER after tax.
- Desirability 0–10: staffed 2.5, stocked 2.5, upgraded 3, foot traffic up to 2. Crowding on the same street caps earnings (1 rival → 7.5, 2+ → **5**).
- Fridge / upgrade: $200, doubles storage.

## Play

```bash
./play.sh              # http://localhost:8787
./play.sh --public     # plus a pasteable laptop URL
```

## UI
- Corners stay: cash top-left, viewers top-right, Inv/Wh/Mkt/Staff on the left, travel dock at the bottom
- Left **Carts** is a directory: unplaced kits (Place) and placed carts (Open). Ops live on **that site**.
- Click a placed cart, or your shop / mine, for the site menu.
- Market: each Buy has the drop location sitting over it (your lot name, or South warehouse). Click Buy → how many and where. Market stays open.
- Deliver to the property: crate is already on the kerb. 60s to take it, else it goes to the warehouse. Taking the crate is how goods enter pockets.

## Loop
1. Buy a lot from a nearby $ bar.
2. Market → Fruit cart → Buy → Warehouse (or your lot) → Pay.
3. Place from Carts. Tap **that** cart.
4. Stock · Hire (one button) · optional Fridge · play Fruit slice on Run.
5. Stats shows desirability, people searching the street, and PAPER / min.
6. Sales tax 20% goes to the island bank.

## Next map pass (not this slice)
North harbour sidewalks / kit pieces.
