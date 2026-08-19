# Gauntlet status

Piece in play: **Fire despawns in 3D**.

| # | Bar | Status |
|---|---|---|
| 1 | **Buy $32 → cash $968** | **PASS** |
| 2 | **Price sticker** | Track exists. Needs a critic standing at the cart. |
| 3 | **Fire despawns** | **FAIL**. Last critic: cash $968, cart placed, Price track OK, but camera stayed on the spawn highway so the 3D vendor could not be confirmed. |
| 4–8 | Remaining | Open. |

Fix this round: follow the placed cart every frame from `/api/play` (not only while the site card is open). Closing the card or tapping the veil must not restore the spawn highway.

Politics frozen. Operator is the brake.
