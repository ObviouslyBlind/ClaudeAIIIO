---
name: two-harbors-tests
description: >
  Two Harbors Vitest gate. Use after sim or harbour play changes. 602 tests is the
  baseline from handover — run npm test in game/.
---

# Tests

```bash
cd game && npm test
```

Vitest. Tests live next to sources (`game/src/*.test.ts`) plus `game/tests/`.

After **play** changes (land, roads, taxi, HUD strings, persist): run the suite
before claiming done. Kernel tests must keep unique plots, zero overlap, house
round-trip in the blob, minerals listing ore.

Critics (`two-harbors-gauntlet`) do **not** run `npm test`. Lead/builder does.

Do not delete tests to go green. Prefer a change with failing tests over no change.
