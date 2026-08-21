/**
 * Units sheets. For sale, your rooms, tenants — not a kitchen-sink.
 * PAPER / SIMULATED.
 */

function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "$0.00";
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function floorName(i) {
  const n = Number(i) || 0;
  if (n <= 0) return "Ground floor";
  if (n === 1) return "First floor";
  return "Second floor";
}

export function floorLetter(i) {
  const n = Number(i) || 0;
  if (n <= 0) return "G";
  return String(n);
}

export function unitsSnap(play) {
  return (play && play.units) || { buildings: [], kit: [], leaseHours: { min: 3, max: 168 } };
}

export function ownedShopUnits(play) {
  const out = [];
  for (const b of unitsSnap(play).buildings || []) {
    for (const r of b.rooms || []) {
      if (r.owner === "visitor" && r.use === "shop") {
        out.push({ ...r, buildingName: b.name });
      }
    }
  }
  return out;
}

export function ownedUnits(play) {
  const out = [];
  for (const b of unitsSnap(play).buildings || []) {
    for (const r of b.rooms || []) {
      if (r.owner === "visitor") out.push({ ...r, buildingName: b.name, buildingId: b.id });
    }
  }
  return out;
}

export function ownsBuildingDirt(play) {
  return (unitsSnap(play).buildings || []).some((b) => b.landOwner === "visitor");
}

export function findBuilding(play, buildingId) {
  return (unitsSnap(play).buildings || []).find((b) => b.id === buildingId) || null;
}

export function findUnit(play, unitId) {
  for (const b of unitsSnap(play).buildings || []) {
    const r = (b.rooms || []).find((row) => row.id === unitId);
    if (r) return { building: b, unit: r };
  }
  return null;
}

function floorsOf(building) {
  return [...new Set((building.rooms || []).map((r) => r.floor))].sort((a, b) => a - b);
}

function activeFloor(building, floor) {
  const floors = floorsOf(building);
  return floors.includes(floor) ? floor : floors[0];
}

function floorStepper(building, viewFloor) {
  const floors = floorsOf(building);
  const min = floors[0] ?? 0;
  const max = floors[floors.length - 1] ?? 0;
  const downOff = viewFloor <= min ? "disabled" : "";
  const upOff = viewFloor >= max ? "disabled" : "";
  return `
    <div class="floor-step" role="group" aria-label="Floor">
      <span class="floor-step-label">Floor: <b>${esc(floorLetter(viewFloor))}</b></span>
      <span class="floor-step-arrows">
        <button type="button" class="floor-step-btn" data-floor-dir="1" aria-label="Floor up" ${upOff}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 14l6-6 6 6"/></svg>
        </button>
        <button type="button" class="floor-step-btn" data-floor-dir="-1" aria-label="Floor down" ${downOff}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 10l6 6 6-6"/></svg>
        </button>
      </span>
    </div>`;
}

function saleTile(r, cash, selectedId) {
  const owned = r.owner === "visitor";
  if (owned) {
    return `
      <button type="button" class="own-tile" data-enter-unit="${esc(r.id)}">
        <span class="buy-tile-name">${esc(r.label)}</span>
        <span class="buy-tile-meta">${esc(r.use)} · Owned</span>
        <span class="buy-tile-price">Enter</span>
      </button>`;
  }
  const can = cash >= Number(r.price);
  const on = selectedId && selectedId === r.id ? " is-on" : "";
  return `
    <button type="button" class="buy-tile${on}" data-ask-unit="${esc(r.id)}" ${can ? "" : "disabled"}>
      <span class="buy-tile-name">${esc(r.label)}</span>
      <span class="buy-tile-meta">${esc(r.use)} · vacant</span>
      <span class="buy-tile-price">${can ? money(r.price) : "Need " + money(r.price)}</span>
    </button>`;
}

function paintSale(building, play, floor, selectedId) {
  const cash = Number(play && play.cash) || 0;
  const viewFloor = activeFloor(building, floor);
  const onFloor = (building.rooms || []).filter((r) => r.floor === viewFloor);
  const vacant = (building.rooms || []).filter((r) => r.owner !== "visitor");
  const ask = vacant.reduce((m, r) => Math.min(m, Number(r.price) || Infinity), Infinity);
  const selected = selectedId && onFloor.find((r) => r.id === selectedId);
  const hint = selected
    ? `Selected ${selected.label}. Confirm to buy.`
    : ask < Infinity && cash >= ask
      ? "Point at a vacant room. That grey box goes green. Buy is a confirm."
      : ask < Infinity
        ? "Need " + money(ask) + " for a room here. Spawn is $10,000. Dirt under this shell is $15,000 — you do not need it to run a room."
        : "No vacant rooms.";
  const dirt = building.landOwner === "visitor"
    ? `<p class="whisper">You own the dirt under this shell.</p>`
    : `<p class="whisper">Dirt under this shell is $15,000. You do not need it to run a room.</p>
       <button type="button" class="ghost" data-ask-land="${esc(building.id)}">Buy the dirt · $15,000</button>`;
  return `
    <p class="whisper">${building.floors} floor${building.floors === 1 ? "" : "s"} · ${building.rooms.length} rooms · PAPER</p>
    <p class="whisper">${esc(hint)}</p>
    ${floorStepper(building, viewFloor)}
    <div class="buy-grid">${onFloor.map((r) => saleTile(r, cash, selectedId)).join("")}</div>
    ${dirt}
    <p class="whisper">RMB-hold orbit around this floor. Exit room is on the bottom of the screen.</p>`;
}

