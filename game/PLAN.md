# Two Harbors — Game Plan

Working title. Replace before any public page. This is the build spec for a browser 3D multiplayer economy + politics game that also has to run on a phone.

The world is already running when you join. You do not start the islands. You interfere with a machine that was already moving.

---

## 1. What this is

A dedicated simulation server owns time, prices, inventories, votes, and buildings. The client only shows the world and sends intents (move, buy, hire, vote). That is the opposite of a Roblox-style loop, where you push the engine and the engine reacts.

Players spawn as people with a cart, not as nations. Most players stay merchants. A few run for the **House**. After each House election the **Senate** is appointed. One **Prime Minister** and one **Governor** sit on top. Their bills write numbers the sim already uses: tax, tariffs, interest, subsidies, permits. If a law does not change a price, a wage, a tax, or a permit, it is not in beta.

Beta map: **two large fictional islands**, one ferry between them. Not Earth. Not a real-world city mesh.

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
- Market orders, leases, staff, and buildings persist while you are offline.
- Presence is cheap: nearby players see you outdoors; indoors you are not broadcast (Capital Rift-style interest cut).
- Async shops: you can buy from a stall whose owner is asleep (Eco stores, EVE buy/sell orders).

**Build it as:** a headless sim loop that does not need a 3D client. The 3D view is a camera on that loop.

### 3.2 Goods, carts, staff, land

**From Capital Rift’s genre + Foxhole logistics + Eco specialization.**

- Start with a **cart / stall**, then **staff**, then **one building type**, then **leases**.
- Production takes **time**, not clicks. Foxhole’s lesson: queues and travel time are the gameplay. A nail is not spawned. It is ore → bar → nail, plus a ferry wait if the ore is on the other island.
- Staff are a wage line, not decoration. If the House raises the wage floor, every cart gets more expensive to run.
- Land is scarce. Upkeep is a money sink. Governor permits are a supply valve.

Beta goods (12):

| Chain | Goods |
|---|---|
| Food | corn, potato, lettuce, beans |
| Extract | ore, lumber |
| Industry | planks, nails, iron bars, tools, concrete, fuel |

North wants South food and ore. South wants North tools and concrete. Break the ferry, both hurt differently.

### 3.3 Two markets, not one global price

**From EVE regional markets.**

EVE does not have one universe price. The Forge is liquid; everywhere else is a freight-adjusted, more volatile copy. That is the two-island economy.

- Each island has its own order book for the 12 goods.
- The ferry is the only arb path. Tariff, port fee, and travel time are the spread.
- NPC demand exists on both islands so empty hours still clear a little volume.
- Publish **North price index** and **South price index**, plus a **ferry spread** for the top goods.

Do not build a single global supermarket. The politics only matters if North steel and South grain can diverge.

### 3.4 Inflation as plumbing

**From EVE faucet/sink accounting + Eco taxes.**

EVE tracks ISK in and ISK out. If faucets beat sinks, you get inflation. Eco makes tax a first-class sim object: sales tax, crafting fees, transfers, all hitting a treasury.

**Faucets (beta):** NPC buy orders, wages paid from NPC firms, tiny new-player cash.  
**Sinks (beta):** sales tax, land upkeep, permit fees, ferry tickets, stock auction fees.

HUD, always on, three numbers:

1. Money supply  
2. Goods produced (24h)  
3. Price index (basket of the 12 goods)

PM lever: **interest rate**. High rate → cash sits in deposits, stocks drop, building slows.

No extra cash for quests, deaths, or login streaks.

### 3.5 Laws that the engine enforces

**From Eco, not from chat RP.**

Eco’s useful idea: a law is `if X then Y`, ratified, then the server enforces it. Players argue with data (graphs, heatmaps), not with unenforceable roleplay.

Beta does **not** get Eco’s programmable law sandbox. It gets four bill templates that write sim fields:

