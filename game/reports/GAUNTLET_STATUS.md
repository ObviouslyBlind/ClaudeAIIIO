# Gauntlet status

Piece in play: **road joins**. Operator asked 10 loops; play tests only after a spawn-visible mesh change. Politics frozen.

Why earlier rounds looked like zero change: Harbour Circus is ~250 m from spawn. Millimetre clips and even a unioned ring are a horizon smudge. The spawn camera looks along Island Hwy. That dual was two 8 m black tapes with a 10 m **pale stone** median (`STONE` 0x9a8a72) on tan sand (`0xe8d5a3`). The median read as a dirt gap, so the highway looked like two unconnected roads. Graph was already connected; the mesh was lying about the join *and* about the dual.

| Round | Bar | Result |
|---|---|---|
| W1 | Tap dirt → person walks, camera close on the body | **PASS** (`bc-d921e5fd`) |
| W2 | **Walking.** chip + lime path | **FAIL** twice (chip/path not seen). Pointer now hits ground/plane; chip under cash; lime pin 2 m. Re-critic next. |
| W6 | Taxi ride looks at the cab; left-click does not hop out | shipped (unit-tested onHail/onRide) |
| R1 | Raster: circus union exists; duals still two tapes + pale median | **FAIL** (spawn-visible: two disconnected tapes) |
| R2 | One black highway bed + dark stripe; hub ribbons clip to tarmac; longer circus throats | builder shipped |
| R3 | Raster Harbour Circus: one bed into a unioned ring, 0 sand on centreline | **PASS** (overhead) |
| R4 | Raster spawn corridor: one black road, not two tapes with a sand gap | **PASS** (overhead) |
| R5 | Raster Quayward SW: centreline tarmac 0–16 m, 0 sand | **PASS** (mesh sample; coarse PNG can fake a kerb hairline) |
| R6 | Raster Channel Sands T: hub covers both duals | **PASS** (overhead) |
| R7 | Live spawn: one black highway | **FAIL** — two pale-gapped tapes (stale page and/or Lambert tan-wash) |
| R8 | Emissive black tarmac so the bed stays black under the tan hemisphere | builder shipped |
| R9–R10 | Live play after restart: spawn highway + zoomed circus | queued |

Queued: live critics on a **fresh** `http://localhost:8787/` load. Operator is the brake.
