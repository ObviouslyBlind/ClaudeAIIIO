# Open Questions

## Q004 — How to handle market resolution timing?

Markets resolve at specific times. `resolve_trades.py` checks market closed/winner status from the latest `relevant_markets_*.json`. Resolution depends on having fresh market data — you must run `fetch_markets.py` to get current state before resolving. Fully automated polling is deferred.

**Assumption made:** Resolution checks the `closed` flag and `token.winner` fields from the Polymarket API. If neither is set, market is treated as EXPIRED at last known NO price. This may not match actual resolution if API data is stale.

## Q005 — Does the NO-side strategy apply correctly to bracket markets?

In a bracket event, exactly one bracket resolves YES and the rest resolve NO. The signal engine was designed for binary "will X happen by date?" markets. Whether the same thresholds and scoring apply to bracket markets is **unvalidated**. A score of 92 for a bracket with NO=0.835 may or may not represent real edge.

**Status:** The multi-profile system enables comparative testing. Run conservative/moderate/aggressive on the same data to see how thresholds affect signal count and (eventually) win rate. Still needs real resolution data to validate.

## Q006 — Where is the source-of-truth for current tweet/post count?

The signal engine evaluates whether to bet NO on a bracket but doesn't know the current count. It relies only on market prices as a probability proxy. XTracker is the official resolution source but is client-rendered with no public API. Is price-only sufficient, or do we need count estimation?

## Q007 — What is the intended deployment model? [RESOLVED]

**Resolved:** GitHub Actions cron (every 6 hours). `run_pipeline.sh` orchestrates the full cycle. Actions commits updated data to main, which triggers dashboard redeployment. See D016.

## Q008 — Should the dashboard show bracket grouping or flat markets?

With ~290 bracket markets across ~11 events, flat rendering is readable but loses family context. The dashboard currently renders individual markets. `families.json` is exported but not yet rendered as grouped views.

## Q009 — Is events pagination depth (6000 events) sufficient?

Current pagination fetches up to 6000 events. If Polymarket adds more markets or relevant events fall outside this window, they'll be missed. Offset ordering is not documented by the API.

## Q010 — What strategies beyond no_side should be tested?

The architecture supports multiple strategies (via `STRATEGIES` registry in `strategy.py`). Currently only `no_side@1.0` exists. Potential future strategies:
- Bracket-specific: weight by bracket position (tail vs center)
- Volume-weighted: factor in market liquidity
- Momentum: consider price movement direction

No commitment to build these yet. Depends on validation results from Q005.

## Q011 — How should CANCELLED trades be used?

The CANCELLED status exists for cases where a trade should be invalidated (market removed, data error, etc.). Currently no code path sets CANCELLED automatically — it's available for manual or future use. What conditions should trigger automatic cancellation?

## Q012 — What should Strategy B be?

**Recommendation: Bracket-position-weighted strategy (`bracket_weight@1.0`)**

In bracket/count markets, one bracket resolves YES and all others resolve NO. The current `no_side` strategy treats all brackets equally — a tail bracket (e.g. "200+ tweets") and a center bracket (e.g. "65-89 tweets") get the same evaluation logic. But their risk profiles differ significantly:

- **Tail brackets** (far from current count) tend to have very high NO prices (0.90+) and resolve NO reliably, but offer thin margins.
- **Center brackets** (near the likely final count) have moderate NO prices (0.50-0.70) and higher variance — they could flip to YES.
- **Already-passed brackets** (below current count) should be near-certain NO but may already be priced in.

A bracket-position-weighted strategy would:
1. Classify each bracket's position relative to the event family (tail / center / passed)
2. Apply different thresholds or score adjustments by position
3. Favor tail brackets for conservative profiles (high certainty, low margin)
4. Allow center brackets only for aggressive profiles (higher margin, higher risk)

**Why this over alternatives:**
- Volume-weighted (liquidity-based) requires data we don't reliably have and doesn't address the core bracket structure.
- Momentum (price direction) adds temporal complexity and needs historical price data we don't store.
- Bracket-position-weighting uses data we already have (bracket labels, NO prices across the family) and directly addresses the structural difference Q005 identified.

**Prerequisites:** Baseline evaluation results from Strategy A to establish a comparison baseline. Do not implement until at least 2-3 evaluation cycles are complete.

**Architecture fit:** The `STRATEGIES` registry in `strategy.py` already supports multiple strategies. A new `bracket_weight` strategy would implement `evaluate()` with position-aware logic and register alongside `no_side`.

## Q013 — What is the best first step for count-aware inputs?

**Recommendation: Scrape current bracket price distribution from the event family as a proxy for implied count range.**

Right now the signal engine evaluates each bracket independently. But in a bracket event, the price distribution across all brackets contains information about the market's collective estimate of where the final count will land. The bracket with the highest YES price (lowest NO price) represents the market's mode estimate.

A useful first step that requires NO external data source:
1. In `evaluate()`, pass the full `MarketFamily` (or at least sibling bracket prices) alongside each `Market`
2. Identify the "hot bracket" (highest YES price) as the market-implied most likely outcome
3. Score brackets relative to their distance from the hot bracket:
   - Far from hot bracket → tail bracket → higher confidence for NO
   - Adjacent to hot bracket → risk zone → reduce score or apply tighter thresholds
   - IS the hot bracket → center → likely SKIP or very aggressive only

This uses data we already have (bracket prices within the family) and doesn't require XTracker, trumpstruth.org, or any external scraping. It's the minimal useful count-awareness.

**After this works:** The next step would be to compare the implied count range against an external count source (trumpstruth.org or muskmeter.live) to detect pricing errors where the market disagrees with actual count data.

## Q014 — What is the smallest useful signal-engine change?

**Recommendation: Add bracket-position as a score modifier (not a filter).**

Current state: The signal engine (`engine.py`) evaluates every bracket identically. The `evaluate()` function scores based on NO price and expiry only. But early bracket-position data (D021) shows:

- **Adjacent brackets** get 12/20 TRADE signals — these are the "near the action" brackets where the NO price is moderate (0.70-0.85) and risk is highest
- **Hot brackets** get 3/20 TRADE signals — these are the market's consensus picks, with lower NO prices
- **Tail brackets** get only 5/20 TRADE signals — these have very high NO prices (0.95+) but thin margins

**Proposed change** (when evidence threshold is met):
1. Pass `MarketFamily` or sibling prices to `evaluate()`
2. Classify the bracket's position (hot/adjacent/tail)
3. Apply a score adjustment:
   - Tail: +5 points (higher confidence for NO)
   - Adjacent: -10 points (higher risk — near the action)
   - Hot: -20 points (market thinks this bracket wins)
4. Do NOT change the TRADE/WATCH/SKIP thresholds — only adjust the score that feeds into them

This is additive, not structural. It doesn't require a new strategy — it's a refinement of `no_side@1.0` that could become `no_side@1.1`.

**When to implement:** After at least 2 of 4 Strategy B criteria are met (see `strategy_b_progress` in summary.json). Current progress: 0/4.

## Resolved

- Q001–Q003: Resolved during Phases 3-6 (not documented at time of resolution)
- Q007: Resolved — GitHub Actions automation (D016)