| Bill | Writes | Starts in |
|---|---|---|
| Tax (income / sales) | tax rate, treasury | House (money bill) |
| Tariff | ferry / import rate by good or by island | House (money bill) |
| Interest rate | central rate | House |
| Subsidy | which good, how much from treasury | House (money bill) |

Governor executive action (not a bill): **permit freeze** on new buildings, one island, 24 hours.

Oath of Office’s useful idea: bills have a **session clock**, a floor vote, and a visible effect on **global stats**. Their failure mode is stats that are mostly flavor. Ours must move the 12-good prices.

### 3.6 Two houses

**From Westminster (Commons / Lords) + Oath of Office’s two chambers, scaled to beta.**

UK pattern we actually want:

- Elected lower house makes government.
- Money bills belong to that house. The upper house cannot kill a tax.
- Confidence lives in the elected house. The appointed house can delay and amend other bills, not dump the PM.
- Upper house is a check, not a second government.

Oath of Office pattern we want:

- House originates. Senate consents.
- Leadership exists (Speaker / Majority). Keep it thin in beta.
- Sessions are timed so mobile players can vote without living in a chamber.

### 3.7 Stocks as a thermometer

**From EVE’s public economic reports, not from a day-trader client.**

- 6 listings. Slow **5-minute call auction**, not a live book.
- No shorting, no leverage in beta.
- Fee is a sink.
- Listings: North Steel, South Grain, Ferry Co, Island Bank, Construction Co, plus one player firm that crossed a size gate.
- A tariff vote moves Ferry Co **before** the bill passes (expectation). Passage moves it again (cash flows).

### 3.8 3D that survives a phone

**From Albion (mobile as baseline), Dojo Islands (web 3D MMO), PlayCanvas/Three.js practice.**

Albion: one game logic, scaled visuals. Android is the performance floor. Cartoon / low-texture art. No post-process on mobile. Forward rendering. Unity as a view; logic on the server.

Dojo Islands: WebGL in the browser, millions of monthly users on phones and laptops, fidelity scaled per device, no install.

For us:

- **Phone is the baseline.** If a mid-range Android Chrome cannot hold 30fps in a harbour scene, the art is wrong.
- Low poly, shared materials, GPU instancing for carts/trees/people.
- No realtime shadows on mobile. No post-process. Small textures (ASTC where possible).
- **Interest management:** client only receives nearby actors + island HUD + your orders/votes.
- Economy tick is **not** 60Hz. Sim tick 1Hz. Presence ~8–10Hz. That is what makes mobile and a live economy coexist.
- Politics UI is **2D panels**, not a 3D capitol you must walk into. Walking into a chamber is optional desktop flavor.

Engine lean: **Three.js or PlayCanvas client + authoritative Node (or similar) sim**. Avoid Unity WebGL as the primary mobile-web path; the payload is too fat. Native app wrappers can come later around the same web client.

---

## 4. Politics — two houses

### 4.1 Seats

| Body | Seats | How you get there |
|---|---|---|
| **House** | 20 | Elected. 10 North constituencies, 10 South. |
| **Senate** | 11 | Appointed after each House election: **6 government, 3 opposition, 2 independents**. |
| **Prime Minister** | 1 | Leader who can command the House. |
| **Governor** | 1 | One seat for both islands. Popular vote, same cycle as the House. |

Senate math: 6 + 3 + 2 = 11.

Independents in the Senate are kingmakers on **non-money** bills. Money bills do not need them.

### 4.2 Election cycle (beta)

Default: **48 real hours**.

1. House: 20 first-past-the-post races. Each constituency is a patch of island (harbour, mill town, farm belt, mine, etc.).
2. Party with the most House seats forms government. If 10–10, the Governor invites whoever can show 11 votes on a confidence motion.
3. **Senate is then appointed:**
   - Government leader names 6 senators (can be House members, donors, or any eligible player; dual-sitting allowed in beta to keep chairs full).
   - Opposition leader names 3.
   - Governor names 2 independents (cannot be the PM).
