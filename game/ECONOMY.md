# Economy

PAPER / SIMULATED. No wallet. No live trading. The sim owns cash, prices, stock, tax, and listings. The browser is a camera.

Live numbers and the player loop: [`docs/HANDOVER.md`](docs/HANDOVER.md) · [`docs/PLAY.md`](docs/PLAY.md). Doc map: [`docs/README.md`](docs/README.md).

This is the live economy slice of 2Isles, written from what is already law in [`PLAN.md`](PLAN.md), [`economy.ts`](src/economy.ts), and the harbour first loop — not a second system glued on the side.

Politics (House / Senate / councils / elections) stays frozen until the harbour loop is honest. Amending tax is already a statute slider in the catalog; seating a House is not this slice.

---

## 1. What already exists (do not reinvent)

PLAN §3.2–3.8 and §9–11 already named the machine:

| Piece | Spec | Code now |
|---|---|---|
| 12 goods, two island books | PLAN §3.2–3.3 | `goods.ts`, `books.ts`, `islandEconomy.ts` |
| Faucets / sinks + inflation HUD | PLAN §3.4 | `sim.ts` ledger, `hud-econ.js` |
| Sales tax as a statute | PLAN §3.5, §8.1 | `statutes.ts` `sales_tax`, launch **8%** |
| Land asks that inflate | PLAN §3.2 land scarce | `landPrice.ts`, `LAND_STREET_BUMP` |
| Staff as a wage line | PLAN §3.2, §3.7 | Hire **$300**; vendor runs the site |
| 6 PAPER listings, 5-min call auction | PLAN §3.8, step K | `stocks.ts` — Ferry Co, North Mills, South Farms, Island Bank, Harbour Quay, Channel Fuel |
| Cart grind as the player firm | PLAN §9 step 1–3 | `firstLoop.ts`, highway pads **$750** |
| Dual-island last prints | PLAN §3.3 | `lastPrice` / `lastPriceSouth` on `createWorld` |

GitHub on this tree already argued the numbers in the land-econ, fry-cart, cart-pads, cash-ledger, and cart-grind PRs: land is dear on purpose, fruit is the only starter kit that fits **$1000**, warehouse is a dock not a second shop, and stickers are a band against a dictated today price — not a seventh public listing.

A player cart is **not** one of the six island listings. “Stock price” on your fruit stall means sticker vs today, plus COGS from the pack catalog. Player-firm listing is PLAN’s size gate (step E / K), later.

---

## 2. Starter loop (honest)

Spawn cash **$1,000**. Alpha wipe on harbour spawn / hard-refresh.

| Buy | PAPER | Fits starter? |
|---|---|---|
| Highway cart pad | $750, max 3, no land inflation | yes |
| Fruit kit | $90 | yes, after a pad |
| Fruit pack ×20 | $14 → **$0.70 / unit COGS** | yes |
| Hire | $300 | after first fruit sales |
| Fridge | $180 | grind |
| Watermelon kit | $1,150 | no |
| Fish and chips kit | $1,850 | no |
| South street lot floor | $2,400 | no |
| North street floor | $6,800 | no |
| Warehouse rent | $5 / sim day while occupied | sink |

Today / sticker fruit **$6**. Tax **8%**. Net **$5.52** a sale. Pack COGS **$0.70**. Gross margin about **$4.82** before hire and pad.

A pad + fruit kit + one pack is about **$854**. Hire waits on the till. Melon and fry sit above starter cash so the first honest hour is: lease a pad, Bring to me, Place, stock, hire or Play.

Warehouse is storage. **Place consumes inventory only.** Pickup packs the kit (and leftover stock) into the warehouse. Bring to me, then Place.

---

## 3. How money moves

**Faucets.** NPC bids on the 12 goods; NPC wages; tiny new-player cash (starter $1000 is the launch faucet). Cart sales pay the visitor from the sticker; tax is carved off first.

**Sinks.** Sales tax (statute, launch 8%) into the island bank / ledger sink. Land upkeep. Warehouse $5/day. Hire $300. Catalog buys (kits, packs, propane, upgrades). Planning fees later.

**HUD (always on).** Money supply (NPC cash + visitor cash), goods produced (rolling window), price index (basket of 12). Land-ask index sits beside them (`landPriceIndex`). Ferry spread is mean |North − South| / fair0.

Do not add a second inflation index for the books terminal. It reads the same `hud()` facts.

**Land inflation.** A lease bumps remaining vacant asks: same street **3.5%**, same island **1.2%**, other island **0.4%**, capped at 4× seed. Cart pads stay **$750**; inflation never moves them.

**Island books.** South is native in food and extract; North in industry. Native fair ×0.92, import ×1.08, plus ferry friction (ticket / port / tariff). Raising the ferry statute widens last prints. That is the arb path. Cart fruit is a first-loop SKU, not a 13th good.

---

## 4. A cart on the books

The left-rail **Books** terminal is the player firm’s books. Compact beside the rail; **Open books** expands into the same sheet-center chrome as Marketplace.

Every number is derived from the sim:

| Line | Source |
|---|---|
| Trading / today | `stickerPrice` vs `cartTodayPrice` (fruit $6, melon $8, fry $11) |
| Previous / going | Sticker vs today (green / yellow / red band). Island tape: listing `last` vs `prev` on the 5-minute auction |
| Worth | Kit catalog + bought upgrades + leftover stock at pack unit (+ propane fraction on fry) |
| People | Hired vendor, or you on the stall, or vacant |
| COGS est. | `packPrice / 20` |
| COGS sold | `unitsSold × unit COGS` |
| Net / sale | sticker × (1 − sales tax) |
| Now / proj. hour / proj. day | live `perMinute` × 60 / × 1440. Labelled sim projections, not a forecast model |

Island listings on that sheet are the six PLAN firms. Last print moves on auction clear (tick 300, 600, …). `applyNews("ferry_tariff")` biases Ferry Co on the **next** clear, including while a bill is still on the floor — when House is unfrozen. Until then the tape still wiggles so a clear never reprints the same last.

---

## 5. What this is allowed to become

Keep one economy. Tie new verbs to the same books.

1. **Shops / mines** use the same site card and the same books rows (siteClass already exists).
2. **Player listing** after a size gate (PLAN §3.8, firms `books-public-if-large`). Then a seventh tape row is a shard listing, still PAPER, still 5-minute auction, still no shorting / leverage in beta.
3. **Wage floor / tariff / ticket** already live as statutes. Flipping them must move cart COGS, ferry spread, and Ferry Co together — not a special case in the HUD.
4. **North spawn** and dual books stay the long arb. South fruit is the tutorial, not the whole economy.
5. **Inflation** stays faucet/sink accounting. If money supply runs away, sink harder (tax, upkeep, warehouse, auction fees). Do not silently print cash.

Do not: a wallet ticker, Colyseus rooms for prices, a second “stock market” UI with fake quotes, or House seats because the terminal says economy.

---

## 6. Verify

```bash
cd game
npm test
```

`play.books` is PAPER. Pickup cannot Place from the warehouse. Pad snaps stay on the dirt. Island tape last ≠ prev after a 300-tick clear.
