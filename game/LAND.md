# Land — parcels you claim, then develop

Paper leases on two authored islands. Not live. Not Earth.

## What Capital Rift does in public (genre only)

The play client is behind Google. We did not copy it. Public sources:

| Source | Fact |
|---|---|
| Privacy policy | Save includes **buildings** and **leases**. World is **real-world map data**; coordinates are sim, not GPS. World edits keep a player id, OSM-history style. Delete account → buildings go **unowned**. localStorage: last camera, auto-buy **seeds when planting**. |
| Gate comments | Ticker language includes carts / **leases**. |
| Terms | Players can name land, carts, shops. In-game buildings are a licence, not real property. |
| World of Fate (same studio, public Steam page) | You **choose a real-world building** as HQ, then **claim nearby buildings** and assign housing or storage. The map’s existing footprints *are* the land. |

Mechanic we copy: you do not receive a lot from a menu. You walk the world, tap a piece of ground that already exists, pay for that piece, then develop it. We do **not** copy Earth, OSM parcels, their UI, or their lot outlines.

## What we do instead

Two fictional Caribbean-scale islands (~8.0 × 4.4 km each), **ports about 13.9 km apart** across a channel. Metres, origin at the channel.

- **Port** is public (pier + warehouse). You cannot buy the quay.
- **Parcels** are irregular pieces of the island: street lots along a paved spine, fields behind them, a few shore lots. They are the dirt, not a numbered card. Vacant lots draw as faint **outlines** inset from the road, not translucent slabs over the pavement. Street lots are house-frontage (not 140 m slabs). NPC farms sit inland. Land is generally expensive: $1000 PAPER buys a street cart, not a street lease. **Cart pads** on the Island Hwy verge are the cheap dirt: $750, max three, carts only. North still costs more per m² than South. A lease inflates remaining vacant asks (cart pads stay $750).
- **Paved road** is a **black tarmac spline** (control `nodes`, sampled `points`) from the port inland. No kerbs or dashed centre line. **Dirt tracks** out to fields. Parcel rings are rejected if any edge comes within 11 m of the paved centreline.
- **Traffic (PAPER):** a few NPC cars loop the paved nodes. They do not leave the tarmac.
- **North** costs more per m². Shore costs more than street; street more than field.
- **Walk (PAPER):** tap-to-walk only where height is above 0.25 m. Water is forbidden. A straight path through the harbour channel is refused (`Stay on land.`).
- Tap the land → inspect (area, price). **Lease** (PAPER) → it is yours. **Develop** opens a catalogue (house, shop, house with shop, small farm, warehouse, factory). Then tap your leased parcel to place that type. NPC lots still show farm / stall.
- **Taxi** (PAPER): HUD button. Drives the paved spine only (`/api/map` roads with `kind === "paved"`). Collects you if you are on/near paved, then the next tap if that tap is on paved. Dirt tracks are forbidden.
- **Interior (PAPER):** if a plot is yours and developed, tap the building or **Enter**. Downstairs, stairs, upstairs (placeholder boxes). **Exit** returns you to that plot. The harbour world is hidden, not deleted.
- Labelled SIMULATED. No wallet.