function paintYours(building, play, floor) {
  const mine = (building.rooms || []).filter((r) => r.owner === "visitor");
  if (!mine.length) {
    return `<p class="whisper">You do not own a room in this building.</p>`;
  }
  const viewFloor = activeFloor(building, floor);
  const onFloor = mine.filter((r) => r.floor === viewFloor);
  const others = mine.filter((r) => r.floor !== viewFloor);
  const cash = Number(play && play.cash) || 0;
  return `
    <p class="whisper">Your rooms. Enter, Place from inventory, Tenants, Hire.</p>
    ${floorStepper(building, viewFloor)}
    <div class="buy-grid">${onFloor.map((r) => saleTile(r, cash, "")).join("")}</div>
    ${others.length ? `<p class="whisper">Other rooms you own</p><div class="buy-grid">${others.map((r) => saleTile(r, cash, "")).join("")}</div>` : ""}`;
}

function paintLandlord(play) {
  const cash = Number(play && play.cash) || 0;
  const buildings = unitsSnap(play).buildings || [];
  const rows = buildings
    .map((b) => {
      const owned = b.landOwner === "visitor";
      const can = !owned && cash >= Number(b.landPrice);
      return `
        <button type="button" class="buy-tile" data-ask-land="${esc(b.id)}" ${owned || !can ? "disabled" : ""}>
          <span class="buy-tile-name">${esc(b.name)}</span>
          <span class="buy-tile-meta">${owned ? "You own this dirt" : "Dirt under the shell"}</span>
          <span class="buy-tile-price">${owned ? "Yours" : money(b.landPrice)}</span>
        </button>`;
    })
    .join("");
  return `
    <p class="whisper">Buy the dirt under a whole shell for $15,000. You do not need this to run a room. Spawn cannot afford it.</p>
    <div class="buy-grid">${rows}</div>`;
}

function paintYoursAll(play) {
  const mine = ownedUnits(play);
  if (!mine.length) {
    return `<p class="whisper">No rooms yet. Open Properties, point at a vacant grey box, confirm the buy.</p>`;
  }
  const cash = Number(play && play.cash) || 0;
  return `
    <p class="whisper">Your rooms. Enter a flat to Place furniture and scout tenants.</p>
    <div class="buy-grid">${mine.map((r) => saleTile(r, cash, "")).join("")}</div>`;
}

function profileCard(unit, p) {
  return `
    <article class="tenant-card">
      <h3 class="sheet-kicker">${esc(p.tenantName)}</h3>
      <p class="whisper">${esc(p.who)}</p>
      <p class="whisper">${esc(p.band)} · ${p.hours} sim hours · ${money(p.rentPerHour)} / hour</p>
      <button type="button" class="go" data-sign-lease="${esc(unit.id)}" data-tenant="${esc(p.tenantId)}">Sign</button>
    </article>`;
}

