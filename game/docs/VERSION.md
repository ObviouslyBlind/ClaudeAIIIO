# 2Isles version

PAPER / SIMULATED. No wallet.

**Now: Alpha 0.5.1** — units scripts shipped. Rooms, packer / till, leases. No Blender pass.

Always update this file and [HANDOVER.md](HANDOVER.md) in the same change.

## Scheme

| Lane | Number |
|---|---|
| Alpha | `0.x` and `0.x.y` |
| This block | started **0.5**, then **0.5.1**, **0.5.2**, … after each successful implementation |
| Beta | **1.0** |

Do not skip a bump because the change “felt small.” If the slice shipped and tests passed, bump. If the slice failed, do not bump.

Read the next feature out in [HANDOVER.md](HANDOVER.md) **before** writing code for it. Gauntlet: one piece, real bar, tests for sim, camera later.

## History

| Version | Date | What |
|---|---|---|
| 0.5 | 2026-08-20 | Start. Spec accepted: 4 buildings, 13 rooms, buyable dirt (dear), cheap rooms. Scripts only. Operator mocks buildings in Blender later. |
| 0.5.1 | 2026-08-20 | Units sim scripts green. `units.ts` buy room / dirt, packer + till on the existing crate, apartment / office leases, persist round-trip. 747 tests. No 3D. |
