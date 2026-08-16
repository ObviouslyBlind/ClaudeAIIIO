# Gauntlet status

Loop is **not finished**. Do not pause. User is the brake.

One **pixel critic** at a time (one pair of eyes). The **live harbour** already runs the rest together on `/`: water, shore foam, both quays, roads, street props, trees, cart, traffic, taxi, ferry, stalls, pedestrians, nametags, interiors, econ/nearby/cart/staff HUD, lease/develop/hire/fire/enter/exit/ferry/taxi, market + hansard.

Not a Capital Rift clone. No new politics.

## Held (pixel-ratified)

Inland spawn, paved ribbon, dirt, cars, yellow taxi, trees+cart, lease → House → Enter → Exit, ferry ticket $15, RMB orbit, cream ferry hull at north quay (`/g/ferry37` PASS, no orbit), kraft/cream shore foam bars in the north-quay basin (`/g/shore40` PASS), working-harbour quay clutter on the north timber pier (`/g/quay41` PASS), crate-scale coloured pedestrians on the north pier (`/g/peds44` PASS — teal / slate / green / terracotta shirts), kraft nametag cards above those walkers (`/g/tags46` PASS), spawn-sheet econ/nearby/staff (`/g/hud47` PASS), sage dinghies in the north basin (`/g/ding65` PASS).

## Held (code, live on the same page as the ferry)

Building shells + window lights — **not in the seaward spawn frame**; computerUse cannot RMB-orbit, so shells wait. Stalls, nametags (kraft cards + fold + punch hole, `/g/tags46` PASS), warehouse/factory/shop/farm/house-shop interiors, presence, cart, staff hire/fire, market books, persist, lease afford, player "You · PAPER" tag, north and south port signs, calendar, fares, tax, held-goods, faucet/sink, quay lamps, House chimney + porch + shutters + knocker, taxi/sedan dress, ferry bollards + life ring + door handle.

## Pixel ferry

`/?g=ferry30` **FAIL**: hull 550 m off the pier. Berth `HOME_Z=-6835`.
`/?g=ferry31` **FAIL**: teal canvas, stuck on Loading.
`/?g=ferry33` **FAIL**: Loading + body teal.
`/?g=ferry34` **FAIL BOOT**: stale tab `/?g=ferry32`.
`/g/ferry35` **FAIL HULL**: inland look.
`/g/ferry36` **FAIL NO ORBIT**: computerUse cannot emit trusted RMB. Do not ask later critics to orbit.
`/g/ferry37` **PASS**: cyan sky, North port · PAPER, $1000, cream hull in the water at the north quay.

## Pixel shore foam

`/g/shore38` **FAIL FOAM**: hairline dashes.
`/g/shore39` **FAIL FOAM**: side dashes read as the beige pier.
`/g/shore40` **PASS**: pale kraft/cream rectangular bars in the teal basin between pier lip and cream ferry.

## Pixel quay clutter

`/g/quay41` **PASS**: kraft timber pier with visible crates / cargo on the deck.

## Pixel pedestrians

`/g/peds42` **FAIL PEDS**: inland along sat on the visitor.
`/g/peds43` **FAIL PEDS**: 1.8 m shirts were specks on the crate path.
`/g/peds44` **PASS**: four coloured crate-scale box people on the pier (teal, slate, green, terracotta), seaward of the visitor.

## Pixel nametags

`/g/tags45` **FAIL TAGS**: coloured pier people in frame, but no kraft cards above them (48 m nearby hide + small sprites).
`/g/tags46` **PASS**: cream/tan kraft name cards above the coloured pier walkers, not only the visitor `You · PAPER` tag.

## Pixel HUD (econ / nearby / staff)

`/g/hud47` **PASS**: sheet showed `PAPER · SIMULATED · Index 1.00 · NPC $50,000 · out 19,601`, `PAPER · SIMULATED · 250 m PAPER cell · 0 nearby`, `PAPER · SIMULATED · Staff —`. Nearby count 0 is **not** held as a presence bar — only that the strip used PAPER · SIMULATED.

## Pixel HUD (cart / persist / calendar)

`/g/hud48` **FAIL HUD**: calendar still `Day — · tick — · PAPER`, cart still `Cart —` (first-frame HTML). Persist was `PAPER · SIMULATED`.
`/g/hud49` **PASS**: calendar `PAPER · SIMULATED · Day 0 · tick 71`, cart `PAPER`, persist `PAPER · SIMULATED`. Address `/g/hud49`.

## Pixel HUD (nearby count)

`/g/near50` **PASS HUD**: `PAPER · SIMULATED · 250 m PAPER cell · 4 nearby`. Address `/g/near50`.

## Pixel HUD (flow / tax / goods)

