# Two Harbors labels — find things for the island redesign

PAPER / SIMULATED. Grep these `kind` / `layer` / `.name` strings. Source of truth: `game/src/labels.ts`. Doc map: [`../docs/README.md`](../docs/README.md).

## Viewers (top right)

| Viewer | `data-overlay` | What you see | What a tap hits |
| --- | --- | --- | --- |
| World | `world` | the islands | walk. buildings / stands / port. **$ tags buy** |
| Lots | `lots` | boundary outlines | click the **$ title** or a lot to buy |
| Foot traffic | `foot` | High / Moderate / Low ribbons + road names | walk only |
| Logistics | `logistics` | van + roadside crate pads | crate / van / walk |
| Minerals | `minerals` | empty on South v1 | walk only |

Buy a plot by **clicking its $ price tag** (that buys immediately). Lots overlay: click the lot dirt. The card $ line is **Buy lot**. Left-click empty ground in World still walks.

## Mesh kinds

| kind | name pattern | file |
| --- | --- | --- |
| `road` | `road:<island>:<street>` | `public/harbour/roads.js` |
| `parcel-fill` | `parcel-fill:<island>` | `public/harbour/parcel-map.js` |
| `parcel-lines` | `parcel-lines:<island>` | `public/harbour/parcel-map.js` |
| `parcel-label` | price / YOURS sprites | `public/harbour/parcel-map.js` |
| `lot-outline` | `lot-outline:<plotId>` | `public/harbour/overlays.js` |
| `crate` | `crate:<deliveryId>` | `public/harbour/cart.js` |
| `van` | `delivery-van` | `public/harbour/delivery.js` |
| `hotdog-cart` | `hotdog-cart:<standId>` | `public/harbour/cart.js` |
| `vendor` | `vendor` | `public/harbour/cart.js` |
| `foot-road` | `foot-road:<island>:<street>` | `public/harbour/overlays.js` |
| `foot-label` | `foot-label:<Street · High>` | `public/harbour/overlays.js` |
| `logistics-pad` | `logistics-pad:<deliveryId>` | `public/harbour/overlays.js` |
| `ground` | terrain / curbs | `public/harbour/main.js`, `roads.js` |
| `port` | pier / shed | `public/harbour/main.js` |

Street names live on `Road.name` in `src/land.ts`: Harbour Rd, Market St, Mill St, Chapel St, Weir St.

## First-loop delivery

Van follows paved taxi graph → stops on the carriageway (`drop.curbX/Z`) → crate on the verge (`drop.x/z`, `SHOULDER_M`) → **waits** until take-all → then drives away (`drop.awayX/Z`).
