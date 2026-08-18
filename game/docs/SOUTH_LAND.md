# South land (v1, land only)

No buildings on this pass. Lots, roads, sidewalks, and a stone seawall. Zero houses.

## Which island is “more developed”?

**North** is the industrial capital: dense, dear land, tools / steel / stock board.

**South** is cheaper, food and ore, export-dependent, lives on the ferry. Spawn is South, so the **coast** is settled — stone quay, sand, market-town footprints — but it is not the foundry island.

## Port

West / left-hand channel quay. Terrain is the deck (flat grade 1.28 m). The mesh is a **seawall** from the water up to coping, wrapping east into sand. Not a slab sitting on the grass.

## Grade

Harbour, Island Hwy, town centres, and access roads sit on one flat grade. The volcano cone is unchanged. Beach dip stays off the paved apron.

## Roads

- Island Hwy: 2+2 lanes, stone median, west quay → east coast, around the volcano.
- Spurs start at the roundabout **ring**, not the circus centre. Highway ribbons leave a gap at each circus.
- Pale stone sidewalks beside ordinary streets (not the highway, not roundabouts).
- Hamlets (short cross streets + dirt tracks) along Canebrake Rd, Haven Rd, South Strand, and the highway so long runs are not a void.
- Dirt tracks carry larger field plots on both sides.

## Lots

Street lots on **both** sides. Five empty town greens (reserved, no buildings). Shore stall lots. Field plots off dirt.

## Taxi

Hail waits 5–30 s. Bottom-right chip: `Taxi in 0:12`. Then the cab stages down the paved road and drives in. Cab is already parked on paved at spawn (roof lamp in the first frame). 60 s unboarded leave still applies after it arrives.

## Verify

```bash
cd game && npm test
```

Spawn South: west seawall, flat apron, sidewalks, lots both sides, highway heading inland (+X).
