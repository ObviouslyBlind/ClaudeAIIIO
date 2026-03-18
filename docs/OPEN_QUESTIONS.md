# Open Questions

Issues we haven't resolved yet.

## Resolved

- **Q001 — Which Polymarket API endpoints to use?** Resolved in Phase 3. Using the public gamma API (`/markets`).
- **Q002 — How to classify "posting" markets?** Resolved in Phase 3. Keyword classifier in `adapters/classifier.py` handles phrasing variants and separates binary timer markets from bracket/count markets.
- **Q003 — What NO price threshold makes a trade attractive?** Resolved in Phase 4. NO >= 0.70 = TRADE, 0.50–0.70 = WATCH, below 0.50 or above 0.95 = SKIP. See D005 in DECISIONS.md.
- **Q005 — Dashboard hosting approach?** Resolved in Phase 6. Static HTML file, no server needed.

## Still open

- **Q004 — How to handle market resolution timing?** Markets resolve at specific times. Paper ledger tracks open/closed state but does not auto-resolve. Manual or future automation needed in Phase 7.
