# Two Harbors — Game Plan

Working title. Replace before any public page. This is the build spec for a browser 3D multiplayer economy + politics game that also has to run on a phone.

The world is already running when you join. You do not start the islands. You interfere with a machine that was already moving.

At launch the **base economy is already law**. A curated pack of 50–100 statutes is in force before anyone holds office. Players do not invent the legal system. They **amend** a catalog the game wrote. The first general election is two weeks in. The first council elections are a week after that. Then both run every four weeks.

---

## 1. What this is

A dedicated simulation server owns time, prices, inventories, votes, buildings, and planning applications. The client only shows the world and sends intents (move, buy, hire, apply, vote). That is the opposite of a Roblox-style loop, where you push the engine and the engine reacts.

Players spawn as people with a cart, not as nations. Everyone may run a **small** shop, stall, farm, or artisan mine by right. Anything larger needs **constituency council** (HOA-style) planning permission — if the current planning statute says so. People may **buddy up**: cooperatives and investor groups file one application together.

A few players sit in the **House**. After each general election the **Senate** is appointed. One **Prime Minister** and one **Governor** sit on top. Twenty **councils** (one per constituency) handle local planning with mild votes.

Beta map: **two large fictional islands**, one ferry between them.

- **North:** dense, industrial, expensive land, tools / steel / construction, home of the stock board.
- **South:** cheaper land, food and ore, export-dependent, lives on the ferry.

The ferry is the political football.

---

## 2. Design rule

**Roblox:** player acts, engine reacts.  
**This game:** sim acts, player reacts.

The server ticks at zero players. NPC farms harvest, shops restock, the ferry sails, prices drift, interest accrues, the price index updates. A tariff can pass at 03:00. In the morning South food is expensive whether anyone logged in.

Player verb: interfere.

---

## 3. Systems to borrow

These are genre systems, rebuilt for this game. Sources are listed so a future build can go read the original design, not copy a client.

### 3.1 Persistent sim you join, not a lobby you start

**From Capital Rift’s genre, Eco, Foxhole, EVE, Albion.**

- One live shard. No instanced “your world.”
- Market orders, leases, staff, buildings, and planning applications persist while you are offline.
- Presence is cheap: nearby players see you outdoors; indoors you are not broadcast (Capital Rift-style interest cut).
- Async shops: you can buy from a stall whose owner is asleep (Eco stores, EVE buy/sell orders).

**Build it as:** a headless sim loop that does not need a 3D client. The 3D view is a camera on that loop.

### 3.2 Goods, carts, staff, land

**From Capital Rift’s genre + Foxhole logistics + Eco specialization.**

- Start with a **cart / stall**, then **staff**, then a **small** building, then leases.
- Production takes **time**, not clicks. A nail is not spawned. It is ore → bar → nail, plus a ferry wait if the ore is on the other island.
- Staff are a wage line. If a wage-floor statute is amended up, every cart gets more expensive to run.
- Land is scarce. Upkeep is a money sink.

Beta goods (12):

| Chain | Goods |
|---|---|
| Food | corn, potato, lettuce, beans |
| Extract | ore, lumber |
| Industry | planks, nails, iron bars, tools, concrete, fuel |

North wants South food and ore. South wants North tools and concrete. Break the ferry, both hurt differently.

### 3.3 Two markets, not one global price

**From EVE regional markets.**

- Each island has its own order book for the 12 goods.
- The ferry is the only arb path. Tariff, port fee, and travel time are the spread.
- NPC demand exists on both islands so empty hours still clear a little volume.
- Publish **North price index**, **South price index**, and a **ferry spread**.

Politics only matters if North steel and South grain can diverge.

### 3.4 Inflation as plumbing

**From EVE faucet/sink accounting + Eco taxes.**

**Faucets:** NPC buy orders, wages paid from NPC firms, tiny new-player cash.  
**Sinks:** sales tax, land upkeep, planning fees, ferry tickets, stock auction fees.

HUD, always on:

1. Money supply  
2. Goods produced (24h)  
3. Price index (basket of the 12 goods)

