/**
 * Units sheets. Systems facts for the dollhouse camera.
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
  return (play && play.units) || { buildings: [], kit: [], leaseHours: [3, 6, 24, 48] };
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

export function findBuilding(play, buildingId) {
  return (unitsSnap(play).buildings || []).find((b) => b.id === buildingId) || null;
}

function kitForUse(play, use) {
  return (unitsSnap(play).kit || []).filter((k) => k.use === use);
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

function buyTile(r, cash) {
  const owned = r.owner === "visitor";
  if (owned) {
    return `
      <button type="button" class="own-tile" data-unit-room="${esc(r.id)}">
        <span class="buy-tile-name">${esc(r.label)}</span>
        <span class="buy-tile-meta">${esc(r.use)} · Owned</span>
        <span class="buy-tile-price">Open</span>
      </button>`;
  }
  const can = cash >= Number(r.price);
  return `
    <button type="button" class="buy-tile" data-buy-unit="${esc(r.id)}" ${can ? "" : "disabled"}>
      <span class="buy-tile-name">${esc(r.label)}</span>
      <span class="buy-tile-meta">${esc(r.use)} · vacant</span>
      <span class="buy-tile-price">${can ? money(r.price) : "Need " + money(r.price)}</span>
    </button>`;
}

function paintRoot(building, play, floor) {
  const cash = Number(play && play.cash) || 0;
  const landOwned = building.landOwner === "visitor";
  const canLand = !landOwned && cash >= Number(building.landPrice);
  const viewFloor = activeFloor(building, floor);
  const onFloor = (building.rooms || []).filter((r) => r.floor === viewFloor);
  const vacant = (building.rooms || []).filter((r) => r.owner !== "visitor");
  const ask = vacant.reduce((m, r) => Math.min(m, Number(r.price) || Infinity), Infinity);
  const hint =
    ask < Infinity && cash >= ask
      ? "You can buy a room here."
      : ask < Infinity
        ? "Need " + money(ask) + " for a room here. Spawn is $10,000. Building dirt is $15,000."
        : "No vacant rooms.";
  const tiles = onFloor.map((r) => buyTile(r, cash)).join("");
  return `
    <p class="whisper">${building.floors} floor${building.floors === 1 ? "" : "s"} · ${building.rooms.length} rooms · PAPER</p>
    <p class="whisper">${esc(hint)}</p>
    ${floorStepper(building, viewFloor)}
    <div class="buy-grid">${tiles}</div>
    <button type="button" class="unit-land" data-buy-land="${esc(building.id)}" ${canLand ? "" : "disabled"}>
      ${landOwned ? "You own this land" : "Buy this land " + money(building.landPrice)}
    </button>
    <p class="whisper">RMB-hold orbit around this floor. Close returns to the harbour.</p>`;
}

function paintBuy(building, play, floor) {
  const viewFloor = activeFloor(building, floor);
  const onFloor = (building.rooms || []).filter((r) => r.floor === viewFloor);
  const others = (building.rooms || []).filter((r) => r.floor !== viewFloor && !r.owner);
  const cash = Number(play && play.cash) || 0;
  return `
    <button type="button" class="ghost hire-back" data-unit-view="root">Back</button>
    ${floorStepper(building, viewFloor)}
    <p class="whisper">RMB-hold orbit around this floor.</p>
    <div class="buy-grid">${onFloor.map((r) => buyTile(r, cash)).join("")}</div>
    ${others.length ? `<p class="whisper">Other vacant rooms in this building</p><div class="buy-grid">${others.map((r) => buyTile(r, cash)).join("")}</div>` : ""}`;
}

function paintManage(building, play, floor) {
  const mine = (building.rooms || []).filter((r) => r.owner === "visitor");
  if (!mine.length) {
    return `
      <button type="button" class="ghost hire-back" data-unit-view="root">Back</button>
      <p class="whisper">Open a room you own from the green list.</p>`;
  }
  const viewFloor = activeFloor(building, floor);
  const onFloor = mine.filter((r) => r.floor === viewFloor);
  const others = mine.filter((r) => r.floor !== viewFloor);
  const cash = Number(play && play.cash) || 0;
  return `
    <button type="button" class="ghost hire-back" data-unit-view="root">Back</button>
    ${floorStepper(building, viewFloor)}
    <p class="whisper">RMB-hold orbit around this floor.</p>
    <div class="buy-grid">${onFloor.map((r) => buyTile(r, cash)).join("")}</div>
    ${others.length ? `<p class="whisper">Other rooms you own</p><div class="buy-grid">${others.map((r) => buyTile(r, cash)).join("")}</div>` : ""}`;
}

function paintRoom(building, play, unitId) {
  const unit = (building.rooms || []).find((r) => r.id === unitId);
  if (!unit || unit.owner !== "visitor") {
    return `<button type="button" class="ghost hire-back" data-unit-view="manage">Back</button><p>Not yours.</p>`;
  }
  const kit = kitForUse(play, unit.use);
  const fitted = new Set(unit.kit || []);
  const cash = Number(play && play.cash) || 0;
  const kitRows = kit
    .map((k) => {
      const have = fitted.has(k.id);
      const can = !have && cash >= Number(k.cost);
      return `
        <div class="inv-row">
          <span>${esc(k.label)}</span>
          <button type="button" class="go" data-fit-kit="${esc(k.id)}" data-unit-id="${esc(unit.id)}" ${can ? "" : "disabled"}>
            ${have ? "Fitted" : money(k.cost)}
          </button>
        </div>`;
    })
    .join("");
  if (unit.use === "shop") {
    const site = ((play && play.workSites) || []).find((s) => s.unitId === unit.id);
    const cost = money(play && play.hireCost != null ? play.hireCost : 300);
    const packer = site && site.packerHired
      ? `<div class="inv-row"><span>${esc(site.packerStaffName || "Packer")}</span><button type="button" class="ghost" data-unit-fire="${esc(unit.id)}" data-unit-role="packer">Fire packer</button></div>`
      : `<button type="button" class="go" data-unit-hire="${esc(unit.id)}" data-unit-role="packer">Hire packer ${cost}</button>`;
    const till = site && site.tillHired
      ? `<div class="inv-row"><span>${esc(site.staffName || "Till")}</span><button type="button" class="ghost" data-unit-fire="${esc(unit.id)}" data-unit-role="till">Fire till</button></div>`
      : `<button type="button" class="go" data-unit-hire="${esc(unit.id)}" data-unit-role="till">Hire till ${cost}</button>`;
    return `
      <button type="button" class="ghost hire-back" data-unit-view="manage">Back</button>
      <p class="whisper">Shop. Packer fills the shelf. Till sells.</p>
      ${kitRows}
      ${packer}
      ${till}
      <p class="whisper">Unhired packer = crate sits. Unhired till = no sales.</p>
      <button type="button" class="go" data-open-stand="${esc(site ? site.id : "")}" ${site ? "" : "disabled"}>Open site card</button>`;
  }
  const hours = unitsSnap(play).leaseHours || [3, 6, 24, 48];
  const lease = unit.lease;
  const offer = unit.offer;
  const leaseBlock = lease
    ? `<p class="whisper">${esc(lease.tenantName)} · ${lease.hours} sim hours · ${money(lease.rentPerHour)} / hour</p>`
    : offer
      ? `<p class="whisper">${esc(offer.tenantName)} offers ${money(offer.rentPerHour)} / hour</p>
         <div class="dest-row">${hours
           .map(
             (h) =>
               `<button type="button" class="go" data-sign-lease="${esc(unit.id)}" data-hours="${h}">${h}h</button>`,
           )
           .join("")}</div>`
      : `<button type="button" class="go" data-scout-unit="${esc(unit.id)}">Scout tenants</button>`;
  return `
    <button type="button" class="ghost hire-back" data-unit-view="manage">Back</button>
    <p class="whisper">${esc(unit.use)}. Kit first, then scout. Empty room = no takers.</p>
    ${kitRows}
    ${leaseBlock}`;
}

export function formatBuildingSheet(play, opts = {}) {
  const building = findBuilding(play, opts.buildingId);
  if (!building) return `<div class="site-card"><p>No building.</p></div>`;
  const view = opts.view || "root";
  let body = paintRoot(building, play, opts.floor);
  if (view === "buy") body = paintBuy(building, play, opts.floor);
  else if (view === "manage") body = paintManage(building, play, opts.floor);
  else if (view === "room") body = paintRoom(building, play, opts.unitId);
  return `
    <div class="site-card" data-unit-building="${esc(building.id)}">
      <div class="stand-head">
        <h2>${esc(building.name)}</h2>
        <button type="button" class="stand-x" id="stand-close">Close</button>
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
