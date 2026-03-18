# Open Questions

## Q004 — How to handle market resolution timing?

Markets resolve at specific times. `resolve_trades.py` checks market closed/winner status from the latest `relevant_markets_*.json`. Resolution depends on having fresh market data — you must run `fetch_markets.py` to get current state before resolving. Fully automated polling is deferred.

**Assumption made:** Resolution checks the `closed` flag and `token.winner` fields from the Polymarket API. If neither is set, market is treated as EXPIRED at last known NO price. This may not match actual resolution if API data is stale.

## Q005 — Does the NO-side strategy apply correctly to bracket markets?

In a bracket event, exactly one bracket resolves YES and the rest resolve NO. The signal engine was designed for binary "will X happen by date?" markets. Whether the same thresholds and scoring apply to bracket markets is **unvalidated**. A score of 92 for a bracket with NO=0.835 may or may not represent real edge.

**Status:** The multi-profile system enables comparative testing. Run conservative/moderate/aggressive on the same data to see how thresholds affect signal count and (eventually) win rate. Still needs real resolution data to validate.

## Q006 — Where is the source-of-truth for current tweet/post count?

The signal engine evaluates whether to bet NO on a bracket but doesn't know the current count. It relies only on market prices as a probability proxy. XTracker is the official resolution source but is client-rendered with no public API. Is price-only sufficient, or do we need count estimation?

## Q007 — What is the intended deployment model?

Currently: manual CLI execution. No scheduling, no cron, no containerization. The 6-script pipeline (fetch → signals → papertrade → resolve → export → serve) works manually. If continuous monitoring is needed, infrastructure decisions are required.

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

## Resolved

- Q001–Q003: Resolved during Phases 3-6 (not documented at time of resolution)
