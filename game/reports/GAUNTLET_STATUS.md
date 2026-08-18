# Gauntlet status

Piece in play: **South roads — graph junctions, no crossings, highway meets the circus**.

Bar: live `http://localhost:8787/` (operator plays the public Cloudflare tunnel)
- Dual Island Hwy in the foreground (two black tarmacs + stone median)
- Network, not patches: side streets T-join; paved ribbons do not cut through each other
- Harbour Circus is a ring the highway actually meets
- Hierarchy readable (highway > avenue > street > lane > dirt)

Last critic (Grok 4.6, `bc-b5061c0f`): **FAIL**. Dual ribbons locally OK. Biggest pixel gap: disconnected highway patches, sand between spans, no readable circus ring. That was the leftover **omit-near-circus** draw (graph already ended on the kerb; renderer deleted the last metres). Operator also saw roads through roads: South Strand cut Quayward Loop with no shared node.

This round: Strand T-joins the Loop SW corner; highway draw runs to the kerb; circus arm pads; paved-crossing invariant in `roadGraph.test.ts`. Do not reintroduce `trimYielding` or omit-near-circus.

Politics frozen. Operator is the brake. Do not merge unless asked.