function paintRoom(building, play, unitId) {
  const unit = (building.rooms || []).find((r) => r.id === unitId);
  if (!unit || unit.owner !== "visitor") {
    return `<button type="button" class="ghost hire-back" data-unit-view="yours">Back</button><p>Not yours.</p>`;
  }
  const kit = unit.kit || [];
  const appeal = Number(unit.appeal);
  const band = unit.band || "poor";
  const kitLine = kit.length
    ? `Placed: ${kit.join(", ")} · appeal ${Number.isFinite(appeal) ? appeal : "—"} (${band})`
    : `Empty room · $0. Appeal ${band}. Place furniture from inventory.`;
  const pickup = kit
    .map(
      (id) =>
        `<button type="button" class="ghost" data-pickup-kit="${esc(id)}" data-unit-id="${esc(unit.id)}">Pick up ${esc(id)}</button>`,
    )
    .join("");
  if (unit.use === "shop") {
    const site = ((play && play.workSites) || []).find((s) => s.unitId === unit.id);
    const cost = money(play && play.hireCost != null ? play.hireCost : 300);
    const packer = site && site.packerHired
      ? `<div class="inv-row"><span>${esc(site.packerStaffName || "Packer")}</span><button type="button" class="ghost" data-unit-fire="${esc(unit.id)}" data-unit-role="packer">Fire packer</button></div>`
      : `<button type="button" class="go" data-unit-hire="${esc(unit.id)}" data-unit-role="packer">Hire a packer ${cost}</button>`;
    const till = site && site.tillHired
      ? `<div class="inv-row"><span>${esc(site.staffName || "Till worker")}</span><button type="button" class="ghost" data-unit-fire="${esc(unit.id)}" data-unit-role="till">Fire till worker</button></div>`
      : `<button type="button" class="go" data-unit-hire="${esc(unit.id)}" data-unit-role="till">Hire a till worker ${cost}</button>`;
    return `
      <p class="whisper">Shop. Marketplace Shopfit → Bring to me → Inventory Place. Hold R to rotate.</p>
      <p class="whisper">${esc(kitLine)}</p>
      ${pickup}
      ${packer}
      <p class="whisper">A packer is a person. They unpack the kerb crate onto the shelf. Not a Shopfit SKU.</p>
      ${till}
      <p class="whisper">A till worker is a person. They sell from the shelf. The Shopfit Till is a counter you Place.</p>
      <p class="whisper">Unhired packer = crate sits. Unhired till worker = no sales.</p>
      <button type="button" class="go" data-open-stand="${esc(site ? site.id : "")}" ${site ? "" : "disabled"}>Open site card</button>`;
  }
  const lease = unit.lease;
  const offers = unit.offers || [];
  const leaseBlock = lease
    ? `<p class="whisper">${esc(lease.tenantName)} · ${esc(lease.who || "")} · ${lease.hours} sim hours · ${money(lease.rentPerHour)} / hour</p>`
    : offers.length
      ? `<div class="tenant-list">${offers.map((p) => profileCard(unit, p)).join("")}</div>`
      : `<button type="button" class="go" data-scout-unit="${esc(unit.id)}">Scout tenants</button>
         <p class="whisper">Empty room still scouts poor profiles. No 3/6/24/48 picker — the profile is the term.</p>`;
  return `
    <p class="whisper">${esc(unit.use)}. ${esc(kitLine)}</p>
    ${pickup}
    ${leaseBlock}`;
}

export function formatBuildingSheet(play, opts = {}) {
  const view = opts.view || "sale";
  if (view === "landlord") {
    return `
    <div class="site-card" data-unit-building="landlord">
      <div class="stand-head">
        <h2>Landlord</h2>
        <button type="button" class="stand-x" id="stand-close">Close</button>
      </div>
      <div class="site-body">${paintLandlord(play)}</div>
    </div>`;
  }
  if (view === "yours-all") {
    return `
    <div class="site-card" data-unit-building="yours">
      <div class="stand-head">
        <h2>Your rooms</h2>
        <button type="button" class="stand-x" id="stand-close">Close</button>
      </div>
      <div class="site-body">${paintYoursAll(play)}</div>
    </div>`;
  }
  const building = findBuilding(play, opts.buildingId);
  if (!building) return `<div class="site-card"><p>No building.</p></div>`;
  let body = paintSale(building, play, opts.floor, opts.unitId);
  if (view === "yours" || view === "manage") body = paintYours(building, play, opts.floor);
  else if (view === "room") body = paintRoom(building, play, opts.unitId);
  else if (view === "root" || view === "buy" || view === "sale") {
    body = paintSale(building, play, opts.floor, opts.unitId);
  }
  const locked = view === "room";
  return `
    <div class="site-card" data-unit-building="${esc(building.id)}">
      <div class="stand-head">
        <h2>${esc(building.name)}</h2>
        <button type="button" class="stand-x" id="stand-close">${locked ? "Hide" : "Close"}</button>
      </div>
      <div class="site-body">${body}</div>
    </div>`;
}

export function formatOrderDests(play, marketDest, marketUnitId) {
  const shops = ownedShopUnits(play);
  const shopBtns = shops
    .map((r) => {
      const on = marketDest === "unit" && marketUnitId === r.id;
      return `<button type="button" class="dest${on ? " is-on" : ""}" data-order-dest="unit" data-order-unit="${esc(r.id)}">This room · ${esc(r.label)}</button>`;
    })
    .join("");
  return `
    <button type="button" class="dest ${marketDest === "road" ? "is-on" : ""}" data-order-dest="road">Bring to me</button>
    <button type="button" class="dest ${marketDest === "warehouse" ? "is-on" : ""}" data-order-dest="warehouse">Warehouse</button>
    ${shopBtns}`;
}