Interest rate is a statute in the starter pack. The PM can table an amendment; the House passes money bills.

### 3.5 Curated laws the engine enforces

**From Eco (laws as physics) + Oath of Office (session clock, global stats) + real planning codes (by-right vs discretionary).**

Eco: a law is `if X then Y`, ratified, then the server enforces it.  
Oath of Office: timed sessions, floor votes, visible stats.  
Planning practice: small work is by-right; large work needs a local vote.

Players do **not** write freeform laws. The game ships a **catalog**. Offices may:

- enable / disable a catalog statute
- amend its sliders within hard caps
- swap to an alternate variant the catalog already contains

That is how you get 50–100 live statutes at launch without a law-compiler.

### 3.6 Two houses + local councils

**From Westminster (Commons / Lords) + UK parish/planning committees + Oath of Office chambers.**

- Elected House makes government and owns money bills.
- Appointed Senate delays and amends non-money bills.
- Confidence lives in the House.
- Each constituency has a small council for **planning**, not for national tax.

### 3.7 Firms: sole traders, co-ops, investors

**From Eco contracts + EVE corporations, kept small.**

- One player may always own a small business alone.
- Several players may form a **cooperative** (shared equity, all sign the application).
- **Investors** may put cash on an application without operating the site. They get a contracted share of output or profit, enforced by the sim.
- Large sites almost always need a group. That is the social hook: you cannot quietly drop an industrial mine on a farm belt.

### 3.8 Stocks as a thermometer

**From EVE’s public economic reports.**

- 6 listings. **5-minute call auction**. No shorting, no leverage in beta.
- Listings: North Steel, South Grain, Ferry Co, Island Bank, Construction Co, plus one player firm that crossed a size gate.
- A tariff amendment moves Ferry Co on the next auction, including while it is still on the floor.

### 3.9 3D that survives a phone

**From Albion (mobile as baseline) + Dojo Islands (web 3D MMO).**

- Phone is the fps floor: 30fps in a harbour, mid-range Android Chrome.
- Low poly, instancing, no post-process on Low tier.
- Sim tick 1Hz. Presence ~8–10Hz.
- Politics and planning are **2D panels**. Walking into a chamber is optional desktop flavor.
- Client: Three.js or PlayCanvas. Sim: authoritative Node (or similar). One logic, scaled view.

---

## 4. Launch calendar

The sim and the starter law pack are live on day 0. Offices are empty until elections. NPC firms and by-right player shops still run.

| When | What |
|---|---|
| **Day 0** | Shard opens. ~50–100 curated statutes already in force. Small businesses by-right. Large applications queue under the bootstrap rule below. |
| **Day 14** | First **general election**: House (20) + Governor. Then Senate is appointed (6 / 3 / 2). PM named from House confidence. |
| **Day 21** | First **council elections**: 20 councils, one per constituency. |
| **Every 4 weeks after each first** | Next general, next councils. Councils stay offset by one week so the map is not voting for everything on the same night. |

Session clock after governments exist: House/Senate sessions every 2 real hours, 20-minute vote windows (phone-friendly).

By-elections fill a single House or council seat. Senate vacancies are re-appointed by whoever named that seat.

### 4.1 Bootstrap before councils sit (days 0–21)

Starter planning law is already on. Until the first councils are seated, a **large** application in a constituency is decided by a **resident poll**: anyone with a lease or by-right site in that constituency, 48 hours, simple majority of votes cast, quorum 3. If quorum fails, the application waits. Small sites never need this poll.

After day 21, councils replace the resident poll.

---

## 5. National politics

### 5.1 Seats

| Body | Seats | How you get there |
|---|---|---|
| **House** | 20 | Elected. 10 North constituencies, 10 South. |
| **Senate** | 11 | Appointed after each general: **6 government, 3 opposition, 2 independents**. |
| **Prime Minister** | 1 | Commands the House. |
| **Governor** | 1 | Popular vote, both islands, same day as the general. |
| **Council** | 5 per constituency (100 total) | Elected locally, one week after the general. |