4. PM is the government leader, needs House confidence.
5. Governor is elected island-wide at the same time, **not** appointed. That is the tension: a South Governor vs a North PM is the intended fight.

By-elections: if a House member quits, that seat only. Senate vacancies are re-appointed by whoever named them.

### 4.3 What each office can actually do

**House (20)**

- Originate all bills, including money bills.
- Elect a Speaker (tie-break only, does not vote except to break).
- Confidence / no-confidence in the PM.
- Cannot be bypassed.

**Senate (11, appointed)**

- Debate and vote on non-money bills.
- Can **amend** tariff classifications, subsidy targeting, permit-adjacent bills.
- Can **delay** a non-money bill by one session (max 24h in beta).
- **Cannot amend, delay, or kill money bills** (tax, interest, treasury spend). Those pass when the House passes them. Senate may publish a “view” that does nothing to the number.
- Cannot dump the PM.

**Prime Minister**

- Sets the government agenda (which bill is on the floor).
- Names the 6 government senators.
- Proposes tax, rate, subsidy, tariff.
- Does **not** freeze permits. That is the Governor.

**Governor**

- Names the 2 independent senators.
- Port fees, zoning density cap, **permit freeze** (24h, one island).
- Cannot set national tax or the interest rate.
- One person, two islands: every local fight is national.

### 4.4 How a bill becomes a number

1. Any House member tables one of the four templates. Numbers are sliders with hard caps (e.g. sales tax 0–25%).
2. House votes at the next session tick (sessions every 2 real hours, vote window 20 minutes — mobile-friendly).
3. If it is a **money bill** and it passes the House, the sim writes the number at session close. Done.
4. If it is **not** a money bill, it goes to the Senate. Senate can pass, amend (House must confirm the amendment), or delay once.
5. On write, every player HUD and both island indexes update. Stocks reprice on the next 5-minute auction.

No courts, no police, no constitution editor in beta. Eco can keep the programmable law sandbox for a later age.

### 4.5 Parties (thin)

Three labels only: Government, Opposition, Independent.  
No logos, no primary debates. House members declare a whip on sitting. Crossing the floor is allowed and is a news ticker event.

---

## 5. Player loop

1. Spawn on North or South (choose once per wipe, or pay a ferry ticket to migrate).
2. Cart, a little cash, one good you can actually produce nearby.
3. Sell into the island book. Hire staff when volume supports it. Lease a stall. Maybe a building.
4. Watch the HUD: money supply, output, index, ferry spread.
5. Optional: stand in a constituency, sit in the House, get named to the Senate, or run for Governor.
6. Optional: list or trade the 6 stocks.

You never have to do politics. Politics is a scarce job that hits everyone who did not take it.

---

## 6. Server and client

### 6.1 Sim (authoritative)

Single process or service that owns:

- Clock (1Hz tick)
- Inventories, staff, buildings, leases
- Two island order books + ferry queue
- Treasury, tax, rate, subsidies
- House / Senate / PM / Governor state
- Stock auction
- NPC producers and demand so the world breathes empty

Persistence: database snapshot every tick batch (e.g. every 10s), plus event log for bills and big trades.

Clients are not trusted for prices, votes, or movement outcomes. Movement is intent + navmesh on server, or click-to-move with server path.

### 6.2 Client

One web client, desktop and mobile.

| Layer | Job |
|---|---|
| 3D world | Low-poly islands, carts, ferry, buildings. Touch: virtual stick + tap-to-interact. Desktop: WASD + mouse. |
| HUD | Cash, 3 inflation numbers, ferry status, session countdown. |
| Market sheet | Orders, fills, island toggle. Thumb-sized rows. |
| Hansard | Bills, votes, seat list. 2D. Works in portrait. |
| Exchange | 6 stocks, next auction time. |

Quality tiers:

- **Low (default phone):** no shadows, 0.5x textures, fewer crowd actors, 30fps cap.
- **Medium:** harbour detail, more players visible.
- **High (desktop):** longer view distance.

### 6.3 Mobile constraints baked in now

