# Project: Polymarket NO-Only Rebuild

## Mission
Build this project from scratch as a clean, research-first, paper-trading-first system.

This is a NEW build.
Do not preserve the old repo structure.
Do not import old code blindly.
Do not assume previous architecture was correct.

Your job is to rebuild carefully, with strong structure, clear auditability, and simple explanations.

---

## Git workflow rules
- After pushing work to a branch, always create a PR and merge it to main.
- Do not wait for the user to ask — merge is the default.
- Only skip merging if the user explicitly says not to.

---

## Product scope
Focus only on Polymarket markets related to:
- Elon Musk posting / tweeting
- Donald Trump posting / Truth Social activity

Version 1 is:
- NO-only
- paper trading only
- research-first
- no wallet wiring
- no secrets
- no autonomous live trading

---

## Strategy priorities
Optimize in this order:
1. low drawdown
2. high win rate
3. steady compounding
4. then absolute return

Rules:
- mixed evidence = no trade
- max time to expiry = 3 days
- prefer factual, timestamped, cross-referenced data
- do not overstate confidence
- label simulated results clearly

---

## Working style
I am learning Claude Code.

You must:
- explain each phase in simple English
- work step by step
- keep changes small
- stop after each phase for approval
- avoid rushing ahead
- avoid bonus features
- avoid “impressive” but misleading output

Before each major change:
- explain what you will do
- explain why it matters
- list files that will change
- tell me how to verify it worked

After each phase:
- summarize what changed
- update the docs
- stop for approval

---

## Response format
For every meaningful step, use this structure:

1. Goal of this step
2. Why it matters
3. What I will change
4. Files affected
5. Commands to run
6. What success looks like
7. Stop for approval

Keep responses compact unless I ask for detail.

---

## Source-of-truth files
Maintain these files as the project memory:

- README.md
- docs/PROJECT_BRIEF.md
- docs/DECISIONS.md
- docs/OPEN_QUESTIONS.md
- docs/TODO.md
- docs/RUNBOOK.md
- reports/DAILY_STATUS.md

Keep them short and current.
Do not repeat their contents in chat unless needed.

---

## Build phases

### Phase 1 — Clean planning
Start in read-only planning mode.
Do not code immediately.

Tasks:
- propose the project structure
- explain the architecture in simple terms
- define what the system will and will not do
- identify the minimum viable v1
- create the docs skeleton
- stop for approval

### Phase 2 — Project skeleton
After approval:
- create the folder structure
- create the core docs
- create placeholders for scripts, reports, and tests
- define a simple local run workflow
- stop for approval

### Phase 3 — Market ingestion
After approval:
- build clean Polymarket ingestion
- classify market types properly
- separate binary timer markets from bracket/count markets if needed
- store raw and normalized data cleanly
- document how to inspect outputs
- stop for approval

### Phase 4 — Signal logic
After approval:
- choose the correct signal engine for the actual market structure
- start with simple rules
- explain every rule plainly
- log reasons for TRADE / WATCH / SKIP
- stop for approval

### Phase 5 — Paper trading
After approval:
- build a real paper-trade ledger
- separate simulation from forward paper tracking
- do not fake resolution
- label data provenance clearly
- stop for approval

### Phase 6 — Dashboard
After approval:
- build or package the dashboard cleanly
- separate HTML / CSS / JS
- load clearly named data files
- label mode and provenance clearly
- remove misleading claims
- stop for approval

### Phase 7 — Evaluation
After approval:
- analyze performance honestly
- recommend changes
- do not silently rewrite core assumptions
- keep all findings auditable

---

## Architecture goals
Create a repo with these lanes clearly separated:

1. market ingestion
2. signal logic
3. paper-trading ledger
4. analytics and reporting
5. dashboard
6. docs and project memory

A good default target structure is:

polymarket_timer_bot/
  adapters/
  models/
  signals/
  papertrade/
  analytics/
  dashboard/
    assets/
    data/
  reports/
  docs/
  scripts/
  tests/

If a different structure is better, explain why before creating it.

---

## Truthfulness rules
- Never present simulated results as validated performance.
- Never say “ready for live” unless I explicitly approve it and the project truly supports it.
- If a metric is simulated, label it SIMULATED.
- If a metric is imported, label it IMPORTED.
- If a metric is manual, label it MANUAL.
- If a metric is a live market snapshot only, label it LIVE SNAPSHOT.
- If evidence is weak or mixed, do not force a trade.

---

## Safety and control rules
- No wallet integration in v1
- No private keys
- No autonomous trading
- No hidden architecture changes
- Ask before big refactors
- Ask before deleting files
- Ask before changing strategy assumptions

---

## First thing to do
On the first session, do only this:

1. Explain the project in simple English
2. Propose the repo structure
3. Explain what Claude Code will do vs what I need to do
4. Create the docs skeleton only
5. Stop and ask for approval before creating code

Do not skip ahead.
Do not try to impress me by doing everything at once.
