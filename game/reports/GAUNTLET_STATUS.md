# Gauntlet status — harbour land (round 8)

**Goal:** Two distant Caribbean-scale islands. Land is ground you claim. A paved road is visible. Buildings read as harbour shops/farms, not cubes.

**Bar (critic inspects the running page):**

1. Two original 3D islands with a wide channel. Ports about 8.6 km apart. From one port the other is a distant shore.
2. Port on each: pier, warehouse, quay kit, ferry in the channel. Ferry button when close.
3. A **paved asphalt spine** is obvious from spawn: dark carriageway, grass verge, lots beside it not on it. Dirt tracks stay on the fields.
4. Developed land shows a gable-roof shop or a farm, not a grey cube.
5. Lease then Develop (PAPER). Tap-walk. No WASD. HUD BASE / PAPER / SIMULATED.

Forbidden bar: Capital Rift screenshots, Call of Duty, OSM.

**Round 1:** `three.core.js` 404.
**Round 2:** Camera faced inland.
**Round 3:** Given 20 m cards → cadastral parcels.
**Round 4:** Plots through road; cube buildings; islands too close.
**Round 5:** Taxi HUD button. Yellow mesh pathfollows `/api/map` paved polylines only.
**Round 6:** Ports ~8.6 km apart. Parcel fills removed. Gable shops. **Critic:** channel PASS, HUD PASS, ferry PASS. **FAIL: no visible paved road** from spawn (camera looks at quay/channel; spine runs inland). Buildings only partial (warehouse seen).
**Round 7:** Dashed asphalt spine + side-on spawn camera. **Critic:** road PASS, port PASS, buildings PASS, HUD PASS. **FAIL: second island not in spawn view** (camera looks along this shore; far island is 8.6 km off-frame, not missing).
**Round 8:** Spawn camera `{ x: 56, y: 54, z: -132 }` (north), lookAt `{ x: 0, y: 2, z: 240 }` toward the channel. Far shore on the **left** of the north spawn frame. Fog 5200–28000. Islands not moved.

**You are the brake.**
