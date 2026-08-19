# Gauntlet status

Harbour loop cash gate (**Buy $32 → $968**) is **PASS**. Camera-at-stall / Fire-in-3D is parked.

Piece in play: **walking**, with taxi camera kept honest. Dual-island prices stay shipped. Politics frozen. Operator is the brake.

| Round | Bar | Result |
|---|---|---|
| W1 | Tap dirt → person walks, camera close on the body | **PASS** (`bc-d921e5fd`) |
| W2 | **Walking.** chip + lime path | **FAIL** (`bc-ff3e53ca`): person + yellow taxi visible; chip was bottom-dock (easy to miss) and lime path not seen. Chip moved under cash; path pin taller; HUD driven from walk flag. |
| W6 | Taxi ride looks at the cab; left-click does not hop out | shipped (unit-tested onHail/onRide) |

Queued: W2 re-critic, then retarget mid-walk.
