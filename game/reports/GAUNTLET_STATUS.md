# Gauntlet status

Piece in play: **road joins** (Harbour Circus + Quayward T). Operator asked 10 loops, play tests only after a visible mesh change. Politics frozen.

| Round | Bar | Result |
|---|---|---|
| W1 | Tap dirt → person walks, camera close on the body | **PASS** (`bc-d921e5fd`) |
| W2 | **Walking.** chip + lime path | **FAIL** twice (chip/path not seen). Pointer now hits ground/plane; chip under cash; lime pin 2 m. Re-critic next. |
| W6 | Taxi ride looks at the cab; left-click does not hop out | shipped (unit-tested onHail/onRide) |
| R1 | Circus is one unioned node mesh with dual/Quayward arms; ribbons stop on it | builder shipped — critic next |

Queued: R1 critic (spawn look at Harbour Circus). Then Quayward T. Operator is the brake.
