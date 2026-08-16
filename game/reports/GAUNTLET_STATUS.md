# Gauntlet status

Loop is **autonomous**. Critic = pixels only. Tests = lead/builder.
Critics must open a **new query** (`/?g=…`). Do not reuse a tab already on `/`.

## Held (pixel-ratified)

- Inland spawn + black tarmac + PAPER HUD
- Traffic, taxi overlay, ferry ticket, RMB orbit

## Catalogue (round 17 FAIL — retry)

[Catalogue critic](bc-1199ff62-bac5-59c7-be11-13966d7862ee) saw `Could not lease: no cash` while the HUD still said $1,000. Shared PAPER visitor cash had already been spent by other tabs. Unhiding `#catalog-picker` in the console showed an empty grid — that is the HTML shell; `open()` fills it.

**Fix:** apply `/api/lease` snapshot on failure so Cash matches the server. Restart play to reset visitor to $1,000.

## Next piece

**Develop catalogue** on a fresh `/?g=cat18`. Tap a **cheap** north lot (shore/street under ~$500). Lease, then Develop. PASS only if the picker lists House / Shop / House with shop / Farm / Warehouse / Factory with PAPER costs. Do not use the console to unhide the shell.

Then: interiors.

Do not rewrite `traffic.js`, island centres, or PLAN.md.
