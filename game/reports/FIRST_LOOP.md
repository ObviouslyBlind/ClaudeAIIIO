# South first loop

- Spawn: South west quay. Cash is $.
- Land: stone quay wrapping to sand, Island Hwy (2+2, stone median) through the island, 5 empty town centres, volcano no-go. No buildings on South this pass.
- North is the industrial capital. South is cheaper coastal / market-town land.

## Street carts

PLAN South food is corn, potato, lettuce, beans. Four kerb carts, one each. No extra mineral good.

| Cart | Cooks | Kit in Market | Stock pack |
|---|---|---|---|
| Roast corn | corn | Roast corn cart | Roast corn ×20 |
| Potato roti | potato | Potato roti cart | Potato roti ×20 |
| Callaloo | lettuce | Callaloo cart | Callaloo ×20 |
| Stew peas | beans | Stew peas cart | Stew peas ×20 |

Juice, cane, and fish wait until there is a matching good.

## Play

```bash
./play.sh              # http://localhost:8787
./play.sh --public     # plus a pasteable laptop URL
```

## UI
- Corners stay: cash top-left, viewers top-right, Inv/Wh/Mkt/Staff on the left, travel dock at the bottom
- Chrome look: dusk-ferry brass plates, destination-board wordmark, compact submenus (not a giant ledger)
- Click a launcher → **one compact submenu** next to it. Back drills in (Market → aisle → buy). Click again to close.
- Left **Carts** is a directory: unplaced kits (Place) and placed carts (Open). Hire, train, stock, sticker, fridge live on **that cart**.
- Click a placed cart in the world for its own menu.
- Cart sticker: type a price. Next to it: **$5.00 is today's price**
- Market default: **Warehouse**. Or **Pockets**. Buying never stocks a stall that is not on the kerb.

## Loop
1. Buy a lot from a nearby $ bar.
2. Market → pick one street cart → **Warehouse** → Buy.
3. Warehouse holds it. Place from Carts (pulls from the dock warehouse).
4. Tap **that** cart: hire someone (carts do not sell without staff), train/pack a shift, load that cart's stock pack, type a sticker, fridge $200.
5. Sales tax 20% goes to the island bank.

## Next map pass (not this slice)
North harbour sidewalks / kit pieces. Buildings stay a later slice.