Senate math: 6 + 3 + 2 = 11.

### 5.2 After a general

1. 20 first-past-the-post House races.
2. Largest bloc forms government. If 10–10, Governor invites whoever can show 11 on confidence.
3. Government leader names 6 senators. Opposition leader names 3. Governor names 2 independents (not the PM). Dual-sitting allowed in beta so chairs fill.
4. PM needs House confidence. Governor is elected, not appointed.

### 5.3 Powers

**House** — originates all national amendments, including money bills; Speaker tie-breaks; confidence.

**Senate** — amends / delays non-money amendments (one delay, max 24h). Cannot amend, delay, or kill money bills. Cannot dump the PM.

**PM** — agenda, names 6 government senators, tables tax / rate / subsidy / tariff amendments. Does not grant planning permission.

**Governor** — names 2 independents; island-wide port fee and density cap **within catalog caps**; 24h permit freeze on one island (executive, if that statute is enabled). Does not sit as a council.

**Council** — only planning and local catalog items (nuisance hours, local fee within a national cap). Cannot tax income, set the interest rate, or tariff the ferry.

### 5.4 How an amendment becomes a number

1. A House member tables a **catalog amendment** (slider, variant swap, or enable/disable). Hard caps are in the catalog.
2. House votes at the next session.
3. Money bills (tax, interest, treasury spend, national tariff) write at House passage.
4. Non-money bills go to the Senate: pass, amend (House confirms), or delay once.
5. HUD, island indexes, and the next stock auction update.

Parties stay thin: Government, Opposition, Independent. Crossing the floor is a ticker event.

---

## 6. Constituency councils (HOA / planning)

Twenty councils. Each matches one House constituency (harbour, mill town, farm belt, mine belt, etc.).

This is **mild**. It is not a second parliament. Default vote: 48-hour window, simple majority of votes cast, quorum 3 of 5. A councillor who does not vote is not a no. That is the HOA feel: neighbours who show up decide, absentees do not freeze the island.

### 6.1 What is by-right (no vote)

Anyone, including a solo player, may place and operate:

- food vendor / cart / stall
- small farm (1–2 plots)
- artisan mine or small timber stand (1 plot, low output cap)
- small workshop that does not exceed the artisan throughput cap

These still pay upkeep and national tax. They do not need a council motion.

### 6.2 What needs planning permission

Anything **large** under the current size-class statute, for example:

- industrial mine, quarry, fuel depot
- factory, mill, sawyard
- warehouse / depot
- large farm (3+ plots) or plantation
- extra berth or private quay

The size thresholds themselves are catalog statutes. Launch defaults are in the starter pack. The House may amend them later (e.g. “artisan mine cap 20 ore/hour → 12”). A council may **tighten** locally only if the national statute has `councils_may_restrict = true`. A council may not loosen past the national cap.

### 6.3 Joint applications (co-ops and investors)

One application, many names.

| Role on the form | What they do | What the sim enforces |
|---|---|---|
| **Operator** | Runs the site, hires staff | Day-to-day intents |
| **Cooperative members** | Co-owners, all must sign | Equity split, all see books |
| **Investors** | Cash in, optional silent | Contracted share of profit or output, paid by the sim |

Rules at launch (amendable):

- Small sites: solo is enough. Co-op optional.
- Large sites: at least 2 distinct players on the form (operator + one other), so industrial mines are social.
- Cap on investor share (starter: 49% unless a statute is amended).
- Application fee is a money sink, refunded if refused.

The council votes the **site**, not the friendship. If permission is granted, the share contract is locked until they file a variation (also a mild vote if it changes size class).

### 6.4 Application loop

1. File on a plot you control or have a lease option on. Pick size class, good, shareholders.
2. Fee escrowed. Neighbours with a site in that constituency get a push on mobile.
3. Council (or resident poll before day 21) has 48 hours.
4. Pass → building queue starts. Fail → fee partly sunk, plot not consumed.
5. Operating above the permitted class is blocked by the sim, not by a moderator.

