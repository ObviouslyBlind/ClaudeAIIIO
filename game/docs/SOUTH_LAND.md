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

- Island Hwy: 2+2 lanes with a **wide stone median** — the only dual carriageway. It **stops at the circus ring**; it does not chord through the island.
- Harbour Circus is a **flat asphalt ring + stone island**, not stacked polylines. Only **Quayward Rd** leaves that ring (plus the highway). South Strand Y-forks off Quayward; Channel Sands Y-forks off Island Hwy; Palm Arc Y-forks off Strand.
- Channel Sands **Y-forks off Island Hwy** east of the circus. Palm Arc **Y-forks off South Strand**. They are not extra ribbons into the same ring.
- Arterials (named Rd): 7.2 m tarmac + sidewalks. Locals (Row / Alley / Fork / Lane / Loop) are narrower T-stubs.
- Dirt tracks: thin packed earth with larger field plots.
- Quayward is a **block loop** around the green, not a hash of streets through each other.

## Lots

Street lots on **both** sides. Five empty town greens (reserved, no buildings). Shore stall lots. Field plots off dirt.

## Taxi

Hail waits 5–30 s. Bottom-right chip: `Taxi in 0:12`. Then the cab stages down the paved road and drives in. Cab is already parked on paved at spawn (roof lamp in the first frame). 60 s unboarded leave still applies after it arrives.

## Verify

```bash
cd game && npm test
```

Spawn South: west seawall, flat apron, sidewalks, lots both sides, highway heading inland (+X).
