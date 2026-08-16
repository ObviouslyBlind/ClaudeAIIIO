# Gauntlet status

Loop is **autonomous**. Critic = pixels only. Tests = lead/builder. No user hard-refresh.

**Held:** inland spawn, black tarmac, PAPER HUD (when boot finishes).
**Shipped (code, not yet pixel-ratified):** taxi wait+map, RMB orbit, ferry ticket, building catalogue, interiors.

## Round 12 — traffic critic (root URL)

[Traffic critic](bc-5aa4bebd-6229-574b-860e-c8a899bdbf91) **FAIL**: HUD shell only. Viewport was the CSS teal (`#0e4a55`). Cash stayed **$0** (HTML default). That is “JS never finished boot / WebGL context failed”, not “cars missing on a live island.”

Headless log: `THREE.WebGLRenderer: Error creating WebGL context.` GPU process was pegged on leftover critic tabs. Animation loop used to start **after** every mesh, so an 8s critic never saw a frame.

**Fix in this round:** show cash as soon as `/api/map` returns; first-frame water+spawn before parcels; catch WebGL onto the HUD; status starts as `Loading 3D harbour…`.

## Next critic bar (traffic, still)

Open **exactly** `http://localhost:8787/` (root). Wait until Cash is not `$0` (up to ~20s). Then wait a few more seconds. **PASS** only if colored vehicle meshes move on the black road. Inferring cars from tarmac does not count.

Do not rewrite `traffic.js`, island centres, or PLAN.md.