First HTML no longer ships `Faucet — · sink —`. Flow / tax / goods now paint `PAPER · SIMULATED` on first frame plus classic snapshot/statutes fetches.
`/g/flow51` **PASS HUD**: `PAPER · SIMULATED · Faucet 0 · sink 0`, `PAPER · SIMULATED · Sales tax 0%`, `PAPER · SIMULATED`. Address `/g/flow51`.

## Pixel HUD (staff / ferry spread)

Spawn has no selected plot, so staff is `PAPER · SIMULATED · Staff —` (the dash after Staff is the empty state, not a missing HUD). Spread first HTML no longer ships `Ferry spread · PAPER`.
`/g/hud52` **PASS HUD**: `PAPER · SIMULATED · Staff —`, `PAPER · SIMULATED · Ferry spread · N 0.00 · S 5.00`. Address `/g/hud52`.

`/g/fend53` **FAIL FENDER**: cream hull in frame, but the tyre sat on the south face (`z = +6`) behind the hull from the spawn camera at `z ≈ -6888`.
`/g/fend54` **PASS FENDER**: dark circular tyre with a kraft/cream band on the camera-facing (north) cream hull. Address `/g/fend54`.

## Pixel quay lamps

`/g/lamps55` **FAIL LAMPS**: pier and cream ferry in frame, but 0.4 m kraft glass on inland `along` values read as empty deck from the 24 m spawn camera.
`/g/lamps56` **FAIL LAMPS**: 2.6 m glass still a speck — live camera sits ~130 m inland of the seaward lip.
`/g/lamps57` **FAIL LAMPS**: 8 m cream cubes read as flat white pier planks, not posts with lanterns.
`/g/lamps58` **FAIL LAMPS**: still only flat cream rectangles on the deck; no vertical dark posts with amber lanterns. **Lamp round stopped.** Code stays; not pixel-held.

## Pixel north port sign

`/g/sign59` **FAIL SIGN**: cyan sky, cream ferry, HUD `North port · PAPER`, but no standalone two-post kraft board on land east of the pier. The 4 m seaward-facing board at ~70 m read as ferry furniture.
`/g/sign60` **FAIL SIGN**: `/g/sign60`, cyan sky, loaded harbour; only cream boards on the ferry. The 11 m inland apron board at z ≈ -6932 sat in deck clutter below the look-at.
`/g/sign61` **FAIL SIGN**: 24 m cream wall at x=18 sat off the port pad (`across >= 16` → water height) and read as ferry hull.
`/g/sign62` **FAIL SIGN**: pier, cream ferry, NPCs in frame; vertical dark bits read as ferry masts, not a standalone two-post land sign. **Sign round stopped.** Code stays; not pixel-held.

Pixel: **sage dinghies** in the north basin at `http://localhost:8787/g/ding63`. Between kraft pier and cream ferry, seaward spawn, no RMB. Close other Two Harbors tabs. Address bar must be `/g/ding63`. Do not restart play while the critic is on the page.

`/g/ding63` **FAIL DINGHY**: pier, cream ferry, teal basin in frame; no small sage boats — 6 m hulls at y=0.42 read as empty water. Hulls are now 18 m sage with kraft gunwales, lifted into the look-at band.
`/g/ding64` **FAIL DINGHY**: still only the cream ferry in the basin. 18 m boats sat at x=±14, beside the channel the critic photographs.

Pixel: **sage dinghies** at `http://localhost:8787/g/ding65`. Center channel between kraft pier and cream ferry. Seaward spawn, no RMB. Close other Two Harbors tabs. Address bar must be `/g/ding65`. Do not restart play while the critic is on the page.

`/g/ding65` **PASS DINGHY**: cyan sky, loaded harbour, sage/olive dinghy in the center water between pier and cream ferry.

## Held (pixel-ratified, dinghies)

Sage dinghies in the north basin (`/g/ding65` PASS).

Pixel: **kraft gangplank / brow** from the north pier toward the basin at `http://localhost:8787/g/brow66`. Seaward spawn, no RMB. Close other Two Harbors tabs. Address bar must be `/g/brow66`. Do not restart play while the critic is on the page.

`/g/brow66` **FAIL BROW**: pier, cream ferry, and white pier sections in frame; the kraft plank sat on the pier lip and read as decking.

Pixel: **kraft gangplank / brow** at `http://localhost:8787/g/brow67`. Center water channel (same as ding65), dark plank + kraft wear. No RMB. Address bar must be `/g/brow67`. Do not restart play while the critic is on the page.

`/g/brow67` **FAIL BROW**: pier, teal water, cream ferry, pier NPCs in frame; the 0.55 m slab at the lip read as empty water.

Pixel: **kraft gangplank / brow** at `http://localhost:8787/g/brow68`. Dinghy-tall dark plank in the water gap past the north pier lip. No RMB. Address bar must be `/g/brow68`. Do not restart play while the critic is on the page.

## Next pixel (after brow68 PASS, immediately, no wait)

## Frozen

House / Senate / councils / elections / amendments.
