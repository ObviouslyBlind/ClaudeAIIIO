# Gauntlet status

New chat: paste **`game/reports/HANDOVER.md`**, not this file.

Loop is **live** on playtest bugs (operator: “so many bugs, use the gauntlet”). Not seaward cubes. Not another funnel.

`/g/play88` **PASS INTERACTIVE**: inland harbour, beige sand, black road, Cash $1,000, PAPER · SIMULATED. Left click did not hang.

`/g/walk89` **FAIL WALK**: left click on inland ground → “Page Unresponsive.” Recursive `intersectObjects` on the full harbour (trees/props). D034: clickTargets only.

`/g/walk90` **FAIL WALK**: cheap raycast was not enough. Click still opened “Page Unresponsive” because dressing (`trees.js`) started 400ms after boot and compiled during the first tap. D035: dress 5s after first click, or 60s fallback.

`/g/walk91` **PASS WALK**: inland beige harbour, Cash $1,000, PAPER · SIMULATED. Left click walked; no hang. Trees compiled after the walk.

`/g/lease92` **FAIL LEASE**: click then “Page Unresponsive” while closing the North sheet. Dressing still started 5s after the first tap (`trees.js`). Lease stayed disabled. D036.

`/g/scale93` **PASS SCALE**: person-scale shed vs visitor, no 32 m towers, inland click walked, no hang for 8s.

`/g/lease94` **PASS LEASE**: inland street plot, Lease enabled, cash $1,000 → $745 ($255), “yours”, no hang.

Current piece: **`/g/play95` PLAY** — yellow taxi at north spawn, Taxi button works, timber pier over water with pilings (not an 86 m sand slab). No RMB.

One **pixel critic** at a time. Unique `/g/…` path. No RMB. Do not restart play while a critic is on the page.

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

`/g/brow68` **FAIL BROW**: pier, cream ferry, NPCs, teal water in frame; lip slab still unread. Brow round stopped; not pixel-held.

`/g/buoy69` **FAIL BUOY**: pier, cream ferry, NPCs, empty teal water — rust drum sat inside the sage dinghies at toward*102.

Pixel: **rust channel buoy** at `http://localhost:8787/g/buoy70`. On the camera-facing cream hull (fend54 slot), 8 m rust cube + kraft band. No RMB. Address bar must be `/g/buoy70`. Do not restart play while the critic is on the page.

`/g/buoy70` **PASS BUOY**: cyan sky, loaded harbour, rust-brown mass on the left of the cream ferry, distinct from the beige pier.

## Held (pixel-ratified, buoy)

Rust channel buoy on the north cream hull (`/g/buoy70` PASS).

Pixel: **kraft/rust life ring** at `http://localhost:8787/g/ring71`. Same camera-facing hull as buoy70, offset +x. No RMB. Address bar must be `/g/ring71`. Do not restart play while the critic is on the page.

`/g/ring71` **FAIL RING**: pier, cream ferry, NPCs, cyan water in frame; 1.2 m segs at r=2.8 read as hull furniture, not a distinct rust/kraft ring.

Pixel: **kraft/rust life ring** at `http://localhost:8787/g/ring72`. Same camera-facing hull as buoy70, buoy-tall rust/kraft cluster to the RIGHT of the rust buoy. No RMB. Address bar must be `/g/ring72`. Do not restart play while the critic is on the page.

`/g/ring72` **FAIL RING**: cream hull and cabin in frame; 8 segs at x+10.2 sat on the wheelhouse and read as bridge furniture.

Pixel: **kraft/rust life ring** at `http://localhost:8787/g/ring73`. Solid 8 m rust cube + kraft band on the bow, right of the held buoy, clear of the wheelhouse. No RMB. Address bar must be `/g/ring73`. Do not restart play while the critic is on the page.

`/g/ring73` **FAIL RING**: left-side rust buoy in frame; bow cube at x+15.4 sat under the spawn camera and the visible right hull stayed cream. **Ring round stopped.** Code stays; not pixel-held.

Pixel: **rust funnel** at `http://localhost:8787/g/funnel74`. Tall rust chimney stacked on the held buoy slot (x=0), above the left-side rust mass. No RMB. Address bar must be `/g/funnel74`. Do not restart play while the critic is on the page.

`/g/funnel74` **FAIL FUNNEL**: left-side rust buoy in frame; 12 m stick at y=14 sat inside that low brown mass, not a chimney in the sky.

Pixel: **rust funnel** at `http://localhost:8787/g/funnel75`. 40 m rust stick into the cyan sky above the held buoy. No RMB. Address bar must be `/g/funnel75`. Do not restart play while the critic is on the page.

`/g/funnel75` **FAIL FUNNEL**: cream hull and low rust cabin in frame; 40 m stick still unread. **Funnel round stopped.** Code stays; not pixel-held.

Pixel: **rust cargo** at `http://localhost:8787/g/cargo76`. Buoy-class rust cube on the north timber pier, east of the walk. No RMB. Address bar must be `/g/cargo76`. Do not restart play while the critic is on the page.