Governor island freeze: pauses **new large** applications on that island for 24h. Does not demolish what already exists. Does not touch by-right small sites.

---

## 7. Starter law pack (the base economy)

On day 0 the shard is not lawless. It is a **working economy with a frozen constitution** until the first House sits. Target: **about 80 statutes** in the catalog, **about 60 enabled** at launch, room to enable the rest. Players amend; they do not author from blank paper.

Each statute is a record: `id`, `title`, `enabled`, sliders, caps, `money_bill`, `council_may_restrict`, `writes` (which sim fields).

### 7.1 Suggested catalog (group counts)

**Money and treasury (~12)**  
Sales tax, income tax (off at launch or 0%), deposit interest, lending rate, treasury spend lock, new-player cash cap, transfer tax (low), company registration fee, planning fee schedule, upkeep multiplier, wage floor, unemployment none.

**Trade and ferry (~10)**  
National tariff 0%, ferry ticket, port fee, travel time, cargo hold cap, embargo variant (disabled), island export license (disabled), smuggling none, NPC importer bid size, NPC exporter bid size.

**Land and size class (~12)**  
Plot sizes, by-right list, large-class list, artisan output caps, factory output caps, mine depth / depletion, farm plot max by-right, warehouse cap, density cap North, density cap South, lease length, abandonment clock.

**Planning procedure (~8)**  
Council vote window, quorum, majority rule, resident-poll bootstrap, neighbour notice, variation rule, freeze statute, appeal none in beta.

**Firms (~8)**  
Sole trader, cooperative, investor share cap, max names on a form, books-public-if-large, bankruptcy (site returns to unowned), NPC firm charter, stock listing gate.

**Labour (~6)**  
Wage floor, staff hire cap by site class, overtime none, child none, shift hours, NPC labour pool size.

**Environment / nuisance (~8, mostly local-amendable)**  
Noise cap, smoke cap, river spoil cap, night hours for factories, Sunday-close variant (off), forest replant rule, fishery none, quarry buffer from harbour.

**Stocks and banking (~6)**  
Auction period, trading fee, listing gate, shorting off, leverage off, Island Bank reserve ratio.

**Elections (~8)**  
General interval 28 days, council interval 28 days, first-general offset 14 days, first-council offset 21 days, franchise (lease or citizen), House FPTP, council at-large 5, dual-sitting allowed.

**Offices (~6)**  
Confidence rule, Senate appointment 6/3/2, money-bill certification, Senate delay once, Governor freeze 24h, Speaker tie-break.

That is ~84 rows. Launch enables the ones that make prices, production, tax, ferry, by-right small sites, and bootstrap polls work. Disabled rows are still visible in Hansard as “not in force,” so a later House can turn them on.

### 7.2 What “amend” means

A House bill may:

- change a slider (sales tax 5% → 8%)
- enable a disabled statute (night-hours for North mills)
- disable a statute (turn off wage floor)
- pick variant B instead of A (tariff on ore only, not a blanket tariff)

It may not invent a 13th good or a new office. New catalog rows are a content patch from the developers, then the House can enable them.

Councils may only touch statutes flagged `council_may_restrict`, and only for their constituency, and only to tighten.

---

## 8. Player loop

1. Spawn North or South. Get a cart and a little cash.
2. Open a **small** vendor, farm, or artisan mine by right. Sell into that island’s book.
3. Hire staff when volume pays. Lease a second small plot if you want.
4. To go large: find a co-op or investors, file planning, wait on the council (or the day-0–21 resident poll).
5. Watch money supply, output, index, ferry spread.
6. Optional: stand for council (local, week 3), House (week 2), Governor, or take a Senate appointment.
7. Optional: trade the 6 stocks.

You never have to sit in a chamber. If you never vote, the starter pack and whoever did vote still move your prices.

---

## 9. Server and client

### 9.1 Sim owns

Clock (1Hz); inventories; staff; buildings; leases; two island books; ferry queue; treasury; statute table; planning applications; House / Senate / PM / Governor / 20 councils; stock auction; NPC supply and demand.

