# Gauntlet status

Loop is **not finished**. Do not pause. User is the brake.

One **pixel critic** at a time (one pair of eyes). The **live harbour** already runs the rest together on `/`: water, shore foam, both quays, roads, street props, trees, cart, traffic, taxi, ferry, stalls, pedestrians, nametags, interiors, econ/nearby/cart/staff HUD, lease/develop/hire/fire/enter/exit/ferry/taxi, market + hansard.

Not a Capital Rift clone. No new politics.

## Held (pixel-ratified)

Inland spawn, paved ribbon, dirt, cars, yellow taxi, trees+cart, lease → House → Enter → Exit, ferry ticket $15, RMB orbit.

## Held (code, live on the same page as the ferry)

Shore foam (denser quay dashes), quay clutter, building shells, window lights (warmer glow), stalls (awning stripes), pedestrians (cloth colours + extra quay walker), nametags (larger kraft cards), warehouse (floor crates)/factory (floor machines)/shop (counter)/farm (crop beds)/house-shop (shelves) interiors, presence, cart (crate + canvas), staff hire/fire, bid/ask/sell/cancel + market cancel button, North/South books, upkeep, persist dump + restore control, lease afford, player "You · PAPER" tag + satchel, north and south port signs, calendar, develop afford, ferry fare, taxi fare, sales tax, held-goods, faucet/sink, stall last-print, quay lamp posts, street verge lamps, House chimney + porch slab, deeper quay-channel water, spawn verge trees, taxi roof sign, sedan paint variety, warmer sky haze, House downstairs table, extra quay coils, verge crate seats, kraft ferry-ticket stamp.

## Pixel ferry

`/?g=ferry30` **FAIL**: hull 550 m off the pier. Berth `HOME_Z=-6835`.
`/?g=ferry31` **FAIL**: teal canvas, stuck on Loading.
`/?g=ferry33` **FAIL**: Cash $1000, canvas body teal `#0e4a55`, status still "Loading 3D harbour…" at 25s. HUD module tags were loading before `main.js`, so the first WebGL frame never ran. Fix: `first-frame.js` paints sky+berth after three.js only; HUD loads after the loop starts; canvas inline `#7ec8d4`. Next: `/?g=ferry34`.

## In flight (not ferry-only)

Pixel: ferry hull at north quay `/?g=ferry34` (restart play first; do not restart while the critic is on the page).

## Next pixel (after ferry33 PASS, immediately, no wait)

Shore foam, quay, shells+lights, stalls, econ/nearby/staff lines, pedestrians, nametags, interiors.

## Frozen

House / Senate / councils / elections / amendments.