`/g/cargo76` **FAIL CARGO**: beige timber pier, cream ferry, NPCs, teal water in frame; no rust cube. Placement `pierZ+26` (`z≈-6886`) sat on the spawn camera (`z=-6888`) and clipped. Cube now sits on the seaward lip (`pierZ+38`, `z≈-6874`), east of the walk.

Pixel: **rust cargo** at `http://localhost:8787/g/cargo77`. Buoy-class rust cube on the north timber pier lip, east of the walk, between beige deck and cream ferry. No RMB. Address bar must be `/g/cargo77`. Do not restart play while the critic is on the page.

`/g/cargo77` **FAIL CARGO**: beige pier, NPCs, cream ferry in frame; no rust cube on the deck. Kraft cap on the 8 m cube read as more decking from the downward spawn camera. Cargo is now a pier-wide rust slab (rust TOP, no kraft cap) on the centre lip.

Pixel: **rust cargo** at `http://localhost:8787/g/cargo78`. Pier-wide rust slab on the north timber, seaward lip, centre of the walk. No RMB. Address bar must be `/g/cargo78`. Do not restart play while the critic is on the page.

`/g/cargo78` **FAIL CARGO**: cyan sky, beige pier, cream ferry, NPCs; pier still uniformly beige, no rust slab. **Cargo round stopped.** Code stays; not pixel-held. Overhead pier rust reads as decking.

Pixel: **rust hull plate** at `http://localhost:8787/g/plate79`. Buoy-class rust cube on the camera-facing cream hull, port (left) of the held buoy. No RMB. Address bar must be `/g/plate79`. Do not restart play while the critic is on the page.

`/g/plate79` **FAIL PLATE**: one rust buoy on the hull; port cube at x-8.8 sat behind the cream hull from the east spawn camera. Waterline rust band now on the camera-facing north face, below the buoy.

Pixel: **rust hull waterline** at `http://localhost:8787/g/plate80`. Wide rust band on the camera-facing cream hull, below the held buoy. No RMB. Address bar must be `/g/plate80`. Do not restart play while the critic is on the page.

`/g/plate80` **FAIL PLATE**: cream hull with one rust buoy; y=2.4 band hid behind the sage dinghies. Stripe lifted to buoy height (`y=5.4`) so it sits above the dinghies.

Pixel: **rust hull stripe** at `http://localhost:8787/g/plate81`. Wide rust band across the camera-facing cream hull at the held buoy's height. No RMB. Address bar must be `/g/plate81`. Do not restart play while the critic is on the page.

`/g/plate81` **FAIL PLATE**: cream hull with one small rust buoy blob; 22 m stripe at buoy height still unread. **Plate round stopped.** Code stays; not pixel-held.

`/g/teal82` **FAIL TEAL**: pier uniformly beige; 5.4 m teal cube sat inside the unread 12×16 cargo slab.

`/g/teal83` **FAIL TEAL**: pier still uniformly beige; 8.2 m cube stacked on cargo unread. **Teal round stopped.** Code stays; not pixel-held.

Pixel: **terracotta basin crate** at `http://localhost:8787/g/clay84`. Ped-shirt terracotta cube in the north water channel, between pier lip and sage dinghies. No RMB. Address bar must be `/g/clay84`. Do not restart play while the critic is on the page.

`/g/clay84` **FAIL CLAY**: no terracotta mass in the basin; cube at toward*80 sat inside the unread cargo slab. Crate is now dinghy-deep, seaward of cargo, in front of the cream ferry.

Pixel: **terracotta basin crate** at `http://localhost:8787/g/clay85`. Ped-shirt terracotta block in the center water, seaward of the pier cargo, in front of the cream ferry. No RMB. Address bar must be `/g/clay85`. Do not restart play while the critic is on the page.

`/g/clay85` **FAIL CLAY**: sage dinghies in frame; no terracotta mass. **Clay round stopped.** Code stays; not pixel-held.

Pixel: **green hull crate** at `http://localhost:8787/g/green86`. Ped-shirt green cube on the camera-facing cream hull, right of the held rust buoy. No RMB. Address bar must be `/g/green86`. Do not restart play while the critic is on the page.

`/g/green86` **FAIL GREEN**: no green cube on the hull; x+5.2 sat in the wheelhouse. Block is now dinghy-deep, stacked above the held sage hulls in the center channel.

`/g/green87` **FAIL GREEN**: first frame still only sage dinghies, cream ferry, beige pier, and a tiny green shirt. No large distinct green mass in the basin. **Green round stopped.** Code is off the live quay (playtest restore); not pixel-held.

## Playtest (2026-08-17)

Open **`http://localhost:8787/`**. First frame looks inland along the tarmac, not at the ferry basin. Close stale `/g/…` tabs. Click to walk, cart, lease → House → Enter → Exit. PAPER / SIMULATED.

## Next pixel (paused until playtest)

## Frozen

House / Senate / councils / elections / amendments.
