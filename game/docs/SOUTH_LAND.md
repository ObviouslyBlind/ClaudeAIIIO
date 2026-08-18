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

Authored as a graph. See `docs/ROADS.md` for the model, the class table and why it was rebuilt.

- Island Hwy (dual carriageway) runs quay → Harbour → Cane → Ash → Haven → east shore, meeting each circus on its kerb.
- Avenues leave the circuses for the towns: Quayward Rd, Canebrake Rd, Pass Rd, Haven Rd.
- South Strand continues the west side of Quayward Loop **due south** (90°), then 90° east and 90° south into Saltwind. Palm Arc leaves it at 90° then 45°. No smashed diagonals.
- Streets fill the towns: Quayward Loop, Saltwind High St, Haven Crescent, Channel Sands, Palm Arc.
- Lanes are single-track hamlet rows and alleys. Field tracks are dirt and carry on past the lane ends.
- Town junctions sit short of the green — a town square is not a crossroads.

### Old notes

- Island Hwy is **five dual-carriageway spans** that meet circus rings. Taxi never chords the island.
- Harbour Circus: asphalt ring + stone island. Only Quayward Rd leaves it besides the highway.
- Side roads **T-join their parent**. `joins` is that kerb, not a circus kilometres away.
- Channel Sands / Palm / Saltwind High St are Y-forks off the parent street. Strand T-joins the Loop.
- Dirt is **field stubs only**. No dirt path cuts across paved. A stub that would overlay another street is omitted.
- Taxi routes a **paved graph** (span → circus ring → span). It hops the kerb only. It will not lerp through dirt toward a circus that is not on that street.
- On Island Hwy the cab sits in a **black carriageway**, not on the stone median.
- Lots clear the highway **spine** as well as the split carriageways, so parcels do not sit in the omitted circus chords.
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
