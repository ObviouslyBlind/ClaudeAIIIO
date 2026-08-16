# Land — basic harbour plots

Paper leases on two authored islands. Not live. Not Earth.

## What Capital Rift does in public (genre only)

Sources: `capitalrift.com` gate comments, `/api/access/status`, [privacy policy](https://capitalrift.com/privacy/). The play client is behind Google auth. We did not copy it, and we do not have their parcel mesh.

| Public fact | What it implies |
|---|---|
| Save includes **buildings** and **leases** | Land is a first-class row, not decoration |
| Ticker language (gate comments): carts / **leases** | Leased units are a world stat |
| World is **real-world map data**; coordinates are sim, not GPS | They overlay economy on OSM-style Earth parcels |
| World edits keep a player id, OSM-history style | Changing a site is a recorded write |
| Delete account → buildings go **unowned** | Lease/building can exist without the player |
| localStorage: last camera, window layout, auto-buy seeds | Client is a camera on a planted world |

We copy the **shape**: pay in-game money for a discrete site, buildings sit on it, location changes price. We do **not** copy Earth, OSM parcels, their UI, or their lot outlines.

## What we do instead

Two fictional Caribbean-scale islands (about **2.0 × 1.2 km** each, ~1.9 km² of ellipse). Metres, origin at the channel. Folders: `game/assets/maps/<island>/plots.json`.

- **Port** is public: pier + warehouse + two reserved quay cells. You cannot buy the pier.
- **Plots** are 20 m squares with 6 m lanes. 8 × 5 = 40 sites per harbour. Rest of the island is crown land for later.
- **North** is dearer. **Quay** row is dearer than town, town dearer than inland.
- Lease is PAPER cash on the visitor. Labelled SIMULATED. No wallet.

## v1 verbs

1. Tap ground → walk (primary).
2. Tap a vacant plot when close → select.
3. **Lease** → cash down, stall appears.
4. Tap the port when close → ferry to the other harbour.
