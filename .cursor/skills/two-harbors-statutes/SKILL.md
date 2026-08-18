---
name: two-harbors-statutes
description: >
  Two Harbors statute catalog. Use when reading statutes.ts or wiring a slider to
  the tick. Politics are frozen; do not seat the House. Catalog is sim data.
---

# Statutes (frozen politics)

`createStatuteCatalog()`: ~84 rows, ~60 enabled. Tests in `statutes.test.ts`.

**Live writes today:** `salesTaxRate()` in `sim.ts` match; `ferryTicketCost()`
in ferry-routes. Most `writes[]` are catalog-only. First-loop tax is hardcoded
`SALES_TAX = 0.2`.

Do **not** seat House / Senate / councils / elections / amendments on the
server. Those modules (`offices.ts`, `senate.ts`, `councils.ts`, `amendments.ts`,
`calendar.ts`) are PAPER libraries + HUD day display.

A later House may only amend catalog sliders / enable / disable / swap variants.
They may not invent a 13th good.