- All critical actions (buy, vote, hire, claim stall) are one-thumb, no hover menus.
- Vote windows are 20 minutes, not 90-second floors.
- No action combat. This is not an FPS. That is how a 3D MMO stays on a phone.
- Install optional later (PWA first). App stores are a sequel.
- Auth: one tap (Google or Apple) on mobile; more methods can wait.

### 6.4 Suggested stack (beta)

- Sim: TypeScript on Node, tickable without rendering.
- Net: WebSocket, interest-scoped messages.
- DB: Postgres.
- Client: TypeScript + Three.js or PlayCanvas.
- Shared types for goods, bills, seats so the client cannot invent a 13th good.

Albion’s lesson: **one logic, scaled view**. Do not fork a “mobile game” and a “PC game.”

---

## 7. Beta content slice

Ship this:

- 2 islands, 1 ferry, 12 goods
- Cart, staff, one building, leases
- NPC demand + player books per island
- Inflation HUD + tax/rate/subsidy/tariff
- House 20 (10/10), appointed Senate 11 (6/3/2), 1 PM, 1 Governor
- 48h election cycle, 2h sessions
- 6 stocks, 5-minute auction
- Browser client, phone as fps baseline
- Persistent sim at 0 players

Later, not beta:

- More islands or a mainland
- Second currency
- Programmable Eco-style laws
- Courts, police, press class
- Live order-book stocks
- Native iOS/Android shells
- OSM / real Earth

---

## 8. Build order

Each step is playable. Do not skip to 3D politics before the sim moves prices.

| Step | Outcome | How you know it worked |
|---|---|---|
| **A. Headless sim** | 1Hz tick, 12 goods, NPC supply/demand, one island, money supply + index in logs | Leave it running empty for an hour; prices drift, money in/out balance within a band |
| **B. Player intents** | Accounts, cart, buy/sell against the book, persist offline | Two API clients can trade; after disconnect, orders still fill |
| **C. Second island + ferry** | Two books, travel time, port fee | Arb appears; raising the fee widens the spread |
| **D. Inflation tools** | Tax, upkeep, ferry tickets as sinks; HUD numbers | Turning tax up lowers money supply over 30 min of ticks |
| **E. House** | 20 seats, 10/10 map, election, confidence, money bills write sim | Passing a sales tax changes the live rate |
| **F. Senate + PM + Governor** | Appointment 6/3/2, delay/amend non-money, Governor freeze | Freeze stops new North buildings; tariff needs Senate unless certified money |
| **G. Stocks** | 6 listings, 5-min auction | A tabled tariff moves Ferry Co on the next auction |
| **H. 3D client** | Low-poly two harbours, click/tap to stall, HUD | Phone Chrome 30fps in the harbour with 20 nearby actors |
| **I. Mobile pass** | Portrait Hansard, big vote buttons, quality tier | Vote on a bill on a phone without opening the 3D capitol |
| **J. Closed beta shard** | One live server, wipe rules posted, election clock real | Sim still ticks overnight |

---

## 9. Wipe and live ops

The sim can be reset. Offices, player numbers, and account identity can survive a wipe. Cash, goods, buildings, and stock positions may not. Post that in the client, not as a joke stamp on the title screen.

Staff tools: set gate, kick, re-appoint a vacant Senate seat, force a session if the clock wedges. No silent money grants.

---

## 10. Open decisions (do not block A–D)

- Final title.
- Whether House members may sit in the Senate at the same time (plan assumes yes in beta so 11 chairs fill).
- Exact tax/rate caps.
- Whether the Governor popular vote is one island-wide score or North+South with a tie-break.
- Three.js vs PlayCanvas for the first client.
- Constituency map drawing (10 polygons per island).

When a decision is made, write it into this file. Do not keep it in chat.

---

## 11. One-sentence pitch

Two islands, a ferry, and a House of 20. You spawn into a market that was already open. If you get a seat, you can tax it, tariff it, or freeze the docks — and the prices have to move.
