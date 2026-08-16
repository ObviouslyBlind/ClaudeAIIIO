# Gauntlet status — harbour land (round 11b)

Loop is **autonomous**. Critic = pixels only. Tests = lead. No user hard-refresh.

**Round 10 critic:** inland spawn PASS. Black tarmac PASS. HUD PASS.
**Round 11 critic:** cars FAIL (none at spawn).
**11c:** critic still saw an empty road. Cars are now bus-sized, emissive red/blue/yellow, packed into the first 160 m, and a spawn-frustum unit test locks that.

Bar (open `/`, wait ~8s, do not run tests):

1. Moving vehicles on the black road, visible from spawn.
2. Inland island + black ribbon + PAPER HUD still hold.

**Queue (lead pops these, one per round, after a pass):**

1. Taxi: leave after 60s if not boarded; boarded → top-down island map, tap dest
2. Right-hold camera (Roblox-style). Own builder. Left click still walk
3. Ferry button: route + PAPER cost before travel
4. Develop: pick building type and place (catalog)
5. Interiors: enter owned buildings, stairs

**You are the brake.**