Persist every ~10s plus an event log for statute writes, elections, and large applications.

### 9.2 Client layers

| Layer | Job |
|---|---|
| 3D world | Islands, carts, ferry, small vs large sites. Touch stick + tap. |
| HUD | Cash, 3 inflation numbers, ferry, next election / session. |
| Market | Orders, island toggle. |
| Planning | File, co-op signatures, investor share, vote. Thumb-sized. |
| Hansard | Catalog, amendments, House/Senate/council. Portrait. |
| Exchange | 6 stocks. |

Low / Medium / High quality tiers. Phone default = Low, 30fps cap.

Planning and voting must work in portrait without entering the 3D council hall.

---

## 10. Beta slice

Ship:

- 2 islands, 1 ferry, 12 goods
- By-right small sites + large sites behind planning
- Co-ops and investors on one application
- Starter catalog (~80 rows, ~60 on)
- Resident-poll bootstrap until day 21
- House 20, Senate 11 (6/3/2), 1 PM, 1 Governor
- 20 councils × 5 seats
- Calendar: general day 14, councils day 21, then every 4 weeks
- Inflation HUD, 6-stock auction
- Browser client, phone as fps baseline
- Sim ticks at 0 players

Later: more islands, extra catalog rows, courts, press, live stock book, native apps, real-Earth map.

---

## 11. Build order

| Step | Outcome | How you know it worked |
|---|---|---|
| **A. Headless sim** | 1Hz tick, 12 goods, NPC demand, statute table loaded | Empty hour: prices drift, faucets/sinks balance in a band |
| **B. Starter pack** | ~60 statutes on, sliders write sim fields | Flipping sales tax in the DB changes the next tick’s collections |
| **C. Player small sites** | Accounts, by-right vendor/farm/artisan mine, persist | Two clients trade; offline orders still fill |
| **D. Second island + ferry** | Two books, ticket, travel time | Arb exists; raising the ferry statute widens spread |
| **E. Firms + large class** | Co-op / investor form, size caps | Solo cannot found an industrial mine |
| **F. Planning** | Applications, 48h mild vote, fee sink | Fail does not place the building; pass starts the queue |
| **G. Bootstrap poll** | Resident poll before councils exist | Quorum 3 works; below quorum the app waits |
| **H. House + calendar** | Day-14 general, money amendments write | Passing a tax amendment changes the live rate |
| **I. Senate, PM, Governor** | 6/3/2, delay, freeze | Freeze blocks new large apps on one island for 24h |
| **J. Councils** | Day-21 election, 5 seats, replace resident poll | Council majority grants a quarry |
| **K. Stocks** | 6 listings, 5-min auction | Tabled tariff moves Ferry Co next auction |
| **L. 3D client** | Two harbours, small vs large models | Phone Chrome 30fps, 20 nearby actors |
| **M. Mobile pass** | Portrait planning + Hansard | File a co-op app and vote it on a phone |
| **N. Closed beta shard** | Day-0 laws on, real calendar | Overnight tick; first general fires on day 14 |

---

## 12. Wipe and live ops

Wipes may clear cash, goods, buildings, and applications. Account identity and player numbers can survive. Statute **catalog** comes back from the game; player amendments die with the wipe unless you snapshot them on purpose.

Staff tools: kick, force a session, re-appoint a vacant Senate seat, re-queue a stuck application. No silent money grants. New statutes arrive as content patches, then the House enables them.

---

## 13. Open decisions

- Final title.
- Exact artisan vs industrial output numbers.
- Investor cap 49% vs other.
- Whether a House member may also sit on their home council (plan assumes yes in beta).
- Governor vote: single island-wide tally vs North+South with a tie-break.
- Three.js vs PlayCanvas.
- Constituency polygon map (10 per island).

Write decisions into this file.

---

## 14. One-sentence pitch

Two islands and a ferry, already under ~60 laws when you spawn. Small shops are yours by right. A mine takes neighbours, a co-op, and a council that does not even exist until week three.
