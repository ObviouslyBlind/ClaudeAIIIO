# Gauntlet status

Piece in play: **harbour loop — the three prompts, whole system.**

Source (operator, in order):

1. Yellow/red is **price**. Gauntlet the system until it is honest.
2. Fire despawns. Fruit clock is real. More upgrades that show Stats appeal. Per-cart maths (area, fruit slice / shift, sticker $ can slow sales). Simple player: walk, body colour, shirt, head. Delivery van works again.
3. Gauntlet until all of that is fixed.

Bar the critic inspects on live `http://127.0.0.1:8787/`. One verdict for the whole list.

| # | Bar | How to see it |
|---|---|---|
| 1 | **Buy $32 → cash $968** | Top-right **Buy $32** chip (not a world $ tag). One click. Cash plate ~$968. Chip gone. |
| 2 | **Price sticker** | Tap a **placed cart** → **Stock**. Track is red–yellow–green–yellow–red. Green on $6. Label says Price. Not the Market Pay card. |
| 3 | **Fire despawns** | Run → Hire $30 → vendor at cart. Fire → vendor gone immediately. |
| 4 | **Fruit clock** | Run → Play (only while unhired). Clock is wall-clock seconds. |
| 5 | **Upgrades + appeal** | Upgrades: Fridge → Sign → Awning → Lights → Stools. Each row shows +appeal. Stats lists those points. |
| 6 | **Cart maths** | Stats: Area, Sticker band × sell time, Sale every Ns, $ / min, Shift. Off-green sticker slows hired sales. |
| 7 | **Simple walker** | Coloured body, shirt, head. Tap-walk swings limbs. Camera close enough to read a person. |
| 8 | **Kerb van** | Market → Buy → Pay (default is the lot / kerb). Yellow box van from the port, large green crate, van drives away. Take all / Close. |

Do **not** grade Market Pay “How many / Where” as the sticker. That card is qty + dest.
Do **not** click Lots first. Do **not** click a world `$32` tag. The chip is top-right **Buy $32**.

Last critic (bc-3c66cfcb): **FAIL** — Buy $32, card “44 ISLAND HWY / YOURS / Close”, cash stayed $1,000.

Fix in this round: chip click posts lease only (no land-card / Yes-buy race). `stampPlay` bumps `playGen` so a stale GET `/api/play` cannot restore $1,000 after the lease response.

Politics frozen. Operator is the brake. Stale critic transcripts are not the product.
