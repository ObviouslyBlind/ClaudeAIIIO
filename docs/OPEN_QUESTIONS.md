# Open Questions

## Q004 — How to handle market resolution timing?

Markets resolve at specific times. The paper ledger now has `resolve_trades.py` which checks market closed/winner status. But resolution depends on having fresh market data — you must run `fetch_markets.py` to get current state before resolving. Fully automated polling is deferred.

## Q005 — Does the NO-side strategy apply correctly to bracket markets?

In a bracket event (e.g. "will Musk post 65-89 tweets"), exactly one bracket resolves YES and the rest resolve NO. The signal engine was designed for binary "will X happen by date?" markets. Whether the same thresholds and scoring apply to bracket markets is **unvalidated**. A score of 92 for a bracket with NO=0.835 may or may not represent real edge. Needs backtest data to confirm.

## Q006 — Where is the source-of-truth for current tweet/post count?

The signal engine evaluates whether to bet NO on a bracket but doesn't know the current count. It relies only on market prices as a probability proxy. XTracker is the official resolution source but is client-rendered with no public API. Is price-only sufficient, or do we need count estimation?

## Q007 — What is the intended deployment model?

Currently: manual CLI execution. No scheduling, no cron, no containerization. If continuous monitoring is needed, infrastructure decisions are required. If manual is fine, the 5-script pipeline (fetch → signals → papertrade → resolve → export) works as-is.

## Q008 — Should the dashboard show bracket grouping or flat markets?

With 290 bracket markets across 11 events, flat rendering is hard to read. The dashboard currently renders individual markets as cards. Design decision needed: group by event, show only high-signal brackets, or collapse into event-level summaries?

## Q009 — Is events pagination depth (6000 events) sufficient?

Current pagination fetches up to 6000 events, found 11 relevant. If Polymarket adds more markets or relevant events fall outside this window, they'll be missed. Offset ordering is not documented by the API.

## Resolved

- Q001–Q003: Resolved during Phases 3-6 (not documented at time of resolution)
